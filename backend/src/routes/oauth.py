import os
import jwt
import uuid
import aiohttp

from fastapi import APIRouter, status, Request
from fastapi.responses import RedirectResponse, Response

oauth_route = APIRouter(prefix = '/oauth')

@oauth_route.get('/redirect')
async def oauth_redirect():

    params = {
        'client_id': os.environ['GOOGLE_OAUTH_CLIENT_ID'],
        'redirect_uri': 'http://localhost:8000/api/v1/oauth/callback',
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
        'client_id': os.environ['GOOGLE_OAUTH_CLIENT_ID'],
        'client_secret': os.environ['GOOGLE_OAUTH_CLIENT_SECRETS'],
        'redirect_uri': 'http://localhost:8000/api/v1/oauth/callback',
        'grant_type': 'authorization_code'
    }

    async with aiohttp.ClientSession() as session:
    
        token_url = 'https://oauth2.googleapis.com/token'
    
        try:
            async with session.post(token_url, data=token_params) as resp:

                if resp.status != 200:
                    print(f"Error exchanging token: {await resp.text()}")
                    return RedirectResponse('http://localhost:3000?error=token_exchange_failed', status_code=status.HTTP_302_FOUND)

                token_data = await resp.json()

        except aiohttp.ClientError as e:
            print(f"Network error during token exchange: {e}")
            return RedirectResponse('http://localhost:3000?error=network_error', status_code=status.HTTP_302_FOUND)

        id_token = token_data.get('id_token')
        
        if not id_token:
            return RedirectResponse('http://localhost:3000?error=no_id_token', status_code=status.HTTP_302_FOUND)

        try:

            user_info = jwt.decode(id_token, options={"verify_signature": False})

            # NOTE: FOR DEBUGGING PURPUSE ONLY! REMOVE BEFORE PRODUCTION
            print(user_info)

            user_email = user_info.get('email')
            user_name = user_info.get('name')
            
            # Redirect the user to your front-end with their info.
            # This is just an example; a better approach would be to set a session
            # or a cookie and not expose this in the URL.
            redirect_url = f"http://localhost:3000/?email={user_email}&name={user_name}"
            return RedirectResponse(redirect_url, status_code=status.HTTP_302_FOUND)

        except jwt.exceptions.DecodeError as e:
            print(f"Error decoding JWT token: {e}")
            return RedirectResponse('http://localhost:3000?error=invalid_token', status_code=status.HTTP_302_FOUND)
