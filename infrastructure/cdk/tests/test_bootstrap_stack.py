"""Unit tests for BootstrapStack."""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from aws_cdk import App
from aws_cdk.assertions import Match, Template

from config import Config
from stacks.bootstrap_stack import BootstrapStack


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
    """Create CDK template from BootstrapStack."""
    app = App()
    stack = BootstrapStack(
        app,
        "TestBootstrapStack",
        config=test_config,
    )
    return Template.from_stack(stack)


class TestBootstrapStackBuckets:
    """Tests for S3 bucket creation."""

    def test_creates_build_artifacts_bucket(self, template: Template) -> None:
        """Verify build artifacts bucket is created with correct name."""
        template.has_resource_properties(
            "AWS::S3::Bucket",
            {
                "BucketName": "test-project-build-artifacts",
                "PublicAccessBlockConfiguration": {
                    "BlockPublicAcls": True,
                    "BlockPublicPolicy": True,
                    "IgnorePublicAcls": True,
                    "RestrictPublicBuckets": True,
                },
            },
        )

    def test_creates_build_templates_bucket(self, template: Template) -> None:
        """Verify build templates bucket is created with versioning."""
        template.has_resource_properties(
            "AWS::S3::Bucket",
            {
                "BucketName": "test-project-build-templates",
                "VersioningConfiguration": {"Status": "Enabled"},
            },
        )

    def test_creates_two_buckets(self, template: Template) -> None:
        """Verify exactly two S3 buckets are created."""
        template.resource_count_is("AWS::S3::Bucket", 2)


class TestBootstrapStackQueues:
    """Tests for SQS queue creation."""

    def test_creates_dead_letter_queue(self, template: Template) -> None:
        """Verify dead letter queue is created."""
        template.has_resource_properties(
            "AWS::SQS::Queue",
            {"QueueName": "test-project-dev-dead-letter-queue"},
        )

    def test_creates_alerts_queue(self, template: Template) -> None:
        """Verify alerts queue is created."""
        template.has_resource_properties(
            "AWS::SQS::Queue",
            {"QueueName": "test-project-dev-alerts-queue"},
        )

    def test_creates_two_queues(self, template: Template) -> None:
        """Verify exactly two SQS queues are created."""
        template.resource_count_is("AWS::SQS::Queue", 2)


class TestBootstrapStackSSMParameters:
    """Tests for SSM parameter exports using path-based naming."""

    def test_exports_dead_letter_queue_arn(self, template: Template) -> None:
        """Verify dead letter queue ARN is exported to SSM with path-based naming."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/sqs/dead-letter-queue/arn",
                "Type": "String",
            },
        )

    def test_exports_alerts_queue_arn(self, template: Template) -> None:
        """Verify alerts queue ARN is exported to SSM with path-based naming."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/sqs/alerts-queue/arn",
                "Type": "String",
            },
        )

    def test_exports_cloudwatch_logging_policy_arn(self, template: Template) -> None:
        """Verify CloudWatch logging policy ARN is exported to SSM with path-based naming."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/iam/cloudwatch-logging-policy/arn",
                "Type": "String",
            },
        )


class TestBootstrapStackIAM:
    """Tests for IAM resource creation."""

    def test_creates_github_actions_user(self, template: Template) -> None:
        """Verify GitHub Actions IAM user is created."""
        template.has_resource_properties(
            "AWS::IAM::User",
            {"UserName": "test-project-dev-github-actions"},
        )

    def test_creates_deployment_group(self, template: Template) -> None:
        """Verify GitHub Actions deployment group is created."""
        template.has_resource_properties(
            "AWS::IAM::Group",
            {"GroupName": "test-project-dev-github-actions-deployment"},
        )

    def test_creates_deploy_policy(self, template: Template) -> None:
        """Verify deploy managed policy is created."""
        template.has_resource_properties(
            "AWS::IAM::ManagedPolicy",
            {"ManagedPolicyName": "test-project-dev-deploy"},
        )


class TestBootstrapStackSecrets:
    """Tests for Secrets Manager resources with slash-based naming convention."""

    def test_creates_sms_verification_secret(self, template: Template) -> None:
        """Verify SMS verification secret uses slash-based naming convention."""
        template.has_resource_properties(
            "AWS::SecretsManager::Secret",
            {
                "Name": "test/project/dev/secrets/sms/verification",
                "GenerateSecretString": Match.object_like(
                    {
                        "GenerateStringKey": "secret_key",
                        "PasswordLength": 32,
                    }
                ),
            },
        )

    def test_creates_github_actions_secret(self, template: Template) -> None:
        """Verify GitHub Actions secret uses slash-based naming convention."""
        template.has_resource_properties(
            "AWS::SecretsManager::Secret",
            {
                "Name": "test/project/dev/secrets/github/access-key",
            },
        )

    def test_exports_sms_verification_secret_name(self, template: Template) -> None:
        """Verify SMS verification secret name is exported to SSM."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/secrets/sms-verification/name",
                "Type": "String",
            },
        )


class TestBootstrapStackTags:
    """Tests for resource tagging."""

    def test_buckets_have_standard_tags(self, template: Template) -> None:
        """Verify S3 buckets have standard tags."""
        template.has_resource_properties(
            "AWS::S3::Bucket",
            {
                "Tags": Match.array_with(
                    [
                        {"Key": "Billable", "Value": "true"},
                        {"Key": "CustomerId", "Value": "test"},
                        {"Key": "Environment", "Value": "dev"},
                        {"Key": "ProjectId", "Value": "project"},
                    ]
                ),
            },
        )
