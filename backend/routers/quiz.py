import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user, require_role
from models import Certificate, Course, Quiz, User, UserProgress
from schemas import QuizCreate, QuizOut, QuizResultOut, SubmitQuizSchema

router = APIRouter(prefix="/quiz", tags=["quiz"])

QUIZ_TYPES = ["text", "single_choice", "true_false"]


def can_manage_quiz(current_user: User, course: Course) -> bool:
    if current_user.role == "instructor" and course.owner_id == current_user.id:
        return True
    return False


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


def parse_options(options_json: str):
    try:
        loaded = json.loads(options_json)
        if isinstance(loaded, list):
            return loaded
        return []
    except Exception:
        return []


def build_quiz_output(quiz: Quiz):
    return {
        "id": quiz.id,
        "course_id": quiz.course_id,
        "question_type": quiz.question_type,
        "question": quiz.question,
        "options": parse_options(quiz.options_json),
        "position": quiz.position,
    }


def normalize_answer(answer: str):
    return answer.strip().lower()


def validate_quiz_payload(payload: QuizCreate):
    question_type = payload.question_type.strip()
    if question_type not in QUIZ_TYPES:
        raise HTTPException(status_code=400, detail="question_type must be text, single_choice, or true_false")

    cleaned_options = [item.strip() for item in payload.options if item.strip() != ""]
    correct_answer = payload.correct_answer.strip()

    if question_type == "single_choice":
        if len(cleaned_options) < 2:
            raise HTTPException(status_code=400, detail="single_choice quiz needs at least 2 options")
        if correct_answer not in cleaned_options:
            raise HTTPException(status_code=400, detail="correct_answer must match one option")

    if question_type == "true_false":
        cleaned_options = ["True", "False"]
        if correct_answer not in cleaned_options:
            raise HTTPException(status_code=400, detail="true_false correct_answer must be True or False")

    if question_type == "text":
        if correct_answer == "":
            raise HTTPException(status_code=400, detail="correct_answer is required")
        cleaned_options = []

    return question_type, correct_answer, cleaned_options


def check_quiz_answers(questions: list[Quiz], answers_by_id: dict[int, str]):
    total = len(questions)
    correct = 0

    for question in questions:
        user_answer = answers_by_id.get(question.id, "")
        is_correct = normalize_answer(user_answer) == normalize_answer(question.correct_answer)
        if is_correct:
            correct += 1

    return total, correct


@router.get("/course/{course_id}", response_model=list[QuizOut])
def get_course_quiz(course_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    questions = db.query(Quiz).filter(Quiz.course_id == course_id).order_by(Quiz.position, Quiz.id).all()
    if len(questions) == 0:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return [build_quiz_output(question) for question in questions]


@router.post("/course/{course_id}", response_model=QuizOut)
def create_quiz_question(
    course_id: int,
    payload: QuizCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["instructor"])),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    if not can_manage_quiz(current_user, course):
        raise HTTPException(status_code=403, detail="You can manage quiz only for your own courses")

    question_type, correct_answer, cleaned_options = validate_quiz_payload(payload)
    options_json = json.dumps(cleaned_options)

    max_position = db.query(Quiz).filter(Quiz.course_id == course_id).count() + 1
    position = max_position
    if payload.position is not None and payload.position > 0:
        position = payload.position

    question = Quiz(
        course_id=course_id,
        question_type=question_type,
        question=payload.question,
        correct_answer=correct_answer,
        options_json=options_json,
        position=position,
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return build_quiz_output(question)


@router.put("/{quiz_id}", response_model=QuizOut)
def update_quiz_question(
    quiz_id: int,
    payload: QuizCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["instructor"])),
):
    question = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if question is None:
        raise HTTPException(status_code=404, detail="Quiz question not found")

    course = db.query(Course).filter(Course.id == question.course_id).first()
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    if not can_manage_quiz(current_user, course):
        raise HTTPException(status_code=403, detail="You can manage quiz only for your own courses")

    question_type, correct_answer, cleaned_options = validate_quiz_payload(payload)
    question.question_type = question_type
    question.question = payload.question
    question.correct_answer = correct_answer
    question.options_json = json.dumps(cleaned_options)
    if payload.position is not None and payload.position > 0:
        question.position = payload.position

    db.commit()
    db.refresh(question)
    return build_quiz_output(question)


@router.delete("/{quiz_id}")
def delete_quiz_question(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["instructor"])),
):
    question = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if question is None:
        raise HTTPException(status_code=404, detail="Quiz question not found")

    course = db.query(Course).filter(Course.id == question.course_id).first()
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    if not can_manage_quiz(current_user, course):
        raise HTTPException(status_code=403, detail="You can manage quiz only for your own courses")

    db.delete(question)
    db.commit()
    return {"message": "Quiz question deleted"}


@router.post("/course/{course_id}/submit", response_model=QuizResultOut)
def submit_quiz(
    course_id: int,
    payload: SubmitQuizSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    questions = db.query(Quiz).filter(Quiz.course_id == course_id).order_by(Quiz.position, Quiz.id).all()
    if len(questions) == 0:
        raise HTTPException(status_code=404, detail="Quiz not found")

    answers_by_id = {}
    for item in payload.answers:
        answers_by_id[item.quiz_id] = item.answer

    total, correct = check_quiz_answers(questions, answers_by_id)
    passed = total > 0 and correct == total

    progress = get_or_create_progress(db, current_user.id, course_id)
    if not passed:
        return {
            "passed": False,
            "message": f"Wrong answers: {correct}/{total}",
            "total_questions": total,
            "correct_answers": correct,
            "certificate": None,
            "progress": progress,
        }

    progress.completed = True
    db.commit()
    db.refresh(progress)

    certificate = db.query(Certificate).filter(
        Certificate.user_id == current_user.id,
        Certificate.course_id == course_id,
    ).first()
    if certificate is None:
        certificate = Certificate(user_id=current_user.id, course_id=course_id, issued_at=datetime.utcnow())
        db.add(certificate)
        db.commit()
        db.refresh(certificate)

    return {
        "passed": True,
        "message": "Quiz passed",
        "total_questions": total,
        "correct_answers": correct,
        "certificate": certificate,
        "progress": progress,
    }
