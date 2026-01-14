# file: apps/api/layers/organizations_security/security_manager.py
# author: AI Assistant
# created: 2025-06-22
# description: Organization security manager for multi-tenant access control

import boto3
import logging
from typing import Dict, Any, List, Tuple
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Attr

logger = logging.getLogger(__name__)


class OrganizationSecurityManager:
    """
    Multi-tenant security manager for organization-level access control.
    Implements defense-in-depth security for organization operations.
    """

    def __init__(self, region: str = None):
        """
        Initialize the organization security manager.

        Args:
            region: AWS region, defaults to None (uses AWS_REGION env var)
        """
        self.dynamodb = boto3.resource("dynamodb", region_name=region)
        self.organizations_table = self.dynamodb.Table("Organizations")
        self.org_users_table = self.dynamodb.Table("OrganizationUsers")

    def validate_organization_access(
        self,
        user_id: str,
        organization_id: str,
        cognito_groups: List[str],
        required_action: str = "read",
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Validate user access to an organization with defense-in-depth security.

        Args:
            user_id: The user's ID
            organization_id: The organization ID to access
            cognito_groups: User's Cognito groups (OWNER, EMPLOYEE, CUSTOMER, USER)
            required_action: The action being performed ('read', 'write', 'admin', 'owner')

        Returns:
            Tuple of (is_authorized, context_info)
        """
        try:
            # Layer 1: Platform-level authorization (Cognito Groups)
            if not self._validate_platform_access(cognito_groups, required_action):
                return False, {
                    "error": "Insufficient platform permissions",
                    "required_groups": ["OWNER", "EMPLOYEE", "CUSTOMER"],
                    "user_groups": cognito_groups,
                }

            # Layer 2: Organization-level authorization
            org_context = self._get_organization_context(
                user_id, organization_id, cognito_groups
            )

            # Layer 3: Action-specific authorization
            if not self._validate_action_permission(org_context, required_action):
                return False, {
                    "error": "Insufficient organization permissions",
                    "organization_role": org_context.get("organization_role"),
                    "required_action": required_action,
                }

            return True, org_context

        except Exception as e:
            logger.error(f"Error validating organization access: {str(e)}")
            return False, {"error": f"Authorization validation failed: {str(e)}"}

    def _validate_platform_access(
        self, cognito_groups: List[str], required_action: str
    ) -> bool:
        """Validate platform-level access based on Cognito groups."""
        # OWNER and EMPLOYEE have full platform access
        if any(group in cognito_groups for group in ["OWNER", "EMPLOYEE"]):
            return True

        # CUSTOMER can perform organization operations
        if "CUSTOMER" in cognito_groups and required_action in [
            "read",
            "write",
            "admin",
        ]:
            return True

        # USER group cannot access organization features (free users)
        return False

    def _get_organization_context(
        self, user_id: str, organization_id: str, cognito_groups: List[str]
    ) -> Dict[str, Any]:
        """Get organization context and user's role within the organization."""
        context = {
            "user_id": user_id,
            "organization_id": organization_id,
            "cognito_groups": cognito_groups,
            "is_platform_admin": any(
                group in cognito_groups for group in ["OWNER", "EMPLOYEE"]
            ),
            "organization_role": None,
            "is_organization_owner": False,
        }

        try:
            # Check if user is the organization owner
            org_response = self.organizations_table.get_item(
                Key={"organizationId": organization_id}
            )

            if org_response.get("Item"):
                org_data = org_response["Item"]
                context["organization_exists"] = True
                context["organization_status"] = org_data.get("status")

                # Check if user is the organization owner (ownerId field)
                if org_data.get("ownerId") == user_id:
                    context["is_organization_owner"] = True
                    context["organization_role"] = "OWNER"
                else:
                    # Check OrganizationUsers table for role assignment
                    try:
                        org_user_response = self.org_users_table.get_item(
                            Key={"userId": user_id, "organizationId": organization_id}
                        )

                        if org_user_response.get("Item"):
                            org_user_data = org_user_response["Item"]
                            if org_user_data.get("status") == "ACTIVE":
                                context["organization_role"] = org_user_data.get("role")
                    except ClientError:
                        # OrganizationUsers table might not exist yet
                        pass
            else:
                context["organization_exists"] = False

        except Exception as e:
            logger.error(f"Error getting organization context: {str(e)}")
            context["error"] = str(e)

        return context

    def _validate_action_permission(
        self, org_context: Dict[str, Any], required_action: str
    ) -> bool:
        """Validate if user can perform the required action based on their organization role."""
        # Platform admins can do everything
        if org_context.get("is_platform_admin"):
            return True

        # For create operations, CUSTOMER can create their first organization
        if required_action == "create" and "CUSTOMER" in org_context.get(
            "cognito_groups", []
        ):
            return True

        # Organization must exist for other operations
        if not org_context.get("organization_exists"):
            return False

        # Organization must be active
        if org_context.get("organization_status") != "ACTIVE":
            return False

        org_role = org_context.get("organization_role")

        # Permission matrix based on organization role
        permissions = {
            "OWNER": ["read", "write", "admin", "owner", "delete"],
            "ADMINISTRATOR": ["read", "write", "admin"],
            "VIEWER": ["read"],
        }

        allowed_actions = permissions.get(org_role, [])
        return required_action in allowed_actions

    def get_condition_expression_for_user(
        self, user_id: str, cognito_groups: List[str]
    ) -> Dict[str, Any]:
        """
        Generate DynamoDB condition expressions for organization data isolation.

        Args:
            user_id: The user's ID
            cognito_groups: User's Cognito groups

        Returns:
            Dictionary with DynamoDB condition expression parameters
        """
        # Platform admins can access all organizations
        if any(group in cognito_groups for group in ["OWNER", "EMPLOYEE"]):
            return {}  # No restrictions for platform admins

        # For CUSTOMER users, they can only access organizations they own
        # (In starter plan, this is limited to 1 organization)
        return {
            "condition_expression": Attr("ownerId").eq(user_id)
            & Attr("status").eq("ACTIVE")
        }
