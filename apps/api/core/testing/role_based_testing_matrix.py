"""
Role-Based Testing Matrix

Comprehensive test matrix covering all permission combinations across organization
and application levels including role inheritance, escalation scenarios, and
cross-organization conflicts.

Author: Claude Code Assistant
Date: 2025-06-23
"""

from typing import Dict, List, Any, Set
from dataclasses import dataclass, field
from enum import Enum
import itertools

from ..models.OrganizationUserRoleEnum import OrganizationUserRole
from ..models.OrganizationUserStatusEnum import OrganizationUserStatus
from ..models.OrganizationStatusEnum import OrganizationStatus


class PermissionType(Enum):
    """Types of permissions in the system."""

    # Organization-level permissions
    ORG_VIEW = "organization:view"
    ORG_MANAGE = "organization:manage"
    ORG_DELETE = "organization:delete"
    ORG_BILLING = "organization:billing"

    # User management permissions
    USER_INVITE = "user:invite"
    USER_REMOVE = "user:remove"
    USER_ROLE_ASSIGN = "user:role:assign"
    USER_ROLE_REVOKE = "user:role:revoke"
    USER_VIEW = "user:view"

    # Application permissions
    APP_CREATE = "application:create"
    APP_VIEW = "application:view"
    APP_MANAGE = "application:manage"
    APP_DELETE = "application:delete"
    APP_DEPLOY = "application:deploy"

    # Data permissions
    DATA_READ = "data:read"
    DATA_WRITE = "data:write"
    DATA_DELETE = "data:delete"
    DATA_EXPORT = "data:export"

    # Audit and compliance
    AUDIT_VIEW = "audit:view"
    AUDIT_EXPORT = "audit:export"
    COMPLIANCE_VIEW = "compliance:view"

    # System administration
    SYSTEM_CONFIG = "system:config"
    SYSTEM_MONITOR = "system:monitor"


class ActionType(Enum):
    """Types of actions that can be performed."""

    # Organization actions
    CREATE_ORGANIZATION = "create_organization"
    UPDATE_ORGANIZATION = "update_organization"
    DELETE_ORGANIZATION = "delete_organization"
    VIEW_ORGANIZATION_BILLING = "view_organization_billing"

    # User management actions
    INVITE_USER = "invite_user"
    REMOVE_USER = "remove_user"
    CHANGE_USER_ROLE = "change_user_role"
    VIEW_USER_LIST = "view_user_list"
    VIEW_USER_DETAILS = "view_user_details"

    # Application actions
    CREATE_APPLICATION = "create_application"
    VIEW_APPLICATION = "view_application"
    UPDATE_APPLICATION = "update_application"
    DELETE_APPLICATION = "delete_application"
    DEPLOY_APPLICATION = "deploy_application"

    # Data actions
    READ_DATA = "read_data"
    WRITE_DATA = "write_data"
    DELETE_DATA = "delete_data"
    EXPORT_DATA = "export_data"

    # Administrative actions
    VIEW_AUDIT_LOGS = "view_audit_logs"
    EXPORT_AUDIT_LOGS = "export_audit_logs"
    VIEW_COMPLIANCE_REPORTS = "view_compliance_reports"
    CONFIGURE_SYSTEM = "configure_system"


@dataclass
class PermissionRule:
    """Defines a permission rule for role-based access control."""

    role: OrganizationUserRole
    permissions: Set[PermissionType]
    restrictions: Set[PermissionType] = field(default_factory=set)
    conditions: Dict[str, Any] = field(default_factory=dict)
    inheritance: bool = True

    def allows(
        self, permission: PermissionType, context: Dict[str, Any] = None
    ) -> bool:
        """Check if this rule allows the given permission."""

        if permission in self.restrictions:
            return False

        if permission not in self.permissions:
            return False

        # Check conditions if provided
        if self.conditions and context:
            for condition, expected_value in self.conditions.items():
                if context.get(condition) != expected_value:
                    return False

        return True


