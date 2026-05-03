from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user, require_role
from models import Category, Course, User
from schemas import CourseCreate, CourseOut, CourseUpdate

router = APIRouter(prefix="/courses", tags=["courses"])


def can_manage_course(current_user: User, course: Course) -> bool:
    if current_user.role == "instructor" and course.owner_id == current_user.id:
        return True
    return False


def get_categories_by_ids(db: Session, category_ids: list[int]):
    if len(category_ids) == 0:
        return []
    return db.query(Category).filter(Category.id.in_(category_ids)).all()


def build_course_output(db: Session, course: Course):
    owner = db.query(User).filter(User.id == course.owner_id).first()
    owner_email = None
    if owner is not None:
        owner_email = owner.email

    return {
        "id": course.id,
        "title": course.title,
        "description": course.description,
        "owner_id": course.owner_id,
        "owner_email": owner_email,
        "lessons": course.lessons,
        "categories": course.categories,
    }


@router.get("", response_model=list[CourseOut])
def get_courses(
    limit: int | None = Query(default=None, ge=1),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Course).offset(offset)
    if limit is not None:
        query = query.limit(limit)

    courses = query.all()
    return [build_course_output(db, course) for course in courses]


@router.get("/{course_id}", response_model=CourseOut)
def get_course_by_id(course_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return build_course_output(db, course)


@router.post("", response_model=CourseOut)
def create_course(
    payload: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["instructor"])),
):
    course = Course(title=payload.title, description=payload.description, owner_id=current_user.id)
    course.categories = get_categories_by_ids(db, payload.category_ids)

    db.add(course)
    db.commit()
    db.refresh(course)
    return build_course_output(db, course)


@router.put("/{course_id}", response_model=CourseOut)
def update_course(
    course_id: int,
    payload: CourseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["instructor"])),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")

    if not can_manage_course(current_user, course):
        raise HTTPException(status_code=403, detail="You can manage only your own courses")

    if payload.title is not None:
        course.title = payload.title
    if payload.description is not None:
        course.description = payload.description
    if payload.category_ids is not None:
        course.categories = get_categories_by_ids(db, payload.category_ids)

    db.commit()
    db.refresh(course)
    return build_course_output(db, course)


@router.delete("/{course_id}")
def delete_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["instructor"])),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")

    if not can_manage_course(current_user, course):
        raise HTTPException(status_code=403, detail="You can manage only your own courses")

    db.delete(course)
    db.commit()
    return {"message": "Course deleted"}
