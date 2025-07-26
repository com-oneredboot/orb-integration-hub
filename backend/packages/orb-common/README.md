# orb-common

Common utilities and exceptions for ORB Integration Hub Lambda functions.

## Overview

The `orb-common` package provides shared functionality across all Lambda functions and layers in the ORB Integration Hub project. This includes:

- **Exceptions**: Standardized exception classes for consistent error handling
- **Security**: Authentication, authorization, and encryption utilities
- **Audit**: Logging and compliance features for audit trails
- **Utils**: General utility functions used across the platform

## Installation

This package is designed to be used internally within the ORB Integration Hub monorepo only. It is **NOT published to PyPI** and should be installed using local path references.

### How It Works in the Monorepo

1. **No External Publishing**: This package stays within the monorepo and is never published to PyPI or any package repository.

2. **Lambda Layer Integration**: Lambda layers declare this package in their Pipfile:
   ```toml
   # In your layer's Pipfile
   [packages]
   orb-common = {path = "../../packages/orb-common"}
   ```
   
   The build script (`build_layer.sh`) then handles the installation automatically using `pipenv install`.

3. **Local Development**: During development, you can install in editable mode:
   ```bash
   # From within a layer directory
   pipenv install --dev
   
   # Or manually with pip
   pip install -e ../../packages/orb-common
   ```

4. **Important Note**: For Lambda deployment, the package should NOT use `editable = true` in the Pipfile, as this would create symlinks instead of copying the actual code.

### For Development

```bash
cd backend/packages/orb-common
make install-dev  # Installs with test dependencies
```

## Usage

### Exceptions

```python
from orb_common.exceptions import (
    DataValidationError,
    ResourceNotFoundError,
    ConflictError
)

# Raise a validation error
if not data.get('email'):
    raise DataValidationError("Email is required")

# Raise a not found error
try:
    user = get_user(user_id)
except UserNotFound:
    raise ResourceNotFoundError(f"User {user_id} not found")
```

### Security

```python
from orb_common.security import (
    validate_token,
    encrypt_sensitive_data,
    check_permissions
)

# Validate a JWT token
claims = validate_token(token)

# Encrypt sensitive data
encrypted = encrypt_sensitive_data(data, kms_key_id)

# Check permissions
if not check_permissions(user_context, 'organizations:write'):
    raise PermissionDeniedError()
```

### Audit Logging

```python
from orb_common.audit import (
    AuditLogger,
    AuditEventType,
    log_event
)

# Log an audit event
log_event(
    event_type=AuditEventType.USER_CREATED,
    user_id=user_id,
    details={"email": email},
    compliance_flags=["GDPR"]
)
```

## Development

### Setup

```bash
# From the package directory
cd backend/packages/orb-common

# Install development dependencies
make install-dev
```

### Running Tests

```bash
# Run tests with coverage
make test

# Or manually
pytest tests/
pytest tests/ --cov=orb_common --cov-report=html
```

### Code Quality

```bash
# Format code
make format

# Check code style
make lint

# Type checking
make type-check

# Security checks
make security-check

# Run all checks
make dev-check
```

### Pre-commit Hooks

```bash
pre-commit install
pre-commit run --all-files
```

## Project Structure

```
orb-common/
├── orb_common/
│   ├── __init__.py
│   ├── exceptions/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── security.py
│   │   └── validation.py
│   ├── security/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── crypto.py
│   │   └── permissions.py
│   ├── audit/
│   │   ├── __init__.py
│   │   ├── logger.py
│   │   └── events.py
│   └── utils/
│       ├── __init__.py
│       └── helpers.py
├── tests/
│   ├── __init__.py
│   ├── test_exceptions/
│   ├── test_security/
│   └── test_audit/
├── setup.py
├── pyproject.toml
└── README.md
```

## License

MIT License - See LICENSE.txt file for details.

## CI/CD

The GitHub Actions workflow (`.github/workflows/orb-common-package.yml`) automatically:
- Runs tests on multiple Python versions (3.9, 3.10, 3.11, 3.12)
- Checks code style and security
- Builds the package to ensure it's properly structured
- Stores build artifacts internally (no external publishing)

## Contributing

This is an internal package for the ORB Integration Hub project. Changes to this package may affect all Lambda functions, so please:
1. Run all tests before committing
2. Update documentation for any API changes
3. Follow the project's contribution guidelines