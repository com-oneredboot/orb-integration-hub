# Testing Guidelines for ORB Integration Hub

## Overview

This document establishes testing best practices for the ORB Integration Hub project. Following Python testing conventions, test code should be organized alongside the code it tests, not in separate packages.

## Directory Structure

### Module-Level Tests
Each module should have its own `tests/` directory containing tests specific to that module:

```
backend/packages/orb-common/
├── orb_common/
│   ├── __init__.py
│   ├── exceptions.py
│   ├── security/
│   └── utils/
└── tests/
    ├── __init__.py
    ├── test_exceptions.py
    ├── test_security.py
    └── test_utils.py
```

### Lambda Function Tests
Lambda functions should have tests in a `tests/` subdirectory:

```
backend/src/lambdas/organizations/
├── index.py
├── requirements.txt
├── Pipfile
└── tests/
    ├── __init__.py
    ├── test_index.py
    └── conftest.py
```

### Shared Test Utilities
Truly shared test utilities (used across multiple packages) can be placed in:
1. `orb-common/tests/` for utilities shared across backend packages
2. Project root `tests/` for project-wide test utilities

## Test Organization Best Practices

### 1. Test File Naming
- Test files should be named `test_<module_name>.py`
- Test classes should be named `Test<ClassName>`
- Test functions should be named `test_<functionality>`

### 2. Test Utilities and Fixtures
- Place test utilities in `conftest.py` files within test directories
- Use pytest fixtures for reusable test setup
- Keep test data factories close to the tests that use them

### 3. Import Patterns
```python
# Good - relative imports for test utilities
from .conftest import create_test_user
from ..fixtures import database_session

# Good - absolute imports for production code
from orb_common.exceptions import ValidationError
from orb_models.models import User
```

### 4. Test Categories
Organize tests by type using pytest markers:
```python
@pytest.mark.unit
def test_user_validation():
    pass

@pytest.mark.integration
def test_database_connection():
    pass

@pytest.mark.slow
def test_performance():
    pass
```

## What NOT to Do

### ❌ Don't Create Separate Test Packages
- Avoid creating packages like `orb-testing` that exist solely for test utilities
- Test code should live alongside production code

### ❌ Don't Duplicate Test Utilities
- If a utility is only used in one module, keep it in that module's tests
- Only move utilities to shared locations when truly needed by multiple modules

### ❌ Don't Over-Engineer Test Infrastructure
- Start simple with basic pytest fixtures
- Add complexity only when needed

## Example Test Structure

### Simple Unit Test
```python
# backend/packages/orb-common/tests/test_exceptions.py
import pytest
from orb_common.exceptions import ValidationError

def test_validation_error_message():
    error = ValidationError("Invalid input")
    assert str(error) == "Invalid input"
```

### Test with Fixtures
```python
# backend/packages/orb-models/tests/conftest.py
import pytest
from orb_models.models import User

@pytest.fixture
def test_user():
    return User(
        user_id="test-123",
        email="test@example.com",
        status="ACTIVE"
    )

# backend/packages/orb-models/tests/test_user.py
def test_user_creation(test_user):
    assert test_user.user_id == "test-123"
    assert test_user.email == "test@example.com"
```

## Running Tests

### Run all tests
```bash
pytest
```

### Run tests for a specific package
```bash
pytest backend/packages/orb-common/tests/
```

### Run tests with coverage
```bash
pytest --cov=orb_common backend/packages/orb-common/tests/
```

### Run specific test categories
```bash
pytest -m unit  # Run only unit tests
pytest -m "not slow"  # Skip slow tests
```

## CI/CD Integration

Ensure your CI/CD pipeline:
1. Discovers tests in their proper locations
2. Runs tests in the correct environment
3. Reports coverage metrics
4. Fails on test failures

## Migration from Legacy Structure

If you have test code in non-standard locations:
1. Move test files to appropriate `tests/` directories
2. Update imports to use relative paths for test utilities
3. Remove any separate test packages
4. Update CI/CD configurations to find tests in new locations

## Summary

- Keep tests close to the code they test
- Use standard Python testing conventions
- Share utilities only when necessary
- Prefer simplicity over complexity
- Follow pytest best practices