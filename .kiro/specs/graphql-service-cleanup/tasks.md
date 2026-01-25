# Implementation Plan: GraphQL Service Cleanup

## Overview

This implementation plan standardizes GraphQL service implementations to use the v0.19.0 response format. The work is blocked by issue #79 (TypeScript query generator) but we can prepare the infrastructure.

**Blocker:** orb-schema-generator #79 must be fixed before tasks 3-6 can be completed.

## Tasks

- [ ] 1. Create error types and base infrastructure
  - [ ] 1.1 Create `apps/web/src/app/core/errors/api-errors.ts` with ApiError, AuthenticationError, NetworkError classes
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [ ] 1.2 Create `apps/web/src/app/core/types/graphql.types.ts` with Connection<T> and GraphQLResponseEnvelope<T> interfaces
    - _Requirements: 2.2, 3.1, 3.2_
  - [ ] 1.3 Write unit tests for error types
    - _Requirements: 5.1, 5.2_

- [ ] 2. Enhance ApiService base class
  - [ ] 2.1 Add `executeMutation<T>()` method that extracts `item` from v0.19.0 envelope
    - _Requirements: 1.1, 1.2, 1.3, 4.1_
  - [ ] 2.2 Add `executeGetQuery<T>()` method that extracts `item` from v0.19.0 envelope
    - _Requirements: 2.1, 4.2_
  - [ ] 2.3 Add `executeListQuery<T>()` method that extracts `items` from v0.19.0 envelope
    - _Requirements: 2.2, 4.2_
  - [ ] 2.4 Update `handleGraphQLError()` to use envelope `success` and `message` fields
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 4.3_
  - [ ] 2.5 Write property test for error type mapping
    - **Property 2: Error Response Handling**
    - **Validates: Requirements 1.4, 2.4, 6.1, 6.2, 6.3, 6.4**
  - [ ] 2.6 Write unit tests for base class methods
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 3. Checkpoint - Wait for #79 fix
  - Ensure orb-schema-generator #79 is fixed and v0.19.x is released
  - Regenerate schemas with `pipenv run orb-schema generate`
  - Verify TypeScript GraphQL queries have correct format

- [ ] 4. Update OrganizationService
  - [ ] 4.1 Update imports to use new operation names (`ListByOwnerId` instead of `QueryByOwnerId`, add `OrganizationsGet`)
    - _Requirements: 7.1, 7.4_
  - [ ] 4.2 Refactor `createDraft()` to use `executeMutation()` and remove workaround code
    - _Requirements: 1.1, 7.1, 7.2, 7.3_
  - [ ] 4.3 Refactor `createOrganization()` to use `executeMutation()`
    - _Requirements: 1.1, 7.1_
  - [ ] 4.4 Refactor `updateOrganization()` to use `executeMutation()`
    - _Requirements: 1.2, 7.1_
  - [ ] 4.5 Refactor `deleteOrganization()` to use `executeMutation()`
    - _Requirements: 1.3, 7.1_
  - [ ] 4.6 Refactor `getOrganization()` to use `executeGetQuery()` with new `OrganizationsGet` operation
    - _Requirements: 2.1, 7.1_
  - [ ] 4.7 Refactor `getUserOrganizations()` to use `executeListQuery()` with `OrganizationsListByOwnerId`
    - _Requirements: 2.2, 7.1_
  - [ ] 4.8 Remove custom response types (`OrganizationsResponse`, `OrganizationsCreateResponse`, etc.)
    - _Requirements: 3.3, 7.4_
  - [ ] 4.9 Write property test for mutation response handling
    - **Property 1: Mutation Response Direct Return**
    - **Validates: Requirements 1.1, 1.2, 1.3**
  - [ ] 4.10 Write unit tests for OrganizationService
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 5. Checkpoint - Verify OrganizationService
  - Ensure all tests pass, ask the user if questions arise.
  - Verify organization CRUD operations work end-to-end

- [ ] 6. Update remaining services
  - [ ] 6.1 Update UserService to use new patterns
    - _Requirements: 4.4_
  - [ ] 6.2 Update ApplicationService to use new patterns
    - _Requirements: 4.4_
  - [ ] 6.3 Update any other services using GraphQL
    - _Requirements: 4.4_
  - [ ] 6.4 Write unit tests for updated services
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 7. Update documentation
  - [ ] 7.1 Create steering file `.kiro/steering/graphql-services.md` with patterns
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [ ] 7.2 Update coding standards in `repositories/orb-templates/docs/coding-standards/` (if writable)
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

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
- Task 3 is a hard blocker - cannot proceed until #79 is fixed
