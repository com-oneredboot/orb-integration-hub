"""DynamoDB Stack - All DynamoDB tables."""
from aws_cdk import Stack
from constructs import Construct

from generated.tables.application_api_keys_table import ApplicationApiKeysTable
from generated.tables.application_environment_config_table import ApplicationEnvironmentConfigTable
from generated.tables.application_roles_table import ApplicationRolesTable
from generated.tables.applications_table import ApplicationsTable
from generated.tables.application_user_roles_table import ApplicationUserRolesTable
from generated.tables.notifications_table import NotificationsTable
from generated.tables.organizations_table import OrganizationsTable
from generated.tables.organization_users_table import OrganizationUsersTable
from generated.tables.ownership_transfer_requests_table import OwnershipTransferRequestsTable
from generated.tables.privacy_requests_table import PrivacyRequestsTable
from generated.tables.sms_rate_limit_table import SmsRateLimitTable
from generated.tables.users_table import UsersTable


class DynamoDBStack(Stack):
    """DynamoDB tables stack.
    
    Creates all DynamoDB tables and writes table names/ARNs to SSM Parameter Store.
    Other stacks read these parameters instead of using cross-stack references.
    """

    def __init__(
        self,
        scope: Construct,
        id: str,
        **kwargs,
    ) -> None:
        super().__init__(scope, id, **kwargs)

        # Create all DynamoDB tables
        # Each table construct automatically writes its name and ARN to SSM
        ApplicationApiKeysTable(self, 'ApplicationApiKeysTable')
        ApplicationEnvironmentConfigTable(self, 'ApplicationEnvironmentConfigTable')
        ApplicationRolesTable(self, 'ApplicationRolesTable')
        ApplicationsTable(self, 'ApplicationsTable')
        ApplicationUserRolesTable(self, 'ApplicationUserRolesTable')
        NotificationsTable(self, 'NotificationsTable')
        OrganizationsTable(self, 'OrganizationsTable')
        OrganizationUsersTable(self, 'OrganizationUsersTable')
        OwnershipTransferRequestsTable(self, 'OwnershipTransferRequestsTable')
        PrivacyRequestsTable(self, 'PrivacyRequestsTable')
        SmsRateLimitTable(self, 'SmsRateLimitTable')
        UsersTable(self, 'UsersTable')
