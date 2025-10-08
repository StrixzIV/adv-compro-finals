import io
import uuid
import json
import anyio
import datetime

from PIL import Image
from PIL.ExifTags import TAGS
from PIL.TiffImagePlugin import IFDRational

from pydantic import BaseModel
from typing import Annotated, Optional, Generator, Any

from minio import Minio
from minio.error import S3Error

from fastapi.responses import StreamingResponse
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Query

from db import database
from lib.environ import env, env_single_use

from routes.auth import get_uid, oauth2_scheme

THUMBNAIL_SIZE = (200, 200)
MINIO_BUCKET_NAME = 'media'

minio_client = Minio(
    endpoint='minio:9000',
    access_key=env_single_use('MINIO_ROOT_USER'),
    secret_key=env_single_use('MINIO_ROOT_PASSWORD'),
    secure=False,
)

storage_router = APIRouter(
    prefix="/storage",
    tags=["Storage"],
    dependencies=[Depends(oauth2_scheme)] 
)

class PhotoGalleryItem(BaseModel):
    """Schema for a photo item returned to the gallery view."""
    id: uuid.UUID
    filename: str
    caption: Optional[str] = None
    upload_date: datetime.datetime
    file_url: str
    is_deleted: bool 
    is_favorite: bool 
    thumbnail_url: str # Placeholder for future thumbnail feature
    exif_data: Optional[dict[str, Any]] = None
    size_bytes: int


def create_thumbnail_in_memory(file_content) -> Optional[io.BytesIO]:
    """
    Creates a thumbnail of the image and returns it as a BytesIO stream.
    The file_content pointer must be reset before and after this call.
    """
    try:
        file_content.seek(0)
        img = Image.open(file_content)
        
        # 1. Convert to RGB if necessary (important for JPEGs)
        if img.mode in ('RGBA', 'P', 'LA', 'L', 'CMYK'):
            img = img.convert('RGB')
            
        # 2. Create the thumbnail (maintaining aspect ratio)
        img.thumbnail(THUMBNAIL_SIZE)
        
        # 3. Save the thumbnail to an in-memory byte stream
        thumbnail_stream = io.BytesIO()
        img.save(thumbnail_stream, format='JPEG', quality=85)
        thumbnail_stream.seek(0)
        
        file_content.seek(0)

        return thumbnail_stream
        
    except Exception as e:
        
        print(f"⚠️  Could not create thumbnail: {type(e).__name__}: {e}")
        
        try:
            file_content.seek(0)
        
        except:
            pass
        
        return None


def extract_exif_data(file_content) -> Optional[dict[str, any]]:
    """
    Synchronously extracts EXIF data from an image file stream.
    
    Args:
        file_content: SpooledTemporaryFile object (the raw UploadFile.file).
    """
    def make_json_serializable(value):
        """Recursively convert EXIF values to JSON-serializable types."""
        if value is None:
            return None
        elif isinstance(value, IFDRational):
            return float(value)
        elif isinstance(value, bytes):
            # Remove null bytes and try to decode as UTF-8
            try:
                cleaned = value.replace(b'\x00', b'')
                return cleaned.decode('utf-8', errors='ignore')
            except (UnicodeDecodeError, AttributeError):
                return value.hex()
        elif isinstance(value, str):
            # Remove null bytes from strings (PostgreSQL can't handle them)
            return value.replace('\x00', '')
        elif isinstance(value, (list, tuple)):
            return [make_json_serializable(item) for item in value]
        elif isinstance(value, dict):
            return {str(k).replace('\x00', ''): make_json_serializable(v) for k, v in value.items()}
        elif isinstance(value, (int, float, bool)):
            return value
        else:
            # For any other unknown type, convert to string and remove null bytes
            return str(value).replace('\x00', '')
    
    try:
        # 1. Reset file pointer to the beginning for Image.open()
        file_content.seek(0)
        
        # 2. Open the image using Pillow
        img = Image.open(file_content)
        
        # 3. Get EXIF data
        exif_raw = img._getexif()
        if exif_raw is None:
            return None

        exif_data = {}
        
        # 4. Convert tag IDs to human-readable names and sanitize values
        for tag_id, value in exif_raw.items():
            tag_name = TAGS.get(tag_id, str(tag_id))
            
            try:
                # Convert to JSON-serializable format
                exif_data[tag_name] = make_json_serializable(value)
            except Exception as e:
                # If conversion fails, store as string
                print(f"Warning: Could not serialize EXIF tag {tag_name}: {e}")
                exif_data[tag_name] = str(value)

        return exif_data
        
    except Exception as e:
        # Catch exceptions like: not an image, corrupted file, missing Pillow
        print(f"Could not extract EXIF data: {e}")
        return None
    finally:
        # 5. Reset file pointer again for the upcoming MinIO upload thread
        file_content.seek(0)


