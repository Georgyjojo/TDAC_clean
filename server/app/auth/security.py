# from pwdlib import PasswordHash
# from jose import jwt,JWTError
# from datetime import datetime, timedelta, timezone
# password_hash = PasswordHash.recommended()

# def hash_password(password: str) -> str:
#     return password_hash.hash(password)

# def verify_password(password: str, hashed_password: str) -> bool:
#     return password_hash.verify(password,hashed_password)
##************************************** old  agron hashing changed due to mismatch  with  eralier hashing (bycript)

import os

from pwdlib.hashers.bcrypt import BcryptHasher
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone

password_hash = BcryptHasher()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)
#*************************************************************************
# Secret key used to sign the JWT. Read from the environment so it is never
# hardcoded in source; falls back to the previous development value only if
# JWT_SECRET_KEY is not set, so existing local setups keep working until
# they add it to .env.
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "temporary-secret-key")
ALGORITHM = "HS256" #algorithm

def create_access_token(
    data: dict,
    expires_minutes: int = 30
) -> str:

    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes
    )

    to_encode.pop("exp", None)

    to_encode["exp"] = int(expire.timestamp())
    to_encode["type"] = "access"

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

def decode_access_token(token: str) -> dict:
    payload = jwt.decode(
        token,
        SECRET_KEY,
        algorithms=[ALGORITHM]
    )
    if payload.get("type") != "access":
        raise JWTError("Invalid access token")


    return payload

def create_refresh_token(
    data: dict,
    expires_days: int = 7
) -> str:

    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(
        days=expires_days
    )

    to_encode.pop("exp", None)

    to_encode["exp"] = int(expire.timestamp())
    to_encode["type"] = "refresh"

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

def decode_refresh_token(token:str) -> dict:
    payload = jwt.decode(
        token,
        SECRET_KEY,
        algorithms=[ALGORITHM]
    )

    if payload.get("type") != "refresh":
        raise JWTError("Invalid refresh token")

    return payload