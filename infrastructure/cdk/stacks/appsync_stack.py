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
    aws_wafv2 as wafv2,
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
            # Application Access Management tables
            "ApplicationGroups": dynamodb_stack.tables["application-groups"],
            "ApplicationGroupUsers": dynamodb_stack.tables["application-group-users"],
            "ApplicationGroupRoles": dynamodb_stack.tables["application-group-roles"],
            "ApplicationUserRoles": dynamodb_stack.tables["application-user-roles"],
            "ApplicationApiKeys": dynamodb_stack.tables["ApplicationApiKeys"],
            # Application Environment Configuration tables
            "ApplicationEnvironmentConfig": dynamodb_stack.tables["ApplicationEnvironmentConfig"],
        }

        # Create AppSync API using generated construct
        # This creates the API, data sources, and all resolvers
        # enable_api_key=True adds API_KEY as additional auth mode for unauthenticated access
        self.appsync_api = AppSyncApi(
            self,
            "AppSyncApi",
            tables=tables,
            enable_api_key=True,
        )

        # Expose the GraphQL API for other stacks
        self.api = self.appsync_api.api

        # Create API Key (generated construct only enables auth mode, doesn't create key)
        self.api_key = self._create_api_key()

        # Create SSM parameter for API Key secret name
        self._create_api_key_ssm_parameter()

        # Create WAF WebACL and associate with AppSync API
        self.web_acl = self._create_waf_web_acl()
        self._associate_waf_with_appsync()

    def _apply_tags(self) -> None:
        """Apply standard tags to all resources in this stack."""
        for key, value in self.config.standard_tags.items():
            Tags.of(self).add(key, value)

    def _create_api_key(self) -> appsync.CfnApiKey:
        """Create API Key and store in Secrets Manager."""
        # API key expires in 90 days (SEC-FINDING-010: reduced from 365 days)
        api_key = appsync.CfnApiKey(
            self,
            "ApiKey",
            api_id=self.api.api_id,
            description="API Key for unauthenticated access",
            expires=Expiration.after(Duration.days(90)).to_epoch(),
        )

        # Store API key in Secrets Manager with slash-based naming
        secretsmanager.Secret(
            self,
            "ApiKeySecret",
            secret_name=self.config.secret_name("appsync", "api-key"),
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
            string_value=self.config.secret_name("appsync", "api-key"),
            description="Name of the secret containing the GraphQL API key",
        )

    def _create_waf_web_acl(self) -> wafv2.CfnWebACL:
        """Create WAF WebACL with managed rules and rate limiting.

        Includes:
        - AWSManagedRulesCommonRuleSet: Protection against common web exploits
        - AWSManagedRulesKnownBadInputsRuleSet: Protection against known bad inputs
        - Rate-based rule: 2000 requests per 5 minutes per IP
        """
        web_acl = wafv2.CfnWebACL(
            self,
            "AppSyncWebACL",
            name=self.config.resource_name("appsync-waf"),
            description="WAF WebACL for AppSync API protection",
            default_action=wafv2.CfnWebACL.DefaultActionProperty(allow={}),
            scope="REGIONAL",
            visibility_config=wafv2.CfnWebACL.VisibilityConfigProperty(
                cloud_watch_metrics_enabled=True,
                metric_name=self.config.resource_name("appsync-waf"),
                sampled_requests_enabled=True,
            ),
            rules=[
                # AWS Managed Common Rule Set - protects against common web exploits
                wafv2.CfnWebACL.RuleProperty(
                    name="AWSManagedRulesCommonRuleSet",
                    priority=1,
                    override_action=wafv2.CfnWebACL.OverrideActionProperty(none={}),
                    statement=wafv2.CfnWebACL.StatementProperty(
                        managed_rule_group_statement=wafv2.CfnWebACL.ManagedRuleGroupStatementProperty(
                            vendor_name="AWS",
                            name="AWSManagedRulesCommonRuleSet",
                        )
                    ),
                    visibility_config=wafv2.CfnWebACL.VisibilityConfigProperty(
                        cloud_watch_metrics_enabled=True,
                        metric_name=self.config.resource_name("common-rules"),
                        sampled_requests_enabled=True,
                    ),
                ),
                # AWS Managed Known Bad Inputs Rule Set - protects against known bad inputs
                wafv2.CfnWebACL.RuleProperty(
                    name="AWSManagedRulesKnownBadInputsRuleSet",
                    priority=2,
                    override_action=wafv2.CfnWebACL.OverrideActionProperty(none={}),
                    statement=wafv2.CfnWebACL.StatementProperty(
                        managed_rule_group_statement=wafv2.CfnWebACL.ManagedRuleGroupStatementProperty(
                            vendor_name="AWS",
                            name="AWSManagedRulesKnownBadInputsRuleSet",
                        )
                    ),
                    visibility_config=wafv2.CfnWebACL.VisibilityConfigProperty(
                        cloud_watch_metrics_enabled=True,
                        metric_name=self.config.resource_name("known-bad-inputs"),
                        sampled_requests_enabled=True,
                    ),
                ),
                # Rate-based rule - 2000 requests per 5 minutes per IP
                wafv2.CfnWebACL.RuleProperty(
                    name="RateLimitRule",
                    priority=3,
                    action=wafv2.CfnWebACL.RuleActionProperty(block={}),
                    statement=wafv2.CfnWebACL.StatementProperty(
                        rate_based_statement=wafv2.CfnWebACL.RateBasedStatementProperty(
                            limit=2000,
                            aggregate_key_type="IP",
                        )
                    ),
                    visibility_config=wafv2.CfnWebACL.VisibilityConfigProperty(
                        cloud_watch_metrics_enabled=True,
                        metric_name=self.config.resource_name("rate-limit"),
                        sampled_requests_enabled=True,
                    ),
                ),
            ],
        )
        return web_acl

    def _associate_waf_with_appsync(self) -> wafv2.CfnWebACLAssociation:
        """Associate WAF WebACL with AppSync API."""
        return wafv2.CfnWebACLAssociation(
            self,
            "AppSyncWAFAssociation",
            resource_arn=self.api.arn,
            web_acl_arn=self.web_acl.attr_arn,
        )
