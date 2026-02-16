"""Frontend Stack - S3 and CloudFront for static website hosting.

Creates:
- S3 bucket for website hosting
- CloudFront Origin Access Identity
- CloudFront distribution with cache behaviors
- Custom error responses for SPA routing (404 -> index.html)
- SSM parameters for distribution ID, bucket name, domain name
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
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_s3 as s3,
    aws_ssm as ssm,
)
from constructs import Construct

from config import Config


class FrontendStack(Stack):
    """Frontend stack with S3 and CloudFront for static website hosting."""

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

        # Create S3 bucket for website
        self.website_bucket = self._create_website_bucket()

        # Create CloudFront distribution
        self.distribution = self._create_cloudfront_distribution()

        # Create SSM parameters
        self._create_ssm_parameters()

    def _apply_tags(self) -> None:
        """Apply standard tags to all resources in this stack."""
        for key, value in self.config.standard_tags.items():
            Tags.of(self).add(key, value)

    def _create_website_bucket(self) -> s3.Bucket:
        """Create S3 bucket for website hosting."""
        return s3.Bucket(
            self,
            "WebsiteBucket",
            bucket_name=self.config.resource_name("website"),
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            encryption=s3.BucketEncryption.S3_MANAGED,
            enforce_ssl=True,
            versioned=True,
            removal_policy=RemovalPolicy.RETAIN,
            auto_delete_objects=False,
        )

    def _create_cloudfront_distribution(self) -> cloudfront.Distribution:
        """Create CloudFront distribution for website."""
        # Create CloudFront distribution with Origin Access Control (OAC)
        # OAC is the modern replacement for OAI and is recommended by AWS
        distribution = cloudfront.Distribution(
            self,
            "Distribution",
            comment=f"{self.config.prefix} website distribution",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3BucketOrigin.with_origin_access_control(
                    self.website_bucket,
                ),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowed_methods=cloudfront.AllowedMethods.ALLOW_GET_HEAD,
                cached_methods=cloudfront.CachedMethods.CACHE_GET_HEAD,
                compress=True,
                cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED,
            ),
            default_root_object="index.html",
            error_responses=[
                # SPA routing: redirect 404 to index.html
                cloudfront.ErrorResponse(
                    http_status=404,
                    response_http_status=200,
                    response_page_path="/index.html",
                    ttl=Duration.seconds(0),
                ),
                # SPA routing: redirect 403 to index.html (for direct S3 access attempts)
                cloudfront.ErrorResponse(
                    http_status=403,
                    response_http_status=200,
                    response_page_path="/index.html",
                    ttl=Duration.seconds(0),
                ),
            ],
            price_class=cloudfront.PriceClass.PRICE_CLASS_100,
            enabled=True,
        )

        return distribution

    def _create_ssm_parameters(self) -> None:
        """Create SSM parameters for cross-stack references with path-based naming."""
        # Website Bucket Name
        ssm.StringParameter(
            self,
            "WebsiteBucketNameParameter",
            parameter_name=self.config.ssm_parameter_name("frontend/website-bucket/name"),
            string_value=self.website_bucket.bucket_name,
            description="S3 bucket name for website hosting",
        )

        # Website Bucket ARN
        ssm.StringParameter(
            self,
            "WebsiteBucketArnParameter",
            parameter_name=self.config.ssm_parameter_name("frontend/website-bucket/arn"),
            string_value=self.website_bucket.bucket_arn,
            description="S3 bucket ARN for website hosting",
        )

        # CloudFront Distribution ID
        ssm.StringParameter(
            self,
            "DistributionIdParameter",
            parameter_name=self.config.ssm_parameter_name("frontend/distribution-id"),
            string_value=self.distribution.distribution_id,
            description="CloudFront distribution ID for website",
        )

        # CloudFront Distribution Domain Name
        ssm.StringParameter(
            self,
            "DistributionDomainNameParameter",
            parameter_name=self.config.ssm_parameter_name("frontend/domain-name"),
            string_value=self.distribution.distribution_domain_name,
            description="CloudFront distribution domain name",
        )

        # Website URL
        ssm.StringParameter(
            self,
            "WebsiteUrlParameter",
            parameter_name=self.config.ssm_parameter_name("frontend/website-url"),
            string_value=f"https://{self.distribution.distribution_domain_name}",
            description="Website URL",
        )
