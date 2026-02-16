# file: apps/api/lambdas/get_application_users/index.py
# author: orb-integration-hub
# created: 2026-02-09
# description: Lambda function to query application users with filtering and enrichment.
#              Returns users who have role assignments in applications, with support for
#              filtering by organization, application, and environment.

import os
import logging
from typing import Any, Dict, List, Optional
from dataclasses import dataclass
from enum import Enum

import boto3
from botocore.exceptions import ClientError


# Query strategy enum
class QueryStrategy(Enum):
    """Strategy for querying ApplicationUserRoles table."""
    APP_ENV_USER_INDEX = "APP_ENV_USER_INDEX"
    ORG_TO_APP_TO_ROLES = "ORG_TO_APP_TO_ROLES"
    SCAN_WITH_AUTH = "SCAN_WITH_AUTH"


# AWS clients - created lazily to support mocking in tests
_dynamodb = None


def get_dynamodb_resource():
    """Get DynamoDB resource, creating it lazily."""
    global _dynamodb
    if _dynamodb is None:
        _dynamodb = boto3.resource("dynamodb")
    return _dynamodb


# Environment variables
LOGGING_LEVEL = os.getenv("LOGGING_LEVEL", "INFO")

# Setting up logging
logger = logging.getLogger()
logger.setLevel(LOGGING_LEVEL)


def get_application_user_roles_table_name() -> Optional[str]:
    """Get the ApplicationUserRoles table name from environment variable."""
    return os.getenv("APPLICATION_USER_ROLES_TABLE_NAME")


def get_users_table_name() -> Optional[str]:
    """Get the Users table name from environment variable."""
    return os.getenv("USERS_TABLE_NAME")


def get_organizations_table_name() -> Optional[str]:
    """Get the Organizations table name from environment variable."""
    return os.getenv("ORGANIZATIONS_TABLE_NAME")


def get_applications_table_name() -> Optional[str]:
    """Get the Applications table name from environment variable."""
    return os.getenv("APPLICATIONS_TABLE_NAME")


# Input/Output Interfaces

@dataclass
class GetApplicationUsersInput:
    """Input parameters for GetApplicationUsers query."""
    organizationIds: Optional[List[str]] = None
    applicationIds: Optional[List[str]] = None
    environment: Optional[str] = None
    limit: int = 50
    nextToken: Optional[str] = None


@dataclass
class RoleAssignment:
    """Role assignment for a user in an application environment."""
    applicationUserRoleId: str
    applicationId: str
    applicationName: str
    organizationId: str
    organizationName: str
    environment: str
    roleId: str
    roleName: str
    status: str
    createdAt: int
    updatedAt: int


@dataclass
class UserWithRoles:
    """User with all their role assignments."""
    userId: str
    firstName: str
    lastName: str
    status: str
    roleAssignments: List[RoleAssignment]


@dataclass
class GetApplicationUsersOutput:
    """Output from GetApplicationUsers query."""
    users: List[UserWithRoles]
    nextToken: Optional[str] = None


# Error codes
class ErrorCode:
    """Error codes for GetApplicationUsers Lambda."""
    # Validation errors
    VAL_ENVIRONMENT_REQUIRES_FILTER = "ORB-VAL-001"
    VAL_INVALID_LIMIT = "ORB-VAL-002"
    VAL_INVALID_ENVIRONMENT = "ORB-VAL-003"
    
    # Authorization errors
    AUTH_NO_TOKEN = "ORB-AUTH-001"
    AUTH_INVALID_TOKEN = "ORB-AUTH-002"
    AUTH_INSUFFICIENT_PERMISSIONS = "ORB-AUTH-003"
    
    # Database errors
    DB_QUERY_FAILED = "ORB-DB-001"
    DB_BATCH_GET_FAILED = "ORB-DB-002"


class ValidationError(Exception):
    """Validation error with error code."""
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


class AuthorizationError(Exception):
    """Authorization error with error code."""
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


class DatabaseError(Exception):
    """Database error with error code."""
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


# Valid environment values
VALID_ENVIRONMENTS = {"PRODUCTION", "STAGING", "DEVELOPMENT", "TEST", "PREVIEW"}


