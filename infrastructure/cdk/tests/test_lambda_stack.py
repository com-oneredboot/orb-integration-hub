"""Unit tests for LambdaStack.

Note: Lambda layers are deployed separately and referenced via SSM parameters.
The test creates a mock SSM parameter for the layer ARN.
"""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from aws_cdk import App
from aws_cdk.assertions import Match, Template
from aws_cdk import aws_ssm as ssm

from config import Config
from stacks.cognito_stack import CognitoStack
from stacks.dynamodb_stack import DynamoDBStack
from stacks.lambda_stack import LambdaStack


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
    """Create CDK template from LambdaStack with dependencies.
    
    Note: Lambda layers are deployed separately. The lambda stack reads
    layer ARNs from SSM parameters. For testing, we create a mock SSM
    parameter in the same app.
    """
    app = App()

    # Create dependency stacks
    cognito_stack = CognitoStack(
        app,
        "TestCognitoStack",
        config=test_config,
    )
    dynamodb_stack = DynamoDBStack(
        app,
        "TestDynamoDBStack",
        config=test_config,
    )
    
    # Create mock SSM parameter for layer ARN (normally created by lambda-layers stack)
    # This simulates the SSM parameter that would exist after lambda-layers deployment
    # Uses path-based naming: /customer/project/env/lambda-layers/layer-name/arn
    ssm.StringParameter(
        cognito_stack,  # Add to cognito stack to avoid circular dependency
        "MockOrganizationsSecurityLayerArn",
        parameter_name=test_config.ssm_parameter_name("lambda-layers/organizations-security/arn"),
        string_value="arn:aws:lambda:us-east-1:123456789012:layer:test-project-dev-organizations-security-layer:1",
    )

    # Create Lambda stack (no layers_stack dependency - reads from SSM)
    stack = LambdaStack(
        app,
        "TestLambdaStack",
        config=test_config,
        cognito_stack=cognito_stack,
        dynamodb_stack=dynamodb_stack,
    )
    return Template.from_stack(stack)


class TestLambdaStackFunctionCount:
    """Tests for Lambda function count."""

    def test_creates_seven_lambda_functions(self, template: Template) -> None:
        """Verify exactly 7 Lambda functions are created."""
        template.resource_count_is("AWS::Lambda::Function", 7)


class TestLambdaStackIAMRole:
    """Tests for Lambda execution role."""

    def test_creates_lambda_execution_role(self, template: Template) -> None:
        """Verify Lambda execution role is created."""
        template.has_resource_properties(
            "AWS::IAM::Role",
            {
                "RoleName": "test-project-dev-lambda-execution-role",
                "AssumeRolePolicyDocument": {
                    "Statement": Match.array_with([
                        Match.object_like({
                            "Action": "sts:AssumeRole",
                            "Effect": "Allow",
                            "Principal": {"Service": "lambda.amazonaws.com"},
                        })
                    ]),
                },
            },
        )

    def test_role_has_managed_policy_arns(self, template: Template) -> None:
        """Verify role has managed policy ARNs attached."""
        template.has_resource_properties(
            "AWS::IAM::Role",
            {
                "RoleName": "test-project-dev-lambda-execution-role",
                "ManagedPolicyArns": Match.any_value(),
            },
        )


class TestLambdaStackSmsVerificationLambda:
    """Tests for SMS Verification Lambda."""

    def test_creates_sms_verification_lambda(self, template: Template) -> None:
        """Verify SMS Verification Lambda is created."""
        template.has_resource_properties(
            "AWS::Lambda::Function",
            {
                "FunctionName": "test-project-dev-sms-verification",
                "Runtime": "python3.12",
                "Handler": "index.lambda_handler",
                "MemorySize": 256,
                "Timeout": 30,
            },
        )

    def test_sms_verification_has_environment_variables(self, template: Template) -> None:
        """Verify SMS Verification Lambda has required environment variables."""
        template.has_resource_properties(
            "AWS::Lambda::Function",
            {
                "FunctionName": "test-project-dev-sms-verification",
                "Environment": {
                    "Variables": Match.object_like({
                        "SMS_ORIGINATION_NUMBER": "+15551234567",
                        "SMS_VERIFICATION_SECRET_NAME": "test-project-dev-sms-verification-secret",
                        "LOGGING_LEVEL": "INFO",
                    }),
                },
            },
        )