def _process_photo_record(record) -> PhotoGalleryItem:

    """Helper to convert a DB record into a PhotoGalleryItem."""

    exif_data_from_db = record["exif_data"]
    parsed_exif_data = None
    
    # Logic to handle JSONB/JSON string conversion
    if isinstance(exif_data_from_db, str):
        try:
            parsed_exif_data = json.loads(exif_data_from_db)
        except json.JSONDecodeError:
            print(f"Error decoding EXIF data string for photo ID {record['id']}")
            parsed_exif_data = None
    elif isinstance(exif_data_from_db, dict) or exif_data_from_db is None:
        parsed_exif_data = exif_data_from_db
    else:
         parsed_exif_data = dict(exif_data_from_db) if exif_data_from_db is not None else None


    object_key = record["file_path"]
    file_url = f"/storage/fetch/{record['id']}" 
    thumbnail_url = f"/storage/fetch/thumbnail/{record['id']}" 

    stat = minio_client.stat_object(MINIO_BUCKET_NAME, object_key)

    return PhotoGalleryItem(
        id=record["id"],
        filename=record["filename"],
        caption=record["caption"],
        upload_date=record["upload_date"],
        file_url=file_url,
        thumbnail_url=thumbnail_url,
        exif_data=parsed_exif_data,
        is_deleted=record["is_deleted"], # 🔑 Include soft-delete status
        is_favorite=record["is_favorite"],
        size_bytes=stat.size
    )


def get_object_sync(object_key: str) -> Generator[bytes, None, None]:
    """Synchronously fetches the object stream from MinIO."""
    response = None  # Initialize response to None
    try:
        response = minio_client.get_object(
            bucket_name=MINIO_BUCKET_NAME,
            object_name=object_key
        )
        # Yield file chunks to allow StreamingResponse to work
        for chunk in response.stream(32768): # 32KB chunks
            yield chunk
    except S3Error as e:
        if e.code == 'NoSuchKey':
            raise FileNotFoundError(f"File not found in MinIO: {object_key}")
    finally:
        if response is not None:  # Only close if response was created
            response.close()
            response.release_conn()


def remove_object_sync(object_key: str):
    """Synchronously removes the object from MinIO."""
    minio_client.remove_object(
        bucket_name=MINIO_BUCKET_NAME,
        object_name=object_key
    )


def remove_thumbnail_sync(photo_id: uuid.UUID, user_id: uuid.UUID):
    """Synchronously removes the thumbnail object from MinIO."""
    thumbnail_object_key = f"users/{user_id}/thumbnail/{photo_id}.jpeg"
    minio_client.remove_object(
        bucket_name=MINIO_BUCKET_NAME,
        object_name=thumbnail_object_key
    )


def put_object_sync(file_content, object_key, content_type):
    # This function executes in a separate thread, safely running the blocking MinIO call
    file_content.seek(0, 2) # Go to end of file to get size
    file_size = file_content.tell()
    file_content.seek(0) # Reset file pointer to beginning

    minio_client.put_object(
        bucket_name=MINIO_BUCKET_NAME,
        object_name=object_key,
        data=file_content,
        length=file_size,
        content_type=content_type
    )

def put_thumbnail_sync(
    thumbnail_stream: io.BytesIO, 
    object_key: str
):
    """Synchronously uploads the in-memory thumbnail stream to MinIO."""
    minio_client.put_object(
        bucket_name=MINIO_BUCKET_NAME,
        object_name=object_key,
        data=thumbnail_stream,
        length=thumbnail_stream.getbuffer().nbytes,
        content_type='image/jpeg'
    )


