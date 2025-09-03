from fastapi import APIRouter

healthcheck_route = APIRouter(prefix = '/healthcheck')

@healthcheck_route.get("/ping")
async def ping_healthcheck():
    return 'abc'
