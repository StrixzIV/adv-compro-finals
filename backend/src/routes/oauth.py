import jwt
import uuid
import aiohttp

from db import database
from lib.environ import env, env_single_use

from fastapi import APIRouter, status, Request
from fastapi.responses import RedirectResponse, Response

oauth_route = APIRouter(prefix = '/oauth')
client_secret = env_single_use("GOOGLE_OAUTH_CLIENT_SECRETS")

@oauth_route.get('/redirect')
async def oauth_redirect():

    params = {
        'client_id': env.GOOGLE_OAUTH_CLIENT_ID,
        'redirect_uri': f'{env.FASTAPI_URL}/api/v1/oauth/callback',
        'response_type': 'code',
        'scope': 'openid email profile',
        'access_type': 'offline',
        'prompt': 'consent',
        'random_state': uuid.uuid4()
    }

    str_params = '&'.join([f'{k}={v}' for (k, v) in params.items()])
    auth_url = f'https://accounts.google.com/o/oauth2/v2/auth?{str_params}'

    return RedirectResponse(auth_url, status_code=status.HTTP_302_FOUND)

@oauth_route.get('/callback')
async def oauth_callback(request: Request):

    code = request.query_params.get('code')

    token_params = {
        'code': code,
        'client_id': env.GOOGLE_OAUTH_CLIENT_ID,
        'client_secret': client_secret,
        'redirect_uri': f'{env.FASTAPI_URL}/api/v1/oauth/callback',
        'grant_type': 'authorization_code'
    }

    async with aiohttp.ClientSession() as session:
    
        token_url = 'https://oauth2.googleapis.com/token'
    
        try:
            async with session.post(token_url, data=token_params) as resp:

                if resp.status != 200:
                    print(f"Error exchanging token: {await resp.text()}")
                    return RedirectResponse(f"{env.HOST_URL}?error=token_exchange_failed", status_code=status.HTTP_302_FOUND)

                token_data = await resp.json()

        except aiohttp.ClientError as e:
            print(f"Network error during token exchange: {e}")
            return RedirectResponse(f"{env.HOST_URL}?error=network_error", status_code=status.HTTP_302_FOUND)

        id_token = token_data.get('id_token')
        
        if not id_token:
            return RedirectResponse(f"{env.HOST_URL}?error=no_id_token", status_code=status.HTTP_302_FOUND)

        try:

            user_info = jwt.decode(id_token, options={"verify_signature": False})

            google_id = user_info.get('sub')
            email = user_info.get('email')
            username = user_info.get('name')

            # Check if a user with this google_id already exists in the database
            query = "SELECT id FROM users WHERE google_id = :google_id"
            existing_user = await database.fetch_one(query=query, values={"google_id": google_id})

            if not existing_user:
                # If the user does not exist, create a new record
                query = """
                    INSERT INTO users (google_id, email, username)
                    VALUES (:google_id, :email, :username)
                """
                values = {
                    "google_id": google_id,
                    "email": email,
                    "username": username,
                }
                await database.execute(query=query, values=values)
            
            redirect_url = f"{env.HOST_URL}/?email={email}&name={username}"
            return RedirectResponse(redirect_url, status_code=status.HTTP_302_FOUND)

        except jwt.exceptions.DecodeError as e:
            print(f"Error decoding JWT token: {e}")
            return RedirectResponse(f"{env.HOST_URL}?error=invalid_token", status_code=status.HTTP_302_FOUND)
