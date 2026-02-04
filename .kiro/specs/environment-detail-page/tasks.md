# Implementation Plan: Environment Detail Page

## Standard Requirements

This spec follows the [orb-templates Spec Standards](../../../repositories/orb-templates/docs/kiro-steering/templates/spec-standards.md).

## Overview

This implementation plan restructures the frontend UI to create a dedicated Environment Detail Page. The work involves modifying the Application Detail Page (removing Security tab, adding Environments DataGrid) and creating a new Environment Detail Page component.

All backend infrastructure is already complete - this is FRONTEND-ONLY work.

## Tasks

- [x] 1. Create Environment Detail Page component
  - [x] 1.1 Create EnvironmentDetailPageComponent scaffold
    - Create `apps/web/src/app/features/customers/applications/components/environment-detail-page/` directory
    - Create component files: `.ts`, `.html`, `.scss`, `.spec.ts`
    - Set up standalone component with required imports (CommonModule, FormsModule, FontAwesomeModule, RouterModule)
    - Inject Store, ActivatedRoute, Router
    - _Requirements: 3.1, 4.1_

  - [x] 1.2 Implement route parameter extraction and store integration
    - Extract `applicationId` and `environment` from route parameters
    - Dispatch `ApplicationsActions.loadApplication` to load application data
    - Dispatch `EnvironmentConfigActions.setApplicationContext` with applicationId and organizationId
    - Dispatch `EnvironmentConfigActions.loadConfig` with applicationId and environment
    - Set up store selectors: `selectSelectedConfig`, `selectIsLoading`, `selectIsSaving`, `selectLoadError`, `selectSaveError`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 1.3 Implement environment validation and error handling
    - Validate that route environment parameter matches a configured environment
    - Display error message if environment is invalid
    - Provide back navigation to Application Detail Page
    - _Requirements: 3.3_

  - [x] 1.4 Implement page header and breadcrumb navigation
    - Display environment name in page header with environment badge
    - Add breadcrumb: Applications > [App Name] > [Environment Name]
    - Add back link to `/customers/applications/:appId`
    - _Requirements: 3.4, 4.1, 7.1, 7.2, 7.3_

- [x] 2. Implement Environment Detail Page sections
  - [x] 2.1 Implement API Keys section
    - Integrate with api-keys store to load keys for the environment
    - Display current API key status (Active, Revoked, Expired, Not Configured)
    - Display key prefix and key type (pk_* or sk_*) when key exists
    - Add Generate button when no active key exists
    - Add Rotate and Revoke buttons when active key exists
    - Handle generated key display with copy button and warning
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 2.2 Implement Allowed Origins section
    - Display list of allowed origins from config
    - Add input field and "Add Origin" button
    - Add "Remove" button for each origin
    - Dispatch `EnvironmentConfigActions.addAllowedOrigin` and `removeAllowedOrigin`
    - _Requirements: 4.3_

  - [x] 2.3 Implement Rate Limits section
    - Display rate limit form with perMinute and perDay inputs
    - Add "Save Rate Limits" button
    - Dispatch `EnvironmentConfigActions.updateConfig` with rate limit values
    - _Requirements: 4.4_

  - [x] 2.4 Implement Webhooks section
    - Display webhook URL input
    - Display enabled checkbox
    - Display webhook events checkboxes
    - Display retry settings (maxRetries, retryDelaySeconds)
    - Display webhook secret with regenerate button
    - Add "Save Webhook Configuration" button
    - Dispatch `EnvironmentConfigActions.updateWebhookConfig` and `regenerateWebhookSecret`
    - _Requirements: 4.5_

  - [x] 2.5 Implement Feature Flags section
    - Display list of feature flags with key, type, and value
    - Add form to create new flag (key, type selector, value input)
    - Add "Delete" button for each flag
    - Dispatch `EnvironmentConfigActions.setFeatureFlag` and `deleteFeatureFlag`
    - _Requirements: 4.6_

  - [x] 2.6 Implement loading and error states
    - Show loading spinner when `isLoading$` is true
    - Show save error message when `saveError$` has value
    - Show loading indicator on buttons when `isSaving$` is true
    - _Requirements: 4.7_

