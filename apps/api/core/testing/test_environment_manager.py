"""
Test Environment Manager

Automated test environment management with DynamoDB seeding, cleanup,
and isolation mechanisms for organizations feature testing.

Author: Claude Code Assistant
Date: 2025-06-23
"""

import boto3
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from contextlib import contextmanager

import pytest
from moto import mock_dynamodb

from .organization_test_data_factory import OrganizationTestDataFactory


@dataclass
class TestEnvironmentConfig:
    """Configuration for test environment setup."""

    environment_name: str
    dynamodb_endpoint: Optional[str] = None
    aws_region: str = "us-east-1"
    table_prefix: str = "test"
    auto_cleanup: bool = True
    isolation_level: str = "session"  # session, class, function
    enable_mocking: bool = True
    performance_testing: bool = False
    max_test_duration_minutes: int = 30


class TestEnvironmentManager:
    """Manages test environments with automated setup, seeding, and cleanup."""

    def __init__(self, config: TestEnvironmentConfig):
        self.config = config
        self.factory = OrganizationTestDataFactory()
        self.dynamodb_client = None
        self.dynamodb_resource = None
        self.created_tables = []
        self.seeded_data = {}
        self.test_start_time = None
        self.cleanup_callbacks = []

        # Initialize AWS clients based on configuration
        self._initialize_aws_clients()

    def _initialize_aws_clients(self):
        """Initialize AWS DynamoDB clients with appropriate configuration."""

        if self.config.enable_mocking:
            # Use moto for mocking
            self.mock_dynamodb = mock_dynamodb()
            self.mock_dynamodb.start()

            self.dynamodb_client = boto3.client("dynamodb", region_name=self.config.aws_region)
            self.dynamodb_resource = boto3.resource("dynamodb", region_name=self.config.aws_region)
        else:
            # Use real DynamoDB (for integration testing)
            session_config = {"region_name": self.config.aws_region}

            if self.config.dynamodb_endpoint:
                session_config["endpoint_url"] = self.config.dynamodb_endpoint

            self.dynamodb_client = boto3.client("dynamodb", **session_config)
            self.dynamodb_resource = boto3.resource("dynamodb", **session_config)

    # =============================================================================
    # Environment Setup and Teardown
    # =============================================================================

    @contextmanager
    def test_environment(self, scenario: str = "comprehensive"):
        """Context manager for test environment lifecycle."""

        self.test_start_time = datetime.utcnow()

        try:
            # Setup environment
            self.setup_test_environment()

            # Seed data based on scenario
            if scenario == "comprehensive":
                self.seed_comprehensive_environment()
            elif scenario == "performance":
                self.seed_performance_environment()
            elif scenario == "security":
                self.seed_security_test_environment()
            elif scenario == "edge_cases":
                self.seed_edge_case_environment()
            else:
                self.seed_basic_environment()

            yield self

        finally:
            # Cleanup if configured
            if self.config.auto_cleanup:
                self.cleanup_test_environment()

    def setup_test_environment(self):
        """Set up the test environment with required DynamoDB tables."""

        print(f"Setting up test environment: {self.config.environment_name}")

        # Create required tables
        self._create_test_tables()

        # Wait for tables to be active
        self._wait_for_tables_active()

        print("Test environment setup complete")

    def cleanup_test_environment(self):
        """Clean up the test environment and all created resources."""

        print(f"Cleaning up test environment: {self.config.environment_name}")

        try:
            # Execute cleanup callbacks
            for callback in reversed(self.cleanup_callbacks):
                try:
                    callback()
                except Exception as e:
                    print(f"Cleanup callback failed: {e}")

            # Delete seeded data
            self._delete_seeded_data()

            # Delete test tables
            self._delete_test_tables()

            # Stop mocking if enabled
            if self.config.enable_mocking and hasattr(self, "mock_dynamodb"):
                self.mock_dynamodb.stop()

        except Exception as e:
            print(f"Cleanup failed: {e}")

        print("Test environment cleanup complete")

    # =============================================================================
    # Table Management
    # =============================================================================

    def _create_test_tables(self):
        """Create all required DynamoDB tables for testing."""

        table_definitions = self._get_table_definitions()

        for table_name, table_config in table_definitions.items():
            try:
                self.dynamodb_resource.create_table(**table_config)
                self.created_tables.append(table_name)
                print(f"Created test table: {table_name}")

            except self.dynamodb_client.exceptions.ResourceInUseException:
                print(f"Table already exists: {table_name}")
                self.created_tables.append(table_name)

    def _get_table_definitions(self) -> Dict[str, Dict]:
        """Get DynamoDB table definitions for testing."""

        table_prefix = f"{self.config.table_prefix}_{self.config.environment_name}"

        return {
            f"{table_prefix}_organizations": {
                "TableName": f"{table_prefix}_organizations",
                "KeySchema": [{"AttributeName": "organization_id", "KeyType": "HASH"}],
                "AttributeDefinitions": [
                    {"AttributeName": "organization_id", "AttributeType": "S"},
                    {"AttributeName": "owner_id", "AttributeType": "S"},
                    {"AttributeName": "status", "AttributeType": "S"},
                ],
                "GlobalSecondaryIndexes": [
                    {
                        "IndexName": "OwnerIndex",
                        "KeySchema": [{"AttributeName": "owner_id", "KeyType": "HASH"}],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST",
                    },
                    {
                        "IndexName": "StatusIndex",
                        "KeySchema": [{"AttributeName": "status", "KeyType": "HASH"}],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST",
                    },
                ],
                "BillingMode": "PAY_PER_REQUEST",
            },
            f"{table_prefix}_organization_users": {
                "TableName": f"{table_prefix}_organization_users",
                "KeySchema": [
                    {"AttributeName": "user_id", "KeyType": "HASH"},
                    {"AttributeName": "organization_id", "KeyType": "RANGE"},
                ],
                "AttributeDefinitions": [
                    {"AttributeName": "user_id", "AttributeType": "S"},
                    {"AttributeName": "organization_id", "AttributeType": "S"},
                ],
                "GlobalSecondaryIndexes": [
                    {
                        "IndexName": "OrganizationIndex",
                        "KeySchema": [{"AttributeName": "organization_id", "KeyType": "HASH"}],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST",
                    }
                ],
                "BillingMode": "PAY_PER_REQUEST",
            },
            f"{table_prefix}_users": {
                "TableName": f"{table_prefix}_users",
                "KeySchema": [{"AttributeName": "user_id", "KeyType": "HASH"}],
                "AttributeDefinitions": [
                    {"AttributeName": "user_id", "AttributeType": "S"},
                    {"AttributeName": "email", "AttributeType": "S"},
                    {"AttributeName": "cognito_sub", "AttributeType": "S"},
                ],
                "GlobalSecondaryIndexes": [
                    {
                        "IndexName": "EmailIndex",
                        "KeySchema": [{"AttributeName": "email", "KeyType": "HASH"}],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST",
                    },
                    {
                        "IndexName": "CognitoSubIndex",
                        "KeySchema": [{"AttributeName": "cognito_sub", "KeyType": "HASH"}],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST",
                    },
                ],
                "BillingMode": "PAY_PER_REQUEST",
            },
            f"{table_prefix}_applications": {
                "TableName": f"{table_prefix}_applications",
                "KeySchema": [{"AttributeName": "application_id", "KeyType": "HASH"}],
                "AttributeDefinitions": [
                    {"AttributeName": "application_id", "AttributeType": "S"},
                    {"AttributeName": "organization_id", "AttributeType": "S"},
                ],
                "GlobalSecondaryIndexes": [
                    {
                        "IndexName": "OrganizationIndex",
                        "KeySchema": [{"AttributeName": "organization_id", "KeyType": "HASH"}],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST",
                    }
                ],
                "BillingMode": "PAY_PER_REQUEST",
            },
        }

    def _wait_for_tables_active(self, timeout: int = 60):
        """Wait for all tables to become active."""

        start_time = time.time()

        for table_name in self.created_tables:
            while time.time() - start_time < timeout:
                try:
                    table = self.dynamodb_resource.Table(table_name)
                    table.load()
                    if table.table_status == "ACTIVE":
                        break
                    time.sleep(1)
                except Exception:
                    time.sleep(1)
            else:
                raise TimeoutError(
                    f"Table {table_name} did not become active within {timeout} seconds"
                )

    def _delete_test_tables(self):
        """Delete all created test tables."""

        for table_name in self.created_tables:
            try:
                table = self.dynamodb_resource.Table(table_name)
                table.delete()
                print(f"Deleted test table: {table_name}")
            except Exception as e:
                print(f"Failed to delete table {table_name}: {e}")

        self.created_tables.clear()

    # =============================================================================
    # Data Seeding Methods
    # =============================================================================

    def seed_comprehensive_environment(self) -> Dict[str, Any]:
        """Seed comprehensive test environment with all scenarios."""

        print("Seeding comprehensive test environment...")

        # Create comprehensive test data
        environment = self.factory.seed_comprehensive_test_environment()

        # Seed data to DynamoDB
        self._seed_data_to_dynamodb(environment)

        self.seeded_data = environment
        return environment

    def seed_performance_environment(self) -> List[Dict[str, Any]]:
        """Seed performance testing environment with large datasets."""

        print("Seeding performance test environment...")

        # Create performance test data
        organization_count = 100 if self.config.performance_testing else 10
        performance_data = self.factory.create_performance_test_data(
            organization_count=organization_count
        )

        # Seed data to DynamoDB
        self._seed_performance_data_to_dynamodb(performance_data)

        self.seeded_data = {"performance_organizations": performance_data}
        return performance_data

    def seed_security_test_environment(self) -> Dict[str, Any]:
        """Seed security testing environment."""

        print("Seeding security test environment...")

        # Create security test organizations
        security_orgs = self.factory.create_security_test_organizations()

        # Seed data to DynamoDB
        for scenario_name, org_data in security_orgs.items():
            self._seed_organization_data_to_dynamodb(org_data, scenario_name)

        self.seeded_data = {"security_tests": security_orgs}
        return security_orgs

    def seed_edge_case_environment(self) -> Dict[str, Any]:
        """Seed edge case testing environment."""

        print("Seeding edge case test environment...")

        # Create edge case organizations
        edge_cases = self.factory.create_edge_case_organizations()

        # Seed data to DynamoDB
        for scenario_name, org_data in edge_cases.items():
            self._seed_organization_data_to_dynamodb(org_data, scenario_name)

        self.seeded_data = {"edge_cases": edge_cases}
        return edge_cases

    def seed_basic_environment(self) -> Dict[str, Any]:
        """Seed basic test environment with minimal data."""

        print("Seeding basic test environment...")

        # Create basic test organization
        basic_org = self.factory.create_test_organization(
            name=f"BasicTest_{self.factory.test_session_id}", size="small"
        )

        # Seed data to DynamoDB
        self._seed_organization_data_to_dynamodb(basic_org, "basic")

        self.seeded_data = {"basic": basic_org}
        return basic_org

    # =============================================================================
    # DynamoDB Data Operations
    # =============================================================================

    def _seed_data_to_dynamodb(self, environment: Dict[str, Any]):
        """Seed comprehensive environment data to DynamoDB."""

        # Extract and seed all organization scenarios
        scenarios = environment.get("scenarios", {})

        for scenario_name, scenario_data in scenarios.items():
            if scenario_name == "basic":
                # Handle basic scenarios
                for org_type, org_data in scenario_data.items():
                    self._seed_organization_data_to_dynamodb(org_data, f"basic_{org_type}")

            elif scenario_name in ["edge_cases", "security_tests"]:
                # Handle edge cases and security tests
                for test_name, org_data in scenario_data.items():
                    self._seed_organization_data_to_dynamodb(
                        org_data, f"{scenario_name}_{test_name}"
                    )

            elif scenario_name == "multi_org_user":
                # Handle multi-organization user
                self._seed_multi_org_user_to_dynamodb(scenario_data, scenario_name)

            elif scenario_name == "role_based":
                # Handle role-based scenarios
                self._seed_role_based_scenarios_to_dynamodb(scenario_data, scenario_name)

    def _seed_organization_data_to_dynamodb(self, org_data: Dict[str, Any], scenario_name: str):
        """Seed organization data to DynamoDB tables."""

        table_prefix = f"{self.config.table_prefix}_{self.config.environment_name}"

        try:
            # Seed organization
            org_table = self.dynamodb_resource.Table(f"{table_prefix}_organizations")
            org_item = self._convert_to_dynamodb_item(org_data["organization"])
            org_table.put_item(Item=org_item)

            # Seed owner user
            if "owner" in org_data:
                users_table = self.dynamodb_resource.Table(f"{table_prefix}_users")
                owner_item = self._convert_to_dynamodb_item(org_data["owner"])
                users_table.put_item(Item=owner_item)

            # Seed additional users
            if "users" in org_data:
                users_table = self.dynamodb_resource.Table(f"{table_prefix}_users")
                for user in org_data["users"]:
                    if "user_data" in user:
                        user_item = self._convert_to_dynamodb_item(user["user_data"])
                        users_table.put_item(Item=user_item)

            # Seed organization users relationships
            org_users_table = self.dynamodb_resource.Table(f"{table_prefix}_organization_users")

            # Create membership for owner
            if "organization" in org_data and "owner" in org_data:
                owner_membership = {
                    "user_id": org_data["owner"].get("user_id"),
                    "organization_id": org_data["organization"]["organization_id"],
                    "role": "OWNER",
                    "status": "ACTIVE",
                    "invited_by": "system",
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                }
                org_users_table.put_item(Item=owner_membership)

            # Create memberships for additional users
            if "users" in org_data:
                for i, user in enumerate(org_data["users"]):
                    if "user_data" in user:
                        membership = {
                            "user_id": user["user_data"]["user_id"],
                            "organization_id": org_data["organization"]["organization_id"],
                            "role": "ADMIN" if i == 0 else "MEMBER",
                            "status": "ACTIVE",
                            "invited_by": org_data["owner"].get("user_id", "system"),
                            "created_at": datetime.utcnow().isoformat(),
                            "updated_at": datetime.utcnow().isoformat(),
                        }
                        org_users_table.put_item(Item=membership)

            # Seed applications
            if "applications" in org_data:
                apps_table = self.dynamodb_resource.Table(f"{table_prefix}_applications")
                for app in org_data["applications"]:
                    app_item = self._convert_to_dynamodb_item(app)
                    apps_table.put_item(Item=app_item)

            print(f"Seeded organization data for scenario: {scenario_name}")

        except Exception as e:
            print(f"Failed to seed organization data for {scenario_name}: {e}")

    def _seed_performance_data_to_dynamodb(self, performance_data: List[Dict[str, Any]]):
        """Seed performance test data using batch operations."""

        # Use batch writing for performance
        with self.dynamodb_resource.batch_writer() as batch:
            for org_data in performance_data:
                try:
                    # Batch write organizations
                    org_item = self._convert_to_dynamodb_item(org_data["organization"])
                    batch.put_item(Item=org_item)

                except Exception as e:
                    print(f"Failed to batch write organization: {e}")

        print(f"Seeded {len(performance_data)} organizations for performance testing")

    def _convert_to_dynamodb_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Convert Python dict to DynamoDB item format."""

        # Handle datetime objects
        converted_item = {}
        for key, value in item.items():
            if isinstance(value, datetime):
                converted_item[key] = value.isoformat()
            elif hasattr(value, "value"):  # Handle enums
                converted_item[key] = value.value
            else:
                converted_item[key] = value

        return converted_item

    def _delete_seeded_data(self):
        """Delete all seeded test data from DynamoDB."""

        # Delete from each table
        for table_name in self.created_tables:
            try:
                table = self.dynamodb_resource.Table(table_name)

                # Scan and delete all items
                scan_response = table.scan()
                items = scan_response.get("Items", [])

                # Delete in batches
                with table.batch_writer() as batch:
                    for item in items:
                        # Get key attributes based on table
                        if "organization_users" in table_name:
                            key = {
                                "user_id": item["user_id"],
                                "organization_id": item["organization_id"],
                            }
                        else:
                            # Single key tables
                            primary_key = list(item.keys())[0]
                            key = {primary_key: item[primary_key]}

                        batch.delete_item(Key=key)

                print(f"Deleted {len(items)} items from {table_name}")

            except Exception as e:
                print(f"Failed to delete data from {table_name}: {e}")

    # =============================================================================
    # Test Utilities
    # =============================================================================

    def get_test_organization_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Get test organization by name."""

        table_prefix = f"{self.config.table_prefix}_{self.config.environment_name}"
        table = self.dynamodb_resource.Table(f"{table_prefix}_organizations")

        try:
            response = table.scan(
                FilterExpression="contains(#name, :name)",
                ExpressionAttributeNames={"#name": "name"},
                ExpressionAttributeValues={":name": name},
            )

            items = response.get("Items", [])
            return items[0] if items else None

        except Exception as e:
            print(f"Failed to get organization by name {name}: {e}")
            return None

    def validate_test_environment(self) -> Dict[str, Any]:
        """Validate the test environment setup and data integrity."""

        validation_results = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "statistics": {},
        }

        try:
            # Check each table
            for table_name in self.created_tables:
                table = self.dynamodb_resource.Table(table_name)

                # Count items
                scan_response = table.scan(Select="COUNT")
                item_count = scan_response.get("Count", 0)
                validation_results["statistics"][table_name] = item_count

                if item_count == 0:
                    validation_results["warnings"].append(f"Table {table_name} is empty")

            # Check test duration
            if self.test_start_time:
                duration = datetime.utcnow() - self.test_start_time
                max_duration = timedelta(minutes=self.config.max_test_duration_minutes)

                if duration > max_duration:
                    validation_results["warnings"].append(
                        f"Test duration ({duration}) exceeds maximum ({max_duration})"
                    )

            validation_results["valid"] = len(validation_results["errors"]) == 0

        except Exception as e:
            validation_results["valid"] = False
            validation_results["errors"].append(f"Validation exception: {str(e)}")

        return validation_results

    def add_cleanup_callback(self, callback: callable):
        """Add a callback to be executed during cleanup."""
        self.cleanup_callbacks.append(callback)


# =============================================================================
# Pytest Integration
# =============================================================================


@pytest.fixture(scope="session")
def test_environment_manager():
    """Pytest fixture for test environment manager."""

    config = TestEnvironmentConfig(
        environment_name="pytest_session",
        auto_cleanup=True,
        isolation_level="session",
        enable_mocking=True,
    )

    manager = TestEnvironmentManager(config)

    with manager.test_environment("comprehensive") as env:
        yield env


@pytest.fixture(scope="function")
def isolated_test_environment():
    """Pytest fixture for isolated function-level test environment."""

    config = TestEnvironmentConfig(
        environment_name=f"pytest_function_{int(time.time())}",
        auto_cleanup=True,
        isolation_level="function",
        enable_mocking=True,
    )

    manager = TestEnvironmentManager(config)

    with manager.test_environment("basic") as env:
        yield env


@pytest.fixture(scope="class")
def performance_test_environment():
    """Pytest fixture for performance testing environment."""

    config = TestEnvironmentConfig(
        environment_name="pytest_performance",
        auto_cleanup=True,
        isolation_level="class",
        enable_mocking=True,
        performance_testing=True,
    )

    manager = TestEnvironmentManager(config)

    with manager.test_environment("performance") as env:
        yield env
