import io
import uuid
import pytest
import datetime

from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock

from main import app
from routes.auth import get_password_hash
from routes.storage import minio_client
from db import database

# Create a test client for the app
client = TestClient(app)

# --- Test Data ---
TEST_USER_ID = uuid.uuid4()
TEST_ADMIN_ID = uuid.uuid4()
TEST_PHOTO_ID = uuid.uuid4()
TEST_ALBUM_ID = uuid.uuid4()

TEST_USER = {
    "id": str(TEST_USER_ID),
    "username": "testuser",
    "email": "test@example.com",
    "role": "user",
}

TEST_ADMIN = {
    "id": str(TEST_ADMIN_ID),
    "username": "adminuser",
    "email": "admin@example.com",
    "role": "admin",
}


@pytest.fixture(scope="module", autouse=True)
def override_dependencies():
    """
    Fixture to override authentication dependencies for all tests.
    This allows us to simulate authenticated users without a real login flow.
    """
    # This empty override will be used for testing public endpoints
    yield

@pytest.fixture
def mock_db(mocker):
    """Mocks the database dependency to return controlled data."""
    mock_database = AsyncMock()
    mocker.patch('db.database', new=mock_database)
    # Patch the database instance in every module where it's imported
    mocker.patch('routes.auth.database', new=mock_database)
    mocker.patch('routes.storage.database', new=mock_database)
    mocker.patch('routes.album.database', new=mock_database)
    mocker.patch('routes.dashboard.database', new=mock_database)
    mocker.patch('main.database', new=mock_database)
    return mock_database

@pytest.fixture
def mock_minio(mocker):
    """Mocks the Minio client to avoid actual file operations."""
    mock_client = MagicMock()
    mock_client.get_presigned_url.return_value = "http://minio.test/some-presigned-url"
    mocker.patch('routes.storage.minio_client', new=mock_client)
    return mock_client

@pytest.fixture
def mock_fastmail(mocker):
    """Mocks the FastMail client to prevent sending emails."""
    mock_fm = AsyncMock()
    mocker.patch('routes.auth.FastMail', return_value=mock_fm)
    return mock_fm


def get_auth_headers(is_admin=False):
    
    """
    Generates a dummy token and headers. In a real test with JWT,
    you would generate a valid token here. For our dependency-overridden
    setup, the content of the token doesn't matter.
    """
    
    token = "fake-test-token"
    return {"Authorization": f"Bearer {token}"}


# 1. Healthcheck and Basic Tests
def test_healthcheck():
    response = client.get("/api/v1/healthcheck")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

# 2. Auth Routes
class TestAuthRoutes:
    def test_register_user(self, mock_db):
        mock_db.fetch_one.return_value = None
        mock_db.execute.return_value = TEST_USER_ID

        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "newuser",
                "password": "newpassword123",
                "email": "new@example.com",
            },
        )
        assert response.status_code == 201
        assert response.json() == {"message": "User newuser registered successfully."}
        
        assert mock_db.fetch_one.call_count == 1
        assert mock_db.execute.call_count == 1

    def test_login_for_access_token(self, mock_db):
        hashed_password = get_password_hash("testpassword")
        mock_db.fetch_one.return_value = {
            "id": TEST_USER_ID,
            "username": "testuser",
            "password_hash": hashed_password,
            "role": "user",
        }

        response = client.post(
            "/api/v1/auth/token",
            data={"username": "testuser", "password": "testpassword"},
        )
        assert response.status_code == 200
        json_data = response.json()
        assert "access_token" in json_data
        assert json_data["token_type"] == "bearer"
    
    def test_get_current_user(self, mock_db):
        # We need to simulate a user being returned by the dependency
        async def override_get_uid():
            return TEST_USER_ID
        
        app.dependency_overrides[uuid.UUID] = override_get_uid
        
        mock_db.fetch_one.return_value = TEST_USER

        response = client.get("/api/v1/auth/me", headers=get_auth_headers())
        
        assert response.status_code == 200
        assert response.json()["username"] == "testuser"
        
        app.dependency_overrides = {} # Clear overrides

