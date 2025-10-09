import re

from collections import Counter
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from minio.error import S3Error

from lib.environ import env
from routes.storage import minio_client

# Assuming you have a get_db function for database sessions
# If not, you'll need to create one.
from db import database

LOG_FILE_PATH = "/var/backend/logs/api.log"

dashboard_router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)

class ServiceStatus(BaseModel):
    service: str
    status: str
    details: str | None = None

class StorageUsage(BaseModel):
    database_size_mb: float
    photo_storage_size_mb: float
    total_size_mb: float

class TimeSeriesRequestStat(BaseModel):
    minute: str  # Format: "HH:MM"
    count: int

class EndpointRequestStat(BaseModel):
    endpoint: str
    count: int

class RequestStats(BaseModel):
    # This now represents our 15-minute time series data
    time_series: list[TimeSeriesRequestStat]
    top_endpoints_15m: list[EndpointRequestStat]

class DashboardStats(BaseModel):
    service_status: list[ServiceStatus]
    total_photos: int
    total_users: int
    storage_usage: StorageUsage
    request_stats: RequestStats

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
    
    
def aggregate_requests_from_log(minutes: int = 15) -> RequestStats:
    """
    Parses the log file to create a time series of request data over the last N minutes.
    """
    now = datetime.now()
    time_threshold = now - timedelta(minutes=minutes)
    
    log_pattern = re.compile(r"\[in (.*?)\] INFO: request path='(.*?)'")
    
    # Initialize a dictionary for each of the last 15 minutes with a count of 0.
    # The key is the minute in "HH:MM" format.
    minute_counts = { (now - timedelta(minutes=i)).strftime('%H:%M'): 0 for i in range(minutes) }
    endpoint_counts = Counter()

    try:
        with open(LOG_FILE_PATH, "r") as f:
            for line in f:
                match = log_pattern.search(line)
                if not match:
                    continue

                timestamp_str, path = match.groups()
                log_time = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')

                # Check if the log entry is within our 15-minute window
                if log_time >= time_threshold:
                    # Aggregate by minute
                    minute_key = log_time.strftime('%H:%M')
                    if minute_key in minute_counts:
                        minute_counts[minute_key] += 1
                    
                    # Aggregate top endpoints within the same window
                    endpoint_counts[path] += 1

    except FileNotFoundError:
        pass

    time_series_stats = sorted(
        [TimeSeriesRequestStat(minute=m, count=c) for m, c in minute_counts.items()],
        key=lambda x: x.minute
    )
    
    top_endpoints = [EndpointRequestStat(endpoint=e, count=c) for e, c in endpoint_counts.most_common(5)]
    
    return RequestStats(
        time_series=time_series_stats,
        top_endpoints_15m=top_endpoints
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
        total_photos = await database.execute("SELECT COUNT(*) FROM photos;")
        total_users = await database.execute("SELECT COUNT(*) FROM users;")
        
        # --- Disk Usage ---
        storage_stats = await get_storage_usage()
        
        # --- Requests ---
        request_aggregation = aggregate_requests_from_log(minutes=15)

        return DashboardStats(
            service_status=service_statuses,
            total_photos=total_photos,
            total_users=total_users,
            storage_usage=storage_stats,
            request_stats=request_aggregation
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
