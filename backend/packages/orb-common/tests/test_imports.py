"""Test that all package imports work correctly."""

import pytest


def test_main_package_import():
    """Test main package can be imported."""
    import orb_common

    assert orb_common.__version__ == "0.1.0"


def test_module_imports():
    """Test all modules can be imported."""
    from orb_common import audit, exceptions, security

    assert exceptions is not None
    assert security is not None
    assert audit is not None


def test_exception_imports():
    """Test exception imports."""
    from orb_common.exceptions import (
        AuthenticationError,
        ConflictError,
        DataValidationError,
        ResourceNotFoundError,
    )

    # Test creating exceptions
    exc = DataValidationError("Test error")
    assert str(exc) == "Test error"
    assert exc.error_code == "DataValidationError"


def test_security_imports():
    """Test security function imports."""
    from orb_common.security import validate_token

    # Test functions exist
    assert callable(validate_token)


def test_audit_imports():
    """Test audit function imports."""
    from orb_common.audit import AuditEventType, ComplianceFlag, StateTracker, log_audit_event

    # Test classes and enums exist
    assert AuditEventType.LOGIN_SUCCESS
    assert ComplianceFlag.GDPR
    assert StateTracker is not None


def test_utils_removed():
    """Test that utils module was removed."""
    with pytest.raises(ModuleNotFoundError):
        from orb_common import utils

    with pytest.raises(ModuleNotFoundError):
        import orb_common.utils


def test_package_level_imports():
    """Test imports available at package level."""
    from orb_common import AuthenticationError, DataValidationError, log_audit_event, validate_token

    # Test all are accessible
    assert DataValidationError is not None
    assert AuthenticationError is not None
    assert callable(validate_token)
    assert callable(log_audit_event)
