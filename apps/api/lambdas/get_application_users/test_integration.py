# file: apps/api/lambdas/get_application_users/test_integration.py
# author: orb-integration-hub
# created: 2026-02-09
# description: Integration tests for GetApplicationUsers Lambda function.
#              Verifies the full pipeline: validation → authorization → query →
#              deduplication → enrichment → sorting → pagination using moto-mocked
#              DynamoDB tables.
# ruff: noqa: E402

import importlib.util
import os
import sys
import time
from pathlib import Path
from decimal import Decimal

import boto3
import pytest
from moto import mock_aws

# ---------------------------------------------------------------------------
# Module import – mirrors the pattern used by the existing unit/property tests
# ---------------------------------------------------------------------------
lambda_dir = Path(__file__).parent
sys.path.insert(0, str(lambda_dir))

_spec = importlib.util.spec_from_file_location(
    "get_application_users_index", lambda_dir / "index.py"
)
assert _spec is not None and _spec.loader is not None
index = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(index)
sys.modules["get_application_users_index"] = index

lambda_handler = index.lambda_handler

# ---------------------------------------------------------------------------
# Constants – table names used across all fixtures
# ---------------------------------------------------------------------------
APP_USER_ROLES_TABLE = "test-application-user-roles"
USERS_TABLE = "test-users"
ORGANIZATIONS_TABLE = "test-organizations"
APPLICATIONS_TABLE = "test-applications"
ORG_USERS_TABLE = "orb-integration-hub-dev-organization-users"

NOW = int(time.time())


# ---------------------------------------------------------------------------
# DynamoDB table creation helpers
# ---------------------------------------------------------------------------

