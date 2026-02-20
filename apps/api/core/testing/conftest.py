"""
Pytest Configuration for Organizations Feature Testing

Global test configuration, fixtures, and utilities for organizations testing.
Integrates with existing test infrastructure while providing organization-specific features.

Author: Claude Code Assistant
Date: 2025-06-23
"""

import pytest
import os
import tempfile
from typing import Dict, Any
from unittest.mock import Mock, patch

from .test_environment_manager import EnvironmentManager, EnvironmentConfig
from .organization_test_data_factory import OrganizationTestDataFactory
from ..models.OrganizationUserRoleEnum import OrganizationUserRole

# =============================================================================
# Test Configuration
# =============================================================================


def pytest_configure(config):
    """Configure pytest for organizations testing."""

    # Add custom markers
    config.addinivalue_line("markers", "organization: mark test as organization-related")
    config.addinivalue_line("markers", "integration: mark test as integration test")
    config.addinivalue_line("markers", "performance: mark test as performance test")
    config.addinivalue_line("markers", "security: mark test as security test")
    config.addinivalue_line("markers", "edge_case: mark test as edge case test")
    config.addinivalue_line("markers", "slow: mark test as slow running")


def pytest_collection_modifyitems(config, items):
    """Modify test collection to add markers based on test names and paths."""

    for item in items:
        # Add organization marker for organization-related tests
        if "organization" in item.nodeid.lower():
            item.add_marker(pytest.mark.organization)

        # Add integration marker for integration tests
        if "integration" in item.nodeid.lower():
            item.add_marker(pytest.mark.integration)

        # Add performance marker for performance tests
        if "performance" in item.nodeid.lower():
            item.add_marker(pytest.mark.performance)
            item.add_marker(pytest.mark.slow)

        # Add security marker for security tests
        if "security" in item.nodeid.lower():
            item.add_marker(pytest.mark.security)

        # Add edge_case marker for edge case tests
        if "edge" in item.nodeid.lower():
            item.add_marker(pytest.mark.edge_case)


# =============================================================================
# Core Fixtures
# =============================================================================


@pytest.fixture(scope="session")
def test_config():
    """Test configuration fixture."""
    return {
        "aws_region": "us-east-1",
        "table_prefix": "test_orgs",
        "mock_dynamodb": True,
        "cleanup_after_test": True,
        "performance_test_size": "small",  # small, medium, large
        "test_timeout": 300,  # 5 minutes
        "enable_detailed_logging": True,
    }


@pytest.fixture(scope="session")
def organization_test_factory():
    """Organization test data factory fixture."""
    return OrganizationTestDataFactory()


@pytest.fixture(scope="function")
def isolated_organization_factory():
    """Isolated organization test factory for each test function."""
    factory = OrganizationTestDataFactory()
    yield factory
    # Cleanup is handled by the factory's context manager


# =============================================================================
# Environment Management Fixtures
# =============================================================================


@pytest.fixture(scope="session")
def shared_test_environment(test_config):
    """Shared test environment for session-level tests."""

    config = EnvironmentConfig(
        environment_name="pytest_shared",
        auto_cleanup=True,
        isolation_level="session",
        enable_mocking=test_config["mock_dynamodb"],
    )

    manager = EnvironmentManager(config)

    with manager.test_environment("comprehensive") as env:
        yield env


@pytest.fixture(scope="function")
def clean_test_environment(test_config):
    """Clean test environment for each test function."""

    config = EnvironmentConfig(
        environment_name=f"pytest_clean_{pytest.current_test_id()}",
        auto_cleanup=True,
        isolation_level="function",
        enable_mocking=test_config["mock_dynamodb"],
    )

    manager = EnvironmentManager(config)

    with manager.test_environment("basic") as env:
        yield env


