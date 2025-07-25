"""DateTime utility functions."""

from datetime import datetime, timedelta, timezone
from typing import Optional


def utc_now() -> datetime:
    """Get current UTC datetime."""
    return datetime.now(timezone.utc)


def format_timestamp(dt: datetime, format_str: str = "%Y-%m-%d %H:%M:%S") -> str:
    """Format datetime to string."""
    return dt.strftime(format_str)


def parse_timestamp(timestamp_str: str, format_str: str = "%Y-%m-%d %H:%M:%S") -> datetime:
    """Parse timestamp string to datetime."""
    return datetime.strptime(timestamp_str, format_str)


def add_days(dt: datetime, days: int) -> datetime:
    """Add days to datetime."""
    return dt + timedelta(days=days)


def time_ago(dt: datetime) -> str:
    """Get human-readable time ago string."""
    now = utc_now()
    delta = now - dt

    if delta.days > 365:
        return f"{delta.days // 365} year(s) ago"
    elif delta.days > 30:
        return f"{delta.days // 30} month(s) ago"
    elif delta.days > 0:
        return f"{delta.days} day(s) ago"
    elif delta.seconds > 3600:
        return f"{delta.seconds // 3600} hour(s) ago"
    elif delta.seconds > 60:
        return f"{delta.seconds // 60} minute(s) ago"
    else:
        return "just now"


def is_expired(expiry_dt: datetime, buffer_seconds: int = 0) -> bool:
    """Check if datetime has expired."""
    return utc_now() > (expiry_dt - timedelta(seconds=buffer_seconds))