def validate_input(query_input: GetApplicationUsersInput) -> None:
    """
    Validate input parameters.
    
    Rules:
    - environment filter requires organizationIds or applicationIds
    - limit must be between 1 and 100
    - environment value must be valid enum value
    
    Args:
        query_input: Input parameters to validate
        
    Raises:
        ValidationError: If validation fails
    """
    # Rule 1: Environment filter requires organizationIds or applicationIds
    if query_input.environment:
        if not query_input.organizationIds and not query_input.applicationIds:
            raise ValidationError(
                ErrorCode.VAL_ENVIRONMENT_REQUIRES_FILTER,
                "Environment filter requires organizationIds or applicationIds to be provided"
            )
    
    # Rule 2: Limit must be between 1 and 100
    if query_input.limit < 1 or query_input.limit > 100:
        raise ValidationError(
            ErrorCode.VAL_INVALID_LIMIT,
            "Limit must be between 1 and 100"
        )
    
    # Rule 3: Environment value must be valid
    if query_input.environment and query_input.environment not in VALID_ENVIRONMENTS:
        raise ValidationError(
            ErrorCode.VAL_INVALID_ENVIRONMENT,
            f"Invalid environment value. Must be one of: {', '.join(sorted(VALID_ENVIRONMENTS))}"
        )


def get_owned_organization_ids(user_id: str) -> List[str]:
    """
    Get organization IDs owned by the specified user.
    
    Queries the OrganizationUsers table to find organizations where the user
    has the OWNER role.
    
    Args:
        user_id: User ID to query
        
    Returns:
        List of organization IDs owned by the user
        
    Raises:
        DatabaseError: If query fails
    """
    organizations_table_name = get_organizations_table_name()
    if not organizations_table_name:
        logger.error("ORGANIZATIONS_TABLE_NAME environment variable not set")
        raise DatabaseError(
            ErrorCode.DB_QUERY_FAILED,
            "Organizations table not configured"
        )
    
    try:
        # Query OrganizationUsers table using UserOrgIndex GSI
        # Note: This assumes OrganizationUsers has a GSI on userId
        # We'll need to filter for OWNER role
        # role is a reserved keyword, so we use ExpressionAttributeNames
        org_users_table = get_dynamodb_resource().Table("orb-integration-hub-dev-organization-users")
        
        response = org_users_table.query(
            IndexName="UserOrgIndex",
            KeyConditionExpression="userId = :userId",
            FilterExpression="#role = :role",
            ExpressionAttributeValues={
                ":userId": user_id,
                ":role": "OWNER"
            },
            ExpressionAttributeNames={
                "#role": "role"
            }
        )
        
        organization_ids = [item["organizationId"] for item in response.get("Items", [])]
        logger.info(f"User {user_id} owns {len(organization_ids)} organizations")
        return organization_ids
        
    except ClientError as e:
        logger.error(f"Failed to query owned organizations: {e.response['Error']['Code']}")
        raise DatabaseError(
            ErrorCode.DB_QUERY_FAILED,
            "Failed to retrieve owned organizations"
        )


def apply_authorization(
    caller_groups: List[str],
    caller_user_id: str,
    query_input: GetApplicationUsersInput
) -> GetApplicationUsersInput:
    """
    Apply authorization rules based on caller's Cognito groups.
    
    Authorization Rules:
    - CUSTOMER (without EMPLOYEE or OWNER): Can only see users in organizations they own
    - EMPLOYEE or OWNER: Can see all users
    
    Args:
        caller_groups: Cognito groups for the caller
        caller_user_id: User ID of the caller
        query_input: Input parameters to filter
        
    Returns:
        Modified query input with authorization filters applied
        
    Raises:
        AuthorizationError: If caller lacks required permissions
    """
    # Check if caller has any authorized group
    authorized_groups = {"CUSTOMER", "EMPLOYEE", "OWNER"}
    if not any(group in authorized_groups for group in caller_groups):
        raise AuthorizationError(
            ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS,
            "Insufficient permissions to access this resource"
        )
    
    # EMPLOYEE and OWNER can see all organizations
    if "EMPLOYEE" in caller_groups or "OWNER" in caller_groups:
        logger.info("Caller has EMPLOYEE or OWNER group - no authorization filtering needed")
        return query_input
    
    # CUSTOMER can only see organizations they own
    if "CUSTOMER" in caller_groups:
        logger.info("Caller has CUSTOMER group - applying organization ownership filter")
        
        # Get organizations owned by this customer
        owned_org_ids = get_owned_organization_ids(caller_user_id)
        
        if not owned_org_ids:
            logger.warning(f"Customer {caller_user_id} owns no organizations")
            # Return empty filter that will yield no results
            query_input.organizationIds = []
            return query_input
        
        # If organizationIds filter provided, intersect with owned orgs
        if query_input.organizationIds:
            filtered_org_ids = list(set(query_input.organizationIds) & set(owned_org_ids))
            logger.info(f"Filtered organizationIds from {len(query_input.organizationIds)} "
                       f"to {len(filtered_org_ids)} based on ownership")
            query_input.organizationIds = filtered_org_ids
        else:
            # No filter provided - use all owned orgs
            query_input.organizationIds = owned_org_ids
            logger.info(f"Applied ownership filter - {len(owned_org_ids)} organizations")
    
    return query_input


