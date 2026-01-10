"""Unit tests for MonitoringStack."""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from aws_cdk import App
from aws_cdk.assertions import Match, Template

from config import Config
from stacks.appsync_stack import AppSyncStack
from stacks.cognito_stack import CognitoStack
from stacks.dynamodb_stack import DynamoDBStack
from stacks.lambda_layers_stack import LambdaLayersStack
from stacks.lambda_stack import LambdaStack
from stacks.monitoring_stack import MonitoringStack


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
        alert_email="alerts@example.com",
    )


@pytest.fixture
def template(test_config: Config) -> Template:
    """Create CDK template from MonitoringStack with dependencies."""
    app = App()

    # Create dependency stacks
    cognito_stack = CognitoStack(
        app,
        "TestCognitoStack",
        config=test_config,
    )
    dynamodb_stack = DynamoDBStack(
        app,
        "TestDynamoDBStack",
        config=test_config,
    )
    layers_stack = LambdaLayersStack(
        app,
        "TestLambdaLayersStack",
        config=test_config,
    )
    lambda_stack = LambdaStack(
        app,
        "TestLambdaStack",
        config=test_config,
        cognito_stack=cognito_stack,
        dynamodb_stack=dynamodb_stack,
        layers_stack=layers_stack,
    )
    appsync_stack = AppSyncStack(
        app,
        "TestAppSyncStack",
        config=test_config,
        cognito_stack=cognito_stack,
        dynamodb_stack=dynamodb_stack,
        lambda_stack=lambda_stack,
    )

    # Create Monitoring stack
    stack = MonitoringStack(
        app,
        "TestMonitoringStack",
        config=test_config,
        appsync_stack=appsync_stack,
    )
    return Template.from_stack(stack)


class TestMonitoringStackKMS:
    """Tests for KMS key."""

    def test_creates_audit_encryption_key(self, template: Template) -> None:
        """Verify KMS key is created for audit encryption."""
        template.has_resource_properties(
            "AWS::KMS::Key",
            {
                "Description": Match.string_like_regexp(".*audit log encryption.*"),
                "EnableKeyRotation": True,
            },
        )

    def test_creates_kms_alias(self, template: Template) -> None:
        """Verify KMS alias is created."""
        template.has_resource_properties(
            "AWS::KMS::Alias",
            {
                "AliasName": "alias/test-project-dev-audit",
            },
        )


class TestMonitoringStackLogGroup:
    """Tests for audit log group."""

    def test_creates_audit_log_group(self, template: Template) -> None:
        """Verify audit log group is created."""
        template.has_resource_properties(
            "AWS::Logs::LogGroup",
            {
                "LogGroupName": "/audit/dev",
                "RetentionInDays": 1096,  # 3 years
            },
        )


class TestMonitoringStackSNS:
    """Tests for SNS topic."""

    def test_creates_security_alert_topic(self, template: Template) -> None:
        """Verify security alert SNS topic is created."""
        template.has_resource_properties(
            "AWS::SNS::Topic",
            {
                "TopicName": "test-project-dev-security-alerts",
                "DisplayName": "test Security Alerts (dev)",
            },
        )

    def test_creates_email_subscription(self, template: Template) -> None:
        """Verify email subscription is created when alert_email is provided."""
        template.has_resource_properties(
            "AWS::SNS::Subscription",
            {
                "Protocol": "email",
                "Endpoint": "alerts@example.com",
            },
        )


class TestMonitoringStackGuardDuty:
    """Tests for GuardDuty."""

    def test_creates_guardduty_detector(self, template: Template) -> None:
        """Verify GuardDuty detector is created."""
        template.has_resource_properties(
            "AWS::GuardDuty::Detector",
            {
                "Enable": True,
                "FindingPublishingFrequency": "FIFTEEN_MINUTES",
            },
        )


class TestMonitoringStackDashboards:
    """Tests for CloudWatch dashboards."""

    def test_creates_appsync_dashboard(self, template: Template) -> None:
        """Verify AppSync dashboard is created."""
        template.has_resource_properties(
            "AWS::CloudWatch::Dashboard",
            {
                "DashboardName": "test-project-dev-appsync-dashboard",
            },
        )

    def test_creates_security_dashboard(self, template: Template) -> None:
        """Verify security dashboard is created."""
        template.has_resource_properties(
            "AWS::CloudWatch::Dashboard",
            {
                "DashboardName": "test-project-dev-security-dashboard",
            },
        )


