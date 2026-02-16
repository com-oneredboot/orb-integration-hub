"""Unit tests for CognitoStack."""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from aws_cdk import App
from aws_cdk.assertions import Match, Template

from config import Config
from stacks.cognito_stack import CognitoStack


@pytest.fixture
def test_config() -> Config:
    """Create test configuration."""
    return Config(
        customer_id="test",
        project_id="project",
        environment="dev",
        region="us-east-1",
        account="123456789012",
        sms_origination_number="+15551234567",
    )


@pytest.fixture
def template(test_config: Config) -> Template:
    """Create CDK template from CognitoStack."""
    app = App()
    stack = CognitoStack(
        app,
        "TestCognitoStack",
        config=test_config,
    )
    return Template.from_stack(stack)


class TestCognitoStackUserPool:
    """Tests for Cognito User Pool creation."""

    def test_creates_user_pool(self, template: Template) -> None:
        """Verify User Pool is created with correct name."""
        template.has_resource_properties(
            "AWS::Cognito::UserPool",
            {"UserPoolName": "test-project-dev-user-pool"},
        )

    def test_user_pool_has_password_policy(self, template: Template) -> None:
        """Verify User Pool has correct password policy."""
        template.has_resource_properties(
            "AWS::Cognito::UserPool",
            {
                "Policies": {
                    "PasswordPolicy": {
                        "MinimumLength": 8,
                        "RequireLowercase": True,
                        "RequireUppercase": True,
                        "RequireNumbers": True,
                        "RequireSymbols": True,
                        "TemporaryPasswordValidityDays": 7,
                    }
                }
            },
        )

    def test_user_pool_has_mfa_enabled(self, template: Template) -> None:
        """Verify User Pool has MFA enabled."""
        template.has_resource_properties(
            "AWS::Cognito::UserPool",
            {
                "MfaConfiguration": "ON",
                "EnabledMfas": Match.array_with(["SMS_MFA", "SOFTWARE_TOKEN_MFA"]),
            },
        )

    def test_user_pool_has_email_auto_verify(self, template: Template) -> None:
        """Verify User Pool auto-verifies email."""
        template.has_resource_properties(
            "AWS::Cognito::UserPool",
            {"AutoVerifiedAttributes": ["email"]},
        )


class TestCognitoStackUserGroups:
    """Tests for Cognito User Pool Groups."""

    def test_creates_user_group(self, template: Template) -> None:
        """Verify USER group is created."""
        template.has_resource_properties(
            "AWS::Cognito::UserPoolGroup",
            {
                "GroupName": "USER",
                "Description": "Base group for all users",
            },
        )

    def test_creates_customer_group(self, template: Template) -> None:
        """Verify CUSTOMER group is created."""
        template.has_resource_properties(
            "AWS::Cognito::UserPoolGroup",
            {
                "GroupName": "CUSTOMER",
                "Description": "Group for end-users making purchases",
            },
        )

    def test_creates_client_group(self, template: Template) -> None:
        """Verify CLIENT group is created."""
        template.has_resource_properties(
            "AWS::Cognito::UserPoolGroup",
            {
                "GroupName": "CLIENT",
                "Description": "Group for customers using the integration hub service",
            },
        )

    def test_creates_employee_group(self, template: Template) -> None:
        """Verify EMPLOYEE group is created."""
        template.has_resource_properties(
            "AWS::Cognito::UserPoolGroup",
            {
                "GroupName": "EMPLOYEE",
                "Description": "Group for internal staff",
            },
        )

    def test_creates_owner_group(self, template: Template) -> None:
        """Verify OWNER group is created."""
        template.has_resource_properties(
            "AWS::Cognito::UserPoolGroup",
            {
                "GroupName": "OWNER",
                "Description": "Group for root-level system access",
            },
        )

    def test_creates_five_user_groups(self, template: Template) -> None:
        """Verify exactly five user groups are created."""
        template.resource_count_is("AWS::Cognito::UserPoolGroup", 5)


class TestCognitoStackUserPoolClient:
    """Tests for Cognito User Pool Client."""

    def test_creates_user_pool_client(self, template: Template) -> None:
        """Verify User Pool Client is created."""
        template.has_resource_properties(
            "AWS::Cognito::UserPoolClient",
            {"ClientName": "test-project-dev-user-pool-client"},
        )

    def test_user_pool_client_no_secret(self, template: Template) -> None:
        """Verify User Pool Client does not generate secret."""
        template.has_resource_properties(
            "AWS::Cognito::UserPoolClient",
            {"GenerateSecret": False},
        )

    def test_user_pool_client_prevents_user_existence_errors(self, template: Template) -> None:
        """Verify User Pool Client prevents user existence errors."""
        template.has_resource_properties(
            "AWS::Cognito::UserPoolClient",
            {"PreventUserExistenceErrors": "ENABLED"},
        )


