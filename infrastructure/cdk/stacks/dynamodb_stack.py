"""DynamoDB Stack - Database tables for orb-integration-hub.

Creates:
- All DynamoDB tables with correct key schemas and GSIs
- PAY_PER_REQUEST billing mode for all tables
- DynamoDB Streams for Users table
- SSM parameters for table names and ARNs
"""

import sys
from pathlib import Path

# Add parent directory to path for imports when running via CDK CLI
sys.path.insert(0, str(Path(__file__).parent.parent))

from aws_cdk import (
    RemovalPolicy,
    Stack,
    Tags,
    aws_dynamodb as dynamodb,
    aws_ssm as ssm,
)
from constructs import Construct

from config import Config


class DynamoDBStack(Stack):
    """DynamoDB stack with all database tables."""

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

        # Dictionary to store all tables for cross-stack references
        self.tables: dict[str, dynamodb.Table] = {}

        # Create all tables
        self._create_users_table()
        self._create_organizations_table()
        self._create_organization_users_table()
        self._create_applications_table()
        self._create_application_users_table()
        self._create_application_roles_table()
        self._create_roles_table()
        self._create_notifications_table()
        self._create_privacy_requests_table()
        self._create_ownership_transfer_requests_table()
        self._create_sms_rate_limit_table()

        # Application Access Management tables
        self._create_application_groups_table()
        self._create_application_group_users_table()
        self._create_application_group_roles_table()
        self._create_application_user_roles_table()
        self._create_application_api_keys_table()

        # Application Environment Configuration tables
        self._create_application_environment_config_table()
        self._create_api_rate_limits_table()

    def _apply_tags(self) -> None:
        """Apply standard tags to all resources in this stack."""
        for key, value in self.config.standard_tags.items():
            Tags.of(self).add(key, value)

    def _table_name(self, name: str) -> str:
        """Generate table name with prefix."""
        return self.config.resource_name(name)

    def _export_table_params(self, table: dynamodb.Table, name: str, has_stream: bool = False) -> None:
        """Export table name and ARN to SSM parameters with path-based naming."""
        ssm.StringParameter(
            self,
            f"{name}TableArnParameter",
            parameter_name=self.config.ssm_parameter_name(f"dynamodb/{name}/arn"),
            string_value=table.table_arn,
        )

        ssm.StringParameter(
            self,
            f"{name}TableNameParameter",
            parameter_name=self.config.ssm_parameter_name(f"dynamodb/{name}/name"),
            string_value=table.table_name,
        )

        if has_stream and table.table_stream_arn:
            ssm.StringParameter(
                self,
                f"{name}TableStreamArnParameter",
                parameter_name=self.config.ssm_parameter_name(f"dynamodb/{name}/stream-arn"),
                string_value=table.table_stream_arn,
            )

    def _create_users_table(self) -> None:
        """Create Users table with DynamoDB Streams enabled."""
        table = dynamodb.Table(
            self,
            "UsersTable",
            table_name=self._table_name("users"),
            partition_key=dynamodb.Attribute(
                name="userId",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            stream=dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True
            ),
            removal_policy=RemovalPolicy.RETAIN,
        )

        # GSI: EmailIndex
        table.add_global_secondary_index(
            index_name="EmailIndex",
            partition_key=dynamodb.Attribute(
                name="email",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI: CognitoIdIndex
        table.add_global_secondary_index(
            index_name="CognitoIdIndex",
            partition_key=dynamodb.Attribute(
                name="cognitoId",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI: CognitoSubIndex
        table.add_global_secondary_index(
            index_name="CognitoSubIndex",
            partition_key=dynamodb.Attribute(
                name="cognitoSub",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        self.tables["users"] = table
        self._export_table_params(table, "users", has_stream=True)

    def _create_organizations_table(self) -> None:
        """Create Organizations table."""
        table = dynamodb.Table(
            self,
            "OrganizationsTable",
            table_name=self._table_name("organizations"),
            partition_key=dynamodb.Attribute(
                name="organizationId",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True
            ),
            removal_policy=RemovalPolicy.RETAIN,
        )

        # GSI: OwnerIndex
        table.add_global_secondary_index(
            index_name="OwnerIndex",
            partition_key=dynamodb.Attribute(
                name="ownerId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="createdAt",
                type=dynamodb.AttributeType.NUMBER,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI: StatusCreatedIndex
        table.add_global_secondary_index(
            index_name="StatusCreatedIndex",
            partition_key=dynamodb.Attribute(
                name="status",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="createdAt",
                type=dynamodb.AttributeType.NUMBER,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        self.tables["organizations"] = table
        self._export_table_params(table, "organizations")

    def _create_organization_users_table(self) -> None:
        """Create OrganizationUsers table (composite key)."""
        table = dynamodb.Table(
            self,
            "OrganizationUsersTable",
            table_name=self._table_name("organization-users"),
            partition_key=dynamodb.Attribute(
                name="userId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="organizationId",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True
            ),
            removal_policy=RemovalPolicy.RETAIN,
        )

        # GSI: OrganizationMembersIndex
        table.add_global_secondary_index(
            index_name="OrganizationMembersIndex",
            partition_key=dynamodb.Attribute(
                name="organizationId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="role",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI: UserOrganizationsIndex
        table.add_global_secondary_index(
            index_name="UserOrganizationsIndex",
            partition_key=dynamodb.Attribute(
                name="userId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="role",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        self.tables["organization-users"] = table
        self._export_table_params(table, "organization-users")

    def _create_applications_table(self) -> None:
        """Create Applications table."""
        table = dynamodb.Table(
            self,
            "ApplicationsTable",
            table_name=self._table_name("applications"),
            partition_key=dynamodb.Attribute(
                name="applicationId",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True
            ),
            removal_policy=RemovalPolicy.RETAIN,
        )

        # GSI: OrganizationAppsIndex
        table.add_global_secondary_index(
            index_name="OrganizationAppsIndex",
            partition_key=dynamodb.Attribute(
                name="organizationId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="createdAt",
                type=dynamodb.AttributeType.NUMBER,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        self.tables["applications"] = table
        self._export_table_params(table, "applications")

    def _create_application_users_table(self) -> None:
        """Create ApplicationUsers table."""
        table = dynamodb.Table(
            self,
            "ApplicationUsersTable",
            table_name=self._table_name("application-users"),
            partition_key=dynamodb.Attribute(
                name="applicationUserId",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True
            ),
            removal_policy=RemovalPolicy.RETAIN,
        )

        # GSI: UserAppIndex
        table.add_global_secondary_index(
            index_name="UserAppIndex",
            partition_key=dynamodb.Attribute(
                name="userId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="applicationId",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI: AppUserIndex
        table.add_global_secondary_index(
            index_name="AppUserIndex",
            partition_key=dynamodb.Attribute(
                name="applicationId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="userId",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        self.tables["application-users"] = table
        self._export_table_params(table, "application-users")

    def _create_application_roles_table(self) -> None:
        """Create ApplicationRoles table."""
        table = dynamodb.Table(
            self,
            "ApplicationRolesTable",
            table_name=self._table_name("application-roles"),
            partition_key=dynamodb.Attribute(
                name="applicationRoleId",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True
            ),
            removal_policy=RemovalPolicy.RETAIN,
        )

        # GSI: UserRoleIndex
        table.add_global_secondary_index(
            index_name="UserRoleIndex",
            partition_key=dynamodb.Attribute(
                name="userId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="roleId",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI: ApplicationRoleIndex
        table.add_global_secondary_index(
            index_name="ApplicationRoleIndex",
            partition_key=dynamodb.Attribute(
                name="applicationId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="roleId",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI: RoleTypeIndex
        table.add_global_secondary_index(
            index_name="RoleTypeIndex",
            partition_key=dynamodb.Attribute(
                name="roleId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="roleType",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        self.tables["application-roles"] = table
        self._export_table_params(table, "application-roles")

    def _create_roles_table(self) -> None:
        """Create Roles table."""
        table = dynamodb.Table(
            self,
            "RolesTable",
            table_name=self._table_name("roles"),
            partition_key=dynamodb.Attribute(
                name="roleId",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True
            ),
            removal_policy=RemovalPolicy.RETAIN,
        )

        # GSI: UserRoleIndex
        table.add_global_secondary_index(
            index_name="UserRoleIndex",
            partition_key=dynamodb.Attribute(
                name="userId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="roleType",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        self.tables["roles"] = table
        self._export_table_params(table, "roles")

    def _create_notifications_table(self) -> None:
        """Create Notifications table."""
        table = dynamodb.Table(
            self,
            "NotificationsTable",
            table_name=self._table_name("notifications"),
            partition_key=dynamodb.Attribute(
                name="notificationId",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True
            ),
            removal_policy=RemovalPolicy.RETAIN,
        )

        # GSI: UserNotificationsIndex
        table.add_global_secondary_index(
            index_name="UserNotificationsIndex",
            partition_key=dynamodb.Attribute(
                name="recipientUserId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="createdAt",
                type=dynamodb.AttributeType.NUMBER,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI: TypeStatusIndex
        table.add_global_secondary_index(
            index_name="TypeStatusIndex",
            partition_key=dynamodb.Attribute(
                name="type",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="status",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        self.tables["notifications"] = table
        self._export_table_params(table, "notifications")

    def _create_privacy_requests_table(self) -> None:
        """Create PrivacyRequests table."""
        table = dynamodb.Table(
            self,
            "PrivacyRequestsTable",
            table_name=self._table_name("privacy-requests"),
            partition_key=dynamodb.Attribute(
                name="requestId",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True
            ),
            removal_policy=RemovalPolicy.RETAIN,
        )

        # GSI: RequestTypeIndex
        table.add_global_secondary_index(
            index_name="RequestTypeIndex",
            partition_key=dynamodb.Attribute(
                name="requestType",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="receivedAt",
                type=dynamodb.AttributeType.NUMBER,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI: DataSubjectIndex
        table.add_global_secondary_index(
            index_name="DataSubjectIndex",
            partition_key=dynamodb.Attribute(
                name="dataSubjectEmail",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="receivedAt",
                type=dynamodb.AttributeType.NUMBER,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI: OrganizationIndex
        table.add_global_secondary_index(
            index_name="OrganizationIndex",
            partition_key=dynamodb.Attribute(
                name="organizationId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="receivedAt",
                type=dynamodb.AttributeType.NUMBER,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI: StatusIndex
        table.add_global_secondary_index(
            index_name="StatusIndex",
            partition_key=dynamodb.Attribute(
                name="status",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="deadline",
                type=dynamodb.AttributeType.NUMBER,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        self.tables["privacy-requests"] = table
        self._export_table_params(table, "privacy-requests")

    def _create_ownership_transfer_requests_table(self) -> None:
        """Create OwnershipTransferRequests table."""
        table = dynamodb.Table(
            self,
            "OwnershipTransferRequestsTable",
            table_name=self._table_name("ownership-transfer-requests"),
            partition_key=dynamodb.Attribute(
                name="transferId",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True
            ),
            removal_policy=RemovalPolicy.RETAIN,
        )

        # GSI: CurrentOwnerIndex
        table.add_global_secondary_index(
            index_name="CurrentOwnerIndex",
            partition_key=dynamodb.Attribute(
                name="currentOwnerId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="createdAt",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI: NewOwnerIndex
        table.add_global_secondary_index(
            index_name="NewOwnerIndex",
            partition_key=dynamodb.Attribute(
                name="newOwnerId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="createdAt",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI: StatusIndex
        table.add_global_secondary_index(
            index_name="StatusIndex",
            partition_key=dynamodb.Attribute(
                name="status",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="createdAt",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI: ExpirationIndex
        table.add_global_secondary_index(
            index_name="ExpirationIndex",
            partition_key=dynamodb.Attribute(
                name="status",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="expiresAt",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        self.tables["ownership-transfer-requests"] = table
        self._export_table_params(table, "ownership-transfer-requests")

    def _create_sms_rate_limit_table(self) -> None:
        """Create SmsRateLimit table."""
        table = dynamodb.Table(
            self,
            "SmsRateLimitTable",
            table_name=self._table_name("sms-rate-limit"),
            partition_key=dynamodb.Attribute(
                name="phoneNumber",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True
            ),
            removal_policy=RemovalPolicy.RETAIN,
        )

        self.tables["sms-rate-limit"] = table
        self._export_table_params(table, "sms-rate-limit")


    def _create_application_groups_table(self) -> None:
        """Create ApplicationGroups table for managing user groups within applications."""
        table = dynamodb.Table(
            self,
            "ApplicationGroupsTable",
            table_name=self._table_name("application-groups"),
            partition_key=dynamodb.Attribute(
                name="applicationGroupId",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True
            ),
            removal_policy=RemovalPolicy.RETAIN,
        )

        # GSI: ApplicationGroupsIndex - query groups by application with name ordering
        table.add_global_secondary_index(
            index_name="ApplicationGroupsIndex",
            partition_key=dynamodb.Attribute(
                name="applicationId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="name",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI: ApplicationStatusIndex - query groups by application and status
        table.add_global_secondary_index(
            index_name="ApplicationStatusIndex",
            partition_key=dynamodb.Attribute(
                name="applicationId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="status",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        self.tables["application-groups"] = table
        self._export_table_params(table, "application-groups")

    def _create_application_group_users_table(self) -> None:
        """Create ApplicationGroupUsers table for managing user membership in groups."""
        table = dynamodb.Table(
            self,
            "ApplicationGroupUsersTable",
            table_name=self._table_name("application-group-users"),
            partition_key=dynamodb.Attribute(
                name="applicationGroupUserId",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True
            ),
            removal_policy=RemovalPolicy.RETAIN,
        )

        # GSI: GroupUsersIndex - query users by group
        table.add_global_secondary_index(
            index_name="GroupUsersIndex",
            partition_key=dynamodb.Attribute(
                name="applicationGroupId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="userId",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI: UserGroupsIndex - query groups by user
        table.add_global_secondary_index(
            index_name="UserGroupsIndex",
            partition_key=dynamodb.Attribute(
                name="userId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="applicationGroupId",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI: GroupStatusIndex - query memberships by group and status
        table.add_global_secondary_index(
            index_name="GroupStatusIndex",
            partition_key=dynamodb.Attribute(
                name="applicationGroupId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="status",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        self.tables["application-group-users"] = table
        self._export_table_params(table, "application-group-users")

    def _create_application_group_roles_table(self) -> None:
        """Create ApplicationGroupRoles table for assigning roles to groups per environment."""
        table = dynamodb.Table(
            self,
            "ApplicationGroupRolesTable",
            table_name=self._table_name("application-group-roles"),
            partition_key=dynamodb.Attribute(
                name="applicationGroupRoleId",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True
            ),
            removal_policy=RemovalPolicy.RETAIN,
        )

        # GSI: GroupEnvRoleIndex - query role assignments by group and environment
        table.add_global_secondary_index(
            index_name="GroupEnvRoleIndex",
            partition_key=dynamodb.Attribute(
                name="applicationGroupId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="environment",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI: AppEnvGroupIndex - query role assignments by application and environment
        table.add_global_secondary_index(
            index_name="AppEnvGroupIndex",
            partition_key=dynamodb.Attribute(
                name="applicationId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="environment",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI: GroupStatusIndex - query role assignments by group and status
        table.add_global_secondary_index(
            index_name="GroupStatusIndex",
            partition_key=dynamodb.Attribute(
                name="applicationGroupId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="status",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        self.tables["application-group-roles"] = table
        self._export_table_params(table, "application-group-roles")

    def _create_application_user_roles_table(self) -> None:
        """Create ApplicationUserRoles table for direct role assignments to users per environment."""
        table = dynamodb.Table(
            self,
            "ApplicationUserRolesTable",
            table_name=self._table_name("application-user-roles"),
            partition_key=dynamodb.Attribute(
                name="applicationUserRoleId",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True
            ),
            removal_policy=RemovalPolicy.RETAIN,
        )

        # GSI: UserEnvRoleIndex - query role assignments by user and environment
        table.add_global_secondary_index(
            index_name="UserEnvRoleIndex",
            partition_key=dynamodb.Attribute(
                name="userId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="environment",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI: AppEnvUserIndex - query role assignments by application and environment
        table.add_global_secondary_index(
            index_name="AppEnvUserIndex",
            partition_key=dynamodb.Attribute(
                name="applicationId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="environment",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI: UserAppIndex - query role assignments by user and application
        table.add_global_secondary_index(
            index_name="UserAppIndex",
            partition_key=dynamodb.Attribute(
                name="userId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="applicationId",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI: UserStatusIndex - query role assignments by user and status
        table.add_global_secondary_index(
            index_name="UserStatusIndex",
            partition_key=dynamodb.Attribute(
                name="userId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="status",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        self.tables["application-user-roles"] = table
        self._export_table_params(table, "application-user-roles")

    def _create_application_api_keys_table(self) -> None:
        """Create ApplicationApiKeys table for managing API keys per application/environment."""
        table = dynamodb.Table(
            self,
            "ApplicationApiKeysTable",
            table_name=self._table_name("application-api-keys"),
            partition_key=dynamodb.Attribute(
                name="applicationApiKeyId",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True
            ),
            removal_policy=RemovalPolicy.RETAIN,
        )

        # GSI: AppEnvKeyIndex - query keys by application and environment
        table.add_global_secondary_index(
            index_name="AppEnvKeyIndex",
            partition_key=dynamodb.Attribute(
                name="applicationId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="environment",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI: KeyLookupIndex - lookup keys by hash for validation
        table.add_global_secondary_index(
            index_name="KeyLookupIndex",
            partition_key=dynamodb.Attribute(
                name="keyHash",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI: OrgEnvKeyIndex - query keys by organization and environment
        table.add_global_secondary_index(
            index_name="OrgEnvKeyIndex",
            partition_key=dynamodb.Attribute(
                name="organizationId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="environment",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        self.tables["ApplicationApiKeys"] = table
        self._export_table_params(table, "application-api-keys")

    def _create_application_environment_config_table(self) -> None:
        """Create ApplicationEnvironmentConfig table for per-environment settings."""
        table = dynamodb.Table(
            self,
            "ApplicationEnvironmentConfigTable",
            table_name=self._table_name("application-environment-config"),
            partition_key=dynamodb.Attribute(
                name="applicationId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="environment",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True
            ),
            removal_policy=RemovalPolicy.RETAIN,
        )

        # GSI: OrgEnvIndex - query configs by organization and environment
        table.add_global_secondary_index(
            index_name="OrgEnvIndex",
            partition_key=dynamodb.Attribute(
                name="organizationId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="environment",
                type=dynamodb.AttributeType.STRING,
            ),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        self.tables["ApplicationEnvironmentConfig"] = table
        self._export_table_params(table, "application-environment-config")

    def _create_api_rate_limits_table(self) -> None:
        """Create ApiRateLimits table for tracking API key rate limit counters."""
        table = dynamodb.Table(
            self,
            "ApiRateLimitsTable",
            table_name=self._table_name("api-rate-limits"),
            partition_key=dynamodb.Attribute(
                name="keyId",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="windowKey",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            time_to_live_attribute="ttl",
            removal_policy=RemovalPolicy.DESTROY,  # Rate limit data is ephemeral
        )

        self.tables["api-rate-limits"] = table
        self._export_table_params(table, "api-rate-limits")
