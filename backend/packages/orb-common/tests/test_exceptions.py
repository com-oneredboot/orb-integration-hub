"""Tests for exception classes."""

import pytest

from orb_common import (AuthenticationError, AuthorizationError, ConflictError,
                        DataValidationError, OrbError, ResourceNotFoundError,
                        SecurityException, ValidationError)


class TestExceptionHierarchy:
    """Test exception class hierarchy and inheritance."""

    def test_orb_error_is_base(self):
        """Test that OrbError is the base exception."""
        assert issubclass(ValidationError, OrbError)
        assert issubclass(AuthenticationError, OrbError)
        assert issubclass(AuthorizationError, OrbError)
        assert issubclass(ResourceNotFoundError, OrbError)
        assert issubclass(ConflictError, OrbError)

    def test_security_exception_hierarchy(self):
        """Test security exception hierarchy."""
        assert issubclass(SecurityException, OrbError)
        assert issubclass(DataValidationError, SecurityException)

    def test_exception_messages(self):
        """Test exception message handling."""
        msg = "Test error message"
        err = AuthenticationError(msg)
        assert str(err) == msg
        assert err.message == msg

    def test_exception_catching(self):
        """Test exception catching with base classes."""
        with pytest.raises(OrbError):
            raise AuthenticationError("Auth failed")

        with pytest.raises(SecurityException):
            raise DataValidationError("Invalid data")

    def test_exception_status_codes(self):
        """Test that exceptions have appropriate status codes."""
        # This assumes status_code property exists
        auth_err = AuthenticationError("Auth failed")
        assert hasattr(auth_err, "status_code")
        assert auth_err.status_code == 401

        not_found_err = ResourceNotFoundError("Not found")
        assert not_found_err.status_code == 404

        conflict_err = ConflictError("Conflict")
        assert conflict_err.status_code == 409


class TestExceptionUsage:
    """Test practical usage of exceptions."""

    def test_authentication_error_usage(self):
        """Test authentication error usage."""

        def authenticate(token):
            if not token:
                raise AuthenticationError("Token required")
            if token == "invalid":
                raise AuthenticationError("Invalid token")
            return True

        with pytest.raises(AuthenticationError) as exc_info:
            authenticate(None)
        assert "Token required" in str(exc_info.value)

        with pytest.raises(AuthenticationError) as exc_info:
            authenticate("invalid")
        assert "Invalid token" in str(exc_info.value)

    def test_validation_error_usage(self):
        """Test validation error usage."""

        def validate_data(data):
            if not isinstance(data, dict):
                raise DataValidationError("Data must be a dictionary")
            if "required_field" not in data:
                raise DataValidationError("Missing required field")
            return True

        with pytest.raises(DataValidationError) as exc_info:
            validate_data("not a dict")
        assert "dictionary" in str(exc_info.value)

        with pytest.raises(DataValidationError) as exc_info:
            validate_data({})
        assert "required field" in str(exc_info.value)
