from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user, require_role
from models import Assignment, Course, User
from schemas import AssignmentCreate, AssignmentOut

router = APIRouter(prefix="/assignments", tags=["assignments"])


def can_manage_assignments(current_user: User, course: Course) -> bool:
    if current_user.role == "instructor" and course.owner_id == current_user.id:
        return True
    return False


@router.get("/course/{course_id}", response_model=list[AssignmentOut])
def get_course_assignments(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Assignment).filter(Assignment.course_id == course_id).all()


@router.post("/course/{course_id}", response_model=AssignmentOut)
def create_assignment(
    course_id: int,
    payload: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["instructor"])),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    if not can_manage_assignments(current_user, course):
        raise HTTPException(status_code=403, detail="You can manage assignments only for your own courses")

    assignment = Assignment(title=payload.title, description=payload.description, course_id=course_id)
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.put("/{assignment_id}", response_model=AssignmentOut)
def update_assignment(
    assignment_id: int,
    payload: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["instructor"])),
):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if assignment is None:
        raise HTTPException(status_code=404, detail="Assignment not found")

    course = db.query(Course).filter(Course.id == assignment.course_id).first()
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    if not can_manage_assignments(current_user, course):
        raise HTTPException(status_code=403, detail="You can manage assignments only for your own courses")

    assignment.title = payload.title
    assignment.description = payload.description
    db.commit()
    db.refresh(assignment)
    return assignment


@router.delete("/{assignment_id}")
def delete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["instructor"])),
):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if assignment is None:
        raise HTTPException(status_code=404, detail="Assignment not found")

    course = db.query(Course).filter(Course.id == assignment.course_id).first()
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    if not can_manage_assignments(current_user, course):
        raise HTTPException(status_code=403, detail="You can manage assignments only for your own courses")

    db.delete(assignment)
    db.commit()
    return {"message": "Assignment deleted"}
