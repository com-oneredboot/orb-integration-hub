# Requirements Document

## Introduction

This feature combines two related pieces of work: (1) removing the deprecated legacy Roles table and all its generated code, and (2) adding a new Roles tab to the Application Detail Page for managing ApplicationRoles. The legacy `Roles` table is deprecated and has been replaced by `ApplicationRoles`, which stores role definitions (e.g., "Admin", "Editor", "Viewer") that customers define for their applications. The new Roles tab allows customers to perform CRUD operations on ApplicationRoles for their application, following the same patterns as the existing Environments tab.

## Glossary

- **Legacy_Roles_Table**: The deprecated `Roles` DynamoDB table (`schemas/tables/Roles.yml`) that is being removed
- **ApplicationRoles**: Role definitions that customers create for their applications (e.g., "Admin", "Editor", "Viewer")
- **ApplicationRoles_Table**: The DynamoDB table storing role definitions per application (`schemas/tables/ApplicationRoles.yml`)
- **Application_Detail_Page**: The Angular component displaying application details with tabbed navigation
- **Roles_Tab**: The new tab being added to the Application Detail Page for managing ApplicationRoles
- **RoleType**: Deprecated enum to be removed (replaced by ApplicationRoleType)
- **RoleStatus**: Deprecated enum to be removed (replaced by ApplicationRoleStatus)
- **ApplicationRoleType**: New enum defining role types (ADMIN, USER, GUEST, CUSTOM) for ApplicationRoles
- **ApplicationRoleStatus**: Existing enum defining role status (ACTIVE, INACTIVE, DELETED) for ApplicationRoles
- **DataGridComponent**: The shared table component used for all list pages in the application
- **NgRx_Store**: The centralized state management system used for all data operations
- **Schema_Generator**: The orb-schema-generator tool that generates code from YAML schemas

## Requirements

### Requirement 1: Remove Legacy Roles Table Schema and Enums

**User Story:** As a developer, I want to remove the deprecated Roles table schema and its enums, so that the codebase only contains the active ApplicationRoles table with properly named enums.

#### Acceptance Criteria

1. WHEN the schema files are updated, THE System SHALL delete the `schemas/tables/Roles.yml` schema file
2. WHEN the schema generator is run, THE System SHALL no longer generate code for the Roles table
3. WHEN the schema generator is run, THE System SHALL remove `apps/api/models/RolesModel.py` from the generated output
4. WHEN the schema generator is run, THE System SHALL remove `apps/web/src/app/core/models/RolesModel.ts` from the generated output
5. WHEN the schema generator is run, THE System SHALL remove `infrastructure/cdk/generated/tables/roles_table.py` from the generated output
6. WHEN the schema files are updated, THE System SHALL create `schemas/registries/ApplicationRoleType.yml` with values ADMIN, USER, GUEST, CUSTOM
7. WHEN the schema files are updated, THE System SHALL update `schemas/tables/ApplicationRoles.yml` to use `ApplicationRoleType` instead of `RoleType`
8. WHEN the schema files are updated, THE System SHALL update `schemas/tables/ApplicationRoles.yml` to use `ApplicationRoleStatus` instead of `RoleStatus`
9. WHEN the schema files are updated, THE System SHALL delete `schemas/registries/RoleType.yml`
10. WHEN the schema files are updated, THE System SHALL delete `schemas/registries/RoleStatus.yml`

### Requirement 2: Remove Legacy Roles Table Infrastructure

**User Story:** As a developer, I want to remove the legacy Roles table from the CDK infrastructure, so that the deprecated table is no longer deployed.

#### Acceptance Criteria

1. WHEN the CDK stack is updated, THE DynamoDB_Stack SHALL remove the `_create_roles_table` method
2. WHEN the CDK stack is updated, THE DynamoDB_Stack SHALL remove the call to `_create_roles_table` from the constructor
3. WHEN the CDK tests are updated, THE Test_Suite SHALL remove the `TestDynamoDBStackRolesTable` test class
4. WHEN the generated tables `__init__.py` is regenerated, THE System SHALL no longer export `RolesTable`

