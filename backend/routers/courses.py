from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user, require_role
from models import Category, Course, CourseRating, User
from schemas import CourseCreate, CourseOut, CourseRatingSetSchema, CourseRatingSummaryOut, CourseUpdate

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

    ratings = db.query(CourseRating).filter(CourseRating.course_id == course.id).all()
    average_rating = None
    if len(ratings) > 0:
        average_rating = round(sum(item.rating for item in ratings) / len(ratings), 2)

    return {
        "id": course.id,
        "title": course.title,
        "description": course.description,
        "owner_id": course.owner_id,
        "owner_email": owner_email,
        "lessons": course.lessons,
        "categories": course.categories,
        "average_rating": average_rating,
    }


def build_course_rating_summary(db: Session, course_id: int, user_id: int | None):
    ratings = db.query(CourseRating).filter(CourseRating.course_id == course_id).all()
    total_ratings = len(ratings)
    average_rating = None
    if total_ratings > 0:
        average_rating = round(sum(item.rating for item in ratings) / total_ratings, 2)

    user_rating = None
    if user_id is not None:
        existing = db.query(CourseRating).filter(
            CourseRating.course_id == course_id,
            CourseRating.user_id == user_id,
        ).first()
        if existing is not None:
            user_rating = existing.rating

    return {
        "course_id": course_id,
        "total_ratings": total_ratings,
        "average_rating": average_rating,
        "user_rating": user_rating,
    }


@router.get("", response_model=list[CourseOut])
def get_courses(
    limit: int | None = Query(default=None, ge=1),
    offset: int = Query(default=0, ge=0),
    search: str | None = Query(default=None),
    category_id: int | None = Query(default=None, ge=1),
    sort_by: str = Query(default="id_desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Course)

    if search:
        cleaned_search = search.strip()
        if cleaned_search:
            pattern = f"%{cleaned_search}%"
            query = query.filter(or_(Course.title.ilike(pattern), Course.description.ilike(pattern)))

    if category_id is not None:
        query = query.join(Course.categories).filter(Category.id == category_id).distinct()

    if sort_by == "title_asc":
        query = query.order_by(Course.title.asc(), Course.id.desc())
    elif sort_by == "title_desc":
        query = query.order_by(Course.title.desc(), Course.id.desc())
    elif sort_by == "id_asc":
        query = query.order_by(Course.id.asc())
    else:
        query = query.order_by(Course.id.desc())

    query = query.offset(offset)
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


@router.get("/{course_id}/rating", response_model=CourseRatingSummaryOut)
def get_course_rating(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return build_course_rating_summary(db, course_id, current_user.id)


@router.post("/{course_id}/rating", response_model=CourseRatingSummaryOut)
def set_course_rating(
    course_id: int,
    payload: CourseRatingSetSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")

    existing_rating = db.query(CourseRating).filter(
        CourseRating.course_id == course_id,
        CourseRating.user_id == current_user.id,
    ).first()
    if existing_rating is None:
        existing_rating = CourseRating(course_id=course_id, user_id=current_user.id, rating=payload.rating)
        db.add(existing_rating)
    else:
        existing_rating.rating = payload.rating

    db.commit()
    return build_course_rating_summary(db, course_id, current_user.id)


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
