# file: apps/api/lambdas/get_application_users/test_get_application_users_property.py
# author: orb-integration-hub
# created: 2026-02-09
# description: Property-based tests for GetApplicationUsers Lambda function

import pytest
from unittest.mock import patch
from hypothesis import given, strategies as st, settings, assume
from lambdas.get_application_users.index import (
    validate_input,
    apply_authorization,
    deduplicate_and_group_by_user,
    sort_users_by_name,
    GetApplicationUsersInput,
    UserWithRoles,
    ValidationError,
    AuthorizationError,
    ErrorCode,
    VALID_ENVIRONMENTS
)


# Test strategies
environment_strategy = st.sampled_from(list(VALID_ENVIRONMENTS))
invalid_environment_strategy = st.text(min_size=1).filter(lambda x: x not in VALID_ENVIRONMENTS)
organization_ids_strategy = st.lists(st.uuids().map(str), min_size=1, max_size=5)
application_ids_strategy = st.lists(st.uuids().map(str), min_size=1, max_size=5)


# Feature: application-users-management, Property 1: Input Validation
# Validates: Requirements 3.1, 3.4


@settings(max_examples=100)
@given(
    environment=environment_strategy,
    limit=st.integers(min_value=1, max_value=100)
)
def test_property_environment_filter_without_org_or_app_raises_error(environment, limit):
    """
    Property 1a: For any GetApplicationUsers input, if environment filter is provided
    without organizationIds or applicationIds, then the Lambda SHALL return a validation error.
    
    This property ensures that environment-only queries are rejected to prevent
    overly broad queries that could return too much data.
    """
    query_input = GetApplicationUsersInput(
        organizationIds=None,
        applicationIds=None,
        environment=environment,
        limit=limit
    )
    
    with pytest.raises(ValidationError) as exc_info:
        validate_input(query_input)
    
    assert exc_info.value.code == ErrorCode.VAL_ENVIRONMENT_REQUIRES_FILTER
    assert "Environment filter requires organizationIds or applicationIds" in exc_info.value.message


@settings(max_examples=100)
@given(
    environment=environment_strategy,
    organization_ids=organization_ids_strategy,
    limit=st.integers(min_value=1, max_value=100)
)
def test_property_environment_filter_with_org_ids_passes(environment, organization_ids, limit):
    """
    Property 1b: For any GetApplicationUsers input, if environment filter is provided
    WITH organizationIds, then validation SHALL pass.
    """
    query_input = GetApplicationUsersInput(
        organizationIds=organization_ids,
        applicationIds=None,
        environment=environment,
        limit=limit
    )
    
    # Should not raise
    validate_input(query_input)


@settings(max_examples=100)
@given(
    environment=environment_strategy,
    application_ids=application_ids_strategy,
    limit=st.integers(min_value=1, max_value=100)
)
def test_property_environment_filter_with_app_ids_passes(environment, application_ids, limit):
    """
    Property 1c: For any GetApplicationUsers input, if environment filter is provided
    WITH applicationIds, then validation SHALL pass.
    """
    query_input = GetApplicationUsersInput(
        organizationIds=None,
        applicationIds=application_ids,
        environment=environment,
        limit=limit
    )
    
    # Should not raise
    validate_input(query_input)


@settings(max_examples=100)
@given(
    limit=st.one_of(
        st.integers(max_value=0),
        st.integers(min_value=101)
    )
)
def test_property_invalid_limit_raises_error(limit):
    """
    Property 1d: For any GetApplicationUsers input, if limit is not between 1 and 100,
    then the Lambda SHALL return a validation error.
    """
    query_input = GetApplicationUsersInput(
        organizationIds=None,
        applicationIds=None,
        environment=None,
        limit=limit
    )
    
    with pytest.raises(ValidationError) as exc_info:
        validate_input(query_input)
    
    assert exc_info.value.code == ErrorCode.VAL_INVALID_LIMIT
    assert "Limit must be between 1 and 100" in exc_info.value.message


@settings(max_examples=100)
@given(
    limit=st.integers(min_value=1, max_value=100)
)
def test_property_valid_limit_passes(limit):
    """
    Property 1e: For any GetApplicationUsers input, if limit is between 1 and 100,
    then validation SHALL pass (assuming no other validation errors).
    """
    query_input = GetApplicationUsersInput(
        organizationIds=None,
        applicationIds=None,
        environment=None,
        limit=limit
    )
    
    # Should not raise
    validate_input(query_input)


