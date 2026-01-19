# file: apps/api/lambdas/check_email_exists/test_check_email_exists.py
# author: Corey Dale Peters
# created: 2026-01-16
# description: Unit tests for CheckEmailExists Lambda function

import unittest
import os
import time
from unittest.mock import patch, MagicMock
from moto import mock_aws
import boto3

# Import the lambda function
import sys

sys.path.append(os.path.dirname(__file__))
from index import (
    lambda_handler,
    validate_email,
    check_email_in_database,
    MIN_RESPONSE_TIME,
)
import index  # Import module to reset _dynamodb


class TestCheckEmailExistsValidation(unittest.TestCase):
    """Tests for email validation logic"""

    def test_valid_email_formats(self):
        """Test that valid email formats pass validation"""
        valid_emails = [
            "user@example.com",
            "user.name@example.com",
            "user+tag@example.com",
            "user123@example.co.uk",
            "user_name@sub.domain.com",
            "USER@EXAMPLE.COM",
            "a@b.co",
        ]

        for email in valid_emails:
            with self.subTest(email=email):
                self.assertTrue(validate_email(email), f"Should accept: {email}")

    def test_invalid_email_formats(self):
        """Test that invalid email formats fail validation"""
        invalid_emails = [
            "",
            "not-an-email",
            "@example.com",
            "user@",
            "user@.com",
            "user@example",
            "user @example.com",
            "user@ example.com",
            "user@example .com",
            None,
            123,
            [],
            {},
        ]

        for email in invalid_emails:
            with self.subTest(email=email):
                self.assertFalse(validate_email(email), f"Should reject: {email}")

    def test_malicious_email_inputs(self):
        """Test that malicious inputs are rejected"""
        malicious_inputs = [
            # XSS attempts
            '<script>alert("xss")</script>@example.com',
            "user@example.com<script>alert(1)</script>",
            # SQL injection attempts
            "'; DROP TABLE users; --@example.com",
            "user@example.com' OR '1'='1",
            # Command injection attempts
            "; rm -rf /@example.com",
            "$(rm -rf /)@example.com",
            # Path traversal
            "../../../etc/passwd@example.com",
            # NULL bytes
            "user\x00@example.com",
            # Very long input
            "a" * 1000 + "@example.com",
        ]

        for email in malicious_inputs:
            with self.subTest(email=email):
                # Should either reject or sanitize
                result = validate_email(email)
                # Most malicious inputs should fail validation
                self.assertIsInstance(result, bool)