class TestLambdaStackCognitoGroupManagerLambda:
    """Tests for Cognito Group Manager Lambda."""

    def test_creates_cognito_group_manager_lambda(self, template: Template) -> None:
        """Verify Cognito Group Manager Lambda is created."""
        template.has_resource_properties(
            "AWS::Lambda::Function",
            {
                "FunctionName": "test-project-dev-cognito-group-manager",
                "Description": "Lambda function to manage Cognito User Pool groups",
                "Runtime": "python3.12",
                "Handler": "index.lambda_handler",
            },
        )


class TestLambdaStackUserStatusCalculatorLambda:
    """Tests for User Status Calculator Lambda."""

    def test_creates_user_status_calculator_lambda(self, template: Template) -> None:
        """Verify User Status Calculator Lambda is created."""
        template.has_resource_properties(
            "AWS::Lambda::Function",
            {
                "FunctionName": "test-project-dev-user-status-calculator",
                "Description": "Lambda function triggered by DynamoDB streams to automatically calculate user status",
                "Runtime": "python3.12",
            },
        )

    def test_user_status_calculator_has_dynamodb_stream_trigger(self, template: Template) -> None:
        """Verify User Status Calculator has DynamoDB stream event source mapping."""
        template.has_resource_properties(
            "AWS::Lambda::EventSourceMapping",
            {
                "BatchSize": 10,
                "MaximumBatchingWindowInSeconds": 5,
                "StartingPosition": "LATEST",
            },
        )


class TestLambdaStackOrganizationsLambda:
    """Tests for Organizations Lambda."""

    def test_creates_organizations_lambda(self, template: Template) -> None:
        """Verify Organizations Lambda is created."""
        template.has_resource_properties(
            "AWS::Lambda::Function",
            {
                "FunctionName": "test-project-dev-organizations",
                "Description": "Lambda function to handle organizations CRUD operations",
                "Runtime": "python3.12",
            },
        )

    def test_organizations_lambda_has_layer(self, template: Template) -> None:
        """Verify Organizations Lambda has layer reference."""
        template.has_resource_properties(
            "AWS::Lambda::Function",
            {
                "FunctionName": "test-project-dev-organizations",
                "Layers": Match.any_value(),
            },
        )


class TestLambdaStackCheckEmailExistsLambda:
    """Tests for CheckEmailExists Lambda."""

    def test_creates_check_email_exists_lambda(self, template: Template) -> None:
        """Verify CheckEmailExists Lambda is created."""
        template.has_resource_properties(
            "AWS::Lambda::Function",
            {
                "FunctionName": "test-project-dev-check-email-exists",
                "Description": "Lambda function to check if an email exists (public endpoint)",
                "Runtime": "python3.12",
                "Handler": "index.lambda_handler",
                "MemorySize": 128,
                "Timeout": 10,
            },
        )

    def test_check_email_exists_has_environment_variables(self, template: Template) -> None:
        """Verify CheckEmailExists Lambda has required environment variables."""
        template.has_resource_properties(
            "AWS::Lambda::Function",
            {
                "FunctionName": "test-project-dev-check-email-exists",
                "Environment": {
                    "Variables": Match.object_like({
                        "LOGGING_LEVEL": "INFO",
                        "USER_POOL_ID": Match.any_value(),
                    }),
                },
            },
        )


class TestLambdaStackCreateUserFromCognitoLambda:
    """Tests for CreateUserFromCognito Lambda."""

    def test_creates_create_user_from_cognito_lambda(self, template: Template) -> None:
        """Verify CreateUserFromCognito Lambda is created."""
        template.has_resource_properties(
            "AWS::Lambda::Function",
            {
                "FunctionName": "test-project-dev-create-user-from-cognito",
                "Description": "Lambda function to create user records from Cognito data (public endpoint)",
                "Runtime": "python3.12",
                "Handler": "index.lambda_handler",
                "MemorySize": 128,
                "Timeout": 10,
            },
        )

    def test_create_user_from_cognito_has_environment_variables(self, template: Template) -> None:
        """Verify CreateUserFromCognito Lambda has required environment variables."""
        template.has_resource_properties(
            "AWS::Lambda::Function",
            {
                "FunctionName": "test-project-dev-create-user-from-cognito",
                "Environment": {
                    "Variables": Match.object_like({
                        "LOGGING_LEVEL": "INFO",
                        "USER_POOL_ID": Match.any_value(),
                    }),
                },
            },
        )