def select_query_strategy(query_input: GetApplicationUsersInput) -> QueryStrategy:
    """
    Select the most efficient GSI based on provided filters.
    
    Priority:
    1. AppEnvUserIndex: When applicationIds provided (most selective)
    2. ORG_TO_APP_TO_ROLES: When only organizationIds provided (requires join with Applications)
    3. SCAN_WITH_AUTH: When no filters provided (least efficient, requires authorization filtering)
    
    Args:
        query_input: Input parameters with filters
        
    Returns:
        QueryStrategy enum indicating which strategy to use
    """
    if query_input.applicationIds:
        logger.info("Using APP_ENV_USER_INDEX strategy (applicationIds provided)")
        return QueryStrategy.APP_ENV_USER_INDEX
    elif query_input.organizationIds:
        logger.info("Using ORG_TO_APP_TO_ROLES strategy (organizationIds provided)")
        return QueryStrategy.ORG_TO_APP_TO_ROLES
    else:
        logger.info("Using SCAN_WITH_AUTH strategy (no filters provided)")
        return QueryStrategy.SCAN_WITH_AUTH


def get_application_ids_for_organizations(organization_ids: List[str]) -> List[str]:
    """
    Get application IDs for the specified organizations.
    
    Args:
        organization_ids: List of organization IDs
        
    Returns:
        List of application IDs belonging to those organizations
        
    Raises:
        DatabaseError: If query fails
    """
    applications_table_name = get_applications_table_name()
    if not applications_table_name:
        logger.error("APPLICATIONS_TABLE_NAME environment variable not set")
        raise DatabaseError(
            ErrorCode.DB_QUERY_FAILED,
            "Applications table not configured"
        )
    
    try:
        applications_table = get_dynamodb_resource().Table(applications_table_name)
        application_ids = []
        
        # Query Applications table for each organization
        for org_id in organization_ids:
            response = applications_table.query(
                IndexName="OrgAppIndex",
                KeyConditionExpression="organizationId = :orgId",
                ExpressionAttributeValues={":orgId": org_id},
                ProjectionExpression="applicationId"
            )
            
            for item in response.get("Items", []):
                application_ids.append(item["applicationId"])
        
        logger.info(f"Found {len(application_ids)} applications for {len(organization_ids)} organizations")
        return application_ids
        
    except ClientError as e:
        logger.error(f"Failed to query applications: {e.response['Error']['Code']}")
        raise DatabaseError(
            ErrorCode.DB_QUERY_FAILED,
            "Failed to retrieve applications for organizations"
        )


