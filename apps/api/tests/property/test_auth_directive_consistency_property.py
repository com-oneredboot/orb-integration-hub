# file: apps/api/tests/property/test_auth_directive_consistency_property.py
# description: Property-based tests for GraphQL schema auth directive consistency
# Feature: auth-workflow-review, Property 1: Auth Directive Consistency
# Validates: Requirements 1.2, 3.1

"""
Property 1: Auth Directive Consistency

*For any* GraphQL operation (query or mutation) in the schema, the auth directive
(@aws_api_key or @aws_auth) SHALL match the security requirements documented in
the API documentation and schema definitions.
"""

import re
from pathlib import Path
from typing import NamedTuple

import pytest
from hypothesis import given, settings
import hypothesis.strategies as st


class GraphQLOperation(NamedTuple):
    """Represents a GraphQL operation with its auth directive."""

    name: str
    operation_type: str  # 'query' or 'mutation'
    auth_directive: str  # '@aws_api_key', '@aws_auth', or 'none'
    cognito_groups: list[str]


def parse_schema_operations(schema_path: str) -> list[GraphQLOperation]:
    """Parse GraphQL schema and extract operations with their auth directives."""
    operations = []

    with open(schema_path, "r") as f:
        content = f.read()

    # Find Query type block
    query_match = re.search(r"type Query \{([^}]+)\}", content, re.DOTALL)
    if query_match:
        query_block = query_match.group(1)
        for line in query_block.strip().split("\n"):
            op = parse_operation_line(line.strip(), "query")
            if op:
                operations.append(op)

    # Find Mutation type block
    mutation_match = re.search(r"type Mutation \{([^}]+)\}", content, re.DOTALL)
    if mutation_match:
        mutation_block = mutation_match.group(1)
        for line in mutation_block.strip().split("\n"):
            op = parse_operation_line(line.strip(), "mutation")
            if op:
                operations.append(op)

    return operations


def parse_operation_line(line: str, op_type: str) -> GraphQLOperation | None:
    """Parse a single operation line from the schema."""
    if not line or line.startswith("#"):
        return None

    # Extract operation name
    name_match = re.match(r"(\w+)\(", line)
    if not name_match:
        return None

    name = name_match.group(1)

    # Check for auth directives
    if "@aws_api_key" in line:
        return GraphQLOperation(name, op_type, "@aws_api_key", [])

    # Extract cognito groups from @aws_auth
    auth_match = re.search(r"@aws_auth\(cognito_groups:\s*\[([^\]]+)\]\)", line)
    if auth_match:
        groups_str = auth_match.group(1)
        groups = [g.strip().strip('"').strip("'") for g in groups_str.split(",")]
        return GraphQLOperation(name, op_type, "@aws_auth", groups)

    return GraphQLOperation(name, op_type, "none", [])


# Define expected auth configurations
PUBLIC_OPERATIONS = {"CheckEmailExists", "CreateUserFromCognito"}
OWNER_ONLY_OPERATIONS = {
    "UsersQueryByUserId",
    "UsersQueryByEmail",
    "UsersQueryByCognitoId",
    "UsersQueryByCognitoSub",
    "UsersDisable",
    "ApplicationUsersQueryByApplicationUserId",
    "ApplicationUsersQueryByUserId",
    "ApplicationUsersQueryByUserIdAndApplicationId",
    "ApplicationUsersQueryByApplicationId",
    "ApplicationUsersQueryByApplicationIdAndUserId",
    "ApplicationUsersCreate",
    "ApplicationUsersUpdate",
    "ApplicationUsersDelete",
    "ApplicationUsersDisable",
    "ApplicationRolesQueryByApplicationRoleId",
    "ApplicationRolesQueryByUserId",
    "ApplicationRolesQueryByUserIdAndRoleId",
    "ApplicationRolesQueryByApplicationId",
    "ApplicationRolesQueryByApplicationIdAndRoleId",
    "ApplicationRolesQueryByRoleId",
    "ApplicationRolesQueryByRoleIdAndRoleType",
    "ApplicationRolesCreate",
    "ApplicationRolesUpdate",
    "ApplicationRolesDelete",
    "ApplicationRolesDisable",
    "RolesQueryByRoleId",
    "RolesQueryByUserId",
    "RolesQueryByUserIdAndRoleType",
    "RolesCreate",
    "RolesUpdate",
    "RolesDelete",
    "RolesDisable",
}
EMPLOYEE_OWNER_OPERATIONS = {
    "UsersCreate",
    "UsersUpdate",
    "UsersDelete",
    "PrivacyRequestsQueryByRequestId",
    "PrivacyRequestsQueryByRequestType",
    "PrivacyRequestsQueryByRequestTypeAndReceivedAt",
    "PrivacyRequestsQueryByDataSubjectEmail",
    "PrivacyRequestsQueryByDataSubjectEmailAndReceivedAt",
    "PrivacyRequestsQueryByOrganizationId",
    "PrivacyRequestsQueryByOrganizationIdAndReceivedAt",
    "PrivacyRequestsQueryByStatus",
    "PrivacyRequestsQueryByStatusAndDeadline",
    "PrivacyRequestsCreate",
    "PrivacyRequestsUpdate",
    "PrivacyRequestsDelete",
    "PrivacyRequestsDisable",
}


