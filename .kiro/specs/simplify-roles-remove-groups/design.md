# Design Document: Simplify Roles and Remove Groups

## Overview

This feature simplifies the application roles data model by:
1. Removing the unused groups functionality (3 tables + 3 status enums)
2. Removing permissions arrays from ApplicationRoles and ApplicationUserRoles tables
3. Updating the GetApplicationUsers Lambda and frontend to not reference permissions
4. Regenerating all code to reflect the simplified schema

The goal is a cleaner data model where:
- **Platform Roles** (OWNER, EMPLOYEE, CUSTOMER, USER) remain in Cognito groups and Users table
- **Application Roles** become simple labels that customers define for their apps
- Role labels are returned in JWTs when users log into customer applications
- Customer applications interpret what each role label means - orb-integration-hub doesn't enforce permissions

## Architecture

### Current State (Before)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Roles Model                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ApplicationRoles (Role Definitions + Assignments - CONFUSED)    │
│  ├── applicationRoleId (PK)                                      │
│  ├── userId ← WRONG: This table shouldn't assign to users        │
│  ├── applicationId                                               │
│  ├── roleId, roleName, roleType                                  │
│  ├── permissions[] ← UNUSED: We don't enforce permissions        │
│  └── status, createdAt, updatedAt                                │
│                                                                  │
│  ApplicationUserRoles (Role Assignments per Environment)         │
│  ├── applicationUserRoleId (PK)                                  │
│  ├── userId, applicationId, environment                          │
│  ├── roleId, roleName                                            │
│  ├── permissions[] ← UNUSED: We don't enforce permissions        │
│  └── organizationId, organizationName, applicationName           │
│                                                                  │
│  ApplicationGroups ← UNUSED TABLE                                │
│  ApplicationGroupUsers ← UNUSED TABLE                            │
│  ApplicationGroupRoles ← UNUSED TABLE                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Target State (After)

```
┌─────────────────────────────────────────────────────────────────┐
│                 Simplified Application Roles Model               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ApplicationRoles (Role DEFINITIONS per application)             │
│  ├── applicationRoleId (PK)                                      │
│  ├── applicationId                                               │
│  ├── roleId                                                      │
│  ├── roleName (the label: "Admin", "Editor", etc.)               │
│  ├── roleType                                                    │
│  ├── description (optional - for documentation)                  │
│  └── status, createdAt, updatedAt                                │
│                                                                  │
│  ApplicationUserRoles (Role ASSIGNMENTS to users per env)        │
│  ├── applicationUserRoleId (PK)                                  │
│  ├── userId, applicationId, environment                          │
│  ├── roleId → points to ApplicationRoles                         │
│  ├── roleName (denormalized for JWT)                             │
│  ├── organizationId, organizationName, applicationName           │
│  └── status, createdAt, updatedAt                                │
│                                                                  │
│  NO GROUP TABLES                                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Files to Delete

| File | Type | Reason |
|------|------|--------|
| `schemas/tables/ApplicationGroups.yml` | Table Schema | Unused groups functionality |
| `schemas/tables/ApplicationGroupUsers.yml` | Table Schema | Unused groups functionality |
| `schemas/tables/ApplicationGroupRoles.yml` | Table Schema | Unused groups functionality |
| `schemas/registries/ApplicationGroupStatus.yml` | Enum | Status for deleted table |
| `schemas/registries/ApplicationGroupUserStatus.yml` | Enum | Status for deleted table |
| `schemas/registries/ApplicationGroupRoleStatus.yml` | Enum | Status for deleted table |

### Schema Changes

#### ApplicationRoles.yml (Simplified)

```yaml
# BEFORE: Had userId, permissions[], UserRoleIndex GSI
# AFTER: Role definitions only

type: dynamodb
name: ApplicationRoles
model:
  keys:
    primary:
      partition: applicationRoleId
    secondary:
      - name: ApplicationRoleIndex
        type: GSI
        partition: applicationId
        sort: roleId
        projection_type: ALL
      - name: RoleTypeIndex
        type: GSI
        partition: roleId
        sort: roleType
        projection_type: ALL
  attributes:
    applicationRoleId:
      type: string
      required: true
    applicationId:
      type: string
      required: true
    roleId:
      type: string
      required: true
    roleName:
      type: string
      required: true
    roleType:
      type: string
      required: true
      enum_type: RoleType
    description:
      type: string
      required: false
      description: Optional description for role documentation
    status:
      type: string
      required: true
      enum_type: RoleStatus
    createdAt:
      type: timestamp
      required: true
    updatedAt:
      type: timestamp
      required: true
