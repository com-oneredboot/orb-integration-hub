# Implementation Plan: Application Users Management

## Overview

This implementation plan breaks down the Application Users Management feature into discrete coding tasks. The approach follows a schema-driven development workflow: update schemas, generate code, implement Lambda function logic, create frontend component, and integrate everything together.

## Tasks

- [x] 1. Remove ApplicationUsers table and regenerate code
  - Delete `schemas/tables/ApplicationUsers.yml`
  - Run `pipenv run orb-schema generate` to remove generated code
  - Verify ApplicationUsers GraphQL operations are removed from schema
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Update ApplicationUserRoles schema
  - [x] 2.1 Modify ApplicationUserRoles schema file
    - Change `type: dynamodb` to `type: lambda-dynamodb` in `schemas/tables/ApplicationUserRoles.yml`
    - Add `organizationId` attribute (type: string, required: true)
    - Add `organizationName` attribute (type: string, required: true)
    - Add `applicationName` attribute (type: string, required: true)
    - Bump version to '1.1'
    - _Requirements: 2.1, 2.3, 2.4, 2.5_
  
  - [x] 2.2 Write unit test for schema validation
    - Verify schema file contains type: lambda-dynamodb
    - Verify all required attributes are present
    - Verify all GSI indexes are maintained
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Generate updated code from schemas
  - Run `pipenv run orb-schema generate`
  - Verify Python models include new attributes
  - Verify TypeScript models include new attributes
  - Verify GraphQL schema includes GetApplicationUsers query
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 4. Implement GetApplicationUsers Lambda function
  - [x] 4.1 Create Lambda function file structure
    - Create `apps/api/lambdas/get_application_users.py`
    - Define input/output interfaces matching design
    - Set up logging and error handling framework
    - _Requirements: 3.1_
  
  - [x] 4.2 Implement input validation logic
    - Validate environment filter requires org/app filter
    - Validate limit is between 1 and 100
    - Validate environment value is valid enum
    - Return appropriate error codes for validation failures
    - _Requirements: 3.1, 3.4_
  
  - [x] 4.3 Write property test for input validation
    - **Property 1: Input Validation**
    - **Validates: Requirements 3.1, 3.4**
  
  - [x] 4.4 Implement authorization logic
    - Extract Cognito groups from request context
    - For CUSTOMER: get owned organizationIds and filter
    - For EMPLOYEE/OWNER: allow all organizations
    - Return authorization error for unauthorized users
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 4.5 Write property test for authorization filtering
    - **Property 3: Authorization Filtering**
    - **Validates: Requirements 6.3, 6.4**
  
  - [x] 4.6 Implement query strategy selection
    - Select AppEnvUserIndex GSI when applicationIds provided
    - Select ORG_TO_APP_TO_ROLES strategy when only organizationIds provided
    - Select SCAN_WITH_AUTH when no filters provided
    - _Requirements: 3.2, 3.3, 3.5, 3.6, 3.7_
  
  - [x] 4.7 Implement DynamoDB query execution
    - Query ApplicationUserRoles using selected GSI
    - Apply environment filter if provided
    - Handle pagination with limit and nextToken
    - _Requirements: 3.2, 3.3, 3.5, 3.6, 3.11_
  
  - [x] 4.8 Write property test for filter application
    - **Property 2: Filter Application**
    - **Validates: Requirements 3.2, 3.3, 3.5, 3.6**
  
  - [x] 4.9 Write property test for no filters behavior
    - **Property 9: No Filters Returns All Accessible**
    - **Validates: Requirements 3.7**
  
  - [x] 4.10 Implement user deduplication and grouping
    - Deduplicate role assignments by userId
    - Group all role assignments under each user
    - _Requirements: 3.8, 3.10_
  
  - [x] 4.11 Write property test for deduplication and grouping
    - **Property 4: User Deduplication and Grouping**
    - **Validates: Requirements 3.8, 3.10**
  
  - [x] 4.12 Implement user enrichment
    - Batch get user details from Users table
    - Join firstName, lastName with role assignments
    - Handle missing users gracefully
    - _Requirements: 3.9_
  
  - [x] 4.13 Write property test for user enrichment
    - **Property 5: User Enrichment**
    - **Validates: Requirements 3.9**
  
  - [x] 4.14 Implement result sorting
    - Sort users by lastName then firstName
    - Maintain sort order across pagination
    - _Requirements: 3.12_
  
  - [x] 4.15 Write property test for result sorting
    - **Property 6: Result Sorting**
    - **Validates: Requirements 3.12**
  
  - [x] 4.16 Write property test for pagination limit
    - **Property 7: Pagination Limit**
    - **Validates: Requirements 3.11**
  
  - [x] 4.17 Implement error handling
    - Catch validation errors and return ORB-VAL-* codes
    - Catch authorization errors and return ORB-AUTH-* codes
    - Catch database errors and return ORB-DB-* codes
    - Log all errors to CloudWatch with context
    - _Requirements: 3.13_
  
  - [x] 4.18 Write property test for error handling
    - **Property 8: Error Handling**
    - **Validates: Requirements 3.13**
  
  - [x] 4.19 Write unit tests for Lambda edge cases
    - Test empty results
    - Test single user result
    - Test maximum pagination limit
    - Test missing Users table records
    - _Requirements: 3.1-3.13_

