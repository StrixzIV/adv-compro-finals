from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.healthcheck import healthcheck_route
from routes.auth import auth_route
from routes.oauth import oauth_route

from db import connect_db, disconnect_db

app = FastAPI()
app.include_router(healthcheck_route, prefix="/api/v1")
app.include_router(auth_route, prefix="/auth/v1")
app.include_router(oauth_route, prefix="/api/v1")

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