```

**Removed:**
- `userId` attribute
- `permissions` array attribute
- `UserRoleIndex` GSI

**Added:**
- `description` optional attribute

#### ApplicationUserRoles.yml (Simplified)

```yaml
# BEFORE: Had permissions[]
# AFTER: No permissions array

type: lambda-dynamodb
name: ApplicationUserRoles
model:
  attributes:
    # ... all existing attributes EXCEPT permissions ...
    applicationUserRoleId:
      type: string
      required: true
    userId:
      type: string
      required: true
    applicationId:
      type: string
      required: true
    organizationId:
      type: string
      required: true
    organizationName:
      type: string
      required: true
    applicationName:
      type: string
      required: true
    environment:
      type: string
      required: true
      enum_type: Environment
    roleId:
      type: string
      required: true
    roleName:
      type: string
      required: true
    # permissions: REMOVED
    status:
      type: string
      required: true
      enum_type: ApplicationUserRoleStatus
    createdAt:
      type: timestamp
      required: true
    updatedAt:
      type: timestamp
      required: true
```

**Removed:**
- `permissions` array attribute

### Lambda Changes

#### GetApplicationUsers Lambda

**File:** `apps/api/lambdas/get_application_users/index.py`

**Changes:**
1. Remove `permissions` from `RoleAssignment` dataclass
2. Remove `permissions` from response building in `build_users_with_roles()`
3. Remove `permissions` from the response dict in `lambda_handler()`

```python
# BEFORE
@dataclass
class RoleAssignment:
    applicationUserRoleId: str
    applicationId: str
    applicationName: str
    organizationId: str
    organizationName: str
    environment: str
    roleId: str
    roleName: str
    permissions: List[str]  # REMOVE THIS
    status: str
    createdAt: int
    updatedAt: int

# AFTER
@dataclass
class RoleAssignment:
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
```

### Frontend Changes

#### GetApplicationUsers.graphql.ts

**File:** `apps/web/src/app/core/graphql/GetApplicationUsers.graphql.ts`

**Changes:**
1. Remove `permissions` from GraphQL query
2. Remove `permissions` from `RoleAssignment` interface

```typescript
// BEFORE
export interface RoleAssignment {
  applicationUserRoleId: string;
  applicationId: string;
  applicationName: string;
  organizationId: string;
  organizationName: string;
  environment: string;
  roleId: string;
  roleName: string;
  permissions: string[];  // REMOVE THIS
  status: string;
  createdAt: number;
  updatedAt: number;
}

