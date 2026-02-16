"""Tests for Cognito Advanced Security configuration.

Feature: security-fixes, SEC-FINDING-009

Validates: Requirements 6.1, 6.2, 6.3

Cognito User Pool SHALL have advanced security mode enabled for:
- Compromised credential detection
- Suspicious sign-in detection
- Adaptive authentication
"""

import pytest
from aws_cdk import App
from aws_cdk.assertions import Template

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import Config
from stacks.cognito_stack import CognitoStack


@pytest.fixture
def test_config() -> Config:
    """Create test configuration."""
    return Config(
        customer_id="orb",
        project_id="integration-hub",
        environment="dev",
        region="us-east-1",
        account="123456789012",
        sms_origination_number="+15551234567",
    )


@pytest.fixture
def cognito_template(test_config: Config) -> Template:
    """Create CDK template from CognitoStack."""
    app = App()
    cognito = CognitoStack(app, "Cognito", config=test_config)
    return Template.from_stack(cognito)


class TestCognitoAdvancedSecurity:
    """Tests for Cognito advanced security configuration."""

    def test_user_pool_has_advanced_security(self, cognito_template: Template) -> None:
        """Verify User Pool has advanced security mode enabled.
        
        Note: CDK uses UserPoolAddOns with AdvancedSecurityMode property.
        ENFORCED mode enables all advanced security features.
        """
        cognito_template.has_resource_properties(
            "AWS::Cognito::UserPool",
            {
                "UserPoolAddOns": {
                    "AdvancedSecurityMode": "ENFORCED",
                },
            },
        )

    def test_user_pool_has_mfa_required(self, cognito_template: Template) -> None:
        """Verify User Pool has MFA required (complementary security)."""
        cognito_template.has_resource_properties(
            "AWS::Cognito::UserPool",
            {
                "MfaConfiguration": "ON",
            },
        )

    def test_user_pool_has_device_tracking(self, cognito_template: Template) -> None:
        """Verify User Pool has device tracking enabled."""
        cognito_template.has_resource_properties(
            "AWS::Cognito::UserPool",
            {
                "DeviceConfiguration": {
                    "ChallengeRequiredOnNewDevice": True,
                    "DeviceOnlyRememberedOnUserPrompt": True,
                },
            },
        )
