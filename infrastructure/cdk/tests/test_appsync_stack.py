"""Unit tests for AppSyncStack.

Note: The AppSyncStack now uses the generated AppSyncApi construct from orb-schema-generator.
The generated construct has some hardcoded values (API name, SSM paths) that don't use the
test config. Tests are adjusted to match the actual generated output.

TODO: File issue with orb-schema-generator to make SSM paths configurable.
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
        parameter_name=test_config.ssm_parameter_name(
            "lambda-layers/organizations-security/arn"
        ),
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
        """Verify GraphQL API is created with correct auth config."""
        # Note: API name is hardcoded in generated construct
        template.has_resource_properties(
            "AWS::AppSync::GraphQLApi",
            {
                "Name": "orb-integration-hub-dev-appsync-api",
                "AuthenticationType": "AMAZON_COGNITO_USER_POOLS",
                "XrayEnabled": True,
            },
        )

    def test_graphql_api_has_api_key_auth(self, template: Template) -> None:
        """Verify GraphQL API has API key as additional auth."""
        template.has_resource_properties(
            "AWS::AppSync::GraphQLApi",
            {
                "AdditionalAuthenticationProviders": Match.array_with(
                    [Match.object_like({"AuthenticationType": "API_KEY"})]
                ),
            },
        )

    def test_graphql_api_has_logging(self, template: Template) -> None:
        """Verify GraphQL API has logging configured."""
        template.has_resource_properties(
            "AWS::AppSync::GraphQLApi",
            {
                "LogConfig": Match.object_like(
                    {
                        "FieldLogLevel": "ALL",
                        "ExcludeVerboseContent": False,
                    }
                ),
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
    """Tests for IAM roles.

    Note: The generated construct creates IAM roles with CDK-generated names,
    not explicit role names. We verify roles exist with correct trust policies.
    """

    def test_creates_appsync_logging_role(self, template: Template) -> None:
        """Verify AppSync logging role is created."""
        template.has_resource_properties(
            "AWS::IAM::Role",
            {
                "AssumeRolePolicyDocument": Match.object_like(
                    {
                        "Statement": Match.array_with(
                            [
                                Match.object_like(
                                    {
                                        "Principal": {"Service": "appsync.amazonaws.com"},
                                    }
                                )
                            ]
                        ),
                    }
                ),
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

    def test_creates_sms_verification_lambda_data_source(
        self, template: Template
    ) -> None:
        """Verify Lambda data source is created for SMS verification."""
        template.has_resource_properties(
            "AWS::AppSync::DataSource",
            {
                "Type": "AWS_LAMBDA",
                "Name": "SmsVerificationLambdaDataSource",
            },
        )

    def test_creates_check_email_exists_lambda_data_source(
        self, template: Template
    ) -> None:
        """Verify Lambda data source is created for CheckEmailExists."""
        template.has_resource_properties(
            "AWS::AppSync::DataSource",
            {
                "Type": "AWS_LAMBDA",
                "Name": "CheckEmailExistsLambdaDataSource",
            },
        )


class TestAppSyncStackResolvers:
    """Tests for GraphQL resolvers."""

    def test_creates_check_email_exists_resolver(self, template: Template) -> None:
        """Verify CheckEmailExists resolver is created."""
        template.has_resource_properties(
            "AWS::AppSync::Resolver",
            {
                "TypeName": "Query",
                "FieldName": "CheckEmailExists",
            },
        )

    def test_creates_sms_verification_resolver(self, template: Template) -> None:
        """Verify SmsVerification resolver is created."""
        template.has_resource_properties(
            "AWS::AppSync::Resolver",
            {
                "TypeName": "Mutation",
                "FieldName": "SmsVerification",
            },
        )

    def test_creates_users_create_resolver(self, template: Template) -> None:
        """Verify UsersCreate resolver is created."""
        template.has_resource_properties(
            "AWS::AppSync::Resolver",
            {
                "TypeName": "Mutation",
                "FieldName": "UsersCreate",
            },
        )


class TestAppSyncStackSSMParameters:
    """Tests for SSM parameter exports.

    Note: The generated construct uses hardcoded SSM paths based on project config
    in schema-generator.yml, not the test config. We verify the parameters exist
    with the expected paths from the generated construct.
    """

    def test_exports_api_id(self, template: Template) -> None:
        """Verify API ID is exported to SSM."""
        # Note: Path is hardcoded in generated construct
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/orb/integration-hub/dev/appsync/api-id",
                "Type": "String",
            },
        )

    def test_exports_graphql_url(self, template: Template) -> None:
        """Verify GraphQL URL is exported to SSM."""
        # Note: Path is hardcoded in generated construct
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/orb/integration-hub/dev/appsync/graphql-url",
                "Type": "String",
            },
        )

    def test_exports_api_key_secret_name(self, template: Template) -> None:
        """Verify API key secret name is exported to SSM with path-based naming."""
        # This is created by our wrapper stack, uses test config
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
                "Tags": Match.object_like(
                    {
                        "Billable": "true",
                        "CustomerId": "test",
                        "Environment": "dev",
                        "ProjectId": "project",
                    }
                ),
            },
        )
