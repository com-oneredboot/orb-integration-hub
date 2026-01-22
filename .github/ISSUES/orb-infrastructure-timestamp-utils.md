# Add Timestamp Utilities to orb-common Package

## Summary

Add shared timestamp utilities to `orb-common` package for consistent AWSTimestamp handling across all orb Lambdas.

## Problem

AppSync uses `AWSTimestamp` scalar which expects Unix epoch seconds (integer). However, timestamps can be stored in DynamoDB or passed around in various formats:
- Unix epoch seconds (int)
- Unix epoch milliseconds (float)
- Python datetime objects
- ISO 8601 strings (e.g., `"2026-01-22T15:02:21.276Z"`)

When a Lambda returns a timestamp in the wrong format, AppSync throws serialization errors:
```
Can't serialize value (/CreateUserFromCognito/updatedAt) : Unable to serialize `2026-01-22T15:02:21.276Z` as a valid timestamp.
```

Currently, each Lambda must implement its own timestamp conversion, leading to:
- Code duplication
- Inconsistent handling
- Bugs when developers forget to convert

## Proposed Solution

Add timestamp utilities to `packages/orb-common/python/orb_common/`:

### Python (`timestamps.py`)

```python
from datetime import datetime, timezone
from typing import Any


def ensure_timestamp(value: Any) -> int | None:
    """
    Convert various timestamp formats to Unix epoch seconds for AWSTimestamp.
    
    Args:
        value: Timestamp in various formats (int, float, datetime, ISO string, None)
        
    Returns:
        Unix epoch seconds as int, or None if value is None/invalid
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
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return int(dt.timestamp())
        except (ValueError, TypeError):
            pass
    return None


def now_timestamp() -> int:
    """Get current UTC time as Unix epoch seconds."""
    return int(datetime.now(timezone.utc).timestamp())


def format_graphql_timestamps(
    record: dict[str, Any], 
    timestamp_fields: list[str] | None = None
) -> dict[str, Any]:
    """
    Ensure all timestamp fields in a record are Unix epoch seconds.
    
    Args:
        record: Dictionary containing the record data
        timestamp_fields: Fields to convert (default: ['createdAt', 'updatedAt'])
                         
    Returns:
        New dictionary with timestamp fields converted
    """
    if timestamp_fields is None:
        timestamp_fields = ["createdAt", "updatedAt"]
    
    result = record.copy()
    for field in timestamp_fields:
        if field in result:
            result[field] = ensure_timestamp(result[field])
    
    return result
```

### TypeScript (for frontend consistency)

```typescript
export function ensureTimestamp(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Math.floor(value);
  if (value instanceof Date) return Math.floor(value.getTime() / 1000);
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) return Math.floor(date.getTime() / 1000);
  }
  return null;
}

export function nowTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}
```

## Usage Example

```python
from orb_common.timestamps import format_graphql_timestamps, now_timestamp

def format_response(user_record: dict) -> dict:
    return format_graphql_timestamps({
        "userId": user_record.get("userId"),
        "email": user_record.get("email"),
        "createdAt": user_record.get("createdAt"),
        "updatedAt": user_record.get("updatedAt"),
    })

# Or for new records:
user_record = {
    "userId": "123",
    "createdAt": now_timestamp(),
    "updatedAt": now_timestamp(),
}
```

## Affected Projects

- orb-integration-hub (CreateUserFromCognito Lambda currently has inline fix)
- Any other orb project using AppSync with AWSTimestamp fields

## Priority

Medium - Currently working around with inline code, but this should be standardized.

## Labels

enhancement, orb-common, python, typescript
