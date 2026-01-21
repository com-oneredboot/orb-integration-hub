# file: apps/api/lambdas/create_user_from_cognito/test_create_user_from_cognito_property.py
# author: Corey Dale Peters
# created: 2026-01-21
# description: Property-based tests for CreateUserFromCognito Lambda function
#              These tests validate universal properties across many generated inputs.
# ruff: noqa: E402

import importlib.util
import os
import sys
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

from hypothesis import assume, given, settings
import hypothesis.strategies as st

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
extract_cognito_attributes = index.extract_cognito_attributes
MIN_RESPONSE_TIME = index.MIN_RESPONSE_TIME


# Custom strategies for generating test data
uuid_strategy = st.uuids().map(str)
invalid_uuid_strategy = st.one_of(
    st.text(min_size=0, max_size=50).filter(lambda x: not validate_uuid(x)),
    st.just(""),
    st.just("not-a-uuid"),
    st.just("550e8400-e29b-41d4"),  # Too short
    st.just("550e8400-e29b-41d4-a716-446655440000-extra"),  # Too long
)

email_strategy = st.emails()
name_strategy = st.text(
    min_size=0, max_size=100, alphabet=st.characters(whitelist_categories=("L", "N", "P", "Z"))
)


def make_cognito_user(sub: str, email: str, first_name: str, last_name: str, email_verified: bool):
    """Create a mock Cognito user response."""
    return {
        "username": sub,
        "status": "CONFIRMED",
        "attributes": {
            "email": email,
            "given_name": first_name,
            "family_name": last_name,
            "email_verified": "true" if email_verified else "false",
            "sub": sub,
        },
    }


def make_user_record(
    sub: str,
    email: str,
    first_name: str,
    last_name: str,
    status: str = "PENDING",
    groups: list = None,
):
    """Create a mock DynamoDB user record."""
    return {
        "userId": sub,
        "cognitoId": sub,
        "cognitoSub": sub,
        "email": email,
        "firstName": first_name,
        "lastName": last_name,
        "status": status,
        "emailVerified": True,
        "phoneVerified": False,
        "mfaEnabled": True,
        "mfaSetupComplete": True,
        "groups": groups or ["USER"],
        "createdAt": 1234567890,
        "updatedAt": 1234567890,
    }


class TestProperty1CognitoValidation:
    """
    Feature: create-user-from-cognito, Property 1: Cognito Validation

    For any cognitoSub input, the Lambda SHALL call Cognito to validate the user
    exists before creating a DynamoDB record. If the user does not exist in Cognito,
    the Lambda SHALL return an error without creating any record.

    Validates: Requirements 2.1, 2.6
    """

    def setup_method(self):
        """Set up test environment before each test"""
        os.environ["USERS_TABLE_NAME"] = "test-users-table"
        os.environ["USER_POOL_ID"] = "us-east-1_TestPool"
        os.environ["LOGGING_LEVEL"] = "ERROR"
        index._dynamodb = None
        index._cognito = None

    def teardown_method(self):
        """Clean up after each test"""
        for key in ["USERS_TABLE_NAME", "USER_POOL_ID", "LOGGING_LEVEL"]:
            if key in os.environ:
                del os.environ[key]

    @settings(max_examples=100)
    @given(cognito_sub=uuid_strategy, email=email_strategy)
    def test_cognito_called_for_new_users(self, cognito_sub: str, email: str):
        """
        Feature: create-user-from-cognito, Property 1: Cognito Validation

        For any valid cognitoSub where user doesn't exist in DynamoDB,
        Cognito MUST be called to validate the user.

        Validates: Requirements 2.1, 2.6
        """
        with patch.object(index, "query_user_by_cognito_sub") as mock_query, patch.object(
            index, "get_cognito_user"
        ) as mock_cognito, patch.object(index, "create_user_record") as mock_create:

            mock_query.return_value = None  # User doesn't exist in DynamoDB
            mock_cognito.return_value = make_cognito_user(cognito_sub, email, "Test", "User", True)
            mock_create.return_value = make_user_record(cognito_sub, email, "Test", "User")

            event = {"arguments": {"input": {"cognitoSub": cognito_sub}}}
            lambda_handler(event, MagicMock())

            # Cognito MUST be called
            mock_cognito.assert_called_once_with(cognito_sub)

    @settings(max_examples=100)
    @given(cognito_sub=uuid_strategy)
    def test_no_record_created_when_cognito_user_not_found(self, cognito_sub: str):
        """
        Feature: create-user-from-cognito, Property 1: Cognito Validation

        For any valid cognitoSub where user doesn't exist in Cognito,
        no DynamoDB record SHALL be created.

        Validates: Requirements 2.1, 2.6
        """
        with patch.object(index, "query_user_by_cognito_sub") as mock_query, patch.object(
            index, "get_cognito_user"
        ) as mock_cognito, patch.object(index, "create_user_record") as mock_create:

            mock_query.return_value = None  # User doesn't exist in DynamoDB
            mock_cognito.return_value = None  # User doesn't exist in Cognito

            event = {"arguments": {"input": {"cognitoSub": cognito_sub}}}

            try:
                lambda_handler(event, MagicMock())
                assert False, "Should have raised an exception"
            except Exception as e:
                assert "User not found" in str(e)

            # create_user_record should NOT be called
            mock_create.assert_not_called()


