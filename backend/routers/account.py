from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import hash_password, verify_password
from database import get_db
from dependencies import get_current_user
from models import User, UserProfile, UserRefreshToken
from schemas import AccountMeOut, ChangePasswordSchema, SessionOut, UserProfileUpdateSchema

router = APIRouter(prefix="/account", tags=["account"])


def get_or_create_profile(db: Session, user_id: int) -> UserProfile:
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if profile is None:
        profile = UserProfile(user_id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def build_profile_output(profile: UserProfile):
    return {
        "full_name": profile.full_name,
        "avatar_url": profile.avatar_url,
        "bio": profile.bio,
        "timezone": profile.timezone,
    }


@router.get("/me", response_model=AccountMeOut)
def get_account_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = get_or_create_profile(db, current_user.id)
    return {"user": current_user, "profile": build_profile_output(profile)}


@router.put("/me", response_model=AccountMeOut)
def update_account_me(
    payload: UserProfileUpdateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = get_or_create_profile(db, current_user.id)
    if payload.full_name is not None:
        profile.full_name = payload.full_name
    if payload.avatar_url is not None:
        profile.avatar_url = payload.avatar_url
    if payload.bio is not None:
        profile.bio = payload.bio
    if payload.timezone is not None:
        profile.timezone = payload.timezone
    db.commit()
    db.refresh(profile)
    return {"user": current_user, "profile": build_profile_output(profile)}


@router.put("/password")
def update_account_password(
    payload: ChangePasswordSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must be different")

    current_user.password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password updated"}


@router.get("/sessions", response_model=list[SessionOut])
def get_account_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sessions = db.query(UserRefreshToken).filter(
        UserRefreshToken.user_id == current_user.id,
        UserRefreshToken.revoked_at.is_(None),
    ).order_by(UserRefreshToken.created_at.desc()).all()
    return [
        {
            "id": session.id,
            "created_at": session.created_at,
            "expires_at": session.expires_at,
            "user_agent": session.user_agent,
            "ip_address": session.ip_address,
            "is_current": False,
        }
        for session in sessions
    ]


@router.delete("/sessions/{session_id}")
def revoke_account_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(UserRefreshToken).filter(
        UserRefreshToken.id == session_id,
        UserRefreshToken.user_id == current_user.id,
        UserRefreshToken.revoked_at.is_(None),
    ).first()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    session.revoked_at = datetime.utcnow()
    db.commit()
    return {"message": "Session revoked"}
