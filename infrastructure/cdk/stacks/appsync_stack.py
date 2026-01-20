"""AppSync Stack - GraphQL API for orb-integration-hub.

Uses the generated AppSyncApi construct from orb-schema-generator and adds:
- API Key creation and storage in Secrets Manager
- SSM parameter for API Key secret name
- Standard tagging

The generated construct provides:
- GraphQL API with Cognito authentication
- DynamoDB data sources and VTL resolvers
- Lambda data sources for CheckEmailExists and SmsVerification
- SSM parameters for API ID and GraphQL URL
"""

import sys
from pathlib import Path

# Add cdk directory to path for imports (handles both direct and indirect imports)
_cdk_dir = Path(__file__).parent.parent
if str(_cdk_dir) not in sys.path:
    sys.path.insert(0, str(_cdk_dir))

from aws_cdk import (
    Duration,
    Expiration,
    SecretValue,
    Stack,
    Tags,
    aws_appsync as appsync,
    aws_secretsmanager as secretsmanager,
    aws_ssm as ssm,
)
from constructs import Construct

from config import Config
from stacks.cognito_stack import CognitoStack
from stacks.dynamodb_stack import DynamoDBStack
from stacks.lambda_stack import LambdaStack

# Import generated AppSync construct
from generated.appsync.api import AppSyncApi


class AppSyncStack(Stack):
    """AppSync stack using generated construct with additional features."""

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
        self._apply_tags()

        # Build tables dictionary for generated construct
        # Map from kebab-case keys to PascalCase names expected by generated construct
        tables = {
            "Users": dynamodb_stack.tables["users"],
            "Organizations": dynamodb_stack.tables["organizations"],
            "OrganizationUsers": dynamodb_stack.tables["organization-users"],
            "Applications": dynamodb_stack.tables["applications"],
            "ApplicationUsers": dynamodb_stack.tables["application-users"],
            "ApplicationRoles": dynamodb_stack.tables["application-roles"],
            "Roles": dynamodb_stack.tables["roles"],
            "Notifications": dynamodb_stack.tables["notifications"],
            "PrivacyRequests": dynamodb_stack.tables["privacy-requests"],
            "OwnershipTransferRequests": dynamodb_stack.tables["ownership-transfer-requests"],
            "SmsRateLimit": dynamodb_stack.tables["sms-rate-limit"],
        }

        # Create AppSync API using generated construct
        # This creates the API, data sources, and all resolvers
        self.appsync_api = AppSyncApi(
            self,
            "AppSyncApi",
            tables=tables,
            enable_api_key=True,  # Enable API_KEY auth mode
            enable_xray=True,     # Enable X-Ray tracing
        )

        # Expose the GraphQL API for other stacks
        self.api = self.appsync_api.api

        # Create API Key (generated construct only enables auth mode, doesn't create key)
        self.api_key = self._create_api_key()

        # Create SSM parameter for API Key secret name
        self._create_api_key_ssm_parameter()

    def _apply_tags(self) -> None:
        """Apply standard tags to all resources in this stack."""
        for key, value in self.config.standard_tags.items():
            Tags.of(self).add(key, value)

    def _create_api_key(self) -> appsync.CfnApiKey:
        """Create API Key and store in Secrets Manager."""
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

    def _create_api_key_ssm_parameter(self) -> None:
        """Create SSM parameter for API Key secret name."""
        ssm.StringParameter(
            self,
            "ApiKeySecretNameParameter",
            parameter_name=self.config.ssm_parameter_name("appsync/api-key-secret-name"),
            string_value=self.config.resource_name("graphql-api-key"),
            description="Name of the secret containing the GraphQL API key",
        )