@pytest.fixture(scope="class")
def class_test_environment(test_config, request):
    """Test environment scoped to test class."""

    class_name = request.cls.__name__ if request.cls else "unknown"

    config = EnvironmentConfig(
        environment_name=f"pytest_class_{class_name}",
        auto_cleanup=True,
        isolation_level="class",
        enable_mocking=test_config["mock_dynamodb"],
    )

    manager = EnvironmentManager(config)

    # Determine scenario based on class name
    scenario = "basic"
    if "performance" in class_name.lower():
        scenario = "performance"
    elif "security" in class_name.lower():
        scenario = "security"
    elif "integration" in class_name.lower():
        scenario = "comprehensive"

    with manager.test_environment(scenario) as env:
        yield env


# =============================================================================
# Organization-Specific Fixtures
# =============================================================================


@pytest.fixture
def test_organization(isolated_organization_factory):
    """Basic test organization fixture."""
    return isolated_organization_factory.create_test_organization(
        name="TestOrg_Basic", size="small"
    )


@pytest.fixture
def large_test_organization(isolated_organization_factory):
    """Large test organization fixture."""
    return isolated_organization_factory.create_test_organization(
        name="TestOrg_Large", size="large"
    )


@pytest.fixture
def multi_org_user(isolated_organization_factory):
    """Multi-organization user fixture."""
    # Create two organizations
    org1 = isolated_organization_factory.create_test_organization(
        name="TestOrg_Multi1", size="small"
    )
    org2 = isolated_organization_factory.create_test_organization(
        name="TestOrg_Multi2", size="small"
    )

    # Create user belonging to both organizations
    return isolated_organization_factory.create_multi_organization_user(
        organization_ids=[
            org1["organization"]["organization_id"],
            org2["organization"]["organization_id"],
        ],
        roles={
            org1["organization"]["organization_id"]: OrganizationUserRole.ADMIN,
            org2["organization"]["organization_id"]: OrganizationUserRole.MEMBER,
        },
    )


@pytest.fixture
def role_test_scenarios(isolated_organization_factory):
    """Role-based test scenarios fixture."""
    return isolated_organization_factory.create_role_based_test_scenarios()


@pytest.fixture
def security_test_organizations(isolated_organization_factory):
    """Security test organizations fixture."""
    return isolated_organization_factory.create_security_test_organizations()


@pytest.fixture
def edge_case_organizations(isolated_organization_factory):
    """Edge case organizations fixture."""
    return isolated_organization_factory.create_edge_case_organizations()


# =============================================================================
# Mock Fixtures
# =============================================================================


@pytest.fixture
def mock_dynamodb_repository():
    """Mock DynamoDB repository fixture."""

    with patch("backend.src.core.models.dynamodb.repository.DynamoDBRepository") as mock_repo:
        # Configure mock methods
        mock_instance = Mock()
        mock_repo.return_value = mock_instance

        # Setup common mock responses
        mock_instance.create_item.return_value = {"success": True}
        mock_instance.get_item.return_value = None
        mock_instance.update_item.return_value = {"success": True}
        mock_instance.delete_item.return_value = {"success": True}
        mock_instance.query_items.return_value = []
        mock_instance.scan_items.return_value = []

        yield mock_instance


@pytest.fixture
def mock_aws_services():
    """Mock AWS services fixture."""

    mocks = {}

    # Mock KMS
    with patch("boto3.client") as mock_boto_client:
        mock_kms = Mock()
        mock_kms.create_key.return_value = {
            "KeyMetadata": {
                "KeyId": "test-key-id",
                "Arn": "arn:aws:kms:us-east-1:123456789012:key/test-key-id",
            }
        }
        mock_kms.create_alias.return_value = {}

        mock_dynamodb = Mock()
        mock_dynamodb.create_table.return_value = {}

        def client_side_effect(service, **kwargs):
            if service == "kms":
                return mock_kms
            elif service == "dynamodb":
                return mock_dynamodb
            else:
                return Mock()

        mock_boto_client.side_effect = client_side_effect

        mocks["kms"] = mock_kms
        mocks["dynamodb"] = mock_dynamodb

        yield mocks


# =============================================================================
# Performance Testing Fixtures
# =============================================================================