@storage_router.post("/upload/photo")
async def upload_photo(
    file: Annotated[UploadFile, File()],
    user_id: Annotated[uuid.UUID, Depends(get_uid)],
):
    """
    Uploads a photo to MinIO in a user-specific folder using a non-blocking thread pool.
    """
    
    # 1. GENERATE UNIQUE IDENTIFIERS AND PATH
    photo_id = uuid.uuid4()
    original_filename = file.filename
    file_extension = original_filename.split('.')[-1] if '.' in original_filename else ''

    object_key = f"users/{user_id}/{photo_id}"

    if file_extension:
        object_key += f".{file_extension}"

    thumbnail_object_key = f"users/{user_id}/thumbnail/{photo_id}.jpeg"

    try:
        # UploadFile.file is the raw SpooledTemporaryFile object.
        file_content = file.file
        file_content.seek(0)

        # 2. ASYNCHRONOUSLY RUN BLOCKING MINIO UPLOAD
        # We use anyio to run the synchronous put_object_sync function in a worker thread.
        # The main event loop is NOT blocked, ensuring server responsiveness.

        exif_data_dict = extract_exif_data(file_content)
        exif_json_string = json.dumps(exif_data_dict) if exif_data_dict else None

        thumbnail_stream = create_thumbnail_in_memory(file_content)

        await anyio.to_thread.run_sync(
            put_object_sync, 
            file_content, 
            object_key, 
            file.content_type
        )

        if thumbnail_stream:
            await anyio.to_thread.run_sync(
                put_thumbnail_sync, 
                thumbnail_stream,
                thumbnail_object_key
            )

        query = """
            INSERT INTO photos (id, user_id, file_path, filename, exif_data)
            VALUES (:id, :user_id, :file_path, :filename, :exif_data)
        """

        values = {
            "id": photo_id,
            "user_id": user_id,
            "file_path": object_key,
            "filename": original_filename,
            "exif_data": exif_json_string,
        }

        await database.execute(query=query, values=values)

        file_url = f"http://minio:9000/{MINIO_BUCKET_NAME}/{object_key}"

        return {
            "message": "File uploaded successfully",
            "photo_id": photo_id,
            "filename": original_filename,
            "file_url": file_url
        }
        
    except Exception as e:
        # Catch all other errors (MinIO, DB, etc.)
        print(f"Error during file operation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process file upload or record metadata."
        )
    

@storage_router.get("/fetch/{photo_id}")
async def fetch_photo(
    photo_id: uuid.UUID,
    user_id: Annotated[uuid.UUID, Depends(get_uid)], # Ensures user is logged in
):
    """
    Fetches a photo file from MinIO for preview or download.
    User ownership is verified before fetching.
    """
    
    query = """
        SELECT file_path, filename
        FROM photos
        WHERE id = :photo_id AND user_id = :user_id
    """
    
    values = {"photo_id": photo_id, "user_id": user_id}
    photo_data = await database.fetch_one(query=query, values=values)

    if not photo_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found or access denied."
        )

    object_key = photo_data["file_path"]
    filename = photo_data["filename"]
    
    try:
        file_stream = await anyio.to_thread.run_sync(
            get_object_sync,
            object_key
        )
        
        return StreamingResponse(
            file_stream,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename=\"{filename}\"" 
            }
        )

    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File content not found in storage."
        )
    except Exception as e:
        print(f"Error during file fetch operation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve file."
        )