def query_application_user_roles(
    query_input: GetApplicationUsersInput,
    strategy: QueryStrategy
) -> List[Dict[str, Any]]:
    """
    Query ApplicationUserRoles table using the selected strategy.
    
    Args:
        query_input: Input parameters with filters
        strategy: Query strategy to use
        
    Returns:
        List of role assignment items from DynamoDB
        
    Raises:
        DatabaseError: If query fails
    """
    table_name = get_application_user_roles_table_name()
    if not table_name:
        logger.error("APPLICATION_USER_ROLES_TABLE_NAME environment variable not set")
        raise DatabaseError(
            ErrorCode.DB_QUERY_FAILED,
            "ApplicationUserRoles table not configured"
        )
    
    try:
        table = get_dynamodb_resource().Table(table_name)
        all_items = []
        
        if strategy == QueryStrategy.APP_ENV_USER_INDEX:
            # Query using AppEnvUserIndex GSI for each applicationId
            for app_id in query_input.applicationIds:
                # Build key condition
                key_condition = "applicationId = :appId"
                expr_attr_values = {":appId": app_id}
                
                # Add environment to sort key if provided
                if query_input.environment:
                    key_condition += " AND environment = :env"
                    expr_attr_values[":env"] = query_input.environment
                
                # Add status filter (status is a reserved keyword)
                expr_attr_values[":status"] = "ACTIVE"
                expr_attr_names = {"#status": "status"}
                
                # Query the GSI
                response = table.query(
                    IndexName="AppEnvUserIndex",
                    KeyConditionExpression=key_condition,
                    ExpressionAttributeValues=expr_attr_values,
                    ExpressionAttributeNames=expr_attr_names,
                    FilterExpression="#status = :status"
                )
                
                all_items.extend(response.get("Items", []))
                
                # Handle pagination if needed
                while "LastEvaluatedKey" in response:
                    response = table.query(
                        IndexName="AppEnvUserIndex",
                        KeyConditionExpression=key_condition,
                        ExpressionAttributeValues=expr_attr_values,
                        ExpressionAttributeNames=expr_attr_names,
                        FilterExpression="#status = :status",
                        ExclusiveStartKey=response["LastEvaluatedKey"]
                    )
                    all_items.extend(response.get("Items", []))
        
        elif strategy == QueryStrategy.ORG_TO_APP_TO_ROLES:
            # First get applicationIds for the organizations
            application_ids = get_application_ids_for_organizations(query_input.organizationIds)
            
            if not application_ids:
                logger.info("No applications found for specified organizations")
                return []
            
            # Now query using AppEnvUserIndex for each application
            for app_id in application_ids:
                key_condition = "applicationId = :appId"
                expr_attr_values = {":appId": app_id}
                
                if query_input.environment:
                    key_condition += " AND environment = :env"
                    expr_attr_values[":env"] = query_input.environment
                
                # Add status filter (status is a reserved keyword)
                expr_attr_values[":status"] = "ACTIVE"
                expr_attr_names = {"#status": "status"}
                
                response = table.query(
                    IndexName="AppEnvUserIndex",
                    KeyConditionExpression=key_condition,
                    ExpressionAttributeValues=expr_attr_values,
                    ExpressionAttributeNames=expr_attr_names,
                    FilterExpression="#status = :status"
                )
                
                all_items.extend(response.get("Items", []))
                
                # Handle pagination
                while "LastEvaluatedKey" in response:
                    response = table.query(
                        IndexName="AppEnvUserIndex",
                        KeyConditionExpression=key_condition,
                        ExpressionAttributeValues=expr_attr_values,
                        ExpressionAttributeNames=expr_attr_names,
                        FilterExpression="#status = :status",
                        ExclusiveStartKey=response["LastEvaluatedKey"]
                    )
                    all_items.extend(response.get("Items", []))
        
        elif strategy == QueryStrategy.SCAN_WITH_AUTH:
            # Scan the table with status filter
            # Note: This is the least efficient strategy
            # status is a reserved keyword, so we use ExpressionAttributeNames
            scan_kwargs = {
                "FilterExpression": "#status = :status",
                "ExpressionAttributeValues": {":status": "ACTIVE"},
                "ExpressionAttributeNames": {"#status": "status"}
            }
            
            if query_input.environment:
                scan_kwargs["FilterExpression"] += " AND environment = :env"
                scan_kwargs["ExpressionAttributeValues"][":env"] = query_input.environment
            
            response = table.scan(**scan_kwargs)
            all_items.extend(response.get("Items", []))
            
            # Handle pagination
            while "LastEvaluatedKey" in response:
                scan_kwargs["ExclusiveStartKey"] = response["LastEvaluatedKey"]
                response = table.scan(**scan_kwargs)
                all_items.extend(response.get("Items", []))
        
        logger.info(f"Retrieved {len(all_items)} role assignments from ApplicationUserRoles")
        return all_items
        
    except ClientError as e:
        logger.error(f"Failed to query ApplicationUserRoles: {e.response['Error']['Code']}")
        raise DatabaseError(
            ErrorCode.DB_QUERY_FAILED,
            "Database query failed. Please try again."
        )


