---
inclusion: fileMatch
fileMatchPattern: "**/test/**,**/tests/**,**/*_test.py,**/*.test.ts,**/*.spec.ts"
---
# Testing Standards

This file loads automatically when working with test files.

## Test Organization

### Python (pytest) - apps/api
```
apps/api/
├── conftest.py          # Shared fixtures
├── lambdas/
│   └── */test_*.py      # Lambda unit tests
├── layers/
│   └── */test_*.py      # Layer unit tests
tests/
├── unit/                # Unit tests
│   └── test_*.py
├── integration/         # Integration tests
│   └── test_*.py
└── property/            # Property-based tests
    └── test_*.py
```

### TypeScript (Jasmine/Karma) - apps/web
```
apps/web/src/
├── app/
│   ├── component.ts
│   └── component.spec.ts    # Co-located tests
tests/
└── integration/             # Integration tests
```

## Test Naming

- Test files: `test_<module>.py` or `<module>.spec.ts`
- Test functions: `test_<behavior>_<condition>_<expected>`
- Example: `test_calculate_distance_with_valid_coords_returns_meters`

## Running Tests

### Python (apps/api)
```bash
cd apps/api

# All tests
pipenv run pytest

# With coverage
pipenv run pytest --cov=src --cov-report=term-missing

# Specific marker
pipenv run pytest -m unit
pipenv run pytest -m property

# Specific file
pipenv run pytest lambdas/sms_verification/test_sms_verification.py
```

### TypeScript (apps/web)
```bash
cd apps/web

# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Headless (CI)
npm run test -- --watch=false --browsers=ChromeHeadless
```

## Property-Based Testing

Use Hypothesis (Python) or fast-check (TypeScript) for property tests:

```python
from hypothesis import given, strategies as st

@given(st.floats(min_value=-90, max_value=90))
def test_latitude_validation(lat: float) -> None:
    coord = Coordinate(latitude=lat, longitude=0)
    assert -90 <= coord.latitude <= 90
```

## Test Markers

```python
# pytest markers
@pytest.mark.unit
@pytest.mark.integration
@pytest.mark.property
@pytest.mark.slow
```

## Fixtures

Define shared fixtures in `conftest.py`:

```python
@pytest.fixture
def sample_user() -> dict:
    return {
        "id": "test-user-id",
        "email": "test@example.com",
        "name": "Test User"
    }
```

## Mocking Guidelines

- Mock external services (AWS, external APIs), not internal logic
- Use `unittest.mock` or `pytest-mock` for Python
- Use Jasmine spies for TypeScript
- Prefer dependency injection over patching
- Use `moto` for AWS service mocking in Python

## Integration Testing with LocalStack

For AWS service integration tests:

```python
import boto3
from moto import mock_dynamodb

@mock_dynamodb
def test_dynamodb_operations():
    client = boto3.client('dynamodb', region_name='us-east-1')
    # Test code here
```

## Security Testing

Security tests should cover:
- Input validation (XSS, SQL injection prevention)
- Authentication bypass attempts
- Rate limiting enforcement
- Token validation
- Error message sanitization
