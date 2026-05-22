import json
import logging
import os
from typing import Optional

from redis import Redis
from redis.exceptions import RedisError

logger = logging.getLogger(__name__)

QUEUE_NAME = "email_jobs"


def get_redis_client() -> Optional[Redis]:
    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        return None
    try:
        client = Redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=3)
        client.ping()
        return client
    except Exception:
        return None


def enqueue_email_job(to_email: str, subject: str, body: str) -> None:
    """
    Push an email job onto the Redis queue.
    If Redis is unavailable, send immediately via SMTP (fallback).
    """
    payload = {"to_email": to_email, "subject": subject, "body": body}
    redis_client = get_redis_client()

    if redis_client is None:
        logger.warning("[EMAIL QUEUE] Redis unavailable — sending directly via SMTP.")
        _send_now(payload)
        return

    try:
        redis_client.rpush(QUEUE_NAME, json.dumps(payload))
        logger.info("[EMAIL QUEUE] Job enqueued for %s | %s", to_email, subject)
    except RedisError as e:
        logger.error("[EMAIL QUEUE] Redis push failed (%s) — sending directly via SMTP.", e)
        _send_now(payload)


def process_email_payload(raw_payload: str) -> None:
    """Called by the background worker to deliver a dequeued job."""
    try:
        payload = json.loads(raw_payload)
    except json.JSONDecodeError as e:
        logger.error("[EMAIL WORKER] Invalid JSON payload: %s", e)
        return

    _send_now(payload)


def _send_now(payload: dict) -> None:
    from email_service import send_generic_email
    to_email = payload.get("to_email", "")
    subject = payload.get("subject", "")
    body = payload.get("body", "")

    if not to_email:
        logger.error("[EMAIL WORKER] Missing to_email in payload.")
        return

    success = send_generic_email(to_email=to_email, subject=subject, body=body)
    if not success:
        logger.error(
            "[EMAIL WORKER] Failed to send email to %s | Subject: %s", to_email, subject
        )
