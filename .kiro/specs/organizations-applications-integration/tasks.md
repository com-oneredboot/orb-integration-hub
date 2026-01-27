# Implementation Plan: Organizations-Applications Integration

## Overview

This implementation connects Organizations and Applications features by adding application count display, applications section on org detail page, and environment selection on app detail page. The implementation follows existing patterns and uses TypeScript/Angular with NgRx.

## Tasks

- [x] 1. Update Organizations schema and regenerate models
  - [x] 1.1 Add applicationCount attribute to Organizations.yml schema
    - Add `applicationCount` with type integer, required false, default 0
    - _Requirements: 1.1_
  - [x] 1.2 Run schema generator to regenerate models
    - Execute `pipenv run orb-schema generate`
    - Verify OrganizationsModel includes applicationCount
    - _Requirements: 1.1_

- [x] 2. Update OrganizationsListComponent for application count display
  - [x] 2.1 Update organizations-list.component.ts with click handler
    - Add `onApplicationCountClick` method for navigation
    - Import ActivatedRoute if needed
    - _Requirements: 1.4_
  - [x] 2.2 Update organizations-list.component.html appCountCell template
    - Make count clickable with button styling
    - Add aria-label for accessibility
    - _Requirements: 1.3, 1.4_
  - [x] 2.3 Update organizations-list.component.scss for count link styling
    - Add `.app-count-link` styles
    - _Requirements: 1.3_
  - [x] 2.4 Write unit tests for application count display and navigation
    - Test count renders from organization data
    - Test click navigates with query param
    - _Requirements: 1.2, 1.3, 1.4_
  - [x] 2.5 Write property test for organization rows applicationCount
    - **Property 1: Organization rows display applicationCount correctly**
    - **Validates: Requirements 1.2, 1.3**

- [x] 3. Update ApplicationsListComponent for organization filter
  - [x] 3.1 Add query parameter support for organization filter
    - Inject ActivatedRoute
    - Subscribe to queryParams and set organizationFilter
    - _Requirements: 1.4_
  - [x] 3.2 Write unit tests for query parameter filtering
    - Test filter applied from query param
    - _Requirements: 1.4_

- [x] 4. Checkpoint - Verify organization list integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Add Applications section to OrganizationDetailPageComponent
  - [x] 5.1 Update organization-detail-page.component.ts with applications loading
    - Add applications array, loading, and error properties
    - Add loadApplications method
    - Add syncApplicationCount method
    - Add onCreateApplication and onApplicationClick methods
    - _Requirements: 2.1, 2.4, 2.5, 2.9_
  - [x] 5.2 Update organization-detail-page.component.html with applications section
    - Add Applications card with loading, error, empty, and list states
    - Display app name, status badge, environment count
    - Add Create Application button
    - _Requirements: 2.2, 2.3, 2.6, 2.7, 2.8_
  - [x] 5.3 Update organization-detail-page.component.scss for applications section
    - Add styles for applications list, rows, empty state
    - _Requirements: 2.2_
  - [x] 5.4 Write unit tests for applications section
    - Test loading state display
    - Test applications list rendering
    - Test empty state display
    - Test error state display
    - Test navigation on row click
    - Test create application flow
    - _Requirements: 2.1-2.8_
  - [x] 5.5 Write property test for application list rendering
    - **Property 2: Application list renders with required fields**
    - **Validates: Requirements 2.2, 2.3**
  - [x] 5.6 Write property test for application count synchronization
    - **Property 3: Application count synchronization**
    - **Validates: Requirements 2.9, 2.10, 2.11**

- [x] 6. Checkpoint - Verify organization detail applications section
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Add environment selection to ApplicationDetailPageComponent
  - [x] 7.1 Update application-detail-page.component.ts with environment handling
    - Add environments to editForm
    - Add availableEnvironments constant
    - Add onEnvironmentToggle and isEnvironmentSelected methods
    - Update validateForm for environment validation
    - Update loadFormData to include environments
    - Update onSave to include environments
    - _Requirements: 3.1, 3.3, 3.4, 3.5_
  - [x] 7.2 Update application-detail-page.component.html with environment checkboxes
    - Add Environments section with checkboxes
    - Display validation error message
    - _Requirements: 3.1, 3.2, 3.6_
  - [x] 7.3 Update application-detail-page.component.scss for environment section
    - Add styles for checkbox grid layout
    - _Requirements: 3.1_
  - [x] 7.4 Write unit tests for environment selection
    - Test checkboxes render for all environments
    - Test toggle updates form state
    - Test validation error on empty
    - Test save includes environments
    - _Requirements: 3.1-3.6_
  - [x] 7.5 Write property test for environment toggle
    - **Property 4: Environment toggle updates form state**
    - **Validates: Requirements 3.3**
  - [x] 7.6 Write property test for save persists environments
    - **Property 5: Save persists environments**
    - **Validates: Requirements 3.4**
  - [x] 7.7 Write property test for empty environments validation
    - **Property 6: Empty environments validation**
    - **Validates: Requirements 3.5**

- [x] 8. Checkpoint - Verify application environment selection
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement cross-feature store synchronization
  - [x] 9.1 Update ApplicationDetailPageComponent.onDelete() to decrement organization applicationCount
    - After successful delete, call OrganizationService.updateOrganization() to decrement count
    - Follow same pattern as syncApplicationCount() in OrganizationDetailPageComponent
    - _Requirements: 2.11, 4.2_
  - [x] 9.2 Update OrganizationDetailPageComponent.onCreateApplication() to increment applicationCount
    - After navigating to create new application, increment count when application is saved
    - Note: Already handled by syncApplicationCount() on next load - no changes needed
    - _Requirements: 2.10_
  - [x] 9.3 Verify store refresh patterns work correctly
    - OrganizationsActions.loadOrganizations() is dispatched after application delete
    - ApplicationsEffects.refreshAfterSuccessfulOperation$ dispatches loadApplications() after delete
    - Note: ApplicationsListComponent loads directly from services, not store (to be addressed in store-centric refactoring spec)
    - _Requirements: 4.1, 4.2_
  - [x] 9.4 Write property test for store updates on create
    - **Property 7: Applications store updates on create**
    - **Validates: Requirements 4.1**
  - [x] 9.5 Write property test for count update on delete
    - **Property 8: Organizations store updates count on delete**
    - **Validates: Requirements 4.2**

- [x] 10. Update CHANGELOG and version
  - Add feature entry to CHANGELOG.md
  - _Requirements: Standard spec requirements_

- [x] 11. Final checkpoint - Run all tests and verify
  - Run `npm test` in apps/web
  - Verify no linting errors with `npm run lint`
  - Ensure all tests pass, ask the user if questions arise.
  - Note: 159 tests for organizations and applications pass. Pre-existing failures in error-handler service tests are unrelated to this spec.

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Schema change (Task 1) must be completed first as other tasks depend on regenerated models