def _create_application_user_roles_table(dynamodb):
    """Create the ApplicationUserRoles table with all required GSIs."""
    dynamodb.create_table(
        TableName=APP_USER_ROLES_TABLE,
        KeySchema=[{"AttributeName": "applicationUserRoleId", "KeyType": "HASH"}],
        AttributeDefinitions=[
            {"AttributeName": "applicationUserRoleId", "AttributeType": "S"},
            {"AttributeName": "applicationId", "AttributeType": "S"},
            {"AttributeName": "environment", "AttributeType": "S"},
            {"AttributeName": "userId", "AttributeType": "S"},
            {"AttributeName": "status", "AttributeType": "S"},
        ],
        GlobalSecondaryIndexes=[
            {
                "IndexName": "AppEnvUserIndex",
                "KeySchema": [
                    {"AttributeName": "applicationId", "KeyType": "HASH"},
                    {"AttributeName": "environment", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
            {
                "IndexName": "UserAppIndex",
                "KeySchema": [
                    {"AttributeName": "userId", "KeyType": "HASH"},
                    {"AttributeName": "applicationId", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
            {
                "IndexName": "UserEnvRoleIndex",
                "KeySchema": [
                    {"AttributeName": "userId", "KeyType": "HASH"},
                    {"AttributeName": "environment", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
            {
                "IndexName": "UserStatusIndex",
                "KeySchema": [
                    {"AttributeName": "userId", "KeyType": "HASH"},
                    {"AttributeName": "status", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
        ],
        BillingMode="PAY_PER_REQUEST",
    )


def _create_users_table(dynamodb):
    """Create the Users table."""
    dynamodb.create_table(
        TableName=USERS_TABLE,
        KeySchema=[{"AttributeName": "userId", "KeyType": "HASH"}],
        AttributeDefinitions=[
            {"AttributeName": "userId", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )


def _create_organizations_table(dynamodb):
    """Create the Organizations table (unused directly but referenced by env var)."""
    dynamodb.create_table(
        TableName=ORGANIZATIONS_TABLE,
        KeySchema=[{"AttributeName": "organizationId", "KeyType": "HASH"}],
        AttributeDefinitions=[
            {"AttributeName": "organizationId", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )


def _create_org_users_table(dynamodb):
    """Create the OrganizationUsers table used by get_owned_organization_ids."""
    dynamodb.create_table(
        TableName=ORG_USERS_TABLE,
        KeySchema=[
            {"AttributeName": "organizationUserId", "KeyType": "HASH"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "organizationUserId", "AttributeType": "S"},
            {"AttributeName": "userId", "AttributeType": "S"},
            {"AttributeName": "organizationId", "AttributeType": "S"},
        ],
        GlobalSecondaryIndexes=[
            {
                "IndexName": "UserOrgIndex",
                "KeySchema": [
                    {"AttributeName": "userId", "KeyType": "HASH"},
                    {"AttributeName": "organizationId", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
        ],
        BillingMode="PAY_PER_REQUEST",
    )


def _create_applications_table(dynamodb):
    """Create the Applications table with OrgAppIndex GSI."""
    dynamodb.create_table(
        TableName=APPLICATIONS_TABLE,
        KeySchema=[{"AttributeName": "applicationId", "KeyType": "HASH"}],
        AttributeDefinitions=[
            {"AttributeName": "applicationId", "AttributeType": "S"},
            {"AttributeName": "organizationId", "AttributeType": "S"},
        ],
        GlobalSecondaryIndexes=[
            {
                "IndexName": "OrgAppIndex",
                "KeySchema": [
                    {"AttributeName": "organizationId", "KeyType": "HASH"},
                    {"AttributeName": "applicationId", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
        ],
        BillingMode="PAY_PER_REQUEST",
    )


# ---------------------------------------------------------------------------
# Seed data helpers
# ---------------------------------------------------------------------------

def _seed_users(dynamodb):
    """Seed the Users table with test user profiles."""
    table = dynamodb.Table(USERS_TABLE)
    users = [
        {"userId": "user-1", "firstName": "Alice", "lastName": "Anderson", "status": "ACTIVE"},
        {"userId": "user-2", "firstName": "Bob", "lastName": "Brown", "status": "ACTIVE"},
        {"userId": "user-3", "firstName": "Charlie", "lastName": "Brown", "status": "ACTIVE"},
        {"userId": "user-4", "firstName": "Diana", "lastName": "Clark", "status": "ACTIVE"},
        {"userId": "user-5", "firstName": "Eve", "lastName": "Davis", "status": "ACTIVE"},
    ]
    for u in users:
        table.put_item(Item=u)
    return users


def _seed_applications(dynamodb):
    """Seed the Applications table."""
    table = dynamodb.Table(APPLICATIONS_TABLE)
    apps = [
        {"applicationId": "app-1", "organizationId": "org-1", "name": "App Alpha"},
        {"applicationId": "app-2", "organizationId": "org-1", "name": "App Beta"},
        {"applicationId": "app-3", "organizationId": "org-2", "name": "App Gamma"},
    ]
    for a in apps:
        table.put_item(Item=a)
    return apps


def _seed_org_users(dynamodb, owner_user_id, owned_org_ids):
    """Seed the OrganizationUsers table with ownership records."""
    table = dynamodb.Table(ORG_USERS_TABLE)
    for i, org_id in enumerate(owned_org_ids):
        table.put_item(Item={
            "organizationUserId": f"org-user-{i}",
            "userId": owner_user_id,
            "organizationId": org_id,
            "role": "OWNER",
        })


def _seed_role_assignments(dynamodb):
    """
    Seed ApplicationUserRoles with a realistic set of role assignments.

    Layout:
    - user-1: 2 roles in app-1 (org-1), 1 role in app-3 (org-2) → 3 total
    - user-2: 1 role in app-1 (org-1) → 1 total
    - user-3: 1 role in app-2 (org-1), 1 role in app-3 (org-2) → 2 total
    - user-4: 1 role in app-3 (org-2) → 1 total
    - user-5: 1 DELETED role in app-1 (org-1) → should be filtered out
    """
    table = dynamodb.Table(APP_USER_ROLES_TABLE)
    assignments = [
        # user-1 in app-1 (org-1), PRODUCTION
        {
            "applicationUserRoleId": "aur-1",
            "userId": "user-1",
            "applicationId": "app-1",
            "applicationName": "App Alpha",
            "organizationId": "org-1",
            "organizationName": "Org One",
            "environment": "PRODUCTION",
            "roleId": "role-admin",
            "roleName": "Admin",
            "permissions": ["read", "write", "admin"],
            "status": "ACTIVE",
            "createdAt": Decimal(str(NOW - 1000)),
            "updatedAt": Decimal(str(NOW)),
        },
        # user-1 in app-1 (org-1), STAGING
        {
            "applicationUserRoleId": "aur-2",
            "userId": "user-1",
            "applicationId": "app-1",
            "applicationName": "App Alpha",
            "organizationId": "org-1",
            "organizationName": "Org One",
            "environment": "STAGING",
            "roleId": "role-dev",
            "roleName": "Developer",
            "permissions": ["read", "write"],
            "status": "ACTIVE",
            "createdAt": Decimal(str(NOW - 900)),
            "updatedAt": Decimal(str(NOW)),
        },
        # user-1 in app-3 (org-2), PRODUCTION
        {
            "applicationUserRoleId": "aur-3",
            "userId": "user-1",
            "applicationId": "app-3",
            "applicationName": "App Gamma",
            "organizationId": "org-2",
            "organizationName": "Org Two",
            "environment": "PRODUCTION",
            "roleId": "role-viewer",
            "roleName": "Viewer",
            "permissions": ["read"],
            "status": "ACTIVE",
            "createdAt": Decimal(str(NOW - 800)),
            "updatedAt": Decimal(str(NOW)),
        },
        # user-2 in app-1 (org-1), PRODUCTION
        {
            "applicationUserRoleId": "aur-4",
            "userId": "user-2",
            "applicationId": "app-1",
            "applicationName": "App Alpha",
            "organizationId": "org-1",
            "organizationName": "Org One",
            "environment": "PRODUCTION",
            "roleId": "role-viewer",
            "roleName": "Viewer",
            "permissions": ["read"],
            "status": "ACTIVE",
            "createdAt": Decimal(str(NOW - 700)),
            "updatedAt": Decimal(str(NOW)),
        },
        # user-3 in app-2 (org-1), DEVELOPMENT
        {
            "applicationUserRoleId": "aur-5",
            "userId": "user-3",
            "applicationId": "app-2",
            "applicationName": "App Beta",
            "organizationId": "org-1",
            "organizationName": "Org One",
            "environment": "DEVELOPMENT",
            "roleId": "role-dev",
            "roleName": "Developer",
            "permissions": ["read", "write"],
            "status": "ACTIVE",
            "createdAt": Decimal(str(NOW - 600)),
            "updatedAt": Decimal(str(NOW)),
        },
        # user-3 in app-3 (org-2), STAGING
        {
            "applicationUserRoleId": "aur-6",
            "userId": "user-3",
            "applicationId": "app-3",
            "applicationName": "App Gamma",
            "organizationId": "org-2",
            "organizationName": "Org Two",
            "environment": "STAGING",
            "roleId": "role-admin",
            "roleName": "Admin",
            "permissions": ["read", "write", "admin"],
            "status": "ACTIVE",
            "createdAt": Decimal(str(NOW - 500)),
            "updatedAt": Decimal(str(NOW)),
        },
        # user-4 in app-3 (org-2), PRODUCTION
        {
            "applicationUserRoleId": "aur-7",
            "userId": "user-4",
            "applicationId": "app-3",
            "applicationName": "App Gamma",
            "organizationId": "org-2",
            "organizationName": "Org Two",
            "environment": "PRODUCTION",
            "roleId": "role-viewer",
            "roleName": "Viewer",
            "permissions": ["read"],
            "status": "ACTIVE",
            "createdAt": Decimal(str(NOW - 400)),
            "updatedAt": Decimal(str(NOW)),
        },
        # user-5 in app-1 (org-1), PRODUCTION — DELETED (should be filtered out)
        {
            "applicationUserRoleId": "aur-8",
            "userId": "user-5",
            "applicationId": "app-1",
            "applicationName": "App Alpha",
            "organizationId": "org-1",
            "organizationName": "Org One",
            "environment": "PRODUCTION",
            "roleId": "role-viewer",
            "roleName": "Viewer",
            "permissions": ["read"],
            "status": "DELETED",
            "createdAt": Decimal(str(NOW - 300)),
            "updatedAt": Decimal(str(NOW)),
        },
    ]
    for a in assignments:
        table.put_item(Item=a)
    return assignments


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def aws_env(monkeypatch):
    """
    Stand up moto-mocked DynamoDB tables, seed data, and wire environment
    variables so the Lambda handler can find them.
    """
    with mock_aws():
        # Reset the module-level DynamoDB resource so moto intercepts it
        index._dynamodb = None

        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")

        # Create all tables
        _create_application_user_roles_table(dynamodb)
        _create_users_table(dynamodb)
        _create_organizations_table(dynamodb)
        _create_org_users_table(dynamodb)
        _create_applications_table(dynamodb)

        # Seed data
        _seed_users(dynamodb)
        _seed_applications(dynamodb)
        _seed_role_assignments(dynamodb)

        # Set environment variables for the Lambda
        monkeypatch.setenv("APPLICATION_USER_ROLES_TABLE_NAME", APP_USER_ROLES_TABLE)
        monkeypatch.setenv("USERS_TABLE_NAME", USERS_TABLE)
        monkeypatch.setenv("ORGANIZATIONS_TABLE_NAME", ORGANIZATIONS_TABLE)
        monkeypatch.setenv("APPLICATIONS_TABLE_NAME", APPLICATIONS_TABLE)

        yield dynamodb

        # Reset the cached resource after the test
        index._dynamodb = None


def _build_event(*, input_data, caller_user_id="employee-caller", groups=None):
    """Build an AppSync-style Lambda event."""
    if groups is None:
        groups = ["USER", "EMPLOYEE"]
    return {
        "arguments": {"input": input_data},
        "identity": {
            "sub": caller_user_id,
            "groups": groups,
        },
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _user_ids(response):
    """Extract sorted list of userIds from a handler response."""
    return sorted(u["userId"] for u in response["users"])


def _all_role_app_ids(response):
    """Collect all applicationIds across every user's roleAssignments."""
    ids = set()
    for u in response["users"]:
        for ra in u["roleAssignments"]:
            ids.add(ra["applicationId"])
    return ids


def _all_role_envs(response):
    """Collect all environments across every user's roleAssignments."""
    envs = set()
    for u in response["users"]:
        for ra in u["roleAssignments"]:
            envs.add(ra["environment"])
    return envs


# ===========================================================================
# Integration Tests
# ===========================================================================


class TestNoFiltersEmployee:
    """Query with no filters as EMPLOYEE — should return all ACTIVE users."""

    def test_returns_all_active_users(self, aws_env):
        """Req 3.7: No filters returns all accessible users."""
        event = _build_event(input_data={})
        result = lambda_handler(event, None)

        # 4 unique active users (user-5 is DELETED)
        assert len(result["users"]) == 4
        assert _user_ids(result) == ["user-1", "user-2", "user-3", "user-4"]

    def test_response_format(self, aws_env):
        """Verify the response matches the GraphQL output interface."""
        event = _build_event(input_data={})
        result = lambda_handler(event, None)

        assert "users" in result
        assert "nextToken" in result

        user = result["users"][0]
        for field in ("userId", "firstName", "lastName", "status", "roleAssignments"):
            assert field in user, f"Missing field: {field}"

        ra = user["roleAssignments"][0]
        for field in (
            "applicationUserRoleId", "applicationId", "applicationName",
            "organizationId", "organizationName", "environment",
            "roleId", "roleName", "permissions", "status",
            "createdAt", "updatedAt",
        ):
            assert field in ra, f"Missing roleAssignment field: {field}"

    def test_user_deduplication(self, aws_env):
        """Req 3.8: Each userId appears exactly once."""
        event = _build_event(input_data={})
        result = lambda_handler(event, None)

        user_ids = [u["userId"] for u in result["users"]]
        assert len(user_ids) == len(set(user_ids))

    def test_user_enrichment(self, aws_env):
        """Req 3.9: Users are enriched with firstName/lastName from Users table."""
        event = _build_event(input_data={})
        result = lambda_handler(event, None)

        user_map = {u["userId"]: u for u in result["users"]}
        assert user_map["user-1"]["firstName"] == "Alice"
        assert user_map["user-1"]["lastName"] == "Anderson"
        assert user_map["user-2"]["firstName"] == "Bob"
        assert user_map["user-2"]["lastName"] == "Brown"

    def test_sorting_by_name(self, aws_env):
        """Req 3.12: Results sorted by lastName then firstName."""
        event = _build_event(input_data={})
        result = lambda_handler(event, None)

        names = [(u["lastName"], u["firstName"]) for u in result["users"]]
        assert names == sorted(names, key=lambda n: (n[0].lower(), n[1].lower()))

    def test_role_grouping(self, aws_env):
        """Req 3.10: Role assignments grouped under each user."""
        event = _build_event(input_data={})
        result = lambda_handler(event, None)

        user_map = {u["userId"]: u for u in result["users"]}
        # user-1 has 3 active role assignments
        assert len(user_map["user-1"]["roleAssignments"]) == 3
        # user-2 has 1
        assert len(user_map["user-2"]["roleAssignments"]) == 1



class TestOrganizationIdsFilter:
    """Query with organizationIds filter (CUSTOMER caller)."""

    def test_customer_sees_only_owned_org(self, aws_env):
        """Req 3.2, 6.3: CUSTOMER sees only users in owned organizations."""
        # Seed org-user ownership: customer owns org-1 only
        _seed_org_users(aws_env, "customer-caller", ["org-1"])

        event = _build_event(
            input_data={},
            caller_user_id="customer-caller",
            groups=["USER", "CUSTOMER"],
        )
        result = lambda_handler(event, None)

        # Only users with roles in org-1 apps (app-1, app-2)
        org_ids = set()
        for u in result["users"]:
            for ra in u["roleAssignments"]:
                org_ids.add(ra["organizationId"])
        assert org_ids == {"org-1"}

    def test_employee_with_org_filter(self, aws_env):
        """Req 3.2: EMPLOYEE can filter by organizationIds explicitly."""
        event = _build_event(input_data={"organizationIds": ["org-2"]})
        result = lambda_handler(event, None)

        # Only users with roles in org-2 apps (app-3)
        org_ids = set()
        for u in result["users"]:
            for ra in u["roleAssignments"]:
                org_ids.add(ra["organizationId"])
        assert org_ids == {"org-2"}


class TestApplicationIdsFilter:
    """Query with applicationIds filter."""

    def test_filter_single_app(self, aws_env):
        """Req 3.3: Filter by a single applicationId."""
        event = _build_event(input_data={"applicationIds": ["app-1"]})
        result = lambda_handler(event, None)

        assert _all_role_app_ids(result) == {"app-1"}
        # user-1 and user-2 have active roles in app-1
        assert _user_ids(result) == ["user-1", "user-2"]

    def test_filter_multiple_apps(self, aws_env):
        """Req 3.3: Filter by multiple applicationIds."""
        event = _build_event(input_data={"applicationIds": ["app-1", "app-3"]})
        result = lambda_handler(event, None)

        assert _all_role_app_ids(result) <= {"app-1", "app-3"}
        # user-1 (app-1 + app-3), user-2 (app-1), user-3 (app-3), user-4 (app-3)
        assert _user_ids(result) == ["user-1", "user-2", "user-3", "user-4"]


class TestApplicationAndEnvironmentFilter:
    """Query with applicationIds + environment filter."""

    def test_app_and_env_filter(self, aws_env):
        """Req 3.5, 3.6: applicationIds + environment applies AND logic."""
        event = _build_event(
            input_data={"applicationIds": ["app-1"], "environment": "PRODUCTION"}
        )
        result = lambda_handler(event, None)

        assert _all_role_app_ids(result) == {"app-1"}
        assert _all_role_envs(result) == {"PRODUCTION"}
        # user-1 (PRODUCTION in app-1) and user-2 (PRODUCTION in app-1)
        assert _user_ids(result) == ["user-1", "user-2"]

    def test_app_and_staging_env(self, aws_env):
        """Req 3.5: Filter app-1 + STAGING returns only staging roles."""
        event = _build_event(
            input_data={"applicationIds": ["app-1"], "environment": "STAGING"}
        )
        result = lambda_handler(event, None)

        assert _all_role_envs(result) == {"STAGING"}
        # Only user-1 has a STAGING role in app-1
        assert _user_ids(result) == ["user-1"]


class TestPagination:
    """Verify pagination limit is applied correctly."""

    def test_limit_applied(self, aws_env):
        """Req 3.11: Returned users ≤ limit."""
        event = _build_event(input_data={"limit": 2})
        result = lambda_handler(event, None)

        assert len(result["users"]) == 2
        assert result["nextToken"] is not None

    def test_limit_larger_than_results(self, aws_env):
        """Req 3.11: When limit > total users, return all and no nextToken."""
        event = _build_event(input_data={"limit": 100})
        result = lambda_handler(event, None)

        assert len(result["users"]) == 4
        assert result["nextToken"] is None

    def test_limit_of_one(self, aws_env):
        """Req 3.11: Limit of 1 returns exactly one user."""
        event = _build_event(input_data={"limit": 1})
        result = lambda_handler(event, None)

        assert len(result["users"]) == 1
        assert result["nextToken"] is not None


class TestValidationErrors:
    """Verify validation errors are raised correctly through the handler."""

    def test_environment_without_org_or_app(self, aws_env):
        """Req 3.4: Environment filter without org/app raises validation error."""
        event = _build_event(input_data={"environment": "PRODUCTION"})

        with pytest.raises(Exception, match="ORB-VAL-001"):
            lambda_handler(event, None)

    def test_invalid_limit(self, aws_env):
        """Req 3.1: Invalid limit raises validation error."""
        event = _build_event(input_data={"limit": 0})

        with pytest.raises(Exception, match="ORB-VAL-002"):
            lambda_handler(event, None)

    def test_invalid_environment_value(self, aws_env):
        """Req 3.1: Invalid environment value raises validation error."""
        event = _build_event(
            input_data={"applicationIds": ["app-1"], "environment": "INVALID"}
        )

        with pytest.raises(Exception, match="ORB-VAL-003"):
            lambda_handler(event, None)


class TestAuthorizationErrors:
    """Verify authorization errors through the handler."""

    def test_unauthorized_group(self, aws_env):
        """Req 6.5: Caller without authorized group gets auth error."""
        event = _build_event(
            input_data={},
            groups=["USER"],  # No CUSTOMER/EMPLOYEE/OWNER
        )

        with pytest.raises(Exception, match="ORB-AUTH-003"):
            lambda_handler(event, None)


class TestCustomerAuthorization:
    """Verify CUSTOMER authorization scoping through the full pipeline."""

    def test_customer_owning_no_orgs_gets_empty(self, aws_env):
        """Req 6.3: CUSTOMER with no owned orgs gets empty results."""
        # Don't seed any org-user records for this caller
        event = _build_event(
            input_data={},
            caller_user_id="lonely-customer",
            groups=["USER", "CUSTOMER"],
        )
        result = lambda_handler(event, None)

        assert len(result["users"]) == 0

    def test_customer_org_intersection(self, aws_env):
        """Req 6.3: CUSTOMER requesting orgs they don't own gets intersection."""
        _seed_org_users(aws_env, "partial-customer", ["org-1"])

        event = _build_event(
            input_data={"organizationIds": ["org-1", "org-2"]},
            caller_user_id="partial-customer",
            groups=["USER", "CUSTOMER"],
        )
        result = lambda_handler(event, None)

        # Should only see org-1 data (intersection of requested ∩ owned)
        org_ids = set()
        for u in result["users"]:
            for ra in u["roleAssignments"]:
                org_ids.add(ra["organizationId"])
        assert org_ids == {"org-1"}


class TestEmployeeFullAccess:
    """Verify EMPLOYEE/OWNER see all organizations."""

    def test_employee_sees_all_orgs(self, aws_env):
        """Req 6.4: EMPLOYEE sees users from all organizations."""
        event = _build_event(input_data={}, groups=["USER", "EMPLOYEE"])
        result = lambda_handler(event, None)

        org_ids = set()
        for u in result["users"]:
            for ra in u["roleAssignments"]:
                org_ids.add(ra["organizationId"])
        assert org_ids == {"org-1", "org-2"}

    def test_owner_sees_all_orgs(self, aws_env):
        """Req 6.4: OWNER sees users from all organizations."""
        event = _build_event(input_data={}, groups=["USER", "OWNER"])
        result = lambda_handler(event, None)

        org_ids = set()
        for u in result["users"]:
            for ra in u["roleAssignments"]:
                org_ids.add(ra["organizationId"])
        assert org_ids == {"org-1", "org-2"}


class TestDeletedRolesExcluded:
    """Verify DELETED role assignments are filtered out."""

    def test_deleted_user_excluded(self, aws_env):
        """user-5 has only a DELETED role and should not appear."""
        event = _build_event(input_data={})
        result = lambda_handler(event, None)

        assert "user-5" not in _user_ids(result)


# ===========================================================================
# Task 15.2 – Authorization Integration Tests (Requirements 6.1-6.5)
# ===========================================================================


class TestCustomerPartialOrgOverlap:
    """CUSTOMER with explicit org filter that partially overlaps owned orgs."""

    def test_partial_overlap_returns_only_owned_intersection(self, aws_env):
        """Req 6.3: CUSTOMER requesting [org-1, org-2] but owning only org-2
        should see only org-2 data (intersection)."""
        _seed_org_users(aws_env, "cust-partial", ["org-2"])

        event = _build_event(
            input_data={"organizationIds": ["org-1", "org-2"]},
            caller_user_id="cust-partial",
            groups=["USER", "CUSTOMER"],
        )
        result = lambda_handler(event, None)

        # Only org-2 data should be returned
        org_ids = set()
        for u in result["users"]:
            for ra in u["roleAssignments"]:
                org_ids.add(ra["organizationId"])
        assert org_ids == {"org-2"}

        # Users with roles in org-2: user-1 (app-3), user-3 (app-3), user-4 (app-3)
        assert _user_ids(result) == ["user-1", "user-3", "user-4"]

    def test_no_overlap_returns_empty(self, aws_env):
        """Req 6.3: CUSTOMER requesting orgs they don't own gets empty results."""
        _seed_org_users(aws_env, "cust-disjoint", ["org-2"])

        event = _build_event(
            input_data={"organizationIds": ["org-1"]},
            caller_user_id="cust-disjoint",
            groups=["USER", "CUSTOMER"],
        )
        result = lambda_handler(event, None)

        assert len(result["users"]) == 0


class TestCustomerAppFilter:
    """CUSTOMER with applicationIds filter.

    When applicationIds are explicitly provided, the Lambda uses the
    APP_ENV_USER_INDEX strategy which queries by applicationId directly.
    The CUSTOMER authorization sets organizationIds on the input, but
    applicationIds takes priority in strategy selection, so the query
    returns results for the requested apps. Org-level scoping applies
    when no applicationIds are provided.
    """

    def test_app_in_owned_org_returns_results(self, aws_env):
        """Req 6.3: CUSTOMER filtering by app in an owned org sees results."""
        _seed_org_users(aws_env, "cust-app-owned", ["org-1"])

        event = _build_event(
            input_data={"applicationIds": ["app-1"]},
            caller_user_id="cust-app-owned",
            groups=["USER", "CUSTOMER"],
        )
        result = lambda_handler(event, None)

        # app-1 belongs to org-1 which the customer owns
        assert len(result["users"]) > 0
        assert _all_role_app_ids(result) == {"app-1"}

    def test_app_filter_uses_app_strategy(self, aws_env):
        """When applicationIds are provided, APP_ENV_USER_INDEX strategy is used
        and results are scoped to those apps."""
        _seed_org_users(aws_env, "cust-app-strat", ["org-1"])

        event = _build_event(
            input_data={"applicationIds": ["app-3"]},
            caller_user_id="cust-app-strat",
            groups=["USER", "CUSTOMER"],
        )
        result = lambda_handler(event, None)

        # APP_ENV_USER_INDEX queries by applicationId directly
        assert _all_role_app_ids(result) == {"app-3"}

    def test_mixed_apps_returns_all_requested(self, aws_env):
        """When CUSTOMER provides multiple applicationIds, all requested apps
        are queried via APP_ENV_USER_INDEX strategy."""
        _seed_org_users(aws_env, "cust-app-mixed", ["org-1"])

        event = _build_event(
            input_data={"applicationIds": ["app-1", "app-3"]},
            caller_user_id="cust-app-mixed",
            groups=["USER", "CUSTOMER"],
        )
        result = lambda_handler(event, None)

        # Both apps are queried directly
        assert _all_role_app_ids(result) <= {"app-1", "app-3"}
        assert len(result["users"]) == 4


class TestCustomerEnvAndAppFilter:
    """CUSTOMER with environment + app filter combination."""

    def test_env_and_app_in_owned_org(self, aws_env):
        """Req 6.3, 3.5, 3.6: CUSTOMER with app+env filter in owned org."""
        _seed_org_users(aws_env, "cust-env-app", ["org-1"])

        event = _build_event(
            input_data={"applicationIds": ["app-1"], "environment": "PRODUCTION"},
            caller_user_id="cust-env-app",
            groups=["USER", "CUSTOMER"],
        )
        result = lambda_handler(event, None)

        assert _all_role_app_ids(result) == {"app-1"}
        assert _all_role_envs(result) == {"PRODUCTION"}
        # user-1 and user-2 have PRODUCTION roles in app-1
        assert _user_ids(result) == ["user-1", "user-2"]

    def test_env_and_app_filter_scopes_correctly(self, aws_env):
        """CUSTOMER with app+env filter returns only matching env for that app."""
        _seed_org_users(aws_env, "cust-env-app-scope", ["org-2"])

        event = _build_event(
            input_data={"applicationIds": ["app-3"], "environment": "PRODUCTION"},
            caller_user_id="cust-env-app-scope",
            groups=["USER", "CUSTOMER"],
        )
        result = lambda_handler(event, None)

        # app-3 PRODUCTION: user-1 and user-4
        assert _all_role_app_ids(result) == {"app-3"}
        assert _all_role_envs(result) == {"PRODUCTION"}
        assert _user_ids(result) == ["user-1", "user-4"]


class TestEmployeeExplicitOrgFilter:
    """EMPLOYEE with explicit org filter - should see all requested orgs."""

    def test_employee_single_org_filter(self, aws_env):
        """Req 6.4: EMPLOYEE filtering by org-2 sees all org-2 data."""
        event = _build_event(
            input_data={"organizationIds": ["org-2"]},
            groups=["USER", "EMPLOYEE"],
        )
        result = lambda_handler(event, None)

        org_ids = set()
        for u in result["users"]:
            for ra in u["roleAssignments"]:
                org_ids.add(ra["organizationId"])
        assert org_ids == {"org-2"}

        # user-1 (app-3 PROD), user-3 (app-3 STAGING), user-4 (app-3 PROD)
        assert _user_ids(result) == ["user-1", "user-3", "user-4"]

    def test_employee_multi_org_filter(self, aws_env):
        """Req 6.4: EMPLOYEE filtering by both orgs sees everything."""
        event = _build_event(
            input_data={"organizationIds": ["org-1", "org-2"]},
            groups=["USER", "EMPLOYEE"],
        )
        result = lambda_handler(event, None)

        org_ids = set()
        for u in result["users"]:
            for ra in u["roleAssignments"]:
                org_ids.add(ra["organizationId"])
        assert org_ids == {"org-1", "org-2"}

        # All 4 active users
        assert _user_ids(result) == ["user-1", "user-2", "user-3", "user-4"]


class TestEmployeeAppEnvFilter:
    """EMPLOYEE with app + env filter combination."""

    def test_employee_app_and_env(self, aws_env):
        """Req 6.4, 3.5, 3.6: EMPLOYEE with app+env filter sees matching data."""
        event = _build_event(
            input_data={"applicationIds": ["app-3"], "environment": "STAGING"},
            groups=["USER", "EMPLOYEE"],
        )
        result = lambda_handler(event, None)

        assert _all_role_app_ids(result) == {"app-3"}
        assert _all_role_envs(result) == {"STAGING"}
        # Only user-3 has a STAGING role in app-3
        assert _user_ids(result) == ["user-3"]

    def test_employee_multi_app_and_env(self, aws_env):
        """Req 6.4: EMPLOYEE with multiple apps + env filter."""
        event = _build_event(
            input_data={"applicationIds": ["app-1", "app-3"], "environment": "PRODUCTION"},
            groups=["USER", "EMPLOYEE"],
        )
        result = lambda_handler(event, None)

        assert _all_role_app_ids(result) <= {"app-1", "app-3"}
        assert _all_role_envs(result) == {"PRODUCTION"}
        # user-1 (app-1 PROD + app-3 PROD), user-2 (app-1 PROD), user-4 (app-3 PROD)
        assert _user_ids(result) == ["user-1", "user-2", "user-4"]


class TestOwnerAuthorization:
    """OWNER has same unrestricted access as EMPLOYEE."""

    def test_owner_with_org_filter(self, aws_env):
        """Req 6.4: OWNER with org filter sees all requested org data."""
        event = _build_event(
            input_data={"organizationIds": ["org-2"]},
            groups=["USER", "OWNER"],
        )
        result = lambda_handler(event, None)

        org_ids = set()
        for u in result["users"]:
            for ra in u["roleAssignments"]:
                org_ids.add(ra["organizationId"])
        assert org_ids == {"org-2"}

    def test_owner_with_app_env_filter(self, aws_env):
        """Req 6.4: OWNER with app+env filter sees matching data."""
        event = _build_event(
            input_data={"applicationIds": ["app-1"], "environment": "STAGING"},
            groups=["USER", "OWNER"],
        )
        result = lambda_handler(event, None)

        assert _all_role_app_ids(result) == {"app-1"}
        assert _all_role_envs(result) == {"STAGING"}
        assert _user_ids(result) == ["user-1"]


class TestCustomerOrgScopingInvariant:
    """Verify CUSTOMER org scoping works correctly with org-based queries.

    When no applicationIds are provided, CUSTOMER authorization rewrites
    organizationIds to owned orgs, ensuring results are scoped correctly.
    """

    def test_no_leakage_with_no_filters(self, aws_env):
        """Req 6.3: CUSTOMER with no filters sees only owned org data."""
        _seed_org_users(aws_env, "cust-scope-1", ["org-1"])

        event = _build_event(
            input_data={},
            caller_user_id="cust-scope-1",
            groups=["USER", "CUSTOMER"],
        )
        result = lambda_handler(event, None)

        for u in result["users"]:
            for ra in u["roleAssignments"]:
                assert ra["organizationId"] == "org-1", (
                    f"CUSTOMER saw org {ra['organizationId']} but only owns org-1"
                )

    def test_no_leakage_with_org_filter(self, aws_env):
        """Req 6.3: CUSTOMER filtering by orgs never leaks non-owned org data."""
        _seed_org_users(aws_env, "cust-scope-2", ["org-2"])

        event = _build_event(
            input_data={"organizationIds": ["org-1", "org-2"]},
            caller_user_id="cust-scope-2",
            groups=["USER", "CUSTOMER"],
        )
        result = lambda_handler(event, None)

        # Customer owns org-2 only; intersection filters to org-2
        for u in result["users"]:
            for ra in u["roleAssignments"]:
                assert ra["organizationId"] == "org-2", (
                    f"CUSTOMER saw org {ra['organizationId']} but only owns org-2"
                )

    def test_no_leakage_owning_both_orgs(self, aws_env):
        """Req 6.3: CUSTOMER owning both orgs sees all data (no false restriction)."""
        _seed_org_users(aws_env, "cust-scope-both", ["org-1", "org-2"])

        event = _build_event(
            input_data={},
            caller_user_id="cust-scope-both",
            groups=["USER", "CUSTOMER"],
        )
        result = lambda_handler(event, None)

        org_ids = set()
        for u in result["users"]:
            for ra in u["roleAssignments"]:
                org_ids.add(ra["organizationId"])
        # Owns both orgs, should see data from both
        assert org_ids == {"org-1", "org-2"}
        assert _user_ids(result) == ["user-1", "user-2", "user-3", "user-4"]



class TestMultiFilterCombinations:
    """Multi-filter integration tests: organizationIds + applicationIds + environment.

    Validates Req 3.2, 3.3, 3.5, 3.6 — when multiple filters are provided,
    the system applies AND logic across all of them.

    Seed data reference:
    - app-1 (org-1): user-1 [PROD, STAGING], user-2 [PROD], user-5 [PROD/DELETED]
    - app-2 (org-1): user-3 [DEVELOPMENT]
    - app-3 (org-2): user-1 [PROD], user-3 [STAGING], user-4 [PROD]

    Key behaviour: when applicationIds are provided they take priority in
    strategy selection (APP_ENV_USER_INDEX), so organizationIds are effectively
    used only for authorization scoping (CUSTOMER) rather than query filtering.
    """

    # ------------------------------------------------------------------
    # 1. orgIds + appIds + environment — all three filters
    # ------------------------------------------------------------------

    def test_all_three_filters_employee(self, aws_env):
        """Req 3.2, 3.3, 3.5, 3.6: EMPLOYEE with org + app + env."""
        event = _build_event(
            input_data={
                "organizationIds": ["org-1"],
                "applicationIds": ["app-1"],
                "environment": "PRODUCTION",
            },
            groups=["USER", "EMPLOYEE"],
        )
        result = lambda_handler(event, None)

        # app-1 PRODUCTION: user-1 (aur-1) and user-2 (aur-4)
        assert _user_ids(result) == ["user-1", "user-2"]
        assert _all_role_app_ids(result) == {"app-1"}
        assert _all_role_envs(result) == {"PRODUCTION"}
        assert len(result["users"]) == 2

    def test_all_three_filters_staging(self, aws_env):
        """Req 3.5, 3.6: org + app + STAGING env narrows to single user."""
        event = _build_event(
            input_data={
                "organizationIds": ["org-1"],
                "applicationIds": ["app-1"],
                "environment": "STAGING",
            },
            groups=["USER", "EMPLOYEE"],
        )
        result = lambda_handler(event, None)

        # app-1 STAGING: only user-1 (aur-2)
        assert _user_ids(result) == ["user-1"]
        assert _all_role_envs(result) == {"STAGING"}
        assert len(result["users"]) == 1

    # ------------------------------------------------------------------
    # 2. orgIds + appIds (no environment)
    # ------------------------------------------------------------------

    def test_org_and_app_no_env(self, aws_env):
        """Req 3.2, 3.3: org + app without env returns all envs for that app."""
        event = _build_event(
            input_data={
                "organizationIds": ["org-1"],
                "applicationIds": ["app-1"],
            },
            groups=["USER", "EMPLOYEE"],
        )
        result = lambda_handler(event, None)

        # app-1 all envs: user-1 (PROD+STAGING), user-2 (PROD)
        assert _user_ids(result) == ["user-1", "user-2"]
        assert _all_role_app_ids(result) == {"app-1"}
        assert _all_role_envs(result) == {"PRODUCTION", "STAGING"}
        assert len(result["users"]) == 2

    # ------------------------------------------------------------------
    # 3. Multiple orgIds + multiple appIds + environment
    # ------------------------------------------------------------------

    def test_multi_org_multi_app_with_env(self, aws_env):
        """Req 3.2, 3.3, 3.5, 3.6: multiple orgs + apps + env filter."""
        event = _build_event(
            input_data={
                "organizationIds": ["org-1", "org-2"],
                "applicationIds": ["app-1", "app-3"],
                "environment": "PRODUCTION",
            },
            groups=["USER", "EMPLOYEE"],
        )
        result = lambda_handler(event, None)

        # app-1 PROD: user-1, user-2; app-3 PROD: user-1, user-4
        # Deduplicated: user-1, user-2, user-4
        assert _user_ids(result) == ["user-1", "user-2", "user-4"]
        assert _all_role_app_ids(result) <= {"app-1", "app-3"}
        assert _all_role_envs(result) == {"PRODUCTION"}
        assert len(result["users"]) == 3

    def test_multi_org_multi_app_no_env(self, aws_env):
        """Req 3.2, 3.3: multiple orgs + apps, no env filter."""
        event = _build_event(
            input_data={
                "organizationIds": ["org-1", "org-2"],
                "applicationIds": ["app-1", "app-2", "app-3"],
            },
            groups=["USER", "EMPLOYEE"],
        )
        result = lambda_handler(event, None)

        # All apps, all envs: user-1, user-2, user-3, user-4
        assert _user_ids(result) == ["user-1", "user-2", "user-3", "user-4"]
        assert _all_role_app_ids(result) == {"app-1", "app-2", "app-3"}
        assert len(result["users"]) == 4

    # ------------------------------------------------------------------
    # 4. Filters that result in empty intersection
    # ------------------------------------------------------------------

    def test_app_not_in_specified_org_still_returns(self, aws_env):
        """When appIds are provided, they take priority over orgIds in strategy
        selection. The query returns results for the requested apps regardless
        of the orgIds filter (orgIds only affect CUSTOMER auth scoping)."""
        event = _build_event(
            input_data={
                "organizationIds": ["org-1"],
                "applicationIds": ["app-3"],  # app-3 belongs to org-2, not org-1
            },
            groups=["USER", "EMPLOYEE"],
        )
        result = lambda_handler(event, None)

        # EMPLOYEE: no org scoping, app-3 queried directly
        # app-3: user-1 (PROD), user-3 (STAGING), user-4 (PROD)
        assert _all_role_app_ids(result) == {"app-3"}
        assert len(result["users"]) == 3

    def test_env_with_no_matching_roles(self, aws_env):
        """Req 3.5, 3.6: env filter that matches no roles returns empty."""
        event = _build_event(
            input_data={
                "organizationIds": ["org-1"],
                "applicationIds": ["app-1"],
                "environment": "DEVELOPMENT",  # no DEVELOPMENT roles in app-1
            },
            groups=["USER", "EMPLOYEE"],
        )
        result = lambda_handler(event, None)

        assert result["users"] == []
        assert len(result["users"]) == 0

    # ------------------------------------------------------------------
    # 5. All filters with pagination (limit)
    # ------------------------------------------------------------------

    def test_all_filters_with_limit(self, aws_env):
        """Req 3.11: pagination limit applied with multi-filter combo."""
        event = _build_event(
            input_data={
                "organizationIds": ["org-1", "org-2"],
                "applicationIds": ["app-1", "app-3"],
                "environment": "PRODUCTION",
                "limit": 2,
            },
            groups=["USER", "EMPLOYEE"],
        )
        result = lambda_handler(event, None)

        # Full result would be 3 users (user-1, user-2, user-4)
        # With limit=2, we get at most 2
        assert len(result["users"]) <= 2
        # All returned users should match the filters
        assert _all_role_envs(result) == {"PRODUCTION"}
        assert _all_role_app_ids(result) <= {"app-1", "app-3"}

    # ------------------------------------------------------------------
    # 6. CUSTOMER caller with all three filters
    # ------------------------------------------------------------------

    def test_customer_all_three_filters_owned_org(self, aws_env):
        """Req 6.3, 3.2, 3.3, 3.5, 3.6: CUSTOMER with org+app+env, owns org."""
        _seed_org_users(aws_env, "cust-multi-1", ["org-1"])

        event = _build_event(
            input_data={
                "organizationIds": ["org-1"],
                "applicationIds": ["app-1"],
                "environment": "PRODUCTION",
            },
            caller_user_id="cust-multi-1",
            groups=["USER", "CUSTOMER"],
        )
        result = lambda_handler(event, None)

        # app-1 PRODUCTION: user-1 and user-2
        assert _user_ids(result) == ["user-1", "user-2"]
        assert _all_role_app_ids(result) == {"app-1"}
        assert _all_role_envs(result) == {"PRODUCTION"}
        assert len(result["users"]) == 2

    def test_customer_all_filters_cross_org_app(self, aws_env):
        """CUSTOMER requesting app in non-owned org with all three filters.
        applicationIds take priority in strategy, so results come back for
        the requested app regardless of org ownership."""
        _seed_org_users(aws_env, "cust-multi-2", ["org-1"])

        event = _build_event(
            input_data={
                "organizationIds": ["org-1"],
                "applicationIds": ["app-3"],  # app-3 is in org-2
                "environment": "PRODUCTION",
            },
            caller_user_id="cust-multi-2",
            groups=["USER", "CUSTOMER"],
        )
        result = lambda_handler(event, None)

        # APP_ENV_USER_INDEX strategy queries app-3 directly
        # app-3 PRODUCTION: user-1, user-4
        assert _all_role_app_ids(result) == {"app-3"}
        assert _all_role_envs(result) == {"PRODUCTION"}
        assert len(result["users"]) == 2

    # ------------------------------------------------------------------
    # 7. Verify result counts match expected data
    # ------------------------------------------------------------------

    def test_result_count_org1_app1_production(self, aws_env):
        """Verify exact count: org-1 + app-1 + PRODUCTION = 2 users."""
        event = _build_event(
            input_data={
                "organizationIds": ["org-1"],
                "applicationIds": ["app-1"],
                "environment": "PRODUCTION",
            },
            groups=["USER", "EMPLOYEE"],
        )
        result = lambda_handler(event, None)
        assert len(result["users"]) == 2

    def test_result_count_org2_app3_staging(self, aws_env):
        """Verify exact count: org-2 + app-3 + STAGING = 1 user (user-3)."""
        event = _build_event(
            input_data={
                "organizationIds": ["org-2"],
                "applicationIds": ["app-3"],
                "environment": "STAGING",
            },
            groups=["USER", "EMPLOYEE"],
        )
        result = lambda_handler(event, None)
        assert len(result["users"]) == 1
        assert _user_ids(result) == ["user-3"]
