# File: backend/src/routers/dashboard.py

import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from minio.error import S3Error

from routes.storage import minio_client
from lib.environ import env, env_single_use

# Assuming you have a get_db function for database sessions
# If not, you'll need to create one.
from db import database

dashboard_router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)

class ServiceStatus(BaseModel):
    service: str
    status: str
    details: str | None = None

class StorageUsage(BaseModel):
    database_size_mb: float = Field(..., description="Size of the PostgreSQL database in MB.")
    photo_storage_size_mb: float = Field(..., description="Size of the MinIO object storage in MB.")
    total_size_mb: float = Field(..., description="Total combined storage usage in MB.")

class DashboardStats(BaseModel):
    service_status: list[ServiceStatus]
    total_photos: int
    total_users: int
    storage_usage: StorageUsage
    # Placeholder for request count, see notes below
    requests_last_24h: int = Field(..., description="Placeholder for total requests in the last 24 hours.")

# --- Helper Functions ---

async def check_services():
    
    """Checks the status of dependent services."""
    
    statuses = []

    # 1. Check Backend API (itself)
    statuses.append(ServiceStatus(service="Backend API", status="Online"))
    
    try:
        await database.execute("SELECT 1")
        statuses.append(ServiceStatus(service="PostgreSQL DB", status="Online"))
        
    except Exception as e:
        statuses.append(ServiceStatus(service="PostgreSQL DB", status="Offline", details=str(e)))

    try:
        minio_client.list_buckets()
        statuses.append(ServiceStatus(service="MinIO Storage", status="Online"))
        
    except Exception as e:
        statuses.append(ServiceStatus(service="MinIO Storage", status="Offline", details=str(e)))
        
    return statuses


async def get_storage_usage():
    
    """Calculates storage usage for database and photos."""
    
    db_size_bytes = await database.execute(f"SELECT pg_database_size('{env.POSTGRES_DB}');")
    db_size_mb = round(db_size_bytes / (1024 * 1024), 2) if db_size_bytes else 0.0

    # Get MinIO size
    photo_storage_bytes = 0
    
    try:
        buckets = minio_client.list_buckets()
        for bucket in buckets:
            objects = minio_client.list_objects(bucket.name, recursive=True)
            for obj in objects:
                photo_storage_bytes += obj.size
                
    except S3Error:
        # Handle case where MinIO might be down
        pass
        
    photo_storage_mb = round(photo_storage_bytes / (1024 * 1024), 2)
    
    return StorageUsage(
        database_size_mb=db_size_mb,
        photo_storage_size_mb=photo_storage_mb,
        total_size_mb=round(db_size_mb + photo_storage_mb, 2)
    )

# --- API Endpoint ---

@dashboard_router.get("", response_model=DashboardStats)
async def get_dashboard_stats():
    
    """
    Retrieves operational statistics for the entire system.
    """
    
    try:
        # --- Service Availability ---
        service_statuses = await check_services()

        # --- Photo & User Count ---
        # NOTE: Replace 'photos' and 'users' with your actual table names
        total_photos = await database.execute("SELECT COUNT(*) FROM photos;")
        total_users = await database.execute("SELECT COUNT(*) FROM users;")
        
        # --- Disk Usage ---
        storage_stats = await get_storage_usage()

        # --- Request Count (Placeholder) ---
        # Implementing a true request counter requires middleware to log requests.
        # This is a placeholder value.
        request_count = 1024 

        return DashboardStats(
            service_status=service_statuses,
            total_photos=total_photos,
            total_users=total_users,
            storage_usage=storage_stats,
            requests_last_24h=request_count,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
