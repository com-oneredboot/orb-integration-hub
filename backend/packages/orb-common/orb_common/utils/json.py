"""JSON utility functions."""

import json
from typing import Any, Dict, Optional


def safe_json_dumps(obj: Any, default: Optional[str] = None, **kwargs: Any) -> str:
    """Safely serialize object to JSON string."""
    try:
        return json.dumps(obj, **kwargs)
    except (TypeError, ValueError) as e:
        if default is not None:
            return default
        raise


def safe_json_loads(json_str: str, default: Any = None) -> Any:
    """Safely deserialize JSON string."""
    try:
        return json.loads(json_str)
    except (json.JSONDecodeError, TypeError) as e:
        if default is not None:
            return default
        raise


def merge_dicts(dict1: Dict[str, Any], dict2: Dict[str, Any]) -> Dict[str, Any]:
    """Deep merge two dictionaries."""
    result = dict1.copy()

    for key, value in dict2.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = merge_dicts(result[key], value)
        else:
            result[key] = value

    return result


def flatten_dict(d: Dict[str, Any], parent_key: str = "", sep: str = ".") -> Dict[str, Any]:
    """Flatten nested dictionary."""
    items: list[tuple[str, Any]] = []

    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k

        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))

    return dict(items)


def unflatten_dict(d: Dict[str, Any], sep: str = ".") -> Dict[str, Any]:
    """Unflatten dictionary."""
    result: Dict[str, Any] = {}

    for key, value in d.items():
        parts = key.split(sep)
        current = result

        for part in parts[:-1]:
            if part not in current:
                current[part] = {}
            current = current[part]

        current[parts[-1]] = value

    return result
