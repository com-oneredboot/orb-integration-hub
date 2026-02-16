# file: apps/api/lambdas/create_user_from_cognito/test_create_user_from_cognito.py
# author: Corey Dale Peters
# created: 2026-01-21
# description: Unit tests for CreateUserFromCognito Lambda function
# ruff: noqa: E402

import importlib.util
import os
import sys
import time
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

import boto3
from moto import mock_aws

# Add the lambda directory to path for imports
lambda_dir = Path(__file__).parent
sys.path.insert(0, str(lambda_dir))

# Import with explicit module reference to avoid conflicts with other index.py files
spec = importlib.util.spec_from_file_location(
    "create_user_from_cognito_index", lambda_dir / "index.py"
)
index = importlib.util.module_from_spec(spec)
spec.loader.exec_module(index)

# Extract functions from the module
lambda_handler = index.lambda_handler
validate_uuid = index.validate_uuid
query_user_by_cognito_sub = index.query_user_by_cognito_sub
create_user_record = index.create_user_record
extract_cognito_attributes = index.extract_cognito_attributes
MIN_RESPONSE_TIME = index.MIN_RESPONSE_TIME


class TestValidateUUID(unittest.TestCase):
    """Tests for UUID validation logic"""

    def test_valid_uuid_formats(self):
        """Test that valid UUID formats pass validation"""
        valid_uuids = [
            "550e8400-e29b-41d4-a716-446655440000",
            "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
            "f47ac10b-58cc-4372-a567-0e02b2c3d479",
            "A550E840-E29B-41D4-A716-446655440000",  # Uppercase
            "550E8400-E29B-41D4-A716-446655440000",  # Mixed case
        ]

        for uuid in valid_uuids:
            with self.subTest(uuid=uuid):
                self.assertTrue(validate_uuid(uuid), f"Should accept: {uuid}")

    def test_invalid_uuid_formats(self):
        """Test that invalid UUID formats fail validation"""
        invalid_uuids = [
            "",
            "not-a-uuid",
            "550e8400-e29b-41d4-a716",  # Too short
            "550e8400-e29b-41d4-a716-446655440000-extra",  # Too long
            "550e8400e29b41d4a716446655440000",  # No dashes
            "550e8400-e29b-41d4-a716-44665544000g",  # Invalid character
            "550e8400-e29b-41d4-a716-4466554400",  # Wrong segment length
            None,
            123,
            [],
            {},
        ]

        for uuid in invalid_uuids:
            with self.subTest(uuid=uuid):
                self.assertFalse(validate_uuid(uuid), f"Should reject: {uuid}")