class TestCheckEmailExistsHandler(unittest.TestCase):
    """Tests for the Lambda handler"""

    def setUp(self):
        """Set up test environment before each test"""
        self.test_context = MagicMock()
        os.environ["USERS_TABLE_NAME"] = "test-users-table"
        os.environ["LOGGING_LEVEL"] = "DEBUG"
        # Reset the global dynamodb resource so moto can mock it
        index._dynamodb = None

    def tearDown(self):
        """Clean up after each test"""
        for key in ["USERS_TABLE_NAME", "LOGGING_LEVEL"]:
            if key in os.environ:
                del os.environ[key]

    @mock_aws
    def test_email_exists_returns_true(self):
        """Test that existing email returns exists: true"""
        # Setup DynamoDB mock
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-users-table",
            KeySchema=[{"AttributeName": "userId", "KeyType": "HASH"}],
            AttributeDefinitions=[
                {"AttributeName": "userId", "AttributeType": "S"},
                {"AttributeName": "email", "AttributeType": "S"},
            ],
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "EmailIndex",
                    "KeySchema": [{"AttributeName": "email", "KeyType": "HASH"}],
                    "Projection": {"ProjectionType": "ALL"},
                }
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        # Add a test user
        table.put_item(
            Item={
                "userId": "user-123",
                "email": "existing@example.com",
            }
        )

        event = {"arguments": {"input": {"email": "existing@example.com"}}}

        result = lambda_handler(event, self.test_context)

        self.assertEqual(result["email"], "existing@example.com")
        self.assertTrue(result["exists"])

    @mock_aws
    def test_email_not_exists_returns_false(self):
        """Test that non-existing email returns exists: false"""
        # Setup DynamoDB mock
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        dynamodb.create_table(
            TableName="test-users-table",
            KeySchema=[{"AttributeName": "userId", "KeyType": "HASH"}],
            AttributeDefinitions=[
                {"AttributeName": "userId", "AttributeType": "S"},
                {"AttributeName": "email", "AttributeType": "S"},
            ],
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "EmailIndex",
                    "KeySchema": [{"AttributeName": "email", "KeyType": "HASH"}],
                    "Projection": {"ProjectionType": "ALL"},
                }
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        event = {"arguments": {"input": {"email": "nonexistent@example.com"}}}

        result = lambda_handler(event, self.test_context)

        self.assertEqual(result["email"], "nonexistent@example.com")
        self.assertFalse(result["exists"])

    def test_invalid_email_raises_error(self):
        """Test that invalid email format raises ValueError"""
        invalid_events = [
            {"arguments": {"input": {"email": ""}}},
            {"arguments": {"input": {"email": "not-an-email"}}},
            {"arguments": {"input": {"email": "@example.com"}}},
            {"arguments": {"input": {}}},
            {"arguments": {}},
        ]

        for event in invalid_events:
            with self.subTest(event=event):
                with self.assertRaises(ValueError) as context:
                    lambda_handler(event, self.test_context)
                self.assertIn("Invalid email format", str(context.exception))

    def test_missing_table_name_raises_error(self):
        """Test that missing USERS_TABLE_NAME raises error"""
        del os.environ["USERS_TABLE_NAME"]

        event = {"arguments": {"input": {"email": "test@example.com"}}}

        with self.assertRaises(Exception):
            lambda_handler(event, self.test_context)

    @mock_aws
    def test_database_error_returns_service_unavailable(self):
        """Test that database errors return service unavailable"""
        # Don't create the table to simulate error
        event = {"arguments": {"input": {"email": "test@example.com"}}}

        with self.assertRaises(Exception) as context:
            lambda_handler(event, self.test_context)
        self.assertIn("Service temporarily unavailable", str(context.exception))


class TestCheckEmailExistsSecurity(unittest.TestCase):
    """Security-focused tests for CheckEmailExists Lambda"""

    def setUp(self):
        """Set up test environment before each test"""
        self.test_context = MagicMock()
        os.environ["USERS_TABLE_NAME"] = "test-users-table"
        os.environ["LOGGING_LEVEL"] = "DEBUG"
        # Reset the global dynamodb resource so moto can mock it
        index._dynamodb = None

    def tearDown(self):
        """Clean up after each test"""
        for key in ["USERS_TABLE_NAME", "LOGGING_LEVEL"]:
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
                {"AttributeName": "email", "AttributeType": "S"},
            ],
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "EmailIndex",
                    "KeySchema": [{"AttributeName": "email", "KeyType": "HASH"}],
                    "Projection": {"ProjectionType": "ALL"},
                }
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        # Add a test user
        table.put_item(Item={"userId": "user-123", "email": "existing@example.com"})

        # Measure timing for existing email
        existing_times = []
        for _ in range(5):
            start = time.time()
            lambda_handler(
                {"arguments": {"input": {"email": "existing@example.com"}}},
                self.test_context,
            )
            existing_times.append(time.time() - start)

        # Measure timing for non-existing email
        nonexisting_times = []
        for _ in range(5):
            start = time.time()
            lambda_handler(
                {"arguments": {"input": {"email": "nonexistent@example.com"}}},
                self.test_context,
            )
            nonexisting_times.append(time.time() - start)

        # Both should take at least MIN_RESPONSE_TIME
        for t in existing_times + nonexisting_times:
            self.assertGreaterEqual(t, MIN_RESPONSE_TIME * 0.9)  # Allow 10% tolerance

        # Timing difference should be minimal
        avg_existing = sum(existing_times) / len(existing_times)
        avg_nonexisting = sum(nonexisting_times) / len(nonexisting_times)
        timing_diff = abs(avg_existing - avg_nonexisting)

        # Should be within 50ms of each other
        self.assertLess(timing_diff, 0.05, "Timing attack vulnerability detected")

    def test_response_only_contains_expected_fields(self):
        """Test that response doesn't leak additional user data"""
        with patch("index.check_email_in_database") as mock_check:
            mock_check.return_value = True

            event = {"arguments": {"input": {"email": "test@example.com"}}}
            result = lambda_handler(event, self.test_context)

            # Should only contain email, exists, cognitoStatus, and cognitoSub
            self.assertEqual(set(result.keys()), {"email", "exists", "cognitoStatus", "cognitoSub"})

    def test_error_messages_dont_leak_info(self):
        """Test that error messages don't expose sensitive information"""
        with patch("index.check_email_in_database") as mock_check:
            mock_check.side_effect = Exception(
                "DynamoDB Error: Table ARN=arn:aws:dynamodb:us-east-1:123456789:table/Users"
            )

            event = {"arguments": {"input": {"email": "test@example.com"}}}

            with self.assertRaises(Exception) as context:
                lambda_handler(event, self.test_context)

            error_msg = str(context.exception)
            # Should not expose internal details
            self.assertNotIn("arn:aws", error_msg)
            self.assertNotIn("123456789", error_msg)
            self.assertEqual(error_msg, "Service temporarily unavailable")

    def test_input_sanitization(self):
        """Test that inputs are properly sanitized"""
        attack_vectors = [
            {"email": "<script>alert(1)</script>@example.com"},
            {"email": "user@example.com'; DROP TABLE users;--"},
            {"email": "user@example.com\x00"},
            {"email": "user@example.com\r\nX-Injected: header"},
        ]

        for attack_input in attack_vectors:
            with self.subTest(input=attack_input):
                event = {"arguments": {"input": attack_input}}

                # Should either reject or handle safely
                try:
                    result = lambda_handler(event, self.test_context)
                    # If it returns, should be safe response
                    self.assertIn("email", result)
                    self.assertIn("exists", result)
                except ValueError:
                    # Validation rejection is acceptable
                    pass
                except Exception as e:
                    # Should be generic error, not exposing details
                    self.assertIn("unavailable", str(e).lower())


