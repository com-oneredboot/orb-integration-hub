#!/usr/bin/env python3
"""CDK App Entry Point for orb-integration-hub.

This is the main entry point for the CDK application. It instantiates all stacks
with the correct dependencies and configuration.

IMPORTANT: Lambda layers are deployed separately via deploy-lambda-layers workflow.
This avoids CloudFormation cross-stack export issues when layer versions change.
The lambda stack reads layer ARNs from SSM parameters instead of direct references.

Usage:
    cdk synth --all
    cdk deploy --all
    cdk deploy BootstrapStack
    cdk diff --all
"""

import os
import sys
from pathlib import Path

# Add current directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

import aws_cdk as cdk

from config import Config
from stacks import (
    AppSyncSdkStack,
    AppSyncStack,
    BootstrapStack,
    CognitoStack,
    DynamoDBStack,
    FrontendStack,
    LambdaStack,
    MonitoringStack,
)


def main() -> None:
    """Create and configure the CDK application."""
    app = cdk.App()

    # Get configuration from CDK context
    config = Config.from_context(app)

    # Environment configuration
    env = cdk.Environment(
        account=config.account or os.environ.get("CDK_DEFAULT_ACCOUNT"),
        region=config.region or os.environ.get("CDK_DEFAULT_REGION", "us-east-1"),
    )

    # Stack naming convention: {customer_id}-{project_id}-{environment}-{stack_name}
    stack_prefix = f"{config.customer_id}-{config.project_id}-{config.environment}"

    # ===== Foundation Stacks (no dependencies) =====

    # Bootstrap Stack - S3 buckets, IAM, SQS queues
    bootstrap_stack = BootstrapStack(
        app,
        f"{stack_prefix}-bootstrap",
        config=config,
        env=env,
        description="Bootstrap resources: S3 buckets, IAM, SQS queues",
    )

    # Cognito Stack - User Pool, Identity Pool, Groups
    cognito_stack = CognitoStack(
        app,
        f"{stack_prefix}-cognito",
        config=config,
        env=env,
        description="Cognito resources: User Pool, Identity Pool, Groups",
    )

    # DynamoDB Stack - All DynamoDB tables
    dynamodb_stack = DynamoDBStack(
        app,
        f"{stack_prefix}-dynamodb",
        config=config,
        env=env,
        description="DynamoDB tables for application data",
    )

    # NOTE: Lambda Layers Stack is deployed separately via deploy-lambda-layers workflow
    # to avoid CloudFormation cross-stack export issues. Layer ARNs are read from SSM.

    # Frontend Stack - S3 and CloudFront for website
    frontend_stack = FrontendStack(
        app,
        f"{stack_prefix}-frontend",
        config=config,
        env=env,
        description="Frontend resources: S3 bucket, CloudFront distribution",
    )

    # ===== Application Stacks (with dependencies) =====

    # Lambda Stack - Lambda functions (depends on Cognito, DynamoDB)
    # Layer ARNs are read from SSM parameters (set by lambda-layers stack)
    lambda_stack = LambdaStack(
        app,
        f"{stack_prefix}-lambda",
        config=config,
        cognito_stack=cognito_stack,
        dynamodb_stack=dynamodb_stack,
        env=env,
        description="Lambda functions for business logic",
    )

    # AppSync Stack - GraphQL API (depends on Cognito, DynamoDB, Lambda)
    appsync_stack = AppSyncStack(
        app,
        f"{stack_prefix}-appsync",
        config=config,
        cognito_stack=cognito_stack,
        dynamodb_stack=dynamodb_stack,
        lambda_stack=lambda_stack,
        env=env,
        description="AppSync GraphQL API",
    )

    # SDK AppSync Stack - GraphQL API for external SDK access (depends on DynamoDB, Lambda)
    appsync_sdk_stack = AppSyncSdkStack(
        app,
        f"{stack_prefix}-appsync-sdk",
        config=config,
        dynamodb_stack=dynamodb_stack,
        lambda_stack=lambda_stack,
        env=env,
        description="SDK AppSync GraphQL API with Lambda authorizer",
    )

    # Monitoring Stack - CloudWatch dashboards and alarms
    # Reads AppSync API ID from SSM parameter (no cross-stack reference)
    monitoring_stack = MonitoringStack(
        app,
        f"{stack_prefix}-monitoring",
        config=config,
        env=env,
        description="Monitoring: CloudWatch dashboards, alarms, GuardDuty",
    )

    # Add stack dependencies explicitly
    lambda_stack.add_dependency(cognito_stack)
    lambda_stack.add_dependency(dynamodb_stack)

    appsync_stack.add_dependency(cognito_stack)
    appsync_stack.add_dependency(dynamodb_stack)
    appsync_stack.add_dependency(lambda_stack)

    appsync_sdk_stack.add_dependency(dynamodb_stack)
    appsync_sdk_stack.add_dependency(lambda_stack)

    # Monitoring depends on AppSync SSM parameter existing
    monitoring_stack.add_dependency(appsync_stack)

    # Synthesize the app
    app.synth()


if __name__ == "__main__":
    main()