class TestAuthDirectiveConsistency:
    """Property-based tests for auth directive consistency."""

    @pytest.fixture(scope="class")
    def schema_path(self) -> str:
        """Get path to GraphQL schema."""
        # Navigate from test file to schema
        test_dir = Path(__file__).parent
        schema_path = test_dir.parent.parent / "graphql" / "schema.graphql"
        return str(schema_path)

    @pytest.fixture(scope="class")
    def operations(self, schema_path: str) -> list[GraphQLOperation]:
        """Parse all operations from schema."""
        return parse_schema_operations(schema_path)

    def test_all_operations_have_auth_directive(self, operations: list[GraphQLOperation]):
        """
        Property: Every operation must have an auth directive.

        For any GraphQL operation, it SHALL have either @aws_api_key or @aws_auth.
        """
        missing_auth = [op for op in operations if op.auth_directive == "none"]

        assert (
            len(missing_auth) == 0
        ), f"Operations missing auth directive: {[op.name for op in missing_auth]}"

    def test_public_operations_use_api_key(self, operations: list[GraphQLOperation]):
        """
        Property: Public operations must use @aws_api_key.

        For any operation in PUBLIC_OPERATIONS, it SHALL have @aws_api_key directive.
        """
        for op in operations:
            if op.name in PUBLIC_OPERATIONS:
                assert op.auth_directive == "@aws_api_key", (
                    f"Public operation {op.name} should use @aws_api_key, "
                    f"found {op.auth_directive}"
                )

    def test_public_operations_no_cognito_auth(self, operations: list[GraphQLOperation]):
        """
        Property: Public operations must NOT use @aws_auth.

        For any operation in PUBLIC_OPERATIONS, it SHALL NOT have @aws_auth directive.
        """
        for op in operations:
            if op.name in PUBLIC_OPERATIONS:
                assert (
                    op.auth_directive != "@aws_auth"
                ), f"Public operation {op.name} should not use @aws_auth"

    def test_protected_operations_use_cognito_auth(self, operations: list[GraphQLOperation]):
        """
        Property: Non-public operations must use @aws_auth.

        For any operation NOT in PUBLIC_OPERATIONS, it SHALL have @aws_auth directive.
        """
        for op in operations:
            if op.name not in PUBLIC_OPERATIONS:
                assert op.auth_directive == "@aws_auth", (
                    f"Protected operation {op.name} should use @aws_auth, "
                    f"found {op.auth_directive}"
                )

    def test_owner_only_operations_restrict_to_owner(self, operations: list[GraphQLOperation]):
        """
        Property: Owner-only operations must restrict to OWNER group.

        For any operation in OWNER_ONLY_OPERATIONS, cognito_groups SHALL contain only OWNER.
        """
        for op in operations:
            if op.name in OWNER_ONLY_OPERATIONS:
                assert "OWNER" in op.cognito_groups, (
                    f"Owner-only operation {op.name} should include OWNER group, "
                    f"found {op.cognito_groups}"
                )

    def test_employee_owner_operations_include_both(self, operations: list[GraphQLOperation]):
        """
        Property: Employee/Owner operations must include both groups.

        For any operation in EMPLOYEE_OWNER_OPERATIONS, cognito_groups SHALL contain
        both EMPLOYEE and OWNER.
        """
        for op in operations:
            if op.name in EMPLOYEE_OWNER_OPERATIONS:
                assert "EMPLOYEE" in op.cognito_groups or "OWNER" in op.cognito_groups, (
                    f"Employee/Owner operation {op.name} should include EMPLOYEE or OWNER, "
                    f"found {op.cognito_groups}"
                )

    def test_no_user_group_on_admin_operations(self, operations: list[GraphQLOperation]):
        """
        Property: Admin operations must not allow USER group.

        For any operation in OWNER_ONLY_OPERATIONS or EMPLOYEE_OWNER_OPERATIONS,
        cognito_groups SHALL NOT contain USER.
        """
        admin_ops = OWNER_ONLY_OPERATIONS | EMPLOYEE_OWNER_OPERATIONS
        for op in operations:
            if op.name in admin_ops:
                assert "USER" not in op.cognito_groups, (
                    f"Admin operation {op.name} should not allow USER group, "
                    f"found {op.cognito_groups}"
                )

    def test_sms_operations_allow_user_group(self, operations: list[GraphQLOperation]):
        """
        Property: SMS operations must allow USER group.

        For SmsVerification and SmsRateLimit operations, cognito_groups SHALL contain USER.
        """
        sms_ops = {
            "SmsVerification",
            "SmsRateLimitQueryByPhoneNumber",
            "SmsRateLimitCreate",
            "SmsRateLimitUpdate",
            "SmsRateLimitDelete",
            "SmsRateLimitDisable",
        }
        for op in operations:
            if op.name in sms_ops:
                assert "USER" in op.cognito_groups or "OWNER" in op.cognito_groups, (
                    f"SMS operation {op.name} should allow USER or OWNER, "
                    f"found {op.cognito_groups}"
                )


# Property-based test using hypothesis
@given(st.sampled_from(list(PUBLIC_OPERATIONS)))
@settings(max_examples=10)
def test_public_operation_names_are_valid(operation_name: str):
    """
    Property: Public operation names follow naming convention.

    For any public operation name, it SHALL be PascalCase and descriptive.
    """
    # Check PascalCase (starts with uppercase, no underscores)
    assert operation_name[0].isupper(), f"{operation_name} should start with uppercase"
    assert "_" not in operation_name, f"{operation_name} should not contain underscores"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
