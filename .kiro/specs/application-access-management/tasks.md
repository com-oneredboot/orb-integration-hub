# Implementation Plan: Application Access Management

## Overview

This implementation plan covers the Application Access Management system across 5 phases with checkpoints after each phase. Each phase builds on the previous and includes testing tasks.

## Tasks

### Phase 1: Groups & Roles Foundation

- [x] 1. Create schema definitions for new tables
  - [x] 1.1 Create ApplicationGroups.yml schema
    - Define table with applicationGroupId PK, applicationId GSI
    - Include name, description, status fields
    - _Requirements: 1.1, 1.2_
  - [x] 1.2 Create ApplicationGroupUsers.yml schema
    - Define table with applicationGroupUserId PK
    - Add GSIs for groupId→userId and userId→groupId lookups
    - _Requirements: 2.1, 2.4_
  - [x] 1.3 Create ApplicationGroupRoles.yml schema
    - Define table with applicationGroupRoleId PK
    - Add GSI for groupId+environment lookups
    - Include denormalized roleName and permissions
    - _Requirements: 3.1, 3.4_
  - [x] 1.4 Create ApplicationUserRoles.yml schema
    - Define table with applicationUserRoleId PK
    - Add GSI for userId+environment lookups
    - Include denormalized roleName and permissions
    - _Requirements: 4.1, 4.3_
  - [x] 1.5 Create registry enums for new status types
    - ApplicationGroupStatus, ApplicationGroupUserStatus
    - ApplicationGroupRoleStatus, ApplicationUserRoleStatus
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 2. Generate code from schemas
  - [x] 2.1 Run orb-schema-generator to generate models and resolvers
    - Generate Python models, TypeScript models, GraphQL schema
    - Generate VTL resolvers for CRUD operations
    - _Requirements: 1.1, 2.1, 3.1, 4.1_
  - [x] 2.2 Update CDK stack to include new DynamoDB tables
    - Add tables to dynamodb_stack.py
    - Update appsync_stack.py with new data sources
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 3. Implement backend services for groups
  - [x] 3.1 Create ApplicationGroupService with CRUD operations
    - createGroup, updateGroup, deleteGroup, listGroups, getGroup
    - Enforce unique group names within application
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [x] 3.2 Write property test for group name uniqueness
    - **Property 1: Group Name Uniqueness**
    - **Validates: Requirements 1.5**
  - [x] 3.3 Create ApplicationGroupUserService with membership operations
    - addUserToGroup, removeUserFromGroup, listGroupMembers, getUserGroups
    - Prevent duplicate memberships
    - _Requirements: 2.1, 2.2, 2.4, 2.5_
  - [x] 3.4 Write property test for membership uniqueness
    - **Property 3: Membership Uniqueness**
    - **Validates: Requirements 2.5**

- [x] 4. Implement backend services for role assignments
  - [x] 4.1 Create ApplicationGroupRoleService
    - assignRoleToGroup, updateGroupRole, removeGroupRole, getGroupRoles
    - Support different roles per environment
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 4.2 Write property test for environment isolation
    - **Property 7: Group Role Environment Isolation**
    - **Validates: Requirements 3.4**
  - [x] 4.3 Create ApplicationUserRoleService
    - assignRoleToUser, removeUserRole, getUserRoles
    - Support multiple roles per user per environment
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 5. Update Applications table with count fields
  - [x] 5.1 Add groupCount, userCount, roleCount to Applications schema
    - Update Applications.yml with new optional fields
    - Regenerate models
    - _Requirements: 1.6, 2.7, 4.5_
  - [x] 5.2 Implement count sync logic in services
    - Update counts when groups/users/roles change
    - Follow same pattern as applicationCount sync
    - _Requirements: 1.6, 2.7, 4.5_
  - [x] 5.3 Write property test for count aggregation
    - **Property 12: Application Count Aggregation**
    - **Validates: Requirements 1.6**

- [x] 6. Phase 1 Checkpoint
  - Ensure all Phase 1 tests pass
  - Deploy to dev environment
  - Verify CRUD operations work via GraphQL playground
  - Ask user if questions arise

### Phase 2: Permission Resolution