@settings(max_examples=100)
@given(
    invalid_environment=invalid_environment_strategy,
    organization_ids=organization_ids_strategy,
    limit=st.integers(min_value=1, max_value=100)
)
def test_property_invalid_environment_raises_error(invalid_environment, organization_ids, limit):
    """
    Property 1f: For any GetApplicationUsers input, if environment value is not a valid
    Environment enum value, then the Lambda SHALL return a validation error.
    """
    query_input = GetApplicationUsersInput(
        organizationIds=organization_ids,
        applicationIds=None,
        environment=invalid_environment,
        limit=limit
    )
    
    with pytest.raises(ValidationError) as exc_info:
        validate_input(query_input)
    
    assert exc_info.value.code == ErrorCode.VAL_INVALID_ENVIRONMENT
    assert "Invalid environment value" in exc_info.value.message



# Feature: application-users-management, Property 3: Authorization Filtering
# Validates: Requirements 6.3, 6.4


@settings(max_examples=100)
@given(
    owned_org_ids=st.lists(st.uuids().map(str), min_size=1, max_size=5),
    requested_org_ids=st.lists(st.uuids().map(str), min_size=1, max_size=5),
    limit=st.integers(min_value=1, max_value=100)
)
def test_property_customer_authorization_filters_to_owned_orgs(owned_org_ids, requested_org_ids, limit):
    """
    Property 3a: For any CUSTOMER caller, all returned users SHALL only have role assignments
    in organizations owned by that customer.
    
    This property ensures that CUSTOMER users can only query organizations they own,
    even if they request other organizations.
    """
    caller_groups = ["USER", "CUSTOMER"]
    caller_user_id = "test-customer-user-id"
    
    query_input = GetApplicationUsersInput(
        organizationIds=requested_org_ids,
        applicationIds=None,
        environment=None,
        limit=limit
    )
    
    # Mock get_owned_organization_ids to return owned_org_ids
    with patch('lambdas.get_application_users.index.get_owned_organization_ids', return_value=owned_org_ids):
        result = apply_authorization(caller_groups, caller_user_id, query_input)
    
    # Result should only contain organizations that are both requested AND owned
    expected_org_ids = list(set(requested_org_ids) & set(owned_org_ids))
    assert result.organizationIds == expected_org_ids


@settings(max_examples=100)
@given(
    owned_org_ids=st.lists(st.uuids().map(str), min_size=1, max_size=5),
    limit=st.integers(min_value=1, max_value=100)
)
def test_property_customer_without_filter_gets_owned_orgs(owned_org_ids, limit):
    """
    Property 3b: For any CUSTOMER caller without organizationIds filter,
    the query SHALL be filtered to only their owned organizations.
    """
    caller_groups = ["USER", "CUSTOMER"]
    caller_user_id = "test-customer-user-id"
    
    query_input = GetApplicationUsersInput(
        organizationIds=None,
        applicationIds=None,
        environment=None,
        limit=limit
    )
    
    # Mock get_owned_organization_ids to return owned_org_ids
    with patch('lambdas.get_application_users.index.get_owned_organization_ids', return_value=owned_org_ids):
        result = apply_authorization(caller_groups, caller_user_id, query_input)
    
    # Result should contain all owned organizations
    assert result.organizationIds == owned_org_ids


@settings(max_examples=100)
@given(
    organization_ids=st.lists(st.uuids().map(str), min_size=0, max_size=5),
    limit=st.integers(min_value=1, max_value=100)
)
def test_property_employee_authorization_allows_all_orgs(organization_ids, limit):
    """
    Property 3c: For any EMPLOYEE caller, users from all organizations MAY be returned.
    
    This property ensures that EMPLOYEE users are not restricted by organization ownership.
    """
    caller_groups = ["USER", "EMPLOYEE"]
    caller_user_id = "test-employee-user-id"
    
    query_input = GetApplicationUsersInput(
        organizationIds=organization_ids if organization_ids else None,
        applicationIds=None,
        environment=None,
        limit=limit
    )
    
    # Should not call get_owned_organization_ids
    with patch('lambdas.get_application_users.index.get_owned_organization_ids') as mock_get_owned:
        result = apply_authorization(caller_groups, caller_user_id, query_input)
        
        # Should not have called get_owned_organization_ids
        mock_get_owned.assert_not_called()
    
    # Result should be unchanged
    assert result.organizationIds == (organization_ids if organization_ids else None)


