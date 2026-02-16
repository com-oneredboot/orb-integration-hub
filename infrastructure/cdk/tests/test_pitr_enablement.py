"""Property test for Point-in-Time Recovery enablement.

Feature: platform-improvements, Property 2: All DynamoDB Tables Have Point-in-Time Recovery

Validates: Requirements 1.5

For any DynamoDB table in the CDK stacks, the table SHALL have Point-in-Time
Recovery enabled for data protection and disaster recovery.
"""

import pytest
from aws_cdk import App
from aws_cdk.assertions import Template

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import Config
from stacks.dynamodb_stack import DynamoDBStack


@pytest.fixture
def test_config() -> Config:
    """Create test configuration."""
    return Config(
        customer_id="orb",
        project_id="integration-hub",
        environment="dev",
        region="us-east-1",
        account="123456789012",
        sms_origination_number="+15551234567",
    )


@pytest.fixture
def dynamodb_template(test_config: Config) -> Template:
    """Create CDK template from DynamoDBStack."""
    app = App()
    stack = DynamoDBStack(app, "DynamoDB", config=test_config)
    return Template.from_stack(stack)


class TestDynamoDBPointInTimeRecovery:
    """Test that all DynamoDB tables have Point-in-Time Recovery enabled."""

    # Tables that intentionally don't have PITR (ephemeral data)
    PITR_EXEMPT_TABLES = ["api-rate-limits"]

    def test_all_tables_have_pitr_enabled(self, dynamodb_template: Template):
        """Verify all DynamoDB tables have Point-in-Time Recovery enabled.
        
        Note: Some tables with ephemeral data (like rate limits) are exempt.
        """
        tables = dynamodb_template.find_resources("AWS::DynamoDB::Table")
        
        assert len(tables) > 0, "Expected at least one DynamoDB table"
        
        tables_without_pitr = []
        for table_id, table in tables.items():
            table_name = table.get("Properties", {}).get("TableName", table_id)
            
            # Skip exempt tables
            if any(exempt in table_name for exempt in self.PITR_EXEMPT_TABLES):
                continue
            
            pitr_spec = table.get("Properties", {}).get("PointInTimeRecoverySpecification", {})
            pitr_enabled = pitr_spec.get("PointInTimeRecoveryEnabled", False)
            
            if not pitr_enabled:
                tables_without_pitr.append(table_name)
        
        assert len(tables_without_pitr) == 0, \
            f"Tables without Point-in-Time Recovery: {tables_without_pitr}"

    def test_users_table_has_pitr(self, dynamodb_template: Template):
        """Verify Users table specifically has PITR enabled."""
        dynamodb_template.has_resource_properties(
            "AWS::DynamoDB::Table",
            {
                "TableName": "orb-integration-hub-dev-users",
                "PointInTimeRecoverySpecification": {
                    "PointInTimeRecoveryEnabled": True,
                },
            },
        )

    def test_organizations_table_has_pitr(self, dynamodb_template: Template):
        """Verify Organizations table specifically has PITR enabled."""
        dynamodb_template.has_resource_properties(
            "AWS::DynamoDB::Table",
            {
                "TableName": "orb-integration-hub-dev-organizations",
                "PointInTimeRecoverySpecification": {
                    "PointInTimeRecoveryEnabled": True,
                },
            },
        )

    def test_privacy_requests_table_has_pitr(self, dynamodb_template: Template):
        """Verify PrivacyRequests table specifically has PITR enabled (critical for compliance)."""
        dynamodb_template.has_resource_properties(
            "AWS::DynamoDB::Table",
            {
                "TableName": "orb-integration-hub-dev-privacy-requests",
                "PointInTimeRecoverySpecification": {
                    "PointInTimeRecoveryEnabled": True,
                },
            },
        )
