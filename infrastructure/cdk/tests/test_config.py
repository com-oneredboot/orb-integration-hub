"""Tests for Config class."""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from config import Config


class TestConfigSSMParameterName:
    """Tests for ssm_parameter_name method."""

    @pytest.fixture
    def config(self) -> Config:
        """Create a test config."""
        return Config(
            customer_id="orb",
            project_id="integration-hub",
            environment="dev",
            region="us-east-1",
            account="123456789012",
            sms_origination_number="+15551234567",
        )

    def test_ssm_parameter_name_returns_path_format(self, config: Config) -> None:
        """Test that ssm_parameter_name returns path-based format."""
        result = config.ssm_parameter_name("cognito/user-pool-id")
        assert result == "/orb/integration-hub/dev/cognito/user-pool-id"

    def test_ssm_parameter_name_starts_with_slash(self, config: Config) -> None:
        """Test that ssm_parameter_name starts with /."""
        result = config.ssm_parameter_name("test/param")
        assert result.startswith("/")

    def test_ssm_parameter_name_contains_customer_id(self, config: Config) -> None:
        """Test that ssm_parameter_name contains customer_id."""
        result = config.ssm_parameter_name("test/param")
        assert "/orb/" in result

    def test_ssm_parameter_name_contains_project_id(self, config: Config) -> None:
        """Test that ssm_parameter_name contains project_id."""
        result = config.ssm_parameter_name("test/param")
        assert "/integration-hub/" in result

    def test_ssm_parameter_name_contains_environment(self, config: Config) -> None:
        """Test that ssm_parameter_name contains environment."""
        result = config.ssm_parameter_name("test/param")
        assert "/dev/" in result

    def test_ssm_parameter_name_nested_path(self, config: Config) -> None:
        """Test that ssm_parameter_name handles nested paths."""
        result = config.ssm_parameter_name("lambda-layers/organizations-security/arn")
        assert result == "/orb/integration-hub/dev/lambda-layers/organizations-security/arn"

    def test_ssm_parameter_name_different_environment(self) -> None:
        """Test that ssm_parameter_name uses correct environment."""
        config = Config(
            customer_id="orb",
            project_id="integration-hub",
            environment="prod",
            region="us-east-1",
            account="123456789012",
            sms_origination_number="+15551234567",
        )
        result = config.ssm_parameter_name("cognito/user-pool-id")
        assert result == "/orb/integration-hub/prod/cognito/user-pool-id"


class TestConfigSecretName:
    """Tests for secret_name method."""

    @pytest.fixture
    def config(self) -> Config:
        """Create a test config."""
        return Config(
            customer_id="orb",
            project_id="integration-hub",
            environment="dev",
            region="us-east-1",
            account="123456789012",
            sms_origination_number="+15551234567",
        )

    def test_secret_name_returns_path_format(self, config: Config) -> None:
        """Test that secret_name returns path-based format."""
        result = config.secret_name("github", "access-key")
        assert result == "orb/integration-hub/dev/secrets/github/access-key"

    def test_secret_name_does_not_start_with_slash(self, config: Config) -> None:
        """Test that secret_name does not start with / (Secrets Manager convention)."""
        result = config.secret_name("test", "param")
        assert not result.startswith("/")

    def test_secret_name_contains_secrets_segment(self, config: Config) -> None:
        """Test that secret_name contains /secrets/ segment."""
        result = config.secret_name("test", "param")
        assert "/secrets/" in result

    def test_secret_name_github_access_key(self, config: Config) -> None:
        """Test GitHub Actions secret naming."""
        result = config.secret_name("github", "access-key")
        assert result == "orb/integration-hub/dev/secrets/github/access-key"

    def test_secret_name_appsync_api_key(self, config: Config) -> None:
        """Test AppSync API key secret naming."""
        result = config.secret_name("appsync", "api-key")
        assert result == "orb/integration-hub/dev/secrets/appsync/api-key"

    def test_secret_name_sms_verification(self, config: Config) -> None:
        """Test SMS verification secret naming."""
        result = config.secret_name("sms", "verification")
        assert result == "orb/integration-hub/dev/secrets/sms/verification"

    def test_secret_name_different_environment(self) -> None:
        """Test that secret_name uses correct environment."""
        config = Config(
            customer_id="orb",
            project_id="integration-hub",
            environment="prod",
            region="us-east-1",
            account="123456789012",
            sms_origination_number="+15551234567",
        )
        result = config.secret_name("github", "access-key")
        assert result == "orb/integration-hub/prod/secrets/github/access-key"


class TestConfigSecretNameProperty:
    """Property-based tests for secret_name method.

    Feature: secrets-naming-convention
    Property 1: Secret Name Format Consistency
    Validates: Requirements 1.1, 1.2
    """

    @pytest.fixture
    def config(self) -> Config:
        """Create a test config."""
        return Config(
            customer_id="orb",
            project_id="integration-hub",
            environment="dev",
            region="us-east-1",
            account="123456789012",
            sms_origination_number="+15551234567",
        )

    @pytest.mark.parametrize(
        "service,resource",
        [
            ("github", "access-key"),
            ("appsync", "api-key"),
            ("sms", "verification"),
            ("cognito", "client-secret"),
            ("stripe", "api-key"),
            ("twilio", "auth-token"),
        ],
    )
    def test_secret_name_format_consistency(
        self, config: Config, service: str, resource: str
    ) -> None:
        """Property 1: Secret Name Format Consistency.

        For any valid service and resource, secret_name SHALL return a string
        matching the pattern {customer_id}/{project_id}/{environment}/secrets/{service}/{resource}.

        Validates: Requirements 1.1, 1.2
        """
        result = config.secret_name(service, resource)

        # Verify format: {customer_id}/{project_id}/{environment}/secrets/{service}/{resource}
        parts = result.split("/")
        assert len(parts) == 6, f"Expected 6 parts, got {len(parts)}: {result}"
        assert parts[0] == config.customer_id
        assert parts[1] == config.project_id
        assert parts[2] == config.environment
        assert parts[3] == "secrets"
        assert parts[4] == service
        assert parts[5] == resource


class TestConfigResourceNameProperty:
    """Property-based tests for resource_name method.

    Feature: secrets-naming-convention
    Property 2: Resource Name Backward Compatibility
    Validates: Requirements 1.3
    """

    @pytest.fixture
    def config(self) -> Config:
        """Create a test config."""
        return Config(
            customer_id="orb",
            project_id="integration-hub",
            environment="dev",
            region="us-east-1",
            account="123456789012",
            sms_origination_number="+15551234567",
        )

    @pytest.mark.parametrize(
        "name",
        [
            "users",
            "organizations",
            "applications",
            "lambda-layer",
            "api-gateway",
            "dynamodb-table",
        ],
    )
    def test_resource_name_backward_compatibility(self, config: Config, name: str) -> None:
        """Property 2: Resource Name Backward Compatibility.

        For any valid resource name, resource_name SHALL return a string
        matching the pattern {customer_id}-{project_id}-{environment}-{name}.

        Validates: Requirements 1.3
        """
        result = config.resource_name(name)

        # Verify format: {customer_id}-{project_id}-{environment}-{name}
        expected = f"{config.customer_id}-{config.project_id}-{config.environment}-{name}"
        assert result == expected

        # Verify uses dashes (not slashes)
        assert "/" not in result
        assert "-" in result
