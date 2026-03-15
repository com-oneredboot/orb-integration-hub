# User Management Views

## Overview

This document outlines all user management views in the orb-integration-hub platform. There are three distinct types of users that need to be managed through different interfaces.

## User Types Recap

| User Type | Cognito Group(s) | Description | Data Source |
|-----------|------------------|-------------|-------------|
| **Platform Owner** | OWNER (+ USER, CUSTOMER optional) | Platform administrator | Users table |
| **Platform Employee** | EMPLOYEE (+ USER, CUSTOMER optional) | Platform team member | Users table |
| **Customer** | USER + CUSTOMER | Paying subscriber who owns organizations | Users table |
| **Organization Employee** | USER only | Staff member of a customer's organization | OrganizationUsers table |
| **Application User** | USER only | End user of customer applications | ApplicationUserRoles table |

## User Management Views

### 1. Application Users

**Purpose:** Manage end users who have roles in customer applications

**Routes:**
- `/customers/users` - All application users across all accessible applications
- `/customers/applications/:appId/users` - Users with access to specific application (any environment)
- `/customers/applications/:appId/environments/:env/users` - Users with access to specific environment

**Data Source:** ApplicationUserRoles table (sole source of truth for application user membership)

**Query Strategy:** Lambda-backed query (`GetApplicationUsers`) with GSI-based strategy selection:

| Filters Provided | Strategy | GSI Used |
|-------------------|----------|----------|
| `applicationIds` (± environment) | AppEnvUserIndex | `AppEnvUserIndex` (partition: applicationId, sort: environment) |
| `organizationIds` only (± environment) | ORG_TO_APP_TO_ROLES | Resolves org → apps, then queries `AppEnvUserIndex` |
| No filters | SCAN_WITH_AUTH | Full scan with authorization-based filtering |

```graphql
GetApplicationUsers(
  organizationIds: [String!]    # Filter by organizations
  applicationIds: [String!]     # Filter by applications
  environment: Environment      # Filter by environment (requires org or app filter)
  limit: Int                    # Pagination limit (default: 50, max: 100)
  nextToken: String             # Pagination token
): GetApplicationUsersOutput!
```

**Access Control:** CUSTOMER, EMPLOYEE, OWNER
- CUSTOMER: sees only users in organizations they own
- EMPLOYEE/OWNER: sees users across all organizations

**Key Features:**
- Filter by organization, application, or environment
- Users deduplicated by userId with role assignments grouped per user
- Enriched with Users table data (firstName, lastName)
- Results sorted by lastName then firstName
- Expandable rows showing role details and permissions
- Pagination with limit/nextToken

**Implementation Status:** ✅ Implemented

---

### 2. Organization Employees

**Purpose:** Manage staff members who work for a customer's organization

**Routes:**
- `/customers/organizations/:orgId/users` - All employees of an organization

**Data Source:** OrganizationUsers table

**Query Strategy:** Use auto-generated GSI query
```graphql
OrganizationUsersQueryByOrganizationId(
  organizationId: String!
): OrganizationUsersResponse!
```

**Access Control:**
- CUSTOMER (only for organizations they own)
- EMPLOYEE, OWNER (all organizations)

**Key Features:**
- Display organizational role (OWNER, EMPLOYEE)
- Show invitation status (invited, active)
- Manage invitations and permissions
- Remove employees from organization

**Implementation Status:** 🟡 Schema exists, UI not implemented

---

### 3. Platform Team Users

**Purpose:** Manage platform administrators and employees (OWNER, EMPLOYEE groups)

**Routes:**
- `/admin/platform-users` - All platform team members

**Data Source:** Users table (filtered by Cognito groups)

**Query Strategy:** Custom query or filter Users table
```graphql
GetPlatformUsers(
  groups: [UserGroup!]    # Filter by OWNER, EMPLOYEE
): [Users!]!
```

**Access Control:** OWNER, EMPLOYEE only

**Key Features:**
- Display Cognito groups
- Manage group assignments
- Platform-level permissions
- Audit platform access

**Implementation Status:** 🔴 Not implemented - Future work

---

## Query Implementation Details

### Application Users Query

**Schema Type:** `lambda-dynamodb`

**Lambda Function:** `GetApplicationUsers`

**Input:**
```typescript
interface GetApplicationUsersInput {
  organizationIds?: string[];  // Optional: filter by organizations
  applicationIds?: string[];   // Optional: filter by applications
  environment?: Environment;   // Optional: requires org or app filter
  limit?: number;              // Pagination limit (default: 50, max: 100)
  nextToken?: string;          // Pagination token
}
```

**Output:**
```typescript
interface GetApplicationUsersOutput {
  users: UserWithRoles[];
  nextToken?: string;
}

interface UserWithRoles {
  userId: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  roleAssignments: RoleAssignment[];
}

interface RoleAssignment {
  applicationUserRoleId: string;
  applicationId: string;
  applicationName: string;
  organizationId: string;
  organizationName: string;
  environment: Environment;
  roleId: string;
  roleName: string;
  permissions: string[];
  status: ApplicationUserRoleStatus;
  createdAt: number;
  updatedAt: number;
}
```

**Query Logic:**
1. Validate input (environment filter requires organizationIds or applicationIds)
2. Apply authorization (CUSTOMER restricted to owned organizations)
3. Select query strategy based on filters:
   - `applicationIds` provided → query AppEnvUserIndex GSI per applicationId
   - `organizationIds` provided → resolve to applicationIds, then query AppEnvUserIndex
   - No filters → scan with authorization filtering
4. Apply environment filter if provided
5. Deduplicate users by userId
6. Batch get from Users table for enrichment (firstName, lastName)
7. Group role assignments by user
8. Sort by lastName then firstName
9. Apply pagination (limit/nextToken)

**Frontend Filtering:**
- Global route (`/customers/users`): No pre-applied filters
- Application route (`/customers/applications/:appId/users`): Pre-applies applicationId filter
- Environment route (`/customers/applications/:appId/environments/:env/users`): Pre-applies applicationId + environment filters

---

## Future Enhancements

### Organization Employees View
- Implement UI for managing organization staff
- Invitation workflow for adding employees
- Role management (OWNER vs EMPLOYEE)

### Platform Team View
- Admin interface for managing platform users
- Cognito group assignment UI
- Platform-level audit logs

### Cross-View Features
- Unified search across all user types
- Bulk operations (invite, remove, change roles)
- User activity tracking
- Access audit logs

---

## Related Documentation

- [User Identity Model](./schema.md#user-identity-model) - Core user concepts
- [API Documentation](./api.md#authentication) - Authentication and authorization
- [ApplicationUserRoles Schema](../schemas/tables/ApplicationUserRoles.yml) - Table definition
- [OrganizationUsers Schema](../schemas/tables/OrganizationUsers.yml) - Table definition
