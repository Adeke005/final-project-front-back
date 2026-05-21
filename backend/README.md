# Backend (FastAPI)

## Stack
- FastAPI
- SQLAlchemy ORM
- PostgreSQL
- Redis (email job queue)
- Docker Compose

## Environment Variables
Copy `env.example` to `.env` and set values:

- `DATABASE_URL`
- `SECRET_KEY`
- `ACCESS_TOKEN_MINUTES`
- `REFRESH_TOKEN_MINUTES`
- `REDIS_URL`
- `FRONTEND_URL`
- `REQUIRE_EMAIL_VERIFICATION`

## Local Run
```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

## Docker Run
```bash
docker compose up --build
```

Services:
- `api` on `http://localhost:8000`
- `postgres` on `localhost:5432`
- `redis` on `localhost:6379`
- `worker` for queued email jobs

## Auth Features
- Access + refresh tokens
- Refresh token persistence in DB
- Session listing/revoke endpoints (`/account/sessions`)
- Email verification endpoints
- Password reset endpoints

## Notes
- ORM-only queries are used (no raw SQL).
- Tables are created on startup via `Base.metadata.create_all(...)`.
