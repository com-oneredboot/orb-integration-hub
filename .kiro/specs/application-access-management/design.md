# Design Document: Application Access Management

## Overview

This design document describes the architecture and implementation of the Application Access Management system for orb-integration-hub. The system provides:

1. **Groups & Roles** - Application-level groups with environment-scoped role assignments
2. **Permission Resolution** - Deterministic permission calculation combining direct and inherited roles
3. **API Key Management** - Per-environment API keys for SDK authentication
4. **Frontend UI** - NgRx-based management interfaces
5. **SDK Package** - npm/PyPI packages for external team integration

The design follows the existing orb-integration-hub patterns including schema-driven development, store-first NgRx architecture, and the orb-templates standards for documentation and versioning.

## Architecture

The system uses a dual-AppSync architecture to separate internal user traffic from external SDK traffic:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                             │
├─────────────────────────────────┬───────────────────────────────────────────────┤
│     Web/Mobile App Users        │           External Teams (SDK)                 │
│     (Cognito Auth)              │           (Application API Key)                │
└─────────────────────────────────┴───────────────────────────────────────────────┘
                │                                        │
                │ JWT Token                              │ orb_{env}_{key}
                ▼                                        ▼
┌─────────────────────────────────┐    ┌───────────────────────────────────────────┐
│     AppSync API (Primary)       │    │         AppSync SDK API                    │
│  ┌───────────────────────────┐  │    │  ┌─────────────────────────────────────┐  │
│  │ Auth: Cognito + API Key   │  │    │  │ Auth: AWS_LAMBDA Authorizer         │  │
│  │ Full schema access        │  │    │  │ SDK operations only                 │  │
│  │ Admin operations          │  │    │  │ No API key management               │  │
│  └───────────────────────────┘  │    │  └─────────────────────────────────────┘  │
└─────────────────────────────────┘    │                    │                       │
                │                       │                    ▼                       │
                │                       │    ┌─────────────────────────────────────┐│
                │                       │    │   API Key Authorizer Lambda         ││
                │                       │    │   - Validates orb_{env}_{key}       ││
                │                       │    │   - Returns org/app/env context     ││
                │                       │    │   - Rate limiting                   ││
                │                       │    └─────────────────────────────────────┘│
                │                       └───────────────────────────────────────────┘
                │                                        │
                └────────────────────┬───────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DynamoDB Tables                                     │
│  ┌──────────────┐  ┌──────────────────┐  ┌────────────────────┐                 │
│  │ApplicationGroup│  │ApplicationGroupUser│  │ApplicationGroupRole│                 │
│  └──────────────┘  └──────────────────┘  └────────────────────┘                 │
│  ┌──────────────────┐  ┌─────────────────┐                                       │
│  │ApplicationUserRole│  │ApplicationApiKey │                                       │
│  └──────────────────┘  └─────────────────┘                                       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Dual-AppSync Rationale

1. **Security Isolation** - SDK traffic is completely separate from user traffic. Compromised SDK keys cannot affect the main API.
2. **Different Auth Models** - Primary API uses Cognito; SDK API uses custom Lambda authorizer for Application API Keys.
3. **Schema Control** - SDK exposes only necessary operations, not admin functions like API key management.
4. **Independent Scaling** - SDK API can scale independently based on external developer usage.
5. **Separate WAF/Rate Limits** - Different protection rules for different traffic patterns.

### SDK AppSync Configuration

