"""AppSync Main API Stack - Cognito authentication."""
from aws_cdk import Stack, CfnOutput, aws_ssm as ssm
from constructs import Construct

from config import Config
from generated.appsync.api import AppSyncApi


class AppSyncStack(Stack):
    """Main AppSync API stack with Cognito authentication.
    
    Reads table references from SSM parameters (written by DynamoDB stack).
    Provides GraphQL API for authenticated users.
    """

    def __init__(
        self,
        scope: Construct,
        id: str,
        config: Config,
        **kwargs,
    ) -> None:
        super().__init__(scope, id, **kwargs)

        self.config = config

        # Read table names from SSM (written by DynamoDB stack)
        tables = self._get_tables_from_ssm()

        # Create Main AppSync API with Cognito authentication
        self.api = AppSyncApi(
            self,
            "AppSyncApi",
            tables=tables,
        )

        # Write API details to SSM for other stacks
        ssm.StringParameter(
            self, "MainApiIdParameter",
            parameter_name=config.ssm_parameter_name("appsync/main-api-id"),
            string_value=self.api.api.api_id,
        )

        ssm.StringParameter(
            self, "MainGraphqlUrlParameter",
            parameter_name=config.ssm_parameter_name("appsync/main-graphql-url"),
            string_value=self.api.api.graphql_url,
        )

        # CloudFormation Output
        CfnOutput(
            self, "MainGraphQLApiUrl",
            value=self.api.api.graphql_url,
            description="Main GraphQL API URL (Cognito auth)",
        )

    def _get_tables_from_ssm(self) -> dict:
        """Read table ARNs from SSM and create table references."""
        from aws_cdk import aws_dynamodb as dynamodb

        table_names = [
            "application-api-keys",
            "application-environment-config",
            "application-roles",
            "applications",
            "application-user-roles",
            "notifications",
            "organizations",
            "organization-users",
            "ownership-transfer-requests",
            "privacy-requests",
            "sms-rate-limit",
            "users",
        ]

        tables = {}
        for table_name in table_names:
            table_arn = ssm.StringParameter.value_for_string_parameter(
                self,
                self.config.ssm_parameter_name(f"dynamodb/{table_name}/table-arn"),
            )
            
            # Convert kebab-case to PascalCase for table key
            key = ''.join(word.capitalize() for word in table_name.split('-'))
            
            tables[key] = dynamodb.Table.from_table_arn(
                self, f"{key}Ref", table_arn
            )

        return tables