@storage_router.delete("/delete/{photo_id}")
async def delete_photo(
    photo_id: uuid.UUID,
    user_id: Annotated[uuid.UUID, Depends(get_uid)],
):
    """
    Performs a HARD DELETE: Deletes a photo from MinIO and removes its metadata 
    from the database, regardless of its soft-delete status.
    """
    
    # 1. VERIFY OWNERSHIP AND GET FILE/THUMBNAIL PATHS
    query = """
        SELECT file_path
        FROM photos
        WHERE id = :photo_id AND user_id = :user_id
    """
    values = {"photo_id": photo_id, "user_id": user_id}
    photo_data = await database.fetch_one(query=query, values=values)

    if not photo_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found or access denied."
        )

    object_key = photo_data["file_path"]
    
    try:
        # 2. DELETE FROM MINIO (MAIN FILE AND THUMBNAIL)
        await anyio.to_thread.run_sync(
            remove_object_sync,
            object_key
        )
        await anyio.to_thread.run_sync(
            remove_thumbnail_sync,
            photo_id,
            user_id
        )
        
        # 3. DELETE FROM DATABASE
        delete_query = """
            DELETE FROM photos
            WHERE id = :photo_id AND user_id = :user_id
        """
        await database.execute(query=delete_query, values={"photo_id": photo_id, "user_id": user_id})

        return {"message": f"Photo {photo_id} permanently deleted."}
        
    except S3Error as e:

        if e.code == 'NoSuchKey':

            delete_query = """
            DELETE FROM photos
            WHERE id = :photo_id AND user_id = :user_id
            """

            await database.execute(query=delete_query, values={"photo_id": photo_id, "user_id": user_id})
            return {"message": f"Photo {photo_id} permanently deleted (only metadata remaining)."}
        
        else:

            print(f"Error deleting file from Minio: {e}")

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete file from storage."
            )

    except Exception as e:

        print(f"Error during hard delete operation: {e}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete photo metadata."
        )
    

@storage_router.delete("/soft-delete/{photo_id}")
async def soft_delete_photo(
    photo_id: uuid.UUID,
    user_id: Annotated[uuid.UUID, Depends(get_uid)],
):
    """
    Performs a soft delete on a photo by setting the 'is_deleted' flag to TRUE 
    in the database, but does not delete the file from MinIO.
    """
    
    select_query = """
        SELECT is_deleted
        FROM photos
        WHERE id = :photo_id AND user_id = :user_id
    """
    
    values = {"photo_id": photo_id, "user_id": user_id}
    photo_data = await database.fetch_one(query=select_query, values=values)

    if not photo_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found or access denied."
        )

    if photo_data["is_deleted"]:
        return {"message": f"Photo {photo_id} is already soft-deleted."}

    try:
        update_query = """
            UPDATE photos
            SET is_deleted = TRUE
            WHERE id = :photo_id AND user_id = :user_id
        """
        await database.execute(query=update_query, values={"photo_id": photo_id, "user_id": user_id})

        return {"message": f"Photo {photo_id} soft-deleted successfully."}
        
    except Exception as e:
        print(f"Error during soft delete operation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to perform soft delete on photo metadata."
        )
    

@storage_router.delete("/clear-trash")
async def clear_trash(
    user_id: Annotated[uuid.UUID, Depends(get_uid)],
):
    """
    Performs a HARD DELETE on ALL soft-deleted photos for the user.
    Deletes files from MinIO and removes metadata from the database.
    """
    
    # 1. GET ALL TRASHED PHOTO METADATA
    query = """
        SELECT id, file_path
        FROM photos
        WHERE user_id = :user_id AND is_deleted = TRUE
    """
    records = await database.fetch_all(query=query, values={"user_id": user_id})

    if not records:
        return {"message": "Trash is already empty."}

    deleted_count = 0
    
    for record in records:
        photo_id = record['id']
        object_key = record['file_path']
        
        try:
            # 2. DELETE FROM MINIO (MAIN FILE AND THUMBNAIL)
            await anyio.to_thread.run_sync(
                remove_object_sync,
                object_key
            )
            await anyio.to_thread.run_sync(
                remove_thumbnail_sync,
                photo_id,
                user_id
            )
            
            # 3. DELETE FROM DATABASE
            delete_query = """
                DELETE FROM photos
                WHERE id = :photo_id AND user_id = :user_id
            """
            await database.execute(query=delete_query, values={"photo_id": photo_id, "user_id": user_id})
            deleted_count += 1
            
        except S3Error as e:
            
            if e.code == 'NoSuchKey':
                 print(f"Warning: Photo {photo_id} not found in MinIO. Deleting metadata.")
                 delete_query = """
                    DELETE FROM photos
                    WHERE id = :photo_id AND user_id = :user_id
                 """
                 await database.execute(query=delete_query, values={"photo_id": photo_id, "user_id": user_id})
                 deleted_count += 1
            
            else:
                print(f"Error deleting file {photo_id} from Minio during clear-trash: {e}")
                
        except Exception as e:
            print(f"Error processing delete for file {photo_id} during clear-trash: {e}")
            
    return {"message": f"Successfully deleted {deleted_count} item(s) from trash."}



