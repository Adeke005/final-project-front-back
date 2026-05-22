from datetime import datetime
from datetime import timedelta
import os
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from auth import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    get_token_hash,
    hash_password,
    verify_password,
)
from database import get_db
from dependencies import get_current_user
from notification_queue import enqueue_email_job
from rate_limiter import limiter
from models import PasswordResetToken, User, UserRefreshToken
from schemas import (
    EmailRequestSchema,
    LoginSchema,
    PasswordResetConfirmSchema,
    RefreshTokenOut,
    RefreshTokenSchema,
    RegisterSchema,
    TokenOut,
    UserOut,
    VerifyEmailSchema,
)
from email_service import send_verification_email

router = APIRouter(prefix="/auth", tags=["auth"])

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
REQUIRE_EMAIL_VERIFICATION = os.getenv("REQUIRE_EMAIL_VERIFICATION", "false").lower() == "true"


@router.post("/register", response_model=UserOut)
@limiter.limit("5/minute")
def register_user(request: Request, payload: RegisterSchema, db: Session = Depends(get_db)):
    valid_roles = ["admin", "instructor", "user"]
    if payload.role not in valid_roles:
        raise HTTPException(status_code=400, detail="Role must be admin, instructor, or user")

    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user is not None:
        raise HTTPException(status_code=400, detail="Email already exists")

    verification_token = secrets.token_urlsafe(32)
    new_user = User(
        email=payload.email,
        password=hash_password(payload.password),
        role=payload.role,
        is_verified=False,
        verification_token=verification_token,
        verification_token_expires_at=datetime.utcnow() + timedelta(hours=24),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    verify_url = f"{FRONTEND_URL}/verify-email?token={verification_token}"

    send_verification_email(
    to_email=new_user.email,
    verify_url=verify_url
    )
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
    if REQUIRE_EMAIL_VERIFICATION and not user.is_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Please verify your email")

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)
    token_payload = decode_refresh_token(refresh_token)
    expires_at = datetime.utcnow()
    if token_payload is not None and token_payload.get("exp") is not None:
        expires_at = datetime.fromtimestamp(token_payload["exp"])

    token_record = UserRefreshToken(
        user_id=user.id,
        token_hash=get_token_hash(refresh_token),
        expires_at=expires_at,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    db.add(token_record)
    db.commit()

    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer", "user": user}


@router.post("/refresh", response_model=RefreshTokenOut)
def refresh_access_token(payload: RefreshTokenSchema, db: Session = Depends(get_db)):
    token_payload = decode_refresh_token(payload.refresh_token)
    if token_payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user_id = token_payload.get("user_id")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    token_record = db.query(UserRefreshToken).filter(
        UserRefreshToken.user_id == user_id,
        UserRefreshToken.token_hash == get_token_hash(payload.refresh_token),
    ).first()
    if token_record is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    if token_record.revoked_at is not None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    if token_record.expires_at <= datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is banned")

    new_access_token = create_access_token(user.id, user.role)
    return {"access_token": new_access_token, "token_type": "bearer"}


@router.post("/logout")
def logout_user(payload: RefreshTokenSchema, db: Session = Depends(get_db)):
    token_hash = get_token_hash(payload.refresh_token)
    token_record = db.query(UserRefreshToken).filter(UserRefreshToken.token_hash == token_hash).first()
    if token_record is not None and token_record.revoked_at is None:
        token_record.revoked_at = datetime.utcnow()
        db.commit()
    return {"message": "Logged out"}


@router.get("/me", response_model=UserOut)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/verify-email/request")
def request_email_verification(payload: EmailRequestSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    if user is not None:
        verification_token = secrets.token_urlsafe(32)

        user.verification_token = verification_token
        user.verification_token_expires_at = datetime.utcnow() + timedelta(hours=24)

        db.commit()

        verify_url = f"{FRONTEND_URL}/verify-email?token={verification_token}"

        send_verification_email(
            to_email=user.email,
            verify_url=verify_url
        )

    return {"message": "If your email exists, a verification link was sent"}


@router.post("/verify-email")
def verify_email(payload: VerifyEmailSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.verification_token == payload.token).first()
    if user is None:
        raise HTTPException(status_code=400, detail="Invalid verification token")
    if user.verification_token_expires_at is None or user.verification_token_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Verification token expired")

    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires_at = None
    db.commit()
    return {"message": "Email verified"}


@router.post("/password-reset/request")
def request_password_reset(payload: EmailRequestSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if user is not None:
        reset_token = secrets.token_urlsafe(32)
        token_row = PasswordResetToken(
            user_id=user.id,
            token=reset_token,
            expires_at=datetime.utcnow() + timedelta(hours=1),
        )
        db.add(token_row)
        db.commit()
        enqueue_email_job(
            to_email=user.email,
            subject="Password reset",
            body=f"Reset your password: {FRONTEND_URL}/reset-password?token={reset_token}",
        )
    return {"message": "If your email exists, a reset link was sent"}


@router.post("/password-reset/confirm")
def confirm_password_reset(payload: PasswordResetConfirmSchema, db: Session = Depends(get_db)):
    token_row = db.query(PasswordResetToken).filter(PasswordResetToken.token == payload.token).first()
    if token_row is None or token_row.used_at is not None:
        raise HTTPException(status_code=400, detail="Invalid reset token")
    if token_row.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset token expired")

    user = db.query(User).filter(User.id == token_row.user_id).first()
    if user is None:
        raise HTTPException(status_code=400, detail="Invalid reset token")

    user.password = hash_password(payload.new_password)
    token_row.used_at = datetime.utcnow()
    db.commit()
    return {"message": "Password reset successful"}
