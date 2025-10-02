import io
import uuid
import json
import anyio
import datetime

from PIL import Image
from PIL.ExifTags import TAGS
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
    thumbnail_url: str # Placeholder for future thumbnail feature
    exif_data: Optional[dict[str, Any]] = None


def create_thumbnail_in_memory(file_content) -> Optional[io.BytesIO]:
    """
    Creates a thumbnail of the image and returns it as a BytesIO stream.
    The file_content pointer must be reset before and after this call.
    """
    try:
        file_content.seek(0)
        img = Image.open(file_content)
        
        # 1. Convert to RGB if necessary (important for JPEGs)
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
            
        # 2. Create the thumbnail (maintaining aspect ratio)
        img.thumbnail(THUMBNAIL_SIZE)
        
        # 3. Save the thumbnail to an in-memory byte stream
        thumbnail_stream = io.BytesIO()
        img.save(thumbnail_stream, format='JPEG', quality=85)
        thumbnail_stream.seek(0)
        
        file_content.seek(0) # Reset main file pointer for MinIO upload

        return thumbnail_stream
        
    except Exception as e:
        print(f"Could not create thumbnail: {e}")
        file_content.seek(0)
        return None


def extract_exif_data(file_content) -> Optional[dict[str, any]]:
    """
    Synchronously extracts EXIF data from an image file stream.
    
    Args:
        file_content: SpooledTemporaryFile object (the raw UploadFile.file).
    """
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
        
        # 4. Convert tag IDs to human-readable names
        for tag_id, value in exif_raw.items():
            tag_name = TAGS.get(tag_id, tag_id)
            
            # Simple sanitization: convert non-standard types (like tuples from 
            # Pillow) to strings to ensure JSON serialization works later.
            if isinstance(value, tuple) or isinstance(value, bytes):
                value = str(value)
                
            exif_data[tag_name] = value

        return exif_data
        
    except Exception as e:
        # Catch exceptions like: not an image, corrupted file, missing Pillow
        print(f"Could not extract EXIF data: {e}")
        return None
    finally:
        # 5. Reset file pointer again for the upcoming MinIO upload thread
        file_content.seek(0)


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
    
    # 1. VERIFY OWNERSHIP AND GET FILE PATH
    query = """
        SELECT file_path, filename
        FROM photos
        WHERE id = :photo_id AND user_id = :user_id AND is_deleted = FALSE
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
        # 2. ASYNCHRONOUSLY GET OBJECT STREAM FROM MINIO
        # Run the synchronous MinIO fetching operation in a thread pool
        file_stream = await anyio.to_thread.run_sync(
            get_object_sync,
            object_key
        )
        
        # 3. RETURN AS STREAMING RESPONSE
        # StreamingResponse handles reading the generator returned by get_object_sync
        # and streams it back to the client, keeping the app non-blocking.
        return StreamingResponse(
            file_stream,
            media_type="application/octet-stream", # Generic binary type
            headers={
                # Force download/filename for the client
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
    Deletes a photo from MinIO and removes its metadata from the database.
    """
    
    # 1. VERIFY OWNERSHIP AND GET FILE PATH
    # Select the file_path and verify user ownership before deletion
    query = """
        SELECT file_path
        FROM photos
        WHERE id = :photo_id AND user_id = :user_id AND is_deleted = FALSE
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
        # 2. DELETE FROM MINIO
        await anyio.to_thread.run_sync(
            remove_object_sync,
            object_key
        )
        
        # 3. DELETE FROM DATABASE
        # Alternatively, you could just set is_deleted = TRUE (soft delete)
        delete_query = """
            DELETE FROM photos
            WHERE id = :photo_id AND user_id = :user_id
        """
        await database.execute(query=delete_query, values={"photo_id": photo_id, "user_id": user_id})

        return {"message": f"Photo {photo_id} deleted successfully."}
        
    except S3Error as e:
        # If the file wasn't found in MinIO but exists in DB, log and proceed 
        # to delete the DB record.
        if e.code == 'NoSuchKey':
             print(f"Warning: Photo {photo_id} not found in MinIO, but metadata exists. Deleting metadata.")
             # Fall-through to DB deletion (step 3)
        else:
            print(f"Error deleting file from MinIO: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete file from storage."
            )
    except Exception as e:
        print(f"Error during delete operation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete photo metadata."
        )
    

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
        SELECT id, filename, caption, upload_date, file_path, exif_data
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
    
    if not photo_records:
        return []

    # 3. BUILD RESPONSE LIST
    gallery_items: list[PhotoGalleryItem] = []
    for record in photo_records:
        
        # 🔑 FIX: Handle JSONB data coming back as a string (if the DB driver requires it)
        exif_data_from_db = record["exif_data"]
        parsed_exif_data = None
        
        if isinstance(exif_data_from_db, str):
            try:
                # Attempt to parse the string back into a dictionary
                parsed_exif_data = json.loads(exif_data_from_db)
            except json.JSONDecodeError:
                print(f"Error decoding EXIF data string for photo ID {record['id']}")
                parsed_exif_data = None
        elif isinstance(exif_data_from_db, dict) or exif_data_from_db is None:
            # Data is already a dict or None (ideal case for JSONB)
            parsed_exif_data = exif_data_from_db
        else:
             # Handles other potential data types returned by the DB (e.g., if it's already an asyncpg Record object)
             parsed_exif_data = dict(exif_data_from_db) if exif_data_from_db is not None else None


        object_key = record["file_path"]
        file_url = f"/storage/fetch/{record['id']}" 
        thumbnail_url = f"/storage/fetch/thumbnail/{record['id']}" 

        gallery_items.append(
            PhotoGalleryItem(
                id=record["id"],
                filename=record["filename"],
                caption=record["caption"],
                upload_date=record["upload_date"],
                file_url=file_url,
                thumbnail_url=thumbnail_url,
                exif_data=parsed_exif_data,\
            )
        )
        
    return gallery_items
