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

**Data Source:** ApplicationUserRoles table

**Query Strategy:** Single Lambda-backed query with filters
```graphql
GetApplicationUsers(
  organizationIds: [String!]    # Filter by organizations
  applicationIds: [String!]     # Filter by applications  
  environment: Environment      # Filter by environment
): [UserWithRoles!]!
```

**Access Control:** CUSTOMER, EMPLOYEE, OWNER

**Key Features:**
- Filter by organization, application, or environment
- Display roles per environment (most users only have PRODUCTION)
- Show permissions for each role
- Bulk operations (invite, remove, change roles)

**Implementation Status:** 🔴 Not implemented - Priority for current work

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

### Application Users Query (Priority)

**Schema Type:** `lambda-dynamodb`

**Lambda Function:** `GetApplicationUsers`

**Input:**
```typescript
interface GetApplicationUsersInput {
  organizationIds?: string[];  // Optional: filter by organizations
  applicationIds?: string[];   // Optional: filter by applications
  environment?: Environment;   // Optional: filter by environment
  limit?: number;
  nextToken?: string;
}
```

**Output:**
```typescript
interface UserWithRoles {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: ApplicationUserRole[];  // Array of role assignments
}

interface ApplicationUserRole {
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
1. Determine scope based on input filters
2. Query ApplicationUserRoles using appropriate GSI:
   - If applicationIds provided: Use AppEnvUserIndex GSI
   - If environment provided: Filter results by environment
   - If organizationIds provided: Join with Applications table to filter
3. Deduplicate users (group by userId)
4. Join with Users table to get user details
5. Return enriched user data with all their role assignments

**Frontend Filtering:**
- Global route (`/customers/users`): Pass all accessible organizationIds
- Application route (`/customers/applications/:appId/users`): Pass single applicationId
- Environment route (`/customers/applications/:appId/environments/:env/users`): Pass applicationId + environment

---

## Data Model Changes

### Removed: ApplicationUsers Table

**Reason:** Redundant with ApplicationUserRoles table

**Rationale:**
- Users MUST have at least one role in at least one environment to be considered application members
- ApplicationUserRoles already captures:
  - User-Application relationship (userId + applicationId)
  - Status tracking (ACTIVE, DELETED)
  - Timestamps (createdAt, updatedAt)
- No application-level metadata needed that isn't environment-specific
- Simpler data model with one source of truth

**Migration:** ApplicationUsers table can be deprecated - all functionality is in ApplicationUserRoles

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
