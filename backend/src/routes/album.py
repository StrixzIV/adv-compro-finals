import uuid
import datetime
from typing import Annotated, Optional, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from db import database
from routes.auth import get_uid, oauth2_scheme # Assuming these are available for auth

# --- Pydantic Models ---

class AlbumCreate(BaseModel):
    """Schema for creating a new album."""
    title: str = Field(..., max_length=255)
    description: Optional[str] = None

class AlbumListItem(BaseModel):
    """Schema for listing albums (gallery view)."""
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    created_at: datetime.datetime
    # Could add a 'photo_count: int' here for more context

class PhotoIdList(BaseModel):
    """Schema for adding multiple photos to an album."""
    photo_ids: List[uuid.UUID]


# --- Router Initialization ---

album_router = APIRouter(
    prefix="/albums",
    tags=["Albums"],
    dependencies=[Depends(oauth2_scheme)] # Secure all album routes by default
)

# --- Helper Function (Reuses PhotoGalleryItem from storage.py) ---
# NOTE: To run this, you'd need to import PhotoGalleryItem from storage.py.
# For simplicity here, we'll define a minimal PhotoDetailItem.

class PhotoDetailItem(BaseModel):
    """Minimal schema for a photo within an album."""
    id: uuid.UUID
    filename: str
    caption: Optional[str] = None
    upload_date: datetime.datetime
    file_url: str
    thumbnail_url: str

class AlbumDetail(AlbumListItem):
    """Schema for a single album's detailed view, including its photos."""
    photos: List[PhotoDetailItem]


def _process_photo_record_minimal(record: dict) -> PhotoDetailItem:
    """
    Helper to convert a DB record into a minimal PhotoDetailItem.
    This assumes your DB query selects the necessary fields.
    """
    # NOTE: In a real app, you'd share the PhotoGalleryItem logic 
    # and MinIO stat logic from storage.py to get file_url/thumbnail_url.
    # For this example, we mock the URLs.
    
    file_url = f"/api/v1/storage/fetch/{record['id']}" 
    thumbnail_url = f"/api/v1/storage/fetch/thumbnail/{record['id']}" 

    return PhotoDetailItem(
        id=record["id"],
        filename=record["filename"],
        caption=record["caption"],
        upload_date=record["upload_date"],
        file_url=file_url,
        thumbnail_url=thumbnail_url,
    )


# --- API Endpoints ---

@album_router.post("", response_model=AlbumListItem, status_code=status.HTTP_201_CREATED)
async def create_album(
    album_data: AlbumCreate,
    user_id: Annotated[uuid.UUID, Depends(get_uid)],
):
    """Creates a new album for the authenticated user."""
    query = """
        INSERT INTO albums (user_id, title, description)
        VALUES (:user_id, :title, :description)
        RETURNING id, title, description, created_at
    """
    values = {
        "user_id": user_id,
        "title": album_data.title,
        "description": album_data.description,
    }

    try:
        new_album = await database.fetch_one(query=query, values=values)
        return AlbumListItem(**new_album)
    except Exception as e:
        print(f"Error creating album: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create album."
        )


@album_router.get("", response_model=List[AlbumListItem])
async def list_albums(user_id: Annotated[uuid.UUID, Depends(get_uid)]):
    """Retrieves all albums created by the user."""
    query = """
        SELECT id, title, description, created_at
        FROM albums
        WHERE user_id = :user_id
        ORDER BY created_at DESC
    """
    records = await database.fetch_all(query=query, values={"user_id": user_id})
    return [AlbumListItem(**record) for record in records]


