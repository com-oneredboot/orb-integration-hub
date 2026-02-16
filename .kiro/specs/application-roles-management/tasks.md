# Implementation Plan: Application Roles Management

## Overview

This implementation plan covers two main areas:
1. Removing the legacy Roles table schema and renaming enums
2. Adding a Roles tab to the Application Detail Page for managing ApplicationRoles

The implementation follows existing patterns in the codebase, particularly the Environments tab and NgRx store-first architecture.

## Tasks

- [x] 1. Schema cleanup - Remove legacy Roles table and rename enums
  - [x] 1.1 Create `schemas/registries/ApplicationRoleType.yml` with UNKNOWN, ADMIN, USER, GUEST, CUSTOM values
    - Copy structure from existing `RoleType.yml`
    - Update name to `ApplicationRoleType`
    - Update description to "Types of application roles"
    - _Requirements: 1.6_
  
  - [x] 1.2 Update `schemas/tables/ApplicationRoles.yml` to use new enums
    - Change `enum_type: RoleType` to `enum_type: ApplicationRoleType`
    - Change `enum_type: RoleStatus` to `enum_type: ApplicationRoleStatus`
    - _Requirements: 1.7, 1.8_
  
  - [x] 1.3 Delete legacy schema files
    - Delete `schemas/tables/Roles.yml`
    - Delete `schemas/registries/RoleType.yml`
    - Delete `schemas/registries/RoleStatus.yml`
    - _Requirements: 1.1, 1.9, 1.10_
  
  - [x] 1.4 Run schema generator and verify output
    - Run `pipenv run orb-schema generate`
    - Verify `RolesModel.py` is removed from `apps/api/models/`
    - Verify `RolesModel.ts` is removed from `apps/web/src/app/core/models/`
    - Verify `roles_table.py` is removed from `infrastructure/cdk/generated/tables/`
    - Verify `ApplicationRoleType` enum is generated
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [x] 2. CDK infrastructure cleanup
  - [x] 2.1 Remove `_create_roles_table` method from `infrastructure/cdk/stacks/dynamodb_stack.py`
    - Delete the entire `_create_roles_table` method
    - Remove the call to `self._create_roles_table()` from the constructor
    - _Requirements: 2.1, 2.2_
  
  - [x] 2.2 Remove Roles table tests from `infrastructure/cdk/tests/test_dynamodb_stack.py`
    - Delete the `TestDynamoDBStackRolesTable` test class
    - _Requirements: 2.3_
  
  - [x] 2.3 Verify CDK synth succeeds
    - Run `cd infrastructure && pipenv run cdk synth`
    - Verify no errors related to Roles table
    - Note: Removed `"Roles": dynamodb_stack.tables["roles"]` from appsync_stack.py
    - _Requirements: 2.4_

- [x] 3. Checkpoint - Schema and infrastructure cleanup complete
  - Ensure schema generator runs without errors
  - Ensure CDK synth succeeds
  - Ask the user if questions arise

- [x] 4. Create NgRx store for ApplicationRoles
  - [x] 4.1 Create `apps/web/src/app/features/customers/applications/store/application-roles/application-roles.state.ts`
    - Define `ApplicationRoleTableRow` interface
    - Define `ApplicationRolesState` interface
    - Define `initialApplicationRolesState`
    - Follow environments store pattern
    - _Requirements: 8.1_
  
  - [x] 4.2 Create `apps/web/src/app/features/customers/applications/store/application-roles/application-roles.actions.ts`
    - Define actions for load, create, update, deactivate, delete
    - Define filter actions (search, status, roleType)
    - Define dialog actions (open/close create/edit)
    - Define error clearing actions
    - _Requirements: 8.2, 8.4_
  
  - [x] 4.3 Create `apps/web/src/app/features/customers/applications/store/application-roles/application-roles.reducer.ts`
    - Implement reducer with filter computation in state
    - Build roleRows from raw data in loadSuccess
    - Compute filteredRoleRows when filters change
    - Include helper functions for filtering and formatting
    - _Requirements: 8.5_
  
  - [ ]* 4.4 Write property tests for reducer filter computation
    - **Property 11: Reducer Filter Computation**
    - **Validates: Requirements 8.5**
  
  - [x] 4.5 Create `apps/web/src/app/features/customers/applications/store/application-roles/application-roles.selectors.ts`
    - Create simple state accessor selectors
    - Follow organizations selector pattern
    - _Requirements: 8.1_
  
  - [x] 4.6 Create `apps/web/src/app/features/customers/applications/store/application-roles/application-roles.effects.ts`
    - Implement load effect using `ApplicationRolesListByApplicationId` query
    - Implement create effect using `ApplicationRolesCreate` mutation
    - Implement update effect using `ApplicationRolesUpdate` mutation
    - Implement deactivate effect using `ApplicationRolesDisable` mutation
    - Implement delete effect using `ApplicationRolesDelete` mutation
    - _Requirements: 8.6, 9.1, 9.2, 9.3, 9.4_
  
  - [ ]* 4.7 Write property tests for unique ID generation
    - **Property 12: Unique ID Generation**
    - **Validates: Requirements 9.3**
  
  - [x] 4.8 Create `apps/web/src/app/features/customers/applications/store/application-roles/index.ts`
    - Export all store elements
    - _Requirements: 8.1_
  
  - [x] 4.9 Register store in applications module
    - Add `ApplicationRolesReducer` to store configuration
    - Add `ApplicationRolesEffects` to effects configuration
    - _Requirements: 8.1_

