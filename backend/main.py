from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from database import Base, engine
from rate_limiter import limiter
from routers import account, assignments, auth, categories, certificate, courses, lessons, progress, quiz, users

# Student style: create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="StudentCoursera")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://final-project-front-back.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)



app.include_router(auth.router)
app.include_router(account.router)
app.include_router(courses.router)
app.include_router(lessons.router)
app.include_router(categories.router)
app.include_router(quiz.router)
app.include_router(certificate.router)
app.include_router(users.router)
app.include_router(progress.router)
app.include_router(assignments.router)


@app.get("/")
def root():
    return {"message": "API is running"}
