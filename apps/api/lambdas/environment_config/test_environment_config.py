# file: apps/api/lambdas/environment_config/test_environment_config.py
# author: AI Assistant
# created: 2026-02-03
# description: Unit tests for ApplicationEnvironmentConfig Lambda resolvers
# Feature: application-environment-config

"""
Unit tests for ApplicationEnvironmentConfig Lambda resolvers.

Tests cover:
- Get configuration
- Create configuration
- Update configuration
- Add/remove allowed origins
- Update webhook configuration
- Regenerate webhook secret
- Set/delete feature flags
"""

import importlib.util
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock

import boto3
from moto import mock_aws

# Get the directory containing this test file
_this_dir = Path(__file__).parent
sys.path.insert(0, str(_this_dir))

# Import from the local index.py in environment_config directory
_spec = importlib.util.spec_from_file_location("env_config_index", _this_dir / "index.py")
_env_config_index = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_env_config_index)

# Assign imports from the loaded module
index = _env_config_index
EnvironmentConfigService = _env_config_index.EnvironmentConfigService
lambda_handler = _env_config_index.lambda_handler
MAX_ALLOWED_ORIGINS = _env_config_index.MAX_ALLOWED_ORIGINS
MAX_FEATURE_FLAGS = _env_config_index.MAX_FEATURE_FLAGS
DEFAULT_RATE_LIMIT_PER_MINUTE = _env_config_index.DEFAULT_RATE_LIMIT_PER_MINUTE
DEFAULT_RATE_LIMIT_PER_DAY = _env_config_index.DEFAULT_RATE_LIMIT_PER_DAY


