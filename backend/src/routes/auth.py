from fastapi import APIRouter

auth_route = APIRouter(prefix = '/auth')

@auth_route.get("/login")
async def login():
    return {
        status: "success"
    }