@storage_router.get("/fetch/thumbnail/{photo_id}")
async def fetch_thumbnail( # 🔑 NEW FUNCTION
    photo_id: uuid.UUID,
    user_id: Annotated[uuid.UUID, Depends(get_uid)],
):
    """
    Fetches the thumbnail file from MinIO for gallery display.
    """

    object_key = f"users/{user_id}/thumbnail/{photo_id}.jpeg"
    
    try:
        # 2. ASYNCHRONOUSLY GET OBJECT STREAM FROM MINIO
        file_stream = await anyio.to_thread.run_sync(
            get_object_sync,
            object_key
        )
        
        # 3. RETURN AS STREAMING RESPONSE
        return StreamingResponse(
            file_stream,
            media_type="image/jpeg", # Explicitly set media type for thumbnail
            headers={
                "Content-Disposition": f"inline; filename=\"{photo_id}.jpeg\"" 
            }
        )

    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thumbnail content not found in storage."
        )
    except Exception as e:
        print(f"Error during thumbnail fetch operation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve thumbnail."
        )
    

@storage_router.get("/gallery", response_model=list[PhotoGalleryItem])
async def fetch_all_photos(
    user_id: Annotated[uuid.UUID, Depends(get_uid)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50, # Pagination limit, default 50, max 100
    offset: Annotated[int, Query(ge=0)] = 0, # Pagination offset, default 0
):
    """
    Fetches a paginated list of all non-deleted photos for the authenticated user 
    for display in a gallery view.
    """

    # 1. QUERY DATABASE FOR PHOTO METADATA WITH PAGINATION
    query = """
        SELECT id, filename, file_path, caption, upload_date, file_path, exif_data, is_deleted, is_favorite
        FROM photos
        WHERE user_id = :user_id AND is_deleted = FALSE
        ORDER BY upload_date DESC
        LIMIT :limit OFFSET :offset;
    """
    values = {
        "user_id": user_id,
        "limit": limit,
        "offset": offset
    }
    
    photo_records = await database.fetch_all(query=query, values=values)
    gallery_items = [_process_photo_record(record) for record in photo_records]
        
    return gallery_items


@storage_router.get("/trash", response_model=list[PhotoGalleryItem])
async def fetch_trashed_photos(user_id: Annotated[uuid.UUID, Depends(get_uid)]):
    """
    Fetches all SOFT-DELETED photos for the authenticated user (Trash view).
    """
    query = """
        SELECT id, file_path, filename, caption, upload_date, exif_data, is_deleted
        FROM photos
        WHERE user_id = :user_id AND is_deleted = TRUE
        ORDER BY upload_date DESC;
    """

    records = await database.fetch_all(query=query, values={"user_id": user_id})

    gallery_items = [_process_photo_record(record) for record in records]
    return gallery_items


@storage_router.delete("/soft-delete/{photo_id}")
async def soft_delete_photo(
    photo_id: uuid.UUID,
    user_id: Annotated[uuid.UUID, Depends(get_uid)],
):
    """
    Performs a soft delete on a photo by setting the 'is_deleted' flag to TRUE 
    in the database, but does not delete the file from MinIO.
    """
    
    # 1. VERIFY OWNERSHIP AND CHECK CURRENT STATUS
    select_query = """
        SELECT is_deleted
        FROM photos
        WHERE id = :photo_id AND user_id = :user_id
    """
    values = {"photo_id": photo_id, "user_id": user_id}
    photo_data = await database.fetch_one(query=select_query, values=values)

    if not photo_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found or access denied."
        )

    if photo_data["is_deleted"]:
        return {"message": f"Photo {photo_id} is already soft-deleted."}

    try:
        # 2. PERFORM SOFT DELETE (UPDATE is_deleted to TRUE)
        update_query = """
            UPDATE photos
            SET is_deleted = TRUE
            WHERE id = :photo_id AND user_id = :user_id
        """
        await database.execute(query=update_query, values={"photo_id": photo_id, "user_id": user_id})

        return {"message": f"Photo {photo_id} soft-deleted successfully."}
        
    except Exception as e:
        print(f"Error during soft delete operation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to perform soft delete on photo metadata."
        )


