#!/usr/bin/env python3
"""CDK App Entry Point for Lambda Layers.

This is a separate CDK app for deploying Lambda layers independently.
Lambda layers are deployed separately to avoid CloudFormation cross-stack
export issues when layer versions change.

The main app (app.py) reads layer ARNs from SSM parameters instead of
direct stack references.

Usage:
    cdk --app "python cdk/app_lambda_layers.py" synth
    cdk --app "python cdk/app_lambda_layers.py" deploy
    cdk --app "python cdk/app_lambda_layers.py" diff
"""

import os
import sys
from pathlib import Path

# Add current directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

import aws_cdk as cdk

from config import Config
from stacks import LambdaLayersStack


def main() -> None:
    """Create and configure the Lambda Layers CDK application."""
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

    # Lambda Layers Stack - Shared Lambda layers
    LambdaLayersStack(
        app,
        f"{stack_prefix}-lambda-layers",
        config=config,
        env=env,
        description="Lambda layers: organizations_security, stripe",
    )

    # Synthesize the app
    app.synth()


if __name__ == "__main__":
    main()