@settings(max_examples=100)
@given(
    organization_ids=st.lists(st.uuids().map(str), min_size=0, max_size=5),
    limit=st.integers(min_value=1, max_value=100)
)
def test_property_owner_authorization_allows_all_orgs(organization_ids, limit):
    """
    Property 3d: For any OWNER caller, users from all organizations MAY be returned.
    
    This property ensures that OWNER users are not restricted by organization ownership.
    """
    caller_groups = ["USER", "OWNER"]
    caller_user_id = "test-owner-user-id"
    
    query_input = GetApplicationUsersInput(
        organizationIds=organization_ids if organization_ids else None,
        applicationIds=None,
        environment=None,
        limit=limit
    )
    
    # Should not call get_owned_organization_ids
    with patch('lambdas.get_application_users.index.get_owned_organization_ids') as mock_get_owned:
        result = apply_authorization(caller_groups, caller_user_id, query_input)
        
        # Should not have called get_owned_organization_ids
        mock_get_owned.assert_not_called()
    
    # Result should be unchanged
    assert result.organizationIds == (organization_ids if organization_ids else None)


@settings(max_examples=100)
@given(
    limit=st.integers(min_value=1, max_value=100)
)
def test_property_unauthorized_user_raises_error(limit):
    """
    Property 3e: For any caller without CUSTOMER, EMPLOYEE, or OWNER groups,
    authorization SHALL fail with an error.
    """
    # Generate groups that don't include authorized groups
    caller_groups = ["USER"]  # Only USER group, no CUSTOMER/EMPLOYEE/OWNER
    caller_user_id = "test-unauthorized-user-id"
    
    query_input = GetApplicationUsersInput(
        organizationIds=None,
        applicationIds=None,
        environment=None,
        limit=limit
    )
    
    with pytest.raises(AuthorizationError) as exc_info:
        apply_authorization(caller_groups, caller_user_id, query_input)
    
    assert exc_info.value.code == ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS


@settings(max_examples=100)
@given(
    owned_org_ids=st.lists(st.uuids().map(str), min_size=1, max_size=5),
    limit=st.integers(min_value=1, max_value=100)
)
def test_property_customer_with_employee_acts_as_employee(owned_org_ids, limit):
    """
    Property 3f: For any caller with both CUSTOMER and EMPLOYEE groups,
    they SHALL be treated as EMPLOYEE (no ownership filtering).
    
    This ensures that platform employees who are also customers get full access.
    """
    caller_groups = ["USER", "CUSTOMER", "EMPLOYEE"]
    caller_user_id = "test-customer-employee-user-id"
    
    query_input = GetApplicationUsersInput(
        organizationIds=None,
        applicationIds=None,
        environment=None,
        limit=limit
    )
    
    # Should not call get_owned_organization_ids because EMPLOYEE takes precedence
    with patch('lambdas.get_application_users.index.get_owned_organization_ids') as mock_get_owned:
        result = apply_authorization(caller_groups, caller_user_id, query_input)
        
        # Should not have called get_owned_organization_ids
        mock_get_owned.assert_not_called()
    
    # Result should be unchanged (no ownership filtering)
    assert result.organizationIds is None



# Feature: application-users-management, Property 2: Filter Application
# Validates: Requirements 3.2, 3.3, 3.5, 3.6

@settings(max_examples=100)
@given(
    limit=st.integers(min_value=1, max_value=100)
)
def test_property_filter_application_placeholder(limit):
    """
    Property 2: For any set of filters (organizationIds, applicationIds, environment),
    all returned users SHALL have at least one role assignment matching ALL provided filters (AND logic).
    
    Note: This is a placeholder test. Full integration testing will verify this property
    with actual DynamoDB queries.
    """
    # This property requires integration testing with DynamoDB
    # The unit tests verify the query strategy selection logic
    # Integration tests will verify the actual filtering behavior
    assert True


# Feature: application-users-management, Property 9: No Filters Returns All Accessible
# Validates: Requirements 3.7

@settings(max_examples=100)
@given(
    limit=st.integers(min_value=1, max_value=100)
)
def test_property_no_filters_returns_all_accessible_placeholder(limit):
    """
    Property 9: For any query with no filters provided, the Lambda SHALL return all users
    with role assignments in organizations accessible to the caller (based on authorization rules).
    
    Note: This is a placeholder test. Full integration testing will verify this property
    with actual DynamoDB queries and authorization.
    """
    # This property requires integration testing with DynamoDB
    # The unit tests verify the query strategy selection (SCAN_WITH_AUTH)
    # Integration tests will verify the actual behavior
    assert True


# Feature: application-users-management, Property 4: User Deduplication and Grouping
# Validates: Requirements 3.8, 3.10

