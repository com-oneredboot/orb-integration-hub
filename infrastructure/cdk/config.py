"""Configuration management for CDK stacks."""

from dataclasses import dataclass
from typing import Optional

from aws_cdk import App


@dataclass
class Config:
    """Configuration for all CDK stacks."""

    customer_id: str
    project_id: str
    environment: str
    region: str
    account: str
    sms_origination_number: str
    alert_email: Optional[str] = None

    @classmethod
    def from_context(cls, app: App) -> "Config":
        """Load configuration from CDK context.

        Context values can be provided via:
        - cdk.json context section
        - Command line: cdk deploy -c environment=prod
        """
        return cls(
            customer_id=app.node.try_get_context("customer_id") or "orb",
            project_id=app.node.try_get_context("project_id") or "integration-hub",
            environment=app.node.try_get_context("environment") or "dev",
            region=app.node.try_get_context("region") or "us-east-1",
            account=app.node.try_get_context("account") or "",
            sms_origination_number=app.node.try_get_context("sms_origination_number") or "",
            alert_email=app.node.try_get_context("alert_email"),
        )

    @property
    def prefix(self) -> str:
        """Resource naming prefix: {customer_id}-{project_id}-{environment}."""
        return f"{self.customer_id}-{self.project_id}-{self.environment}"

    def resource_name(self, name: str) -> str:
        """Generate a fully qualified resource name."""
        return f"{self.prefix}-{name}"

    def ssm_parameter_name(self, resource_path: str) -> str:
        """Generate path-based SSM parameter name.

        Follows orb-schema-generator convention for SSM parameter naming.

        Pattern: /{customer_id}/{project_id}/{environment}/{resource_path}
        Example: /orb/integration-hub/dev/cognito/user-pool-id

        Args:
            resource_path: Resource-specific path (e.g., "cognito/user-pool-id")

        Returns:
            Full SSM parameter path
        """
        return f"/{self.customer_id}/{self.project_id}/{self.environment}/{resource_path}"

    def secret_name(self, service: str, resource: str) -> str:
        """Generate path-based secret name for Secrets Manager.

        Follows the same slash-based convention as SSM Parameter Store for consistency.

        Pattern: {customer_id}/{project_id}/{environment}/secrets/{service}/{resource}
        Example: orb/integration-hub/dev/secrets/github/access-key

        Args:
            service: Service category (e.g., "github", "appsync", "sms")
            resource: Resource identifier (e.g., "access-key", "api-key", "verification")

        Returns:
            Full secret name path (without leading slash for Secrets Manager)
        """
        return (
            f"{self.customer_id}/{self.project_id}/{self.environment}/secrets/{service}/{resource}"
        )

    @property
    def standard_tags(self) -> dict:
        """Standard tags applied to all resources."""
        return {
            "Billable": "true",
            "CustomerId": self.customer_id,
            "Environment": self.environment,
            "ProjectId": self.project_id,
        }


def get_config(app: App) -> Config:
    """Load configuration from CDK context.

    Context values can be provided via:
    - cdk.json context section
    - Command line: cdk deploy -c environment=prod

    Deprecated: Use Config.from_context(app) instead.
    """
    return Config.from_context(app)