class TestEnvironmentConfigServiceGetConfig(unittest.TestCase):
    """Tests for get_config method."""

    def setUp(self) -> None:
        """Set up test environment."""
        self.test_context = MagicMock()
        os.environ["ENVIRONMENT_CONFIG_TABLE"] = "test-env-config-table"
        index.EnvironmentConfigService.__init__ = lambda self: None

    def tearDown(self) -> None:
        """Clean up after tests."""
        if "ENVIRONMENT_CONFIG_TABLE" in os.environ:
            del os.environ["ENVIRONMENT_CONFIG_TABLE"]

    @mock_aws
    def test_get_config_success(self) -> None:
        """Test successful config retrieval."""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-env-config-table",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
                {"AttributeName": "environment", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        table.put_item(
            Item={
                "applicationId": "app-123",
                "environment": "PRODUCTION",
                "organizationId": "org-456",
                "allowedOrigins": ["https://example.com"],
                "rateLimitPerMinute": 100,
                "rateLimitPerDay": 50000,
            }
        )

        service = EnvironmentConfigService()
        service.config_table = table

        event = {
            "arguments": {
                "applicationId": "app-123",
                "environment": "PRODUCTION",
            }
        }

        result = service.get_config(event)

        self.assertEqual(result["code"], 200)
        self.assertTrue(result["success"])
        self.assertEqual(result["item"]["applicationId"], "app-123")
        self.assertEqual(result["item"]["environment"], "PRODUCTION")

    @mock_aws
    def test_get_config_masks_webhook_secret(self) -> None:
        """Test that webhook secret is masked in response."""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-env-config-table",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
                {"AttributeName": "environment", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        table.put_item(
            Item={
                "applicationId": "app-123",
                "environment": "PRODUCTION",
                "organizationId": "org-456",
                "webhookSecret": "supersecretvalue12345678901234",
            }
        )

        service = EnvironmentConfigService()
        service.config_table = table

        event = {
            "arguments": {
                "applicationId": "app-123",
                "environment": "PRODUCTION",
            }
        }

        result = service.get_config(event)

        self.assertEqual(result["item"]["webhookSecret"], "********")

    def test_get_config_missing_application_id(self) -> None:
        """Test error when applicationId is missing."""
        service = EnvironmentConfigService()
        service.config_table = MagicMock()

        event = {"arguments": {"environment": "PRODUCTION"}}

        result = service.get_config(event)

        self.assertEqual(result["code"], 400)
        self.assertFalse(result["success"])
        self.assertIn("applicationId is required", result["message"])

    def test_get_config_missing_environment(self) -> None:
        """Test error when environment is missing."""
        service = EnvironmentConfigService()
        service.config_table = MagicMock()

        event = {"arguments": {"applicationId": "app-123"}}

        result = service.get_config(event)

        self.assertEqual(result["code"], 400)
        self.assertFalse(result["success"])
        self.assertIn("environment is required", result["message"])

    def test_get_config_invalid_environment(self) -> None:
        """Test error when environment is invalid."""
        service = EnvironmentConfigService()
        service.config_table = MagicMock()

        event = {
            "arguments": {
                "applicationId": "app-123",
                "environment": "INVALID",
            }
        }

        result = service.get_config(event)

        self.assertEqual(result["code"], 400)
        self.assertFalse(result["success"])
        self.assertIn("Invalid environment", result["message"])

    @mock_aws
    def test_get_config_not_found(self) -> None:
        """Test error when config not found."""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-env-config-table",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
                {"AttributeName": "environment", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        service = EnvironmentConfigService()
        service.config_table = table

        event = {
            "arguments": {
                "applicationId": "nonexistent",
                "environment": "PRODUCTION",
            }
        }

        result = service.get_config(event)

        self.assertEqual(result["code"], 400)
        self.assertFalse(result["success"])
        self.assertIn("No configuration found", result["message"])


class TestEnvironmentConfigServiceCreateConfig(unittest.TestCase):
    """Tests for create_config method."""

    def setUp(self) -> None:
        """Set up test environment."""
        os.environ["ENVIRONMENT_CONFIG_TABLE"] = "test-env-config-table"
        index.EnvironmentConfigService.__init__ = lambda self: None

    def tearDown(self) -> None:
        """Clean up after tests."""
        if "ENVIRONMENT_CONFIG_TABLE" in os.environ:
            del os.environ["ENVIRONMENT_CONFIG_TABLE"]

    @mock_aws
    def test_create_config_success(self) -> None:
        """Test successful config creation."""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-env-config-table",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
                {"AttributeName": "environment", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        service = EnvironmentConfigService()
        service.config_table = table

        event = {
            "arguments": {
                "input": {
                    "applicationId": "app-123",
                    "environment": "PRODUCTION",
                    "organizationId": "org-456",
                }
            }
        }

        result = service.create_config(event)

        self.assertEqual(result["code"], 200)
        self.assertTrue(result["success"])
        self.assertEqual(result["item"]["applicationId"], "app-123")
        self.assertEqual(result["item"]["rateLimitPerMinute"], DEFAULT_RATE_LIMIT_PER_MINUTE)
        self.assertEqual(result["item"]["rateLimitPerDay"], DEFAULT_RATE_LIMIT_PER_DAY)

    @mock_aws
    def test_create_config_with_custom_values(self) -> None:
        """Test config creation with custom values."""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-env-config-table",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
                {"AttributeName": "environment", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        service = EnvironmentConfigService()
        service.config_table = table

        event = {
            "arguments": {
                "input": {
                    "applicationId": "app-123",
                    "environment": "PRODUCTION",
                    "organizationId": "org-456",
                    "allowedOrigins": ["https://example.com"],
                    "rateLimitPerMinute": 200,
                    "rateLimitPerDay": 100000,
                }
            }
        }

        result = service.create_config(event)

        self.assertEqual(result["code"], 200)
        self.assertEqual(result["item"]["rateLimitPerMinute"], 200)
        self.assertEqual(result["item"]["rateLimitPerDay"], 100000)
        self.assertEqual(result["item"]["allowedOrigins"], ["https://example.com"])

    def test_create_config_missing_required_fields(self) -> None:
        """Test error when required fields are missing."""
        service = EnvironmentConfigService()
        service.config_table = MagicMock()

        # Missing applicationId
        event = {
            "arguments": {
                "input": {
                    "environment": "PRODUCTION",
                    "organizationId": "org-456",
                }
            }
        }
        result = service.create_config(event)
        self.assertIn("applicationId is required", result["message"])

        # Missing environment
        event = {
            "arguments": {
                "input": {
                    "applicationId": "app-123",
                    "organizationId": "org-456",
                }
            }
        }
        result = service.create_config(event)
        self.assertIn("environment is required", result["message"])

        # Missing organizationId
        event = {
            "arguments": {
                "input": {
                    "applicationId": "app-123",
                    "environment": "PRODUCTION",
                }
            }
        }
        result = service.create_config(event)
        self.assertIn("organizationId is required", result["message"])

    @mock_aws
    def test_create_config_invalid_origin(self) -> None:
        """Test error when origin is invalid."""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-env-config-table",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
                {"AttributeName": "environment", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        service = EnvironmentConfigService()
        service.config_table = table

        event = {
            "arguments": {
                "input": {
                    "applicationId": "app-123",
                    "environment": "PRODUCTION",
                    "organizationId": "org-456",
                    "allowedOrigins": ["not-a-valid-url"],
                }
            }
        }

        result = service.create_config(event)

        self.assertEqual(result["code"], 400)
        self.assertIn("Invalid origin", result["message"])

    @mock_aws
    def test_create_config_already_exists(self) -> None:
        """Test error when config already exists."""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-env-config-table",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
                {"AttributeName": "environment", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        # Create existing config
        table.put_item(
            Item={
                "applicationId": "app-123",
                "environment": "PRODUCTION",
                "organizationId": "org-456",
            }
        )

        service = EnvironmentConfigService()
        service.config_table = table

        event = {
            "arguments": {
                "input": {
                    "applicationId": "app-123",
                    "environment": "PRODUCTION",
                    "organizationId": "org-456",
                }
            }
        }

        result = service.create_config(event)

        self.assertEqual(result["code"], 400)
        self.assertIn("already exists", result["message"])


class TestEnvironmentConfigServiceUpdateConfig(unittest.TestCase):
    """Tests for update_config method."""

    def setUp(self) -> None:
        """Set up test environment."""
        os.environ["ENVIRONMENT_CONFIG_TABLE"] = "test-env-config-table"
        index.EnvironmentConfigService.__init__ = lambda self: None

    def tearDown(self) -> None:
        """Clean up after tests."""
        if "ENVIRONMENT_CONFIG_TABLE" in os.environ:
            del os.environ["ENVIRONMENT_CONFIG_TABLE"]

    @mock_aws
    def test_update_config_success(self) -> None:
        """Test successful config update."""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-env-config-table",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
                {"AttributeName": "environment", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        table.put_item(
            Item={
                "applicationId": "app-123",
                "environment": "PRODUCTION",
                "organizationId": "org-456",
                "rateLimitPerMinute": 60,
            }
        )

        service = EnvironmentConfigService()
        service.config_table = table

        event = {
            "arguments": {
                "input": {
                    "applicationId": "app-123",
                    "environment": "PRODUCTION",
                    "rateLimitPerMinute": 120,
                }
            }
        }

        result = service.update_config(event)

        self.assertEqual(result["code"], 200)
        self.assertTrue(result["success"])
        self.assertEqual(result["item"]["rateLimitPerMinute"], 120)

    def test_update_config_no_fields(self) -> None:
        """Test error when no fields to update."""
        service = EnvironmentConfigService()
        service.config_table = MagicMock()

        event = {
            "arguments": {
                "input": {
                    "applicationId": "app-123",
                    "environment": "PRODUCTION",
                }
            }
        }

        result = service.update_config(event)

        self.assertEqual(result["code"], 400)
        self.assertIn("No fields to update", result["message"])

    @mock_aws
    def test_update_config_not_found(self) -> None:
        """Test error when config not found."""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-env-config-table",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
                {"AttributeName": "environment", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        service = EnvironmentConfigService()
        service.config_table = table

        event = {
            "arguments": {
                "input": {
                    "applicationId": "nonexistent",
                    "environment": "PRODUCTION",
                    "rateLimitPerMinute": 120,
                }
            }
        }

        result = service.update_config(event)

        self.assertEqual(result["code"], 400)
        self.assertIn("not found", result["message"])


class TestEnvironmentConfigServiceAllowedOrigins(unittest.TestCase):
    """Tests for add_allowed_origin and remove_allowed_origin methods."""

    def setUp(self) -> None:
        """Set up test environment."""
        os.environ["ENVIRONMENT_CONFIG_TABLE"] = "test-env-config-table"
        index.EnvironmentConfigService.__init__ = lambda self: None

    def tearDown(self) -> None:
        """Clean up after tests."""
        if "ENVIRONMENT_CONFIG_TABLE" in os.environ:
            del os.environ["ENVIRONMENT_CONFIG_TABLE"]

    @mock_aws
    def test_add_origin_success(self) -> None:
        """Test successful origin addition."""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-env-config-table",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
                {"AttributeName": "environment", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        table.put_item(
            Item={
                "applicationId": "app-123",
                "environment": "PRODUCTION",
                "organizationId": "org-456",
                "allowedOrigins": [],
            }
        )

        service = EnvironmentConfigService()
        service.config_table = table

        event = {
            "arguments": {
                "input": {
                    "applicationId": "app-123",
                    "environment": "PRODUCTION",
                    "origin": "https://example.com",
                }
            }
        }

        result = service.add_allowed_origin(event)

        self.assertEqual(result["code"], 200)
        self.assertIn("https://example.com", result["item"]["allowedOrigins"])

    @mock_aws
    def test_add_origin_invalid_format(self) -> None:
        """Test error when origin format is invalid."""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-env-config-table",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
                {"AttributeName": "environment", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        table.put_item(
            Item={
                "applicationId": "app-123",
                "environment": "PRODUCTION",
                "organizationId": "org-456",
                "allowedOrigins": [],
            }
        )

        service = EnvironmentConfigService()
        service.config_table = table

        event = {
            "arguments": {
                "input": {
                    "applicationId": "app-123",
                    "environment": "PRODUCTION",
                    "origin": "not-a-valid-url",
                }
            }
        }

        result = service.add_allowed_origin(event)

        self.assertEqual(result["code"], 400)
        self.assertIn("Invalid origin format", result["message"])

    @mock_aws
    def test_add_origin_already_exists(self) -> None:
        """Test error when origin already exists."""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-env-config-table",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
                {"AttributeName": "environment", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        table.put_item(
            Item={
                "applicationId": "app-123",
                "environment": "PRODUCTION",
                "organizationId": "org-456",
                "allowedOrigins": ["https://example.com"],
            }
        )

        service = EnvironmentConfigService()
        service.config_table = table

        event = {
            "arguments": {
                "input": {
                    "applicationId": "app-123",
                    "environment": "PRODUCTION",
                    "origin": "https://example.com",
                }
            }
        }

        result = service.add_allowed_origin(event)

        self.assertEqual(result["code"], 400)
        self.assertIn("already exists", result["message"])

    @mock_aws
    def test_add_origin_max_limit(self) -> None:
        """Test error when max origins limit reached."""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-env-config-table",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
                {"AttributeName": "environment", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        # Create config with max origins
        origins = [f"https://example{i}.com" for i in range(MAX_ALLOWED_ORIGINS)]
        table.put_item(
            Item={
                "applicationId": "app-123",
                "environment": "PRODUCTION",
                "organizationId": "org-456",
                "allowedOrigins": origins,
            }
        )

        service = EnvironmentConfigService()
        service.config_table = table

        event = {
            "arguments": {
                "input": {
                    "applicationId": "app-123",
                    "environment": "PRODUCTION",
                    "origin": "https://neworigin.com",
                }
            }
        }

        result = service.add_allowed_origin(event)

        self.assertEqual(result["code"], 400)
        self.assertIn(f"Maximum {MAX_ALLOWED_ORIGINS}", result["message"])

    @mock_aws
    def test_remove_origin_success(self) -> None:
        """Test successful origin removal."""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-env-config-table",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
                {"AttributeName": "environment", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        table.put_item(
            Item={
                "applicationId": "app-123",
                "environment": "PRODUCTION",
                "organizationId": "org-456",
                "allowedOrigins": ["https://example.com", "https://other.com"],
            }
        )

        service = EnvironmentConfigService()
        service.config_table = table

        event = {
            "arguments": {
                "input": {
                    "applicationId": "app-123",
                    "environment": "PRODUCTION",
                    "origin": "https://example.com",
                }
            }
        }

        result = service.remove_allowed_origin(event)

        self.assertEqual(result["code"], 200)
        self.assertNotIn("https://example.com", result["item"]["allowedOrigins"])
        self.assertIn("https://other.com", result["item"]["allowedOrigins"])

    @mock_aws
    def test_remove_origin_not_found(self) -> None:
        """Test error when origin not found."""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-env-config-table",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
                {"AttributeName": "environment", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        table.put_item(
            Item={
                "applicationId": "app-123",
                "environment": "PRODUCTION",
                "organizationId": "org-456",
                "allowedOrigins": ["https://example.com"],
            }
        )

        service = EnvironmentConfigService()
        service.config_table = table

        event = {
            "arguments": {
                "input": {
                    "applicationId": "app-123",
                    "environment": "PRODUCTION",
                    "origin": "https://nonexistent.com",
                }
            }
        }

        result = service.remove_allowed_origin(event)

        self.assertEqual(result["code"], 400)
        self.assertIn("Origin not found", result["message"])

    @mock_aws
    def test_localhost_allowed_in_dev(self) -> None:
        """Test that localhost is allowed in DEVELOPMENT environment."""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-env-config-table",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
                {"AttributeName": "environment", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        table.put_item(
            Item={
                "applicationId": "app-123",
                "environment": "DEVELOPMENT",
                "organizationId": "org-456",
                "allowedOrigins": [],
            }
        )

        service = EnvironmentConfigService()
        service.config_table = table

        event = {
            "arguments": {
                "input": {
                    "applicationId": "app-123",
                    "environment": "DEVELOPMENT",
                    "origin": "http://localhost:3000",
                }
            }
        }

        result = service.add_allowed_origin(event)

        self.assertEqual(result["code"], 200)
        self.assertIn("http://localhost:3000", result["item"]["allowedOrigins"])

    @mock_aws
    def test_localhost_rejected_in_production(self) -> None:
        """Test that localhost is rejected in PRODUCTION environment."""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-env-config-table",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
                {"AttributeName": "environment", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        table.put_item(
            Item={
                "applicationId": "app-123",
                "environment": "PRODUCTION",
                "organizationId": "org-456",
                "allowedOrigins": [],
            }
        )

        service = EnvironmentConfigService()
        service.config_table = table

        event = {
            "arguments": {
                "input": {
                    "applicationId": "app-123",
                    "environment": "PRODUCTION",
                    "origin": "http://localhost:3000",
                }
            }
        }

        result = service.add_allowed_origin(event)

        self.assertEqual(result["code"], 400)
        self.assertIn("Invalid origin format", result["message"])


class TestEnvironmentConfigServiceWebhook(unittest.TestCase):
    """Tests for webhook configuration methods."""

    def setUp(self) -> None:
        """Set up test environment."""
        os.environ["ENVIRONMENT_CONFIG_TABLE"] = "test-env-config-table"
        index.EnvironmentConfigService.__init__ = lambda self: None

    def tearDown(self) -> None:
        """Clean up after tests."""
        if "ENVIRONMENT_CONFIG_TABLE" in os.environ:
            del os.environ["ENVIRONMENT_CONFIG_TABLE"]

    @mock_aws
    def test_update_webhook_config_success(self) -> None:
        """Test successful webhook config update."""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-env-config-table",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
                {"AttributeName": "environment", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        table.put_item(
            Item={
                "applicationId": "app-123",
                "environment": "PRODUCTION",
                "organizationId": "org-456",
            }
        )

        service = EnvironmentConfigService()
        service.config_table = table

        event = {
            "arguments": {
                "input": {
                    "applicationId": "app-123",
                    "environment": "PRODUCTION",
                    "webhookUrl": "https://webhook.example.com/events",
                    "webhookEvents": ["USER_CREATED", "USER_UPDATED"],
                }
            }
        }

        result = service.update_webhook_config(event)

        self.assertEqual(result["code"], 200)
        self.assertTrue(result["success"])

    @mock_aws
    def test_update_webhook_requires_https(self) -> None:
        """Test that webhook URL must use HTTPS."""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-env-config-table",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
                {"AttributeName": "environment", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        table.put_item(
            Item={
                "applicationId": "app-123",
                "environment": "PRODUCTION",
                "organizationId": "org-456",
            }
        )

        service = EnvironmentConfigService()
        service.config_table = table

        event = {
            "arguments": {
                "input": {
                    "applicationId": "app-123",
                    "environment": "PRODUCTION",
                    "webhookUrl": "http://webhook.example.com/events",
                }
            }
        }

        result = service.update_webhook_config(event)

        self.assertEqual(result["code"], 400)
        self.assertIn("HTTPS", result["message"])

    @mock_aws
    def test_update_webhook_generates_secret_on_enable(self) -> None:
        """Test that enabling webhook generates secret if none exists."""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-env-config-table",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
                {"AttributeName": "environment", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        table.put_item(
            Item={
                "applicationId": "app-123",
                "environment": "PRODUCTION",
                "organizationId": "org-456",
                "webhookUrl": "https://webhook.example.com",
            }
        )

        service = EnvironmentConfigService()
        service.config_table = table

        event = {
            "arguments": {
                "input": {
                    "applicationId": "app-123",
                    "environment": "PRODUCTION",
                    "webhookEnabled": True,
                }
            }
        }

        result = service.update_webhook_config(event)

        self.assertEqual(result["code"], 200)
        # Secret should be masked in response
        self.assertEqual(result["item"]["webhookSecret"], "********")

        # Verify secret was actually stored
        response = table.get_item(Key={"applicationId": "app-123", "environment": "PRODUCTION"})
        self.assertIsNotNone(response["Item"].get("webhookSecret"))
        self.assertEqual(len(response["Item"]["webhookSecret"]), 32)

    @mock_aws
    def test_regenerate_webhook_secret_success(self) -> None:
        """Test successful webhook secret regeneration."""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-env-config-table",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
                {"AttributeName": "environment", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        table.put_item(
            Item={
                "applicationId": "app-123",
                "environment": "PRODUCTION",
                "organizationId": "org-456",
                "webhookSecret": "oldsecret12345678901234567890ab",
            }
        )

        service = EnvironmentConfigService()
        service.config_table = table

        event = {
            "arguments": {
                "input": {
                    "applicationId": "app-123",
                    "environment": "PRODUCTION",
                }
            }
        }

        result = service.regenerate_webhook_secret(event)

        self.assertEqual(result["code"], 200)
        self.assertTrue(result["success"])
        # New secret should be returned (not masked)
        self.assertIsNotNone(result.get("webhookSecret"))
        self.assertEqual(len(result["webhookSecret"]), 32)
        self.assertNotEqual(result["webhookSecret"], "oldsecret12345678901234567890ab")

    @mock_aws
    def test_regenerate_webhook_secret_not_found(self) -> None:
        """Test error when config not found for secret regeneration."""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-env-config-table",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
                {"AttributeName": "environment", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        service = EnvironmentConfigService()
        service.config_table = table

        event = {
            "arguments": {
                "input": {
                    "applicationId": "nonexistent",
                    "environment": "PRODUCTION",
                }
            }
        }

        result = service.regenerate_webhook_secret(event)

        self.assertEqual(result["code"], 400)
        self.assertIn("not found", result["message"])


class TestEnvironmentConfigServiceFeatureFlags(unittest.TestCase):
    """Tests for feature flag methods."""

    def setUp(self) -> None:
        """Set up test environment."""
        os.environ["ENVIRONMENT_CONFIG_TABLE"] = "test-env-config-table"
        index.EnvironmentConfigService.__init__ = lambda self: None

    def tearDown(self) -> None:
        """Clean up after tests."""
        if "ENVIRONMENT_CONFIG_TABLE" in os.environ:
            del os.environ["ENVIRONMENT_CONFIG_TABLE"]

    @mock_aws
    def test_set_feature_flag_success(self) -> None:
        """Test successful feature flag setting."""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-env-config-table",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
                {"AttributeName": "environment", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        table.put_item(
            Item={
                "applicationId": "app-123",
                "environment": "PRODUCTION",
                "organizationId": "org-456",
                "featureFlags": {},
            }
        )

        service = EnvironmentConfigService()
        service.config_table = table

        event = {
            "arguments": {
                "input": {
                    "applicationId": "app-123",
                    "environment": "PRODUCTION",
                    "key": "new_feature",
                    "value": True,
                }
            }
        }

        result = service.set_feature_flag(event)

        self.assertEqual(result["code"], 200)
        self.assertTrue(result["success"])
        self.assertEqual(result["item"]["featureFlags"]["new_feature"], True)

    @mock_aws
    def test_set_feature_flag_string_value(self) -> None:
        """Test setting feature flag with string value."""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-env-config-table",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
                {"AttributeName": "environment", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        table.put_item(
            Item={
                "applicationId": "app-123",
                "environment": "PRODUCTION",
                "organizationId": "org-456",
                "featureFlags": {},
            }
        )

        service = EnvironmentConfigService()
        service.config_table = table

        event = {
            "arguments": {
                "input": {
                    "applicationId": "app-123",
                    "environment": "PRODUCTION",
                    "key": "theme_color",
                    "value": "dark",
                }
            }
        }

        result = service.set_feature_flag(event)

        self.assertEqual(result["code"], 200)
        self.assertEqual(result["item"]["featureFlags"]["theme_color"], "dark")

    def test_set_feature_flag_invalid_key_format(self) -> None:
        """Test error when feature flag key is not snake_case."""
        service = EnvironmentConfigService()
        service.config_table = MagicMock()
        service.config_table.get_item.return_value = {
            "Item": {
                "applicationId": "app-123",
                "environment": "PRODUCTION",
                "featureFlags": {},
            }
        }

        invalid_keys = [
            "CamelCase",
            "kebab-case",
            "with spaces",
            "123_starts_with_number",
            "UPPERCASE",
        ]

        for key in invalid_keys:
            event = {
                "arguments": {
                    "input": {
                        "applicationId": "app-123",
                        "environment": "PRODUCTION",
                        "key": key,
                        "value": True,
                    }
                }
            }

            result = service.set_feature_flag(event)

            self.assertEqual(result["code"], 400, f"Should reject key: {key}")
            self.assertIn("snake_case", result["message"])

    @mock_aws
    def test_set_feature_flag_max_limit(self) -> None:
        """Test error when max feature flags limit reached."""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-env-config-table",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
                {"AttributeName": "environment", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        # Create config with max flags
        flags = {f"flag_{i}": True for i in range(MAX_FEATURE_FLAGS)}
        table.put_item(
            Item={
                "applicationId": "app-123",
                "environment": "PRODUCTION",
                "organizationId": "org-456",
                "featureFlags": flags,
            }
        )

        service = EnvironmentConfigService()
        service.config_table = table

        event = {
            "arguments": {
                "input": {
                    "applicationId": "app-123",
                    "environment": "PRODUCTION",
                    "key": "new_flag",
                    "value": True,
                }
            }
        }

        result = service.set_feature_flag(event)

        self.assertEqual(result["code"], 400)
        self.assertIn(f"Maximum {MAX_FEATURE_FLAGS}", result["message"])

    @mock_aws
    def test_delete_feature_flag_success(self) -> None:
        """Test successful feature flag deletion."""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-env-config-table",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
                {"AttributeName": "environment", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        table.put_item(
            Item={
                "applicationId": "app-123",
                "environment": "PRODUCTION",
                "organizationId": "org-456",
                "featureFlags": {"existing_flag": True, "other_flag": False},
            }
        )

        service = EnvironmentConfigService()
        service.config_table = table

        event = {
            "arguments": {
                "input": {
                    "applicationId": "app-123",
                    "environment": "PRODUCTION",
                    "key": "existing_flag",
                }
            }
        }

        result = service.delete_feature_flag(event)

        self.assertEqual(result["code"], 200)
        self.assertTrue(result["success"])
        self.assertNotIn("existing_flag", result["item"]["featureFlags"])
        self.assertIn("other_flag", result["item"]["featureFlags"])

    @mock_aws
    def test_delete_feature_flag_not_found(self) -> None:
        """Test error when config not found for flag deletion."""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-env-config-table",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
                {"AttributeName": "environment", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        service = EnvironmentConfigService()
        service.config_table = table

        event = {
            "arguments": {
                "input": {
                    "applicationId": "nonexistent",
                    "environment": "PRODUCTION",
                    "key": "some_flag",
                }
            }
        }

        result = service.delete_feature_flag(event)

        self.assertEqual(result["code"], 400)
        self.assertIn("not found", result["message"])


class TestLambdaHandler(unittest.TestCase):
    """Tests for the Lambda handler routing."""

    def setUp(self) -> None:
        """Set up test environment."""
        os.environ["ENVIRONMENT_CONFIG_TABLE"] = "test-env-config-table"
        os.environ["AWS_DEFAULT_REGION"] = "us-east-1"

        # Restore the original __init__ method
        def real_init(self_inner: EnvironmentConfigService) -> None:
            self_inner.dynamodb = boto3.resource("dynamodb")
            self_inner.config_table = self_inner.dynamodb.Table(
                os.environ.get(
                    "ENVIRONMENT_CONFIG_TABLE",
                    "orb-integration-hub-dev-table-applicationenvironmentconfig",
                )
            )

        EnvironmentConfigService.__init__ = real_init  # type: ignore

    def tearDown(self) -> None:
        """Clean up after tests."""
        for key in ["ENVIRONMENT_CONFIG_TABLE", "AWS_DEFAULT_REGION"]:
            if key in os.environ:
                del os.environ[key]

    @mock_aws
    def test_handler_routes_get_config(self) -> None:
        """Test handler routes to get_config."""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        dynamodb.create_table(
            TableName="test-env-config-table",
            KeySchema=[
                {"AttributeName": "applicationId", "KeyType": "HASH"},
                {"AttributeName": "environment", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "applicationId", "AttributeType": "S"},
                {"AttributeName": "environment", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        table = dynamodb.Table("test-env-config-table")
        table.put_item(
            Item={
                "applicationId": "app-123",
                "environment": "PRODUCTION",
                "organizationId": "org-456",
            }
        )

        event = {
            "info": {"fieldName": "ApplicationEnvironmentConfigGet"},
            "arguments": {
                "applicationId": "app-123",
                "environment": "PRODUCTION",
            },
        }

        result = lambda_handler(event, MagicMock())

        self.assertEqual(result["code"], 200)
        self.assertTrue(result["success"])

    def test_handler_unknown_operation(self) -> None:
        """Test handler returns error for unknown operation."""
        event = {
            "info": {"fieldName": "UnknownOperation"},
            "arguments": {},
        }

        result = lambda_handler(event, MagicMock())

        self.assertEqual(result["code"], 400)
        self.assertFalse(result["success"])
        self.assertIn("Unknown operation", result["message"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