# 3. Storage Routes
class TestStorageRoutes:
    
    def test_upload_photo(self, mock_db, mock_minio):
    
        async def override_get_uid():
            return TEST_USER_ID
    
        app.dependency_overrides['get_uid'] = override_get_uid

        # Mock the database execute to return the new photo ID
        mock_db.execute.return_value = TEST_PHOTO_ID
        
        # Create a dummy file in memory
        file_content = b"fake image data"
        file_obj = io.BytesIO(file_content)

        response = client.post(
            "/api/v1/storage/upload",
            files={"file": ("test.jpg", file_obj, "image/jpeg")},
            headers=get_auth_headers(),
        )

        assert response.status_code == 201
        assert response.json() == {"message": "File 'test.jpg' uploaded successfully."}
        # Check that minio put_object was called
        mock_minio.put_object.assert_called_once()
        # Check that photo metadata was saved to the DB
        mock_db.execute.assert_called_once()

        app.dependency_overrides = {}

    def test_get_photos_for_user(self, mock_db, mock_minio):
        async def override_get_uid():
            return TEST_USER_ID
        app.dependency_overrides['get_uid'] = override_get_uid
        
        mock_db.fetch_all.return_value = [
            {
                "id": TEST_PHOTO_ID,
                "filename": "test.jpg",
                "caption": "A test photo",
                "upload_date": datetime.datetime.now(),
                "is_deleted": False,
                "is_favorite": True,
            }
        ]

        response = client.get("/api/v1/storage/photos", headers=get_auth_headers())
        assert response.status_code == 200
        json_data = response.json()
        assert len(json_data) == 1
        assert json_data[0]["filename"] == "test.jpg"
        assert "file_url" in json_data[0]
        assert "thumbnail_url" in json_data[0]
        
        app.dependency_overrides = {}


# 4. Album Routes
class TestAlbumRoutes:
    def test_create_album(self, mock_db):
        async def override_get_uid():
            return TEST_USER_ID
        app.dependency_overrides['get_uid'] = override_get_uid
        
        mock_db.fetch_one.return_value = {
            "id": TEST_ALBUM_ID,
            "title": "My New Album",
            "description": "A great collection.",
            "created_at": datetime.datetime.now(),
        }

        response = client.post(
            "/api/v1/albums",
            json={"title": "My New Album", "description": "A great collection."},
            headers=get_auth_headers(),
        )

        assert response.status_code == 201
        json_data = response.json()
        assert json_data["title"] == "My New Album"

        app.dependency_overrides = {}

    def test_add_photo_to_album(self, mock_db):
        async def override_get_uid():
            return TEST_USER_ID
        app.dependency_overrides['get_uid'] = override_get_uid
        
        # Simulate successful insert
        mock_db.execute.return_value = True

        response = client.post(
            f"/api/v1/albums/{TEST_ALBUM_ID}/photos",
            json={"photo_ids": [str(TEST_PHOTO_ID)]},
            headers=get_auth_headers(),
        )

        assert response.status_code == 200
        assert response.json() == {"message": f"1 photo(s) added to album {TEST_ALBUM_ID}."}

        app.dependency_overrides = {}


class TestDashboardRoutes:
    def test_get_dashboard_stats_as_admin(self, mock_db, mocker):
        
        mocker.patch('routes.dashboard.check_services', new=AsyncMock(return_value=[{"service": "test", "status": "ok"}]))
        mocker.patch('routes.dashboard.get_storage_usage', new=AsyncMock(return_value={"database_size_mb": 10, "photo_storage_size_mb": 100, "total_size_mb": 110}))
        mocker.patch('routes.dashboard.aggregate_requests_from_log', return_value={"time_series": [], "top_endpoints_15m": []})
        mock_db.execute.side_effect = [150, 25]
        
        async def override_get_admin_user():
            return TEST_ADMIN
        app.dependency_overrides['get_admin_user'] = override_get_admin_user

        response = client.get("/api/v1/dashboard", headers=get_auth_headers(is_admin=True))

        assert response.status_code == 200
        data = response.json()
        assert data['total_photos'] == 150
        assert data['total_users'] == 25
        assert data['storage_usage']['total_size_mb'] == 110

        app.dependency_overrides = {}

    def test_get_dashboard_stats_permission_denied(self):
        
        async def override_get_admin_user():
            return None
        
        app.dependency_overrides['get_admin_user'] = override_get_admin_user

        response = client.get("/api/v1/dashboard", headers={"Authorization": "Bearer fake-token"})
        
        assert response.status_code == 401
        
        app.dependency_overrides = {}
