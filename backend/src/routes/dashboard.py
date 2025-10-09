import time
import random

from typing import Annotated, List
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from db import database
from routes.auth import oauth2_scheme, get_uid

dashboard_router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
    dependencies=[Depends(oauth2_scheme)]
)

# --- Pydantic Models for the response ---

class StatCard(BaseModel):
    """Represents a single statistic card on the dashboard."""
    label: str
    value: int
    change: float # Example: 0.12 for +12%

class TimeSeriesDataPoint(BaseModel):
    """Represents a single data point in a time-series chart."""
    time: str # A label for the time axis, e.g., "Jan", "Feb", or a date
    value: int

class StorageBreakdownItem(BaseModel):
    """Represents an item in the storage usage pie chart."""
    name: str
    value: int # Could be a count of files or total size

class SystemStatsResponse(BaseModel):
    """The complete response model for the dashboard stats endpoint."""
    stat_cards: List[StatCard]
    user_signups: List[TimeSeriesDataPoint]
    storage_breakdown: List[StorageBreakdownItem]
    daily_traffic: List[TimeSeriesDataPoint]

# --- Endpoint ---

@dashboard_router.get("/stats", response_model=SystemStatsResponse)
async def get_system_stats(user_id: Annotated[str, Depends(get_uid)]):
    """
    Retrieves aggregated system statistics for the dashboard.

    This endpoint provides a mix of real data from the database (like user and photo counts)
    and placeholder data for metrics not yet tracked (like daily traffic).
    """

    # --- Stat Cards Data ---
    # Query for the total number of users in the system.
    total_users_query = "SELECT COUNT(*) as count FROM users;"
    total_users_result = await database.fetch_one(total_users_query)
    total_users = total_users_result['count'] if total_users_result else 0

    # Query for the total number of photos uploaded by the current user.
    total_photos_query = "SELECT COUNT(*) as count FROM photos WHERE user_id = :user_id;"
    total_photos_result = await database.fetch_one(total_photos_query, values={"user_id": user_id})
    user_photos = total_photos_result['count'] if total_photos_result else 0
    
    # Query for the total number of albums created by the current user.
    total_albums_query = "SELECT COUNT(*) as count FROM albums WHERE user_id = :user_id;"
    total_albums_result = await database.fetch_one(total_albums_query, values={"user_id": user_id})
    user_albums = total_albums_result['count'] if total_albums_result else 0

    stat_cards = [
        StatCard(label="Your Photos", value=user_photos, change=random.uniform(-0.1, 0.2)),
        StatCard(label="Your Albums", value=user_albums, change=random.uniform(-0.1, 0.2)),
        StatCard(label="Total Users", value=total_users, change=random.uniform(0.01, 0.05)),
        # Placeholder for requests, as seen in the frontend mock data.
        StatCard(label="Requests (Last Hr)", value=random.randint(100, 300), change=random.uniform(-0.5, 0.5)),
    ]

    # --- User Signups Chart Data ---
    # Query for user signups over the last 30 days.
    thirty_days_ago = time.time() - timedelta(days=30)
    user_signups_query = """
        SELECT DATE_TRUNC('day', created_at)::DATE as signup_date, COUNT(id) as count
        FROM users
        WHERE created_at >= :thirty_days_ago
        GROUP BY signup_date
        ORDER BY signup_date;
    """
    signups_result = await database.fetch_all(user_signups_query, values={"thirty_days_ago": thirty_days_ago})
    
    user_signups = [
        TimeSeriesDataPoint(time=row['signup_date'].strftime('%b %d'), value=row['count'])
        for row in signups_result
    ]

    # --- Storage Breakdown Pie Chart (Placeholder data) ---
    # This is difficult to calculate without file size data, so we use placeholders.
    storage_breakdown = [
        StorageBreakdownItem(name="Photos", value=user_photos),
        StorageBreakdownItem(name="Videos", value=random.randint(0, 50)),
        StorageBreakdownItem(name="Other", value=random.randint(0, 10)),
    ]
    
    # --- Daily Traffic Chart (Placeholder data) ---
    # Generate random data for the last 15 days to simulate traffic.
    daily_traffic = []
    today = datetime.utcnow()
    for i in range(15):
        day = today - timedelta(days=i)
        daily_traffic.append(
            TimeSeriesDataPoint(time=day.strftime('%b %d'), value=random.randint(500, 2500))
        )
    daily_traffic.reverse()

    return SystemStatsResponse(
        stat_cards=stat_cards,
        user_signups=user_signups,
        storage_breakdown=storage_breakdown,
        daily_traffic=daily_traffic,
    )
