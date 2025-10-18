import jwt
import uuid
import secrets

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig

from datetime import timedelta, timezone
from datetime import datetime as dt

from typing import Annotated
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext

from db import database
from lib.environ import env, env_single_use

auth_route = APIRouter(prefix = '/auth')

SECRET_KEY = env.JWT_SECRET_KEY
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/v1/token")

conf = ConnectionConfig(
    MAIL_USERNAME = env_single_use('MAIL_USERNAME'),
    MAIL_PASSWORD = env_single_use('MAIL_PASSWORD'),
    MAIL_FROM = env_single_use('MAIL_FROM'),
    MAIL_PORT = int(env.MAIL_PORT),
    MAIL_SERVER = env.MAIL_SERVER,
    MAIL_STARTTLS = True,
    MAIL_SSL_TLS = False,
    USE_CREDENTIALS = True,
    VALIDATE_CERTS = True
)

class Token(BaseModel):
    access_token: str
    token_type: str


class User(BaseModel):
    id: str
    username: str
    email: EmailStr
    role: str


class UserRegistration(BaseModel):
    username: str
    password: str
    email: EmailStr


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordReset(BaseModel):
    token: str
    new_password: str


def get_password_hash(password):
    return pwd_context.hash(password)


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_uid(token: Annotated[str, Depends(oauth2_scheme)]) -> str:

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        
        if user_id is None:
            raise credentials_exception
            
        return uuid.UUID(user_id)
        
    except (jwt.PyJWTError, ValueError):
        raise credentials_exception



def create_access_token(data: dict, expires_delta: timedelta | None = None):

    to_encode = data.copy()

    if expires_delta:
        expire = dt.now() + expires_delta

    else:
        expire = dt.now() + timedelta(minutes=15)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return encoded_jwt


async def send_password_reset_email(email: str, token: str):

    """
    Sends a real email with the password reset link using fastapi-mail.
    """
    
    reset_link = f"http://localhost:3000/password-reset?token={token}"

    html_body = f"""
    <p>Hello,</p>
    <p>You requested a password reset. Please click the link below to set a new password:</p>
    <p><a href="{reset_link}">Reset Your Password</a></p>
    <p>This link will expire in 15 minutes.</p>
    <p>If you did not request a password reset, please ignore this email.</p>
    """

    message = MessageSchema(
        subject="Password Reset Request",
        recipients=[email],
        body=html_body,
        subtype="html"
    )

    fm = FastMail(conf)
    await fm.send_message(message)
    print(f"Password reset email sent to {email}")


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        user_id: str = payload.get("sub")
        user_role: str = payload.get("role")

        if user_id is None:
            raise credentials_exception

    except jwt.PyJWTError:
        raise credentials_exception

    return {"id": user_id, "role": user_role}


async def get_admin_user(current_user: Annotated[dict, Depends(get_current_user)]):

    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user is not an admin"
        )
    
    return current_user


@auth_route.post("/register")
async def register_user(user_data: UserRegistration):

    # Check if a user with the same email already exists
    query = "SELECT id FROM users WHERE email = :email"
    existing_user = await database.fetch_one(query=query, values={"email": user_data.email})

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Hash the password and insert the new user
    hashed_password = get_password_hash(user_data.password)

    query = """
        INSERT INTO users (email, password_hash, username)
        VALUES (:email, :password_hash, :username)
    """

    values = {
        "email": user_data.email,
        "password_hash": hashed_password,
        "username": user_data.username,
    }

    await database.execute(query=query, values=values)
    return {"message": "User registered successfully"}


@auth_route.post("/login", response_model=Token)
async def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):

    query = "SELECT id, password_hash, role FROM users WHERE email = :email"
    user_data = await database.fetch_one(query=query, values={"email": form_data.username})

    if not user_data or not verify_password(form_data.password, user_data.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": str(user_data.id), "role": user_data.role}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


@auth_route.get("/userdata", response_model=User)
async def get_user_data(user_id: Annotated[uuid.UUID, Depends(get_uid)]):

    query = "SELECT id, username, email, role FROM users WHERE id = :id"
    user_info = await database.fetch_one(query=query, values={"id": user_id})

    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user_dict = dict(user_info)
    user_dict["id"] = str(user_dict["id"])

    return user_dict


@auth_route.post("/request-password-reset")
async def request_password_reset(request: PasswordResetRequest, background_tasks: BackgroundTasks):
    
    query = "SELECT id FROM users WHERE email = :email"
    user = await database.fetch_one(query=query, values={"email": request.email})

    # To prevent user enumeration, always return a success message.
    if user:
        # Generate a secure, URL-safe token.
        token = secrets.token_urlsafe(32)
        
        expires_delta = timedelta(minutes=15)
        expires_at = dt.now(timezone.utc) + expires_delta

        insert_query = """
            INSERT INTO password_resets (user_id, token, expires_at)
            VALUES (:user_id, :token, :expires_at)
        """

        values = {
            "user_id": user['id'],
            "token": token,
            "expires_at": expires_at
        }

        await database.execute(query=insert_query, values=values)
        background_tasks.add_task(send_password_reset_email, request.email, token)

    return {"message": "If an account with that email exists, a password reset link has been sent."}


@auth_route.post("/reset-password")
async def reset_password(request: PasswordReset):

    select_query = """
        SELECT user_id, expires_at FROM password_resets WHERE token = :token
    """
    reset_data = await database.fetch_one(query=select_query, values={"token": request.token})

    if not reset_data or dt.now(timezone.utc) > reset_data['expires_at']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset link."
        )

    new_hashed_password = get_password_hash(request.new_password)
    update_query = "UPDATE users SET password_hash = :password_hash WHERE id = :id"
    await database.execute(
        query=update_query, 
        values={"password_hash": new_hashed_password, "id": reset_data['user_id']}
    )

    delete_query = "DELETE FROM password_resets WHERE token = :token"
    await database.execute(query=delete_query, values={"token": request.token})

    return {"message": "Password has been reset successfully."}
