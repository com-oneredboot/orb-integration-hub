# file: apps/api/lambdas/get_application_users/test_get_application_users.py
# author: orb-integration-hub
# created: 2026-02-09
# description: Unit tests for GetApplicationUsers Lambda function

from lambdas.get_application_users.index import (
    deduplicate_and_group_by_user,
    sort_users_by_name,
    UserWithRoles,
    select_query_strategy,
    QueryStrategy,
    GetApplicationUsersInput
)


def test_deduplicate_and_group_by_user_empty_list():
    """Test deduplication with empty list returns empty dict."""
    result = deduplicate_and_group_by_user([])
    assert result == {}


def test_deduplicate_and_group_by_user_single_user():
    """Test deduplication with single user."""
    role_assignments = [
        {"userId": "user1", "roleId": "role1"},
        {"userId": "user1", "roleId": "role2"}
    ]
    
    result = deduplicate_and_group_by_user(role_assignments)
    
    assert len(result) == 1
    assert "user1" in result
    assert len(result["user1"]) == 2


def test_deduplicate_and_group_by_user_multiple_users():
    """Test deduplication with multiple users."""
    role_assignments = [
        {"userId": "user1", "roleId": "role1"},
        {"userId": "user2", "roleId": "role2"},
        {"userId": "user1", "roleId": "role3"}
    ]
    
    result = deduplicate_and_group_by_user(role_assignments)
    
    assert len(result) == 2
    assert "user1" in result
    assert "user2" in result
    assert len(result["user1"]) == 2
    assert len(result["user2"]) == 1


def test_sort_users_by_name():
    """Test sorting users by lastName then firstName."""
    users = [
        UserWithRoles(
            userId="user1",
            firstName="Charlie",
            lastName="Brown",
            status="ACTIVE",
            roleAssignments=[]
        ),
        UserWithRoles(
            userId="user2",
            firstName="Alice",
            lastName="Anderson",
            status="ACTIVE",
            roleAssignments=[]
        ),
        UserWithRoles(
            userId="user3",
            firstName="Bob",
            lastName="Brown",
            status="ACTIVE",
            roleAssignments=[]
        )
    ]
    
    sorted_users = sort_users_by_name(users)
    
    assert sorted_users[0].userId == "user2"  # Anderson, Alice
    assert sorted_users[1].userId == "user3"  # Brown, Bob
    assert sorted_users[2].userId == "user1"  # Brown, Charlie


def test_select_query_strategy_with_application_ids():
    """Test strategy selection when applicationIds provided."""
    query_input = GetApplicationUsersInput(
        applicationIds=["app1", "app2"],
        organizationIds=None,
        environment=None
    )
    
    strategy = select_query_strategy(query_input)
    
    assert strategy == QueryStrategy.APP_ENV_USER_INDEX


def test_select_query_strategy_with_organization_ids():
    """Test strategy selection when only organizationIds provided."""
    query_input = GetApplicationUsersInput(
        applicationIds=None,
        organizationIds=["org1", "org2"],
        environment=None
    )
    
    strategy = select_query_strategy(query_input)
    
    assert strategy == QueryStrategy.ORG_TO_APP_TO_ROLES


def test_select_query_strategy_with_no_filters():
    """Test strategy selection when no filters provided."""
    query_input = GetApplicationUsersInput(
        applicationIds=None,
        organizationIds=None,
        environment=None
    )
    
    strategy = select_query_strategy(query_input)
    
    assert strategy == QueryStrategy.SCAN_WITH_AUTH


def test_select_query_strategy_prefers_application_ids():
    """Test that applicationIds takes precedence over organizationIds."""
    query_input = GetApplicationUsersInput(
        applicationIds=["app1"],
        organizationIds=["org1"],
        environment=None
    )
    
    strategy = select_query_strategy(query_input)
    
    assert strategy == QueryStrategy.APP_ENV_USER_INDEX
