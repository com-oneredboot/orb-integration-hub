"""Timestamp utilities for AWSTimestamp handling in the orb ecosystem.

This module provides utilities for converting various timestamp formats to Unix epoch
seconds, which is the format required by AppSync's AWSTimestamp scalar type.

Supported input formats:
- int: Unix epoch seconds (returned unchanged)
- float: Unix epoch seconds with fractional part (truncated to int)
- datetime: Python datetime objects (converted to Unix epoch seconds)
- str: ISO 8601 formatted strings (parsed and converted)
- None: Returns None

Example usage:
    from orb_common.timestamps import ensure_timestamp, now_timestamp, format_graphql_timestamps

    # Convert a single value
    timestamp = ensure_timestamp("2026-01-22T15:02:21.276Z")  # Returns int

    # Get current time
    current = now_timestamp()  # Returns int

    # Format a record for GraphQL response
    user = format_graphql_timestamps({
        "userId": "123",
        "createdAt": "2026-01-22T15:02:21.276Z",
        "updatedAt": datetime.now(timezone.utc),
    })
"""

from datetime import datetime, timezone
from typing import Any


def ensure_timestamp(value: Any) -> int | None:
    """Convert various timestamp formats to Unix epoch seconds for AWSTimestamp.

    Args:
        value: Timestamp in various formats:
            - int: Unix epoch seconds (returned unchanged)
            - float: Unix epoch seconds (truncated to int)
            - datetime: Python datetime object
            - str: ISO 8601 formatted string (e.g., "2026-01-22T15:02:21.276Z")
            - None: Returns None

    Returns:
        Unix epoch seconds as int, or None if value is None or invalid/unparseable.

    Examples:
        >>> ensure_timestamp(1737558141)
        1737558141
        >>> ensure_timestamp(1737558141.5)
        1737558141
        >>> ensure_timestamp("2026-01-22T15:02:21Z")
        1769180541
        >>> ensure_timestamp(None)
        None
    """
    if value is None:
        return None

    if isinstance(value, int):
        return value

    if isinstance(value, float):
        return int(value)

    if isinstance(value, datetime):
        return int(value.timestamp())

    if isinstance(value, str):
        return _parse_iso_string(value)

    return None


def _parse_iso_string(value: str) -> int | None:
    """Parse an ISO 8601 string to Unix epoch seconds.

    Handles:
    - "2026-01-22T15:02:21.276Z" (UTC with Z suffix)
    - "2026-01-22T15:02:21+00:00" (UTC with offset)
    - "2026-01-22T15:02:21" (naive, treated as UTC)

    Args:
        value: ISO 8601 formatted string

    Returns:
        Unix epoch seconds as int, or None if parsing fails
    """
    if not value or not value.strip():
        return None

    try:
        # Replace Z with +00:00 for consistent parsing
        normalized = value.replace("Z", "+00:00")
        dt = datetime.fromisoformat(normalized)

        # If naive datetime, assume UTC
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)

        return int(dt.timestamp())
    except (ValueError, TypeError, AttributeError):
        return None


def now_timestamp() -> int:
    """Get current UTC time as Unix epoch seconds.

    Returns:
        Current UTC time as Unix epoch seconds (integer).

    Example:
        >>> ts = now_timestamp()
        >>> isinstance(ts, int)
        True
    """
    return int(datetime.now(timezone.utc).timestamp())


def format_graphql_timestamps(
    record: dict[str, Any],
    timestamp_fields: list[str] | None = None,
) -> dict[str, Any]:
    """Ensure all timestamp fields in a record are Unix epoch seconds.

    Creates a new dictionary with the specified timestamp fields converted to
    Unix epoch seconds. The original record is not modified.

    Args:
        record: Dictionary containing the record data
        timestamp_fields: Fields to convert. Defaults to ["createdAt", "updatedAt"]

    Returns:
        New dictionary with timestamp fields converted to Unix epoch seconds.
        Fields that are missing from the record are skipped.

    Example:
        >>> record = {"userId": "123", "createdAt": "2026-01-22T15:02:21Z"}
        >>> result = format_graphql_timestamps(record)
        >>> isinstance(result["createdAt"], int)
        True
        >>> record["createdAt"]  # Original unchanged
        '2026-01-22T15:02:21Z'
    """
    if timestamp_fields is None:
        timestamp_fields = ["createdAt", "updatedAt"]

    result = record.copy()

    for field in timestamp_fields:
        if field in result:
            result[field] = ensure_timestamp(result[field])

    return result