def deduplicate_and_group_by_user(role_assignments: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """
    Deduplicate role assignments by userId and group them.
    
    Args:
        role_assignments: List of role assignment items from DynamoDB
        
    Returns:
        Dictionary mapping userId to list of role assignments for that user
    """
    user_roles_map: Dict[str, List[Dict[str, Any]]] = {}
    
    for assignment in role_assignments:
        user_id = assignment.get("userId")
        if not user_id:
            logger.warning("Role assignment missing userId, skipping")
            continue
        
        if user_id not in user_roles_map:
            user_roles_map[user_id] = []
        
        user_roles_map[user_id].append(assignment)
    
    logger.info(f"Grouped {len(role_assignments)} role assignments into {len(user_roles_map)} unique users")
    return user_roles_map


def enrich_users_from_users_table(user_ids: List[str]) -> Dict[str, Dict[str, Any]]:
    """
    Batch get user details from Users table.
    
    Args:
        user_ids: List of user IDs to retrieve
        
    Returns:
        Dictionary mapping userId to user details
        
    Raises:
        DatabaseError: If batch get fails
    """
    users_table_name = get_users_table_name()
    if not users_table_name:
        logger.error("USERS_TABLE_NAME environment variable not set")
        raise DatabaseError(
            ErrorCode.DB_BATCH_GET_FAILED,
            "Users table not configured"
        )
    
    try:
        dynamodb = get_dynamodb_resource()
        users_map: Dict[str, Dict[str, Any]] = {}
        
        # Batch get in chunks of 100 (DynamoDB limit)
        chunk_size = 100
        for i in range(0, len(user_ids), chunk_size):
            chunk = user_ids[i:i + chunk_size]
            
            # Build batch get request
            keys = [{"userId": user_id} for user_id in chunk]
            
            response = dynamodb.batch_get_item(
                RequestItems={
                    users_table_name: {
                        "Keys": keys,
                        "ProjectionExpression": "userId, firstName, lastName, #status",
                        "ExpressionAttributeNames": {"#status": "status"}
                    }
                }
            )
            
            # Process response
            for item in response.get("Responses", {}).get(users_table_name, []):
                users_map[item["userId"]] = item
            
            # Handle unprocessed keys
            unprocessed = response.get("UnprocessedKeys", {})
            while unprocessed:
                response = dynamodb.batch_get_item(RequestItems=unprocessed)
                for item in response.get("Responses", {}).get(users_table_name, []):
                    users_map[item["userId"]] = item
                unprocessed = response.get("UnprocessedKeys", {})
        
        logger.info(f"Retrieved {len(users_map)} user details from Users table")
        
        # Log missing users
        missing_users = set(user_ids) - set(users_map.keys())
        if missing_users:
            logger.warning(f"{len(missing_users)} users not found in Users table: {list(missing_users)[:5]}")
        
        return users_map
        
    except ClientError as e:
        logger.error(f"Failed to batch get users: {e.response['Error']['Code']}")
        raise DatabaseError(
            ErrorCode.DB_BATCH_GET_FAILED,
            "Failed to retrieve user details. Please try again."
        )


def build_users_with_roles(
    user_roles_map: Dict[str, List[Dict[str, Any]]],
    users_map: Dict[str, Dict[str, Any]]
) -> List[UserWithRoles]:
    """
    Build UserWithRoles objects from role assignments and user details.
    
    Args:
        user_roles_map: Dictionary mapping userId to role assignments
        users_map: Dictionary mapping userId to user details
        
    Returns:
        List of UserWithRoles objects
    """
    users_with_roles = []
    
    for user_id, role_assignments in user_roles_map.items():
        # Get user details (handle missing users gracefully)
        user_details = users_map.get(user_id)
        if not user_details:
            logger.warning(f"User {user_id} not found in Users table, using placeholder")
            user_details = {
                "userId": user_id,
                "firstName": "Unknown",
                "lastName": "User",
                "status": "UNKNOWN"
            }
        
        # Build role assignment objects
        role_assignment_objects = []
        for assignment in role_assignments:
            role_assignment_objects.append(RoleAssignment(
                applicationUserRoleId=assignment.get("applicationUserRoleId", ""),
                applicationId=assignment.get("applicationId", ""),
                applicationName=assignment.get("applicationName", ""),
                organizationId=assignment.get("organizationId", ""),
                organizationName=assignment.get("organizationName", ""),
                environment=assignment.get("environment", ""),
                roleId=assignment.get("roleId", ""),
                roleName=assignment.get("roleName", ""),
                status=assignment.get("status", ""),
                createdAt=int(assignment.get("createdAt", 0)),
                updatedAt=int(assignment.get("updatedAt", 0))
            ))
        
        # Create UserWithRoles object
        user_with_roles = UserWithRoles(
            userId=user_id,
            firstName=user_details.get("firstName", "Unknown"),
            lastName=user_details.get("lastName", "User"),
            status=user_details.get("status", "UNKNOWN"),
            roleAssignments=role_assignment_objects
        )
        
        users_with_roles.append(user_with_roles)
    
    return users_with_roles


def sort_users_by_name(users: List[UserWithRoles]) -> List[UserWithRoles]:
    """
    Sort users by lastName then firstName in ascending order.
    
    Args:
        users: List of UserWithRoles objects
        
    Returns:
        Sorted list of UserWithRoles objects
    """
    return sorted(users, key=lambda u: (u.lastName.lower(), u.firstName.lower()))


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Query application users with filtering and enrichment.
    
    This Lambda function:
    1. Validates input parameters
    2. Applies authorization rules based on caller's Cognito groups
    3. Queries ApplicationUserRoles with appropriate filters
    4. Deduplicates users by userId
    5. Enriches user data from Users table
    6. Groups role assignments by user
    7. Sorts results by user name
    8. Returns paginated results
    
    Args:
        event: AppSync event containing input with filters
        context: Lambda context
        
    Returns:
        Response with users array and optional nextToken
        
    Raises:
        ValidationError: If input validation fails
        AuthorizationError: If caller lacks permissions
        DatabaseError: If database operations fail
    """
    try:
        logger.info("GetApplicationUsers request received")
        
        # Extract input from event
        input_data = event.get("arguments", {}).get("input", {})
        query_input = GetApplicationUsersInput(
            organizationIds=input_data.get("organizationIds"),
            applicationIds=input_data.get("applicationIds"),
            environment=input_data.get("environment"),
            limit=input_data.get("limit", 50),
            nextToken=input_data.get("nextToken")
        )
        
        # Extract caller identity from request context
        request_context = event.get("identity", {})
        caller_user_id = request_context.get("sub")
        caller_groups = request_context.get("groups", [])
        
        logger.info(f"Query filters - orgs: {query_input.organizationIds}, "
                   f"apps: {query_input.applicationIds}, env: {query_input.environment}")
        
        # Validate input parameters
        validate_input(query_input)
        
        # Apply authorization rules
        query_input = apply_authorization(caller_groups, caller_user_id, query_input)
        
        # Select query strategy based on filters
        strategy = select_query_strategy(query_input)
        
        # Query ApplicationUserRoles table
        role_assignments = query_application_user_roles(query_input, strategy)
        
        # Deduplicate and group by user
        user_roles_map = deduplicate_and_group_by_user(role_assignments)
        
        # Enrich with user details from Users table
        user_ids = list(user_roles_map.keys())
        users_map = enrich_users_from_users_table(user_ids)
        
        # Build UserWithRoles objects
        users_with_roles = build_users_with_roles(user_roles_map, users_map)
        
        # Sort by user name
        users_with_roles = sort_users_by_name(users_with_roles)
        
        # Apply pagination limit
        paginated_users = users_with_roles[:query_input.limit]
        
        # Determine if there are more results
        next_token = None
        if len(users_with_roles) > query_input.limit:
            # For simplicity, we'll use the count as the token
            # In production, this should be a proper pagination token
            next_token = str(query_input.limit)
        
        logger.info(f"Returning {len(paginated_users)} users")
        
        # Convert to dict format for response
        return {
            "users": [
                {
                    "userId": user.userId,
                    "firstName": user.firstName,
                    "lastName": user.lastName,
                    "status": user.status,
                    "roleAssignments": [
                        {
                            "applicationUserRoleId": ra.applicationUserRoleId,
                            "applicationId": ra.applicationId,
                            "applicationName": ra.applicationName,
                            "organizationId": ra.organizationId,
                            "organizationName": ra.organizationName,
                            "environment": ra.environment,
                            "roleId": ra.roleId,
                            "roleName": ra.roleName,
                            "status": ra.status,
                            "createdAt": ra.createdAt,
                            "updatedAt": ra.updatedAt
                        }
                        for ra in user.roleAssignments
                    ]
                }
                for user in paginated_users
            ],
            "nextToken": next_token
        }
        
    except ValidationError as e:
        logger.warning(f"Validation error: {e.code} - {e.message}")
        raise Exception(f"{e.code}: {e.message}")
        
    except AuthorizationError as e:
        logger.warning(f"Authorization error: {e.code} - {e.message}")
        raise Exception(f"{e.code}: {e.message}")
        
    except DatabaseError as e:
        logger.error(f"Database error: {e.code} - {e.message}")
        raise Exception(f"{e.code}: {e.message}")
        
    except Exception as e:
        logger.error(f"Unexpected error: {type(e).__name__} - {str(e)}")
        raise Exception("Service temporarily unavailable")
