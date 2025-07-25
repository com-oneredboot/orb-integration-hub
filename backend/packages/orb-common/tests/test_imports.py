"""Test that all package imports work correctly."""

import pytest


def test_main_package_import():
    """Test main package can be imported."""
    import orb_common
    assert orb_common.__version__ == "0.1.0"


def test_module_imports():
    """Test all modules can be imported."""
    from orb_common import exceptions
    from orb_common import security
    from orb_common import audit
    from orb_common import utils
    
    assert exceptions is not None
    assert security is not None
    assert audit is not None
    assert utils is not None


def test_exception_imports():
    """Test exception imports."""
    from orb_common.exceptions import (
        DataValidationError,
        AuthenticationError,
        ResourceNotFoundError,
        ConflictError,
    )
    
    # Test creating exceptions
    exc = DataValidationError("Test error")
    assert str(exc) == "Test error"
    assert exc.error_code == "DataValidationError"


def test_security_imports():
    """Test security function imports."""
    from orb_common.security import (
        validate_token,
        check_permissions,
        validate_email,
    )
    
    # Test functions exist
    assert callable(validate_token)
    assert callable(check_permissions)
    assert callable(validate_email)


def test_audit_imports():
    """Test audit function imports."""
    from orb_common.audit import (
        log_audit_event,
        AuditEventType,
        ComplianceFlag,
        StateTracker,
    )
    
    # Test classes and enums exist
    assert AuditEventType.LOGIN_SUCCESS
    assert ComplianceFlag.GDPR
    assert StateTracker is not None


def test_utils_imports():
    """Test utils function imports."""
    from orb_common.utils import (
        utc_now,
        safe_json_dumps,
        retry_with_backoff,
        is_valid_uuid,
    )
    
    # Test functions exist
    assert callable(utc_now)
    assert callable(safe_json_dumps)
    assert callable(retry_with_backoff)
    assert callable(is_valid_uuid)


def test_package_level_imports():
    """Test imports available at package level."""
    from orb_common import (
        DataValidationError,
        AuthenticationError,
        validate_token,
        log_audit_event,
    )
    
    # Test all are accessible
    assert DataValidationError is not None
    assert AuthenticationError is not None
    assert callable(validate_token)
    assert callable(log_audit_event)