class TestCognitoStackIdentityPool:
    """Tests for Cognito Identity Pool."""

    def test_creates_identity_pool(self, template: Template) -> None:
        """Verify Identity Pool is created."""
        template.has_resource_properties(
            "AWS::Cognito::IdentityPool",
            {"IdentityPoolName": "test-project-dev-identity-pool"},
        )

    def test_identity_pool_disallows_unauthenticated(self, template: Template) -> None:
        """Verify Identity Pool disallows unauthenticated identities."""
        template.has_resource_properties(
            "AWS::Cognito::IdentityPool",
            {"AllowUnauthenticatedIdentities": False},
        )


class TestCognitoStackSSMParameters:
    """Tests for SSM parameter exports using path-based naming."""

    def test_exports_user_pool_id(self, template: Template) -> None:
        """Verify User Pool ID is exported to SSM with path-based naming."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/cognito/user-pool-id",
                "Type": "String",
            },
        )

    def test_exports_user_pool_client_id(self, template: Template) -> None:
        """Verify User Pool Client ID is exported to SSM with path-based naming."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/cognito/client-id",
                "Type": "String",
            },
        )

    def test_exports_qr_issuer(self, template: Template) -> None:
        """Verify QR issuer is exported to SSM with path-based naming."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/cognito/qr-issuer",
                "Type": "String",
            },
        )

    def test_exports_identity_pool_id(self, template: Template) -> None:
        """Verify Identity Pool ID is exported to SSM with path-based naming."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/cognito/identity-pool-id",
                "Type": "String",
            },
        )

    def test_exports_user_pool_arn(self, template: Template) -> None:
        """Verify User Pool ARN is exported to SSM with path-based naming."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/cognito/user-pool-arn",
                "Type": "String",
            },
        )

    def test_exports_sms_verification_topic_arn(self, template: Template) -> None:
        """Verify SMS verification topic ARN is exported to SSM with path-based naming."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/cognito/phone-number-verification-topic/arn",
                "Type": "String",
            },
        )


class TestCognitoStackLambdaTrigger:
    """Tests for Lambda trigger creation."""

    def test_creates_post_confirmation_trigger(self, template: Template) -> None:
        """Verify PostUserConfirmation Lambda trigger is created."""
        template.has_resource_properties(
            "AWS::Lambda::Function",
            {
                "FunctionName": "test-project-dev-PostUserConfirmationTrigger",
                "Runtime": "python3.13",
                "Handler": "index.lambda_handler",
            },
        )

    def test_lambda_has_cognito_permission(self, template: Template) -> None:
        """Verify Lambda has permission to be invoked by Cognito."""
        template.has_resource_properties(
            "AWS::Lambda::Permission",
            {
                "Action": "lambda:InvokeFunction",
                "Principal": "cognito-idp.amazonaws.com",
            },
        )


class TestCognitoStackIAMRoles:
    """Tests for IAM role creation."""

    def test_creates_cognito_sms_role(self, template: Template) -> None:
        """Verify Cognito SMS role is created."""
        template.has_resource_properties(
            "AWS::IAM::Role",
            {"RoleName": "test-project-dev-cognito-sms-role"},
        )

    def test_creates_cognito_lambda_role(self, template: Template) -> None:
        """Verify Cognito Lambda role is created."""
        template.has_resource_properties(
            "AWS::IAM::Role",
            {"RoleName": "test-project-dev-cognito-lambda-role"},
        )

    def test_creates_authorized_role(self, template: Template) -> None:
        """Verify authorized role for authenticated users is created."""
        template.has_resource_properties(
            "AWS::IAM::Role",
            {"RoleName": "test-project-dev-authorized-role"},
        )


class TestCognitoStackSNS:
    """Tests for SNS topic creation."""

    def test_creates_sms_verification_topic(self, template: Template) -> None:
        """Verify SMS verification topic is created."""
        template.has_resource_properties(
            "AWS::SNS::Topic",
            {
                "TopicName": "test-project-dev-phone-number-verification",
                "DisplayName": "test-project-dev-phone-number-verification",
            },
        )


class TestCognitoStackS3:
    """Tests for S3 bucket creation."""

    def test_creates_cognito_logs_bucket(self, template: Template) -> None:
        """Verify Cognito logs bucket is created."""
        template.has_resource_properties(
            "AWS::S3::Bucket",
            {
                "BucketName": "test-project-dev-cognito-logs",
                "PublicAccessBlockConfiguration": {
                    "BlockPublicAcls": True,
                    "BlockPublicPolicy": True,
                    "IgnorePublicAcls": True,
                    "RestrictPublicBuckets": True,
                },
            },
        )


class TestCognitoStackTags:
    """Tests for resource tagging."""

    def test_user_pool_has_standard_tags(self, template: Template) -> None:
        """Verify User Pool has standard tags."""
        template.has_resource_properties(
            "AWS::Cognito::UserPool",
            {
                "UserPoolTags": {
                    "Billable": "true",
                    "CustomerId": "test",
                    "Environment": "dev",
                    "ProjectId": "project",
                }
            },
        )
