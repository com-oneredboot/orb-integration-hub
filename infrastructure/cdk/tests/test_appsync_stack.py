"""Unit tests for AppSyncStack."""

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
from stacks.appsync_stack import AppSyncStack


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
    """Create CDK template from AppSyncStack with dependencies."""
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
    # Uses path-based naming: /customer/project/env/lambda-layers/layer-name/arn
    ssm.StringParameter(
        cognito_stack,
        "MockOrganizationsSecurityLayerArn",
        parameter_name=test_config.ssm_parameter_name("lambda-layers/organizations-security/arn"),
        string_value="arn:aws:lambda:us-east-1:123456789012:layer:test-project-dev-organizations-security-layer:1",
    )
    
    lambda_stack = LambdaStack(
        app,
        "TestLambdaStack",
        config=test_config,
        cognito_stack=cognito_stack,
        dynamodb_stack=dynamodb_stack,
    )

    # Create AppSync stack
    stack = AppSyncStack(
        app,
        "TestAppSyncStack",
        config=test_config,
        cognito_stack=cognito_stack,
        dynamodb_stack=dynamodb_stack,
        lambda_stack=lambda_stack,
    )
    return Template.from_stack(stack)


class TestAppSyncStackGraphQLApi:
    """Tests for GraphQL API."""

    def test_creates_graphql_api(self, template: Template) -> None:
        """Verify GraphQL API is created."""
        template.has_resource_properties(
            "AWS::AppSync::GraphQLApi",
            {
                "Name": "test-project-dev-appsync",
                "AuthenticationType": "AMAZON_COGNITO_USER_POOLS",
                "XrayEnabled": True,
            },
        )

    def test_graphql_api_has_api_key_auth(self, template: Template) -> None:
        """Verify GraphQL API has API key as additional auth."""
        template.has_resource_properties(
            "AWS::AppSync::GraphQLApi",
            {
                "AdditionalAuthenticationProviders": Match.array_with([
                    Match.object_like({"AuthenticationType": "API_KEY"})
                ]),
            },
        )

    def test_graphql_api_has_logging(self, template: Template) -> None:
        """Verify GraphQL API has logging configured."""
        template.has_resource_properties(
            "AWS::AppSync::GraphQLApi",
            {
                "LogConfig": Match.object_like({
                    "FieldLogLevel": "ALL",
                    "ExcludeVerboseContent": False,
                }),
            },
        )


class TestAppSyncStackApiKey:
    """Tests for API Key."""

    def test_creates_api_key(self, template: Template) -> None:
        """Verify API Key is created."""
        template.has_resource_properties(
            "AWS::AppSync::ApiKey",
            {
                "Description": "API Key for unauthenticated access",
            },
        )


class TestAppSyncStackIAMRoles:
    """Tests for IAM roles."""

    def test_creates_service_role(self, template: Template) -> None:
        """Verify AppSync service role is created."""
        template.has_resource_properties(
            "AWS::IAM::Role",
            {
                "RoleName": "test-project-dev-appsync-service-role",
                "AssumeRolePolicyDocument": Match.object_like({
                    "Statement": Match.array_with([
                        Match.object_like({
                            "Principal": {"Service": "appsync.amazonaws.com"},
                        })
                    ]),
                }),
            },
        )

    def test_creates_logging_role(self, template: Template) -> None:
        """Verify AppSync logging role is created."""
        template.has_resource_properties(
            "AWS::IAM::Role",
            {
                "RoleName": "test-project-dev-appsync-logging-role",
            },
        )


class TestAppSyncStackDataSources:
    """Tests for data sources."""

    def test_creates_dynamodb_data_sources(self, template: Template) -> None:
        """Verify DynamoDB data sources are created."""
        # Check for at least one DynamoDB data source
        template.has_resource_properties(
            "AWS::AppSync::DataSource",
            {
                "Type": "AMAZON_DYNAMODB",
            },
        )

    def test_creates_lambda_data_source(self, template: Template) -> None:
        """Verify Lambda data source is created for SMS verification."""
        template.has_resource_properties(
            "AWS::AppSync::DataSource",
            {
                "Type": "AWS_LAMBDA",
                "Name": "SmsVerificationLambdaDataSource",
            },
        )


class TestAppSyncStackSSMParameters:
    """Tests for SSM parameter exports using path-based naming."""

    def test_exports_api_id(self, template: Template) -> None:
        """Verify API ID is exported to SSM with path-based naming."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/appsync/api-id",
                "Type": "String",
            },
        )

    def test_exports_graphql_url(self, template: Template) -> None:
        """Verify GraphQL URL is exported to SSM with path-based naming."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/appsync/graphql-url",
                "Type": "String",
            },
        )

    def test_exports_api_key_secret_name(self, template: Template) -> None:
        """Verify API key secret name is exported to SSM with path-based naming."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/appsync/api-key-secret-name",
                "Type": "String",
            },
        )


class TestAppSyncStackSecrets:
    """Tests for secrets."""

    def test_creates_api_key_secret(self, template: Template) -> None:
        """Verify API key is stored in Secrets Manager."""
        template.has_resource_properties(
            "AWS::SecretsManager::Secret",
            {
                "Name": "test-project-dev-graphql-api-key",
                "Description": "GraphQL API Key for frontend authentication",
            },
        )


class TestAppSyncStackTags:
    """Tests for resource tagging."""

    def test_resources_have_standard_tags(self, template: Template) -> None:
        """Verify resources have standard tags."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Tags": Match.object_like({
                    "Billable": "true",
                    "CustomerId": "test",
                    "Environment": "dev",
                    "ProjectId": "project",
                }),
            },
        )
