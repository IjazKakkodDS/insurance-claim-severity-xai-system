import time
import logging

logger = logging.getLogger("latency_logger")
logger.setLevel(logging.INFO)

def measure_latency(func):
    def wrapper(*args, **kwargs):
        start = time.time()

        result = func(*args, **kwargs)

        end = time.time()
        latency = round((end - start) * 1000, 2)

        logger.info(f"API_LATENCY_MS={latency}")

        return result

    return wrapper