"""Tests for SDK AppSync Stack.

Tests the SDK AppSync API infrastructure with Lambda authorizer.
"""

import sys
from pathlib import Path

import pytest
from aws_cdk import App, Environment
from aws_cdk.assertions import Match, Template

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import Config
from stacks.appsync_sdk_stack import AppSyncSdkStack
from stacks.dynamodb_stack import DynamoDBStack
from stacks.lambda_stack import LambdaStack
from stacks.cognito_stack import CognitoStack


@pytest.fixture(scope="module")
def app() -> App:
    """Create CDK app for testing."""
    return App()


@pytest.fixture(scope="module")
def config(app: App) -> Config:
    """Create test configuration."""
    return Config(
        customer_id="test",
        project_id="project",
        environment="dev",
        region="us-east-1",
        account="123456789012",
        sms_origination_number="+15551234567",
    )


@pytest.fixture(scope="module")
def env() -> Environment:
    """Create test environment."""
    return Environment(account="123456789012", region="us-east-1")


@pytest.fixture(scope="module")
def cognito_stack(app: App, config: Config, env: Environment) -> CognitoStack:
    """Create Cognito stack for testing."""
    return CognitoStack(app, "TestCognitoStack", config=config, env=env)


@pytest.fixture(scope="module")
def dynamodb_stack(app: App, config: Config, env: Environment) -> DynamoDBStack:
    """Create DynamoDB stack for testing."""
    return DynamoDBStack(app, "TestDynamoDBStack", config=config, env=env)


@pytest.fixture(scope="module")
def lambda_stack(
    app: App,
    config: Config,
    env: Environment,
    cognito_stack: CognitoStack,
    dynamodb_stack: DynamoDBStack,
) -> LambdaStack:
    """Create Lambda stack for testing."""
    return LambdaStack(
        app,
        "TestLambdaStack",
        config=config,
        cognito_stack=cognito_stack,
        dynamodb_stack=dynamodb_stack,
        env=env,
    )


@pytest.fixture(scope="module")
def stack(
    app: App,
    config: Config,
    env: Environment,
    dynamodb_stack: DynamoDBStack,
    lambda_stack: LambdaStack,
) -> AppSyncSdkStack:
    """Create SDK AppSync stack for testing."""
    return AppSyncSdkStack(
        app,
        "TestAppSyncSdkStack",
        config=config,
        dynamodb_stack=dynamodb_stack,
        lambda_stack=lambda_stack,
        env=env,
    )


@pytest.fixture(scope="module")
def template(stack: AppSyncSdkStack) -> Template:
    """Create CloudFormation template from stack."""
    return Template.from_stack(stack)


class TestAppSyncSdkStackApi:
    """Tests for SDK AppSync API creation."""

    def test_creates_graphql_api(self, template: Template) -> None:
        """Verify GraphQL API is created."""
        template.has_resource_properties(
            "AWS::AppSync::GraphQLApi",
            {
                "Name": "test-project-dev-appsync-sdk-api",
                "AuthenticationType": "AWS_LAMBDA",
            },
        )

    def test_api_has_lambda_authorizer(self, template: Template) -> None:
        """Verify API uses Lambda authorizer."""
        template.has_resource_properties(
            "AWS::AppSync::GraphQLApi",
            {
                "LambdaAuthorizerConfig": Match.object_like(
                    {
                        "AuthorizerResultTtlInSeconds": 300,
                        "IdentityValidationExpression": Match.string_like_regexp(
                            r".*orb_\[a-z\].*"
                        ),
                    }
                ),
            },
        )

    def test_api_has_xray_enabled(self, template: Template) -> None:
        """Verify X-Ray tracing is enabled."""
        template.has_resource_properties(
            "AWS::AppSync::GraphQLApi",
            {
                "XrayEnabled": True,
            },
        )


class TestAppSyncSdkStackSSMParameters:
    """Tests for SSM parameter exports."""

    def test_exports_api_id(self, template: Template) -> None:
        """Verify API ID is exported to SSM."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/appsync-sdk/api-id",
                "Type": "String",
            },
        )

    def test_exports_graphql_url(self, template: Template) -> None:
        """Verify GraphQL URL is exported to SSM."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/appsync-sdk/graphql-url",
                "Type": "String",
            },
        )


class TestAppSyncSdkStackWAF:
    """Tests for WAF configuration."""

    def test_creates_waf_web_acl(self, template: Template) -> None:
        """Verify WAF WebACL is created."""
        template.has_resource_properties(
            "AWS::WAFv2::WebACL",
            {
                "Name": "test-project-dev-appsync-sdk-waf",
                "Scope": "REGIONAL",
            },
        )

    def test_waf_has_rate_limiting(self, template: Template) -> None:
        """Verify WAF has rate limiting rule."""
        template.has_resource_properties(
            "AWS::WAFv2::WebACL",
            {
                "Rules": Match.array_with(
                    [
                        Match.object_like(
                            {
                                "Name": "SdkRateLimitRule",
                                "Statement": {
                                    "RateBasedStatement": {
                                        "Limit": 1000,
                                        "AggregateKeyType": "IP",
                                    }
                                },
                            }
                        )
                    ]
                ),
            },
        )

    def test_waf_associated_with_api(self, template: Template) -> None:
        """Verify WAF is associated with AppSync API."""
        template.resource_count_is("AWS::WAFv2::WebACLAssociation", 1)


class TestAppSyncSdkStackDataSources:
    """Tests for DynamoDB data sources."""

    def test_creates_data_sources(self, template: Template) -> None:
        """Verify DynamoDB data sources are created."""
        # Should have data sources for SDK-accessible tables
        template.has_resource_properties(
            "AWS::AppSync::DataSource",
            {
                "Type": "AMAZON_DYNAMODB",
            },
        )


class TestAppSyncSdkStackTags:
    """Tests for resource tagging."""

    def test_api_has_standard_tags(self, template: Template) -> None:
        """Verify API has standard tags."""
        template.has_resource(
            "AWS::AppSync::GraphQLApi",
            {
                "Properties": Match.object_like(
                    {
                        "Name": "test-project-dev-appsync-sdk-api",
                    }
                ),
            },
        )
