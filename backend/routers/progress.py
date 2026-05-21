from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import Course, User, UserProgress
from schemas import UserProgressOut

router = APIRouter(prefix="/progress", tags=["progress"])


def get_or_create_progress(db: Session, user_id: int, course_id: int):
    progress = db.query(UserProgress).filter(
        UserProgress.user_id == user_id,
        UserProgress.course_id == course_id,
    ).first()
    if progress is None:
        progress = UserProgress(user_id=user_id, course_id=course_id, completed=False)
        db.add(progress)
        db.commit()
        db.refresh(progress)
    return progress


@router.post("/course/{course_id}/start", response_model=UserProgressOut)
def start_course_progress(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")

    return get_or_create_progress(db, current_user.id, course_id)


@router.get("/course/{course_id}", response_model=UserProgressOut)
def get_course_progress(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    progress = db.query(UserProgress).filter(
        UserProgress.user_id == current_user.id,
        UserProgress.course_id == course_id,
    ).first()
    if progress is None:
        raise HTTPException(status_code=404, detail="Progress not started")
    return progress


@router.get("/my", response_model=list[UserProgressOut])
def get_my_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(UserProgress).filter(UserProgress.user_id == current_user.id).all()
