"""Bootstrap Stack - Foundational resources for orb-integration-hub.

Creates:
- S3 buckets for build artifacts and templates
- IAM user and policies for GitHub Actions
- SQS queues (alerts, dead-letter)
- SMS verification secret
- SSM parameters for cross-stack references
"""

import sys
from pathlib import Path

# Add parent directory to path for imports when running via CDK CLI
sys.path.insert(0, str(Path(__file__).parent.parent))

from aws_cdk import (
    Duration,
    RemovalPolicy,
    Stack,
    Tags,
    aws_iam as iam,
    aws_s3 as s3,
    aws_secretsmanager as secretsmanager,
    aws_sqs as sqs,
    aws_ssm as ssm,
)
from constructs import Construct

from config import Config


class BootstrapStack(Stack):
    """Bootstrap stack with foundational resources."""

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

        # S3 Buckets
        self.build_artifacts_bucket = self._create_build_artifacts_bucket()
        self.build_templates_bucket = self._create_build_templates_bucket()

        # SQS Queues
        self.dead_letter_queue = self._create_dead_letter_queue()
        self.alerts_queue = self._create_alerts_queue()

        # IAM for GitHub Actions
        self._create_github_actions_resources()

        # Secrets
        self.sms_verification_secret = self._create_sms_verification_secret()

    def _apply_tags(self) -> None:
        """Apply standard tags to all resources in this stack."""
        for key, value in self.config.standard_tags.items():
            Tags.of(self).add(key, value)

    def _create_build_artifacts_bucket(self) -> s3.Bucket:
        """Create S3 bucket for build artifacts."""
        bucket = s3.Bucket(
            self,
            "BuildArtifactsBucket",
            bucket_name=f"{self.config.customer_id}-{self.config.project_id}-build-artifacts",
            removal_policy=RemovalPolicy.RETAIN,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
        )
        return bucket

    def _create_build_templates_bucket(self) -> s3.Bucket:
        """Create S3 bucket for build templates with versioning."""
        bucket = s3.Bucket(
            self,
            "BuildTemplatesBucket",
            bucket_name=f"{self.config.customer_id}-{self.config.project_id}-build-templates",
            versioned=True,
            removal_policy=RemovalPolicy.RETAIN,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
        )
        return bucket

    def _create_dead_letter_queue(self) -> sqs.Queue:
        """Create dead letter queue for failed messages."""
        queue = sqs.Queue(
            self,
            "DeadLetterQueue",
            queue_name=self.config.resource_name("dead-letter-queue"),
            retention_period=Duration.days(14),
        )

        # Export ARN to SSM with path-based naming
        ssm.StringParameter(
            self,
            "DeadLetterQueueArnParameter",
            parameter_name=self.config.ssm_parameter_name("sqs/dead-letter-queue/arn"),
            string_value=queue.queue_arn,
        )

        return queue

    def _create_alerts_queue(self) -> sqs.Queue:
        """Create alerts queue for notifications."""
        queue = sqs.Queue(
            self,
            "AlertsQueue",
            queue_name=self.config.resource_name("alerts-queue"),
            retention_period=Duration.days(14),
        )

        # Export ARN to SSM with path-based naming
        ssm.StringParameter(
            self,
            "AlertsQueueArnParameter",
            parameter_name=self.config.ssm_parameter_name("sqs/alerts-queue/arn"),
            string_value=queue.queue_arn,
        )

        return queue

    def _create_github_actions_resources(self) -> None:
        """Create IAM user and policies for GitHub Actions."""
        # IAM User
        github_user = iam.User(
            self,
            "GitHubActionsUser",
            user_name=self.config.resource_name("github-actions"),
        )

        # CloudWatch Logging Policy
        cloudwatch_logging_policy = iam.ManagedPolicy(
            self,
            "CloudWatchLoggingPolicy",
            managed_policy_name=self.config.resource_name("cloudwatch-logging"),
            statements=[
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=[
                        "logs:CreateLogGroup",
                        "logs:CreateLogStream",
                        "logs:PutLogEvents",
                        "logs:DeleteLogGroup",
                        "logs:DeleteLogStream",
                        "logs:DescribeLogGroups",
                        "logs:DescribeLogStreams",
                        "logs:PutRetentionPolicy",
                        "logs:DeleteRetentionPolicy",
                    ],
                    resources=[
                        f"arn:aws:logs:{self.region}:{self.account}:log-group:{self.config.prefix}-*",
                        f"arn:aws:logs:{self.region}:{self.account}:log-group:{self.config.prefix}-*:log-stream:*",
                        f"arn:aws:logs:{self.region}:{self.account}:log-group:/aws/appsync/apis/{self.config.prefix}-*",
                        f"arn:aws:logs:{self.region}:{self.account}:log-group:/aws/appsync/apis/{self.config.prefix}-*:log-stream:*",
                        f"arn:aws:logs:{self.region}:{self.account}:log-group:/{self.config.customer_id}/{self.config.project_id}/{self.config.environment}/audit",
                        f"arn:aws:logs:{self.region}:{self.account}:log-group:/{self.config.customer_id}/{self.config.project_id}/{self.config.environment}/audit:log-stream:*",
                    ],
                ),
            ],
        )

        # Export policy ARN to SSM with path-based naming
        ssm.StringParameter(
            self,
            "CloudWatchLoggingPolicyArnParameter",
            parameter_name=self.config.ssm_parameter_name("iam/cloudwatch-logging-policy/arn"),
            string_value=cloudwatch_logging_policy.managed_policy_arn,
        )

        # CloudWatch Dashboard Policy
        cloudwatch_dashboard_policy = iam.ManagedPolicy(
            self,
            "CloudWatchDashboardPolicy",
            managed_policy_name=self.config.resource_name("cloudwatch-dashboard"),
            statements=[
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=["cloudwatch:PutDashboard", "cloudwatch:DeleteDashboards"],
                    resources=[
                        f"arn:aws:cloudwatch:{self.region}:{self.account}:dashboard/*",
                        f"arn:aws:cloudwatch::{self.account}:dashboard/*",
                    ],
                ),
            ],
        )

        # Export policy ARN to SSM with path-based naming
        ssm.StringParameter(
            self,
            "CloudWatchDashboardPolicyArnParameter",
            parameter_name=self.config.ssm_parameter_name("iam/cloudwatch-dashboard-policy/arn"),
            string_value=cloudwatch_dashboard_policy.managed_policy_arn,
        )

        # Alerts Queue Policy
        alerts_queue_policy = iam.ManagedPolicy(
            self,
            "AlertsQueuePolicy",
            managed_policy_name=self.config.resource_name("alerts-queue-policy"),
            statements=[
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=[
                        "sqs:SendMessage",
                        "sqs:ReceiveMessage",
                        "sqs:DeleteMessage",
                        "sqs:GetQueueAttributes",
                        "sqs:ChangeMessageVisibility",
                    ],
                    resources=[self.alerts_queue.queue_arn],
                ),
            ],
        )

        # Export policy ARN to SSM with path-based naming
        ssm.StringParameter(
            self,
            "AlertsQueuePolicyArnParameter",
            parameter_name=self.config.ssm_parameter_name("iam/alerts-queue-policy/arn"),
            string_value=alerts_queue_policy.managed_policy_arn,
        )

        # Dead Letter Queue Policy
        dead_letter_queue_policy = iam.ManagedPolicy(
            self,
            "DeadLetterQueuePolicy",
            managed_policy_name=self.config.resource_name("dead-letter-queue"),
            statements=[
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=[
                        "sqs:SendMessage",
                        "sqs:ReceiveMessage",
                        "sqs:DeleteMessage",
                        "sqs:GetQueueAttributes",
                        "sqs:ChangeMessageVisibility",
                    ],
                    resources=[self.dead_letter_queue.queue_arn],
                ),
            ],
        )

        # Export policy ARN to SSM with path-based naming
        ssm.StringParameter(
            self,
            "DeadLetterQueuePolicyArnParameter",
            parameter_name=self.config.ssm_parameter_name("iam/dead-letter-queue-policy/arn"),
            string_value=dead_letter_queue_policy.managed_policy_arn,
        )

        # Lambda Event Policy
        lambda_event_policy = iam.ManagedPolicy(
            self,
            "LambdaEventPolicy",
            managed_policy_name=self.config.resource_name("lambda-event"),
            statements=[
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=["lambda:GetEventSourceMapping"],
                    resources=[f"arn:aws:lambda:{self.region}:{self.account}:event-source-mapping:*"],
                ),
            ],
        )

        # Export policy ARN to SSM with path-based naming
        ssm.StringParameter(
            self,
            "LambdaEventPolicyArnParameter",
            parameter_name=self.config.ssm_parameter_name("iam/lambda-event-policy/arn"),
            string_value=lambda_event_policy.managed_policy_arn,
        )

        # Deploy Policy (comprehensive deployment permissions)
        deploy_policy = self._create_deploy_policy()

        # GitHub Actions Deployment Group
        deployment_group = iam.Group(
            self,
            "GitHubActionsDeploymentGroup",
            group_name=self.config.resource_name("github-actions-deployment"),
            managed_policies=[
                cloudwatch_logging_policy,
                cloudwatch_dashboard_policy,
                deploy_policy,
            ],
        )

        # Add user to group
        github_user.add_to_group(deployment_group)

        # Create access key and store in SSM
        access_key = iam.AccessKey(self, "GitHubActionsAccessKey", user=github_user)

        ssm.StringParameter(
            self,
            "GitHubActionsAccessKeyIdParameter",
            parameter_name=self.config.ssm_parameter_name("iam/github-actions/access-key-id"),
            string_value=access_key.access_key_id,
        )

        # Store secret access key in Secrets Manager (more secure than SSM)
        secretsmanager.Secret(
            self,
            "GitHubActionsSecretAccessKey",
            secret_name=self.config.resource_name("github-actions-secret-access-key"),
            secret_string_value=access_key.secret_access_key,
        )

    def _create_deploy_policy(self) -> iam.ManagedPolicy:
        """Create comprehensive deployment policy for GitHub Actions."""
        return iam.ManagedPolicy(
            self,
            "DeployPolicy",
            managed_policy_name=self.config.resource_name("deploy"),
            statements=[
                # IAM permissions
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=["iam:*"],
                    resources=["*"],
                ),
                # CloudFormation permissions
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=[
                        "cloudformation:GetTemplateSummary",
                        "cloudformation:CreateStack",
                        "cloudformation:DescribeStacks",
                        "cloudformation:DeleteStack",
                        "cloudformation:UpdateStack",
                        "cloudformation:CreateChangeSet",
                        "cloudformation:DeleteChangeSet",
                        "cloudformation:DescribeChangeSet",
                        "cloudformation:ExecuteChangeSet",
                        "cloudformation:UpdateChangeSet",
                        "cloudformation:SetStackPolicy",
                        "cloudformation:DescribeStackEvents",
                    ],
                    resources=["*"],
                ),
                # CloudWatch permissions
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=[
                        "cloudwatch:DeleteAlarms",
                        "cloudwatch:DescribeAlarms",
                        "cloudwatch:PutMetricAlarm",
                        "cloudwatch:PutAnomalyDetector",
                        "cloudwatch:DeleteAnomalyDetector",
                        "cloudwatch:DescribeAnomalyDetectors",
                        "logs:PutMetricFilter",
                        "logs:DeleteMetricFilter",
                        "logs:DescribeMetricFilters",
                    ],
                    resources=["*"],
                ),
                # Lambda Layer permissions
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=[
                        "lambda:AddLayerVersionPermission",
                        "lambda:DeleteLayerVersion",
                        "lambda:GetLayerVersion",
                        "lambda:GetLayerVersionPolicy",
                        "lambda:ListLayerVersions",
                        "lambda:ListLayers",
                        "lambda:PublishLayerVersion",
                        "lambda:RemoveLayerVersionPermission",
                    ],
                    resources=[
                        f"arn:aws:lambda:{self.region}:{self.account}:layer:{self.config.customer_id}-{self.config.project_id}-*"
                    ],
                ),
                # Lambda Event Source Mapping
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=[
                        "lambda:CreateEventSourceMapping",
                        "lambda:GetEventSourceMapping",
                        "lambda:TagResource",
                        "lambda:UntagResource",
                    ],
                    resources=["*"],
                ),
                # AppSync, S3, Secrets Manager, etc.
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=[
                        "appsync:*",
                        "events:PutRule",
                        "events:DescribeRule",
                        "events:DeleteRule",
                        "events:UpdateRule",
                        "events:PutTargets",
                        "events:RemoveTargets",
                        "s3:*",
                        "secretsmanager:CreateSecret",
                        "secretsmanager:GetRandomPassword",
                        "secretsmanager:GetSecretValue",
                        "secretsmanager:DeleteSecret",
                        "secretsmanager:TagResource",
                        "secretsmanager:UpdateSecret",
                        "states:*",
                        "cloudfront:*",
                        "route53:*",
                        "ssm:*",
                    ],
                    resources=["*"],
                ),
                # GuardDuty
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=[
                        "guardduty:CreateDetector",
                        "guardduty:DeleteDetector",
                        "guardduty:GetDetector",
                        "guardduty:UpdateDetector",
                        "guardduty:ListDetectors",
                        "guardduty:TagResource",
                        "guardduty:UntagResource",
                    ],
                    resources=["*"],
                ),
                # KMS
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=[
                        "kms:CreateKey",
                        "kms:DeleteKey",
                        "kms:DescribeKey",
                        "kms:GetKeyPolicy",
                        "kms:PutKeyPolicy",
                        "kms:EnableKeyRotation",
                        "kms:CreateAlias",
                        "kms:DeleteAlias",
                        "kms:TagResource",
                        "kms:UntagResource",
                        "kms:ScheduleKeyDeletion",
                        "kms:CancelKeyDeletion",
                    ],
                    resources=["*"],
                ),
                # Cognito
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=[
                        "cognito-identity:CreateIdentityPool",
                        "cognito-identity:DeleteIdentityPool",
                        "cognito-identity:UpdateIdentityPool",
                        "cognito-identity:SetIdentityPoolRoles",
                        "cognito-idp:AddCustomAttributes",
                        "cognito-idp:GetGroup",
                        "cognito-idp:CreateGroup",
                        "cognito-idp:DeleteGroup",
                        "cognito-idp:CreateUserPool",
                        "cognito-idp:AdminCreateUser",
                        "cognito-idp:AdminDeleteUser",
                        "cognito-idp:AdminDeleteUserAttributes",
                        "cognito-idp:AdminAddUserToGroup",
                        "cognito-idp:AdminGetUser",
                        "cognito-idp:AdminRemoveUserFromGroup",
                        "cognito-idp:AdminUpdateUserAttributes",
                        "cognito-idp:UpdateGroup",
                        "cognito-idp:CreateUserPoolClient",
                        "cognito-idp:UpdateUserPoolClient",
                        "cognito-idp:DeleteUserPool",
                        "cognito-idp:DeleteUserPoolClient",
                        "cognito-idp:DescribeUserPool",
                        "cognito-idp:UpdateUserPool",
                        "cognito-idp:ListTagsForResource",
                        "cognito-idp:SetUserPoolMfaConfig",
                    ],
                    resources=[
                        f"arn:aws:cognito-identity:{self.region}:{self.account}:identitypool/*",
                        f"arn:aws:cognito-idp:{self.region}:{self.account}:userpool/*",
                    ],
                ),
                # DynamoDB
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=[
                        "dynamodb:ListTables",
                        "dynamodb:CreateTable",
                        "dynamodb:DeleteTable",
                        "dynamodb:DescribeTable",
                        "dynamodb:UpdateTable",
                        "dynamodb:UpdateTimeToLive",
                        "dynamodb:DescribeTimeToLive",
                        "dynamodb:ListTagsOfResource",
                        "dynamodb:TagResource",
                        "dynamodb:UntagResource",
                    ],
                    resources=[
                        f"arn:aws:dynamodb:{self.region}:{self.account}:table/{self.config.customer_id}-{self.config.project_id}-*"
                    ],
                ),
                # ECR
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=["ecr:*"],
                    resources=[
                        f"arn:aws:ecr:{self.region}:{self.account}:repository/{self.config.customer_id}-{self.config.project_id}-*"
                    ],
                ),
                # Lambda Functions
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=[
                        "lambda:AddPermission",
                        "lambda:CreateAlias",
                        "lambda:CreateFunction",
                        "lambda:CreateEventSourceMapping",
                        "lambda:DeleteAlias",
                        "lambda:DeleteEventSourceMapping",
                        "lambda:DescribeEventSourceMapping",
                        "lambda:DeleteFunction",
                        "lambda:GetAlias",
                        "lambda:GetEventSourceMapping",
                        "lambda:GetFunction",
                        "lambda:GetFunctionConfiguration",
                        "lambda:GetLayerVersion",
                        "lambda:InvokeFunction",
                        "lambda:ListVersionsByFunction",
                        "lambda:ListTags",
                        "lambda:TagResource",
                        "lambda:UntagResource",
                        "lambda:PublishVersion",
                        "lambda:RemovePermission",
                        "lambda:UpdateAlias",
                        "lambda:UpdateFunction",
                        "lambda:UpdateFunctionCode",
                        "lambda:UpdateFunctionConfiguration",
                        "lambda:PublishLayerVersion",
                        "logs:*",
                    ],
                    resources=[
                        f"arn:aws:lambda:{self.region}:{self.account}:function:{self.config.customer_id}-{self.config.project_id}-*"
                    ],
                ),
                # SNS and SQS
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=["sns:*", "sqs:*"],
                    resources=[
                        f"arn:aws:sns:{self.region}:{self.account}:{self.config.customer_id}-{self.config.project_id}-*",
                        f"arn:aws:sqs:{self.region}:{self.account}:{self.config.customer_id}-{self.config.project_id}-*",
                    ],
                ),
            ],
        )

    def _create_sms_verification_secret(self) -> secretsmanager.Secret:
        """Create secret for SMS verification code generation."""
        secret = secretsmanager.Secret(
            self,
            "SmsVerificationSecret",
            secret_name=self.config.resource_name("sms-verification-secret"),
            description="Secret key for SMS verification code generation",
            generate_secret_string=secretsmanager.SecretStringGenerator(
                secret_string_template="{}",
                generate_string_key="secret_key",
                password_length=32,
                exclude_characters='"@/\\',
            ),
        )

        # Export secret name to SSM with path-based naming
        ssm.StringParameter(
            self,
            "SmsVerificationSecretNameParameter",
            parameter_name=self.config.ssm_parameter_name("secrets/sms-verification/name"),
            string_value=secret.secret_name,
            description="Name of the SMS verification secret for lambda access",
        )

        return secret