class TestProperty2DataSourceIntegrity:
    """
    Feature: create-user-from-cognito, Property 2: Data Source Integrity

    For any successful CreateUserFromCognito call, the returned user data SHALL
    contain only data extracted from Cognito and server-generated values.
    No client-provided data (other than cognitoSub) SHALL appear in the output.

    Validates: Requirements 2.2, 2.3, 2.5
    """

    def setup_method(self):
        """Set up test environment before each test"""
        os.environ["USERS_TABLE_NAME"] = "test-users-table"
        os.environ["USER_POOL_ID"] = "us-east-1_TestPool"
        os.environ["LOGGING_LEVEL"] = "ERROR"
        index._dynamodb = None
        index._cognito = None

    def teardown_method(self):
        """Clean up after each test"""
        for key in ["USERS_TABLE_NAME", "USER_POOL_ID", "LOGGING_LEVEL"]:
            if key in os.environ:
                del os.environ[key]

    @settings(max_examples=100)
    @given(
        cognito_sub=uuid_strategy,
        cognito_email=email_strategy,
        cognito_first=name_strategy,
        cognito_last=name_strategy,
        cognito_verified=st.booleans(),
        client_email=email_strategy,
        client_first=name_strategy,
        client_status=st.sampled_from(["ACTIVE", "ADMIN", "OWNER"]),
    )
    def test_only_cognito_data_in_output(
        self,
        cognito_sub: str,
        cognito_email: str,
        cognito_first: str,
        cognito_last: str,
        cognito_verified: bool,
        client_email: str,
        client_first: str,
        client_status: str,
    ):
        """
        Feature: create-user-from-cognito, Property 2: Data Source Integrity

        For any input where client provides extra data, the output SHALL only
        contain Cognito-provided data and server defaults.

        Validates: Requirements 2.2, 2.3, 2.5
        """
        # Ensure client data differs from Cognito data
        assume(client_email != cognito_email)
        assume(client_first != cognito_first)

        with patch.object(index, "query_user_by_cognito_sub") as mock_query, patch.object(
            index, "get_cognito_user"
        ) as mock_cognito, patch.object(index, "create_user_record") as mock_create:

            mock_query.return_value = None
            mock_cognito.return_value = make_cognito_user(
                cognito_sub, cognito_email, cognito_first, cognito_last, cognito_verified
            )

            # Create returns record with Cognito data
            created_record = make_user_record(
                cognito_sub, cognito_email, cognito_first, cognito_last
            )
            mock_create.return_value = created_record

            # Client tries to inject malicious data
            event = {
                "arguments": {
                    "input": {
                        "cognitoSub": cognito_sub,
                        "email": client_email,  # Should be ignored
                        "firstName": client_first,  # Should be ignored
                        "status": client_status,  # Should be ignored
                        "groups": ["OWNER"],  # Should be ignored
                    }
                }
            }

            result = lambda_handler(event, MagicMock())

            # Verify Cognito data is used, not client data
            assert result["email"] == cognito_email, "Email should come from Cognito"
            assert result["firstName"] == cognito_first, "FirstName should come from Cognito"

            # Verify server defaults
            assert result["status"] == "PENDING", "Status should be PENDING"
            assert result["groups"] == ["USER"], "Groups should be ['USER']"

    @settings(max_examples=100)
    @given(
        cognito_sub=uuid_strategy,
        email=email_strategy,
        first_name=name_strategy,
        last_name=name_strategy,
        email_verified=st.booleans(),
    )
    def test_extract_cognito_attributes_complete(
        self, cognito_sub: str, email: str, first_name: str, last_name: str, email_verified: bool
    ):
        """
        Feature: create-user-from-cognito, Property 2: Data Source Integrity

        For any Cognito user response, all expected attributes SHALL be extracted.

        Validates: Requirements 2.2, 2.3, 2.5
        """
        cognito_user = make_cognito_user(cognito_sub, email, first_name, last_name, email_verified)

        result = extract_cognito_attributes(cognito_user)

        assert result["email"] == email
        assert result["firstName"] == first_name
        assert result["lastName"] == last_name
        assert result["emailVerified"] == email_verified
        assert result["sub"] == cognito_sub