- [x] 7. Implement permission resolution service
  - [x] 7.1 Create PermissionResolutionService
    - resolvePermissions(userId, applicationId, environment)
    - Collect direct roles and group roles
    - Merge permissions with direct role priority
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 7.2 Write property test for permission resolution determinism
    - **Property 4: Permission Resolution Determinism**
    - **Validates: Requirements 5.6**
  - [x] 7.3 Write property test for direct role priority
    - **Property 5: Direct Role Priority**
    - **Validates: Requirements 4.4, 5.4**
  - [x] 7.4 Write property test for permission union
    - **Property 6: Permission Union**
    - **Validates: Requirements 5.3**

- [x] 8. Implement permission caching
  - [x] 8.1 Add caching layer to PermissionResolutionService
    - Cache resolved permissions with TTL
    - Implement cache invalidation on role/group changes
    - _Requirements: 5.5_
  - [x] 8.2 Add hasPermission convenience method
    - Check if user has specific permission
    - Use cached resolution
    - _Requirements: 5.1_

- [x] 9. Implement cascade operations
  - [x] 9.1 Add cascade delete for groups
    - When group deleted, mark all memberships and role assignments as deleted
    - _Requirements: 1.3_
  - [x] 9.2 Write property test for cascade delete
    - **Property 2: Group Deletion Cascades**
    - **Validates: Requirements 1.3**
  - [x] 9.3 Add permission inheritance on membership change
    - When user added to group, inherit group's role permissions
    - When user removed, revoke inherited permissions
    - _Requirements: 2.3, 2.6_

- [x] 10. Phase 2 Checkpoint
  - Ensure all Phase 2 tests pass
  - Test permission resolution with various scenarios
  - Verify caching works correctly
  - Ask user if questions arise

### Phase 3: API Key Management

- [x] 11. Create API key schema and infrastructure
  - [x] 11.1 Create ApplicationApiKeys.yml schema
    - Define table with applicationApiKeyId PK
    - Add GSIs for appId+env and keyHash lookups
    - Include status, expiresAt, lastUsedAt fields
    - _Requirements: 6.2_
  - [x] 11.2 Create ApplicationApiKeyStatus registry enum
    - ACTIVE, ROTATING, REVOKED, EXPIRED
    - _Requirements: 6.2_
  - [x] 11.3 Generate code and update CDK stack
    - Run orb-schema-generator
    - Add table to dynamodb_stack.py
    - _Requirements: 6.2_

- [x] 12. Implement API key service
  - [x] 12.1 Create ApiKeyService with key generation
    - generateKey(applicationId, environment)
    - Generate cryptographically secure key with format orb_{env}_{random}
    - Store only hash in database
    - _Requirements: 6.1, 6.2_
  - [x] 12.2 Write property test for key uniqueness
    - **Property 8: API Key Uniqueness**
    - **Validates: Requirements 6.1**
  - [x] 12.3 Implement key validation
    - validateKey(key) returns context or null
    - Hash incoming key and lookup in database
    - _Requirements: 6.6_
  - [x] 12.4 Write property test for validation round-trip
    - **Property 9: API Key Validation Round-Trip**
    - **Validates: Requirements 6.6, 7.1**

- [x] 13. Implement key rotation and revocation
  - [x] 13.1 Implement key rotation
    - rotateKey(applicationId, environment)
    - Generate new key, move current to nextKeyHash
    - Both keys valid during rotation period
    - _Requirements: 6.3_
  - [x] 13.2 Write property test for dual validity during rotation
    - **Property 11: API Key Rotation Dual Validity**
    - **Validates: Requirements 6.3**
  - [x] 13.3 Implement key revocation
    - revokeKey(applicationId, environment)
    - Immediately invalidate key
    - _Requirements: 6.4_
  - [x] 13.4 Write property test for revocation enforcement
    - **Property 10: API Key Revocation Enforcement**
    - **Validates: Requirements 6.4, 7.3**

- [x] 14. Implement API key authentication
  - [x] 14.1 Create Lambda authorizer for API key validation
    - Validate key and return policy with context
    - Handle invalid/expired/revoked keys with 401
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 14.2 Add rate limiting for API key requests
    - Track request counts per key
    - Return 429 when limit exceeded
    - _Requirements: 7.5_
  - [x] 14.3 Add audit logging for API key usage
    - Log key usage with timestamp and request details
    - _Requirements: 7.4_

