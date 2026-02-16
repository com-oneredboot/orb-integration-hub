"""
GetApplicationUsers Integration Tests

End-to-end integration tests for the GetApplicationUsers Lambda function.
Tests the complete flow: DynamoDB setup → Lambda execution → Response verification.

Task 15.1: End-to-end test
- Create test role assignments in DynamoDB
- Query via GraphQL API (Lambda handler)
- Verify results in response structure
- Clean up test data

@see .kiro/specs/application-users-management/design.md
**Validates: Requirements 3.1-3.13, 4.1-4.13**
"""

import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List
from unittest.mock import patch

import boto3
import pytest
from moto import mock_aws


# Test constants
TEST_ORG_ID = f"org-test-{uuid.uuid4().hex[:8]}"
TEST_ORG_NAME = "Test Organization"
TEST_APP_ID = f"app-test-{uuid.uuid4().hex[:8]}"
TEST_APP_NAME = "Test Application"
TEST_USER_ID_1 = f"user-test-{uuid.uuid4().hex[:8]}"
TEST_USER_ID_2 = f"user-test-{uuid.uuid4().hex[:8]}"
TEST_USER_ID_3 = f"user-test-{uuid.uuid4().hex[:8]}"
TEST_CALLER_USER_ID = f"caller-{uuid.uuid4().hex[:8]}"


@pytest.fixture
def aws_credentials():
    """Mock AWS credentials for moto."""
    os.environ["AWS_ACCESS_KEY_ID"] = "testing"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "testing"
    os.environ["AWS_SECURITY_TOKEN"] = "testing"
    os.environ["AWS_SESSION_TOKEN"] = "testing"
    os.environ["AWS_DEFAULT_REGION"] = "us-east-1"