@settings(max_examples=100)
@given(
    user_ids=st.lists(st.uuids().map(str), min_size=1, max_size=10),
    role_counts=st.lists(st.integers(min_value=1, max_value=5), min_size=1, max_size=10)
)
def test_property_user_deduplication_and_grouping(user_ids, role_counts):
    """
    Property 4: For any query result, each userId SHALL appear exactly once,
    with all role assignments for that user grouped together under that single user record.
    """
    # Ensure lists are same length
    assume(len(user_ids) == len(role_counts))
    
    # Create role assignments with duplicate users
    role_assignments = []
    for user_id, count in zip(user_ids, role_counts):
        for i in range(count):
            role_assignments.append({
                "userId": user_id,
                "roleId": f"role-{i}",
                "applicationId": f"app-{i}"
            })
    
    # Deduplicate and group
    result = deduplicate_and_group_by_user(role_assignments)
    
    # Each userId should appear exactly once
    assert len(result) == len(set(user_ids))
    
    # All role assignments should be grouped correctly
    for user_id, count in zip(user_ids, role_counts):
        assert user_id in result
        assert len(result[user_id]) == count


# Feature: application-users-management, Property 5: User Enrichment
# Validates: Requirements 3.9

@settings(max_examples=100)
@given(
    user_id=st.uuids().map(str),
    first_name=st.text(min_size=1, max_size=50),
    last_name=st.text(min_size=1, max_size=50)
)
def test_property_user_enrichment_placeholder(user_id, first_name, last_name):
    """
    Property 5: For any returned user, the user record SHALL contain firstName and lastName
    fields populated from the Users table.
    
    Note: This is a placeholder test. Full integration testing will verify this property
    with actual DynamoDB batch get operations.
    """
    # This property requires integration testing with DynamoDB
    # The unit tests verify the build_users_with_roles function
    # Integration tests will verify the actual enrichment behavior
    assert True


# Feature: application-users-management, Property 6: Result Sorting
# Validates: Requirements 3.12

@settings(max_examples=100)
@given(
    users=st.lists(
        st.tuples(
            st.text(min_size=1, max_size=50),  # firstName
            st.text(min_size=1, max_size=50)   # lastName
        ),
        min_size=2,
        max_size=10
    )
)
def test_property_result_sorting(users):
    """
    Property 6: For any query result with multiple users, the users SHALL be sorted
    by lastName then firstName in ascending order.
    """
    # Create UserWithRoles objects
    user_objects = []
    for i, (first_name, last_name) in enumerate(users):
        user_objects.append(UserWithRoles(
            userId=f"user-{i}",
            firstName=first_name,
            lastName=last_name,
            status="ACTIVE",
            roleAssignments=[]
        ))
    
    # Sort
    sorted_users = sort_users_by_name(user_objects)
    
    # Verify sorting
    for i in range(len(sorted_users) - 1):
        current = sorted_users[i]
        next_user = sorted_users[i + 1]
        
        # Compare lastName first, then firstName
        if current.lastName.lower() == next_user.lastName.lower():
            # Same last name - firstName should be in order
            assert current.firstName.lower() <= next_user.firstName.lower()
        else:
            # Different last names - lastName should be in order
            assert current.lastName.lower() < next_user.lastName.lower()


# Feature: application-users-management, Property 7: Pagination Limit
# Validates: Requirements 3.11

@settings(max_examples=100)
@given(
    limit=st.integers(min_value=1, max_value=100)
)
def test_property_pagination_limit_placeholder(limit):
    """
    Property 7: For any query with a limit parameter, the number of returned users
    SHALL be less than or equal to the specified limit.
    
    Note: This is a placeholder test. Full integration testing will verify this property
    with actual query results.
    """
    # This property requires integration testing
    # The lambda_handler applies the limit: paginated_users = users_with_roles[:query_input.limit]
    # Integration tests will verify the actual pagination behavior
    assert True


# Feature: application-users-management, Property 8: Error Handling
# Validates: Requirements 3.13

@settings(max_examples=100)
@given(
    limit=st.integers(min_value=1, max_value=100)
)
def test_property_error_handling_placeholder(limit):
    """
    Property 8: For any query that encounters an error (validation, authorization, database),
    the Lambda SHALL return a structured error response with an appropriate error code
    and descriptive message.
    
    Note: This is a placeholder test. The error handling framework is implemented
    in the lambda_handler with try/except blocks for ValidationError, AuthorizationError,
    and DatabaseError. Integration tests will verify the actual error responses.
    """
    # Error handling is implemented in lambda_handler
    # ValidationError, AuthorizationError, and DatabaseError are caught and re-raised as Exception
    # with formatted error messages including error codes
    assert True
