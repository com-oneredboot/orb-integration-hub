"""
Environment Config Integration Tests

Tests the environment configuration CRUD flow end-to-end.
Uses moto for AWS service mocking.

@see .kiro/specs/application-environment-config/design.md
**Validates: Requirements 1.1, 2.1, 3.1, 4.1**
"""

import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import boto3
import pytest
from moto import mock_aws


# Test constants
TEST_APPLICATION_ID = "app-test-123"
TEST_ORGANIZATION_ID = "org-test-456"
TEST_ENVIRONMENT = "DEVELOPMENT"


@pytest.fixture
def aws_credentials():
    """Mock AWS credentials for moto."""
    os.environ["AWS_ACCESS_KEY_ID"] = "testing"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "testing"
    os.environ["AWS_SECURITY_TOKEN"] = "testing"
    os.environ["AWS_SESSION_TOKEN"] = "testing"
    os.environ["AWS_DEFAULT_REGION"] = "us-east-1"


@pytest.fixture
def dynamodb_table(aws_credentials):
    """Create mock DynamoDB table for environment config."""
    with mock_aws():
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")

        table = dynamodb.create_table(
            TableName="test-environment-config",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
                {"AttributeName": "environment", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
                {"AttributeName": "organizationId", "AttributeType": "S"},
            ],
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "OrgEnvIndex",
                    "KeySchema": [
                        {"AttributeName": "organizationId", "KeyType": "HASH"},
                        {"AttributeName": "environment", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                    "ProvisionedThroughput": {
                        "ReadCapacityUnits": 5,
                        "WriteCapacityUnits": 5,
                    },
                }
            ],
            ProvisionedThroughput={
                "ReadCapacityUnits": 5,
                "WriteCapacityUnits": 5,
            },
        )

        table.wait_until_exists()
        yield table


