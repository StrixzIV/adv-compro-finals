from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import signal

from db import connect_db, disconnect_db

app = FastAPI()

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

def signal_handler(sig, frame):
    print(f"Received signal {sig}")

signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)