class TestCreateUserFromCognitoHandler(unittest.TestCase):
    """Tests for the Lambda handler"""

    def setUp(self):
        """Set up test environment before each test"""
        self.test_context = MagicMock()
        os.environ["USERS_TABLE_NAME"] = "test-users-table"
        os.environ["USER_POOL_ID"] = "us-east-1_TestPool"
        os.environ["LOGGING_LEVEL"] = "DEBUG"
        # Reset global clients
        index._dynamodb = None
        index._cognito = None

    def tearDown(self):
        """Clean up after each test"""
        for key in ["USERS_TABLE_NAME", "USER_POOL_ID", "LOGGING_LEVEL"]:
            if key in os.environ:
                del os.environ[key]

    @mock_aws
    def test_happy_path_creates_user(self):
        """Test successful user creation from Cognito data"""
        # Setup DynamoDB mock
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        dynamodb.create_table(
            TableName="test-users-table",
            KeySchema=[{"AttributeName": "userId", "KeyType": "HASH"}],
            AttributeDefinitions=[
                {"AttributeName": "userId", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        test_sub = "550e8400-e29b-41d4-a716-446655440000"

        # Mock Cognito response (moto's cognitoidp requires joserfc which may not be installed)
        with patch.object(index, "get_cognito_user") as mock_cognito:
            mock_cognito.return_value = {
                "username": test_sub,
                "status": "CONFIRMED",
                "attributes": {
                    "email": "test@example.com",
                    "given_name": "Test",
                    "family_name": "User",
                    "email_verified": "true",
                    "sub": test_sub,
                },
            }

            event = {"arguments": {"input": {"cognitoSub": test_sub}}}
            result = lambda_handler(event, self.test_context)

            self.assertEqual(result["userId"], test_sub)
            self.assertEqual(result["email"], "test@example.com")
            self.assertEqual(result["firstName"], "Test")
            self.assertEqual(result["lastName"], "User")
            self.assertEqual(result["status"], "PENDING")
            self.assertEqual(result["groups"], ["USER"])
            self.assertTrue(result["mfaEnabled"])
            self.assertTrue(result["mfaSetupComplete"])

    @mock_aws
    def test_idempotent_returns_existing_user(self):
        """Test that existing user is returned without creating duplicate"""
        # Setup DynamoDB mock
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-users-table",
            KeySchema=[{"AttributeName": "userId", "KeyType": "HASH"}],
            AttributeDefinitions=[
                {"AttributeName": "userId", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        # Add existing user
        test_sub = "550e8400-e29b-41d4-a716-446655440000"
        existing_user = {
            "userId": test_sub,
            "email": "existing@example.com",
            "firstName": "Existing",
            "lastName": "User",
            "status": "ACTIVE",  # Different from PENDING
            "groups": ["USER", "ADMIN"],  # Different from default
            "emailVerified": True,
            "phoneVerified": True,
            "mfaEnabled": True,
            "mfaSetupComplete": True,
            "createdAt": 1234567890,
            "updatedAt": 1234567890,
        }
        table.put_item(Item=existing_user)

        event = {"arguments": {"input": {"cognitoSub": test_sub}}}
        result = lambda_handler(event, self.test_context)

        # Should return existing user, not create new one
        self.assertEqual(result["userId"], test_sub)
        self.assertEqual(result["email"], "existing@example.com")
        self.assertEqual(result["status"], "ACTIVE")  # Preserved
        self.assertEqual(result["groups"], ["USER", "ADMIN"])  # Preserved

    def test_invalid_uuid_raises_error(self):
        """Test that invalid UUID format raises ValueError"""
        invalid_events = [
            {"arguments": {"input": {"cognitoSub": ""}}},
            {"arguments": {"input": {"cognitoSub": "not-a-uuid"}}},
            {"arguments": {"input": {"cognitoSub": "550e8400-e29b-41d4"}}},
            {"arguments": {"input": {}}},
            {"arguments": {}},
        ]

        for event in invalid_events:
            with self.subTest(event=event):
                with self.assertRaises(ValueError) as context:
                    lambda_handler(event, self.test_context)
                self.assertIn("Invalid request format", str(context.exception))

    @mock_aws
    def test_user_not_in_cognito_raises_error(self):
        """Test that non-existent Cognito user raises error"""
        # Setup DynamoDB mock
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        dynamodb.create_table(
            TableName="test-users-table",
            KeySchema=[{"AttributeName": "userId", "KeyType": "HASH"}],
            AttributeDefinitions=[
                {"AttributeName": "userId", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        # Mock Cognito to return None (user not found)
        with patch.object(index, "get_cognito_user") as mock_cognito:
            mock_cognito.return_value = None

            event = {"arguments": {"input": {"cognitoSub": "550e8400-e29b-41d4-a716-446655440000"}}}

            with self.assertRaises(Exception) as context:
                lambda_handler(event, self.test_context)
            self.assertIn("User not found", str(context.exception))

    def test_missing_table_name_raises_error(self):
        """Test that missing USERS_TABLE_NAME raises error"""
        del os.environ["USERS_TABLE_NAME"]

        event = {"arguments": {"input": {"cognitoSub": "550e8400-e29b-41d4-a716-446655440000"}}}

        with self.assertRaises(Exception):
            lambda_handler(event, self.test_context)

    def test_missing_user_pool_id_raises_error(self):
        """Test that missing USER_POOL_ID raises error"""
        del os.environ["USER_POOL_ID"]

        # Mock DynamoDB to return no existing user
        with patch.object(index, "query_user_by_cognito_sub") as mock_query:
            mock_query.return_value = None

            event = {"arguments": {"input": {"cognitoSub": "550e8400-e29b-41d4-a716-446655440000"}}}

            with self.assertRaises(Exception):
                lambda_handler(event, self.test_context)


class TestCreateUserFromCognitoSecurity(unittest.TestCase):
    """Security-focused tests for CreateUserFromCognito Lambda"""

    def setUp(self):
        """Set up test environment before each test"""
        self.test_context = MagicMock()
        os.environ["USERS_TABLE_NAME"] = "test-users-table"
        os.environ["USER_POOL_ID"] = "us-east-1_TestPool"
        os.environ["LOGGING_LEVEL"] = "DEBUG"
        index._dynamodb = None
        index._cognito = None

    def tearDown(self):
        """Clean up after each test"""
        for key in ["USERS_TABLE_NAME", "USER_POOL_ID", "LOGGING_LEVEL"]:
            if key in os.environ:
                del os.environ[key]

    @mock_aws
    def test_timing_attack_prevention(self):
        """Test that response times are consistent to prevent timing attacks"""
        # Setup DynamoDB mock
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-users-table",
            KeySchema=[{"AttributeName": "userId", "KeyType": "HASH"}],
            AttributeDefinitions=[
                {"AttributeName": "userId", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        # Add existing user
        existing_sub = "550e8400-e29b-41d4-a716-446655440000"
        table.put_item(
            Item={
                "userId": existing_sub,
                "email": "existing@example.com",
                "firstName": "Test",
                "lastName": "User",
                "status": "PENDING",
                "groups": ["USER"],
                "emailVerified": True,
                "phoneVerified": False,
                "mfaEnabled": True,
                "mfaSetupComplete": True,
                "createdAt": 1234567890,
                "updatedAt": 1234567890,
            }
        )

        # Measure timing for existing user (fast path)
        existing_times = []
        for _ in range(3):
            start = time.time()
            lambda_handler(
                {"arguments": {"input": {"cognitoSub": existing_sub}}},
                self.test_context,
            )
            existing_times.append(time.time() - start)

        # Measure timing for invalid UUID (validation failure)
        invalid_times = []
        for _ in range(3):
            start = time.time()
            try:
                lambda_handler(
                    {"arguments": {"input": {"cognitoSub": "invalid"}}},
                    self.test_context,
                )
            except ValueError:
                pass
            invalid_times.append(time.time() - start)

        # Both should take at least MIN_RESPONSE_TIME
        for t in existing_times + invalid_times:
            self.assertGreaterEqual(t, MIN_RESPONSE_TIME * 0.9)  # Allow 10% tolerance

    def test_response_only_contains_expected_fields(self):
        """Test that response doesn't leak additional data"""
        with patch.object(index, "ensure_user_in_group"), patch.object(
            index, "query_user_by_cognito_sub"
        ) as mock_query:
            mock_query.return_value = {
                "userId": "550e8400-e29b-41d4-a716-446655440000",
                "email": "test@example.com",
                "firstName": "Test",
                "lastName": "User",
                "status": "PENDING",
                "emailVerified": True,
                "phoneVerified": False,
                "mfaEnabled": True,
                "mfaSetupComplete": True,
                "groups": ["USER"],
                "createdAt": 1234567890,
                "updatedAt": 1234567890,
                # Extra fields that shouldn't be exposed
                "internalField": "secret",
                "passwordHash": "abc123",
            }

            event = {"arguments": {"input": {"cognitoSub": "550e8400-e29b-41d4-a716-446655440000"}}}
            result = lambda_handler(event, self.test_context)

            # Should only contain expected fields
            expected_fields = {
                "cognitoSub",
                "userId",
                "email",
                "firstName",
                "lastName",
                "status",
                "emailVerified",
                "phoneVerified",
                "mfaEnabled",
                "mfaSetupComplete",
                "groups",
                "createdAt",
                "updatedAt",
            }
            self.assertEqual(set(result.keys()), expected_fields)
            self.assertNotIn("internalField", result)
            self.assertNotIn("passwordHash", result)

    def test_error_messages_dont_leak_info(self):
        """Test that error messages don't expose sensitive information"""
        with patch.object(index, "query_user_by_cognito_sub") as mock_query:
            mock_query.side_effect = Exception(
                "DynamoDB Error: Table ARN=arn:aws:dynamodb:us-east-1:123456789:table/Users"
            )

            event = {"arguments": {"input": {"cognitoSub": "550e8400-e29b-41d4-a716-446655440000"}}}

            with self.assertRaises(Exception) as context:
                lambda_handler(event, self.test_context)

            error_msg = str(context.exception)
            # Should not expose internal details
            self.assertNotIn("arn:aws", error_msg)
            self.assertNotIn("123456789", error_msg)
            self.assertIn("unavailable", error_msg.lower())

    def test_only_cognito_data_used(self):
        """Test that only Cognito data is used, not client input"""
        # This test verifies that even if client sends extra data,
        # only cognitoSub is used and all other data comes from Cognito
        with patch.object(index, "ensure_user_in_group"), patch.object(
            index, "query_user_by_cognito_sub"
        ) as mock_query, patch.object(index, "get_cognito_user") as mock_cognito, patch.object(
            index, "create_user_record"
        ) as mock_create:

            mock_query.return_value = None  # User doesn't exist
            mock_cognito.return_value = {
                "username": "550e8400-e29b-41d4-a716-446655440000",
                "status": "CONFIRMED",
                "attributes": {
                    "email": "cognito@example.com",
                    "given_name": "Cognito",
                    "family_name": "User",
                    "email_verified": "true",
                    "sub": "550e8400-e29b-41d4-a716-446655440000",
                },
            }
            mock_create.return_value = {
                "userId": "550e8400-e29b-41d4-a716-446655440000",
                "email": "cognito@example.com",
                "firstName": "Cognito",
                "lastName": "User",
                "status": "PENDING",
                "groups": ["USER"],
                "emailVerified": True,
                "phoneVerified": False,
                "mfaEnabled": True,
                "mfaSetupComplete": True,
                "createdAt": 1234567890,
                "updatedAt": 1234567890,
            }

            # Client tries to inject malicious data
            event = {
                "arguments": {
                    "input": {
                        "cognitoSub": "550e8400-e29b-41d4-a716-446655440000",
                        # These should be ignored
                        "email": "hacker@evil.com",
                        "firstName": "Hacker",
                        "status": "ADMIN",
                        "groups": ["OWNER"],
                    }
                }
            }

            result = lambda_handler(event, self.test_context)

            # Verify Cognito data was used, not client data
            self.assertEqual(result["email"], "cognito@example.com")
            self.assertEqual(result["firstName"], "Cognito")
            self.assertEqual(result["status"], "PENDING")
            self.assertEqual(result["groups"], ["USER"])


class TestExtractCognitoAttributes(unittest.TestCase):
    """Tests for Cognito attribute extraction"""

    def test_extracts_all_attributes(self):
        """Test that all expected attributes are extracted"""
        cognito_user = {
            "username": "test-user",
            "status": "CONFIRMED",
            "attributes": {
                "email": "test@example.com",
                "given_name": "Test",
                "family_name": "User",
                "email_verified": "true",
                "sub": "550e8400-e29b-41d4-a716-446655440000",
            },
        }

        result = extract_cognito_attributes(cognito_user)

        self.assertEqual(result["email"], "test@example.com")
        self.assertEqual(result["firstName"], "Test")
        self.assertEqual(result["lastName"], "User")
        self.assertTrue(result["emailVerified"])
        self.assertEqual(result["sub"], "550e8400-e29b-41d4-a716-446655440000")

    def test_handles_missing_attributes(self):
        """Test that missing attributes default to empty/false"""
        cognito_user = {
            "username": "test-user",
            "status": "CONFIRMED",
            "attributes": {
                "email": "test@example.com",
                "sub": "550e8400-e29b-41d4-a716-446655440000",
            },
        }

        result = extract_cognito_attributes(cognito_user)

        self.assertEqual(result["email"], "test@example.com")
        self.assertEqual(result["firstName"], "")
        self.assertEqual(result["lastName"], "")
        self.assertFalse(result["emailVerified"])

    def test_handles_email_verified_false(self):
        """Test that email_verified=false is handled correctly"""
        cognito_user = {
            "username": "test-user",
            "attributes": {
                "email": "test@example.com",
                "email_verified": "false",
                "sub": "test-sub",
            },
        }

        result = extract_cognito_attributes(cognito_user)
        self.assertFalse(result["emailVerified"])


class TestDatabaseOperations(unittest.TestCase):
    """Tests for database operations"""

    def setUp(self):
        """Set up test environment before each test"""
        os.environ["USERS_TABLE_NAME"] = "test-users-table"
        index._dynamodb = None

    def tearDown(self):
        """Clean up after each test"""
        if "USERS_TABLE_NAME" in os.environ:
            del os.environ["USERS_TABLE_NAME"]

    @mock_aws
    def test_query_returns_existing_user(self):
        """Test that query returns existing user"""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-users-table",
            KeySchema=[{"AttributeName": "userId", "KeyType": "HASH"}],
            AttributeDefinitions=[
                {"AttributeName": "userId", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        test_sub = "550e8400-e29b-41d4-a716-446655440000"
        table.put_item(
            Item={
                "userId": test_sub,
                "email": "test@example.com",
                "firstName": "Test",
                "lastName": "User",
                "status": "PENDING",
                "groups": ["USER"],
            }
        )

        result = query_user_by_cognito_sub(test_sub)

        self.assertIsNotNone(result)
        self.assertEqual(result["userId"], test_sub)
        self.assertEqual(result["email"], "test@example.com")

    @mock_aws
    def test_query_returns_none_for_nonexistent(self):
        """Test that query returns None for non-existent user"""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        dynamodb.create_table(
            TableName="test-users-table",
            KeySchema=[{"AttributeName": "userId", "KeyType": "HASH"}],
            AttributeDefinitions=[
                {"AttributeName": "userId", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        result = query_user_by_cognito_sub("nonexistent-sub")
        self.assertIsNone(result)

    @mock_aws
    def test_create_user_record_sets_defaults(self):
        """Test that create sets correct default values"""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        dynamodb.create_table(
            TableName="test-users-table",
            KeySchema=[{"AttributeName": "userId", "KeyType": "HASH"}],
            AttributeDefinitions=[
                {"AttributeName": "userId", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        test_sub = "550e8400-e29b-41d4-a716-446655440000"
        cognito_attrs = {
            "email": "test@example.com",
            "firstName": "Test",
            "lastName": "User",
            "emailVerified": True,
            "sub": test_sub,
        }

        result = create_user_record(test_sub, cognito_attrs)

        self.assertEqual(result["userId"], test_sub)
        self.assertEqual(result["cognitoId"], test_sub)
        self.assertEqual(result["cognitoSub"], test_sub)
        self.assertEqual(result["status"], "PENDING")
        self.assertEqual(result["groups"], ["USER"])
        self.assertFalse(result["phoneVerified"])
        self.assertTrue(result["mfaEnabled"])
        self.assertTrue(result["mfaSetupComplete"])
        self.assertIsNotNone(result["createdAt"])
        self.assertIsNotNone(result["updatedAt"])

    def test_missing_table_name_raises_error(self):
        """Test that missing table name raises ValueError"""
        del os.environ["USERS_TABLE_NAME"]

        with self.assertRaises(ValueError) as context:
            query_user_by_cognito_sub("test-sub")
        self.assertIn("not configured", str(context.exception))


if __name__ == "__main__":
    unittest.main(verbosity=2)
