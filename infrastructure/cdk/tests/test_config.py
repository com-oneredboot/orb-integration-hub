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
