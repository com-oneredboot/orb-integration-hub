"""AppSync Stack - GraphQL API for orb-integration-hub.

Creates:
- GraphQL API with Cognito authentication
- API Key for unauthenticated access
- DynamoDB data sources for all tables
- Lambda data source for SMS verification
- VTL resolvers from generated templates
- SSM parameters for API URL and API Key
"""

import sys
from pathlib import Path

# Add parent directory to path for imports when running via CDK CLI
sys.path.insert(0, str(Path(__file__).parent.parent))

from aws_cdk import (
    Duration,
    Expiration,
    SecretValue,
    Stack,
    Tags,
    aws_appsync as appsync,
    aws_iam as iam,
    aws_secretsmanager as secretsmanager,
    aws_ssm as ssm,
)
from constructs import Construct

from config import Config
from stacks.cognito_stack import CognitoStack
from stacks.dynamodb_stack import DynamoDBStack
from stacks.lambda_stack import LambdaStack


class AppSyncStack(Stack):
    """AppSync stack with GraphQL API."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        config: Config,
        cognito_stack: CognitoStack,
        dynamodb_stack: DynamoDBStack,
        lambda_stack: LambdaStack,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)
        self.config = config
        self.cognito_stack = cognito_stack
        self.dynamodb_stack = dynamodb_stack
        self.lambda_stack = lambda_stack
        self._apply_tags()

        # Create IAM roles
        self.service_role = self._create_service_role()
        self.logging_role = self._create_logging_role()

        # Create GraphQL API
        self.api = self._create_graphql_api()

        # Create API Key
        self.api_key = self._create_api_key()

        # Create data sources
        self.data_sources = self._create_data_sources()

        # Create SSM parameters
        self._create_ssm_parameters()

    def _apply_tags(self) -> None:
        """Apply standard tags to all resources in this stack."""
        for key, value in self.config.standard_tags.items():
            Tags.of(self).add(key, value)

    def _create_service_role(self) -> iam.Role:
        """Create IAM role for AppSync to access DynamoDB and Lambda.
        
        Uses scoped permissions instead of AmazonDynamoDBFullAccess for security.
        """
        role = iam.Role(
            self,
            "AppSyncServiceRole",
            role_name=self.config.resource_name("appsync-service-role"),
            assumed_by=iam.ServicePrincipal("appsync.amazonaws.com"),
        )

        # Scoped DynamoDB access - only required actions on project tables
        role.add_to_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=[
                    "dynamodb:GetItem",
                    "dynamodb:PutItem",
                    "dynamodb:UpdateItem",
                    "dynamodb:DeleteItem",
                    "dynamodb:Query",
                    "dynamodb:Scan",
                    "dynamodb:BatchGetItem",
                    "dynamodb:BatchWriteItem",
                ],
                resources=[
                    f"arn:aws:dynamodb:{self.region}:{self.account}:table/{self.config.prefix}-*",
                    f"arn:aws:dynamodb:{self.region}:{self.account}:table/{self.config.prefix}-*/index/*",
                ],
            )
        )

        # SSM Parameter access
        role.add_to_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=["ssm:GetParameter", "ssm:GetParameters"],
                resources=[
                    f"arn:aws:ssm:{self.region}:{self.account}:parameter/{self.config.environment}/{self.config.customer_id}/{self.config.project_id}/*",
                ],
            )
        )

        # Lambda invoke access
        role.add_to_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=["lambda:InvokeFunction"],
                resources=[
                    f"arn:aws:lambda:{self.region}:{self.account}:function:{self.config.prefix}-*",
                ],
            )
        )

        return role

    def _create_logging_role(self) -> iam.Role:
        """Create IAM role for AppSync CloudWatch logging."""
        return iam.Role(
            self,
            "AppSyncLoggingRole",
            role_name=self.config.resource_name("appsync-logging-role"),
            assumed_by=iam.ServicePrincipal("appsync.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "service-role/AWSAppSyncPushToCloudWatchLogs"
                ),
            ],
        )

    def _create_graphql_api(self) -> appsync.GraphqlApi:
        """Create GraphQL API with Cognito authentication."""
        # Schema path relative to infrastructure/cdk directory
        schema_path = Path(__file__).parent.parent.parent.parent / "apps/api/graphql/schema.graphql"

        api = appsync.GraphqlApi(
            self,
            "GraphQLApi",
            name=self.config.resource_name("appsync"),
            definition=appsync.Definition.from_file(str(schema_path)),
            authorization_config=appsync.AuthorizationConfig(
                default_authorization=appsync.AuthorizationMode(
                    authorization_type=appsync.AuthorizationType.USER_POOL,
                    user_pool_config=appsync.UserPoolConfig(
                        user_pool=self.cognito_stack.user_pool,
                    ),
                ),
                additional_authorization_modes=[
                    appsync.AuthorizationMode(
                        authorization_type=appsync.AuthorizationType.API_KEY,
                    ),
                ],
            ),
            log_config=appsync.LogConfig(
                field_log_level=appsync.FieldLogLevel.ALL,
                exclude_verbose_content=False,
                role=self.logging_role,
            ),
            xray_enabled=True,
        )

        return api

    def _create_api_key(self) -> appsync.CfnApiKey:
        """Create API Key for unauthenticated access."""
        # API key expires in 365 days
        api_key = appsync.CfnApiKey(
            self,
            "ApiKey",
            api_id=self.api.api_id,
            description="API Key for unauthenticated access",
            expires=Expiration.after(Duration.days(365)).to_epoch(),
        )

        # Store API key in Secrets Manager
        secretsmanager.Secret(
            self,
            "ApiKeySecret",
            secret_name=self.config.resource_name("graphql-api-key"),
            description="GraphQL API Key for frontend authentication",
            secret_string_value=SecretValue.unsafe_plain_text(api_key.attr_api_key),
        )

        return api_key

    def _create_data_sources(self) -> dict[str, appsync.DynamoDbDataSource]:
        """Create DynamoDB and Lambda data sources."""
        data_sources = {}

        # Map table keys to data source names
        table_mapping = {
            "users": "Users",
            "organizations": "Organizations",
            "organization-users": "OrganizationUsers",
            "applications": "Applications",
            "application-users": "ApplicationUsers",
            "application-roles": "ApplicationRoles",
            "roles": "Roles",
            "notifications": "Notifications",
            "privacy-requests": "PrivacyRequests",
            "ownership-transfer-requests": "OwnershipTransferRequests",
            "sms-rate-limit": "SmsRateLimit",
        }

        # Create DynamoDB data sources
        for table_key, ds_name in table_mapping.items():
            if table_key in self.dynamodb_stack.tables:
                data_sources[ds_name] = self.api.add_dynamo_db_data_source(
                    f"{ds_name}DataSource",
                    self.dynamodb_stack.tables[table_key],
                    name=f"{ds_name}DynamoDbDataSource",
                )

        # Create Lambda data source for SMS verification
        self.sms_verification_data_source = self.api.add_lambda_data_source(
            "SmsVerificationDataSource",
            self.lambda_stack.sms_verification_lambda,
            name="SmsVerificationLambdaDataSource",
        )

        return data_sources

    def _create_ssm_parameters(self) -> None:
        """Create SSM parameters for cross-stack references with path-based naming."""
        # API ID
        ssm.StringParameter(
            self,
            "ApiIdParameter",
            parameter_name=self.config.ssm_parameter_name("appsync/api-id"),
            string_value=self.api.api_id,
            description="AppSync GraphQL API ID",
        )

        # GraphQL URL
        ssm.StringParameter(
            self,
            "GraphqlUrlParameter",
            parameter_name=self.config.ssm_parameter_name("appsync/graphql-url"),
            string_value=self.api.graphql_url,
            description="GraphQL API URL for frontend API calls",
        )

        # API Key ARN (reference to secret)
        ssm.StringParameter(
            self,
            "ApiKeySecretNameParameter",
            parameter_name=self.config.ssm_parameter_name("appsync/api-key-secret-name"),
            string_value=self.config.resource_name("graphql-api-key"),
            description="Name of the secret containing the GraphQL API key",
        )