- [x] 5. Checkpoint - Ensure Lambda tests pass
  - Run `cd apps/api && pipenv run pytest tests/lambdas/test_get_application_users.py -v`
  - Verify all property tests pass (minimum 100 iterations each)
  - Verify all unit tests pass
  - Fix any failing tests before proceeding

- [x] 6. Create frontend GraphQL query definition
  - [x] 6.1 Create GetApplicationUsers query file
    - Create `apps/web/src/app/core/graphql/get-application-users.graphql.ts`
    - Define query matching generated schema
    - Define input and output TypeScript interfaces
    - _Requirements: 4.1_
  
  - [x] 6.2 Write unit test for query definition
    - Verify query syntax is valid
    - Verify query matches generated schema
    - _Requirements: 4.1_

- [ ] 7. Implement ApplicationUsersListComponent
  - [x] 7.1 Generate component and set up structure
    - Run `ng generate component features/application-users/application-users-list`
    - Set up component class with state properties
    - Set up dependency injection (Apollo, ActivatedRoute)
    - _Requirements: 4.1_
  
  - [x] 7.2 Implement filter initialization from route
    - Extract appId and env from route parameters
    - Initialize selectedApplicationIds and selectedEnvironment
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 7.3 Write property test for route-based filtering
    - **Property 11: Route-Based Filter Application**
    - **Validates: Requirements 5.4**
  
  - [x] 7.4 Implement loadUsers method
    - Build GraphQL query variables from filters
    - Execute Apollo query
    - Handle loading state
    - Handle error state
    - Update users array with results
    - Store nextToken for pagination
    - _Requirements: 4.7, 4.8_
  
  - [x] 7.5 Implement filter change handler
    - Reset pagination state
    - Call loadUsers with new filters
    - _Requirements: 4.6, 4.7_
  
  - [x] 7.6 Implement user expansion toggle
    - Track expanded user IDs in Set
    - Toggle expansion on row click
    - _Requirements: 4.11_
  
  - [x] 7.7 Implement helper methods
    - getEnvironmentsForUser: extract unique environments
    - getRoleCountForUser: count role assignments
    - _Requirements: 4.1_
  
  - [x] 7.8 Implement pagination controls
    - nextPage: load next page with nextToken
    - Disable previous button (DynamoDB limitation)
    - _Requirements: 4.10_
  
  - [ ] 7.9 Write unit tests for component logic
    - Test filter initialization from route
    - Test loadUsers with different filter combinations
    - Test user expansion toggle
    - Test pagination controls
    - _Requirements: 4.1-4.13_

- [ ] 8. Create component template
  - [x] 8.1 Create filter controls section
    - Add organization multi-select dropdown
    - Add application multi-select dropdown
    - Add environment single-select dropdown
    - Wire up to component filter properties
    - _Requirements: 4.4, 4.5, 4.6_
  
  - [x] 8.2 Create users table
    - Add columns: userId, name, roles count, environments, expand button
    - Wire up to users array
    - Add expandable row for role details
    - _Requirements: 4.1, 4.2, 4.11, 4.12_
  
  - [ ] 8.3 Write property test for PII exclusion
    - **Property 10: PII Exclusion**
    - **Validates: Requirements 4.2**
  
  - [x] 8.4 Create loading state
    - Add mat-spinner with *ngIf="loading"
    - _Requirements: 4.8_
  
  - [x] 8.5 Create error state
    - Add mat-error with *ngIf="error"
    - Display error message
    - _Requirements: 4.8_
  
  - [x] 8.6 Create empty state
    - Add empty state message when users.length === 0
    - _Requirements: 4.9_
  
  - [x] 8.7 Create pagination controls
    - Add next button with nextToken check
    - Add page number display
    - Disable previous button
    - _Requirements: 4.10_
  
  - [ ] 8.8 Write unit tests for template rendering
    - Test filter controls render
    - Test table renders with data
    - Test loading state displays
    - Test error state displays
    - Test empty state displays
    - Test pagination controls render
    - _Requirements: 4.1-4.13_

- [x] 9. Add component styling
  - Create `application-users-list.component.scss`
  - Style filter controls section
  - Style users table
  - Style expanded row details
  - Style loading/error/empty states
  - Style pagination controls
  - _Requirements: 4.1_