class TestMonitoringStackAlarms:
    """Tests for CloudWatch alarms."""

    def test_creates_4xx_error_alarm(self, template: Template) -> None:
        """Verify 4XX error alarm is created."""
        template.has_resource_properties(
            "AWS::CloudWatch::Alarm",
            {
                "AlarmName": "test-project-dev-appsync-4xx-error-alarm",
                "MetricName": "4XXError",
                "Namespace": "AWS/AppSync",
                "Threshold": 5,
            },
        )

    def test_creates_5xx_error_alarm(self, template: Template) -> None:
        """Verify 5XX error alarm is created."""
        template.has_resource_properties(
            "AWS::CloudWatch::Alarm",
            {
                "AlarmName": "test-project-dev-appsync-5xx-error-alarm",
                "MetricName": "5XXError",
                "Namespace": "AWS/AppSync",
                "Threshold": 1,
            },
        )

    def test_creates_latency_alarm(self, template: Template) -> None:
        """Verify latency alarm is created."""
        template.has_resource_properties(
            "AWS::CloudWatch::Alarm",
            {
                "AlarmName": "test-project-dev-appsync-latency-alarm",
                "MetricName": "Latency",
                "Namespace": "AWS/AppSync",
                "Threshold": 2000,
            },
        )

    def test_creates_security_events_alarm(self, template: Template) -> None:
        """Verify security events alarm is created."""
        template.has_resource_properties(
            "AWS::CloudWatch::Alarm",
            {
                "AlarmName": "test-project-dev-security-events",
                "MetricName": "SecurityEvents",
            },
        )


class TestMonitoringStackAnomalyDetectors:
    """Tests for anomaly detectors."""

    def test_creates_request_count_anomaly_detector(self, template: Template) -> None:
        """Verify request count anomaly detector is created."""
        template.has_resource_properties(
            "AWS::CloudWatch::AnomalyDetector",
            {
                "MetricName": "RequestCount",
                "Namespace": "AWS/AppSync",
                "Stat": "Average",
            },
        )

    def test_creates_latency_anomaly_detector(self, template: Template) -> None:
        """Verify latency anomaly detector is created."""
        template.has_resource_properties(
            "AWS::CloudWatch::AnomalyDetector",
            {
                "MetricName": "Latency",
                "Namespace": "AWS/AppSync",
                "Stat": "Average",
            },
        )


class TestMonitoringStackMetricFilters:
    """Tests for metric filters."""

    def test_creates_security_events_metric_filter(self, template: Template) -> None:
        """Verify security events metric filter is created."""
        template.has_resource_properties(
            "AWS::Logs::MetricFilter",
            {
                "MetricTransformations": Match.array_with([
                    Match.object_like({
                        "MetricName": "SecurityEvents",
                        "MetricNamespace": "test/project/Security/dev",
                    })
                ]),
            },
        )

    def test_creates_organization_events_metric_filter(self, template: Template) -> None:
        """Verify organization events metric filter is created."""
        template.has_resource_properties(
            "AWS::Logs::MetricFilter",
            {
                "MetricTransformations": Match.array_with([
                    Match.object_like({
                        "MetricName": "OrganizationEvents",
                        "MetricNamespace": "test/project/Organizations/dev",
                    })
                ]),
            },
        )


class TestMonitoringStackSSMParameters:
    """Tests for SSM parameter exports."""

    def test_exports_audit_log_group_name(self, template: Template) -> None:
        """Verify audit log group name is exported to SSM."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "test-project-dev-audit-log-group-name",
                "Type": "String",
            },
        )

    def test_exports_audit_kms_key_arn(self, template: Template) -> None:
        """Verify audit KMS key ARN is exported to SSM."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "test-project-dev-audit-kms-key-arn",
                "Type": "String",
            },
        )

    def test_exports_security_alert_topic_arn(self, template: Template) -> None:
        """Verify security alert topic ARN is exported to SSM."""
        template.has_resource_properties(
            "AWS::SSM::Parameter",
            {
                "Name": "test-project-dev-security-alert-topic-arn",
                "Type": "String",
            },
        )


class TestMonitoringStackTags:
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