@pytest.fixture(scope="session")
def performance_test_environment(test_config):
    """Performance testing environment fixture."""

    if test_config["performance_test_size"] == "small":
        pass
    elif test_config["performance_test_size"] == "medium":
        pass
    else:
        pass

    config = EnvironmentConfig(
        environment_name="pytest_performance",
        auto_cleanup=True,
        isolation_level="session",
        enable_mocking=test_config["mock_dynamodb"],
        performance_testing=True,
    )

    manager = EnvironmentManager(config)

    with manager.test_environment("performance") as env:
        yield env


@pytest.fixture
def performance_test_data(isolated_organization_factory, test_config):
    """Performance test data fixture."""

    size_mapping = {"small": 10, "medium": 50, "large": 100}

    org_count = size_mapping.get(test_config["performance_test_size"], 10)

    return isolated_organization_factory.create_performance_test_data(organization_count=org_count)


# =============================================================================
# Helper Fixtures
# =============================================================================


@pytest.fixture
def temp_test_file():
    """Temporary test file fixture."""

    with tempfile.NamedTemporaryFile(mode="w+", suffix=".json", delete=False) as f:
        yield f.name

    # Cleanup
    try:
        os.unlink(f.name)
    except FileNotFoundError:
        pass


@pytest.fixture
def test_data_validator():
    """Test data validation utilities fixture."""

    class TestDataValidator:
        @staticmethod
        def validate_organization_structure(org_data: Dict[str, Any]) -> bool:
            """Validate organization data structure."""
            required_fields = [
                "organization",
                "owner",
                "users",
                "applications",
                "metadata",
            ]
            return all(field in org_data for field in required_fields)

        @staticmethod
        def validate_user_permissions(
            user_role: OrganizationUserRole, expected_permissions: list
        ) -> bool:
            """Validate user permissions based on role."""
            # This would contain actual permission validation logic
            return True

        @staticmethod
        def validate_organization_integrity(org_data: Dict[str, Any]) -> Dict[str, Any]:
            """Validate organization data integrity."""
            results = {"valid": True, "errors": [], "warnings": []}

            # Check organization structure
            if not org_data.get("organization", {}).get("organization_id"):
                results["errors"].append("Missing organization ID")
                results["valid"] = False

            # Check owner exists
            if not org_data.get("owner", {}).get("user_id"):
                results["errors"].append("Missing owner")
                results["valid"] = False

            # Check user count consistency
            expected_users = org_data.get("metadata", {}).get("total_users", 0)
            actual_users = len(org_data.get("users", [])) + 1  # +1 for owner
            if expected_users != actual_users:
                results["warnings"].append(
                    f"User count mismatch: expected {expected_users}, got {actual_users}"
                )

            return results

    return TestDataValidator()


# =============================================================================
# Custom Pytest Utilities
# =============================================================================


def get_current_test_id():
    """Get current test ID for isolation."""
    import threading

    current_thread = threading.current_thread()
    return getattr(current_thread, "test_id", "unknown")


@pytest.fixture(autouse=True)
def set_test_id(request):
    """Automatically set test ID for current test."""
    import threading

    current_thread = threading.current_thread()
    current_thread.test_id = request.node.nodeid.replace("::", "_").replace("/", "_")


# =============================================================================
# Cleanup Fixtures
# =============================================================================


@pytest.fixture(autouse=True)
def test_cleanup():
    """Automatic cleanup fixture."""

    # Setup
    yield

    # Cleanup
    # This would typically clean up any remaining test resources
    pass


# =============================================================================
# Logging and Debugging Fixtures
# =============================================================================


@pytest.fixture(autouse=True)
def test_logging(test_config, request):
    """Test logging configuration."""

    if test_config.get("enable_detailed_logging", False):
        import logging

        # Configure logging for test
        logger = logging.getLogger("organization_tests")
        logger.setLevel(logging.DEBUG)

        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
            handler.setFormatter(formatter)
            logger.addHandler(handler)

        logger.info(f"Starting test: {request.node.nodeid}")

        yield logger

        logger.info(f"Completed test: {request.node.nodeid}")
    else:
        yield None
