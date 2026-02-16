"""Unit tests for FrontendStack."""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from aws_cdk import App
from aws_cdk.assertions import Match, Template

from config import Config
from stacks.frontend_stack import FrontendStack


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
    """Create CDK template from FrontendStack."""
    app = App()
    stack = FrontendStack(
        app,
        "TestFrontendStack",
        config=test_config,
    )
    return Template.from_stack(stack)


class TestFrontendStackS3Bucket:
    """Tests for S3 bucket."""

    def test_creates_website_bucket(self, template: Template) -> None:
        """Verify website S3 bucket is created."""
        template.has_resource_properties(
            "AWS::S3::Bucket",
            {
                "BucketName": "test-project-dev-website",
                "BucketEncryption": Match.object_like({
                    "ServerSideEncryptionConfiguration": Match.array_with([
                        Match.object_like({
                            "ServerSideEncryptionByDefault": {
                                "SSEAlgorithm": "AES256"
                            }
                        })
                    ])
                }),
            },
        )

    def test_bucket_blocks_public_access(self, template: Template) -> None:
        """Verify bucket blocks all public access."""
        template.has_resource_properties(
            "AWS::S3::Bucket",
            {
                "PublicAccessBlockConfiguration": {
                    "BlockPublicAcls": True,
                    "BlockPublicPolicy": True,
                    "IgnorePublicAcls": True,
                    "RestrictPublicBuckets": True,
                },
            },
        )

    def test_bucket_has_versioning(self, template: Template) -> None:
        """Verify bucket has versioning enabled."""
        template.has_resource_properties(
            "AWS::S3::Bucket",
            {
                "VersioningConfiguration": {
                    "Status": "Enabled"
                },
            },
        )


class TestFrontendStackCloudFront:
    """Tests for CloudFront distribution."""

    def test_creates_cloudfront_distribution(self, template: Template) -> None:
        """Verify CloudFront distribution is created."""
        template.has_resource_properties(
            "AWS::CloudFront::Distribution",
            {
                "DistributionConfig": Match.object_like({
                    "Enabled": True,
                    "DefaultRootObject": "index.html",
                }),
            },
        )

    def test_distribution_has_https_redirect(self, template: Template) -> None:
        """Verify distribution redirects HTTP to HTTPS."""
        template.has_resource_properties(
            "AWS::CloudFront::Distribution",
            {
                "DistributionConfig": Match.object_like({
                    "DefaultCacheBehavior": Match.object_like({
                        "ViewerProtocolPolicy": "redirect-to-https",
                    }),
                }),
            },
        )

    def test_distribution_has_compression(self, template: Template) -> None:
        """Verify distribution has compression enabled."""
        template.has_resource_properties(
            "AWS::CloudFront::Distribution",
            {
                "DistributionConfig": Match.object_like({
                    "DefaultCacheBehavior": Match.object_like({
                        "Compress": True,
                    }),
                }),
            },
        )

    def test_distribution_has_spa_error_responses(self, template: Template) -> None:
        """Verify distribution has SPA error responses for 404."""
        template.has_resource_properties(
            "AWS::CloudFront::Distribution",
            {
                "DistributionConfig": Match.object_like({
                    "CustomErrorResponses": Match.array_with([
                        Match.object_like({
                            "ErrorCode": 404,
                            "ResponseCode": 200,
                            "ResponsePagePath": "/index.html",
                        }),
                    ]),
                }),
            },
        )

    def test_distribution_has_403_error_response(self, template: Template) -> None:
        """Verify distribution has SPA error response for 403."""
        template.has_resource_properties(
            "AWS::CloudFront::Distribution",
            {
                "DistributionConfig": Match.object_like({
                    "CustomErrorResponses": Match.array_with([
                        Match.object_like({
                            "ErrorCode": 403,
                            "ResponseCode": 200,
                            "ResponsePagePath": "/index.html",
                        }),
                    ]),
                }),
            },
        )


class TestFrontendStackOAC:
    """Tests for Origin Access Control."""

    def test_creates_origin_access_control(self, template: Template) -> None:
        """Verify Origin Access Control is created."""
        template.has_resource_properties(
            "AWS::CloudFront::OriginAccessControl",
            {
                "OriginAccessControlConfig": Match.object_like({
                    "OriginAccessControlOriginType": "s3",
                    "SigningBehavior": "always",
                    "SigningProtocol": "sigv4",
                }),
            },
        )


class TestFrontendStackSSMParameters:
    """Tests for SSM parameter exports using path-based naming."""

    def test_exports_website_bucket_name(self, template: Template) -> None:
        """Verify website bucket name is exported to SSM with path-based naming."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/frontend/website-bucket/name",
                "Type": "String",
            },
        )

    def test_exports_website_bucket_arn(self, template: Template) -> None:
        """Verify website bucket ARN is exported to SSM with path-based naming."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/frontend/website-bucket/arn",
                "Type": "String",
            },
        )

    def test_exports_distribution_id(self, template: Template) -> None:
        """Verify CloudFront distribution ID is exported to SSM with path-based naming."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/frontend/distribution-id",
                "Type": "String",
            },
        )

    def test_exports_distribution_domain_name(self, template: Template) -> None:
        """Verify CloudFront domain name is exported to SSM with path-based naming."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/frontend/domain-name",
                "Type": "String",
            },
        )

    def test_exports_website_url(self, template: Template) -> None:
        """Verify website URL is exported to SSM with path-based naming."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/frontend/website-url",
                "Type": "String",
            },
        )


class TestFrontendStackTags:
    """Tests for resource tagging."""

    def test_resources_have_standard_tags(self, template: Template) -> None:
        """Verify resources have standard tags."""
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