- [x] 15. Phase 3 Checkpoint
  - Ensure all Phase 3 tests pass
  - Test key generation, rotation, revocation flow
  - Verify Lambda authorizer works correctly
  - Ask user if questions arise

### Phase 4: Frontend Integration

- [x] 16. Create NgRx store for groups
  - [x] 16.1 Create groups store files
    - groups.state.ts, groups.actions.ts, groups.reducer.ts
    - groups.selectors.ts, groups.effects.ts
    - Follow organizations store pattern
    - _Requirements: 8.1, 8.5_
  - [x] 16.2 Create GroupService for API calls
    - CRUD operations for groups
    - Membership operations
    - _Requirements: 8.1, 8.3_
  - [x] 16.3 Write unit tests for groups store
    - Test actions, reducer, selectors
    - _Requirements: 8.5_

- [x] 17. Create group management UI components
  - [x] 17.1 Create GroupsListComponent
    - Display groups for application with member counts
    - Add/edit/delete group actions
    - _Requirements: 8.1, 8.2_
  - [x] 17.2 Create GroupDetailComponent
    - Display group info and member list
    - Add/remove member functionality
    - _Requirements: 8.3, 8.4_
  - [x] 17.3 Create GroupRoleAssignmentComponent
    - Assign roles to group per environment
    - Display current role assignments
    - _Requirements: 8.2_

- [x] 18. Create NgRx store for API keys
  - [x] 18.1 Create api-keys store files
    - api-keys.state.ts, api-keys.actions.ts, api-keys.reducer.ts
    - api-keys.selectors.ts, api-keys.effects.ts
    - _Requirements: 9.1, 9.5_
  - [x] 18.2 Create ApiKeyService for API calls
    - Generate, rotate, revoke operations
    - _Requirements: 9.1_
  - [x] 18.3 Write unit tests for api-keys store
    - Test actions, reducer, selectors
    - _Requirements: 9.5_

- [x] 19. Create API key management UI components
  - [x] 19.1 Create ApiKeysListComponent
    - Display keys per environment with masked values
    - Generate, rotate, revoke actions
    - _Requirements: 9.1, 9.5_
  - [x] 19.2 Create ApiKeyGenerateDialogComponent
    - Show generated key once with copy button
    - Require confirmation before closing
    - _Requirements: 9.2, 9.6_
  - [x] 19.3 Create ApiKeyRotateDialogComponent
    - Show both current and next keys during rotation
    - _Requirements: 9.3_
  - [x] 19.4 Create ApiKeyRevokeDialogComponent
    - Confirmation dialog before revocation
    - _Requirements: 9.4_

- [x] 20. Integrate into application detail page
  - [x] 20.1 Add Groups tab to application detail page
    - Wire up GroupsListComponent
    - _Requirements: 8.1_
  - [x] 20.2 Add API Keys tab to application detail page
    - Wire up ApiKeysListComponent
    - _Requirements: 9.1_
  - [x] 20.3 Update application list with new counts
    - Display groupCount, userCount, roleCount
    - _Requirements: 1.6, 2.7, 4.5_

- [x] 21. Phase 4 Checkpoint
  - Ensure all frontend tests pass
  - Test UI flows end-to-end
  - Verify store-first pattern is followed
  - Ask user if questions arise

### Phase 5: SDK Infrastructure & Package

**BLOCKED**: Waiting on orb-schema-generator #83 (Multi-AppSync API Support with Lambda Authorizer)

- [ ] 22. Create SDK AppSync infrastructure (BLOCKED)
  - [ ] 22.1 Update schema-generator.yml with dual-AppSync configuration
    - Add `appsync.sdk` configuration with Lambda authorizer
    - Configure table filtering (exclude ApplicationApiKeys)
    - _Requirements: 7.1, 10.1_
    - _Blocked by: orb-schema-generator #83_
  - [ ] 22.2 Create API Key Authorizer Lambda
    - Validate orb_{env}_{key} format
    - Lookup key hash in ApplicationApiKeys table
    - Return org/app/env context on success
    - _Requirements: 7.1, 7.2, 7.3_
  - [ ] 22.3 Generate SDK AppSync API and deploy
    - Run orb-schema-generator with new config
    - Create appsync_sdk_stack.py
    - Deploy to dev environment
    - _Requirements: 10.1_
    - _Blocked by: orb-schema-generator #83_
  - [ ] 22.4 Create SDK GraphQL schema subset
    - Define sdk-schema.graphql with SDK-only operations
    - Exclude API key management operations
    - _Requirements: 10.2, 10.3, 10.4_