class TestProperty3Idempotency:
    """
    Feature: create-user-from-cognito, Property 3: Idempotency

    For any cognitoSub that already has a DynamoDB record, calling
    CreateUserFromCognito SHALL return the existing user without creating
    a duplicate.

    Validates: Requirements 2.7
    """

    def setup_method(self):
        """Set up test environment before each test"""
        os.environ["USERS_TABLE_NAME"] = "test-users-table"
        os.environ["USER_POOL_ID"] = "us-east-1_TestPool"
        os.environ["LOGGING_LEVEL"] = "ERROR"
        index._dynamodb = None
        index._cognito = None

    def teardown_method(self):
        """Clean up after each test"""
        for key in ["USERS_TABLE_NAME", "USER_POOL_ID", "LOGGING_LEVEL"]:
            if key in os.environ:
                del os.environ[key]

    @settings(max_examples=100)
    @given(
        cognito_sub=uuid_strategy,
        email=email_strategy,
        first_name=name_strategy,
        last_name=name_strategy,
        status=st.sampled_from(["PENDING", "ACTIVE", "INACTIVE"]),
        groups=st.lists(
            st.sampled_from(["USER", "CUSTOMER", "EMPLOYEE", "OWNER"]), min_size=1, max_size=3
        ),
    )
    def test_existing_user_returned_unchanged(
        self,
        cognito_sub: str,
        email: str,
        first_name: str,
        last_name: str,
        status: str,
        groups: list,
    ):
        """
        Feature: create-user-from-cognito, Property 3: Idempotency

        For any existing user, calling CreateUserFromCognito SHALL return
        the existing user data unchanged.

        Validates: Requirements 2.7
        """
        existing_record = make_user_record(
            cognito_sub, email, first_name, last_name, status, groups
        )

        with patch.object(index, "query_user_by_cognito_sub") as mock_query, patch.object(
            index, "get_cognito_user"
        ) as mock_cognito, patch.object(index, "create_user_record") as mock_create:

            mock_query.return_value = existing_record

            event = {"arguments": {"input": {"cognitoSub": cognito_sub}}}
            result = lambda_handler(event, MagicMock())

            # Cognito should NOT be called (short-circuit)
            mock_cognito.assert_not_called()

            # create_user_record should NOT be called
            mock_create.assert_not_called()

            # Existing data should be preserved
            assert result["userId"] == cognito_sub
            assert result["email"] == email
            assert result["firstName"] == first_name
            assert result["lastName"] == last_name
            assert result["status"] == status
            assert result["groups"] == groups


