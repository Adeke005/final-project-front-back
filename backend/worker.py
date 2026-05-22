import logging
import os
import signal
import time

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("email_worker")

from notification_queue import QUEUE_NAME, get_redis_client, process_email_payload

_running = True


def _handle_signal(signum, frame):
    global _running
    logger.info("[WORKER] Received signal %s — shutting down gracefully.", signum)
    _running = False


signal.signal(signal.SIGTERM, _handle_signal)
signal.signal(signal.SIGINT, _handle_signal)


def run_worker():
    logger.info("[WORKER] Starting email worker...")

    while _running:
        redis_client = get_redis_client()

        if redis_client is None:
            logger.warning("[WORKER] Cannot connect to Redis. Retrying in 5s...")
            time.sleep(5)
            continue

        logger.info("[WORKER] Connected to Redis. Waiting for jobs on queue '%s'...", QUEUE_NAME)

        while _running:
            try:
                # blpop blocks up to 2 seconds, then returns None — keeps loop responsive
                message = redis_client.blpop(QUEUE_NAME, timeout=2)
                if message is None:
                    continue

                _, raw_payload = message
                logger.info("[WORKER] Job received — processing...")
                process_email_payload(raw_payload)

            except Exception as e:
                logger.error("[WORKER] Error processing job: %s", e)
                logger.info("[WORKER] Reconnecting to Redis in 3s...")
                time.sleep(3)
                break  # break inner loop → reconnect outer loop

    logger.info("[WORKER] Shut down.")


if __name__ == "__main__":
    run_worker()
