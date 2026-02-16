"""Monitoring Stack - CloudWatch dashboards, alarms, and security monitoring.

Creates:
- AppSync monitoring dashboard with error and latency metrics
- Security dashboard for audit events
- CloudWatch alarms for 4XX/5XX errors and latency
- Anomaly detectors for request count and latency
- GuardDuty detector
- Audit log group with KMS encryption
- Security alert SNS topic
- SSM parameters for cross-stack references

Note: This stack reads AppSync API ID from SSM parameter to avoid CloudFormation
cross-stack exports which cause update failures.
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
    aws_cloudwatch as cloudwatch,
    aws_cloudwatch_actions as cloudwatch_actions,
    aws_guardduty as guardduty,
    aws_kms as kms,
    aws_logs as logs,
    aws_sns as sns,
    aws_sns_subscriptions as subscriptions,
    aws_ssm as ssm,
)
from constructs import Construct

from config import Config


class MonitoringStack(Stack):
    """Monitoring stack with dashboards, alarms, and security monitoring."""

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
        
        # Read AppSync API ID from SSM parameter (set by AppSync stack)
        self.appsync_api_id = ssm.StringParameter.value_for_string_parameter(
            self, config.ssm_parameter_name("appsync/api-id")
        )

        # Create KMS key for audit encryption
        self.audit_encryption_key = self._create_audit_encryption_key()

        # Create audit log group
        self.audit_log_group = self._create_audit_log_group()

        # Create security alert SNS topic
        self.security_alert_topic = self._create_security_alert_topic()

        # Create GuardDuty detector
        self.guardduty_detector = self._create_guardduty_detector()

        # Create CloudWatch dashboards
        self.appsync_dashboard = self._create_appsync_dashboard()
        self.security_dashboard = self._create_security_dashboard()

        # Create CloudWatch alarms
        self._create_appsync_alarms()

        # Create anomaly detectors and alarms
        self._create_anomaly_detection()

        # Create metric filters
        self._create_metric_filters()

        # Create security events alarm
        self._create_security_events_alarm()

        # Create SSM parameters
        self._create_ssm_parameters()

    def _apply_tags(self) -> None:
        """Apply standard tags to all resources in this stack."""
        for key, value in self.config.standard_tags.items():
            Tags.of(self).add(key, value)

    def _create_audit_encryption_key(self) -> kms.Key:
        """Create KMS key for audit log encryption."""
        from aws_cdk import aws_iam as iam

        # Log group name follows path-based naming convention
        audit_log_group_name = f"/{self.config.customer_id}/{self.config.project_id}/{self.config.environment}/audit"

        key = kms.Key(
            self,
            "AuditEncryptionKey",
            alias=f"alias/{self.config.prefix}-audit",
            description=f"KMS key for audit log encryption in {self.config.environment}",
            enable_key_rotation=True,
            removal_policy=RemovalPolicy.RETAIN,
        )

        # Grant CloudWatch Logs permission to use the key
        key.add_to_resource_policy(
            iam.PolicyStatement(
                actions=[
                    "kms:Encrypt*",
                    "kms:Decrypt*",
                    "kms:ReEncrypt*",
                    "kms:GenerateDataKey*",
                    "kms:Describe*",
                ],
                principals=[
                    iam.ServicePrincipal(f"logs.{self.region}.amazonaws.com")
                ],
                resources=["*"],
                conditions={
                    "ArnLike": {
                        "kms:EncryptionContext:aws:logs:arn": f"arn:aws:logs:{self.region}:{self.account}:log-group:{audit_log_group_name}"
                    }
                },
            )
        )

        return key

    def _create_audit_log_group(self) -> logs.LogGroup:
        """Create CloudWatch log group for audit events."""
        # Log group name follows path-based naming convention
        audit_log_group_name = f"/{self.config.customer_id}/{self.config.project_id}/{self.config.environment}/audit"
        
        return logs.LogGroup(
            self,
            "AuditLogGroup",
            log_group_name=audit_log_group_name,
            retention=logs.RetentionDays.THREE_YEARS,
            encryption_key=self.audit_encryption_key,
            removal_policy=RemovalPolicy.RETAIN,
        )

    def _create_security_alert_topic(self) -> sns.Topic:
        """Create SNS topic for security alerts."""
        topic = sns.Topic(
            self,
            "SecurityAlertTopic",
            topic_name=self.config.resource_name("security-alerts"),
            display_name=f"{self.config.customer_id} Security Alerts ({self.config.environment})",
            master_key=self.audit_encryption_key,
        )

        # Add email subscription if alert_email is configured
        if self.config.alert_email:
            topic.add_subscription(
                subscriptions.EmailSubscription(self.config.alert_email)
            )

        return topic

    def _create_guardduty_detector(self) -> guardduty.CfnDetector:
        """Create GuardDuty detector for threat detection."""
        return guardduty.CfnDetector(
            self,
            "GuardDutyDetector",
            enable=True,
            finding_publishing_frequency="FIFTEEN_MINUTES",
        )

    def _create_appsync_dashboard(self) -> cloudwatch.Dashboard:
        """Create CloudWatch dashboard for AppSync metrics."""
        api_id = self.appsync_api_id

        return cloudwatch.Dashboard(
            self,
            "AppSyncDashboard",
            dashboard_name=self.config.resource_name("appsync-dashboard"),
            widgets=[
                [
                    cloudwatch.GraphWidget(
                        title="AppSync 4XX/5XX Errors",
                        left=[
                            cloudwatch.Metric(
                                namespace="AWS/AppSync",
                                metric_name="4XXError",
                                dimensions_map={"GraphQLAPIId": api_id},
                                statistic="Sum",
                            ),
                            cloudwatch.Metric(
                                namespace="AWS/AppSync",
                                metric_name="5XXError",
                                dimensions_map={"GraphQLAPIId": api_id},
                                statistic="Sum",
                            ),
                        ],
                        width=12,
                        height=6,
                    ),
                    cloudwatch.GraphWidget(
                        title="AppSync Latency",
                        left=[
                            cloudwatch.Metric(
                                namespace="AWS/AppSync",
                                metric_name="Latency",
                                dimensions_map={"GraphQLAPIId": api_id},
                                statistic="Average",
                            ),
                            cloudwatch.Metric(
                                namespace="AWS/AppSync",
                                metric_name="IntegrationLatency",
                                dimensions_map={"GraphQLAPIId": api_id},
                                statistic="Average",
                            ),
                        ],
                        width=12,
                        height=6,
                    ),
                ],
                [
                    cloudwatch.GraphWidget(
                        title="AppSync Request Count",
                        left=[
                            cloudwatch.Metric(
                                namespace="AWS/AppSync",
                                metric_name="RequestCount",
                                dimensions_map={"GraphQLAPIId": api_id},
                                statistic="Sum",
                            ),
                        ],
                        width=12,
                        height=6,
                    ),
                    cloudwatch.GraphWidget(
                        title="AppSync Throttled Requests",
                        left=[
                            cloudwatch.Metric(
                                namespace="AWS/AppSync",
                                metric_name="ThrottledRequests",
                                dimensions_map={"GraphQLAPIId": api_id},
                                statistic="Sum",
                            ),
                        ],
                        width=12,
                        height=6,
                    ),
                ],
            ],
        )

    def _create_security_dashboard(self) -> cloudwatch.Dashboard:
        """Create CloudWatch dashboard for security monitoring."""
        return cloudwatch.Dashboard(
            self,
            "SecurityDashboard",
            dashboard_name=self.config.resource_name("security-dashboard"),
            widgets=[
                [
                    cloudwatch.LogQueryWidget(
                        title="Unauthorized Access Attempts (5-min intervals)",
                        log_group_names=[self.audit_log_group.log_group_name],
                        query_string='filter event_type = "UNAUTHORIZED_ACCESS_ATTEMPT" | stats count() by bin(5m)',
                        width=12,
                        height=6,
                    ),
                    cloudwatch.LogQueryWidget(
                        title="Top 10 Most Active Organizations",
                        log_group_names=[self.audit_log_group.log_group_name],
                        query_string='filter organization_id != "" | stats count() as requests by organization_id | sort requests desc | limit 10',
                        width=12,
                        height=6,
                    ),
                ],
                [
                    cloudwatch.LogQueryWidget(
                        title="Recent High-Priority Security Events",
                        log_group_names=[self.audit_log_group.log_group_name],
                        query_string='filter event_type in ["CROSS_ORGANIZATION_ACCESS", "PRIVILEGE_ESCALATION", "SUSPICIOUS_API_USAGE"] | fields @timestamp, event_type, user_context.user_id, organization_id | sort @timestamp desc | limit 20',
                        width=12,
                        height=6,
                    ),
                    cloudwatch.LogQueryWidget(
                        title="Slow API Requests (>1s) by Organization",
                        log_group_names=[self.audit_log_group.log_group_name],
                        query_string='filter action_details.response_time_ms > 1000 | stats count() as slow_requests by organization_id | sort slow_requests desc | limit 10',
                        width=12,
                        height=6,
                    ),
                ],
            ],
        )

    def _create_appsync_alarms(self) -> None:
        """Create CloudWatch alarms for AppSync metrics."""
        api_id = self.appsync_api_id

        # 4XX Error Alarm
        cloudwatch.Alarm(
            self,
            "AppSync4XXErrorAlarm",
            alarm_name=self.config.resource_name("appsync-4xx-error-alarm"),
            alarm_description="AppSync 4XX error rate is high.",
            metric=cloudwatch.Metric(
                namespace="AWS/AppSync",
                metric_name="4XXError",
                dimensions_map={"GraphQLAPIId": api_id},
                statistic="Sum",
                period=Duration.minutes(5),
            ),
            threshold=5,
            evaluation_periods=1,
            comparison_operator=cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treat_missing_data=cloudwatch.TreatMissingData.NOT_BREACHING,
        )

        # 5XX Error Alarm
        cloudwatch.Alarm(
            self,
            "AppSync5XXErrorAlarm",
            alarm_name=self.config.resource_name("appsync-5xx-error-alarm"),
            alarm_description="AppSync 5XX error rate is high.",
            metric=cloudwatch.Metric(
                namespace="AWS/AppSync",
                metric_name="5XXError",
                dimensions_map={"GraphQLAPIId": api_id},
                statistic="Sum",
                period=Duration.minutes(5),
            ),
            threshold=1,
            evaluation_periods=1,
            comparison_operator=cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treat_missing_data=cloudwatch.TreatMissingData.NOT_BREACHING,
        )

        # Latency Alarm
        cloudwatch.Alarm(
            self,
            "AppSyncLatencyAlarm",
            alarm_name=self.config.resource_name("appsync-latency-alarm"),
            alarm_description="AppSync average latency is high (ms).",
            metric=cloudwatch.Metric(
                namespace="AWS/AppSync",
                metric_name="Latency",
                dimensions_map={"GraphQLAPIId": api_id},
                statistic="Average",
                period=Duration.minutes(5),
            ),
            threshold=2000,
            evaluation_periods=1,
            comparison_operator=cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treat_missing_data=cloudwatch.TreatMissingData.NOT_BREACHING,
        )

    def _create_anomaly_detection(self) -> None:
        """Create anomaly detectors and alarms for AppSync metrics."""
        api_id = self.appsync_api_id

        # Request Count Anomaly Detector
        cloudwatch.CfnAnomalyDetector(
            self,
            "AppSyncRequestCountAnomalyDetector",
            metric_name="RequestCount",
            namespace="AWS/AppSync",
            stat="Average",
            dimensions=[
                cloudwatch.CfnAnomalyDetector.DimensionProperty(
                    name="GraphQLAPIId",
                    value=api_id,
                )
            ],
        )

        # Latency Anomaly Detector
        cloudwatch.CfnAnomalyDetector(
            self,
            "AppSyncLatencyAnomalyDetector",
            metric_name="Latency",
            namespace="AWS/AppSync",
            stat="Average",
            dimensions=[
                cloudwatch.CfnAnomalyDetector.DimensionProperty(
                    name="GraphQLAPIId",
                    value=api_id,
                )
            ],
        )

    def _create_metric_filters(self) -> None:
        """Create CloudWatch metric filters for audit logs."""
        # Security Events Metric Filter
        logs.MetricFilter(
            self,
            "SecurityEventsMetricFilter",
            log_group=self.audit_log_group,
            filter_pattern=logs.FilterPattern.any_term(
                "SECURITY_VIOLATION",
                "UNAUTHORIZED_ACCESS",
                "LOGIN_FAILED",
                "PERMISSION_DENIED",
                "DATA_BREACH",
                "FRAUD_DETECTED",
            ),
            metric_namespace=f"{self.config.customer_id}/{self.config.project_id}/Security/{self.config.environment}",
            metric_name="SecurityEvents",
            metric_value="1",
            default_value=0,
        )

        # Organization Events Metric Filter
        logs.MetricFilter(
            self,
            "OrganizationEventsMetricFilter",
            log_group=self.audit_log_group,
            filter_pattern=logs.FilterPattern.any_term(
                "ORGANIZATION_CREATED",
                "ORGANIZATION_UPDATED",
                "ORGANIZATION_DELETED",
                "ORGANIZATION_OWNERSHIP_TRANSFERRED",
                "USER_INVITED",
                "USER_REMOVED",
            ),
            metric_namespace=f"{self.config.customer_id}/{self.config.project_id}/Organizations/{self.config.environment}",
            metric_name="OrganizationEvents",
            metric_value="1",
            default_value=0,
        )

    def _create_security_events_alarm(self) -> None:
        """Create CloudWatch alarm for security events."""
        alarm = cloudwatch.Alarm(
            self,
            "SecurityEventsAlarm",
            alarm_name=self.config.resource_name("security-events"),
            alarm_description="Alert on security violations and unauthorized access attempts",
            metric=cloudwatch.Metric(
                namespace=f"{self.config.customer_id}/{self.config.project_id}/Security/{self.config.environment}",
                metric_name="SecurityEvents",
                statistic="Sum",
                period=Duration.minutes(5),
            ),
            threshold=1,
            evaluation_periods=1,
            comparison_operator=cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treat_missing_data=cloudwatch.TreatMissingData.NOT_BREACHING,
        )
        alarm.add_alarm_action(
            cloudwatch_actions.SnsAction(self.security_alert_topic)
        )

    def _create_ssm_parameters(self) -> None:
        """Create SSM parameters for cross-stack references with path-based naming."""
        # Audit Log Group Name
        ssm.StringParameter(
            self,
            "AuditLogGroupNameParameter",
            parameter_name=self.config.ssm_parameter_name("monitoring/audit-log-group/name"),
            string_value=self.audit_log_group.log_group_name,
            description="CloudWatch log group for audit events",
        )

        # Audit Encryption Key ARN
        ssm.StringParameter(
            self,
            "AuditEncryptionKeyArnParameter",
            parameter_name=self.config.ssm_parameter_name("monitoring/audit-kms-key/arn"),
            string_value=self.audit_encryption_key.key_arn,
            description="KMS Key ARN for audit log encryption",
        )

        # Security Alert Topic ARN
        ssm.StringParameter(
            self,
            "SecurityAlertTopicArnParameter",
            parameter_name=self.config.ssm_parameter_name("monitoring/security-alert-topic/arn"),
            string_value=self.security_alert_topic.topic_arn,
            description="SNS topic for security alerts",
        )
