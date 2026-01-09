# Implementation Plan: GraphQL API Completion

## Overview

This implementation plan completes the orb-integration-hub GraphQL API layer by:
1. Creating missing table schemas
2. Regenerating GraphQL schema with operations
3. Updating frontend services and query definitions
4. Adding tests and documentation

The implementation uses Python (backend) and TypeScript (frontend) following orb-templates standards.

## Tasks

- [x] 1. Create missing table schemas
  - [x] 1.1 Create schemas/tables/Organizations.yml
    - Define organizationId as primary key
    - Define OwnerIndex and StatusCreatedIndex GSIs
    - Include all attributes from dynamodb.yml
    - Reference OrganizationStatus enum
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 1.2 Create schemas/tables/OrganizationUsers.yml
    - Define composite key (userId, organizationId)
    - Define OrganizationMembersIndex and UserOrganizationsIndex GSIs
    - Include role attribute with OrganizationUserRole enum
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 1.3 Create schemas/tables/OwnershipTransferRequests.yml
    - Define transferId as primary key
    - Define CurrentOwnerIndex, NewOwnerIndex, StatusIndex, ExpirationIndex GSIs
    - Reference OwnershipTransferStatus enum
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 1.4 Create schemas/tables/PrivacyRequests.yml
    - Define requestId as primary key
    - Define RequestTypeIndex, DataSubjectIndex, OrganizationIndex, StatusIndex GSIs
    - Reference PrivacyRequestStatus and PrivacyRequestType enums
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 2. Verify and fix existing table schemas
  - [x] 2.1 Verify Users.yml has correct authConfig structure
    - Ensure cognitoAuthentication.groups is properly defined
    - Verify targets: [api] is present
    - _Requirements: 1.1, 1.2, 4.1, 4.2_

  - [x] 2.2 Verify Applications.yml has correct authConfig structure
    - Ensure cognitoAuthentication.groups is properly defined
    - Verify targets: [api] is present
    - _Requirements: 1.1, 1.2, 4.1, 4.2_

  - [x] 2.3 Verify all other table schemas have correct structure
    - Check ApplicationUsers.yml, ApplicationRoles.yml, Roles.yml, Notifications.yml, SmsRateLimit.yml
    - Ensure consistent authConfig across all schemas
    - _Requirements: 1.1, 1.2, 4.1, 4.2_

- [-] 3. Regenerate code with orb-schema-generator
  - [x] 3.1 Run orb-schema-generator validate
    - Fix any validation errors
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 3.2 Run orb-schema-generator generate
    - ~~**BLOCKER**: [orb-schema-generator#56](https://github.com/com-oneredboot/orb-schema-generator/issues/56)~~ - Fixed in v0.13.3
    - Updated to orb-schema-generator v0.13.3
    - Fixed schema target configuration (removed duplicate web target)
    - Generated 99 operations across 11 tables
    - Generated 15 Python/TypeScript models, 18 enums, 114 VTL resolvers
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6_

  - [ ] 3.3 Write property test for GSI-to-Query mapping
    - **Property 1: GSI-to-Query Operation Mapping**
    - **Validates: Requirements 1.6**

  - [ ] 3.4 Write property test for auth directive coverage
    - **Property 2: Authentication Directive Coverage**
    - **Validates: Requirements 4.1, 4.2**

- [ ] 4. Checkpoint - Verify schema generation
  - Ensure all tests pass, ask the user if questions arise.
  - Verify schema.graphql has non-empty Query and Mutation types
  - Verify all entities have CRUD operations

- [ ] 5. Update frontend GraphQL query definitions
  - [ ] 5.1 Update apps/web/src/app/core/graphql/Users.graphql.ts
    - Add query definitions matching generated schema
    - Include QueryByUserId, QueryByEmail, QueryByCognitoId operations
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [ ] 5.2 Update apps/web/src/app/core/graphql/Organizations.graphql.ts
    - Add query definitions matching generated schema
    - Include QueryByOrganizationId, QueryByOwnerId, QueryByStatus operations
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [ ] 5.3 Update apps/web/src/app/core/graphql/Applications.graphql.ts
    - Add query definitions matching generated schema
    - Include QueryByApplicationId, QueryByOrganizationId operations
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [ ] 5.4 Create missing GraphQL query definition files
    - Create OrganizationUsers.graphql.ts
    - Create OwnershipTransferRequests.graphql.ts
    - Create PrivacyRequests.graphql.ts
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [ ] 5.5 Write property test for query definition consistency
    - **Property 4: Query Definition Consistency**
    - **Validates: Requirements 6.2**

- [ ] 6. Update frontend entity services
  - [ ] 6.1 Update apps/web/src/app/core/services/user.service.ts
    - Implement query, create, update, delete methods
    - Use generated TypeScript models
    - Integrate with ErrorHandlerService
    - _Requirements: 5.1, 5.4, 5.5_

  - [ ] 6.2 Update apps/web/src/app/core/services/organization.service.ts
    - Implement query, create, update, delete methods
    - Use generated TypeScript models
    - Integrate with ErrorHandlerService
    - _Requirements: 5.2, 5.4, 5.5_

  - [ ] 6.3 Create apps/web/src/app/core/services/application.service.ts
    - Implement query, create, update, delete methods
    - Use generated TypeScript models
    - Integrate with ErrorHandlerService
    - _Requirements: 5.3, 5.4, 5.5_

  - [ ] 6.4 Write unit tests for entity services
    - Test CRUD methods with mock data
    - Test error handling
    - _Requirements: 9.1, 9.3_

- [ ] 7. Checkpoint - Verify frontend integration
  - Ensure all tests pass, ask the user if questions arise.
  - Verify TypeScript compiles without errors
  - Verify services can be injected

- [ ] 8. Verify AppSync resolver configuration
  - [ ] 8.1 Check generated resolver templates
    - Verify DynamoDB resolvers use correct data source
    - Verify Lambda resolvers use correct data source
    - Verify response format follows contract
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 8.2 Update infrastructure/cloudformation/appsync.yml if needed
    - Ensure all resolvers are referenced
    - Ensure data sources are configured
    - _Requirements: 3.5_

  - [ ] 8.3 Write property test for schema-to-table consistency
    - **Property 3: Schema-to-Table Consistency**
    - **Validates: Requirements 7.1, 7.2, 7.3**

- [ ] 9. Update documentation
  - [ ] 9.1 Update docs/api.md with new GraphQL operations
    - Document all Query operations
    - Document all Mutation operations
    - Include example requests and responses
    - _Requirements: 10.1, 10.4_

  - [ ] 9.2 Update docs/schema.md with new schema definitions
    - Document new table schemas
    - Document entity relationships
    - _Requirements: 10.2_

  - [ ] 9.3 Update README.md to reflect completed state
    - Update project status
    - Update API documentation links
    - _Requirements: 10.3_

- [ ] 10. Version and changelog management
  - [ ] 10.1 Update CHANGELOG.md
    - Add new version section
    - Document all Added, Changed, Fixed items
    - Reference this spec
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 10.2 Update version in package.json if applicable
    - Bump minor version for new features
    - Ensure consistency across files
    - _Requirements: 8.4, 8.5_

- [ ] 11. Final checkpoint - Complete verification
  - Ensure all tests pass, ask the user if questions arise.
  - Run `orb-schema-generator validate`
  - Run `cd apps/api && pipenv run pytest`
  - Run `cd apps/web && npm test`
  - Verify documentation renders correctly
  - Commit with message: `feat: complete GraphQL API layer`

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Follow orb-templates spec standards for commits and issue comments
