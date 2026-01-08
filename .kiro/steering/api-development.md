---
inclusion: fileMatch
fileMatchPattern: "**/apps/api/**,**/lambdas/**,**/layers/**"
---
# API Development Standards

This file loads automatically when working with API/backend files.

## API Project Structure

```
apps/api/
├── lambdas/             # Lambda function handlers
│   ├── sms_verification/
│   ├── cognito_group_manager/
│   ├── user_status_calculator/
│   └── organizations/
├── layers/              # Lambda layers
│   ├── organizations_security/
│   └── stripe/
├── models/              # Pydantic models / data classes
├── enums/               # Enumeration types
├── services/            # Business logic
└── repositories/        # Data access layer
```

## Lambda Handler Pattern

```python
import json
import logging
from typing import Any

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Lambda entry point."""
    try:
        # Parse input
        body = json.loads(event.get("body", "{}"))
        
        # Process request
        result = process_request(body)
        
        return {
            "statusCode": 200,
            "body": json.dumps(result),
            "headers": {
                "Content-Type": "application/json"
            }
        }
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        return {
            "statusCode": 400,
            "body": json.dumps({"error": str(e)})
        }
    except Exception as e:
        logger.error(f"Internal error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "Internal server error"})
        }
```

## Request/Response Models

Use Pydantic for validation:

```python
from pydantic import BaseModel, Field

class CreateUserRequest(BaseModel):
    email: str = Field(..., pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$")
    name: str = Field(..., min_length=1, max_length=100)

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime
```

## Error Handling

Use consistent error responses:

```python
class ApiError(Exception):
    def __init__(self, status_code: int, message: str, details: dict | None = None):
        self.status_code = status_code
        self.message = message
        self.details = details or {}

# Standard error codes
# 400 - Bad Request (validation errors)
# 401 - Unauthorized
# 403 - Forbidden
# 404 - Not Found
# 500 - Internal Server Error
```

## Environment Variables

Access configuration via environment variables:

```python
import os

TABLE_NAME = os.environ.get("USERS_TABLE_NAME")
USER_POOL_ID = os.environ.get("USER_POOL_ID")
```

## DynamoDB Access

```python
import boto3

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["TABLE_NAME"])

# Get item
response = table.get_item(Key={"id": user_id})
item = response.get("Item")

# Put item
table.put_item(Item={"id": user_id, "email": email, "name": name})

# Query
response = table.query(
    KeyConditionExpression=Key("pk").eq(partition_key)
)
```

## Logging

```python
import logging
import json

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Structured logging
logger.info(json.dumps({
    "event": "user_created",
    "user_id": user.id,
    "email": user.email
}))
```

## Testing Lambdas

```python
import pytest
from unittest.mock import patch, MagicMock

def test_lambda_handler_success():
    event = {
        "body": json.dumps({"email": "test@example.com"})
    }
    context = MagicMock()
    
    with patch("boto3.resource") as mock_dynamodb:
        response = lambda_handler(event, context)
    
    assert response["statusCode"] == 200
```

## Running Locally

```bash
cd apps/api

# Install dependencies
pipenv install --dev

# Run tests
pipenv run pytest

# Run linting
pipenv run black .
pipenv run ruff check . --fix
pipenv run mypy src/
```
