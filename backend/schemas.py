from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class RegisterSchema(BaseModel):
    email: EmailStr
    password: str
    role: str = "user"


class LoginSchema(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    is_banned: bool

    model_config = {"from_attributes": True}


class UserBanSchema(BaseModel):
    is_banned: bool


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str
    user: UserOut


class RefreshTokenSchema(BaseModel):
    refresh_token: str


class RefreshTokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CategoryCreate(BaseModel):
    name: str


class CategoryOut(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class LessonCreate(BaseModel):
    title: str
    content: str


class LessonOut(BaseModel):
    id: int
    title: str
    content: str
    course_id: int

    model_config = {"from_attributes": True}


class AssignmentCreate(BaseModel):
    title: str
    description: str


class AssignmentOut(BaseModel):
    id: int
    title: str
    description: str
    course_id: int

    model_config = {"from_attributes": True}


class CourseCreate(BaseModel):
    title: str
    description: str
    category_ids: list[int] = Field(default_factory=list)


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category_ids: Optional[list[int]] = None


class CourseOut(BaseModel):
    id: int
    title: str
    description: str
    owner_id: int
    owner_email: Optional[EmailStr] = None
    lessons: list[LessonOut] = Field(default_factory=list)
    categories: list[CategoryOut] = Field(default_factory=list)
    average_rating: Optional[float] = None


class QuizCreate(BaseModel):
    question_type: str = "text"
    question: str
    correct_answer: str
    options: list[str] = Field(default_factory=list)
    position: Optional[int] = None


class QuizOut(BaseModel):
    id: int
    course_id: int
    question_type: str
    question: str
    options: list[str] = Field(default_factory=list)
    position: int


class QuizAnswerItem(BaseModel):
    quiz_id: int
    answer: str


class SubmitQuizSchema(BaseModel):
    answers: list[QuizAnswerItem] = Field(default_factory=list)


class CertificateOut(BaseModel):
    id: int
    user_id: int
    course_id: int
    issued_at: datetime

    model_config = {"from_attributes": True}


class UserProgressOut(BaseModel):
    id: int
    user_id: int
    course_id: int
    completed: bool

    model_config = {"from_attributes": True}


class QuizResultOut(BaseModel):
    passed: bool
    message: str
    total_questions: int
    correct_answers: int
    certificate: Optional[CertificateOut] = None
    progress: Optional[UserProgressOut] = None


class CourseRatingSetSchema(BaseModel):
    rating: int = Field(ge=1, le=5)


class CourseRatingSummaryOut(BaseModel):
    course_id: int
    total_ratings: int
    average_rating: Optional[float] = None
    user_rating: Optional[int] = None


class UserProfileOut(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    timezone: Optional[str] = None


class UserProfileUpdateSchema(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    timezone: Optional[str] = None


class AccountMeOut(BaseModel):
    user: UserOut
    profile: UserProfileOut


class ChangePasswordSchema(BaseModel):
    current_password: str
    new_password: str


class SessionOut(BaseModel):
    id: int
    created_at: datetime
    expires_at: datetime
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    is_current: bool = False


class EmailRequestSchema(BaseModel):
    email: EmailStr


class VerifyEmailSchema(BaseModel):
    token: str


class PasswordResetConfirmSchema(BaseModel):
    token: str
    new_password: str
