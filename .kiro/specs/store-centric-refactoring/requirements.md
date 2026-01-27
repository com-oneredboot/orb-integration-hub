# Requirements: Store-Centric Refactoring

## Overview

Refactor all frontend components to use a consistent store-first architecture where NgRx store is the single source of truth for all application state. Components must dispatch actions and use selectors instead of calling services directly.

## Standard Requirements

This spec follows the [orb-templates Spec Standards](../../../repositories/orb-templates/docs/kiro-steering/templates/spec-standards.md).

## Background

An audit of all frontend pages revealed inconsistent store usage patterns:
- **Applications List**: Has NgRx store but doesn't use it (0 dispatches, 0 selectors from applications store)
- **Application Detail Page**: Bypasses store for all CRUD operations (7 direct service calls)
- **Organization Detail Page**: Bypasses store for CRUD operations (6 direct service calls)
- **Profile Component**: Bypasses store for user updates (6 direct service calls)
- **Applications Effects**: Missing `loadApplications$` effect (organizations has it)

See full audit: [Store Usage Audit Report](./store-usage-audit.md)

## Reference Implementation

The Organizations List component demonstrates the correct store-first pattern:
- 5 store selectors for data
- 8 store dispatches for actions
- Only 1 direct service call (create draft for immediate navigation)

## Requirements

### 1. Applications Effects

1.1. THE Applications_Effects SHALL include a `loadApplications$` effect that:
   - Listens for `ApplicationsActions.loadApplications` and `ApplicationsActions.refreshApplications` actions
   - Gets the current user from the user store
   - Calls `applicationService.getUserApplications()` or equivalent
   - Dispatches `loadApplicationsSuccess` with the applications array
   - Dispatches `loadApplicationsFailure` on error

1.2. THE Applications_Effects SHALL follow the same pattern as `OrganizationsEffects.loadOrganizations$`

### 2. Applications List Component

2.1. THE Applications_List_Component SHALL use store selectors for all data:
   - `selectApplicationRows` for application data
   - `selectFilteredApplicationRows` for filtered data
   - `selectIsLoading` for loading state
   - `selectIsCreatingNew` for create state

2.2. THE Applications_List_Component SHALL dispatch actions for all operations:
   - `loadApplications` on init
   - `setSearchTerm` for search filtering
   - `setOrganizationFilter` for organization filtering
   - `setStatusFilter` for status filtering

2.3. THE Applications_List_Component SHALL NOT call services directly for data loading

2.4. THE Applications_List_Component SHALL remove all local state that duplicates store state:
   - Remove local `applicationRows` and `filteredApplicationRows`
   - Remove local `isLoading`
   - Remove local `searchTerm`, `organizationFilter`, `statusFilter`

### 3. Application Detail Page Component

3.1. THE Application_Detail_Page_Component SHALL use store selectors for application data:
   - `selectSelectedApplication` or `selectApplicationById` for current application
   - `selectIsLoading` for loading state
   - `selectIsSaving` for save state
   - `selectError` for error state

3.2. THE Application_Detail_Page_Component SHALL dispatch actions for all CRUD:
   - `loadApplication` with applicationId on init
   - `updateApplication` for saves
   - `deleteApplication` for deletes

3.3. THE Application_Detail_Page_Component SHALL NOT call `applicationService` directly

3.4. THE Application_Detail_Page_Component SHALL remove local state:
   - Remove local `application`
   - Remove local `isLoading`, `isSaving`
   - Remove local `loadError`, `saveError`

### 4. Organization Detail Page Component

4.1. THE Organization_Detail_Page_Component SHALL use store selectors for organization data:
   - `selectSelectedOrganization` or `selectOrganizationById` for current organization
   - `selectIsLoading` for loading state
   - `selectIsSaving` for save state
   - `selectError` for error state

4.2. THE Organization_Detail_Page_Component SHALL dispatch actions for all CRUD:
   - `loadOrganization` with organizationId on init (or use existing `loadOrganizations`)
   - `updateOrganization` for saves
   - `deleteOrganization` for deletes

4.3. THE Organization_Detail_Page_Component SHALL NOT call `organizationService` directly

4.4. THE Organization_Detail_Page_Component SHALL remove local state:
   - Remove local `organization`
   - Remove local `isLoading`, `isSaving`
   - Remove local `loadError`, `saveError`

### 5. Profile Component (Optional)

5.1. THE Profile_Component SHOULD dispatch actions for user updates instead of calling `userService` directly

5.2. THE Profile_Component SHOULD use store selectors for loading/saving state

### 6. Steering File Updates

6.1. THE Frontend_Steering_File SHALL be updated to include mandatory store-first patterns

6.2. THE Frontend_Steering_File SHALL document:
   - Required store selectors for list and detail pages
   - Required action dispatches for CRUD operations
   - Prohibited patterns (direct service calls for data)
   - Reference implementations

### 7. Unit Tests

7.1. ALL refactored components SHALL have updated unit tests that:
   - Mock the NgRx store
   - Verify correct actions are dispatched
   - Verify selectors are used for data

7.2. THE Applications_Effects SHALL have unit tests for the new `loadApplications$` effect

## Out of Scope

- Auth flow components (already properly using store)
- Dashboard component (read-only, properly using store)
- Organizations List component (already properly using store)
- Presentational components (Application Detail, Organization Detail child components)

## Success Criteria

- All hybrid components converted to store-first pattern
- Zero direct service calls for CRUD operations in page components
- All unit tests passing
- Steering file updated with enforceable standards