@storage_router.post("/restore/{photo_id}")
async def restore_photo(
    photo_id: uuid.UUID,
    user_id: Annotated[uuid.UUID, Depends(get_uid)],
):
    """
    Restores a soft-deleted photo by setting the 'is_deleted' flag to FALSE.
    """
    
    # 1. VERIFY OWNERSHIP AND CHECK CURRENT STATUS
    select_query = """
        SELECT is_deleted
        FROM photos
        WHERE id = :photo_id AND user_id = :user_id
    """
    values = {"photo_id": photo_id, "user_id": user_id}
    photo_data = await database.fetch_one(query=select_query, values=values)

    if not photo_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found or access denied."
        )

    if not photo_data["is_deleted"]:
        return {"message": f"Photo {photo_id} is not soft-deleted (already in main gallery)."}

    try:
        # 2. RESTORE PHOTO (UPDATE is_deleted to FALSE)
        update_query = """
            UPDATE photos
            SET is_deleted = FALSE
            WHERE id = :photo_id AND user_id = :user_id
        """
        await database.execute(query=update_query, values={"photo_id": photo_id, "user_id": user_id})

        return {"message": f"Photo {photo_id} restored successfully."}
        
    except Exception as e:
        print(f"Error during restore operation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to restore photo metadata."
        )


@storage_router.get("/favorites", response_model=list[PhotoGalleryItem])
async def list_favorite_photos(
    user_id: Annotated[uuid.UUID, Depends(get_uid)],
):
    """
    Retrieves all photos marked as favorite by the user.
    """
    query = """
        SELECT 
            id, filename, caption, upload_date, file_path, 
            exif_data, is_deleted, is_favorite,
            COALESCE(exif_data->>'size_bytes', '0')::int as size_bytes
        FROM photos
        WHERE user_id = :user_id AND is_favorite = TRUE AND is_deleted = FALSE
        ORDER BY upload_date DESC
    """
    photos = await database.fetch_all(query=query, values={"user_id": user_id})

    if not photos:
        return []

    return [_process_photo_record(dict(photo)) for photo in photos]


@storage_router.post("/favorite/{photo_id}", status_code=status.HTTP_200_OK)
async def mark_photo_as_favorite(
    photo_id: uuid.UUID,
    user_id: Annotated[uuid.UUID, Depends(get_uid)],
):
    """
    Marks a specific photo as a favorite by setting is_favorite=TRUE.
    """
    update_query = """
        UPDATE photos
        SET is_favorite = TRUE
        WHERE id = :photo_id AND user_id = :user_id
        RETURNING id
    """
    values = {"photo_id": photo_id, "user_id": user_id}
    result = await database.fetch_one(query=update_query, values=values)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found or access denied."
        )
    
    return {"message": f"Photo {photo_id} marked as favorite."}


@storage_router.delete("/favorite/{photo_id}", status_code=status.HTTP_200_OK)
async def unmark_photo_as_favorite(
    photo_id: uuid.UUID,
    user_id: Annotated[uuid.UUID, Depends(get_uid)],
):
    """
    Removes the favorite mark from a specific photo by setting is_favorite=FALSE.
    """
    update_query = """
        UPDATE photos
        SET is_favorite = FALSE
        WHERE id = :photo_id AND user_id = :user_id
        RETURNING id
    """
    values = {"photo_id": photo_id, "user_id": user_id}
    result = await database.fetch_one(query=update_query, values=values)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found or access denied."
        )

    return {"message": f"Photo {photo_id} unmarked as favorite."}