// AFTER
export interface RoleAssignment {
  applicationUserRoleId: string;
  applicationId: string;
  applicationName: string;
  organizationId: string;
  organizationName: string;
  environment: string;
  roleId: string;
  roleName: string;
  status: string;
  createdAt: number;
  updatedAt: number;
}
```

#### Generated Files (Auto-updated by schema generator)

These files will be automatically regenerated:
- `apps/api/models/ApplicationRolesModel.py`
- `apps/api/models/ApplicationUserRolesModel.py`
- `apps/web/src/app/core/models/ApplicationRolesModel.ts`
- `apps/web/src/app/core/models/ApplicationUserRolesModel.ts`
- `apps/api/graphql/schema.graphql`
- `infrastructure/cdk/generated/appsync/api.py`

### Test File Updates

The following test files reference `permissions` and need updates:

| File | Changes Needed |
|------|----------------|
| `apps/api/tests/schemas/test_application_user_roles_schema.py` | Remove permissions from expected attributes |
| `apps/api/tests/property/test_application_count_aggregation_property.py` | Remove permissions from test data |
| `apps/api/tests/property/test_application_group_role_environment_property.py` | Delete entire file (tests groups) |
| `apps/api/tests/property/test_permission_union_property.py` | Delete entire file (tests permissions) |
| `apps/api/lambdas/get_application_users/test_get_application_users.py` | Remove permissions from test assertions |
| `apps/api/lambdas/get_application_users/test_get_application_users_property.py` | Remove permissions from test data |

## Data Models

### ApplicationRoles (Simplified)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| applicationRoleId | string | Yes | Primary key |
| applicationId | string | Yes | FK to Applications |
| roleId | string | Yes | Unique role identifier |
| roleName | string | Yes | Display name (e.g., "Admin", "Editor") |
| roleType | RoleType | Yes | ADMIN, USER, GUEST, CUSTOM |
| description | string | No | Optional documentation |
| status | RoleStatus | Yes | ACTIVE, INACTIVE, DELETED |
| createdAt | timestamp | Yes | Creation timestamp |
| updatedAt | timestamp | Yes | Last update timestamp |

### ApplicationUserRoles (Simplified)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| applicationUserRoleId | string | Yes | Primary key |
| userId | string | Yes | FK to Users |
| applicationId | string | Yes | FK to Applications |
| organizationId | string | Yes | Denormalized for filtering |
| organizationName | string | Yes | Denormalized for display |
| applicationName | string | Yes | Denormalized for display |
| environment | Environment | Yes | PRODUCTION, STAGING, etc. |
| roleId | string | Yes | FK to ApplicationRoles |
| roleName | string | Yes | Denormalized for JWT |
| status | ApplicationUserRoleStatus | Yes | ACTIVE, DELETED |
| createdAt | timestamp | Yes | Creation timestamp |
| updatedAt | timestamp | Yes | Last update timestamp |

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Analysis

Based on the prework analysis, this feature is primarily a refactoring/cleanup task with example-based verification rather than universal properties. The acceptance criteria are specific file deletions, schema modifications, and verification steps that can be tested as examples.

**No universal properties identified** - This is expected for a cleanup/simplification feature where:
- File deletions are binary (file exists or doesn't)
- Schema changes are structural (field present or absent)
- Code changes are specific removals

### Verification Examples

The following can be verified as specific examples after implementation:

1. **Schema File Deletion Verification**
   - Verify `schemas/tables/ApplicationGroups.yml` does not exist
   - Verify `schemas/tables/ApplicationGroupUsers.yml` does not exist
   - Verify `schemas/tables/ApplicationGroupRoles.yml` does not exist
   - Verify `schemas/registries/ApplicationGroupStatus.yml` does not exist
   - Verify `schemas/registries/ApplicationGroupUserStatus.yml` does not exist
   - Verify `schemas/registries/ApplicationGroupRoleStatus.yml` does not exist
   - **Validates: Requirements 1.1-1.6**

2. **ApplicationRoles Schema Verification**
   - Verify generated model has no `permissions` field
   - Verify generated model has no `userId` field
   - Verify generated CDK has no `UserRoleIndex` GSI
   - Verify generated model has `description` field
   - **Validates: Requirements 2.1-2.5**

3. **ApplicationUserRoles Schema Verification**
   - Verify generated model has no `permissions` field
   - Verify generated model retains all other fields
   - **Validates: Requirements 3.1-3.2**

4. **Lambda Response Verification**
   - Verify GetApplicationUsers response has no `permissions` in roleAssignments
   - **Validates: Requirements 4.1-4.3**

5. **Frontend Interface Verification**
   - Verify RoleAssignment interface has no `permissions` field
   - Verify GraphQL query doesn't request `permissions`
   - **Validates: Requirements 5.1-5.2**

6. **Build Verification**
   - Verify schema generator runs without errors
   - Verify Python type checking passes
   - Verify TypeScript compilation passes
   - Verify all tests pass
   - **Validates: Requirements 6.1-6.4, 10.1-10.3**

## Error Handling

### Schema Generator Errors

If the schema generator fails after deleting files:
1. Check for remaining references to deleted schemas in other files
2. Verify no circular dependencies exist
3. Check schema-generator.yml for references to deleted tables

### Compilation Errors

If compilation fails after regeneration:
1. Check for manual code referencing deleted models/enums
2. Update imports in affected files
3. Remove references to `permissions` in test files

### Test Failures

If tests fail after changes:
1. Update test data to not include `permissions`
2. Delete test files that specifically test groups or permissions
3. Update assertions that check for `permissions` field

## Testing Strategy

### Unit Tests

**Files to Update:**
- `apps/api/tests/schemas/test_application_user_roles_schema.py` - Remove permissions from expected attributes
- `apps/api/lambdas/get_application_users/test_get_application_users.py` - Remove permissions from assertions

**Files to Delete:**
- `apps/api/tests/property/test_application_group_role_environment_property.py` - Tests deleted groups functionality
- `apps/api/tests/property/test_permission_union_property.py` - Tests deleted permissions functionality

### Integration Tests

- Verify GetApplicationUsers Lambda returns correct response structure
- Verify frontend can parse response without permissions field

### Verification Checklist

After implementation:
- [ ] All 6 schema files deleted
- [ ] All 6 registry files deleted
- [ ] ApplicationRoles schema simplified (no userId, no permissions, has description)
- [ ] ApplicationUserRoles schema simplified (no permissions)
- [ ] Schema generator runs successfully
- [ ] Python models regenerated without permissions
- [ ] TypeScript models regenerated without permissions
- [ ] GraphQL schema regenerated without permissions
- [ ] GetApplicationUsers Lambda updated
- [ ] Frontend GraphQL query updated
- [ ] All tests pass
- [ ] No linting errors
- [ ] No compilation errors
