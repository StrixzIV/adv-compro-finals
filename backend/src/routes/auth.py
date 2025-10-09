import jwt
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

from datetime import timedelta
from datetime import datetime as dt

from typing import Annotated
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext

from db import database
from lib.environ import env

auth_route = APIRouter(prefix = '/auth')

SECRET_KEY = env.JWT_SECRET_KEY
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/v1/token")

class Token(BaseModel):
    access_token: str
    token_type: str


class User(BaseModel):
    id: str
    username: str
    email: EmailStr


class UserRegistration(BaseModel):
    username: str
    password: str
    email: EmailStr


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


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):

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

    except jwt.PyJWTError:
        raise credentials_exception

    return {"id": user_id}


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):

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

    except jwt.PyJWTError:
        raise credentials_exception

    # You could fetch the user from the database here if needed, but for
    # a basic auth system, we'll just return the user ID.
    return {"id": user_id}


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

    query = "SELECT id, password_hash FROM users WHERE email = :email"
    user_data = await database.fetch_one(query=query, values={"email": form_data.username})

    if not user_data or not verify_password(form_data.password, user_data.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": str(user_data.id)}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


@auth_route.get("/userdata", response_model=User)
async def get_user_data(user_id: Annotated[uuid.UUID, Depends(get_uid)]):

    query = "SELECT id, username, email FROM users WHERE id = :id"
    user_info = await database.fetch_one(query=query, values={"id": user_id})

    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user_dict = dict(user_info)
    user_dict["id"] = str(user_dict["id"])

    return user_dict
