from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from auth import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    is_refresh_token_active,
    revoke_refresh_token,
    store_refresh_token,
    verify_password,
)
from database import get_db
from dependencies import get_current_user
from rate_limiter import limiter
from models import User
from schemas import LoginSchema, RefreshTokenOut, RefreshTokenSchema, RegisterSchema, TokenOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut)
@limiter.limit("5/minute")
def register_user(request: Request, payload: RegisterSchema, db: Session = Depends(get_db)):
    valid_roles = ["admin", "instructor", "user"]
    if payload.role not in valid_roles:
        raise HTTPException(status_code=400, detail="Role must be admin, instructor, or user")

    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user is not None:
        raise HTTPException(status_code=400, detail="Email already exists")

    new_user = User(email=payload.email, password=hash_password(payload.password), role=payload.role)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login", response_model=TokenOut)
@limiter.limit("5/minute")
def login_user(request: Request, payload: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    is_valid_password = verify_password(payload.password, user.password)
    if not is_valid_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Your account is banned")

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)
    store_refresh_token(refresh_token, user.id)
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer", "user": user}


@router.post("/refresh", response_model=RefreshTokenOut)
def refresh_access_token(payload: RefreshTokenSchema, db: Session = Depends(get_db)):
    token_payload = decode_refresh_token(payload.refresh_token)
    if token_payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user_id = token_payload.get("user_id")
    if user_id is None or not is_refresh_token_active(payload.refresh_token, user_id):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is banned")

    new_access_token = create_access_token(user.id, user.role)
    return {"access_token": new_access_token, "token_type": "bearer"}


@router.post("/logout")
def logout_user(payload: RefreshTokenSchema):
    revoke_refresh_token(payload.refresh_token)
    return {"message": "Logged out"}


@router.get("/me", response_model=UserOut)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user