class TestLambdaStackGetCurrentUserLambda:
    """Tests for GetCurrentUser Lambda."""

    def test_creates_get_current_user_lambda(self, template: Template) -> None:
        """Verify GetCurrentUser Lambda is created."""
        template.has_resource_properties(
            "AWS::Lambda::Function",
            {
                "FunctionName": "test-project-dev-get-current-user",
                "Description": "Lambda function to get current user's own record (secure self-lookup)",
                "Runtime": "python3.12",
                "Handler": "index.lambda_handler",
                "MemorySize": 128,
                "Timeout": 10,
            },
        )

    def test_get_current_user_has_environment_variables(self, template: Template) -> None:
        """Verify GetCurrentUser Lambda has required environment variables."""
        template.has_resource_properties(
            "AWS::Lambda::Function",
            {
                "FunctionName": "test-project-dev-get-current-user",
                "Environment": {
                    "Variables": Match.object_like({
                        "LOGGING_LEVEL": "INFO",
                        "USERS_TABLE_NAME": Match.any_value(),
                    }),
                },
            },
        )

    def test_get_current_user_has_layer(self, template: Template) -> None:
        """Verify GetCurrentUser Lambda has common layer reference."""
        template.has_resource_properties(
            "AWS::Lambda::Function",
            {
                "FunctionName": "test-project-dev-get-current-user",
                "Layers": Match.any_value(),
            },
        )


class TestLambdaStackSSMParameters:
    """Tests for SSM parameter exports using path-based naming."""

    def test_exports_sms_verification_lambda_arn(self, template: Template) -> None:
        """Verify SMS Verification Lambda ARN is exported to SSM with path-based naming."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                # Note: Uses lowercase no-hyphens to match orb-schema-generator convention
                "Name": "/test/project/dev/lambda/smsverification/arn",
                "Type": "String",
            },
        )

    def test_exports_cognito_group_manager_lambda_arn(self, template: Template) -> None:
        """Verify Cognito Group Manager Lambda ARN is exported to SSM with path-based naming."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/lambda/cognito-group-manager/arn",
                "Type": "String",
            },
        )

    def test_exports_user_status_calculator_lambda_arn(self, template: Template) -> None:
        """Verify User Status Calculator Lambda ARN is exported to SSM with path-based naming."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/lambda/user-status-calculator/arn",
                "Type": "String",
            },
        )

    def test_exports_organizations_lambda_arn(self, template: Template) -> None:
        """Verify Organizations Lambda ARN is exported to SSM with path-based naming."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/lambda/organizations/arn",
                "Type": "String",
            },
        )

    def test_exports_check_email_exists_lambda_arn(self, template: Template) -> None:
        """Verify CheckEmailExists Lambda ARN is exported to SSM with path-based naming."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/lambda/checkemailexists/arn",
                "Type": "String",
            },
        )

    def test_exports_create_user_from_cognito_lambda_arn(self, template: Template) -> None:
        """Verify CreateUserFromCognito Lambda ARN is exported to SSM with path-based naming."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/lambda/createuserfromcognito/arn",
                "Type": "String",
            },
        )

    def test_exports_get_current_user_lambda_arn(self, template: Template) -> None:
        """Verify GetCurrentUser Lambda ARN is exported to SSM with path-based naming."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/lambda/getcurrentuser/arn",
                "Type": "String",
            },
        )


class TestLambdaStackTags:
    """Tests for resource tagging."""

    def test_lambda_functions_have_standard_tags(self, template: Template) -> None:
        """Verify Lambda functions have standard tags."""
        template.has_resource_properties(
            "AWS::Lambda::Function",
            {
                "Tags": Match.array_with([
                    Match.object_like({"Key": "Billable", "Value": "true"}),
                    Match.object_like({"Key": "CustomerId", "Value": "test"}),
                    Match.object_like({"Key": "Environment", "Value": "dev"}),
                    Match.object_like({"Key": "ProjectId", "Value": "project"}),
                ]),
            },
        )
