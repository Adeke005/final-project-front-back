from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user, require_role
from models import Course, Lesson, User
from schemas import LessonCreate, LessonOut

router = APIRouter(prefix="/lessons", tags=["lessons"])


def can_manage_lessons(current_user: User, course: Course) -> bool:
    if current_user.role == "instructor" and course.owner_id == current_user.id:
        return True
    return False


@router.get("", response_model=list[LessonOut])
def get_all_lessons(
    limit: int | None = Query(default=None, ge=1),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Lesson).offset(offset)
    if limit is not None:
        query = query.limit(limit)
    return query.all()


@router.get("/course/{course_id}", response_model=list[LessonOut])
def get_lessons(
    course_id: int,
    limit: int | None = Query(default=None, ge=1),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Lesson).filter(Lesson.course_id == course_id).offset(offset)
    if limit is not None:
        query = query.limit(limit)
    return query.all()


@router.post("/course/{course_id}", response_model=LessonOut)
def create_lesson(
    course_id: int,
    payload: LessonCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["instructor"])),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")

    if not can_manage_lessons(current_user, course):
        raise HTTPException(status_code=403, detail="You can add lessons only to your own courses")

    lesson = Lesson(title=payload.title, content=payload.content, course_id=course_id)
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return lesson


@router.put("/{lesson_id}", response_model=LessonOut)
def update_lesson(
    lesson_id: int,
    payload: LessonCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["instructor"])),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")

    course = db.query(Course).filter(Course.id == lesson.course_id).first()
    if not can_manage_lessons(current_user, course):
        raise HTTPException(status_code=403, detail="You can edit only your own lessons")

    lesson.title = payload.title
    lesson.content = payload.content
    db.commit()
    db.refresh(lesson)
    return lesson


@router.delete("/{lesson_id}")
def delete_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["instructor"])),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")

    course = db.query(Course).filter(Course.id == lesson.course_id).first()
    if not can_manage_lessons(current_user, course):
        raise HTTPException(status_code=403, detail="You can delete only your own lessons")

    db.delete(lesson)
    db.commit()
    return {"message": "Lesson deleted"}
