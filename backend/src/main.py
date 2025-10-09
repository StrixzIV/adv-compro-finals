import time

import logging
from logging.handlers import RotatingFileHandler

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from starlette.middleware.base import BaseHTTPMiddleware

from routes.healthcheck import healthcheck_route
from routes.auth import auth_route
from routes.oauth import oauth_route
from routes.storage import storage_router
from routes.album import album_router
from routes.dashboard import dashboard_router

from db import connect_db, disconnect_db

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

@app.on_event("shutdown")
async def shutdown():
    await disconnect_db()