@album_router.get("/{album_id}", response_model=AlbumDetail)
async def get_album_details(
    album_id: uuid.UUID,
    user_id: Annotated[uuid.UUID, Depends(get_uid)],
):
    """Retrieves a specific album's details and its associated photos."""
    
    # 1. Fetch Album Details
    album_query = """
        SELECT id, title, description, created_at
        FROM albums
        WHERE id = :album_id AND user_id = :user_id
    """
    album_data = await database.fetch_one(query=album_query, values={"album_id": album_id, "user_id": user_id})

    if not album_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Album not found or access denied."
        )

    # 2. Fetch Photos in the Album
    photos_query = """
        SELECT 
            p.id, p.filename, p.caption, p.upload_date
        FROM photos p
        JOIN album_photos ap ON p.id = ap.photo_id
        WHERE ap.album_id = :album_id AND p.is_deleted = FALSE
        ORDER BY p.upload_date DESC
    """
    photo_records = await database.fetch_all(query=photos_query, values={"album_id": album_id})
    
    photos_list = [_process_photo_record_minimal(dict(record)) for record in photo_records]

    return AlbumDetail(
        **album_data,
        photos=photos_list
    )


@album_router.post("/{album_id}/add-photos", status_code=status.HTTP_200_OK)
async def add_photos_to_album(
    album_id: uuid.UUID,
    photo_list: PhotoIdList,
    user_id: Annotated[uuid.UUID, Depends(get_uid)],
):
    """Adds a list of photos to a specific album."""
    
    # 1. Verify Album Ownership (Query to fail fast if album/user combo is wrong)
    album_check_query = "SELECT id FROM albums WHERE id = :album_id AND user_id = :user_id"
    if not await database.fetch_one(query=album_check_query, values={"album_id": album_id, "user_id": user_id}):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Album not found or access denied."
        )

    # 2. Prepare for batch insert (ignores duplicates due to PRIMARY KEY)
    insert_values = [
        {"album_id": album_id, "photo_id": photo_id} 
        for photo_id in photo_list.photo_ids
    ]

    # 3. Insert into album_photos
    # ON CONFLICT DO NOTHING ensures that if a photo is already in the album, 
    # it doesn't cause an error, and the unique constraint (album_id, photo_id) is respected.
    insert_query = """
        INSERT INTO album_photos (album_id, photo_id)
        VALUES (:album_id, :photo_id)
        ON CONFLICT (album_id, photo_id) DO NOTHING; 
    """

    await database.execute_many(query=insert_query, values=insert_values)
    
    return {"message": f"Attempted to add {len(insert_values)} photos to album {album_id}. Existing photos ignored."}


@album_router.delete("/{album_id}/remove-photo/{photo_id}", status_code=status.HTTP_200_OK)
async def remove_photo_from_album(
    album_id: uuid.UUID,
    photo_id: uuid.UUID,
    user_id: Annotated[uuid.UUID, Depends(get_uid)],
):
    """Removes a single photo from a specific album (does not delete the photo itself)."""
    
    # 1. The DELETE statement needs to ensure the album belongs to the user.
    delete_query = """
        DELETE FROM album_photos ap
        USING albums a
        WHERE ap.album_id = :album_id 
          AND ap.photo_id = :photo_id 
          AND ap.album_id = a.id
          AND a.user_id = :user_id
        RETURNING ap.album_id
    """
    
    values = {
        "album_id": album_id,
        "photo_id": photo_id,
        "user_id": user_id,
    }
    
    result = await database.fetch_one(query=delete_query, values=values)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Album or photo-in-album link not found, or access denied."
        )

    return {"message": f"Photo {photo_id} removed from album {album_id}."}


@album_router.delete("/{album_id}", status_code=status.HTTP_200_OK)
async def delete_album(
    album_id: uuid.UUID,
    user_id: Annotated[uuid.UUID, Depends(get_uid)],
):
    """
    Deletes an album. Due to ON DELETE CASCADE in db_init.sql, 
    this will also delete all associated records in album_photos.
    """
    
    # The DELETE statement checks for user ownership implicitly.
    delete_query = """
        DELETE FROM albums
        WHERE id = :album_id AND user_id = :user_id
        RETURNING id
    """
    values = {"album_id": album_id, "user_id": user_id}
    result = await database.fetch_one(query=delete_query, values=values)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Album not found or access denied."
        )

    return {"message": f"Album {album_id} and its photo links permanently deleted."}