The SDK AppSync API will be configured via orb-schema-generator (pending feature #83):

```yaml
appsync:
  api:      # Primary API (existing)
    name: "${project}-${env}-appsync-api"
    auth:
      default: AMAZON_COGNITO_USER_POOLS
      additional:
        - API_KEY
    tables: all
    
  sdk:      # SDK API (new)
    name: "${project}-${env}-appsync-sdk"
    auth:
      default: AWS_LAMBDA
      lambda_authorizer:
        function_name: api-key-authorizer
        result_ttl_seconds: 300
    tables:
      - ApplicationGroups
      - ApplicationGroupUsers
      - ApplicationGroupRoles
      - ApplicationUserRoles
      # Note: ApplicationApiKeys NOT exposed to SDK
    exclude_operations:
      - "ApplicationApiKeys*"
```

### SDK Operations (Exposed via SDK AppSync)

The SDK API exposes only operations external developers need:

| Category | Operations |
|----------|------------|
| Groups | Create, Update, Delete, Get, List |
| Membership | AddMember, RemoveMember, ListMembers |
| Roles | AssignRole, RemoveRole, GetUserRoles |
| Permissions | GetUserPermissions, HasPermission |

Operations NOT exposed to SDK:
- API Key management (generate, rotate, revoke)
- Organization management
- Application creation/deletion
- Admin operations

## Components and Interfaces

### Phase 1: Schema Definitions

#### ApplicationGroup Table
```yaml
# schemas/tables/ApplicationGroups.yml
type: dynamodb
name: ApplicationGroups
model:
  keys:
    primary:
      partition: applicationGroupId
    secondary:
      - name: ApplicationGroupsIndex
        type: GSI
        partition: applicationId
        sort: name
        projection_type: ALL
  attributes:
    applicationGroupId:
      type: string
      required: true
      description: Unique identifier for the group
    applicationId:
      type: string
      required: true
      description: FK to Applications table
    name:
      type: string
      required: true
      description: Group name (unique within application)
    description:
      type: string
      required: false
      description: Group description
    status:
      type: string
      required: true
      enum_type: ApplicationGroupStatus
      enum_values: [ACTIVE, DELETED]
    createdAt:
      type: timestamp
      required: true
    updatedAt:
      type: timestamp
      required: true
```

#### ApplicationGroupUser Table
```yaml
# schemas/tables/ApplicationGroupUsers.yml
type: dynamodb
name: ApplicationGroupUsers
model:
  keys:
    primary:
      partition: applicationGroupUserId
    secondary:
      - name: GroupUsersIndex
        type: GSI
        partition: applicationGroupId
        sort: userId
        projection_type: ALL
      - name: UserGroupsIndex
        type: GSI
        partition: userId
        sort: applicationGroupId
        projection_type: ALL
  attributes:
    applicationGroupUserId:
      type: string
      required: true
      description: Unique identifier for the membership
    applicationGroupId:
      type: string
      required: true
      description: FK to ApplicationGroups table
    userId:
      type: string
      required: true
      description: FK to Users table
    status:
      type: string
      required: true
      enum_type: ApplicationGroupUserStatus
      enum_values: [ACTIVE, REMOVED, INVITED]
    createdAt:
      type: timestamp
      required: true
    updatedAt:
      type: timestamp
      required: true
```

#### ApplicationGroupRole Table
```yaml
# schemas/tables/ApplicationGroupRoles.yml
type: dynamodb
name: ApplicationGroupRoles
model:
  keys:
    primary:
      partition: applicationGroupRoleId
    secondary:
      - name: GroupEnvRoleIndex
        type: GSI
        partition: applicationGroupId
        sort: environment
        projection_type: ALL
      - name: EnvGroupRoleIndex
        type: GSI
        partition: environment
        sort: applicationGroupId
        projection_type: ALL
  attributes:
    applicationGroupRoleId:
      type: string
      required: true
      description: Unique identifier for the group-role assignment
    applicationGroupId:
      type: string
      required: true
      description: FK to ApplicationGroups table
    applicationId:
      type: string
      required: true
      description: FK to Applications table (denormalized for queries)
    environment:
      type: string
      required: true
      enum_type: Environment
      enum_values: [PRODUCTION, STAGING, DEVELOPMENT, TEST, PREVIEW]
    roleId:
      type: string
      required: true
      description: FK to Roles table
    roleName:
      type: string
      required: true
      description: Denormalized role name for display
    permissions:
      type: array
      items: string
      required: true
      description: Denormalized permissions for fast resolution
    status:
      type: string
      required: true
      enum_type: ApplicationGroupRoleStatus
      enum_values: [ACTIVE, DELETED]
    createdAt:
      type: timestamp
      required: true
    updatedAt:
      type: timestamp
      required: true
```

#### ApplicationUserRole Table
```yaml
# schemas/tables/ApplicationUserRoles.yml
type: dynamodb
name: ApplicationUserRoles
model:
  keys:
    primary:
      partition: applicationUserRoleId
    secondary:
      - name: UserEnvRoleIndex
        type: GSI
        partition: userId
        sort: environment
        projection_type: ALL
      - name: AppEnvUserIndex
        type: GSI
        partition: applicationId
        sort: environment
        projection_type: ALL
  attributes:
    applicationUserRoleId:
      type: string
      required: true
      description: Unique identifier for the user-role assignment
    userId:
      type: string
      required: true
      description: FK to Users table
    applicationId:
      type: string
      required: true
      description: FK to Applications table
    environment:
      type: string
      required: true
      enum_type: Environment
      enum_values: [PRODUCTION, STAGING, DEVELOPMENT, TEST, PREVIEW]
    roleId:
      type: string
      required: true
      description: FK to Roles table
    roleName:
      type: string
      required: true
      description: Denormalized role name for display
    permissions:
      type: array
      items: string
      required: true
      description: Denormalized permissions for fast resolution
    status:
      type: string
      required: true
      enum_type: ApplicationUserRoleStatus
      enum_values: [ACTIVE, DELETED]
    createdAt:
      type: timestamp
      required: true
    updatedAt:
      type: timestamp
      required: true
```

#### ApplicationApiKey Table
```yaml
# schemas/tables/ApplicationApiKeys.yml
type: dynamodb
name: ApplicationApiKeys
model:
  keys:
    primary:
      partition: applicationApiKeyId
    secondary:
      - name: AppEnvKeyIndex
        type: GSI
        partition: applicationId
        sort: environment
        projection_type: ALL
      - name: KeyLookupIndex
        type: GSI
        partition: keyHash
        projection_type: ALL
  attributes:
    applicationApiKeyId:
      type: string
      required: true
      description: Unique identifier for the API key record
    applicationId:
      type: string
      required: true
      description: FK to Applications table
    organizationId:
      type: string
      required: true
      description: FK to Organizations table (denormalized)
    environment:
      type: string
      required: true
      enum_type: Environment
      enum_values: [PRODUCTION, STAGING, DEVELOPMENT, TEST, PREVIEW]
    keyHash:
      type: string
      required: true
      description: SHA-256 hash of the API key (for lookup)
    keyPrefix:
      type: string
      required: true
      description: First 8 chars of key (for display, e.g., "orb_dev_")
    status:
      type: string
      required: true
      enum_type: ApplicationApiKeyStatus
      enum_values: [ACTIVE, ROTATING, REVOKED, EXPIRED]
    nextKeyHash:
      type: string
      required: false
      description: Hash of next key during rotation
    expiresAt:
      type: timestamp
      required: false
      description: Optional expiration timestamp
    lastUsedAt:
      type: timestamp
      required: false
      description: Last time the key was used
    createdAt:
      type: timestamp
      required: true
    updatedAt:
      type: timestamp
      required: true
```

### Phase 2: Permission Resolution Service

```typescript
// apps/api/services/permission-resolution.service.ts

interface ResolvedPermissions {
  userId: string;
  applicationId: string;
  environment: string;
  directRoles: Role[];
  groupRoles: { group: ApplicationGroup; role: Role }[];
  effectivePermissions: string[];
  resolvedAt: number;
}

class PermissionResolutionService {
  /**
   * Resolve effective permissions for a user in an application environment.
   * 
   * Resolution order:
   * 1. Collect direct ApplicationUserRole assignments
   * 2. Collect ApplicationGroupRole assignments for user's groups
   * 3. Merge permissions (union of all)
   * 4. Direct roles override group roles on conflict
   */
  async resolvePermissions(
    userId: string,
    applicationId: string,
    environment: string
  ): Promise<ResolvedPermissions>;

  /**
   * Check if a user has a specific permission.
   */
  async hasPermission(
    userId: string,
    applicationId: string,
    environment: string,
    permission: string
  ): Promise<boolean>;

  /**
   * Invalidate cached permissions for a user.
   * Called when roles or group memberships change.
   */
  async invalidateCache(userId: string, applicationId: string): Promise<void>;
}
```

### Phase 3: API Key Service

```typescript
// apps/api/services/api-key.service.ts

interface ApiKeyContext {
  applicationId: string;
  organizationId: string;
  environment: string;
  keyId: string;
}

class ApiKeyService {
  /**
   * Generate a new API key for an application environment.
   * Key format: orb_{env}_{random32chars}
   * Example: orb_dev_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
   */
  async generateKey(
    applicationId: string,
    environment: string
  ): Promise<{ key: string; keyId: string }>;

  /**
   * Rotate an API key. Creates new key, moves current to "next" status.
   * Both keys are valid during rotation period.
   */
  async rotateKey(
    applicationId: string,
    environment: string
  ): Promise<{ newKey: string; oldKeyValidUntil: number }>;

  /**
   * Revoke an API key immediately.
   */
  async revokeKey(
    applicationId: string,
    environment: string
  ): Promise<void>;

  /**
   * Validate an API key and return context.
   * Used by Lambda authorizer.
   */
  async validateKey(key: string): Promise<ApiKeyContext | null>;
}
```

### Phase 5: SDK AppSync Lambda Authorizer

The Lambda authorizer validates Application API Keys and returns identity context for the SDK AppSync API.

```python
# apps/api/lambdas/api_key_authorizer/handler.py

def handler(event: dict, context: Any) -> dict:
    """
    AppSync Lambda Authorizer for SDK API.
    
    Validates Application API Keys (orb_{env}_{key} format) and returns
    authorization response with identity context.
    
    Args:
        event: AppSync authorization request
            - authorizationToken: The API key from request header
            - requestContext: AppSync request metadata
        context: Lambda context
        
    Returns:
        Authorization response:
            - isAuthorized: bool
            - resolverContext: dict with org/app/env context
            - deniedFields: list (empty if authorized)
            - ttlOverride: int (cache TTL in seconds)
    """
    pass
```

#### Authorizer Response Format

```python
# Successful authorization
{
    "isAuthorized": True,
    "resolverContext": {
        "organizationId": "org-123",
        "applicationId": "app-456", 
        "environment": "DEVELOPMENT",
        "keyId": "key-789"
    },
    "deniedFields": [],
    "ttlOverride": 300  # Cache for 5 minutes
}

# Failed authorization
{
    "isAuthorized": False,
    "resolverContext": {},
    "deniedFields": ["*"],
    "ttlOverride": 0  # Don't cache failures
}
```

#### Authorizer Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SDK Request with API Key                      │
│              Authorization: orb_dev_a1b2c3d4...                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Lambda Authorizer                             │
│  1. Extract key from authorizationToken                          │
│  2. Validate key format (orb_{env}_{random})                     │
│  3. Hash key and lookup in ApplicationApiKeys table              │
│  4. Check status (ACTIVE or ROTATING)                            │
│  5. Check expiration                                             │
│  6. Update lastUsedAt timestamp                                  │
│  7. Return context or deny                                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
            ┌─────────────┐         ┌─────────────┐
            │ Authorized  │         │   Denied    │
            │ + Context   │         │   401/403   │
            └─────────────┘         └─────────────┘
```

## Data Models

### Entity Relationship Diagram

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────────────┐
│ Application │───────│ ApplicationGroup │───────│ ApplicationGroupUser│
└─────────────┘  1:N  └──────────────────┘  1:N  └─────────────────────┘
       │                      │                           │
       │                      │ 1:N                       │
       │                      ▼                           │
       │              ┌──────────────────────┐            │
       │              │ ApplicationGroupRole │            │
       │              │   (per environment)  │            │
       │              └──────────────────────┘            │
       │                      │                           │
       │                      │                           │
       │                      ▼                           │
       │              ┌──────────────────┐                │
       │              │      Roles       │◄───────────────┘
       │              └──────────────────┘
       │                      ▲
       │                      │
       │              ┌──────────────────────┐
       │──────────────│ ApplicationUserRole  │
       │     1:N      │   (per environment)  │
       │              └──────────────────────┘
       │
       │              ┌──────────────────────┐
       └──────────────│  ApplicationApiKey   │
              1:N     │   (per environment)  │
                      └──────────────────────┘
```

### Permission Resolution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    resolvePermissions(userId, appId, env)        │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
┌───────────────────────────┐   ┌───────────────────────────────┐
│ Query ApplicationUserRole │   │ Query ApplicationGroupUser    │
│ by userId + appId + env   │   │ by userId                     │
└───────────────────────────┘   └───────────────────────────────┘
                │                               │
                │                               ▼
                │               ┌───────────────────────────────┐
                │               │ Query ApplicationGroupRole    │
                │               │ by groupIds + env             │
                │               └───────────────────────────────┘
                │                               │
                └───────────────┬───────────────┘
                                ▼
                ┌───────────────────────────────┐
                │     Merge Permissions         │
                │  (direct roles take priority) │
                └───────────────────────────────┘
                                │
                                ▼
                ┌───────────────────────────────┐
                │   Return ResolvedPermissions  │
                └───────────────────────────────┘
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Group Name Uniqueness
*For any* application and any two groups within that application, if both groups are ACTIVE, their names must be different.
**Validates: Requirements 1.5**

### Property 2: Group Deletion Cascades
*For any* group that is deleted, all associated ApplicationGroupUser and ApplicationGroupRole records must be marked as DELETED/REMOVED.
**Validates: Requirements 1.3**

### Property 3: Membership Uniqueness
*For any* group and user combination, there can be at most one ACTIVE ApplicationGroupUser record.
**Validates: Requirements 2.5**

### Property 4: Permission Resolution Determinism
*For any* user, application, and environment combination, calling resolvePermissions multiple times with identical inputs must return identical results.
**Validates: Requirements 5.6**

### Property 5: Direct Role Priority
*For any* user with both a direct ApplicationUserRole and an inherited ApplicationGroupRole in the same environment, the effective permissions must include the direct role's permissions.
**Validates: Requirements 4.4, 5.4**

### Property 6: Permission Union
*For any* user with multiple role sources (direct + group), the effective permissions must be the union of all permissions from all sources.
**Validates: Requirements 5.3**

### Property 7: Group Role Environment Isolation
*For any* group with role assignments in multiple environments, changing the role in one environment must not affect the role in other environments.
**Validates: Requirements 3.4**

### Property 8: API Key Uniqueness
*For any* two API keys, their keyHash values must be different.
**Validates: Requirements 6.1**

### Property 9: API Key Validation Round-Trip
*For any* generated API key, validating that key must return the correct application, organization, and environment context.
**Validates: Requirements 6.6, 7.1**

### Property 10: API Key Revocation Enforcement
*For any* revoked API key, subsequent validation attempts must return null/fail.
**Validates: Requirements 6.4, 7.3**

### Property 11: API Key Rotation Dual Validity
*For any* API key during rotation, both the current key and the next key must be valid for authentication.
**Validates: Requirements 6.3**

### Property 12: Application Count Aggregation
*For any* application, the groupCount must equal the count of ACTIVE ApplicationGroup records for that application.
**Validates: Requirements 1.6**

## Error Handling

### Error Codes

| Code | Name | Description |
|------|------|-------------|
| AAM001 | GROUP_NAME_EXISTS | Group name already exists in application |
| AAM002 | GROUP_NOT_FOUND | Group does not exist or is deleted |
| AAM003 | USER_ALREADY_IN_GROUP | User is already a member of the group |
| AAM004 | USER_NOT_IN_GROUP | User is not a member of the group |
| AAM005 | ROLE_NOT_FOUND | Role does not exist |
| AAM006 | INVALID_ENVIRONMENT | Environment is not valid for this application |
| AAM007 | MAX_ENVIRONMENTS_EXCEEDED | Application has reached maximum environments (5) |
| AAM008 | API_KEY_NOT_FOUND | API key does not exist |
| AAM009 | API_KEY_EXPIRED | API key has expired |
| AAM010 | API_KEY_REVOKED | API key has been revoked |
| AAM011 | RATE_LIMIT_EXCEEDED | Too many requests with this API key |
| AAM012 | PERMISSION_DENIED | User does not have required permission |

### Error Response Format

```typescript
interface ErrorResponse {
  code: string;      // e.g., "AAM001"
  message: string;   // Human-readable message
  details?: object;  // Additional context
}
```

## Testing Strategy

### Unit Tests
- Test each service method in isolation
- Mock DynamoDB operations
- Test error conditions and edge cases
- Target: >80% code coverage

### Property-Based Tests
- Use fast-check (TypeScript) or Hypothesis (Python) for property testing
- Minimum 100 iterations per property
- Test all 12 correctness properties defined above
- Tag format: **Feature: application-access-management, Property {N}: {title}**

### Integration Tests
- Test GraphQL resolvers with real DynamoDB (local)
- Test permission resolution end-to-end
- Test API key generation and validation flow

### Frontend Tests
- NgRx store tests (actions, reducers, selectors, effects)
- Component tests with TestBed
- E2E tests for critical flows (Cypress/Playwright)

### SDK Tests
- Unit tests for all SDK functions
- Integration tests against deployed API
- Example usage tests from documentation