- [ ] 10. Configure routing
  - [x] 10.1 Add routes to routing module
    - Add route: `/customers/users` → ApplicationUsersListComponent
    - Add route: `/customers/applications/:appId/users` → ApplicationUsersListComponent
    - Add route: `/customers/applications/:appId/environments/:env/users` → ApplicationUsersListComponent
    - _Requirements: 4.13, 5.1, 5.2, 5.3_
  
  - [ ] 10.2 Write unit tests for routing configuration
    - Test each route resolves to correct component
    - Test route parameters are extracted correctly
    - _Requirements: 4.13, 5.1, 5.2, 5.3_

- [ ] 11. Checkpoint - Ensure frontend tests pass
  - Run `cd apps/web && npm test`
  - Verify all property tests pass
  - Verify all unit tests pass
  - Fix any failing tests before proceeding

- [ ] 12. Update documentation
  - [ ] 12.1 Update user-management-views.md
    - Remove ApplicationUsers table references
    - Update query strategy section to reflect Lambda implementation
    - Update implementation status to "✅ Implemented"
    - _Requirements: 7.1_
  
  - [ ] 12.2 Update schema.md
    - Document ApplicationUserRoles schema changes
    - Add organizationId, organizationName, applicationName attributes
    - Document lambda-dynamodb type
    - Remove ApplicationUsers table documentation
    - _Requirements: 7.2_
  
  - [ ] 12.3 Update api.md
    - Document GetApplicationUsers query
    - Add input/output interfaces
    - Add error codes table
    - Add usage examples
    - _Requirements: 7.3_
  
  - [ ] 12.4 Add inline code comments
    - Comment Lambda query strategy selection logic
    - Comment authorization logic
    - Comment user enrichment logic
    - Comment frontend filter initialization logic
    - _Requirements: 7.4_
  
  - [ ] 12.5 Verify documentation quality
    - Check for duplication across docs
    - Verify consistent terminology
    - Verify cross-references are correct
    - _Requirements: 7.5, 7.6_

- [ ] 13. Update version and changelog
  - [ ] 13.1 Bump version
    - Update version in `pyproject.toml` (backend)
    - Update version in `package.json` (frontend)
    - Follow semantic versioning (minor version bump for new feature)
    - _Requirements: 8.1_
  
  - [ ] 13.2 Update CHANGELOG.md
    - Add new version section
    - Document feature: "Application Users Management"
    - Include issue numbers
    - Follow format: "- Feature description (#issue)"
    - _Requirements: 8.2, 8.3, 8.4_

- [ ] 14. Final verification
  - [ ] 14.1 Run all tests
    - Backend: `cd apps/api && pipenv run pytest -v`
    - Frontend: `cd apps/web && npm test`
    - Verify all tests pass
    - _Requirements: 10.1, 10.2_
  
  - [ ] 14.2 Run linting
    - Backend: `cd apps/api && pipenv run ruff check . --fix`
    - Frontend: `cd apps/web && npm run lint`
    - Fix any linting errors
    - _Requirements: 10.3_
  
  - [ ] 14.3 Run type checking
    - Backend: `cd apps/api && pipenv run mypy src/`
    - Frontend: `cd apps/web && npm run typecheck`
    - Fix any type errors
    - _Requirements: 10.4_
  
  - [ ] 14.4 Verify documentation
    - Check all docs render correctly
    - Verify no broken links
    - _Requirements: 10.5_
  
  - [ ] 14.5 Verify version and changelog
    - Confirm version bumped in both backend and frontend
    - Confirm CHANGELOG.md updated
    - _Requirements: 10.6_
  
  - [ ] 14.6 Verify git commits
    - Confirm all commits reference issue numbers
    - Confirm commits follow conventional commits format
    - _Requirements: 10.7_

- [ ] 15. Integration testing
  - [ ] 15.1 End-to-end test
    - Create test role assignments in DynamoDB
    - Query via GraphQL API
    - Verify results in frontend component
    - Clean up test data
    - _Requirements: 3.1-3.13, 4.1-4.13_
  
  - [ ] 15.2 Authorization integration test
    - Test as CUSTOMER user
    - Verify only owned organizations returned
    - Test as EMPLOYEE user
    - Verify all organizations returned
    - _Requirements: 6.1-6.5_
  
  - [ ] 15.3 Multi-filter integration test
    - Apply organization + application + environment filters
    - Verify correct results returned
    - Verify result count matches expectations
    - _Requirements: 3.2, 3.3, 3.5, 3.6_

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (minimum 100 iterations each)
- Unit tests validate specific examples and edge cases
- Schema-driven development: modify YAML schemas, run generator, implement logic
- Frontend is the only manually written component (besides Lambda function logic)
