import time

import logging
from logging.handlers import RotatingFileHandler

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from starlette.middleware.base import BaseHTTPMiddleware

from routes.healthcheck import healthcheck_route
from routes.auth import auth_route, get_password_hash
from routes.oauth import oauth_route
from routes.storage import storage_router
from routes.album import album_router
from routes.dashboard import dashboard_router

from lib.environ import env_single_use
from db import connect_db, disconnect_db, database

LOG_FILE = "/var/backend/logs/api.log"

file_handler = RotatingFileHandler(LOG_FILE, maxBytes=10*1024*1024, backupCount=5)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s',
    '[in %Y-%m-%d %H:%M:%S]' # Timestamp format for easy parsing
))

logger = logging.getLogger("api_logger")
logger.setLevel(logging.INFO)
logger.addHandler(file_handler)

class LogRequestsMiddleware(BaseHTTPMiddleware):
    
    async def dispatch(self, request: Request, call_next):
        
        logger.info(f"request path='{request.url.path}' method='{request.method}'")
        response = await call_next(request)
        
        return response


app = FastAPI()

app.add_middleware(LogRequestsMiddleware)

app.include_router(healthcheck_route, prefix="/api/v1")
app.include_router(auth_route, prefix="/api/v1")
app.include_router(oauth_route, prefix="/api/v1")
app.include_router(storage_router, prefix="/api/v1")
app.include_router(album_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True, 
    allow_methods=["*"],     
    allow_headers=["*"],    
)

@app.on_event("startup")
async def startup():

    await connect_db()

    admin_email = env_single_use('ADMIN_USERNAME')
    admin_password = env_single_use('ADMIN_PASSWORD')

    if not admin_email or not admin_password:
        logger.log(level=logging.FATAL, msg="Admin username or password not found")
        exit(1)

    query = "SELECT id FROM users WHERE email = :email"
    user_exists = await database.fetch_one(query=query, values={"email": admin_email})

    if not user_exists:

        hashed_password = get_password_hash(admin_password)
        
        username = admin_email.split('@')[0]

        insert_query = """
            INSERT INTO users (email, password_hash, username, role) 
            VALUES (:email, :password_hash, :username, 'admin')
            ON CONFLICT (email) DO NOTHING;
        """

        values = {
            "email": admin_email,
            "password_hash": hashed_password,
            "username": username
        }
        
        await database.execute(query=insert_query, values=values)
        logger.info(f"Admin user '{admin_email}' created successfully.")


@app.on_event("shutdown")
async def shutdown():
    await disconnect_db()