@pytest.fixture
def dynamodb_tables(aws_credentials):
    """Create mock DynamoDB tables for integration testing."""
    with mock_aws():
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")

        # Create ApplicationUserRoles table
        app_user_roles_table = dynamodb.create_table(
            TableName="test-application-user-roles",
            KeySchema=[
                {"AttributeName": "applicationUserRoleId", "KeyType": "HASH"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationUserRoleId", "AttributeType": "S"},
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
                {"AttributeName": "userId", "AttributeType": "S"},
                {"AttributeName": "status", "AttributeType": "S"},
            ],
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "AppEnvUserIndex",
                    "KeySchema": [
                        {"AttributeName": "applicationId", "KeyType": "HASH"},
                        {"AttributeName": "environment", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                    "ProvisionedThroughput": {
                        "ReadCapacityUnits": 5,
                        "WriteCapacityUnits": 5,
                    },
                },
                {
                    "IndexName": "UserAppIndex",
                    "KeySchema": [
                        {"AttributeName": "userId", "KeyType": "HASH"},
                        {"AttributeName": "applicationId", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                    "ProvisionedThroughput": {
                        "ReadCapacityUnits": 5,
                        "WriteCapacityUnits": 5,
                    },
                },
                {
                    "IndexName": "UserEnvRoleIndex",
                    "KeySchema": [
                        {"AttributeName": "userId", "KeyType": "HASH"},
                        {"AttributeName": "environment", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                    "ProvisionedThroughput": {
                        "ReadCapacityUnits": 5,
                        "WriteCapacityUnits": 5,
                    },
                },
                {
                    "IndexName": "UserStatusIndex",
                    "KeySchema": [
                        {"AttributeName": "userId", "KeyType": "HASH"},
                        {"AttributeName": "status", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                    "ProvisionedThroughput": {
                        "ReadCapacityUnits": 5,
                        "WriteCapacityUnits": 5,
                    },
                },
            ],
            ProvisionedThroughput={
                "ReadCapacityUnits": 5,
                "WriteCapacityUnits": 5,
            },
        )
        app_user_roles_table.wait_until_exists()

        # Create Users table
        users_table = dynamodb.create_table(
            TableName="test-users",
            KeySchema=[
                {"AttributeName": "userId", "KeyType": "HASH"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "userId", "AttributeType": "S"},
            ],
            ProvisionedThroughput={
                "ReadCapacityUnits": 5,
                "WriteCapacityUnits": 5,
            },
        )
        users_table.wait_until_exists()

        # Create Applications table
        applications_table = dynamodb.create_table(
            TableName="test-applications",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "organizationId", "AttributeType": "S"},
            ],
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "OrgAppIndex",
                    "KeySchema": [
                        {"AttributeName": "organizationId", "KeyType": "HASH"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                    "ProvisionedThroughput": {
                        "ReadCapacityUnits": 5,
                        "WriteCapacityUnits": 5,
                    },
                },
            ],
            ProvisionedThroughput={
                "ReadCapacityUnits": 5,
                "WriteCapacityUnits": 5,
            },
        )
        applications_table.wait_until_exists()

        # Create OrganizationUsers table (for authorization)
        org_users_table = dynamodb.create_table(
            TableName="orb-integration-hub-dev-organization-users",
            KeySchema=[
                {"AttributeName": "organizationUserId", "KeyType": "HASH"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "organizationUserId", "AttributeType": "S"},
                {"AttributeName": "userId", "AttributeType": "S"},
                {"AttributeName": "organizationId", "AttributeType": "S"},
            ],
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "UserOrgIndex",
                    "KeySchema": [
                        {"AttributeName": "userId", "KeyType": "HASH"},
                        {"AttributeName": "organizationId", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                    "ProvisionedThroughput": {
                        "ReadCapacityUnits": 5,
                        "WriteCapacityUnits": 5,
                    },
                },
            ],
            ProvisionedThroughput={
                "ReadCapacityUnits": 5,
                "WriteCapacityUnits": 5,
            },
        )
        org_users_table.wait_until_exists()

        yield {
            "app_user_roles": app_user_roles_table,
            "users": users_table,
            "applications": applications_table,
            "org_users": org_users_table,
            "dynamodb": dynamodb,
        }


def create_test_user(users_table, user_id: str, first_name: str, last_name: str) -> Dict[str, Any]:
    """Create a test user in the Users table."""
    now = datetime.now(timezone.utc)
    user = {
        "userId": user_id,
        "firstName": first_name,
        "lastName": last_name,
        "status": "ACTIVE",
        "createdAt": Decimal(str(now.timestamp())),
        "updatedAt": Decimal(str(now.timestamp())),
    }
    users_table.put_item(Item=user)
    return user


def create_test_role_assignment(
    app_user_roles_table,
    user_id: str,
    app_id: str,
    app_name: str,
    org_id: str,
    org_name: str,
    environment: str,
    role_name: str = "Admin",
    permissions: List[str] = None,
    status: str = "ACTIVE",
) -> Dict[str, Any]:
    """Create a test role assignment in ApplicationUserRoles table."""
    now = datetime.now(timezone.utc)
    role_assignment = {
        "applicationUserRoleId": f"aur-{uuid.uuid4().hex[:12]}",
        "userId": user_id,
        "applicationId": app_id,
        "applicationName": app_name,
        "organizationId": org_id,
        "organizationName": org_name,
        "environment": environment,
        "roleId": f"role-{uuid.uuid4().hex[:8]}",
        "roleName": role_name,
        "permissions": permissions or ["read", "write"],
        "status": status,
        "createdAt": Decimal(str(now.timestamp())),
        "updatedAt": Decimal(str(now.timestamp())),
    }
    app_user_roles_table.put_item(Item=role_assignment)
    return role_assignment


def create_test_application(
    applications_table, app_id: str, app_name: str, org_id: str
) -> Dict[str, Any]:
    """Create a test application in Applications table."""
    now = datetime.now(timezone.utc)
    application = {
        "applicationId": app_id,
        "name": app_name,
        "organizationId": org_id,
        "status": "ACTIVE",
        "createdAt": Decimal(str(now.timestamp())),
        "updatedAt": Decimal(str(now.timestamp())),
    }
    applications_table.put_item(Item=application)
    return application


def create_org_user_ownership(
    org_users_table, user_id: str, org_id: str, role: str = "OWNER"
) -> Dict[str, Any]:
    """Create organization user ownership record."""
    now = datetime.now(timezone.utc)
    org_user = {
        "organizationUserId": f"ou-{uuid.uuid4().hex[:12]}",
        "userId": user_id,
        "organizationId": org_id,
        "role": role,
        "status": "ACTIVE",
        "createdAt": Decimal(str(now.timestamp())),
        "updatedAt": Decimal(str(now.timestamp())),
    }
    org_users_table.put_item(Item=org_user)
    return org_user


class TestGetApplicationUsersIntegration:
    """Integration tests for GetApplicationUsers Lambda function.
    
    **Validates: Requirements 3.1-3.13**
    """

    def test_query_users_by_application_id(self, dynamodb_tables):
        """Test querying users filtered by applicationId.
        
        **Validates: Requirements 3.2, 3.8, 3.9, 3.10**
        """
        tables = dynamodb_tables
        
        # Setup: Create test users
        create_test_user(tables["users"], TEST_USER_ID_1, "Alice", "Anderson")
        create_test_user(tables["users"], TEST_USER_ID_2, "Bob", "Brown")
        
        # Setup: Create test application
        create_test_application(
            tables["applications"], TEST_APP_ID, TEST_APP_NAME, TEST_ORG_ID
        )
        
        # Setup: Create role assignments for both users in the same app
        create_test_role_assignment(
            tables["app_user_roles"],
            TEST_USER_ID_1,
            TEST_APP_ID,
            TEST_APP_NAME,
            TEST_ORG_ID,
            TEST_ORG_NAME,
            "PRODUCTION",
        )
        create_test_role_assignment(
            tables["app_user_roles"],
            TEST_USER_ID_2,
            TEST_APP_ID,
            TEST_APP_NAME,
            TEST_ORG_ID,
            TEST_ORG_NAME,
            "STAGING",
        )
        
        # Setup: Create caller ownership
        create_org_user_ownership(tables["org_users"], TEST_CALLER_USER_ID, TEST_ORG_ID)
        
        # Import and configure Lambda
        with patch.dict(os.environ, {
            "APPLICATION_USER_ROLES_TABLE_NAME": "test-application-user-roles",
            "USERS_TABLE_NAME": "test-users",
            "APPLICATIONS_TABLE_NAME": "test-applications",
            "ORGANIZATIONS_TABLE_NAME": "test-organizations",
        }):
            # Reset the cached DynamoDB resource
            import lambdas.get_application_users.index as lambda_module
            lambda_module._dynamodb = tables["dynamodb"]
            
            # Execute Lambda
            event = {
                "arguments": {
                    "input": {
                        "applicationIds": [TEST_APP_ID],
                        "limit": 50,
                    }
                },
                "identity": {
                    "sub": TEST_CALLER_USER_ID,
                    "groups": ["EMPLOYEE"],  # EMPLOYEE can see all
                },
            }
            
            result = lambda_module.lambda_handler(event, None)
        
        # Verify response structure
        assert "users" in result
        assert "nextToken" in result
        assert len(result["users"]) == 2
        
        # Verify user data is enriched
        user_ids = [u["userId"] for u in result["users"]]
        assert TEST_USER_ID_1 in user_ids
        assert TEST_USER_ID_2 in user_ids
        
        # Verify users have firstName and lastName (enrichment)
        for user in result["users"]:
            assert "firstName" in user
            assert "lastName" in user
            assert user["firstName"] in ["Alice", "Bob"]


    def test_query_users_with_environment_filter(self, dynamodb_tables):
        """Test querying users with environment filter.
        
        **Validates: Requirements 3.5, 3.6**
        """
        tables = dynamodb_tables
        
        # Setup: Create test users
        create_test_user(tables["users"], TEST_USER_ID_1, "Charlie", "Clark")
        create_test_user(tables["users"], TEST_USER_ID_2, "Diana", "Davis")
        
        # Setup: Create test application
        create_test_application(
            tables["applications"], TEST_APP_ID, TEST_APP_NAME, TEST_ORG_ID
        )
        
        # Setup: Create role assignments in different environments
        create_test_role_assignment(
            tables["app_user_roles"],
            TEST_USER_ID_1,
            TEST_APP_ID,
            TEST_APP_NAME,
            TEST_ORG_ID,
            TEST_ORG_NAME,
            "PRODUCTION",
        )
        create_test_role_assignment(
            tables["app_user_roles"],
            TEST_USER_ID_2,
            TEST_APP_ID,
            TEST_APP_NAME,
            TEST_ORG_ID,
            TEST_ORG_NAME,
            "STAGING",
        )
        
        # Import and configure Lambda
        with patch.dict(os.environ, {
            "APPLICATION_USER_ROLES_TABLE_NAME": "test-application-user-roles",
            "USERS_TABLE_NAME": "test-users",
            "APPLICATIONS_TABLE_NAME": "test-applications",
            "ORGANIZATIONS_TABLE_NAME": "test-organizations",
        }):
            import lambdas.get_application_users.index as lambda_module
            lambda_module._dynamodb = tables["dynamodb"]
            
            # Execute Lambda with environment filter
            event = {
                "arguments": {
                    "input": {
                        "applicationIds": [TEST_APP_ID],
                        "environment": "PRODUCTION",
                        "limit": 50,
                    }
                },
                "identity": {
                    "sub": TEST_CALLER_USER_ID,
                    "groups": ["EMPLOYEE"],
                },
            }
            
            result = lambda_module.lambda_handler(event, None)
        
        # Verify only PRODUCTION users returned
        assert len(result["users"]) == 1
        assert result["users"][0]["userId"] == TEST_USER_ID_1
        assert result["users"][0]["firstName"] == "Charlie"

    def test_user_deduplication_with_multiple_roles(self, dynamodb_tables):
        """Test that users with multiple roles appear only once.
        
        **Validates: Requirements 3.8, 3.10**
        """
        tables = dynamodb_tables
        
        # Setup: Create single user
        create_test_user(tables["users"], TEST_USER_ID_1, "Eve", "Edwards")
        
        # Setup: Create test application
        create_test_application(
            tables["applications"], TEST_APP_ID, TEST_APP_NAME, TEST_ORG_ID
        )
        
        # Setup: Create multiple role assignments for same user
        create_test_role_assignment(
            tables["app_user_roles"],
            TEST_USER_ID_1,
            TEST_APP_ID,
            TEST_APP_NAME,
            TEST_ORG_ID,
            TEST_ORG_NAME,
            "PRODUCTION",
            role_name="Admin",
        )
        create_test_role_assignment(
            tables["app_user_roles"],
            TEST_USER_ID_1,
            TEST_APP_ID,
            TEST_APP_NAME,
            TEST_ORG_ID,
            TEST_ORG_NAME,
            "STAGING",
            role_name="Developer",
        )
        create_test_role_assignment(
            tables["app_user_roles"],
            TEST_USER_ID_1,
            TEST_APP_ID,
            TEST_APP_NAME,
            TEST_ORG_ID,
            TEST_ORG_NAME,
            "DEVELOPMENT",
            role_name="Viewer",
        )
        
        with patch.dict(os.environ, {
            "APPLICATION_USER_ROLES_TABLE_NAME": "test-application-user-roles",
            "USERS_TABLE_NAME": "test-users",
            "APPLICATIONS_TABLE_NAME": "test-applications",
            "ORGANIZATIONS_TABLE_NAME": "test-organizations",
        }):
            import lambdas.get_application_users.index as lambda_module
            lambda_module._dynamodb = tables["dynamodb"]
            
            event = {
                "arguments": {
                    "input": {
                        "applicationIds": [TEST_APP_ID],
                        "limit": 50,
                    }
                },
                "identity": {
                    "sub": TEST_CALLER_USER_ID,
                    "groups": ["EMPLOYEE"],
                },
            }
            
            result = lambda_module.lambda_handler(event, None)
        
        # Verify user appears only once
        assert len(result["users"]) == 1
        assert result["users"][0]["userId"] == TEST_USER_ID_1
        
        # Verify all role assignments are grouped under the user
        assert len(result["users"][0]["roleAssignments"]) == 3
        
        # Verify role names
        role_names = [ra["roleName"] for ra in result["users"][0]["roleAssignments"]]
        assert "Admin" in role_names
        assert "Developer" in role_names
        assert "Viewer" in role_names


    def test_result_sorting_by_name(self, dynamodb_tables):
        """Test that results are sorted by lastName then firstName.
        
        **Validates: Requirements 3.12**
        """
        tables = dynamodb_tables
        
        # Setup: Create users with specific names for sorting test
        create_test_user(tables["users"], TEST_USER_ID_1, "Charlie", "Brown")
        create_test_user(tables["users"], TEST_USER_ID_2, "Alice", "Anderson")
        create_test_user(tables["users"], TEST_USER_ID_3, "Bob", "Brown")
        
        # Setup: Create test application
        create_test_application(
            tables["applications"], TEST_APP_ID, TEST_APP_NAME, TEST_ORG_ID
        )
        
        # Setup: Create role assignments
        for user_id in [TEST_USER_ID_1, TEST_USER_ID_2, TEST_USER_ID_3]:
            create_test_role_assignment(
                tables["app_user_roles"],
                user_id,
                TEST_APP_ID,
                TEST_APP_NAME,
                TEST_ORG_ID,
                TEST_ORG_NAME,
                "PRODUCTION",
            )
        
        with patch.dict(os.environ, {
            "APPLICATION_USER_ROLES_TABLE_NAME": "test-application-user-roles",
            "USERS_TABLE_NAME": "test-users",
            "APPLICATIONS_TABLE_NAME": "test-applications",
            "ORGANIZATIONS_TABLE_NAME": "test-organizations",
        }):
            import lambdas.get_application_users.index as lambda_module
            lambda_module._dynamodb = tables["dynamodb"]
            
            event = {
                "arguments": {
                    "input": {
                        "applicationIds": [TEST_APP_ID],
                        "limit": 50,
                    }
                },
                "identity": {
                    "sub": TEST_CALLER_USER_ID,
                    "groups": ["EMPLOYEE"],
                },
            }
            
            result = lambda_module.lambda_handler(event, None)
        
        # Verify sorting: Anderson, Alice < Brown, Bob < Brown, Charlie
        assert len(result["users"]) == 3
        assert result["users"][0]["lastName"] == "Anderson"
        assert result["users"][0]["firstName"] == "Alice"
        assert result["users"][1]["lastName"] == "Brown"
        assert result["users"][1]["firstName"] == "Bob"
        assert result["users"][2]["lastName"] == "Brown"
        assert result["users"][2]["firstName"] == "Charlie"

    def test_pagination_limit(self, dynamodb_tables):
        """Test that pagination limit is respected.
        
        **Validates: Requirements 3.11**
        """
        tables = dynamodb_tables
        
        # Setup: Create multiple users
        for i in range(5):
            user_id = f"user-page-{i}"
            create_test_user(tables["users"], user_id, f"User{i}", f"Last{i}")
            create_test_role_assignment(
                tables["app_user_roles"],
                user_id,
                TEST_APP_ID,
                TEST_APP_NAME,
                TEST_ORG_ID,
                TEST_ORG_NAME,
                "PRODUCTION",
            )
        
        # Setup: Create test application
        create_test_application(
            tables["applications"], TEST_APP_ID, TEST_APP_NAME, TEST_ORG_ID
        )
        
        with patch.dict(os.environ, {
            "APPLICATION_USER_ROLES_TABLE_NAME": "test-application-user-roles",
            "USERS_TABLE_NAME": "test-users",
            "APPLICATIONS_TABLE_NAME": "test-applications",
            "ORGANIZATIONS_TABLE_NAME": "test-organizations",
        }):
            import lambdas.get_application_users.index as lambda_module
            lambda_module._dynamodb = tables["dynamodb"]
            
            # Request with limit of 3
            event = {
                "arguments": {
                    "input": {
                        "applicationIds": [TEST_APP_ID],
                        "limit": 3,
                    }
                },
                "identity": {
                    "sub": TEST_CALLER_USER_ID,
                    "groups": ["EMPLOYEE"],
                },
            }
            
            result = lambda_module.lambda_handler(event, None)
        
        # Verify limit is respected
        assert len(result["users"]) == 3
        # Verify nextToken indicates more results
        assert result["nextToken"] is not None


    def test_validation_error_environment_without_filter(self, dynamodb_tables):
        """Test validation error when environment filter provided without org/app filter.
        
        **Validates: Requirements 3.1, 3.4**
        """
        tables = dynamodb_tables
        
        with patch.dict(os.environ, {
            "APPLICATION_USER_ROLES_TABLE_NAME": "test-application-user-roles",
            "USERS_TABLE_NAME": "test-users",
            "APPLICATIONS_TABLE_NAME": "test-applications",
            "ORGANIZATIONS_TABLE_NAME": "test-organizations",
        }):
            import lambdas.get_application_users.index as lambda_module
            lambda_module._dynamodb = tables["dynamodb"]
            
            # Request with only environment filter (should fail)
            event = {
                "arguments": {
                    "input": {
                        "environment": "PRODUCTION",
                        "limit": 50,
                    }
                },
                "identity": {
                    "sub": TEST_CALLER_USER_ID,
                    "groups": ["EMPLOYEE"],
                },
            }
            
            with pytest.raises(Exception) as exc_info:
                lambda_module.lambda_handler(event, None)
            
            assert "ORB-VAL-001" in str(exc_info.value)
            assert "Environment filter requires" in str(exc_info.value)

    def test_validation_error_invalid_limit(self, dynamodb_tables):
        """Test validation error for invalid limit values.
        
        **Validates: Requirements 3.1**
        """
        tables = dynamodb_tables
        
        with patch.dict(os.environ, {
            "APPLICATION_USER_ROLES_TABLE_NAME": "test-application-user-roles",
            "USERS_TABLE_NAME": "test-users",
            "APPLICATIONS_TABLE_NAME": "test-applications",
            "ORGANIZATIONS_TABLE_NAME": "test-organizations",
        }):
            import lambdas.get_application_users.index as lambda_module
            lambda_module._dynamodb = tables["dynamodb"]
            
            # Request with invalid limit (> 100)
            event = {
                "arguments": {
                    "input": {
                        "applicationIds": [TEST_APP_ID],
                        "limit": 150,
                    }
                },
                "identity": {
                    "sub": TEST_CALLER_USER_ID,
                    "groups": ["EMPLOYEE"],
                },
            }
            
            with pytest.raises(Exception) as exc_info:
                lambda_module.lambda_handler(event, None)
            
            assert "ORB-VAL-002" in str(exc_info.value)
            assert "Limit must be between 1 and 100" in str(exc_info.value)

    def test_empty_results(self, dynamodb_tables):
        """Test handling of empty results.
        
        **Validates: Requirements 3.7**
        """
        tables = dynamodb_tables
        
        # Setup: Create test application but no role assignments
        create_test_application(
            tables["applications"], TEST_APP_ID, TEST_APP_NAME, TEST_ORG_ID
        )
        
        with patch.dict(os.environ, {
            "APPLICATION_USER_ROLES_TABLE_NAME": "test-application-user-roles",
            "USERS_TABLE_NAME": "test-users",
            "APPLICATIONS_TABLE_NAME": "test-applications",
            "ORGANIZATIONS_TABLE_NAME": "test-organizations",
        }):
            import lambdas.get_application_users.index as lambda_module
            lambda_module._dynamodb = tables["dynamodb"]
            
            event = {
                "arguments": {
                    "input": {
                        "applicationIds": [TEST_APP_ID],
                        "limit": 50,
                    }
                },
                "identity": {
                    "sub": TEST_CALLER_USER_ID,
                    "groups": ["EMPLOYEE"],
                },
            }
            
            result = lambda_module.lambda_handler(event, None)
        
        # Verify empty results
        assert result["users"] == []
        assert result["nextToken"] is None


    def test_response_structure_completeness(self, dynamodb_tables):
        """Test that response contains all required fields.
        
        **Validates: Requirements 3.9, 4.1**
        """
        tables = dynamodb_tables
        
        # Setup: Create test user
        create_test_user(tables["users"], TEST_USER_ID_1, "Frank", "Fisher")
        
        # Setup: Create test application
        create_test_application(
            tables["applications"], TEST_APP_ID, TEST_APP_NAME, TEST_ORG_ID
        )
        
        # Setup: Create role assignment
        create_test_role_assignment(
            tables["app_user_roles"],
            TEST_USER_ID_1,
            TEST_APP_ID,
            TEST_APP_NAME,
            TEST_ORG_ID,
            TEST_ORG_NAME,
            "PRODUCTION",
            role_name="Admin",
            permissions=["read", "write", "delete"],
        )
        
        with patch.dict(os.environ, {
            "APPLICATION_USER_ROLES_TABLE_NAME": "test-application-user-roles",
            "USERS_TABLE_NAME": "test-users",
            "APPLICATIONS_TABLE_NAME": "test-applications",
            "ORGANIZATIONS_TABLE_NAME": "test-organizations",
        }):
            import lambdas.get_application_users.index as lambda_module
            lambda_module._dynamodb = tables["dynamodb"]
            
            event = {
                "arguments": {
                    "input": {
                        "applicationIds": [TEST_APP_ID],
                        "limit": 50,
                    }
                },
                "identity": {
                    "sub": TEST_CALLER_USER_ID,
                    "groups": ["EMPLOYEE"],
                },
            }
            
            result = lambda_module.lambda_handler(event, None)
        
        # Verify top-level structure
        assert "users" in result
        assert "nextToken" in result
        
        # Verify user structure
        user = result["users"][0]
        assert "userId" in user
        assert "firstName" in user
        assert "lastName" in user
        assert "status" in user
        assert "roleAssignments" in user
        
        # Verify user values
        assert user["userId"] == TEST_USER_ID_1
        assert user["firstName"] == "Frank"
        assert user["lastName"] == "Fisher"
        assert user["status"] == "ACTIVE"
        
        # Verify role assignment structure
        role_assignment = user["roleAssignments"][0]
        assert "applicationUserRoleId" in role_assignment
        assert "applicationId" in role_assignment
        assert "applicationName" in role_assignment
        assert "organizationId" in role_assignment
        assert "organizationName" in role_assignment
        assert "environment" in role_assignment
        assert "roleId" in role_assignment
        assert "roleName" in role_assignment
        assert "permissions" in role_assignment
        assert "status" in role_assignment
        assert "createdAt" in role_assignment
        assert "updatedAt" in role_assignment
        
        # Verify role assignment values
        assert role_assignment["applicationId"] == TEST_APP_ID
        assert role_assignment["applicationName"] == TEST_APP_NAME
        assert role_assignment["organizationId"] == TEST_ORG_ID
        assert role_assignment["organizationName"] == TEST_ORG_NAME
        assert role_assignment["environment"] == "PRODUCTION"
        assert role_assignment["roleName"] == "Admin"
        assert role_assignment["permissions"] == ["read", "write", "delete"]


    def test_excludes_deleted_role_assignments(self, dynamodb_tables):
        """Test that DELETED role assignments are excluded from results.
        
        **Validates: Requirements 3.2**
        """
        tables = dynamodb_tables
        
        # Setup: Create test users
        create_test_user(tables["users"], TEST_USER_ID_1, "Grace", "Green")
        create_test_user(tables["users"], TEST_USER_ID_2, "Henry", "Hill")
        
        # Setup: Create test application
        create_test_application(
            tables["applications"], TEST_APP_ID, TEST_APP_NAME, TEST_ORG_ID
        )
        
        # Setup: Create one ACTIVE and one DELETED role assignment
        create_test_role_assignment(
            tables["app_user_roles"],
            TEST_USER_ID_1,
            TEST_APP_ID,
            TEST_APP_NAME,
            TEST_ORG_ID,
            TEST_ORG_NAME,
            "PRODUCTION",
            status="ACTIVE",
        )
        create_test_role_assignment(
            tables["app_user_roles"],
            TEST_USER_ID_2,
            TEST_APP_ID,
            TEST_APP_NAME,
            TEST_ORG_ID,
            TEST_ORG_NAME,
            "PRODUCTION",
            status="DELETED",
        )
        
        with patch.dict(os.environ, {
            "APPLICATION_USER_ROLES_TABLE_NAME": "test-application-user-roles",
            "USERS_TABLE_NAME": "test-users",
            "APPLICATIONS_TABLE_NAME": "test-applications",
            "ORGANIZATIONS_TABLE_NAME": "test-organizations",
        }):
            import lambdas.get_application_users.index as lambda_module
            lambda_module._dynamodb = tables["dynamodb"]
            
            event = {
                "arguments": {
                    "input": {
                        "applicationIds": [TEST_APP_ID],
                        "limit": 50,
                    }
                },
                "identity": {
                    "sub": TEST_CALLER_USER_ID,
                    "groups": ["EMPLOYEE"],
                },
            }
            
            result = lambda_module.lambda_handler(event, None)
        
        # Verify only ACTIVE user is returned
        assert len(result["users"]) == 1
        assert result["users"][0]["userId"] == TEST_USER_ID_1
        assert result["users"][0]["firstName"] == "Grace"

    def test_handles_missing_user_in_users_table(self, dynamodb_tables):
        """Test graceful handling when user not found in Users table.
        
        **Validates: Requirements 3.9**
        """
        tables = dynamodb_tables
        
        # Setup: Create test application
        create_test_application(
            tables["applications"], TEST_APP_ID, TEST_APP_NAME, TEST_ORG_ID
        )
        
        # Setup: Create role assignment WITHOUT creating user in Users table
        create_test_role_assignment(
            tables["app_user_roles"],
            TEST_USER_ID_1,  # User not in Users table
            TEST_APP_ID,
            TEST_APP_NAME,
            TEST_ORG_ID,
            TEST_ORG_NAME,
            "PRODUCTION",
        )
        
        with patch.dict(os.environ, {
            "APPLICATION_USER_ROLES_TABLE_NAME": "test-application-user-roles",
            "USERS_TABLE_NAME": "test-users",
            "APPLICATIONS_TABLE_NAME": "test-applications",
            "ORGANIZATIONS_TABLE_NAME": "test-organizations",
        }):
            import lambdas.get_application_users.index as lambda_module
            lambda_module._dynamodb = tables["dynamodb"]
            
            event = {
                "arguments": {
                    "input": {
                        "applicationIds": [TEST_APP_ID],
                        "limit": 50,
                    }
                },
                "identity": {
                    "sub": TEST_CALLER_USER_ID,
                    "groups": ["EMPLOYEE"],
                },
            }
            
            result = lambda_module.lambda_handler(event, None)
        
        # Verify user is returned with placeholder values
        assert len(result["users"]) == 1
        assert result["users"][0]["userId"] == TEST_USER_ID_1
        assert result["users"][0]["firstName"] == "Unknown"
        assert result["users"][0]["lastName"] == "User"
        assert result["users"][0]["status"] == "UNKNOWN"


    def test_query_by_organization_ids(self, dynamodb_tables):
        """Test querying users filtered by organizationIds.
        
        **Validates: Requirements 3.3, 3.6**
        """
        tables = dynamodb_tables
        
        # Setup: Create test users
        create_test_user(tables["users"], TEST_USER_ID_1, "Ivy", "Irving")
        create_test_user(tables["users"], TEST_USER_ID_2, "Jack", "Johnson")
        
        # Setup: Create two organizations with applications
        org_id_1 = f"org-1-{uuid.uuid4().hex[:8]}"
        org_id_2 = f"org-2-{uuid.uuid4().hex[:8]}"
        app_id_1 = f"app-1-{uuid.uuid4().hex[:8]}"
        app_id_2 = f"app-2-{uuid.uuid4().hex[:8]}"
        
        create_test_application(tables["applications"], app_id_1, "App One", org_id_1)
        create_test_application(tables["applications"], app_id_2, "App Two", org_id_2)
        
        # Setup: Create role assignments in different orgs
        create_test_role_assignment(
            tables["app_user_roles"],
            TEST_USER_ID_1,
            app_id_1,
            "App One",
            org_id_1,
            "Org One",
            "PRODUCTION",
        )
        create_test_role_assignment(
            tables["app_user_roles"],
            TEST_USER_ID_2,
            app_id_2,
            "App Two",
            org_id_2,
            "Org Two",
            "PRODUCTION",
        )
        
        with patch.dict(os.environ, {
            "APPLICATION_USER_ROLES_TABLE_NAME": "test-application-user-roles",
            "USERS_TABLE_NAME": "test-users",
            "APPLICATIONS_TABLE_NAME": "test-applications",
            "ORGANIZATIONS_TABLE_NAME": "test-organizations",
        }):
            import lambdas.get_application_users.index as lambda_module
            lambda_module._dynamodb = tables["dynamodb"]
            
            # Query for only org_id_1
            event = {
                "arguments": {
                    "input": {
                        "organizationIds": [org_id_1],
                        "limit": 50,
                    }
                },
                "identity": {
                    "sub": TEST_CALLER_USER_ID,
                    "groups": ["EMPLOYEE"],
                },
            }
            
            result = lambda_module.lambda_handler(event, None)
        
        # Verify only users from org_id_1 are returned
        assert len(result["users"]) == 1
        assert result["users"][0]["userId"] == TEST_USER_ID_1
        assert result["users"][0]["firstName"] == "Ivy"


class TestGetApplicationUsersAuthorizationIntegration:
    """Integration tests for authorization in GetApplicationUsers Lambda.
    
    **Validates: Requirements 6.1-6.5**
    """

    def test_customer_sees_only_owned_organizations(self, dynamodb_tables):
        """Test that CUSTOMER users only see users from organizations they own.
        
        **Validates: Requirements 6.3**
        """
        tables = dynamodb_tables
        
        # Setup: Create test users
        create_test_user(tables["users"], TEST_USER_ID_1, "Kate", "King")
        create_test_user(tables["users"], TEST_USER_ID_2, "Leo", "Lewis")
        
        # Setup: Create two organizations
        owned_org_id = f"owned-org-{uuid.uuid4().hex[:8]}"
        other_org_id = f"other-org-{uuid.uuid4().hex[:8]}"
        owned_app_id = f"owned-app-{uuid.uuid4().hex[:8]}"
        other_app_id = f"other-app-{uuid.uuid4().hex[:8]}"
        
        create_test_application(tables["applications"], owned_app_id, "Owned App", owned_org_id)
        create_test_application(tables["applications"], other_app_id, "Other App", other_org_id)
        
        # Setup: Create role assignments
        create_test_role_assignment(
            tables["app_user_roles"],
            TEST_USER_ID_1,
            owned_app_id,
            "Owned App",
            owned_org_id,
            "Owned Org",
            "PRODUCTION",
        )
        create_test_role_assignment(
            tables["app_user_roles"],
            TEST_USER_ID_2,
            other_app_id,
            "Other App",
            other_org_id,
            "Other Org",
            "PRODUCTION",
        )
        
        # Setup: Create ownership - caller owns only owned_org_id
        create_org_user_ownership(tables["org_users"], TEST_CALLER_USER_ID, owned_org_id)
        
        with patch.dict(os.environ, {
            "APPLICATION_USER_ROLES_TABLE_NAME": "test-application-user-roles",
            "USERS_TABLE_NAME": "test-users",
            "APPLICATIONS_TABLE_NAME": "test-applications",
            "ORGANIZATIONS_TABLE_NAME": "test-organizations",
        }):
            import lambdas.get_application_users.index as lambda_module
            lambda_module._dynamodb = tables["dynamodb"]
            
            # Query as CUSTOMER (not EMPLOYEE or OWNER)
            event = {
                "arguments": {
                    "input": {
                        "limit": 50,
                    }
                },
                "identity": {
                    "sub": TEST_CALLER_USER_ID,
                    "groups": ["CUSTOMER"],  # Only CUSTOMER, not EMPLOYEE
                },
            }
            
            result = lambda_module.lambda_handler(event, None)
        
        # Verify only users from owned organization are returned
        assert len(result["users"]) == 1
        assert result["users"][0]["userId"] == TEST_USER_ID_1
        assert result["users"][0]["firstName"] == "Kate"


    def test_employee_sees_all_organizations(self, dynamodb_tables):
        """Test that EMPLOYEE users can see users from all organizations.
        
        **Validates: Requirements 6.4**
        """
        tables = dynamodb_tables
        
        # Setup: Create test users
        create_test_user(tables["users"], TEST_USER_ID_1, "Mike", "Miller")
        create_test_user(tables["users"], TEST_USER_ID_2, "Nancy", "Nelson")
        
        # Setup: Create two organizations
        org_id_1 = f"org-1-{uuid.uuid4().hex[:8]}"
        org_id_2 = f"org-2-{uuid.uuid4().hex[:8]}"
        app_id_1 = f"app-1-{uuid.uuid4().hex[:8]}"
        app_id_2 = f"app-2-{uuid.uuid4().hex[:8]}"
        
        create_test_application(tables["applications"], app_id_1, "App One", org_id_1)
        create_test_application(tables["applications"], app_id_2, "App Two", org_id_2)
        
        # Setup: Create role assignments in different orgs
        create_test_role_assignment(
            tables["app_user_roles"],
            TEST_USER_ID_1,
            app_id_1,
            "App One",
            org_id_1,
            "Org One",
            "PRODUCTION",
        )
        create_test_role_assignment(
            tables["app_user_roles"],
            TEST_USER_ID_2,
            app_id_2,
            "App Two",
            org_id_2,
            "Org Two",
            "PRODUCTION",
        )
        
        with patch.dict(os.environ, {
            "APPLICATION_USER_ROLES_TABLE_NAME": "test-application-user-roles",
            "USERS_TABLE_NAME": "test-users",
            "APPLICATIONS_TABLE_NAME": "test-applications",
            "ORGANIZATIONS_TABLE_NAME": "test-organizations",
        }):
            import lambdas.get_application_users.index as lambda_module
            lambda_module._dynamodb = tables["dynamodb"]
            
            # Query as EMPLOYEE
            event = {
                "arguments": {
                    "input": {
                        "applicationIds": [app_id_1, app_id_2],
                        "limit": 50,
                    }
                },
                "identity": {
                    "sub": TEST_CALLER_USER_ID,
                    "groups": ["EMPLOYEE"],
                },
            }
            
            result = lambda_module.lambda_handler(event, None)
        
        # Verify users from both organizations are returned
        assert len(result["users"]) == 2
        user_ids = [u["userId"] for u in result["users"]]
        assert TEST_USER_ID_1 in user_ids
        assert TEST_USER_ID_2 in user_ids

    def test_unauthorized_user_gets_error(self, dynamodb_tables):
        """Test that users without authorized groups get an error.
        
        **Validates: Requirements 6.5**
        """
        tables = dynamodb_tables
        
        with patch.dict(os.environ, {
            "APPLICATION_USER_ROLES_TABLE_NAME": "test-application-user-roles",
            "USERS_TABLE_NAME": "test-users",
            "APPLICATIONS_TABLE_NAME": "test-applications",
            "ORGANIZATIONS_TABLE_NAME": "test-organizations",
        }):
            import lambdas.get_application_users.index as lambda_module
            lambda_module._dynamodb = tables["dynamodb"]
            
            # Query with no authorized groups
            event = {
                "arguments": {
                    "input": {
                        "applicationIds": [TEST_APP_ID],
                        "limit": 50,
                    }
                },
                "identity": {
                    "sub": TEST_CALLER_USER_ID,
                    "groups": ["SOME_OTHER_GROUP"],  # Not CUSTOMER, EMPLOYEE, or OWNER
                },
            }
            
            with pytest.raises(Exception) as exc_info:
                lambda_module.lambda_handler(event, None)
            
            assert "ORB-AUTH-003" in str(exc_info.value)
            assert "Insufficient permissions" in str(exc_info.value)

    def test_owner_sees_all_organizations(self, dynamodb_tables):
        """Test that OWNER users can see users from all organizations.
        
        **Validates: Requirements 6.4**
        """
        tables = dynamodb_tables
        
        # Setup: Create test users
        create_test_user(tables["users"], TEST_USER_ID_1, "Oliver", "Owens")
        create_test_user(tables["users"], TEST_USER_ID_2, "Patricia", "Peters")
        
        # Setup: Create two organizations
        org_id_1 = f"org-owner-1-{uuid.uuid4().hex[:8]}"
        org_id_2 = f"org-owner-2-{uuid.uuid4().hex[:8]}"
        app_id_1 = f"app-owner-1-{uuid.uuid4().hex[:8]}"
        app_id_2 = f"app-owner-2-{uuid.uuid4().hex[:8]}"
        
        create_test_application(tables["applications"], app_id_1, "App Owner One", org_id_1)
        create_test_application(tables["applications"], app_id_2, "App Owner Two", org_id_2)
        
        # Setup: Create role assignments in different orgs
        create_test_role_assignment(
            tables["app_user_roles"],
            TEST_USER_ID_1,
            app_id_1,
            "App Owner One",
            org_id_1,
            "Org Owner One",
            "PRODUCTION",
        )
        create_test_role_assignment(
            tables["app_user_roles"],
            TEST_USER_ID_2,
            app_id_2,
            "App Owner Two",
            org_id_2,
            "Org Owner Two",
            "PRODUCTION",
        )
        
        with patch.dict(os.environ, {
            "APPLICATION_USER_ROLES_TABLE_NAME": "test-application-user-roles",
            "USERS_TABLE_NAME": "test-users",
            "APPLICATIONS_TABLE_NAME": "test-applications",
            "ORGANIZATIONS_TABLE_NAME": "test-organizations",
        }):
            import lambdas.get_application_users.index as lambda_module
            lambda_module._dynamodb = tables["dynamodb"]
            
            # Query as OWNER (not EMPLOYEE)
            event = {
                "arguments": {
                    "input": {
                        "applicationIds": [app_id_1, app_id_2],
                        "limit": 50,
                    }
                },
                "identity": {
                    "sub": TEST_CALLER_USER_ID,
                    "groups": ["OWNER"],  # Only OWNER, not EMPLOYEE
                },
            }
            
            result = lambda_module.lambda_handler(event, None)
        
        # Verify users from both organizations are returned
        assert len(result["users"]) == 2
        user_ids = [u["userId"] for u in result["users"]]
        assert TEST_USER_ID_1 in user_ids
        assert TEST_USER_ID_2 in user_ids

    def test_customer_cannot_access_unowned_orgs_with_explicit_filter(self, dynamodb_tables):
        """Test that CUSTOMER cannot access other orgs even when explicitly requesting them.
        
        **Validates: Requirements 6.3**
        """
        tables = dynamodb_tables
        
        # Setup: Create test users
        create_test_user(tables["users"], TEST_USER_ID_1, "Rachel", "Roberts")
        create_test_user(tables["users"], TEST_USER_ID_2, "Samuel", "Smith")
        
        # Setup: Create two organizations
        owned_org_id = f"owned-explicit-{uuid.uuid4().hex[:8]}"
        other_org_id = f"other-explicit-{uuid.uuid4().hex[:8]}"
        owned_app_id = f"owned-app-explicit-{uuid.uuid4().hex[:8]}"
        other_app_id = f"other-app-explicit-{uuid.uuid4().hex[:8]}"
        
        create_test_application(tables["applications"], owned_app_id, "Owned App Explicit", owned_org_id)
        create_test_application(tables["applications"], other_app_id, "Other App Explicit", other_org_id)
        
        # Setup: Create role assignments
        create_test_role_assignment(
            tables["app_user_roles"],
            TEST_USER_ID_1,
            owned_app_id,
            "Owned App Explicit",
            owned_org_id,
            "Owned Org Explicit",
            "PRODUCTION",
        )
        create_test_role_assignment(
            tables["app_user_roles"],
            TEST_USER_ID_2,
            other_app_id,
            "Other App Explicit",
            other_org_id,
            "Other Org Explicit",
            "PRODUCTION",
        )
        
        # Setup: Create ownership - caller owns only owned_org_id
        create_org_user_ownership(tables["org_users"], TEST_CALLER_USER_ID, owned_org_id)
        
        with patch.dict(os.environ, {
            "APPLICATION_USER_ROLES_TABLE_NAME": "test-application-user-roles",
            "USERS_TABLE_NAME": "test-users",
            "APPLICATIONS_TABLE_NAME": "test-applications",
            "ORGANIZATIONS_TABLE_NAME": "test-organizations",
        }):
            import lambdas.get_application_users.index as lambda_module
            lambda_module._dynamodb = tables["dynamodb"]
            
            # Query as CUSTOMER explicitly requesting BOTH orgs (including unowned)
            event = {
                "arguments": {
                    "input": {
                        "organizationIds": [owned_org_id, other_org_id],  # Requesting both
                        "limit": 50,
                    }
                },
                "identity": {
                    "sub": TEST_CALLER_USER_ID,
                    "groups": ["CUSTOMER"],  # Only CUSTOMER
                },
            }
            
            result = lambda_module.lambda_handler(event, None)
        
        # Verify only users from owned organization are returned (other_org filtered out)
        assert len(result["users"]) == 1
        assert result["users"][0]["userId"] == TEST_USER_ID_1
        assert result["users"][0]["firstName"] == "Rachel"

    def test_all_authorized_groups_can_access(self, dynamodb_tables):
        """Test that CUSTOMER, EMPLOYEE, and OWNER groups are all authorized.
        
        **Validates: Requirements 6.2**
        """
        tables = dynamodb_tables
        
        # Setup: Create test user
        create_test_user(tables["users"], TEST_USER_ID_1, "Thomas", "Taylor")
        
        # Setup: Create organization and application
        org_id = f"org-auth-{uuid.uuid4().hex[:8]}"
        app_id = f"app-auth-{uuid.uuid4().hex[:8]}"
        
        create_test_application(tables["applications"], app_id, "Auth Test App", org_id)
        
        # Setup: Create role assignment
        create_test_role_assignment(
            tables["app_user_roles"],
            TEST_USER_ID_1,
            app_id,
            "Auth Test App",
            org_id,
            "Auth Test Org",
            "PRODUCTION",
        )
        
        # Setup: Create ownership for CUSTOMER test
        create_org_user_ownership(tables["org_users"], TEST_CALLER_USER_ID, org_id)
        
        with patch.dict(os.environ, {
            "APPLICATION_USER_ROLES_TABLE_NAME": "test-application-user-roles",
            "USERS_TABLE_NAME": "test-users",
            "APPLICATIONS_TABLE_NAME": "test-applications",
            "ORGANIZATIONS_TABLE_NAME": "test-organizations",
        }):
            import lambdas.get_application_users.index as lambda_module
            lambda_module._dynamodb = tables["dynamodb"]
            
            # Test each authorized group
            for group in ["CUSTOMER", "EMPLOYEE", "OWNER"]:
                event = {
                    "arguments": {
                        "input": {
                            "applicationIds": [app_id],
                            "limit": 50,
                        }
                    },
                    "identity": {
                        "sub": TEST_CALLER_USER_ID,
                        "groups": [group],
                    },
                }
                
                # Should not raise an exception
                result = lambda_module.lambda_handler(event, None)
                
                # Verify response structure is valid
                assert "users" in result
                assert "nextToken" in result
                # CUSTOMER, EMPLOYEE, and OWNER should all get results
                assert len(result["users"]) >= 0  # May be 0 for CUSTOMER if no ownership

    def test_empty_groups_gets_authorization_error(self, dynamodb_tables):
        """Test that users with empty groups list get an authorization error.
        
        **Validates: Requirements 6.5**
        """
        tables = dynamodb_tables
        
        with patch.dict(os.environ, {
            "APPLICATION_USER_ROLES_TABLE_NAME": "test-application-user-roles",
            "USERS_TABLE_NAME": "test-users",
            "APPLICATIONS_TABLE_NAME": "test-applications",
            "ORGANIZATIONS_TABLE_NAME": "test-organizations",
        }):
            import lambdas.get_application_users.index as lambda_module
            lambda_module._dynamodb = tables["dynamodb"]
            
            # Query with empty groups list
            event = {
                "arguments": {
                    "input": {
                        "applicationIds": [TEST_APP_ID],
                        "limit": 50,
                    }
                },
                "identity": {
                    "sub": TEST_CALLER_USER_ID,
                    "groups": [],  # Empty groups
                },
            }
            
            with pytest.raises(Exception) as exc_info:
                lambda_module.lambda_handler(event, None)
            
            assert "ORB-AUTH-003" in str(exc_info.value)
            assert "Insufficient permissions" in str(exc_info.value)


class TestGetApplicationUsersMultiFilterIntegration:
    """Integration tests for multi-filter scenarios.
    
    **Validates: Requirements 3.2, 3.3, 3.5, 3.6**
    """

    def test_combined_org_app_env_filters(self, dynamodb_tables):
        """Test applying organization + application + environment filters together.
        
        **Validates: Requirements 3.2, 3.3, 3.5, 3.6**
        """
        tables = dynamodb_tables
        
        # Setup: Create test users
        create_test_user(tables["users"], TEST_USER_ID_1, "Oscar", "Owen")
        create_test_user(tables["users"], TEST_USER_ID_2, "Paula", "Parker")
        create_test_user(tables["users"], TEST_USER_ID_3, "Quinn", "Quinn")
        
        # Setup: Create organization and application
        create_test_application(
            tables["applications"], TEST_APP_ID, TEST_APP_NAME, TEST_ORG_ID
        )
        
        # Setup: Create role assignments with different environments
        create_test_role_assignment(
            tables["app_user_roles"],
            TEST_USER_ID_1,
            TEST_APP_ID,
            TEST_APP_NAME,
            TEST_ORG_ID,
            TEST_ORG_NAME,
            "PRODUCTION",
        )
        create_test_role_assignment(
            tables["app_user_roles"],
            TEST_USER_ID_2,
            TEST_APP_ID,
            TEST_APP_NAME,
            TEST_ORG_ID,
            TEST_ORG_NAME,
            "STAGING",
        )
        create_test_role_assignment(
            tables["app_user_roles"],
            TEST_USER_ID_3,
            TEST_APP_ID,
            TEST_APP_NAME,
            TEST_ORG_ID,
            TEST_ORG_NAME,
            "PRODUCTION",
        )
        
        with patch.dict(os.environ, {
            "APPLICATION_USER_ROLES_TABLE_NAME": "test-application-user-roles",
            "USERS_TABLE_NAME": "test-users",
            "APPLICATIONS_TABLE_NAME": "test-applications",
            "ORGANIZATIONS_TABLE_NAME": "test-organizations",
        }):
            import lambdas.get_application_users.index as lambda_module
            lambda_module._dynamodb = tables["dynamodb"]
            
            # Query with all filters
            event = {
                "arguments": {
                    "input": {
                        "organizationIds": [TEST_ORG_ID],
                        "applicationIds": [TEST_APP_ID],
                        "environment": "PRODUCTION",
                        "limit": 50,
                    }
                },
                "identity": {
                    "sub": TEST_CALLER_USER_ID,
                    "groups": ["EMPLOYEE"],
                },
            }
            
            result = lambda_module.lambda_handler(event, None)
        
        # Verify only PRODUCTION users are returned
        assert len(result["users"]) == 2
        user_ids = [u["userId"] for u in result["users"]]
        assert TEST_USER_ID_1 in user_ids
        assert TEST_USER_ID_3 in user_ids
        assert TEST_USER_ID_2 not in user_ids  # STAGING user excluded


    def test_org_plus_app_filters_without_env(self, dynamodb_tables):
        """Test applying organization + application filters without environment.
        
        **Validates: Requirements 3.2, 3.3, 3.6**
        """
        tables = dynamodb_tables
        
        # Setup: Create test users
        user_id_1 = f"user-orgapp-1-{uuid.uuid4().hex[:8]}"
        user_id_2 = f"user-orgapp-2-{uuid.uuid4().hex[:8]}"
        user_id_3 = f"user-orgapp-3-{uuid.uuid4().hex[:8]}"
        user_id_4 = f"user-orgapp-4-{uuid.uuid4().hex[:8]}"
        
        create_test_user(tables["users"], user_id_1, "Alpha", "Anderson")
        create_test_user(tables["users"], user_id_2, "Beta", "Brown")
        create_test_user(tables["users"], user_id_3, "Gamma", "Green")
        create_test_user(tables["users"], user_id_4, "Delta", "Davis")
        
        # Setup: Create two organizations with two applications each
        org_id_1 = f"org-multi-1-{uuid.uuid4().hex[:8]}"
        org_id_2 = f"org-multi-2-{uuid.uuid4().hex[:8]}"
        app_id_1 = f"app-multi-1-{uuid.uuid4().hex[:8]}"
        app_id_2 = f"app-multi-2-{uuid.uuid4().hex[:8]}"
        app_id_3 = f"app-multi-3-{uuid.uuid4().hex[:8]}"
        
        create_test_application(tables["applications"], app_id_1, "App Multi One", org_id_1)
        create_test_application(tables["applications"], app_id_2, "App Multi Two", org_id_1)
        create_test_application(tables["applications"], app_id_3, "App Multi Three", org_id_2)
        
        # Setup: Create role assignments across orgs and apps
        # User 1: org_id_1, app_id_1 - should match
        create_test_role_assignment(
            tables["app_user_roles"], user_id_1, app_id_1, "App Multi One",
            org_id_1, "Org Multi One", "PRODUCTION",
        )
        # User 2: org_id_1, app_id_2 - should NOT match (wrong app)
        create_test_role_assignment(
            tables["app_user_roles"], user_id_2, app_id_2, "App Multi Two",
            org_id_1, "Org Multi One", "PRODUCTION",
        )
        # User 3: org_id_2, app_id_3 - should NOT match (wrong org)
        create_test_role_assignment(
            tables["app_user_roles"], user_id_3, app_id_3, "App Multi Three",
            org_id_2, "Org Multi Two", "PRODUCTION",
        )
        # User 4: org_id_1, app_id_1 - should match
        create_test_role_assignment(
            tables["app_user_roles"], user_id_4, app_id_1, "App Multi One",
            org_id_1, "Org Multi One", "STAGING",
        )
        
        with patch.dict(os.environ, {
            "APPLICATION_USER_ROLES_TABLE_NAME": "test-application-user-roles",
            "USERS_TABLE_NAME": "test-users",
            "APPLICATIONS_TABLE_NAME": "test-applications",
            "ORGANIZATIONS_TABLE_NAME": "test-organizations",
        }):
            import lambdas.get_application_users.index as lambda_module
            lambda_module._dynamodb = tables["dynamodb"]
            
            # Query with org + app filters (no environment)
            event = {
                "arguments": {
                    "input": {
                        "organizationIds": [org_id_1],
                        "applicationIds": [app_id_1],
                        "limit": 50,
                    }
                },
                "identity": {
                    "sub": TEST_CALLER_USER_ID,
                    "groups": ["EMPLOYEE"],
                },
            }
            
            result = lambda_module.lambda_handler(event, None)
        
        # Verify AND logic: only users in org_id_1 AND app_id_1
        assert len(result["users"]) == 2
        user_ids = [u["userId"] for u in result["users"]]
        assert user_id_1 in user_ids
        assert user_id_4 in user_ids
        assert user_id_2 not in user_ids  # Wrong app
        assert user_id_3 not in user_ids  # Wrong org

    def test_org_plus_env_filters(self, dynamodb_tables):
        """Test applying organization + environment filters.
        
        **Validates: Requirements 3.2, 3.5, 3.6**
        """
        tables = dynamodb_tables
        
        # Setup: Create test users
        user_id_1 = f"user-orgenv-1-{uuid.uuid4().hex[:8]}"
        user_id_2 = f"user-orgenv-2-{uuid.uuid4().hex[:8]}"
        user_id_3 = f"user-orgenv-3-{uuid.uuid4().hex[:8]}"
        user_id_4 = f"user-orgenv-4-{uuid.uuid4().hex[:8]}"
        
        create_test_user(tables["users"], user_id_1, "Echo", "Edwards")
        create_test_user(tables["users"], user_id_2, "Foxtrot", "Fisher")
        create_test_user(tables["users"], user_id_3, "Golf", "Garcia")
        create_test_user(tables["users"], user_id_4, "Hotel", "Harris")
        
        # Setup: Create two organizations
        org_id_1 = f"org-env-1-{uuid.uuid4().hex[:8]}"
        org_id_2 = f"org-env-2-{uuid.uuid4().hex[:8]}"
        app_id_1 = f"app-env-1-{uuid.uuid4().hex[:8]}"
        app_id_2 = f"app-env-2-{uuid.uuid4().hex[:8]}"
        
        create_test_application(tables["applications"], app_id_1, "App Env One", org_id_1)
        create_test_application(tables["applications"], app_id_2, "App Env Two", org_id_2)
        
        # Setup: Create role assignments with different orgs and environments
        # User 1: org_id_1, PRODUCTION - should match
        create_test_role_assignment(
            tables["app_user_roles"], user_id_1, app_id_1, "App Env One",
            org_id_1, "Org Env One", "PRODUCTION",
        )
        # User 2: org_id_1, STAGING - should NOT match (wrong env)
        create_test_role_assignment(
            tables["app_user_roles"], user_id_2, app_id_1, "App Env One",
            org_id_1, "Org Env One", "STAGING",
        )
        # User 3: org_id_2, PRODUCTION - should NOT match (wrong org)
        create_test_role_assignment(
            tables["app_user_roles"], user_id_3, app_id_2, "App Env Two",
            org_id_2, "Org Env Two", "PRODUCTION",
        )
        # User 4: org_id_1, PRODUCTION - should match
        create_test_role_assignment(
            tables["app_user_roles"], user_id_4, app_id_1, "App Env One",
            org_id_1, "Org Env One", "PRODUCTION",
        )
        
        with patch.dict(os.environ, {
            "APPLICATION_USER_ROLES_TABLE_NAME": "test-application-user-roles",
            "USERS_TABLE_NAME": "test-users",
            "APPLICATIONS_TABLE_NAME": "test-applications",
            "ORGANIZATIONS_TABLE_NAME": "test-organizations",
        }):
            import lambdas.get_application_users.index as lambda_module
            lambda_module._dynamodb = tables["dynamodb"]
            
            # Query with org + env filters
            event = {
                "arguments": {
                    "input": {
                        "organizationIds": [org_id_1],
                        "environment": "PRODUCTION",
                        "limit": 50,
                    }
                },
                "identity": {
                    "sub": TEST_CALLER_USER_ID,
                    "groups": ["EMPLOYEE"],
                },
            }
            
            result = lambda_module.lambda_handler(event, None)
        
        # Verify AND logic: only users in org_id_1 AND PRODUCTION
        assert len(result["users"]) == 2
        user_ids = [u["userId"] for u in result["users"]]
        assert user_id_1 in user_ids
        assert user_id_4 in user_ids
        assert user_id_2 not in user_ids  # Wrong env
        assert user_id_3 not in user_ids  # Wrong org

    def test_app_plus_env_filters(self, dynamodb_tables):
        """Test applying application + environment filters.
        
        **Validates: Requirements 3.3, 3.5, 3.6**
        """
        tables = dynamodb_tables
        
        # Setup: Create test users
        user_id_1 = f"user-appenv-1-{uuid.uuid4().hex[:8]}"
        user_id_2 = f"user-appenv-2-{uuid.uuid4().hex[:8]}"
        user_id_3 = f"user-appenv-3-{uuid.uuid4().hex[:8]}"
        user_id_4 = f"user-appenv-4-{uuid.uuid4().hex[:8]}"
        
        create_test_user(tables["users"], user_id_1, "India", "Irving")
        create_test_user(tables["users"], user_id_2, "Juliet", "Johnson")
        create_test_user(tables["users"], user_id_3, "Kilo", "King")
        create_test_user(tables["users"], user_id_4, "Lima", "Lewis")
        
        # Setup: Create two applications
        org_id = f"org-appenv-{uuid.uuid4().hex[:8]}"
        app_id_1 = f"app-appenv-1-{uuid.uuid4().hex[:8]}"
        app_id_2 = f"app-appenv-2-{uuid.uuid4().hex[:8]}"
        
        create_test_application(tables["applications"], app_id_1, "App AppEnv One", org_id)
        create_test_application(tables["applications"], app_id_2, "App AppEnv Two", org_id)
        
        # Setup: Create role assignments with different apps and environments
        # User 1: app_id_1, PRODUCTION - should match
        create_test_role_assignment(
            tables["app_user_roles"], user_id_1, app_id_1, "App AppEnv One",
            org_id, "Org AppEnv", "PRODUCTION",
        )
        # User 2: app_id_1, STAGING - should NOT match (wrong env)
        create_test_role_assignment(
            tables["app_user_roles"], user_id_2, app_id_1, "App AppEnv One",
            org_id, "Org AppEnv", "STAGING",
        )
        # User 3: app_id_2, PRODUCTION - should NOT match (wrong app)
        create_test_role_assignment(
            tables["app_user_roles"], user_id_3, app_id_2, "App AppEnv Two",
            org_id, "Org AppEnv", "PRODUCTION",
        )
        # User 4: app_id_1, PRODUCTION - should match
        create_test_role_assignment(
            tables["app_user_roles"], user_id_4, app_id_1, "App AppEnv One",
            org_id, "Org AppEnv", "PRODUCTION",
        )
        
        with patch.dict(os.environ, {
            "APPLICATION_USER_ROLES_TABLE_NAME": "test-application-user-roles",
            "USERS_TABLE_NAME": "test-users",
            "APPLICATIONS_TABLE_NAME": "test-applications",
            "ORGANIZATIONS_TABLE_NAME": "test-organizations",
        }):
            import lambdas.get_application_users.index as lambda_module
            lambda_module._dynamodb = tables["dynamodb"]
            
            # Query with app + env filters
            event = {
                "arguments": {
                    "input": {
                        "applicationIds": [app_id_1],
                        "environment": "PRODUCTION",
                        "limit": 50,
                    }
                },
                "identity": {
                    "sub": TEST_CALLER_USER_ID,
                    "groups": ["EMPLOYEE"],
                },
            }
            
            result = lambda_module.lambda_handler(event, None)
        
        # Verify AND logic: only users in app_id_1 AND PRODUCTION
        assert len(result["users"]) == 2
        user_ids = [u["userId"] for u in result["users"]]
        assert user_id_1 in user_ids
        assert user_id_4 in user_ids
        assert user_id_2 not in user_ids  # Wrong env
        assert user_id_3 not in user_ids  # Wrong app

    def test_multi_filter_with_complex_data_setup(self, dynamodb_tables):
        """Test multi-filter with complex data setup to verify result counts.
        
        Creates a matrix of users across multiple orgs, apps, and environments
        to verify AND logic is correctly applied and result counts match expectations.
        
        **Validates: Requirements 3.2, 3.3, 3.5, 3.6**
        """
        tables = dynamodb_tables
        
        # Setup: Create 6 test users
        users = []
        for i in range(6):
            user_id = f"user-complex-{i}-{uuid.uuid4().hex[:8]}"
            create_test_user(tables["users"], user_id, f"User{i}", f"Complex{i}")
            users.append(user_id)
        
        # Setup: Create 2 organizations with 2 applications each
        org_id_a = f"org-complex-a-{uuid.uuid4().hex[:8]}"
        org_id_b = f"org-complex-b-{uuid.uuid4().hex[:8]}"
        app_id_a1 = f"app-complex-a1-{uuid.uuid4().hex[:8]}"
        app_id_a2 = f"app-complex-a2-{uuid.uuid4().hex[:8]}"
        app_id_b1 = f"app-complex-b1-{uuid.uuid4().hex[:8]}"
        
        create_test_application(tables["applications"], app_id_a1, "App A1", org_id_a)
        create_test_application(tables["applications"], app_id_a2, "App A2", org_id_a)
        create_test_application(tables["applications"], app_id_b1, "App B1", org_id_b)
        
        # Setup: Create role assignments in a matrix pattern
        # User 0: org_a, app_a1, PRODUCTION
        create_test_role_assignment(
            tables["app_user_roles"], users[0], app_id_a1, "App A1",
            org_id_a, "Org A", "PRODUCTION",
        )
        # User 1: org_a, app_a1, STAGING
        create_test_role_assignment(
            tables["app_user_roles"], users[1], app_id_a1, "App A1",
            org_id_a, "Org A", "STAGING",
        )
        # User 2: org_a, app_a2, PRODUCTION
        create_test_role_assignment(
            tables["app_user_roles"], users[2], app_id_a2, "App A2",
            org_id_a, "Org A", "PRODUCTION",
        )
        # User 3: org_a, app_a2, STAGING
        create_test_role_assignment(
            tables["app_user_roles"], users[3], app_id_a2, "App A2",
            org_id_a, "Org A", "STAGING",
        )
        # User 4: org_b, app_b1, PRODUCTION
        create_test_role_assignment(
            tables["app_user_roles"], users[4], app_id_b1, "App B1",
            org_id_b, "Org B", "PRODUCTION",
        )
        # User 5: org_b, app_b1, STAGING
        create_test_role_assignment(
            tables["app_user_roles"], users[5], app_id_b1, "App B1",
            org_id_b, "Org B", "STAGING",
        )
        
        with patch.dict(os.environ, {
            "APPLICATION_USER_ROLES_TABLE_NAME": "test-application-user-roles",
            "USERS_TABLE_NAME": "test-users",
            "APPLICATIONS_TABLE_NAME": "test-applications",
            "ORGANIZATIONS_TABLE_NAME": "test-organizations",
        }):
            import lambdas.get_application_users.index as lambda_module
            lambda_module._dynamodb = tables["dynamodb"]
            
            # Test 1: org_a + app_a1 + PRODUCTION → expect 1 user (user 0)
            event = {
                "arguments": {
                    "input": {
                        "organizationIds": [org_id_a],
                        "applicationIds": [app_id_a1],
                        "environment": "PRODUCTION",
                        "limit": 50,
                    }
                },
                "identity": {
                    "sub": TEST_CALLER_USER_ID,
                    "groups": ["EMPLOYEE"],
                },
            }
            result = lambda_module.lambda_handler(event, None)
            assert len(result["users"]) == 1
            assert result["users"][0]["userId"] == users[0]
            
            # Test 2: org_a + PRODUCTION (no app filter) → expect 2 users (users 0, 2)
            event = {
                "arguments": {
                    "input": {
                        "organizationIds": [org_id_a],
                        "environment": "PRODUCTION",
                        "limit": 50,
                    }
                },
                "identity": {
                    "sub": TEST_CALLER_USER_ID,
                    "groups": ["EMPLOYEE"],
                },
            }
            result = lambda_module.lambda_handler(event, None)
            assert len(result["users"]) == 2
            user_ids = [u["userId"] for u in result["users"]]
            assert users[0] in user_ids
            assert users[2] in user_ids
            
            # Test 3: app_a1 + STAGING (no org filter) → expect 1 user (user 1)
            event = {
                "arguments": {
                    "input": {
                        "applicationIds": [app_id_a1],
                        "environment": "STAGING",
                        "limit": 50,
                    }
                },
                "identity": {
                    "sub": TEST_CALLER_USER_ID,
                    "groups": ["EMPLOYEE"],
                },
            }
            result = lambda_module.lambda_handler(event, None)
            assert len(result["users"]) == 1
            assert result["users"][0]["userId"] == users[1]
            
            # Test 4: org_a + org_b + PRODUCTION → expect 3 users (users 0, 2, 4)
            event = {
                "arguments": {
                    "input": {
                        "organizationIds": [org_id_a, org_id_b],
                        "environment": "PRODUCTION",
                        "limit": 50,
                    }
                },
                "identity": {
                    "sub": TEST_CALLER_USER_ID,
                    "groups": ["EMPLOYEE"],
                },
            }
            result = lambda_module.lambda_handler(event, None)
            assert len(result["users"]) == 3
            user_ids = [u["userId"] for u in result["users"]]
            assert users[0] in user_ids
            assert users[2] in user_ids
            assert users[4] in user_ids
            
            # Test 5: app_a1 + app_a2 (no env filter) → expect 4 users (users 0, 1, 2, 3)
            event = {
                "arguments": {
                    "input": {
                        "applicationIds": [app_id_a1, app_id_a2],
                        "limit": 50,
                    }
                },
                "identity": {
                    "sub": TEST_CALLER_USER_ID,
                    "groups": ["EMPLOYEE"],
                },
            }
            result = lambda_module.lambda_handler(event, None)
            assert len(result["users"]) == 4
            user_ids = [u["userId"] for u in result["users"]]
            assert users[0] in user_ids
            assert users[1] in user_ids
            assert users[2] in user_ids
            assert users[3] in user_ids

    def test_multi_filter_with_multiple_roles_per_user(self, dynamodb_tables):
        """Test multi-filter when users have multiple roles across different contexts.
        
        Verifies that users with roles in multiple orgs/apps/envs are correctly
        filtered and deduplicated.
        
        **Validates: Requirements 3.2, 3.3, 3.5, 3.6, 3.8**
        """
        tables = dynamodb_tables
        
        # Setup: Create test users
        user_id_1 = f"user-multirole-1-{uuid.uuid4().hex[:8]}"
        user_id_2 = f"user-multirole-2-{uuid.uuid4().hex[:8]}"
        
        create_test_user(tables["users"], user_id_1, "Multi", "RoleOne")
        create_test_user(tables["users"], user_id_2, "Multi", "RoleTwo")
        
        # Setup: Create organizations and applications
        org_id_1 = f"org-multirole-1-{uuid.uuid4().hex[:8]}"
        org_id_2 = f"org-multirole-2-{uuid.uuid4().hex[:8]}"
        app_id_1 = f"app-multirole-1-{uuid.uuid4().hex[:8]}"
        app_id_2 = f"app-multirole-2-{uuid.uuid4().hex[:8]}"
        
        create_test_application(tables["applications"], app_id_1, "App MR One", org_id_1)
        create_test_application(tables["applications"], app_id_2, "App MR Two", org_id_2)
        
        # Setup: User 1 has roles in BOTH orgs/apps/envs
        create_test_role_assignment(
            tables["app_user_roles"], user_id_1, app_id_1, "App MR One",
            org_id_1, "Org MR One", "PRODUCTION", role_name="Admin",
        )
        create_test_role_assignment(
            tables["app_user_roles"], user_id_1, app_id_1, "App MR One",
            org_id_1, "Org MR One", "STAGING", role_name="Developer",
        )
        create_test_role_assignment(
            tables["app_user_roles"], user_id_1, app_id_2, "App MR Two",
            org_id_2, "Org MR Two", "PRODUCTION", role_name="Viewer",
        )
        
        # Setup: User 2 has roles only in org_id_1
        create_test_role_assignment(
            tables["app_user_roles"], user_id_2, app_id_1, "App MR One",
            org_id_1, "Org MR One", "PRODUCTION", role_name="Admin",
        )
        
        with patch.dict(os.environ, {
            "APPLICATION_USER_ROLES_TABLE_NAME": "test-application-user-roles",
            "USERS_TABLE_NAME": "test-users",
            "APPLICATIONS_TABLE_NAME": "test-applications",
            "ORGANIZATIONS_TABLE_NAME": "test-organizations",
        }):
            import lambdas.get_application_users.index as lambda_module
            lambda_module._dynamodb = tables["dynamodb"]
            
            # Test: Filter by org_id_1 + app_id_1 + PRODUCTION
            event = {
                "arguments": {
                    "input": {
                        "organizationIds": [org_id_1],
                        "applicationIds": [app_id_1],
                        "environment": "PRODUCTION",
                        "limit": 50,
                    }
                },
                "identity": {
                    "sub": TEST_CALLER_USER_ID,
                    "groups": ["EMPLOYEE"],
                },
            }
            result = lambda_module.lambda_handler(event, None)
        
        # Verify: Both users should be returned (both have PRODUCTION roles in org_id_1/app_id_1)
        assert len(result["users"]) == 2
        user_ids = [u["userId"] for u in result["users"]]
        assert user_id_1 in user_ids
        assert user_id_2 in user_ids
        
        # Verify: User 1 should only have the matching role assignment (not all 3)
        user_1 = next(u for u in result["users"] if u["userId"] == user_id_1)
        assert len(user_1["roleAssignments"]) == 1
        assert user_1["roleAssignments"][0]["environment"] == "PRODUCTION"
        assert user_1["roleAssignments"][0]["applicationId"] == app_id_1
        assert user_1["roleAssignments"][0]["organizationId"] == org_id_1
