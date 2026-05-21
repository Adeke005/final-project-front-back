import json
import os
from typing import Optional

from redis import Redis
from redis.exceptions import RedisError

QUEUE_NAME = "email_jobs"


def get_redis_client() -> Optional[Redis]:
    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        return None
    return Redis.from_url(redis_url, decode_responses=True)


def enqueue_email_job(to_email: str, subject: str, body: str):
    payload = {"to_email": to_email, "subject": subject, "body": body}
    redis_client = get_redis_client()
    if redis_client is None:
        _log_email(payload)
        return

    try:
        redis_client.rpush(QUEUE_NAME, json.dumps(payload))
    except RedisError:
        _log_email(payload)


def process_email_payload(raw_payload: str):
    payload = json.loads(raw_payload)
    _log_email(payload)


def _log_email(payload: dict):
    # Local/dev fallback when Redis is unavailable.
    print(f"[EMAIL JOB] To={payload.get('to_email')} | Subject={payload.get('subject')} | Body={payload.get('body')}")