class TestProperty4InputValidation:
    """
    Feature: create-user-from-cognito, Property 4: Input Validation

    For any string input that is not a valid UUID format, the Lambda SHALL
    reject it with a generic error message.

    Validates: Requirements 5.1, 5.4
    """

    def setup_method(self):
        """Set up test environment before each test"""
        os.environ["USERS_TABLE_NAME"] = "test-users-table"
        os.environ["USER_POOL_ID"] = "us-east-1_TestPool"
        os.environ["LOGGING_LEVEL"] = "ERROR"
        index._dynamodb = None
        index._cognito = None

    def teardown_method(self):
        """Clean up after each test"""
        for key in ["USERS_TABLE_NAME", "USER_POOL_ID", "LOGGING_LEVEL"]:
            if key in os.environ:
                del os.environ[key]

    @settings(max_examples=100)
    @given(invalid_input=invalid_uuid_strategy)
    def test_invalid_uuid_rejected(self, invalid_input: str):
        """
        Feature: create-user-from-cognito, Property 4: Input Validation

        For any invalid UUID input, the Lambda SHALL reject with generic error.

        Validates: Requirements 5.1, 5.4
        """
        event = {"arguments": {"input": {"cognitoSub": invalid_input}}}

        try:
            lambda_handler(event, MagicMock())
            assert False, f"Should have rejected invalid input: {invalid_input}"
        except ValueError as e:
            # Error message should be generic
            assert "Invalid request format" in str(e)
            # Should NOT reveal what was invalid (only check for inputs > 3 chars
            # to avoid false positives from short strings appearing in error message)
            if len(invalid_input) > 3:
                assert invalid_input not in str(
                    e
                ), f"Error message should not contain input: {invalid_input}"

    @settings(max_examples=100)
    @given(valid_uuid=uuid_strategy)
    def test_valid_uuid_accepted(self, valid_uuid: str):
        """
        Feature: create-user-from-cognito, Property 4: Input Validation

        For any valid UUID input, the Lambda SHALL accept it.

        Validates: Requirements 5.1, 5.4
        """
        assert validate_uuid(valid_uuid), f"Should accept valid UUID: {valid_uuid}"

    @settings(max_examples=100)
    @given(random_string=st.text(min_size=0, max_size=100))
    def test_uuid_validation_consistent(self, random_string: str):
        """
        Feature: create-user-from-cognito, Property 4: Input Validation

        UUID validation should be consistent - same input always gives same result.

        Validates: Requirements 5.1, 5.4
        """
        result1 = validate_uuid(random_string)
        result2 = validate_uuid(random_string)
        assert result1 == result2, "UUID validation should be deterministic"


class TestProperty5TimingConsistency:
    """
    Feature: create-user-from-cognito, Property 5: Timing Consistency

    For any input (valid or invalid), the Lambda response time SHALL be at
    least MIN_RESPONSE_TIME to prevent timing-based enumeration attacks.

    Validates: Requirements 5.2
    """

    def setup_method(self):
        """Set up test environment before each test"""
        os.environ["USERS_TABLE_NAME"] = "test-users-table"
        os.environ["USER_POOL_ID"] = "us-east-1_TestPool"
        os.environ["LOGGING_LEVEL"] = "ERROR"
        index._dynamodb = None
        index._cognito = None

    def teardown_method(self):
        """Clean up after each test"""
        for key in ["USERS_TABLE_NAME", "USER_POOL_ID", "LOGGING_LEVEL"]:
            if key in os.environ:
                del os.environ[key]

    @settings(max_examples=20)  # Fewer examples due to timing
    @given(cognito_sub=uuid_strategy, email=email_strategy)
    def test_min_response_time_success(self, cognito_sub: str, email: str):
        """
        Feature: create-user-from-cognito, Property 5: Timing Consistency

        For successful requests, response time SHALL be at least MIN_RESPONSE_TIME.

        Validates: Requirements 5.2
        """
        with patch.object(index, "query_user_by_cognito_sub") as mock_query:
            mock_query.return_value = make_user_record(cognito_sub, email, "Test", "User")

            event = {"arguments": {"input": {"cognitoSub": cognito_sub}}}

            start = time.time()
            lambda_handler(event, MagicMock())
            elapsed = time.time() - start

            assert (
                elapsed >= MIN_RESPONSE_TIME * 0.9
            ), f"Response time {elapsed}s should be >= {MIN_RESPONSE_TIME}s"

    @settings(max_examples=20)  # Fewer examples due to timing
    @given(invalid_input=invalid_uuid_strategy)
    def test_min_response_time_failure(self, invalid_input: str):
        """
        Feature: create-user-from-cognito, Property 5: Timing Consistency

        For failed requests, response time SHALL be at least MIN_RESPONSE_TIME.

        Validates: Requirements 5.2
        """
        event = {"arguments": {"input": {"cognitoSub": invalid_input}}}

        start = time.time()
        try:
            lambda_handler(event, MagicMock())
        except ValueError:
            pass
        elapsed = time.time() - start

        assert (
            elapsed >= MIN_RESPONSE_TIME * 0.9
        ), f"Response time {elapsed}s should be >= {MIN_RESPONSE_TIME}s"


if __name__ == "__main__":
    import pytest

    pytest.main([__file__, "-v"])
