from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from dependencies import require_role
from models import User
from schemas import UserBanSchema, UserOut

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def get_users(db: Session = Depends(get_db), current_admin: User = Depends(require_role(["admin"]))):
    return db.query(User).all()


@router.patch("/{user_id}/ban", response_model=UserOut)
def set_user_ban_status(
    user_id: int,
    payload: UserBanSchema,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role(["admin"])),
):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Admin cannot ban own account")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Admin cannot change ban status of another admin")

    user.is_banned = payload.is_banned
    db.commit()
    db.refresh(user)
    return user