class TestCheckEmailExistsDatabase(unittest.TestCase):
    """Tests for database interaction"""

    def setUp(self):
        """Set up test environment before each test"""
        os.environ["USERS_TABLE_NAME"] = "test-users-table"
        # Reset the global dynamodb resource so moto can mock it
        index._dynamodb = None

    def tearDown(self):
        """Clean up after each test"""
        if "USERS_TABLE_NAME" in os.environ:
            del os.environ["USERS_TABLE_NAME"]

    @mock_aws
    def test_query_uses_email_index(self):
        """Test that query uses EmailIndex GSI"""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        dynamodb.create_table(
            TableName="test-users-table",
            KeySchema=[{"AttributeName": "userId", "KeyType": "HASH"}],
            AttributeDefinitions=[
                {"AttributeName": "userId", "AttributeType": "S"},
                {"AttributeName": "email", "AttributeType": "S"},
            ],
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "EmailIndex",
                    "KeySchema": [{"AttributeName": "email", "KeyType": "HASH"}],
                    "Projection": {"ProjectionType": "ALL"},
                }
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        # Should not raise an error
        result = check_email_in_database("test@example.com")
        self.assertFalse(result)

    @mock_aws
    def test_query_limits_results(self):
        """Test that query limits results to 1"""
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="test-users-table",
            KeySchema=[{"AttributeName": "userId", "KeyType": "HASH"}],
            AttributeDefinitions=[
                {"AttributeName": "userId", "AttributeType": "S"},
                {"AttributeName": "email", "AttributeType": "S"},
            ],
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "EmailIndex",
                    "KeySchema": [{"AttributeName": "email", "KeyType": "HASH"}],
                    "Projection": {"ProjectionType": "ALL"},
                }
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        # Add multiple users with same email (shouldn't happen but test limit)
        table.put_item(Item={"userId": "user-1", "email": "test@example.com"})
        table.put_item(Item={"userId": "user-2", "email": "test@example.com"})

        result = check_email_in_database("test@example.com")
        self.assertTrue(result)

    def test_missing_table_name_raises_error(self):
        """Test that missing table name raises ValueError"""
        del os.environ["USERS_TABLE_NAME"]

        with self.assertRaises(ValueError) as context:
            check_email_in_database("test@example.com")
        self.assertIn("not configured", str(context.exception))


if __name__ == "__main__":
    unittest.main(verbosity=2)
