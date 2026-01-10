"""Unit tests for LambdaLayersStack."""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from aws_cdk import App
from aws_cdk.assertions import Match, Template

from config import Config
from stacks.lambda_layers_stack import LambdaLayersStack


@pytest.fixture
def test_config() -> Config:
    """Create test configuration."""
    return Config(
        customer_id="test",
        project_id="project",
        environment="dev",
        region="us-east-1",
        account="123456789012",
        sms_origination_number="+15551234567",
    )


@pytest.fixture
def template(test_config: Config) -> Template:
    """Create CDK template from LambdaLayersStack."""
    app = App()
    stack = LambdaLayersStack(
        app,
        "TestLambdaLayersStack",
        config=test_config,
    )
    return Template.from_stack(stack)


class TestLambdaLayersStackLayerCount:
    """Tests for layer count."""

    def test_creates_two_layers(self, template: Template) -> None:
        """Verify exactly 2 Lambda layers are created."""
        template.resource_count_is("AWS::Lambda::LayerVersion", 2)


class TestLambdaLayersStackOrganizationsSecurityLayer:
    """Tests for Organizations Security layer."""

    def test_creates_organizations_security_layer(self, template: Template) -> None:
        """Verify Organizations Security layer is created."""
        template.has_resource_properties(
            "AWS::Lambda::LayerVersion",
            {
                "LayerName": "test-project-dev-organizations-security-layer",
                "Description": "Organization security middleware with audit logging and RBAC utilities",
            },
        )

    def test_organizations_security_layer_has_compatible_runtimes(self, template: Template) -> None:
        """Verify Organizations Security layer has compatible runtimes."""
        template.has_resource_properties(
            "AWS::Lambda::LayerVersion",
            {
                "LayerName": "test-project-dev-organizations-security-layer",
                "CompatibleRuntimes": Match.array_with(["python3.12", "python3.13"]),
            },
        )


class TestLambdaLayersStackStripeLayer:
    """Tests for Stripe layer."""

    def test_creates_stripe_layer(self, template: Template) -> None:
        """Verify Stripe layer is created."""
        template.has_resource_properties(
            "AWS::Lambda::LayerVersion",
            {
                "LayerName": "test-project-dev-stripe-layer",
                "Description": "Stripe Payment processing layer",
            },
        )


class TestLambdaLayersStackSSMParameters:
    """Tests for SSM parameter exports."""

    def test_exports_organizations_security_layer_arn(self, template: Template) -> None:
        """Verify Organizations Security layer ARN is exported to SSM."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "test-project-dev-organizations-security-layer-arn",
                "Type": "String",
            },
        )

    def test_exports_stripe_layer_arn(self, template: Template) -> None:
        """Verify Stripe layer ARN is exported to SSM."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "test-project-dev-stripe-layer-arn",
                "Type": "String",
            },
        )


class TestLambdaLayersStackTags:
    """Tests for resource tagging."""

    def test_ssm_parameters_have_standard_tags(self, template: Template) -> None:
        """Verify SSM parameters have standard tags."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Tags": Match.object_like({
                    "Billable": "true",
                    "CustomerId": "test",
                    "Environment": "dev",
                    "ProjectId": "project",
                }),
            },
        )
