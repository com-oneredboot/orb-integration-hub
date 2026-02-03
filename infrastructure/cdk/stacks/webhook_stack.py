"""Webhook Stack - SQS queue and Lambda for webhook delivery.

Creates:
- SQS queue for webhook events with dead letter queue
- WebhookDeliveryLambda for processing and delivering webhooks
- CloudWatch metrics for webhook delivery monitoring
- SSM parameters for cross-stack references

@see .kiro/specs/application-environment-config/design.md
_Requirements: 3.1, 3.2, 3.3, 3.4_
"""

import sys
from pathlib import Path

# Add parent directory to path for imports when running via CDK CLI
sys.path.insert(0, str(Path(__file__).parent.parent))

from aws_cdk import (
    Duration,
    Stack,
    Tags,
    aws_iam as iam,
    aws_lambda as lambda_,
    aws_lambda_event_sources as lambda_event_sources,
    aws_sqs as sqs,
    aws_ssm as ssm,
)
from constructs import Construct

from config import Config
from stacks.dynamodb_stack import DynamoDBStack


class WebhookStack(Stack):
    """Webhook stack with SQS queue and delivery Lambda."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        config: Config,
        dynamodb_stack: DynamoDBStack,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)
        self.config = config
        self.dynamodb_stack = dynamodb_stack
        self._apply_tags()

        # Create dead letter queue first
        self.webhook_dlq = self._create_webhook_dlq()

        # Create main webhook queue
        self.webhook_queue = self._create_webhook_queue()

        # Create Lambda execution role
        self.webhook_lambda_role = self._create_webhook_lambda_role()

        # Create webhook delivery Lambda
        self.webhook_delivery_lambda = self._create_webhook_delivery_lambda()

        # Create SSM parameters
        self._create_ssm_parameters()

    def _apply_tags(self) -> None:
        """Apply standard tags to all resources in this stack."""
        for key, value in self.config.standard_tags.items():
            Tags.of(self).add(key, value)

    def _create_webhook_dlq(self) -> sqs.Queue:
        """Create dead letter queue for failed webhook deliveries."""
        return sqs.Queue(
            self,
            "WebhookDeadLetterQueue",
            queue_name=self.config.resource_name("webhook-dlq"),
            retention_period=Duration.days(14),
            visibility_timeout=Duration.seconds(300),
        )

    def _create_webhook_queue(self) -> sqs.Queue:
        """Create SQS queue for webhook events."""
        return sqs.Queue(
            self,
            "WebhookQueue",
            queue_name=self.config.resource_name("webhook-events"),
            visibility_timeout=Duration.seconds(60),
            retention_period=Duration.days(7),
            dead_letter_queue=sqs.DeadLetterQueue(
                max_receive_count=3,  # Retry 3 times before sending to DLQ
                queue=self.webhook_dlq,
            ),
        )

    def _create_webhook_lambda_role(self) -> iam.Role:
        """Create IAM role for webhook delivery Lambda."""
        role = iam.Role(
            self,
            "WebhookLambdaRole",
            role_name=self.config.resource_name("webhook-lambda-role"),
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "service-role/AWSLambdaBasicExecutionRole"
                ),
            ],
        )

        # SQS Access - receive and delete messages
        role.add_to_policy(
            iam.PolicyStatement(
                sid="SQSAccess",
                effect=iam.Effect.ALLOW,
                actions=[
                    "sqs:ReceiveMessage",
                    "sqs:DeleteMessage",
                    "sqs:GetQueueAttributes",
                ],
                resources=[
                    self.webhook_queue.queue_arn,
                ],
            )
        )

        # DynamoDB Access - read environment config for webhook settings
        role.add_to_policy(
            iam.PolicyStatement(
                sid="DynamoDBAccess",
                effect=iam.Effect.ALLOW,
                actions=[
                    "dynamodb:GetItem",
                    "dynamodb:Query",
                ],
                resources=[
                    self.dynamodb_stack.tables["application-environment-config"].table_arn,
                    f"{self.dynamodb_stack.tables['application-environment-config'].table_arn}/index/*",
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

        # CloudWatch Metrics - for webhook delivery metrics
        role.add_to_policy(
            iam.PolicyStatement(
                sid="CloudWatchMetrics",
                effect=iam.Effect.ALLOW,
                actions=[
                    "cloudwatch:PutMetricData",
                ],
                resources=["*"],
                conditions={
                    "StringEquals": {
                        "cloudwatch:namespace": f"{self.config.customer_id}/{self.config.project_id}/Webhooks/{self.config.environment}"
                    }
                },
            )
        )

        return role

    def _create_webhook_delivery_lambda(self) -> lambda_.Function:
        """Create Lambda function for webhook delivery."""
        function = lambda_.Function(
            self,
            "WebhookDeliveryLambda",
            function_name=self.config.resource_name("webhook-delivery"),
            description="Lambda function to deliver webhooks to configured endpoints",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="index.lambda_handler",
            code=lambda_.Code.from_asset("../apps/api/lambdas/webhooks"),
            timeout=Duration.seconds(30),
            memory_size=256,
            role=self.webhook_lambda_role,
            environment={
                "LOGGING_LEVEL": "INFO",
                "VERSION": "1",
                "ENVIRONMENT_CONFIG_TABLE_NAME": self.dynamodb_stack.tables[
                    "application-environment-config"
                ].table_name,
                "METRICS_NAMESPACE": f"{self.config.customer_id}/{self.config.project_id}/Webhooks/{self.config.environment}",
            },
            reserved_concurrent_executions=10,  # Limit concurrent executions
        )

        # Add SQS event source
        function.add_event_source(
            lambda_event_sources.SqsEventSource(
                self.webhook_queue,
                batch_size=10,
                max_batching_window=Duration.seconds(5),
                report_batch_item_failures=True,  # Enable partial batch response
            )
        )

        return function

    def _create_ssm_parameters(self) -> None:
        """Create SSM parameters for cross-stack references."""
        # Webhook Queue URL
        ssm.StringParameter(
            self,
            "WebhookQueueUrlParameter",
            parameter_name=self.config.ssm_parameter_name("webhook/queue-url"),
            string_value=self.webhook_queue.queue_url,
            description="SQS queue URL for webhook events",
        )

        # Webhook Queue ARN
        ssm.StringParameter(
            self,
            "WebhookQueueArnParameter",
            parameter_name=self.config.ssm_parameter_name("webhook/queue-arn"),
            string_value=self.webhook_queue.queue_arn,
            description="SQS queue ARN for webhook events",
        )

        # Webhook DLQ URL
        ssm.StringParameter(
            self,
            "WebhookDlqUrlParameter",
            parameter_name=self.config.ssm_parameter_name("webhook/dlq-url"),
            string_value=self.webhook_dlq.queue_url,
            description="SQS dead letter queue URL for failed webhooks",
        )

        # Webhook Lambda ARN
        ssm.StringParameter(
            self,
            "WebhookLambdaArnParameter",
            parameter_name=self.config.ssm_parameter_name("lambda/webhook-delivery/arn"),
            string_value=self.webhook_delivery_lambda.function_arn,
            description="ARN of the webhook delivery Lambda function",
        )
