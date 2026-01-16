"""Unit tests for DynamoDBStack."""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from aws_cdk import App
from aws_cdk.assertions import Match, Template

from config import Config
from stacks.dynamodb_stack import DynamoDBStack


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
    """Create CDK template from DynamoDBStack."""
    app = App()
    stack = DynamoDBStack(
        app,
        "TestDynamoDBStack",
        config=test_config,
    )
    return Template.from_stack(stack)


class TestDynamoDBStackTableCount:
    """Tests for table count."""

    def test_creates_eleven_tables(self, template: Template) -> None:
        """Verify exactly 11 DynamoDB tables are created."""
        template.resource_count_is("AWS::DynamoDB::Table", 11)


class TestDynamoDBStackUsersTable:
    """Tests for Users table."""

    def test_creates_users_table(self, template: Template) -> None:
        """Verify Users table is created with correct name."""
        template.has_resource_properties(
            "AWS::DynamoDB::Table",
            {
                "TableName": "test-project-dev-users",
                "BillingMode": "PAY_PER_REQUEST",
            },
        )

    def test_users_table_has_stream(self, template: Template) -> None:
        """Verify Users table has DynamoDB Streams enabled."""
        template.has_resource_properties(
            "AWS::DynamoDB::Table",
            {
                "TableName": "test-project-dev-users",
                "StreamSpecification": {
                    "StreamViewType": "NEW_AND_OLD_IMAGES",
                },
            },
        )

    def test_users_table_has_email_gsi(self, template: Template) -> None:
        """Verify Users table has EmailIndex GSI."""
        template.has_resource_properties(
            "AWS::DynamoDB::Table",
            {
                "TableName": "test-project-dev-users",
                "GlobalSecondaryIndexes": Match.array_with([
                    Match.object_like({
                        "IndexName": "EmailIndex",
                        "KeySchema": [
                            {"AttributeName": "email", "KeyType": "HASH"},
                        ],
                    }),
                ]),
            },
        )


class TestDynamoDBStackOrganizationsTable:
    """Tests for Organizations table."""

    def test_creates_organizations_table(self, template: Template) -> None:
        """Verify Organizations table is created."""
        template.has_resource_properties(
            "AWS::DynamoDB::Table",
            {
                "TableName": "test-project-dev-organizations",
                "BillingMode": "PAY_PER_REQUEST",
            },
        )

    def test_organizations_table_has_owner_gsi(self, template: Template) -> None:
        """Verify Organizations table has OwnerIndex GSI."""
        template.has_resource_properties(
            "AWS::DynamoDB::Table",
            {
                "TableName": "test-project-dev-organizations",
                "GlobalSecondaryIndexes": Match.array_with([
                    Match.object_like({
                        "IndexName": "OwnerIndex",
                        "KeySchema": [
                            {"AttributeName": "ownerId", "KeyType": "HASH"},
                            {"AttributeName": "createdAt", "KeyType": "RANGE"},
                        ],
                    }),
                ]),
            },
        )


class TestDynamoDBStackOrganizationUsersTable:
    """Tests for OrganizationUsers table."""

    def test_creates_organization_users_table(self, template: Template) -> None:
        """Verify OrganizationUsers table is created with composite key."""
        template.has_resource_properties(
            "AWS::DynamoDB::Table",
            {
                "TableName": "test-project-dev-organization-users",
                "KeySchema": [
                    {"AttributeName": "userId", "KeyType": "HASH"},
                    {"AttributeName": "organizationId", "KeyType": "RANGE"},
                ],
            },
        )


class TestDynamoDBStackApplicationsTable:
    """Tests for Applications table."""

    def test_creates_applications_table(self, template: Template) -> None:
        """Verify Applications table is created."""
        template.has_resource_properties(
            "AWS::DynamoDB::Table",
            {
                "TableName": "test-project-dev-applications",
                "BillingMode": "PAY_PER_REQUEST",
            },
        )


class TestDynamoDBStackApplicationUsersTable:
    """Tests for ApplicationUsers table."""

    def test_creates_application_users_table(self, template: Template) -> None:
        """Verify ApplicationUsers table is created."""
        template.has_resource_properties(
            "AWS::DynamoDB::Table",
            {
                "TableName": "test-project-dev-application-users",
                "BillingMode": "PAY_PER_REQUEST",
            },
        )


