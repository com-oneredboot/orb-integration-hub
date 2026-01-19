"""Lambda Stack - Lambda functions for orb-integration-hub.

Creates:
- LambdaExecutionRole with required policies
- SmsVerificationLambda
- CognitoGroupManagerLambda
- UserStatusCalculatorLambda with DynamoDB stream trigger
- OrganizationsLambda with layer reference (from SSM parameter)
- SSM parameters for Lambda ARNs

Note: Lambda layers are referenced via SSM parameters to avoid CloudFormation
cross-stack exports which cause update failures when layer versions change.
"""

import sys
from pathlib import Path

# Add parent directory to path for imports when running via CDK CLI
sys.path.insert(0, str(Path(__file__).parent.parent))

from aws_cdk import (
    Duration,
    Stack,
    Tags,
    aws_dynamodb as dynamodb,
    aws_iam as iam,
    aws_lambda as lambda_,
    aws_lambda_event_sources as lambda_event_sources,
    aws_ssm as ssm,
)
from constructs import Construct

from config import Config
from stacks.cognito_stack import CognitoStack
from stacks.dynamodb_stack import DynamoDBStack


class LambdaStack(Stack):
    """Lambda stack with all Lambda functions."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        config: Config,
        cognito_stack: CognitoStack,
        dynamodb_stack: DynamoDBStack,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)
        self.config = config
        self.cognito_stack = cognito_stack
        self.dynamodb_stack = dynamodb_stack
        self._apply_tags()

        # Dictionary to store all Lambda functions for cross-stack references
        self.functions: dict[str, lambda_.Function] = {}

        # Create IAM role first
        self.lambda_execution_role = self._create_lambda_execution_role()

        # Create Lambda functions
        self.sms_verification_lambda = self._create_sms_verification_lambda()
        self.cognito_group_manager_lambda = self._create_cognito_group_manager_lambda()
        self.user_status_calculator_lambda = self._create_user_status_calculator_lambda()
        self.organizations_lambda = self._create_organizations_lambda()
        self.check_email_exists_lambda = self._create_check_email_exists_lambda()

    def _apply_tags(self) -> None:
        """Apply standard tags to all resources in this stack."""
        for key, value in self.config.standard_tags.items():
            Tags.of(self).add(key, value)

    def _create_lambda_execution_role(self) -> iam.Role:
        """Create IAM role for Lambda execution with required policies."""
        role = iam.Role(
            self,
            "LambdaExecutionRole",
            role_name=self.config.resource_name("lambda-execution-role"),
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "service-role/AWSLambdaBasicExecutionRole"
                ),
            ],
        )

        # DynamoDB Access
        role.add_to_policy(
            iam.PolicyStatement(
                sid="DynamoDBAccess",
                effect=iam.Effect.ALLOW,
                actions=[
                    "dynamodb:PutItem",
                    "dynamodb:GetItem",
                    "dynamodb:UpdateItem",
                    "dynamodb:DeleteItem",
                    "dynamodb:Query",
                    "dynamodb:Scan",
                ],
                resources=[
                    self.dynamodb_stack.tables["users"].table_arn,
                    f"{self.dynamodb_stack.tables['users'].table_arn}/index/*",
                    self.dynamodb_stack.tables["sms-rate-limit"].table_arn,
                    self.dynamodb_stack.tables["organizations"].table_arn,
                ],
            )
        )

        # DynamoDB Stream Access
        role.add_to_policy(
            iam.PolicyStatement(
                sid="DynamoDBStreamAccess",
                effect=iam.Effect.ALLOW,
                actions=[
                    "dynamodb:DescribeStream",
                    "dynamodb:GetRecords",
                    "dynamodb:GetShardIterator",
                    "dynamodb:ListStreams",
                ],
                resources=[
                    f"{self.dynamodb_stack.tables['users'].table_arn}/stream/*",
                ],
            )
        )

        # Secrets Manager Access
        role.add_to_policy(
            iam.PolicyStatement(
                sid="SecretsManagerAccess",
                effect=iam.Effect.ALLOW,
                actions=["secretsmanager:GetSecretValue"],
                resources=[
                    f"arn:aws:secretsmanager:{self.region}:{self.account}:secret:{self.config.prefix}-*",
                ],
            )
        )

        # SSM Parameter Access
        role.add_to_policy(
            iam.PolicyStatement(
                sid="SSMParameterAccess",
                effect=iam.Effect.ALLOW,
                actions=["ssm:GetParameter"],
                resources=[
                    f"arn:aws:ssm:{self.region}:{self.account}:parameter/{self.config.prefix}-*",
                ],
            )
        )

        # CloudWatch Logging
        role.add_to_policy(
            iam.PolicyStatement(
                sid="CloudWatchLogging",
                effect=iam.Effect.ALLOW,
                actions=[
                    "logs:CreateLogGroup",
                    "logs:CreateLogStream",
                    "logs:PutLogEvents",
                ],
                resources=[
                    f"arn:aws:logs:{self.region}:{self.account}:log-group:/aws/lambda/{self.config.prefix}-*",
                ],
            )
        )

        # SQS Access
        role.add_to_policy(
            iam.PolicyStatement(
                sid="SQSAccess",
                effect=iam.Effect.ALLOW,
                actions=["sqs:SendMessage"],
                resources=[
                    f"arn:aws:sqs:{self.region}:{self.account}:{self.config.prefix}-alerts-queue",
                    f"arn:aws:sqs:{self.region}:{self.account}:{self.config.prefix}-dead-letter-queue",
                ],
            )
        )

        # SNS Access
        role.add_to_policy(
            iam.PolicyStatement(
                sid="SNSAccess",
                effect=iam.Effect.ALLOW,
                actions=["sns:Publish"],
                resources=["*"],
            )
        )

        # SES Access
        role.add_to_policy(
            iam.PolicyStatement(
                sid="SESAccess",
                effect=iam.Effect.ALLOW,
                actions=["ses:SendEmail"],
                resources=["*"],
            )
        )

        # Cognito Access
        role.add_to_policy(
            iam.PolicyStatement(
                sid="CognitoAccess",
                effect=iam.Effect.ALLOW,
                actions=[
                    "cognito-idp:AdminAddUserToGroup",
                    "cognito-idp:AdminRemoveUserFromGroup",
                    "cognito-idp:AdminListGroupsForUser",
                    "cognito-idp:AdminGetUser",
                    "cognito-idp:AdminListDevices",
                    "cognito-idp:AdminGetUserMFAPreference",
                    "cognito-idp:DescribeUserPool",
                    "cognito-idp:ListUsersInGroup",
                    "cognito-idp:GetGroup",
                    "cognito-idp:ListGroups",
                ],
                resources=[
                    f"arn:aws:cognito-idp:{self.region}:{self.account}:userpool/*",
                ],
            )
        )

        # Lambda Event Access
        role.add_to_policy(
            iam.PolicyStatement(
                sid="LambdaEventAccess",
                effect=iam.Effect.ALLOW,
                actions=["lambda:GetEventSourceMapping"],
                resources=[
                    f"arn:aws:lambda:{self.region}:{self.account}:event-source-mapping:*",
                ],
            )
        )

        # KMS Access
        role.add_to_policy(
            iam.PolicyStatement(
                sid="KMSAccess",
                effect=iam.Effect.ALLOW,
                actions=[
                    "kms:Encrypt",
                    "kms:Decrypt",
                    "kms:GenerateDataKey",
                ],
                resources=["*"],
            )
        )

        return role

    def _create_sms_verification_lambda(self) -> lambda_.Function:
        """Create SMS Verification Lambda function."""
        function = lambda_.Function(
            self,
            "SmsVerificationLambda",
            function_name=self.config.resource_name("sms-verification"),
            description="Lambda function for SMS verification",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="index.lambda_handler",
            code=lambda_.Code.from_asset("../apps/api/lambdas/sms_verification"),
            timeout=Duration.seconds(30),
            memory_size=256,
            role=self.lambda_execution_role,
            environment={
                "ALERTS_QUEUE": f"arn:aws:sqs:{self.region}:{self.account}:{self.config.prefix}-alerts-queue",
                "LOGGING_LEVEL": "INFO",
                "VERSION": "1",
                "SMS_ORIGINATION_NUMBER": self.config.sms_origination_number,
                "SMS_VERIFICATION_SECRET_NAME": self.config.resource_name("sms-verification-secret"),
                "SMS_RATE_LIMIT_TABLE_NAME": self.dynamodb_stack.tables["sms-rate-limit"].table_name,
            },
            dead_letter_queue_enabled=True,
        )

        self.functions["sms-verification"] = function
        # Export with lowercase name to match orb-schema-generator convention
        self._export_lambda_arn_custom(function, "smsverification")
        return function

    def _create_cognito_group_manager_lambda(self) -> lambda_.Function:
        """Create Cognito Group Manager Lambda function."""
        function = lambda_.Function(
            self,
            "CognitoGroupManagerLambda",
            function_name=self.config.resource_name("cognito-group-manager"),
            description="Lambda function to manage Cognito User Pool groups",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="index.lambda_handler",
            code=lambda_.Code.from_asset("../apps/api/lambdas/cognito_group_manager"),
            timeout=Duration.seconds(30),
            memory_size=256,
            role=self.lambda_execution_role,
            environment={
                "ALERTS_QUEUE": f"arn:aws:sqs:{self.region}:{self.account}:{self.config.prefix}-alerts-queue",
                "LOGGING_LEVEL": "INFO",
                "VERSION": "1",
            },
            dead_letter_queue_enabled=True,
        )

        self.functions["cognito-group-manager"] = function
        self._export_lambda_arn(function, "cognito-group-manager")
        return function

    def _create_user_status_calculator_lambda(self) -> lambda_.Function:
        """Create User Status Calculator Lambda with DynamoDB stream trigger."""
        function = lambda_.Function(
            self,
            "UserStatusCalculatorLambda",
            function_name=self.config.resource_name("user-status-calculator"),
            description="Lambda function triggered by DynamoDB streams to automatically calculate user status",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="index.lambda_handler",
            code=lambda_.Code.from_asset("../apps/api/lambdas/user_status_calculator"),
            timeout=Duration.seconds(30),
            memory_size=256,
            role=self.lambda_execution_role,
            environment={
                "ALERTS_QUEUE": f"arn:aws:sqs:{self.region}:{self.account}:{self.config.prefix}-alerts-queue",
                "LOGGING_LEVEL": "INFO",
                "VERSION": "1",
                "USER_POOL_ID": self.cognito_stack.user_pool.user_pool_id,
                "USERS_TABLE_NAME": self.dynamodb_stack.tables["users"].table_name,
            },
            dead_letter_queue_enabled=True,
        )

        # Add DynamoDB Stream event source
        function.add_event_source(
            lambda_event_sources.DynamoEventSource(
                self.dynamodb_stack.tables["users"],
                starting_position=lambda_.StartingPosition.LATEST,
                batch_size=10,
                max_batching_window=Duration.seconds(5),
            )
        )

        self.functions["user-status-calculator"] = function
        self._export_lambda_arn(function, "user-status-calculator")
        return function

    def _create_organizations_lambda(self) -> lambda_.Function:
        """Create Organizations Lambda function with layer reference.
        
        The layer ARN is read from SSM parameter to avoid CloudFormation
        cross-stack exports which cause update failures when layer versions change.
        """
        # Read layer ARN from SSM parameter (set by lambda-layers stack)
        # Uses path-based naming: /customer/project/env/lambda-layers/layer-name/arn
        organizations_security_layer_arn = ssm.StringParameter.value_for_string_parameter(
            self,
            self.config.ssm_parameter_name("lambda-layers/organizations-security/arn"),
        )
        
        # Create layer reference from ARN
        organizations_security_layer = lambda_.LayerVersion.from_layer_version_arn(
            self,
            "OrganizationsSecurityLayerRef",
            organizations_security_layer_arn,
        )
        
        function = lambda_.Function(
            self,
            "OrganizationsLambda",
            function_name=self.config.resource_name("organizations"),
            description="Lambda function to handle organizations CRUD operations",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="index.lambda_handler",
            code=lambda_.Code.from_asset("../apps/api/lambdas/organizations"),
            timeout=Duration.seconds(30),
            memory_size=256,
            role=self.lambda_execution_role,
            layers=[organizations_security_layer],
            environment={
                "ALERTS_QUEUE": f"arn:aws:sqs:{self.region}:{self.account}:{self.config.prefix}-alerts-queue",
                "LOGGING_LEVEL": "INFO",
                "VERSION": "1",
                "ORGANIZATIONS_TABLE_NAME": self.dynamodb_stack.tables["organizations"].table_name,
                "USER_POOL_ID": self.cognito_stack.user_pool.user_pool_id,
            },
            dead_letter_queue_enabled=True,
        )

        self.functions["organizations"] = function
        self._export_lambda_arn(function, "organizations")
        return function

    def _create_check_email_exists_lambda(self) -> lambda_.Function:
        """Create CheckEmailExists Lambda function for public email existence checks.
        
        This Lambda is used by the CheckEmailExists GraphQL query to check if an
        email exists in the system. It uses API key authentication for public access
        during the signup/signin flow.
        """
        function = lambda_.Function(
            self,
            "CheckEmailExistsLambda",
            function_name=self.config.resource_name("check-email-exists"),
            description="Lambda function to check if an email exists (public endpoint)",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="index.lambda_handler",
            code=lambda_.Code.from_asset("../apps/api/lambdas/check_email_exists"),
            timeout=Duration.seconds(10),
            memory_size=128,
            role=self.lambda_execution_role,
            environment={
                "ALERTS_QUEUE": f"arn:aws:sqs:{self.region}:{self.account}:{self.config.prefix}-alerts-queue",
                "LOGGING_LEVEL": "INFO",
                "VERSION": "1",
                "USERS_TABLE_NAME": self.dynamodb_stack.tables["users"].table_name,
                "USER_POOL_ID": self.cognito_stack.user_pool.user_pool_id,
            },
            dead_letter_queue_enabled=True,
        )

        self.functions["check-email-exists"] = function
        # Export with lowercase name to match orb-schema-generator convention
        self._export_lambda_arn_custom(function, "checkemailexists")
        return function

    def _export_lambda_arn_custom(self, function: lambda_.Function, name: str) -> None:
        """Export Lambda ARN to SSM parameter with custom name (no hyphens)."""
        ssm.StringParameter(
            self,
            f"{name}LambdaArnParameter",
            parameter_name=self.config.ssm_parameter_name(f"lambda/{name}/arn"),
            string_value=function.function_arn,
            description=f"ARN of the {name} Lambda function",
        )

    def _export_lambda_arn(self, function: lambda_.Function, name: str) -> None:
        """Export Lambda ARN to SSM parameter with path-based naming."""
        ssm.StringParameter(
            self,
            f"{name.replace('-', '')}LambdaArnParameter",
            parameter_name=self.config.ssm_parameter_name(f"lambda/{name}/arn"),
            string_value=function.function_arn,
            description=f"ARN of the {name} Lambda function",
        )
