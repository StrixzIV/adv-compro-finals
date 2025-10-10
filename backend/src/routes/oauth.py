import jwt
import uuid
import aiohttp
from datetime import timedelta

from db import database
from lib.environ import env, env_single_use

from fastapi import APIRouter, status, Request
from fastapi.responses import RedirectResponse, Response

from routes.auth import create_access_token

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
        
        async with session.post('https://oauth2.googleapis.com/token', data=token_params) as resp:
            token_data = await resp.json()

        id_token = token_data.get('id_token')
        
        try:
            
            decoded_token = jwt.decode(id_token, options={"verify_signature": False})

            google_id = decoded_token.get('sub')
            email = decoded_token.get('email')
            username = decoded_token.get('name')

            query = "SELECT id, role FROM users WHERE google_id = :google_id"
            existing_user = await database.fetch_one(query=query, values={"google_id": google_id})

            user_id = None
            user_role = 'user'

            if not existing_user:

                query = """
                    INSERT INTO users (google_id, email, username)
                    VALUES (:google_id, :email, :username)
                    RETURNING id;
                """

                values = {
                    "google_id": google_id,
                    "email": email,
                    "username": username,
                }

                new_user_id_result = await database.fetch_one(query=query, values=values)
                user_id = new_user_id_result['id'] if new_user_id_result else None
                
            else:
                user_id = existing_user['id']
                user_role = existing_user['role']

            if not user_id:
                return RedirectResponse(f"{env.HOST_URL}/login?error=user_id_error", status_code=status.HTTP_302_FOUND)

            access_token_expires = timedelta(minutes=30)
            access_token = create_access_token(
                data={"sub": str(user_id), "role": user_role}, 
                expires_delta=access_token_expires
            )

            redirect_url = f"{env.HOST_URL}/gallery#/auth_success?token={access_token}&token_type=bearer"

            return RedirectResponse(redirect_url, status_code=status.HTTP_302_FOUND)
        
        except jwt.exceptions.DecodeError as e:
            print(f"Error decoding JWT token: {e}")
            return RedirectResponse(f"{env.HOST_URL}/login?error=invalid_token", status_code=status.HTTP_302_FOUND)
        
        except Exception as e:
            print(f"An unexpected error occurred: {e}")
            return RedirectResponse(f"{env.HOST_URL}/login?error=unknown_error", status_code=status.HTTP_302_FOUND)
