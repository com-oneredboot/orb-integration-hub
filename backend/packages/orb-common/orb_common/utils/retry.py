"""Retry utility functions."""

import time
from dataclasses import dataclass
from functools import wraps
from typing import Any, Callable, Optional, Tuple, Type


@dataclass
class RetryConfig:
    """Configuration for retry behavior."""

    max_attempts: int = 3
    base_delay: float = 1.0
    max_delay: float = 60.0
    exponential_base: float = 2.0
    exceptions: Tuple[Type[Exception], ...] = (Exception,)


def exponential_backoff(attempt: int, base_delay: float = 1.0, max_delay: float = 60.0) -> float:
    """Calculate exponential backoff delay."""
    delay = base_delay * (2**attempt)
    return min(delay, max_delay)


def linear_backoff(attempt: int, base_delay: float = 1.0, max_delay: float = 60.0) -> float:
    """Calculate linear backoff delay."""
    delay = base_delay * attempt
    return min(delay, max_delay)


def retry_with_backoff(
    config: Optional[RetryConfig] = None, backoff_func: Optional[Callable[[int], float]] = None
):
    """Decorator to retry function with backoff."""
    if config is None:
        config = RetryConfig()

    if backoff_func is None:
        backoff_func = exponential_backoff

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            last_exception = None

            for attempt in range(config.max_attempts):
                try:
                    return func(*args, **kwargs)
                except config.exceptions as e:
                    last_exception = e

                    if attempt < config.max_attempts - 1:
                        delay = backoff_func(attempt, config.base_delay, config.max_delay)
                        time.sleep(delay)

            if last_exception:
                raise last_exception

        return wrapper

    return decorator
