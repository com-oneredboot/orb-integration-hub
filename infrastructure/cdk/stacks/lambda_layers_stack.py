"""Lambda Layers Stack - Shared Lambda layers for orb-integration-hub.

Creates:
- Organizations Security layer (RBAC, audit logging, middleware)
- Stripe Payment layer
- SSM parameters for layer ARNs
"""

import sys
from pathlib import Path

# Add parent directory to path for imports when running via CDK CLI
sys.path.insert(0, str(Path(__file__).parent.parent))

from aws_cdk import (
    Stack,
    Tags,
    aws_lambda as lambda_,
    aws_ssm as ssm,
)
from constructs import Construct

from config import Config


class LambdaLayersStack(Stack):
    """Lambda Layers stack with shared dependencies."""

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

        # Create layers
        self.common_layer = self._create_common_layer()
        self.organizations_security_layer = self._create_organizations_security_layer()
        self.stripe_layer = self._create_stripe_layer()

    def _apply_tags(self) -> None:
        """Apply standard tags to all resources in this stack."""
        for key, value in self.config.standard_tags.items():
            Tags.of(self).add(key, value)

    def _create_common_layer(self) -> lambda_.LayerVersion:
        """Create Common Lambda layer with shared dependencies (orb-common, etc.)."""
        layer = lambda_.LayerVersion(
            self,
            "CommonLayer",
            layer_version_name=self.config.resource_name("common-layer"),
            description="Common shared dependencies including orb-common utilities",
            code=lambda_.Code.from_asset("../apps/api/layers/common"),
            compatible_runtimes=[
                lambda_.Runtime.PYTHON_3_12,
                lambda_.Runtime.PYTHON_3_13,
            ],
            license="MIT",
        )

        # Export layer ARN to SSM with path-based naming
        ssm.StringParameter(
            self,
            "CommonLayerArnParameter",
            parameter_name=self.config.ssm_parameter_name("lambda-layers/common/arn"),
            string_value=layer.layer_version_arn,
            description="ARN of the Common Lambda Layer",
        )

        return layer

    def _create_organizations_security_layer(self) -> lambda_.LayerVersion:
        """Create Organizations Security Lambda layer."""
        layer = lambda_.LayerVersion(
            self,
            "OrganizationsSecurityLayer",
            layer_version_name=self.config.resource_name(
                "organizations-security-layer"
            ),
            description="Organization security middleware with audit logging and RBAC utilities",
            code=lambda_.Code.from_asset("../apps/api/layers/organizations_security"),
            compatible_runtimes=[
                lambda_.Runtime.PYTHON_3_12,
                lambda_.Runtime.PYTHON_3_13,
            ],
            license="MIT",
        )

        # Export layer ARN to SSM with path-based naming
        ssm.StringParameter(
            self,
            "OrganizationsSecurityLayerArnParameter",
            parameter_name=self.config.ssm_parameter_name(
                "lambda-layers/organizations-security/arn"
            ),
            string_value=layer.layer_version_arn,
            description="ARN of the Organization Security Lambda Layer",
        )

        return layer

    def _create_stripe_layer(self) -> lambda_.LayerVersion:
        """Create Stripe Payment Lambda layer."""
        layer = lambda_.LayerVersion(
            self,
            "StripeLayer",
            layer_version_name=self.config.resource_name("stripe-layer"),
            description="Stripe Payment processing layer",
            code=lambda_.Code.from_asset("../apps/api/layers/stripe"),
            compatible_runtimes=[
                lambda_.Runtime.PYTHON_3_12,
                lambda_.Runtime.PYTHON_3_13,
            ],
        )

        # Export layer ARN to SSM with path-based naming
        ssm.StringParameter(
            self,
            "StripeLayerArnParameter",
            parameter_name=self.config.ssm_parameter_name("lambda-layers/stripe/arn"),
            string_value=layer.layer_version_arn,
            description="ARN of the Stripe Payment Lambda Layer",
        )

        return layer
