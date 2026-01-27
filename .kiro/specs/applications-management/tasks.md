# Implementation Plan: Applications Management

## Overview

This implementation plan converts the applications feature from mock data to real GraphQL operations. The tasks follow the established patterns from the Organizations feature and are ordered to build incrementally with early validation.

## Tasks

- [x] 1. Create ApplicationService
  - [x] 1.1 Create `apps/web/src/app/core/services/application.service.ts`
    - Extend ApiService base class
    - Implement `generateUUID()` private method
    - Implement `createDraft(ownerId, organizationId)` method
    - Implement `createApplication(input)` method
    - Implement `updateApplication(input)` method
    - Implement `deleteApplication(applicationId)` method
    - Implement `getApplication(applicationId)` method
    - Implement `getApplicationsByOrganization(organizationId, limit?, nextToken?)` method
    - Use `toGraphQLInput` for timestamp conversion
    - Add error handling with user-friendly messages
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.9, 1.10_

  - [x] 1.2 Write unit tests for ApplicationService
    - Test createDraft returns PENDING status
    - Test createApplication with valid input
    - Test updateApplication with valid input
    - Test deleteApplication
    - Test getApplication returns correct data
    - Test getApplicationsByOrganization returns filtered list
    - Test error handling returns user-friendly messages
    - _Requirements: 6.1_

  - [x] 1.3 Write property test for CRUD round-trip
    - **Property 1: CRUD Round-Trip Consistency**
    - **Validates: Requirements 1.2, 1.3, 1.6**

- [x] 2. Checkpoint - Verify ApplicationService
  - Ensure all service tests pass
  - Verify service can be injected in components
  - Ask the user if questions arise

- [x] 3. Create NgRx Applications Store
  - [x] 3.1 Create `apps/web/src/app/features/customers/applications/store/applications.state.ts`
    - Define ApplicationsState interface
    - Define ApplicationTableRow interface
    - Define initial state
    - _Requirements: 5.1, 5.2_

  - [x] 3.2 Create `apps/web/src/app/features/customers/applications/store/applications.actions.ts`
    - Define load, loadSuccess, loadFailure actions
    - Define create, createSuccess, createFailure actions
    - Define update, updateSuccess, updateFailure actions
    - Define delete, deleteSuccess, deleteFailure actions
    - Define selectApplication action
    - Define filter actions (setSearchTerm, setOrganizationFilter, setStatusFilter)
    - _Requirements: 5.1_

  - [x] 3.3 Create `apps/web/src/app/features/customers/applications/store/applications.reducer.ts`
    - Handle all actions with state transitions
    - Update loading/error states appropriately
    - _Requirements: 5.1, 5.5_

  - [x] 3.4 Create `apps/web/src/app/features/customers/applications/store/applications.selectors.ts`
    - Create selectApplicationsState feature selector
    - Create selectAllApplications selector
    - Create selectFilteredApplications selector with search, org, status filters
    - Create selectSelectedApplication selector
    - Create selectIsLoading selector
    - Create selectError selector
    - _Requirements: 5.2, 5.4_

  - [x] 3.5 Create `apps/web/src/app/features/customers/applications/store/applications.effects.ts`
    - Implement loadApplications$ effect calling ApplicationService
    - Implement createApplication$ effect
    - Implement updateApplication$ effect
    - Implement deleteApplication$ effect
    - Handle errors and dispatch failure actions
    - _Requirements: 5.3_

  - [x] 3.6 Write unit tests for NgRx store
    - Test reducer state transitions
    - Test selectors return correct data
    - Test effects call service methods
    - _Requirements: 6.4_

  - [x] 3.7 Write property tests for store filtering
    - **Property 2: Organization Filter Correctness**
    - **Validates: Requirements 2.3**
    - **Property 3: Search Filter Correctness**
    - **Validates: Requirements 2.4**
    - **Property 9: Store Filter Consistency**
    - **Validates: Requirements 5.4**

  - [x] 3.8 Write property test for store error persistence
    - **Property 10: Store Error Persistence**
    - **Validates: Requirements 5.5**

- [x] 4. Checkpoint - Verify NgRx Store
  - Ensure all store tests pass
  - Verify store can be registered in module
  - Ask the user if questions arise

