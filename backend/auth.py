import os
import secrets
from hashlib import sha256
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

SECRET_KEY = os.getenv("SECRET_KEY", "simple_secret_key")
ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = int(os.getenv("ACCESS_TOKEN_MINUTES", "120"))
REFRESH_TOKEN_MINUTES = int(os.getenv("REFRESH_TOKEN_MINUTES", "10080"))

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
refresh_tokens_storage: dict[str, int] = {}


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_context.verify(plain_password, hashed_password)


def create_access_token(user_id: int, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES)
    payload = {"user_id": user_id, "role": role, "type": "access", "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=REFRESH_TOKEN_MINUTES)
    payload = {"user_id": user_id, "type": "refresh", "jti": secrets.token_urlsafe(16), "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str):
    payload = decode_token(token)
    if payload is None:
        return None

    token_type = payload.get("type")
    if token_type not in (None, "access"):
        return None
    return payload


def decode_refresh_token(token: str):
    payload = decode_token(token)
    if payload is None:
        return None
    if payload.get("type") != "refresh":
        return None
    return payload


def decode_token(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def get_token_hash(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def store_refresh_token(token: str, user_id: int):
    refresh_tokens_storage[get_token_hash(token)] = user_id


def is_refresh_token_active(token: str, user_id: int) -> bool:
    stored_user_id = refresh_tokens_storage.get(get_token_hash(token))
    return stored_user_id == user_id


def revoke_refresh_token(token: str):
    refresh_tokens_storage.pop(get_token_hash(token), None)