### Requirement 3: Roles Tab in Application Detail Page

**User Story:** As a customer, I want to see a Roles tab in the Application Detail Page, so that I can manage role definitions for my application.

#### Acceptance Criteria

1. WHEN a user views an active application, THE Application_Detail_Page SHALL display a "Roles" tab in the tab navigation
2. WHEN a user views a draft application, THE Application_Detail_Page SHALL NOT display the Roles tab
3. WHEN the Roles tab is selected, THE Application_Detail_Page SHALL display the ApplicationRoles list component
4. THE Roles_Tab SHALL display a badge showing the count of active roles for the application
5. THE Roles_Tab SHALL use the `user-tag` icon to represent roles

### Requirement 4: ApplicationRoles List Component

**User Story:** As a customer, I want to view all roles defined for my application in a list, so that I can see what roles are available.

#### Acceptance Criteria

1. WHEN a user navigates to the Roles tab, THE ApplicationRoles_List_Component SHALL display all roles for that application using the DataGridComponent
2. WHEN roles are loaded, THE ApplicationRoles_List_Component SHALL display the role name in the primary column
3. WHEN roles are loaded, THE ApplicationRoles_List_Component SHALL display the role type (ADMIN, USER, GUEST, CUSTOM) using ApplicationRoleType enum with a badge
4. WHEN roles are loaded, THE ApplicationRoles_List_Component SHALL display the role description if present
5. WHEN roles are loaded, THE ApplicationRoles_List_Component SHALL display the role status using ApplicationRoleStatus enum (ACTIVE, INACTIVE, DELETED) with a status badge
6. WHEN roles are loaded, THE ApplicationRoles_List_Component SHALL display the last updated time using relative time format
7. WHEN a user clicks on a role row, THE ApplicationRoles_List_Component SHALL open the edit role dialog

### Requirement 5: Create ApplicationRole

**User Story:** As a customer, I want to create new roles for my application, so that I can define the access levels for my users.

#### Acceptance Criteria

1. WHEN a user clicks the "Create Role" button, THE System SHALL display a create role dialog
2. THE Create_Role_Dialog SHALL require a role name input (required, max 100 characters)
3. THE Create_Role_Dialog SHALL require a role type selection (ADMIN, USER, GUEST, CUSTOM) using ApplicationRoleType enum
4. THE Create_Role_Dialog SHALL allow an optional description input (max 500 characters)
5. WHEN a user submits a valid role, THE System SHALL create the ApplicationRole with status ACTIVE
6. WHEN a role is created successfully, THE System SHALL close the dialog and refresh the roles list
7. IF a role with the same name already exists for the application, THEN THE System SHALL display a validation error

### Requirement 6: Edit ApplicationRole

**User Story:** As a customer, I want to edit existing roles, so that I can update role definitions as my application evolves.

#### Acceptance Criteria

1. WHEN a user clicks on a role row, THE System SHALL display an edit role dialog with current values
2. THE Edit_Role_Dialog SHALL allow editing the role name
3. THE Edit_Role_Dialog SHALL allow editing the role type
4. THE Edit_Role_Dialog SHALL allow editing the description
5. WHEN a user saves changes, THE System SHALL update the ApplicationRole and set updatedAt
6. WHEN changes are saved successfully, THE System SHALL close the dialog and refresh the roles list

### Requirement 7: Delete/Deactivate ApplicationRole

**User Story:** As a customer, I want to delete or deactivate roles, so that I can remove roles that are no longer needed.

#### Acceptance Criteria

1. THE Edit_Role_Dialog SHALL include a "Deactivate" button for ACTIVE roles
2. THE Edit_Role_Dialog SHALL include a "Delete" button for all roles
3. WHEN a user clicks "Deactivate", THE System SHALL set the role status to INACTIVE
4. WHEN a user clicks "Delete", THE System SHALL display a confirmation dialog
5. WHEN deletion is confirmed, THE System SHALL set the role status to DELETED
6. WHEN a role is deactivated or deleted, THE System SHALL close the dialog and refresh the roles list

### Requirement 8: NgRx Store Integration for ApplicationRoles

