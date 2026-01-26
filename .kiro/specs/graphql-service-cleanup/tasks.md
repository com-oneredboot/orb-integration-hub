# Implementation Plan: GraphQL Service Cleanup

## Overview

This implementation plan standardizes GraphQL service implementations to use the v0.19.0 response format.

**Status:** orb-schema-generator #79 is now FIXED in v0.19.1. Upgrade to v0.19.1 and regenerate schemas.

## Tasks

- [x] 1. Create error types and base infrastructure
  - [x] 1.1 Create `apps/web/src/app/core/errors/api-errors.ts` with ApiError, AuthenticationError, NetworkError classes
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [x] 1.2 Create `apps/web/src/app/core/types/graphql.types.ts` with Connection<T> and GraphQLResponseEnvelope<T> interfaces
    - _Requirements: 2.2, 3.1, 3.2_
  - [x] 1.3 Write unit tests for error types
    - _Requirements: 5.1, 5.2_

- [x] 2. Enhance ApiService base class
  - [x] 2.1 Add `executeMutation<T>()` method that extracts `item` from v0.19.0 envelope
    - _Requirements: 1.1, 1.2, 1.3, 4.1_
  - [x] 2.2 Add `executeGetQuery<T>()` method that extracts `item` from v0.19.0 envelope
    - _Requirements: 2.1, 4.2_
  - [x] 2.3 Add `executeListQuery<T>()` method that extracts `items` from v0.19.0 envelope
    - _Requirements: 2.2, 4.2_
  - [x] 2.4 Update `handleGraphQLError()` to use envelope `success` and `message` fields
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 4.3_
  - [x] 2.5 Write property test for error type mapping
    - **Property 2: Error Response Handling**
    - **Validates: Requirements 1.4, 2.4, 6.1, 6.2, 6.3, 6.4**
  - [x] 2.6 Write unit tests for base class methods
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 3. Checkpoint - Upgrade to v0.19.1 and Regenerate Schemas
  - ✅ Issue #79 fixed in v0.19.1
  - Upgrade orb-schema-generator to v0.19.1
  - Regenerate schemas with `pipenv run orb-schema generate`
  - Verify TypeScript GraphQL queries have correct format

- [x] 4. Update OrganizationService
  - [x] 4.1 Update imports to use new operation names (`ListByOwnerId` instead of `QueryByOwnerId`, add `OrganizationsGet`)
    - _Requirements: 7.1, 7.4_
  - [x] 4.2 Refactor `createDraft()` to use `executeMutation()` and remove workaround code
    - _Requirements: 1.1, 7.1, 7.2, 7.3_
  - [x] 4.3 Refactor `createOrganization()` to use `executeMutation()`
    - _Requirements: 1.1, 7.1_
  - [x] 4.4 Refactor `updateOrganization()` to use `executeMutation()`
    - _Requirements: 1.2, 7.1_
  - [x] 4.5 Refactor `deleteOrganization()` to use `executeMutation()`
    - _Requirements: 1.3, 7.1_
  - [x] 4.6 Refactor `getOrganization()` to use `executeGetQuery()` with new `OrganizationsGet` operation
    - _Requirements: 2.1, 7.1_
  - [x] 4.7 Refactor `getUserOrganizations()` to use `executeListQuery()` with `OrganizationsListByOwnerId`
    - _Requirements: 2.2, 7.1_
  - [x] 4.8 Remove custom response types (`OrganizationsResponse`, `OrganizationsCreateResponse`, etc.)
    - _Requirements: 3.3, 7.4_
  - [ ] 4.9 Write property test for mutation response handling
    - **Property 1: Mutation Response Direct Return**
    - **Validates: Requirements 1.1, 1.2, 1.3**
  - [x] 4.10 Write unit tests for OrganizationService
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 4b. Update Organization Components and Effects
  - [x] 4b.1 Update `organizations-list.component.ts` to handle direct `IOrganizations` return
  - [x] 4b.2 Update `organizations.effects.ts` to handle `Connection<IOrganizations>` and `IOrganizations` directly

- [x] 5. Checkpoint - Verify OrganizationService
  - ✅ All 73 tests pass (25 api-errors, 21 api.service, 9 api.service.property, 18 organization.service)
  - ✅ Build passes
  - ✅ Lint passes
  - ✅ Fixed organizations.selectors.ts to handle undefined state in tests

- [ ] 6. Update remaining services
  - [ ] 6.1 Update UserService to use new patterns (complex - has Cognito integration, legacy response types)
    - _Requirements: 4.4_
    - Note: UserService uses legacy `StatusCode`, `Message`, `Data` wrappers - requires careful migration
  - [x] 6.2 ~~Update ApplicationService to use new patterns~~ (N/A - ApplicationService does not exist)
    - _Requirements: 4.4_
  - [x] 6.3 ~~Update any other services using GraphQL~~ (N/A - only OrganizationService and UserService extend ApiService)
    - _Requirements: 4.4_
  - [ ] 6.4 Write unit tests for updated services
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 7. Update documentation
  - [x] 7.1 Create steering file `.kiro/steering/graphql-services.md` with patterns
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [x] 7.2 ~~Update coding standards in `repositories/orb-templates/docs/coding-standards/`~~ (N/A - repositories/ is READ-ONLY)
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
    - Note: Steering file `.kiro/steering/graphql-services.md` serves as project-level documentation

- [ ] 8. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Run `npm run build` to verify no TypeScript errors
  - Run `npm run lint` to verify no linting issues

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Issue #79 is FIXED in v0.19.1 - upgrade and regenerate schemas