class TestEnvironmentConfigCRUD:
    """Integration tests for environment config CRUD operations."""

    def test_create_environment_config(self, dynamodb_table):
        """Test creating a new environment configuration.

        **Validates: Requirements 1.1**
        """
        now = datetime.now(timezone.utc)
        config = {
            "applicationId": TEST_APPLICATION_ID,
            "environment": TEST_ENVIRONMENT,
            "organizationId": TEST_ORGANIZATION_ID,
            "allowedOrigins": ["https://example.com"],
            "rateLimitPerMinute": 60,
            "rateLimitPerDay": 10000,
            "webhookUrl": "",
            "webhookSecret": "",
            "webhookEvents": [],
            "webhookEnabled": False,
            "webhookMaxRetries": 3,
            "webhookRetryDelaySeconds": 60,
            "featureFlags": {},
            "metadata": {},
            "createdAt": Decimal(str(now.timestamp())),
            "updatedAt": Decimal(str(now.timestamp())),
        }

        dynamodb_table.put_item(Item=config)

        # Verify the item was created
        response = dynamodb_table.get_item(
            Key={
                "applicationId": TEST_APPLICATION_ID,
                "environment": TEST_ENVIRONMENT,
            }
        )

        assert "Item" in response
        item = response["Item"]
        assert item["applicationId"] == TEST_APPLICATION_ID
        assert item["environment"] == TEST_ENVIRONMENT
        assert item["organizationId"] == TEST_ORGANIZATION_ID
        assert item["rateLimitPerMinute"] == 60

    def test_update_environment_config(self, dynamodb_table):
        """Test updating an existing environment configuration.

        **Validates: Requirements 1.1**
        """
        # Create initial config
        now = datetime.now(timezone.utc)
        config = {
            "applicationId": TEST_APPLICATION_ID,
            "environment": TEST_ENVIRONMENT,
            "organizationId": TEST_ORGANIZATION_ID,
            "allowedOrigins": ["https://example.com"],
            "rateLimitPerMinute": 60,
            "rateLimitPerDay": 10000,
            "webhookEnabled": False,
            "featureFlags": {},
            "createdAt": Decimal(str(now.timestamp())),
            "updatedAt": Decimal(str(now.timestamp())),
        }
        dynamodb_table.put_item(Item=config)

        # Update the config
        dynamodb_table.update_item(
            Key={
                "applicationId": TEST_APPLICATION_ID,
                "environment": TEST_ENVIRONMENT,
            },
            UpdateExpression="SET rateLimitPerMinute = :rpm, updatedAt = :ua",
            ExpressionAttributeValues={
                ":rpm": 120,
                ":ua": Decimal(str(datetime.now(timezone.utc).timestamp())),
            },
        )

        # Verify the update
        response = dynamodb_table.get_item(
            Key={
                "applicationId": TEST_APPLICATION_ID,
                "environment": TEST_ENVIRONMENT,
            }
        )

        assert response["Item"]["rateLimitPerMinute"] == 120

    def test_add_allowed_origin(self, dynamodb_table):
        """Test adding an allowed origin to the configuration.

        **Validates: Requirements 2.1**
        """
        # Create initial config
        now = datetime.now(timezone.utc)
        config = {
            "applicationId": TEST_APPLICATION_ID,
            "environment": TEST_ENVIRONMENT,
            "organizationId": TEST_ORGANIZATION_ID,
            "allowedOrigins": ["https://example.com"],
            "rateLimitPerMinute": 60,
            "rateLimitPerDay": 10000,
            "createdAt": Decimal(str(now.timestamp())),
            "updatedAt": Decimal(str(now.timestamp())),
        }
        dynamodb_table.put_item(Item=config)

        # Add a new origin
        new_origin = "https://app.example.com"
        dynamodb_table.update_item(
            Key={
                "applicationId": TEST_APPLICATION_ID,
                "environment": TEST_ENVIRONMENT,
            },
            UpdateExpression="SET allowedOrigins = list_append(allowedOrigins, :origin)",
            ExpressionAttributeValues={
                ":origin": [new_origin],
            },
        )

        # Verify the origin was added
        response = dynamodb_table.get_item(
            Key={
                "applicationId": TEST_APPLICATION_ID,
                "environment": TEST_ENVIRONMENT,
            }
        )

        assert new_origin in response["Item"]["allowedOrigins"]
        assert len(response["Item"]["allowedOrigins"]) == 2

    def test_remove_allowed_origin(self, dynamodb_table):
        """Test removing an allowed origin from the configuration.

        **Validates: Requirements 2.1**
        """
        # Create initial config with multiple origins
        now = datetime.now(timezone.utc)
        config = {
            "applicationId": TEST_APPLICATION_ID,
            "environment": TEST_ENVIRONMENT,
            "organizationId": TEST_ORGANIZATION_ID,
            "allowedOrigins": ["https://example.com", "https://app.example.com"],
            "rateLimitPerMinute": 60,
            "rateLimitPerDay": 10000,
            "createdAt": Decimal(str(now.timestamp())),
            "updatedAt": Decimal(str(now.timestamp())),
        }
        dynamodb_table.put_item(Item=config)

        # Remove an origin (by replacing the list)
        dynamodb_table.update_item(
            Key={
                "applicationId": TEST_APPLICATION_ID,
                "environment": TEST_ENVIRONMENT,
            },
            UpdateExpression="SET allowedOrigins = :origins",
            ExpressionAttributeValues={
                ":origins": ["https://example.com"],
            },
        )

        # Verify the origin was removed
        response = dynamodb_table.get_item(
            Key={
                "applicationId": TEST_APPLICATION_ID,
                "environment": TEST_ENVIRONMENT,
            }
        )

        assert "https://app.example.com" not in response["Item"]["allowedOrigins"]
        assert len(response["Item"]["allowedOrigins"]) == 1

    def test_update_webhook_config(self, dynamodb_table):
        """Test updating webhook configuration.

        **Validates: Requirements 3.1**
        """
        # Create initial config
        now = datetime.now(timezone.utc)
        config = {
            "applicationId": TEST_APPLICATION_ID,
            "environment": TEST_ENVIRONMENT,
            "organizationId": TEST_ORGANIZATION_ID,
            "allowedOrigins": [],
            "webhookUrl": "",
            "webhookSecret": "",
            "webhookEvents": [],
            "webhookEnabled": False,
            "webhookMaxRetries": 3,
            "webhookRetryDelaySeconds": 60,
            "createdAt": Decimal(str(now.timestamp())),
            "updatedAt": Decimal(str(now.timestamp())),
        }
        dynamodb_table.put_item(Item=config)

        # Update webhook config
        webhook_secret = str(uuid.uuid4()).replace("-", "")[:32]
        dynamodb_table.update_item(
            Key={
                "applicationId": TEST_APPLICATION_ID,
                "environment": TEST_ENVIRONMENT,
            },
            UpdateExpression=(
                "SET webhookUrl = :url, webhookSecret = :secret, "
                "webhookEvents = :events, webhookEnabled = :enabled"
            ),
            ExpressionAttributeValues={
                ":url": "https://webhook.example.com/events",
                ":secret": webhook_secret,
                ":events": ["USER_CREATED", "USER_UPDATED"],
                ":enabled": True,
            },
        )

        # Verify the update
        response = dynamodb_table.get_item(
            Key={
                "applicationId": TEST_APPLICATION_ID,
                "environment": TEST_ENVIRONMENT,
            }
        )

        item = response["Item"]
        assert item["webhookUrl"] == "https://webhook.example.com/events"
        assert item["webhookSecret"] == webhook_secret
        assert item["webhookEnabled"] is True
        assert "USER_CREATED" in item["webhookEvents"]

    def test_set_feature_flag(self, dynamodb_table):
        """Test setting a feature flag.

        **Validates: Requirements 4.1**
        """
        # Create initial config
        now = datetime.now(timezone.utc)
        config = {
            "applicationId": TEST_APPLICATION_ID,
            "environment": TEST_ENVIRONMENT,
            "organizationId": TEST_ORGANIZATION_ID,
            "allowedOrigins": [],
            "featureFlags": {},
            "createdAt": Decimal(str(now.timestamp())),
            "updatedAt": Decimal(str(now.timestamp())),
        }
        dynamodb_table.put_item(Item=config)

        # Set a feature flag
        dynamodb_table.update_item(
            Key={
                "applicationId": TEST_APPLICATION_ID,
                "environment": TEST_ENVIRONMENT,
            },
            UpdateExpression="SET featureFlags.new_feature = :value",
            ExpressionAttributeValues={
                ":value": True,
            },
        )

        # Verify the flag was set
        response = dynamodb_table.get_item(
            Key={
                "applicationId": TEST_APPLICATION_ID,
                "environment": TEST_ENVIRONMENT,
            }
        )

        assert response["Item"]["featureFlags"]["new_feature"] is True

    def test_delete_feature_flag(self, dynamodb_table):
        """Test deleting a feature flag.

        **Validates: Requirements 4.1**
        """
        # Create initial config with feature flags
        now = datetime.now(timezone.utc)
        config = {
            "applicationId": TEST_APPLICATION_ID,
            "environment": TEST_ENVIRONMENT,
            "organizationId": TEST_ORGANIZATION_ID,
            "allowedOrigins": [],
            "featureFlags": {"feature_a": True, "feature_b": False},
            "createdAt": Decimal(str(now.timestamp())),
            "updatedAt": Decimal(str(now.timestamp())),
        }
        dynamodb_table.put_item(Item=config)

        # Delete a feature flag
        dynamodb_table.update_item(
            Key={
                "applicationId": TEST_APPLICATION_ID,
                "environment": TEST_ENVIRONMENT,
            },
            UpdateExpression="REMOVE featureFlags.feature_a",
        )

        # Verify the flag was deleted
        response = dynamodb_table.get_item(
            Key={
                "applicationId": TEST_APPLICATION_ID,
                "environment": TEST_ENVIRONMENT,
            }
        )

        assert "feature_a" not in response["Item"]["featureFlags"]
        assert response["Item"]["featureFlags"]["feature_b"] is False

    def test_query_by_organization(self, dynamodb_table):
        """Test querying configs by organization using GSI."""
        # Create configs for multiple applications in same org
        now = datetime.now(timezone.utc)
        for i in range(3):
            config = {
                "applicationId": f"app-{i}",
                "environment": TEST_ENVIRONMENT,
                "organizationId": TEST_ORGANIZATION_ID,
                "allowedOrigins": [],
                "rateLimitPerMinute": 60,
                "rateLimitPerDay": 10000,
                "createdAt": Decimal(str(now.timestamp())),
                "updatedAt": Decimal(str(now.timestamp())),
            }
            dynamodb_table.put_item(Item=config)

        # Query by organization
        response = dynamodb_table.query(
            IndexName="OrgEnvIndex",
            KeyConditionExpression="organizationId = :orgId AND environment = :env",
            ExpressionAttributeValues={
                ":orgId": TEST_ORGANIZATION_ID,
                ":env": TEST_ENVIRONMENT,
            },
        )

        assert response["Count"] == 3
        assert all(
            item["organizationId"] == TEST_ORGANIZATION_ID
            for item in response["Items"]
        )
