# Requirements Document

## Introduction

This document defines the requirements for implementing the Application Users Management feature in the orb-integration-hub platform. The feature enables customers, employees, and platform owners to view and manage end users who have roles in customer applications. This involves removing the redundant ApplicationUsers table, updating the ApplicationUserRoles schema to support Lambda-backed queries, and implementing a custom query function that efficiently retrieves application users with their environment-specific roles.

## Glossary

- **Application_User**: An end user who has at least one role assignment in at least one application environment (stored in Users table, identified via ApplicationUserRoles)
- **ApplicationUserRoles_Table**: DynamoDB table storing role assignments for users in specific application environments
- **ApplicationUsers_Table**: Legacy DynamoDB table (to be removed) that redundantly tracked application membership
- **GetApplicationUsers_Lambda**: Custom Lambda function that queries ApplicationUserRoles with filters and returns enriched user data
- **Environment**: Deployment environment for an application (PRODUCTION, STAGING, DEVELOPMENT, TEST, PREVIEW)
- **Role_Assignment**: A record in ApplicationUserRoles linking a user to a role in a specific application environment
- **Frontend_Users_List**: Angular component displaying application users with their roles and permissions
- **Query_Filter**: Input parameters to narrow query results (organizationIds, applicationIds, environment)
- **User_Enrichment**: Process of joining ApplicationUserRoles data with Users table to get complete user details

## Requirements

### Requirement 1: Remove Redundant ApplicationUsers Table

**User Story:** As a platform architect, I want to remove the ApplicationUsers table, so that we have a single source of truth for application user membership through ApplicationUserRoles.

#### Acceptance Criteria

1. THE System SHALL remove the ApplicationUsers table schema from schemas/tables/ApplicationUsers.yml
2. THE System SHALL remove all generated code for ApplicationUsers from the codebase
3. THE System SHALL remove ApplicationUsers GraphQL operations from the schema
4. THE System SHALL update documentation to reflect that ApplicationUserRoles is the sole source for application user membership
5. WHEN querying application users, THE System SHALL use ApplicationUserRoles table exclusively

### Requirement 2: Update ApplicationUserRoles Schema

**User Story:** As a developer, I want ApplicationUserRoles to support Lambda-backed queries, so that I can implement custom query logic with filters.

#### Acceptance Criteria

1. THE ApplicationUserRoles_Schema SHALL specify type as lambda-dynamodb
2. THE ApplicationUserRoles_Schema SHALL maintain all existing GSI indexes (UserEnvRoleIndex, AppEnvUserIndex, UserAppIndex, UserStatusIndex)
3. THE ApplicationUserRoles_Schema SHALL include organizationId attribute for filtering
4. THE ApplicationUserRoles_Schema SHALL denormalize organizationName for display without additional lookups
5. THE ApplicationUserRoles_Schema SHALL denormalize applicationName for display without additional lookups

### Requirement 3: Implement GetApplicationUsers Lambda Function

**User Story:** As a customer, I want to query application users with filters, so that I can view users for specific organizations, applications, or environments.

#### Acceptance Criteria

1. WHEN GetApplicationUsers_Lambda receives a request, THE System SHALL validate input parameters
2. WHEN organizationIds filter is provided, THE System SHALL return only users with roles in those organizations
3. WHEN applicationIds filter is provided, THE System SHALL return only users with roles in those applications
4. WHEN environment filter is provided without organizationIds or applicationIds, THE System SHALL return a validation error
5. WHEN environment filter is provided with organizationIds or applicationIds, THE System SHALL return only users with roles in that environment
6. WHEN multiple filters are provided, THE System SHALL apply all filters (AND logic)
7. WHEN no filters are provided, THE System SHALL return all accessible application users based on caller permissions
8. THE GetApplicationUsers_Lambda SHALL deduplicate users by userId
9. THE GetApplicationUsers_Lambda SHALL join with Users table to enrich user details (email, firstName, lastName)
10. THE GetApplicationUsers_Lambda SHALL group role assignments by user
11. THE GetApplicationUsers_Lambda SHALL support pagination with limit and nextToken parameters
12. THE GetApplicationUsers_Lambda SHALL return results sorted by user email
13. WHEN a query error occurs, THE System SHALL return a descriptive error message with appropriate error code

### Requirement 4: Implement Frontend Users List Component

**User Story:** As a customer, I want to view application users in a list, so that I can see who has access to my applications and their roles.