- [ ] 23. Create TypeScript SDK package structure
  - [ ] 23.1 Initialize npm package
    - Create packages/sdk-typescript directory
    - Set up package.json with proper metadata
    - Configure TypeScript compilation
    - _Requirements: 10.1, 10.5_
  - [ ] 23.2 Create SDK client class
    - OrbIntegrationClient with API key authentication
    - GraphQL client pointing to SDK AppSync endpoint
    - Base error handling
    - _Requirements: 10.1_

- [ ] 23. Implement SDK user management functions
  - [ ] 23.1 Implement user functions
    - assignUser, removeUser, getUsers
    - Scoped to environment from API key context
    - _Requirements: 10.2_
  - [ ] 23.2 Write unit tests for user functions
    - Test with mocked API responses
    - _Requirements: 10.6_

- [ ] 24. Implement SDK group management functions
  - [ ] 24.1 Implement group functions
    - createGroup, updateGroup, deleteGroup
    - addMember, removeMember, getMembers
    - _Requirements: 10.3_
  - [ ] 24.2 Write unit tests for group functions
    - Test with mocked API responses
    - _Requirements: 10.6_

- [ ] 25. Implement SDK role management functions
  - [ ] 25.1 Implement role functions
    - assignRole, removeRole, getUserPermissions
    - _Requirements: 10.4_
  - [ ] 25.2 Write unit tests for role functions
    - Test with mocked API responses
    - _Requirements: 10.6_

- [ ] 26. Implement SDK API key management functions
  - [ ] 26.1 Implement API key functions
    - generateKey, rotateKey, revokeKey
    - _Requirements: 10.5_
  - [ ] 26.2 Write unit tests for API key functions
    - Test with mocked API responses
    - _Requirements: 10.6_

- [ ] 27. Create SDK documentation
  - [ ] 27.1 Write README with quick-start examples
    - Installation, authentication, basic usage
    - _Requirements: 11.2_
  - [ ] 27.2 Add inline JSDoc documentation
    - Document all public functions and types
    - _Requirements: 11.1, 11.5_
  - [ ] 27.3 Create CHANGELOG.md
    - Document initial release
    - _Requirements: 11.4_

- [ ] 28. Create Python SDK package (optional)
  - [ ] 28.1 Initialize PyPI package structure
    - Create packages/sdk-python directory
    - Set up pyproject.toml
    - _Requirements: 10.6_
  - [ ] 28.2 Implement Python SDK client
    - Mirror TypeScript SDK functionality
    - _Requirements: 10.1-10.5_
  - [ ] 28.3 Write Python SDK tests
    - Test with mocked API responses
    - _Requirements: 10.6_

- [ ] 29. Publish SDK packages
  - [ ] 29.1 Publish TypeScript SDK to npm
    - Version 1.0.0
    - _Requirements: 10.6, 11.3_
  - [ ] 29.2 Publish Python SDK to PyPI
    - Version 1.0.0
    - _Requirements: 10.6, 11.3_

- [ ] 30. Final Checkpoint
  - Ensure all tests pass (>80% coverage)
  - Verify SDK works against deployed API
  - Update project CHANGELOG.md
  - Bump project version
  - Ask user if questions arise

## Notes

- All tasks are required for comprehensive implementation
- Each phase has a checkpoint to verify progress before continuing
- Property tests validate universal correctness properties (12 properties total)
- Unit tests validate specific examples and edge cases
- Follow orb-templates guidance for documentation, versions, changelogs
- Both TypeScript and Python SDKs will be published

## Blockers

| Issue | Team | Description | Impact |
|-------|------|-------------|--------|
| #83 | orb-schema-generator | Multi-AppSync API Support with Lambda Authorizer | Blocks Phase 5 tasks 22.1, 22.3 |

Phase 5 requires a second AppSync API with AWS_LAMBDA authorization for SDK access. This is blocked until orb-schema-generator supports:
- Multiple AppSync APIs in configuration
- AWS_LAMBDA authorization mode
- Lambda authorizer configuration
- Per-API table/operation filtering

Once #83 is resolved, update orb-schema-generator and continue with Phase 5.
