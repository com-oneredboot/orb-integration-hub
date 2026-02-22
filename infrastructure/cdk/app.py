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
    ApiStack,
    AuthorizationStack,
    BootstrapStack,
    ComputeStack,
    DataStack,
    FrontendStack,
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

    # ===== Foundation Stacks (no dependencies) =====

    # Bootstrap Stack - S3 buckets, IAM, SQS queues
    bootstrap_stack = BootstrapStack(
        app,
        f"{config.customer_id}-{config.project_id}-{config.environment}-bootstrap",
        config=config,
        env=env,
        description="Bootstrap resources: S3 buckets, IAM, SQS queues",
    )

    # Authorization Stack - Cognito User Pool, Identity Pool, Groups, API Key Authorizer
    authorization_stack = AuthorizationStack(
        app,
        f"{config.customer_id}-{config.project_id}-{config.environment}-authorization",
        config=config,
        env=env,
        description="Authorization resources: Cognito User Pool, Identity Pool, Groups, API Key Authorizer",
    )

    # Data Stack - All tables (writes SSM parameters)
    data_stack = DataStack(
        app,
        f"{config.customer_id}-{config.project_id}-{config.environment}-data",
        env=env,
        description="DynamoDB tables (writes table names/ARNs to SSM)",
    )

    # NOTE: Lambda Layers Stack is deployed separately via deploy-lambda-layers workflow
    # to avoid CloudFormation cross-stack export issues. Layer ARNs are read from SSM.

    # Frontend Stack - S3 and CloudFront for website
    frontend_stack = FrontendStack(
        app,
        f"{config.customer_id}-{config.project_id}-{config.environment}-frontend",
        config=config,
        env=env,
        description="Frontend resources: S3 bucket, CloudFront distribution",
    )

    # ===== Application Stacks (with dependencies) =====

    # Compute Stack - Business logic Lambda functions
    compute_stack = ComputeStack(
        app,
        f"{config.customer_id}-{config.project_id}-{config.environment}-compute",
        config=config,
        authorization_stack=authorization_stack,
        env=env,
        description="Lambda functions for business logic",
    )

    # API Stack - Main and SDK GraphQL APIs
    # Reads table names from SSM parameters (set by Data Stack)
    # Reads Lambda ARNs from SSM parameters (set by Compute Stack)
    api_stack = ApiStack(
        app,
        f"{config.customer_id}-{config.project_id}-{config.environment}-api",
        config=config,
        env=env,
        description="AppSync APIs: Main (Cognito auth) and SDK (Lambda auth)",
    )

    # Monitoring Stack - CloudWatch dashboards and alarms
    # Reads AppSync API IDs from SSM parameters (no cross-stack reference)
    monitoring_stack = MonitoringStack(
        app,
        f"{config.customer_id}-{config.project_id}-{config.environment}-monitoring",
        config=config,
        env=env,
        description="Monitoring: CloudWatch dashboards, alarms, GuardDuty",
    )

    # Add stack dependencies explicitly
    # Bootstrap must deploy first (provides S3, SQS, IAM)
    data_stack.add_dependency(bootstrap_stack)
    authorization_stack.add_dependency(bootstrap_stack)
    authorization_stack.add_dependency(data_stack)  # Needs ApplicationApiKeys table
    frontend_stack.add_dependency(bootstrap_stack)
    
    # Compute depends on Authorization (for user pool ID) and Data (for table names)
    compute_stack.add_dependency(authorization_stack)
    compute_stack.add_dependency(data_stack)

    # API depends on Data (for table names), Compute (for Lambda ARNs), and Authorization (for API Key Authorizer)
    api_stack.add_dependency(data_stack)
    api_stack.add_dependency(compute_stack)
    api_stack.add_dependency(authorization_stack)

    # Monitoring depends on API
    monitoring_stack.add_dependency(api_stack)

    # Synthesize the app
    app.synth()


if __name__ == "__main__":
    main()