- [x] 5. Checkpoint - NgRx store complete
  - Ensure all store files compile without errors
  - Ensure store is properly registered
  - Ask the user if questions arise

- [x] 6. Create ApplicationRoles list component
  - [x] 6.1 Create `apps/web/src/app/features/customers/applications/components/application-roles-list/` directory structure
    - Create `application-roles-list.component.ts`
    - Create `application-roles-list.component.html`
    - Create `application-roles-list.component.scss`
    - _Requirements: 4.1_
  
  - [x] 6.2 Implement ApplicationRolesListComponent
    - Use DataGridComponent for table display
    - Subscribe to store selectors for data
    - Dispatch load action on init
    - Implement filter change handlers
    - Implement row click handler for edit dialog
    - _Requirements: 4.1, 4.7, 8.1, 8.2, 8.4_
  
  - [x] 6.3 Implement DataGrid columns and cell templates
    - Role name column with primary styling
    - Role type column with badge
    - Description column
    - Status column with status badge
    - Last updated column with relative time
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [ ]* 6.4 Write property tests for role display completeness
    - **Property 3: Role Display Completeness**
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6**

- [x] 7. Create role dialog components
  - [x] 7.1 Create `apps/web/src/app/features/customers/applications/components/create-role-dialog/` component
    - Implement form with roleName, roleType, description fields
    - Implement validation (required, max lengths)
    - Dispatch create action on submit
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [ ]* 7.2 Write property tests for form validation
    - **Property 4: Form Validation Enforcement**
    - **Validates: Requirements 5.2, 5.3, 5.4**
  
  - [x] 7.3 Create `apps/web/src/app/features/customers/applications/components/edit-role-dialog/` component
    - Pre-populate form with current role values
    - Implement save, deactivate, delete actions
    - Show deactivate button only for ACTIVE roles
    - Show delete confirmation dialog
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  
  - [ ]* 7.4 Write property tests for edit dialog
    - **Property 6: Edit Dialog Pre-population**
    - **Property 8: Action Button Enabled State**
    - **Validates: Requirements 6.1, 7.1, 7.2**

- [x] 8. Integrate Roles tab into Application Detail Page
  - [x] 8.1 Update `application-detail-page.component.ts` to add Roles tab
    - Add 'roles' to ApplicationDetailTab enum
    - Add Roles tab to tabs array with 'user-tag' icon
    - Add badge showing active roles count
    - Hide/disable tab for draft applications
    - _Requirements: 3.1, 3.2, 3.4, 3.5_
  
  - [x] 8.2 Update `application-detail-page.component.html` to render Roles tab panel
    - Add tab panel for roles
    - Render ApplicationRolesListComponent when tab is active
    - _Requirements: 3.3_
  
  - [ ]* 8.3 Write property tests for tab enabled state
    - **Property 1: Tab Enabled Based on Application Status**
    - **Property 2: Role Count Badge Accuracy**
    - **Validates: Requirements 3.1, 3.2, 3.4**

- [x] 9. Checkpoint - Frontend components complete
  - Ensure all components compile without errors
  - Ensure Roles tab appears for active applications
  - Ensure CRUD operations work correctly
  - Ask the user if questions arise

- [x] 10. Implement default roles creation
  - [x] 10.1 Update application activation logic to create default roles
    - Create Owner role (ADMIN type)
    - Create Administrator role (ADMIN type)
    - Create User role (USER type)
    - Create Guest role (GUEST type)
    - All with ACTIVE status
    - Handle errors gracefully (log but don't block activation)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_
  
  - [ ]* 10.2 Write property tests for default roles creation
    - **Property 13: Default Roles on Activation**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6**

- [x] 11. Documentation and cleanup
  - [x] 11.1 Update `docs/schema.md` to remove references to legacy Roles table
    - Remove any mentions of the Roles table
    - Clarify ApplicationRoles is the only roles table
    - Document relationship between ApplicationRoles and ApplicationUserRoles
    - _Requirements: 11.1, 11.2, 11.3_
  
  - [x] 11.2 Update CHANGELOG.md
    - Add entry for legacy Roles table removal
    - Add entry for Roles tab feature
    - Include issue numbers if applicable
    - _Requirements: 12.1, 12.2, 12.3_

- [x] 12. Final verification
  - [x] 12.1 Run all tests
    - Run `cd apps/api && pipenv run pytest`
    - Run `cd apps/web && npm test`
    - Run `cd infrastructure && pipenv run pytest`
    - _Requirements: 14.1, 14.2_
  
  - [x] 12.2 Run linting and type checking
    - Run `cd apps/api && pipenv run ruff check .`
    - Run `cd apps/web && npm run lint`
    - _Requirements: 14.3, 14.4_
  
  - [x] 12.3 Verify schema generator
    - Run `pipenv run orb-schema generate`
    - Verify no errors
    - _Requirements: 14.5_

- [x] 13. Final checkpoint - All tests pass
  - Ensure all unit tests pass
  - Ensure all property tests pass
  - Ensure no linting errors
  - Ensure no compilation errors
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional property tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation follows the existing environments-list pattern for consistency