**User Story:** As a developer, I want the ApplicationRoles management to follow the NgRx store-first architecture, so that data management is consistent with other features.

#### Acceptance Criteria

1. THE ApplicationRoles_List_Component SHALL use NgRx_Store selectors for all data (roles, loading state, errors)
2. THE ApplicationRoles_List_Component SHALL dispatch actions to load roles when initialized
3. THE ApplicationRoles_List_Component SHALL NOT call services directly for data operations
4. WHEN filters are applied, THE ApplicationRoles_List_Component SHALL dispatch filter actions to the store
5. THE NgRx_Store reducer SHALL compute filtered role rows when filter state changes
6. THE NgRx_Store effects SHALL handle all GraphQL API calls for CRUD operations

### Requirement 9: ApplicationRoles GraphQL Operations

**User Story:** As a developer, I want GraphQL operations for ApplicationRoles, so that the frontend can communicate with the backend.

#### Acceptance Criteria

1. THE System SHALL use the existing generated GraphQL mutations for ApplicationRoles (Create, Update, Delete, Disable)
2. THE System SHALL use the existing generated GraphQL queries for ApplicationRoles (Get, ListByApplicationId)
3. WHEN creating a role, THE System SHALL generate a unique applicationRoleId and roleId
4. WHEN listing roles, THE System SHALL query by applicationId using the ApplicationRoleIndex GSI

### Requirement 10: Default Roles Creation

**User Story:** As a customer, I want default roles to be created when I create an application, so that I have a starting point for role management.

#### Acceptance Criteria

1. WHEN an application is activated (status changes from PENDING to ACTIVE), THE System SHALL create default ApplicationRoles
2. THE Default_Roles SHALL include an "Owner" role with roleType ADMIN and description "Full access to all application features and settings"
3. THE Default_Roles SHALL include an "Administrator" role with roleType ADMIN and description "Administrative access to manage users and settings"
4. THE Default_Roles SHALL include a "User" role with roleType USER and description "Standard user access to application features"
5. THE Default_Roles SHALL include a "Guest" role with roleType GUEST and description "Limited read-only access to public features"
6. EACH Default_Role SHALL have status ACTIVE
7. IF default role creation fails, THEN THE System SHALL log the error but not block application activation

### Requirement 11: Documentation Updates

**User Story:** As a developer, I want documentation to reflect the removal of the legacy Roles table, so that future developers understand the current architecture.

#### Acceptance Criteria

1. WHEN the feature is complete, THE Documentation SHALL be updated to remove references to the legacy Roles table
2. WHEN the feature is complete, THE Documentation SHALL clarify that ApplicationRoles is the only roles table
3. THE Documentation SHALL explain the relationship between ApplicationRoles and ApplicationUserRoles

### Requirement 12: Version and Changelog Management

**User Story:** As a developer, I want proper version tracking, so that changes are documented for release management.

#### Acceptance Criteria

1. WHEN the feature is complete, THE System SHALL bump the version following semantic versioning
2. WHEN the feature is complete, THE CHANGELOG.md SHALL be updated with the feature description
3. THE CHANGELOG entry SHALL include the issue number if applicable

### Requirement 13: Git Commit Standards

**User Story:** As a developer, I want commits to follow project standards, so that the git history is clean and traceable.

#### Acceptance Criteria

1. WHEN committing changes, THE Commits SHALL reference issue numbers using conventional commits format
2. WHEN committing schema removal, THE Commit message SHALL use `chore: remove deprecated Roles table schema`
3. WHEN committing the Roles tab feature, THE Commit message SHALL use `feat: add Roles tab to application detail page`

### Requirement 14: Final Verification

**User Story:** As a developer, I want all tests to pass before merging, so that the feature is production-ready.

#### Acceptance Criteria

1. WHEN the feature is complete, ALL unit tests SHALL pass
2. WHEN the feature is complete, ALL property tests SHALL pass
3. WHEN the feature is complete, THE System SHALL have no linting errors
4. WHEN the feature is complete, THE System SHALL have no compilation errors
5. WHEN the feature is complete, THE Schema_Generator SHALL run without errors after Roles.yml removal