class TestDynamoDBStackApplicationRolesTable:
    """Tests for ApplicationRoles table."""

    def test_creates_application_roles_table(self, template: Template) -> None:
        """Verify ApplicationRoles table is created."""
        template.has_resource_properties(
            "AWS::DynamoDB::Table",
            {
                "TableName": "test-project-dev-application-roles",
                "BillingMode": "PAY_PER_REQUEST",
            },
        )


class TestDynamoDBStackRolesTable:
    """Tests for Roles table."""

    def test_creates_roles_table(self, template: Template) -> None:
        """Verify Roles table is created."""
        template.has_resource_properties(
            "AWS::DynamoDB::Table",
            {
                "TableName": "test-project-dev-roles",
                "BillingMode": "PAY_PER_REQUEST",
            },
        )


class TestDynamoDBStackNotificationsTable:
    """Tests for Notifications table."""

    def test_creates_notifications_table(self, template: Template) -> None:
        """Verify Notifications table is created."""
        template.has_resource_properties(
            "AWS::DynamoDB::Table",
            {
                "TableName": "test-project-dev-notifications",
                "BillingMode": "PAY_PER_REQUEST",
            },
        )


class TestDynamoDBStackPrivacyRequestsTable:
    """Tests for PrivacyRequests table."""

    def test_creates_privacy_requests_table(self, template: Template) -> None:
        """Verify PrivacyRequests table is created."""
        template.has_resource_properties(
            "AWS::DynamoDB::Table",
            {
                "TableName": "test-project-dev-privacy-requests",
                "BillingMode": "PAY_PER_REQUEST",
            },
        )


class TestDynamoDBStackOwnershipTransferRequestsTable:
    """Tests for OwnershipTransferRequests table."""

    def test_creates_ownership_transfer_requests_table(self, template: Template) -> None:
        """Verify OwnershipTransferRequests table is created."""
        template.has_resource_properties(
            "AWS::DynamoDB::Table",
            {
                "TableName": "test-project-dev-ownership-transfer-requests",
                "BillingMode": "PAY_PER_REQUEST",
            },
        )


class TestDynamoDBStackSmsRateLimitTable:
    """Tests for SmsRateLimit table."""

    def test_creates_sms_rate_limit_table(self, template: Template) -> None:
        """Verify SmsRateLimit table is created."""
        template.has_resource_properties(
            "AWS::DynamoDB::Table",
            {
                "TableName": "test-project-dev-sms-rate-limit",
                "BillingMode": "PAY_PER_REQUEST",
            },
        )


class TestDynamoDBStackSSMParameters:
    """Tests for SSM parameter exports using path-based naming."""

    def test_exports_users_table_arn(self, template: Template) -> None:
        """Verify Users table ARN is exported to SSM with path-based naming."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/dynamodb/users/arn",
                "Type": "String",
            },
        )

    def test_exports_users_table_name(self, template: Template) -> None:
        """Verify Users table name is exported to SSM with path-based naming."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/dynamodb/users/name",
                "Type": "String",
            },
        )

    def test_exports_users_table_stream_arn(self, template: Template) -> None:
        """Verify Users table stream ARN is exported to SSM with path-based naming."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/dynamodb/users/stream-arn",
                "Type": "String",
            },
        )

    def test_exports_organizations_table_arn(self, template: Template) -> None:
        """Verify Organizations table ARN is exported to SSM with path-based naming."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "/test/project/dev/dynamodb/organizations/arn",
                "Type": "String",
            },
        )


class TestDynamoDBStackTags:
    """Tests for resource tagging."""

    def test_tables_have_standard_tags(self, template: Template) -> None:
        """Verify DynamoDB tables have standard tags."""
        template.has_resource_properties(
            "AWS::DynamoDB::Table",
            {
                "Tags": Match.array_with([
                    {"Key": "Billable", "Value": "true"},
                    {"Key": "CustomerId", "Value": "test"},
                    {"Key": "Environment", "Value": "dev"},
                    {"Key": "ProjectId", "Value": "project"},
                ]),
            },
        )