- [x] 3. Checkpoint - Environment Detail Page complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Modify Application Detail Page
  - [x] 4.1 Remove Security tab from Application Detail Page
    - Remove `Security` from `ApplicationDetailTab` enum
    - Remove Security tab button from tab navigation
    - Remove Security tab panel content
    - Remove Security-related template references and methods that are no longer needed
    - _Requirements: 2.1, 2.2_

  - [x] 4.2 Add Environments DataGrid to Overview tab
    - Define `EnvironmentRow` interface with environment, environmentLabel, apiKeyStatus, webhookStatus, lastUpdated
    - Define `environmentColumns` with column definitions
    - Create `environmentRows` computed from application.environments and config/api-key data
    - Add DataGrid component below the application form in Overview tab
    - _Requirements: 1.1, 1.2_

  - [x] 4.3 Implement environment row click navigation
    - Add `onEnvironmentRowClick` handler
    - Navigate to `/customers/applications/:appId/environments/:env` on row click
    - _Requirements: 1.3_

  - [x] 4.4 Implement empty state for Environments DataGrid
    - Show empty message when no environments configured
    - Direct users to configure environments in the form above
    - _Requirements: 1.5_

  - [x] 4.5 Ensure draft mode still allows environment selection
    - Verify environment checkboxes remain functional in draft mode
    - No changes needed if already working (just verify)
    - _Requirements: 2.3_

- [x] 5. Update route configuration
  - [x] 5.1 Add Environment Detail Page route
    - Add route `{ path: ':id/environments/:env', component: EnvironmentDetailPageComponent }` to applications.routes.ts
    - Ensure route is placed before the `:id` catch-all route
    - _Requirements: 3.1, 3.2_

- [x] 6. Checkpoint - All changes complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Write property tests
  - [ ] 7.1 Write property test for Environment DataGrid row count
    - **Property 1: Environment DataGrid Row Count Matches Configuration**
    - Generate random applications with 0-5 environments
    - Verify DataGrid row count equals environments array length
    - **Validates: Requirements 1.4**

  - [ ] 7.2 Write property test for save operations
    - **Property 2: Save Operations Dispatch Actions and Show Loading States**
    - Generate random configuration changes
    - Verify action dispatch and loading state behavior
    - **Validates: Requirements 4.7**

  - [ ] 7.3 Write property test for API key status display
    - **Property 3: API Key Status Display Consistency**
    - Generate API keys with all possible statuses
    - Verify displayed status matches key status
    - **Validates: Requirements 6.1**

- [ ] 8. Write unit tests
  - [ ] 8.1 Write unit tests for EnvironmentDetailPageComponent
    - Test component renders correct sections when config is loaded
    - Test error state when environment is invalid
    - Test correct actions dispatched on page load
    - Test API key actions (generate, revoke, rotate)
    - _Requirements: 3.3, 4.1-4.6, 5.3, 5.4, 6.1-6.5_

  - [ ] 8.2 Write unit tests for ApplicationDetailPageComponent changes
    - Test Environments DataGrid renders on Overview tab
    - Test Security tab is NOT rendered
    - Test navigation to Environment Detail Page on row click
    - Test empty state when no environments configured
    - _Requirements: 1.1-1.5, 2.1-2.3_

  - [ ] 8.3 Write unit tests for route configuration
    - Test route `/customers/applications/:id/environments/:env` loads correct component
    - Test route parameters are correctly extracted
    - _Requirements: 3.1, 3.2_

- [ ] 9. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify no linting errors
  - Verify no TypeScript errors

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All CSS should use existing global `orb-*` classes from `styles/components.scss`
- Follow the NgRx store-first pattern - dispatch actions, use selectors, no direct service calls