- [x] 5. Update ApplicationsListComponent to use DataGrid and Store
  - [x] 5.1 Update `applications-list.component.ts`
    - Remove mock data and getMockApplications method
    - Inject Store and dispatch loadApplications on init
    - Use selectors for data (filteredApplicationRows$, isLoading$)
    - Configure DataGrid columns with templates
    - Implement onRowClick to navigate to detail page
    - Implement onCreateApplication using create-on-click pattern
    - _Requirements: 2.1, 2.2, 2.7, 2.8, 2.9_

  - [x] 5.2 Update `applications-list.component.html`
    - Replace manual table with app-data-grid component
    - Add custom cell templates (appInfoCell, statusCell, roleCell, envCountCell)
    - Remove filters section (DataGrid handles filtering)
    - _Requirements: 2.1, 2.2, 2.10, 2.11_

  - [x] 5.3 Write unit tests for ApplicationsListComponent
    - Test data loading from store
    - Test row click navigation
    - Test create button behavior
    - _Requirements: 6.2_

  - [x] 5.4 Write property tests for list sorting and pagination
    - **Property 4: Sorting Correctness**
    - **Validates: Requirements 2.5**
    - **Property 5: Pagination Correctness**
    - **Validates: Requirements 2.6**

- [x] 6. Checkpoint - Verify Applications List
  - Ensure list displays real data from backend
  - Verify filtering, sorting, pagination work
  - Ask the user if questions arise

- [x] 7. Update ApplicationDetailPageComponent to use Service
  - [x] 7.1 Update `application-detail-page.component.ts`
    - Inject ApplicationService and OrganizationService
    - Load application data from service in loadApplication method
    - Load user's organizations for dropdown
    - Implement organization selection with auto-select for single org
    - Implement form validation for name and organizationId
    - Implement onSave to call service and change PENDING to ACTIVE
    - Implement onCancel to delete draft if PENDING
    - Implement onDelete with confirmation
    - _Requirements: 3.1, 3.2, 3.6, 3.7, 3.8, 4.1, 4.3, 4.4_

  - [x] 7.2 Update `application-detail-page.component.html`
    - Add organization dropdown field
    - Show "Create one first" message when no organizations
    - Ensure form validation error display
    - _Requirements: 3.3, 3.4, 3.5, 3.9, 3.10, 3.11, 4.2, 4.5_

  - [x] 7.3 Write unit tests for ApplicationDetailPageComponent
    - Test form validation
    - Test save flow for PENDING application
    - Test cancel deletes draft
    - Test organization dropdown loading
    - _Requirements: 6.3_

  - [x] 7.4 Write property tests for detail page
    - **Property 6: Status Transition on Save**
    - **Validates: Requirements 3.6**
    - **Property 7: Draft Deletion on Cancel**
    - **Validates: Requirements 3.7**
    - **Property 8: Validation Rejects Invalid Input**
    - **Validates: Requirements 3.8, 4.1**

- [x] 8. Checkpoint - Verify Application Detail Page
  - Ensure create flow works end-to-end
  - Ensure edit flow works end-to-end
  - Ensure delete flow works with confirmation
  - Ask the user if questions arise

- [x] 9. Register Store and Final Integration
  - [x] 9.1 Update applications module/routes to register NgRx store
    - Import StoreModule.forFeature('applications', applicationsReducer)
    - Import EffectsModule.forFeature([ApplicationsEffects])
    - _Requirements: 5.1_

  - [x] 9.2 Remove all remaining mock data references
    - Search for "mock" in applications feature files
    - Remove any hardcoded test data
    - _Requirements: 7.4_

  - [x] 9.3 Verify consistent styling with organizations
    - Compare list page styling
    - Compare detail page styling
    - Ensure same card header, button styles
    - _Requirements: 7.5_

- [x] 10. Documentation and Standards Compliance
  - [x] 10.1 Update CHANGELOG.md with changes
    - Add entry for applications management feature
    - List new files created
    - Reference this spec
    - _Requirements: 7.2_

  - [x] 10.2 Verify git commits follow standards
    - Ensure commit messages reference issue numbers
    - Use conventional commits format
    - _Requirements: 7.1_

  - [x] 10.3 Final consistency review
    - Verify terminology matches organizations feature
    - Check for any remaining TODO comments
    - _Requirements: 7.3_

- [x] 11. Final Checkpoint - Complete Feature Verification
  - Run all tests (unit and property-based)
  - Verify no linting errors
  - Test full user flow: list → create → edit → delete
  - Ensure all tests pass, ask the user if questions arise

## Notes

- All tasks are required (comprehensive from start)
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation follows the Organizations feature patterns for consistency
