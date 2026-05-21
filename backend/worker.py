import time

from notification_queue import QUEUE_NAME, get_redis_client, process_email_payload


def run_worker():
    redis_client = get_redis_client()
    if redis_client is None:
        raise RuntimeError("REDIS_URL is not configured for worker process")

    print("[WORKER] Started and waiting for jobs...")
    while True:
        message = redis_client.blpop(QUEUE_NAME, timeout=5)
        if message is None:
            time.sleep(1)
            continue
        _, raw_payload = message
        process_email_payload(raw_payload)


if __name__ == "__main__":
    run_worker()
