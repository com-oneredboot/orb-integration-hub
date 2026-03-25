"""API Stack - Main and SDK GraphQL APIs.

Creates both Main and SDK AppSync GraphQL APIs using generated constructs.
- Main API: Cognito User Pool authentication for web/mobile clients
- SDK API: Lambda authorizer (API key) for programmatic access

Both APIs connect to DynamoDB tables and Lambda functions via SSM parameters
(no CloudFormation exports).

Architecture:
- Main AppSync API with Cognito authentication
- SDK AppSync API with Lambda authorizer
- DynamoDB data sources for CRUD operations
- Lambda data sources for custom business logic
- All resource references via SSM parameters
"""

import sys
from pathlib import Path

# Add parent directory to path for imports when running via CDK CLI
sys.path.insert(0, str(Path(__file__).parent.parent))

from aws_cdk import Stack, Tags, aws_dynamodb as dynamodb, aws_lambda as lambda_, aws_ssm as ssm
from constructs import Construct

from config import Config
from generated.main_api.app_sync_main_api_api import AppSyncMainApiApi
from generated.sdk_api.app_sync_sdk_api_api import AppSyncSdkApiApi


class ApiStack(Stack):
    """API stack with Main and SDK AppSync APIs."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        config: Config,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)
        self.config = config
        self._apply_tags()

        # Read table names from SSM parameters (written by Data stack)
        # The generated AppSync constructs expect a dictionary of table objects
        tables = self._load_tables_from_ssm()

        # Create Main AppSync API using generated construct
        # Lambda ARNs are read from SSM automatically by the construct
        self.main_api = AppSyncMainApiApi(
            self,
            "MainApi",
            tables=tables,
        )

        # Create SDK AppSync API using generated construct
        # Lambda authorizer ARN is read from SSM
        authorizer_arn = ssm.StringParameter.value_for_string_parameter(
            self,
            self.config.ssm_parameter_name("lambda/authorizer/arn"),
        )
        lambda_authorizer = lambda_.Function.from_function_arn(
            self, "ApiKeyAuthorizerRef", authorizer_arn
        )
        self.sdk_api = AppSyncSdkApiApi(
            self,
            "SdkApi",
            tables=tables,
            lambda_authorizer=lambda_authorizer,
        )

    def _apply_tags(self) -> None:
        """Apply standard tags to all resources in this stack."""
        for key, value in self.config.standard_tags.items():
            Tags.of(self).add(key, value)

    def _load_tables_from_ssm(self) -> dict[str, dynamodb.ITable]:
        """Load DynamoDB table references from SSM parameters.

        The generated table constructs write table names and ARNs to SSM.
        We read these values and create table references for the AppSync API.

        Returns:
            Dictionary mapping schema names to table objects
        """
        tables = {}

        # Table schema names (keys expected by generated AppSyncApi construct)
        table_schemas = [
            "ApplicationApiKeys",
            "ApplicationEnvironmentConfig",
            "ApplicationRoles",
            "Applications",
            "ApplicationUserRoles",
            "Notifications",
            "Organizations",
            "OrganizationUsers",
            "OwnershipTransferRequests",
            "PrivacyRequests",
            "SmsRateLimit",
            "Users",
        ]

        for schema_name in table_schemas:
            # Convert schema name to SSM parameter format (lowercase, no hyphens)
            # Examples: ApplicationApiKeys -> applicationapikeys
            ssm_name = schema_name.lower().replace("_", "")

            # Read table ARN from SSM
            table_arn = ssm.StringParameter.value_for_string_parameter(
                self,
                self.config.ssm_parameter_name(f"dynamodb/{ssm_name}/table-arn"),
            )

            # Create table reference from ARN only
            tables[schema_name] = dynamodb.Table.from_table_arn(
                self,
                f"{schema_name}TableRef",
                table_arn=table_arn,
            )

        return tables