#### Acceptance Criteria

1. THE Frontend_Users_List SHALL display users in a table with columns: userId, name, roles count, environments
2. THE Frontend_Users_List SHALL NOT display email addresses or other PII in the list view
3. WHEN displaying a user, THE Frontend_Users_List SHALL show all their role assignments grouped by environment
4. THE Frontend_Users_List SHALL support filtering by organization via dropdown
5. THE Frontend_Users_List SHALL support filtering by application via dropdown
6. THE Frontend_Users_List SHALL support filtering by environment via dropdown
7. WHEN filters are changed, THE Frontend_Users_List SHALL refresh the query with new parameters
8. THE Frontend_Users_List SHALL display loading state while fetching data
9. WHEN no users match filters, THE Frontend_Users_List SHALL display an empty state message
10. THE Frontend_Users_List SHALL support pagination with next/previous controls
11. WHEN a user row is clicked, THE Frontend_Users_List SHALL expand to show detailed role information
12. THE Frontend_Users_List SHALL display role permissions for each role assignment
13. THE Frontend_Users_List SHALL be accessible via route /customers/users

### Requirement 5: Support Multiple Route Contexts

**User Story:** As a customer, I want to view application users from different contexts, so that I can see users scoped to specific applications or environments.

#### Acceptance Criteria

1. WHEN accessing /customers/users, THE System SHALL display all application users across all accessible applications
2. WHEN accessing /customers/applications/:appId/users, THE System SHALL display users with access to that specific application (any environment)
3. WHEN accessing /customers/applications/:appId/environments/:env/users, THE System SHALL display users with access to that specific environment
4. THE System SHALL automatically apply appropriate filters based on the route context
5. THE System SHALL preserve filter state when navigating between routes

### Requirement 6: Implement Authorization Controls

**User Story:** As a platform owner, I want to ensure users can only view application users they have permission to see, so that data access is properly controlled.

#### Acceptance Criteria

1. THE GetApplicationUsers_Lambda SHALL require authentication via Cognito User Pool
2. THE GetApplicationUsers_Lambda SHALL authorize CUSTOMER, EMPLOYEE, and OWNER groups
3. WHEN a CUSTOMER queries, THE System SHALL return only users from organizations they own
4. WHEN an EMPLOYEE or OWNER queries, THE System SHALL return users from all organizations
5. WHEN an unauthorized user attempts to query, THE System SHALL return an authorization error

### Requirement 7: Standard Requirements - Documentation Updates

**User Story:** As a developer, I want comprehensive documentation, so that I can understand and maintain the application users management feature.

#### Acceptance Criteria

1. THE System SHALL update docs/user-management-views.md to reflect ApplicationUsers table removal
2. THE System SHALL update docs/schema.md to document ApplicationUserRoles schema changes
3. THE System SHALL update docs/api.md to document GetApplicationUsers query
4. THE System SHALL add inline code comments explaining Lambda query logic
5. THE System SHALL ensure no duplication across documentation files
6. THE System SHALL use consistent terminology throughout all documentation

### Requirement 8: Standard Requirements - Version and Changelog Management

**User Story:** As a developer, I want version tracking, so that I can understand what changed in each release.

#### Acceptance Criteria

1. THE System SHALL bump version following semantic versioning (minor version for new feature)
2. THE System SHALL update CHANGELOG.md with feature description
3. THE System SHALL include issue numbers in changelog entries
4. THE System SHALL follow format: "- Feature description (#issue)"

### Requirement 9: Standard Requirements - Git Commit Standards

**User Story:** As a developer, I want traceable commits, so that I can link code changes to requirements.

#### Acceptance Criteria

1. THE System SHALL reference issue numbers in all commit messages
2. THE System SHALL follow conventional commits format: "feat: description #issue"
3. THE System SHALL reference all issues if multiple are addressed
4. THE System SHALL use descriptive commit messages explaining the change

### Requirement 10: Standard Requirements - Final Verification

**User Story:** As a developer, I want quality assurance, so that the feature is production-ready.

#### Acceptance Criteria

1. THE System SHALL pass all unit tests
2. THE System SHALL pass all property-based tests
3. THE System SHALL have no linting errors
4. THE System SHALL have no compilation errors
5. THE System SHALL have documentation that renders correctly
6. THE System SHALL have CHANGELOG.md updated
7. THE System SHALL have version bumped appropriately
8. THE System SHALL have commits that reference issues
