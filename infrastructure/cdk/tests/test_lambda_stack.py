"""Unit tests for LambdaStack."""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from aws_cdk import App
from aws_cdk.assertions import Match, Template

from config import Config
from stacks.cognito_stack import CognitoStack
from stacks.dynamodb_stack import DynamoDBStack
from stacks.lambda_layers_stack import LambdaLayersStack
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
    """Create CDK template from LambdaStack with dependencies."""
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
    layers_stack = LambdaLayersStack(
        app,
        "TestLambdaLayersStack",
        config=test_config,
    )

    # Create Lambda stack
    stack = LambdaStack(
        app,
        "TestLambdaStack",
        config=test_config,
        cognito_stack=cognito_stack,
        dynamodb_stack=dynamodb_stack,
        layers_stack=layers_stack,
    )
    return Template.from_stack(stack)


class TestLambdaStackFunctionCount:
    """Tests for Lambda function count."""

    def test_creates_four_lambda_functions(self, template: Template) -> None:
        """Verify exactly 4 Lambda functions are created."""
        template.resource_count_is("AWS::Lambda::Function", 4)


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


class TestLambdaStackSSMParameters:
    """Tests for SSM parameter exports."""

    def test_exports_sms_verification_lambda_arn(self, template: Template) -> None:
        """Verify SMS Verification Lambda ARN is exported to SSM."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "test-project-dev-sms-verification-lambda-arn",
                "Type": "String",
            },
        )

    def test_exports_cognito_group_manager_lambda_arn(self, template: Template) -> None:
        """Verify Cognito Group Manager Lambda ARN is exported to SSM."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "test-project-dev-cognito-group-manager-lambda-arn",
                "Type": "String",
            },
        )

    def test_exports_user_status_calculator_lambda_arn(self, template: Template) -> None:
        """Verify User Status Calculator Lambda ARN is exported to SSM."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "test-project-dev-user-status-calculator-lambda-arn",
                "Type": "String",
            },
        )

    def test_exports_organizations_lambda_arn(self, template: Template) -> None:
        """Verify Organizations Lambda ARN is exported to SSM."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "test-project-dev-organizations-lambda-arn",
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