@dataclass
class TestScenario:
    """Represents a test scenario for role-based testing."""

    scenario_id: str
    description: str
    user_role: OrganizationUserRole
    user_status: OrganizationUserStatus
    organization_status: OrganizationStatus
    action: ActionType
    expected_result: bool
    context: Dict[str, Any] = field(default_factory=dict)
    tags: Set[str] = field(default_factory=set)
    priority: str = "medium"  # low, medium, high, critical

    def to_dict(self) -> Dict[str, Any]:
        """Convert scenario to dictionary for serialization."""
        return {
            "scenario_id": self.scenario_id,
            "description": self.description,
            "user_role": self.user_role.value,
            "user_status": self.user_status.value,
            "organization_status": self.organization_status.value,
            "action": self.action.value,
            "expected_result": self.expected_result,
            "context": self.context,
            "tags": list(self.tags),
            "priority": self.priority,
        }


class RoleBasedTestingMatrix:
    """Comprehensive role-based testing matrix generator."""

    def __init__(self):
        self.permission_rules = self._initialize_permission_rules()
        self.role_hierarchy = self._initialize_role_hierarchy()
        self.test_scenarios = []

    def _initialize_permission_rules(
        self,
    ) -> Dict[OrganizationUserRole, PermissionRule]:
        """Initialize permission rules for each role."""

        return {
            OrganizationUserRole.OWNER: PermissionRule(
                role=OrganizationUserRole.OWNER,
                permissions={
                    PermissionType.ORG_VIEW,
                    PermissionType.ORG_MANAGE,
                    PermissionType.ORG_DELETE,
                    PermissionType.ORG_BILLING,
                    PermissionType.USER_INVITE,
                    PermissionType.USER_REMOVE,
                    PermissionType.USER_ROLE_ASSIGN,
                    PermissionType.USER_ROLE_REVOKE,
                    PermissionType.USER_VIEW,
                    PermissionType.APP_CREATE,
                    PermissionType.APP_VIEW,
                    PermissionType.APP_MANAGE,
                    PermissionType.APP_DELETE,
                    PermissionType.APP_DEPLOY,
                    PermissionType.DATA_READ,
                    PermissionType.DATA_WRITE,
                    PermissionType.DATA_DELETE,
                    PermissionType.DATA_EXPORT,
                    PermissionType.AUDIT_VIEW,
                    PermissionType.AUDIT_EXPORT,
                    PermissionType.COMPLIANCE_VIEW,
                    PermissionType.SYSTEM_CONFIG,
                    PermissionType.SYSTEM_MONITOR,
                },
                restrictions=set(),  # No restrictions for owner
                inheritance=True,
            ),
            OrganizationUserRole.ADMIN: PermissionRule(
                role=OrganizationUserRole.ADMIN,
                permissions={
                    PermissionType.ORG_VIEW,
                    PermissionType.ORG_MANAGE,
                    PermissionType.USER_INVITE,
                    PermissionType.USER_REMOVE,
                    PermissionType.USER_ROLE_ASSIGN,
                    PermissionType.USER_VIEW,
                    PermissionType.APP_CREATE,
                    PermissionType.APP_VIEW,
                    PermissionType.APP_MANAGE,
                    PermissionType.APP_DELETE,
                    PermissionType.APP_DEPLOY,
                    PermissionType.DATA_READ,
                    PermissionType.DATA_WRITE,
                    PermissionType.DATA_DELETE,
                    PermissionType.DATA_EXPORT,
                    PermissionType.AUDIT_VIEW,
                    PermissionType.COMPLIANCE_VIEW,
                    PermissionType.SYSTEM_MONITOR,
                },
                restrictions={
                    PermissionType.ORG_DELETE,
                    PermissionType.ORG_BILLING,
                    PermissionType.USER_ROLE_REVOKE,
                    PermissionType.AUDIT_EXPORT,
                    PermissionType.SYSTEM_CONFIG,
                },
                conditions={"can_modify_owner": False},
                inheritance=True,
            ),
            OrganizationUserRole.MEMBER: PermissionRule(
                role=OrganizationUserRole.MEMBER,
                permissions={
                    PermissionType.ORG_VIEW,
                    PermissionType.USER_VIEW,
                    PermissionType.APP_VIEW,
                    PermissionType.APP_MANAGE,
                    PermissionType.DATA_READ,
                    PermissionType.DATA_WRITE,
                    PermissionType.DATA_EXPORT,
                },
                restrictions={
                    PermissionType.ORG_MANAGE,
                    PermissionType.ORG_DELETE,
                    PermissionType.ORG_BILLING,
                    PermissionType.USER_INVITE,
                    PermissionType.USER_REMOVE,
                    PermissionType.USER_ROLE_ASSIGN,
                    PermissionType.USER_ROLE_REVOKE,
                    PermissionType.APP_CREATE,
                    PermissionType.APP_DELETE,
                    PermissionType.APP_DEPLOY,
                    PermissionType.DATA_DELETE,
                    PermissionType.AUDIT_VIEW,
                    PermissionType.AUDIT_EXPORT,
                    PermissionType.COMPLIANCE_VIEW,
                    PermissionType.SYSTEM_CONFIG,
                    PermissionType.SYSTEM_MONITOR,
                },
                inheritance=False,
            ),
            OrganizationUserRole.GUEST: PermissionRule(
                role=OrganizationUserRole.GUEST,
                permissions={
                    PermissionType.ORG_VIEW,
                    PermissionType.APP_VIEW,
                    PermissionType.DATA_READ,
                },
                restrictions={
                    PermissionType.ORG_MANAGE,
                    PermissionType.ORG_DELETE,
                    PermissionType.ORG_BILLING,
                    PermissionType.USER_INVITE,
                    PermissionType.USER_REMOVE,
                    PermissionType.USER_ROLE_ASSIGN,
                    PermissionType.USER_ROLE_REVOKE,
                    PermissionType.USER_VIEW,
                    PermissionType.APP_CREATE,
                    PermissionType.APP_MANAGE,
                    PermissionType.APP_DELETE,
                    PermissionType.APP_DEPLOY,
                    PermissionType.DATA_WRITE,
                    PermissionType.DATA_DELETE,
                    PermissionType.DATA_EXPORT,
                    PermissionType.AUDIT_VIEW,
                    PermissionType.AUDIT_EXPORT,
                    PermissionType.COMPLIANCE_VIEW,
                    PermissionType.SYSTEM_CONFIG,
                    PermissionType.SYSTEM_MONITOR,
                },
                inheritance=False,
            ),
        }

    def _initialize_role_hierarchy(self) -> Dict[OrganizationUserRole, int]:
        """Initialize role hierarchy levels (higher number = more privileges)."""

        return {
            OrganizationUserRole.GUEST: 1,
            OrganizationUserRole.MEMBER: 2,
            OrganizationUserRole.ADMIN: 3,
            OrganizationUserRole.OWNER: 4,
        }

    # =============================================================================
    # Permission Testing Methods
    # =============================================================================

    def check_permission(
        self,
        user_role: OrganizationUserRole,
        permission: PermissionType,
        context: Dict[str, Any] = None,
    ) -> bool:
        """Check if a role has a specific permission."""

        rule = self.permission_rules.get(user_role)
        if not rule:
            return False

        return rule.allows(permission, context or {})

    def get_role_permissions(
        self, user_role: OrganizationUserRole, include_inherited: bool = True
    ) -> Set[PermissionType]:
        """Get all permissions for a role."""

        rule = self.permission_rules.get(user_role)
        if not rule:
            return set()

        permissions = rule.permissions.copy()

        # Add inherited permissions if enabled
        if include_inherited and rule.inheritance:
            for role, level in self.role_hierarchy.items():
                if (
                    level < self.role_hierarchy[user_role]
                    and role in self.permission_rules
                ):
                    inherited_rule = self.permission_rules[role]
                    if inherited_rule.inheritance:
                        permissions.update(inherited_rule.permissions)

        # Remove restrictions
        permissions -= rule.restrictions

        return permissions

    def compare_role_permissions(
        self, role1: OrganizationUserRole, role2: OrganizationUserRole
    ) -> Dict[str, Set[PermissionType]]:
        """Compare permissions between two roles."""

        permissions1 = self.get_role_permissions(role1)
        permissions2 = self.get_role_permissions(role2)

        return {
            "role1_only": permissions1 - permissions2,
            "role2_only": permissions2 - permissions1,
            "common": permissions1 & permissions2,
            "total_unique": permissions1 | permissions2,
        }

    # =============================================================================
    # Test Scenario Generation
    # =============================================================================

    def generate_comprehensive_test_matrix(self) -> List[TestScenario]:
        """Generate comprehensive test matrix covering all permission combinations."""

        scenarios = []
        scenario_counter = 0

        # Generate scenarios for each role
        for role in OrganizationUserRole:
            role_scenarios = self._generate_role_scenarios(role, scenario_counter)
            scenarios.extend(role_scenarios)
            scenario_counter += len(role_scenarios)

        # Generate cross-role scenarios
        cross_role_scenarios = self._generate_cross_role_scenarios(scenario_counter)
        scenarios.extend(cross_role_scenarios)
        scenario_counter += len(cross_role_scenarios)

        # Generate privilege escalation scenarios
        escalation_scenarios = self._generate_privilege_escalation_scenarios(
            scenario_counter
        )
        scenarios.extend(escalation_scenarios)
        scenario_counter += len(escalation_scenarios)

        # Generate edge case scenarios
        edge_case_scenarios = self._generate_edge_case_scenarios(scenario_counter)
        scenarios.extend(edge_case_scenarios)

        self.test_scenarios = scenarios
        return scenarios

    def _generate_role_scenarios(
        self, role: OrganizationUserRole, start_id: int
    ) -> List[TestScenario]:
        """Generate test scenarios for a specific role."""

        scenarios = []
        scenario_id = start_id

        # Test all actions for this role
        for action in ActionType:
            for org_status in OrganizationStatus:
                for user_status in OrganizationUserStatus:
                    # Determine expected result based on permissions
                    expected_result = self._determine_expected_result(
                        role, action, org_status, user_status
                    )

                    scenario = TestScenario(
                        scenario_id=f"ROLE_{scenario_id:04d}",
                        description=f"{role.value} performing {action.value} (org:{org_status.value}, user:{user_status.value})",
                        user_role=role,
                        user_status=user_status,
                        organization_status=org_status,
                        action=action,
                        expected_result=expected_result,
                        context={
                            "test_type": "role_based",
                            "role_hierarchy_level": self.role_hierarchy[role],
                        },
                        tags={
                            f"role_{role.value.lower()}",
                            f"action_{action.value}",
                            f"org_{org_status.value.lower()}",
                        },
                        priority=self._determine_scenario_priority(role, action),
                    )

                    scenarios.append(scenario)
                    scenario_id += 1

        return scenarios

    def _generate_cross_role_scenarios(self, start_id: int) -> List[TestScenario]:
        """Generate scenarios testing cross-role interactions."""

        scenarios = []
        scenario_id = start_id

        # Test scenarios where one role tries to modify another role
        role_modification_actions = [
            ActionType.CHANGE_USER_ROLE,
            ActionType.REMOVE_USER,
            ActionType.INVITE_USER,
        ]

        for actor_role in OrganizationUserRole:
            for target_role in OrganizationUserRole:
                for action in role_modification_actions:
                    # Determine if actor can perform action on target
                    expected_result = self._can_role_modify_role(
                        actor_role, target_role, action
                    )

                    scenario = TestScenario(
                        scenario_id=f"CROSS_{scenario_id:04d}",
                        description=f"{actor_role.value} performing {action.value} on {target_role.value}",
                        user_role=actor_role,
                        user_status=OrganizationUserStatus.ACTIVE,
                        organization_status=OrganizationStatus.ACTIVE,
                        action=action,
                        expected_result=expected_result,
                        context={
                            "test_type": "cross_role",
                            "target_role": target_role.value,
                            "actor_hierarchy": self.role_hierarchy[actor_role],
                            "target_hierarchy": self.role_hierarchy[target_role],
                        },
                        tags={
                            "cross_role",
                            f"actor_{actor_role.value.lower()}",
                            f"target_{target_role.value.lower()}",
                        },
                        priority="high" if actor_role != target_role else "medium",
                    )

                    scenarios.append(scenario)
                    scenario_id += 1

        return scenarios

    def _generate_privilege_escalation_scenarios(
        self, start_id: int
    ) -> List[TestScenario]:
        """Generate scenarios testing privilege escalation attempts."""

        scenarios = []
        scenario_id = start_id

        escalation_attempts = [
            # Lower roles trying to perform higher role actions
            (OrganizationUserRole.GUEST, ActionType.CREATE_APPLICATION, False),
            (OrganizationUserRole.GUEST, ActionType.INVITE_USER, False),
            (OrganizationUserRole.MEMBER, ActionType.DELETE_ORGANIZATION, False),
            (OrganizationUserRole.MEMBER, ActionType.CHANGE_USER_ROLE, False),
            (OrganizationUserRole.ADMIN, ActionType.DELETE_ORGANIZATION, False),
            (OrganizationUserRole.ADMIN, ActionType.VIEW_ORGANIZATION_BILLING, False),
            # Valid escalation scenarios (should succeed)
            (OrganizationUserRole.ADMIN, ActionType.CREATE_APPLICATION, True),
            (OrganizationUserRole.ADMIN, ActionType.INVITE_USER, True),
            (OrganizationUserRole.OWNER, ActionType.DELETE_ORGANIZATION, True),
        ]

        for role, action, expected_result in escalation_attempts:
            scenario = TestScenario(
                scenario_id=f"ESCAL_{scenario_id:04d}",
                description=f"Privilege escalation test: {role.value} attempting {action.value}",
                user_role=role,
                user_status=OrganizationUserStatus.ACTIVE,
                organization_status=OrganizationStatus.ACTIVE,
                action=action,
                expected_result=expected_result,
                context={
                    "test_type": "privilege_escalation",
                    "escalation_attempt": not expected_result,
                },
                tags={"privilege_escalation", f"role_{role.value.lower()}", "security"},
                priority="critical",
            )

            scenarios.append(scenario)
            scenario_id += 1

        return scenarios

    def _generate_edge_case_scenarios(self, start_id: int) -> List[TestScenario]:
        """Generate edge case scenarios."""

        scenarios = []
        scenario_id = start_id

        # Test scenarios with inactive users/organizations
        edge_cases = [
            # Inactive user scenarios
            (
                OrganizationUserRole.ADMIN,
                OrganizationUserStatus.INACTIVE,
                OrganizationStatus.ACTIVE,
                ActionType.VIEW_APPLICATION,
                False,
            ),
            (
                OrganizationUserRole.OWNER,
                OrganizationUserStatus.PENDING,
                OrganizationStatus.ACTIVE,
                ActionType.CREATE_APPLICATION,
                False,
            ),
            # Inactive organization scenarios
            (
                OrganizationUserRole.ADMIN,
                OrganizationUserStatus.ACTIVE,
                OrganizationStatus.INACTIVE,
                ActionType.CREATE_APPLICATION,
                False,
            ),
            (
                OrganizationUserRole.OWNER,
                OrganizationUserStatus.ACTIVE,
                OrganizationStatus.SUSPENDED,
                ActionType.DELETE_ORGANIZATION,
                False,
            ),
            # Special permission scenarios
            (
                OrganizationUserRole.MEMBER,
                OrganizationUserStatus.ACTIVE,
                OrganizationStatus.ACTIVE,
                ActionType.READ_DATA,
                True,
            ),
            (
                OrganizationUserRole.GUEST,
                OrganizationUserStatus.ACTIVE,
                OrganizationStatus.ACTIVE,
                ActionType.WRITE_DATA,
                False,
            ),
        ]

        for role, user_status, org_status, action, expected_result in edge_cases:
            scenario = TestScenario(
                scenario_id=f"EDGE_{scenario_id:04d}",
                description=f"Edge case: {role.value} ({user_status.value}) in {org_status.value} org performing {action.value}",
                user_role=role,
                user_status=user_status,
                organization_status=org_status,
                action=action,
                expected_result=expected_result,
                context={
                    "test_type": "edge_case",
                    "inactive_entity": user_status != OrganizationUserStatus.ACTIVE
                    or org_status != OrganizationStatus.ACTIVE,
                },
                tags={
                    "edge_case",
                    f"role_{role.value.lower()}",
                    f"status_{user_status.value.lower()}",
                },
                priority="high",
            )

            scenarios.append(scenario)
            scenario_id += 1

        return scenarios

    # =============================================================================
    # Helper Methods
    # =============================================================================

    def _determine_expected_result(
        self,
        role: OrganizationUserRole,
        action: ActionType,
        org_status: OrganizationStatus,
        user_status: OrganizationUserStatus,
    ) -> bool:
        """Determine expected result for a role/action/status combination."""

        # Inactive users or organizations generally can't perform actions
        if user_status != OrganizationUserStatus.ACTIVE or org_status not in [
            OrganizationStatus.ACTIVE
        ]:
            return False

        # Map actions to required permissions
        action_permission_map = {
            ActionType.CREATE_ORGANIZATION: PermissionType.ORG_MANAGE,
            ActionType.UPDATE_ORGANIZATION: PermissionType.ORG_MANAGE,
            ActionType.DELETE_ORGANIZATION: PermissionType.ORG_DELETE,
            ActionType.VIEW_ORGANIZATION_BILLING: PermissionType.ORG_BILLING,
            ActionType.INVITE_USER: PermissionType.USER_INVITE,
            ActionType.REMOVE_USER: PermissionType.USER_REMOVE,
            ActionType.CHANGE_USER_ROLE: PermissionType.USER_ROLE_ASSIGN,
            ActionType.VIEW_USER_LIST: PermissionType.USER_VIEW,
            ActionType.VIEW_USER_DETAILS: PermissionType.USER_VIEW,
            ActionType.CREATE_APPLICATION: PermissionType.APP_CREATE,
            ActionType.VIEW_APPLICATION: PermissionType.APP_VIEW,
            ActionType.UPDATE_APPLICATION: PermissionType.APP_MANAGE,
            ActionType.DELETE_APPLICATION: PermissionType.APP_DELETE,
            ActionType.DEPLOY_APPLICATION: PermissionType.APP_DEPLOY,
            ActionType.READ_DATA: PermissionType.DATA_READ,
            ActionType.WRITE_DATA: PermissionType.DATA_WRITE,
            ActionType.DELETE_DATA: PermissionType.DATA_DELETE,
            ActionType.EXPORT_DATA: PermissionType.DATA_EXPORT,
            ActionType.VIEW_AUDIT_LOGS: PermissionType.AUDIT_VIEW,
            ActionType.EXPORT_AUDIT_LOGS: PermissionType.AUDIT_EXPORT,
            ActionType.VIEW_COMPLIANCE_REPORTS: PermissionType.COMPLIANCE_VIEW,
            ActionType.CONFIGURE_SYSTEM: PermissionType.SYSTEM_CONFIG,
        }

        required_permission = action_permission_map.get(action)
        if not required_permission:
            return False

        return self.check_permission(role, required_permission)

    def _can_role_modify_role(
        self,
        actor_role: OrganizationUserRole,
        target_role: OrganizationUserRole,
        action: ActionType,
    ) -> bool:
        """Determine if an actor role can modify a target role."""

        self.role_hierarchy[actor_role]
        target_level = self.role_hierarchy[target_role]

        # General rule: can only modify roles at same or lower level
        # Exception: owners can modify anyone, but admins cannot modify owners

        if actor_role == OrganizationUserRole.OWNER:
            return True  # Owners can modify anyone

        if target_role == OrganizationUserRole.OWNER:
            return False  # No one can modify owners except owners

        if actor_role == OrganizationUserRole.ADMIN:
            return target_level <= self.role_hierarchy[OrganizationUserRole.MEMBER]

        # Members and guests cannot modify others
        return False

    def _determine_scenario_priority(
        self, role: OrganizationUserRole, action: ActionType
    ) -> str:
        """Determine priority level for a test scenario."""

        # Critical actions that could cause data loss or security issues
        critical_actions = {
            ActionType.DELETE_ORGANIZATION,
            ActionType.DELETE_APPLICATION,
            ActionType.DELETE_DATA,
            ActionType.REMOVE_USER,
            ActionType.CHANGE_USER_ROLE,
        }

        # High-impact actions
        high_impact_actions = {
            ActionType.CREATE_ORGANIZATION,
            ActionType.INVITE_USER,
            ActionType.DEPLOY_APPLICATION,
            ActionType.EXPORT_DATA,
            ActionType.VIEW_ORGANIZATION_BILLING,
            ActionType.CONFIGURE_SYSTEM,
        }

        if action in critical_actions:
            return "critical"
        elif action in high_impact_actions:
            return "high"
        elif role in [OrganizationUserRole.OWNER, OrganizationUserRole.ADMIN]:
            return "medium"
        else:
            return "low"

    # =============================================================================
    # Analysis and Reporting Methods
    # =============================================================================

    def analyze_permission_matrix(self) -> Dict[str, Any]:
        """Analyze the permission matrix for coverage and conflicts."""

        analysis = {
            "total_scenarios": len(self.test_scenarios),
            "scenarios_by_priority": {},
            "scenarios_by_role": {},
            "scenarios_by_action": {},
            "permission_coverage": {},
            "potential_conflicts": [],
            "security_risks": [],
        }

        # Count scenarios by various dimensions
        for scenario in self.test_scenarios:
            # By priority
            priority = scenario.priority
            analysis["scenarios_by_priority"][priority] = (
                analysis["scenarios_by_priority"].get(priority, 0) + 1
            )

            # By role
            role = scenario.user_role.value
            analysis["scenarios_by_role"][role] = (
                analysis["scenarios_by_role"].get(role, 0) + 1
            )

            # By action
            action = scenario.action.value
            analysis["scenarios_by_action"][action] = (
                analysis["scenarios_by_action"].get(action, 0) + 1
            )

        # Analyze permission coverage
        for role in OrganizationUserRole:
            permissions = self.get_role_permissions(role)
            analysis["permission_coverage"][role.value] = {
                "total_permissions": len(permissions),
                "permissions": [p.value for p in permissions],
            }

        # Identify potential conflicts
        analysis["potential_conflicts"] = self._identify_permission_conflicts()

        # Identify security risks
        analysis["security_risks"] = self._identify_security_risks()

        return analysis

    def _identify_permission_conflicts(self) -> List[Dict[str, Any]]:
        """Identify potential permission conflicts."""

        conflicts = []

        # Check for roles that might have conflicting permissions
        for role in OrganizationUserRole:
            rule = self.permission_rules[role]

            # Check if any permissions overlap with restrictions
            overlapping = rule.permissions & rule.restrictions
            if overlapping:
                conflicts.append(
                    {
                        "type": "permission_restriction_overlap",
                        "role": role.value,
                        "conflicting_permissions": [p.value for p in overlapping],
                    }
                )

        # Check for hierarchy violations
        for role1, role2 in itertools.combinations(OrganizationUserRole, 2):
            level1 = self.role_hierarchy[role1]
            level2 = self.role_hierarchy[role2]

            permissions1 = self.get_role_permissions(role1)
            permissions2 = self.get_role_permissions(role2)

            # Lower level role should not have permissions that higher level doesn't have
            if level1 < level2:
                extra_permissions = permissions1 - permissions2
                if extra_permissions:
                    conflicts.append(
                        {
                            "type": "hierarchy_violation",
                            "lower_role": role1.value,
                            "higher_role": role2.value,
                            "extra_permissions": [p.value for p in extra_permissions],
                        }
                    )

        return conflicts

    def _identify_security_risks(self) -> List[Dict[str, Any]]:
        """Identify potential security risks in the permission matrix."""

        risks = []

        # Check for overly permissive roles
        for role in OrganizationUserRole:
            permissions = self.get_role_permissions(role)

            # Check if lower-level roles have dangerous permissions
            dangerous_permissions = {
                PermissionType.ORG_DELETE,
                PermissionType.DATA_DELETE,
                PermissionType.USER_REMOVE,
                PermissionType.SYSTEM_CONFIG,
            }

            role_dangerous_perms = permissions & dangerous_permissions
            if role_dangerous_perms and role in [
                OrganizationUserRole.MEMBER,
                OrganizationUserRole.GUEST,
            ]:
                risks.append(
                    {
                        "type": "overly_permissive_role",
                        "role": role.value,
                        "dangerous_permissions": [
                            p.value for p in role_dangerous_perms
                        ],
                        "risk_level": "high",
                    }
                )

        # Check for privilege escalation possibilities
        escalation_scenarios = [
            s for s in self.test_scenarios if "privilege_escalation" in s.tags
        ]
        failing_escalations = [s for s in escalation_scenarios if s.expected_result]

        if failing_escalations:
            risks.append(
                {
                    "type": "privilege_escalation_possible",
                    "scenarios": [s.scenario_id for s in failing_escalations],
                    "risk_level": "critical",
                }
            )

        return risks

    def generate_test_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report."""

        return {
            "matrix_info": {
                "generated_at": "2025-06-23T00:00:00Z",
                "total_scenarios": len(self.test_scenarios),
                "total_roles": len(OrganizationUserRole),
                "total_permissions": len(PermissionType),
                "total_actions": len(ActionType),
            },
            "scenarios": [s.to_dict() for s in self.test_scenarios],
            "analysis": self.analyze_permission_matrix(),
            "test_execution_plan": self._generate_test_execution_plan(),
        }

    def _generate_test_execution_plan(self) -> Dict[str, Any]:
        """Generate recommended test execution plan."""

        # Group scenarios by priority
        critical_scenarios = [
            s for s in self.test_scenarios if s.priority == "critical"
        ]
        high_scenarios = [s for s in self.test_scenarios if s.priority == "high"]
        medium_scenarios = [s for s in self.test_scenarios if s.priority == "medium"]
        low_scenarios = [s for s in self.test_scenarios if s.priority == "low"]

        return {
            "recommended_execution_order": [
                {
                    "phase": "Critical Tests",
                    "scenario_count": len(critical_scenarios),
                    "estimated_duration_minutes": len(critical_scenarios) * 2,
                    "scenarios": [
                        s.scenario_id for s in critical_scenarios[:10]
                    ],  # Limit for readability
                },
                {
                    "phase": "High Priority Tests",
                    "scenario_count": len(high_scenarios),
                    "estimated_duration_minutes": len(high_scenarios) * 1.5,
                    "scenarios": [s.scenario_id for s in high_scenarios[:10]],
                },
                {
                    "phase": "Medium Priority Tests",
                    "scenario_count": len(medium_scenarios),
                    "estimated_duration_minutes": len(medium_scenarios) * 1,
                    "scenarios": [s.scenario_id for s in medium_scenarios[:10]],
                },
                {
                    "phase": "Low Priority Tests",
                    "scenario_count": len(low_scenarios),
                    "estimated_duration_minutes": len(low_scenarios) * 0.5,
                    "scenarios": [s.scenario_id for s in low_scenarios[:10]],
                },
            ],
            "parallel_execution_groups": self._create_parallel_execution_groups(),
            "estimated_total_duration_minutes": (
                len(critical_scenarios) * 2
                + len(high_scenarios) * 1.5
                + len(medium_scenarios) * 1
                + len(low_scenarios) * 0.5
            ),
        }

    def _create_parallel_execution_groups(self) -> List[Dict[str, Any]]:
        """Create groups of scenarios that can be executed in parallel."""

        # Group by test type to avoid conflicts
        groups = {}

        for scenario in self.test_scenarios:
            test_type = scenario.context.get("test_type", "unknown")
            if test_type not in groups:
                groups[test_type] = []
            groups[test_type].append(scenario.scenario_id)

        return [
            {
                "group_name": test_type,
                "scenario_count": len(scenarios),
                "can_run_parallel": test_type in ["role_based", "edge_case"],
                "scenarios": scenarios[:5],  # Limit for readability
            }
            for test_type, scenarios in groups.items()
        ]


# =============================================================================
# Utility Functions
# =============================================================================


def create_role_testing_matrix() -> RoleBasedTestingMatrix:
    """Create and initialize a role-based testing matrix."""
    matrix = RoleBasedTestingMatrix()
    matrix.generate_comprehensive_test_matrix()
    return matrix


def export_test_matrix_to_json(matrix: RoleBasedTestingMatrix, file_path: str) -> None:
    """Export test matrix to JSON file."""
    import json

    report = matrix.generate_test_report()

    with open(file_path, "w") as f:
        json.dump(report, f, indent=2, default=str)

    print(f"Test matrix exported to: {file_path}")


def import_test_matrix_from_json(file_path: str) -> Dict[str, Any]:
    """Import test matrix from JSON file."""
    import json

    with open(file_path, "r") as f:
        report = json.load(f)

    print(f"Test matrix imported from: {file_path}")
    return report
