# Requirements Document

## Standard Requirements

This spec follows the [orb-templates Spec Standards](../../../repositories/orb-templates/docs/kiro-steering/templates/spec-standards.md).

## Introduction

This document specifies the requirements for restructuring the frontend UI navigation pattern in the orb-integration-hub application. The goal is to create a dedicated Environment Detail Page that displays all configuration for a single environment, replacing the current Security tab approach with a more intuitive navigation flow.

The expected navigation pattern is:
```
Organizations (list) → Organization Detail
  └── Applications tab → Applications (list) → Application Detail
        └── Overview tab shows Environments (DataGrid) → Environment Detail Page
```

This is a FRONTEND-ONLY change. All backend infrastructure (DynamoDB, Lambda resolvers, GraphQL API) is already complete from the application-environment-config spec.

## Glossary

- **Application_Detail_Page**: The existing page component that displays application information with tabs (Overview, Groups, Security, Danger Zone)
- **Environment_Detail_Page**: The new page component that displays all configuration for a single environment
- **Environment_Config_Tab_Component**: The existing component that manages environment configuration (to be refactored into the new detail page)
- **DataGrid**: The shared component used for displaying tabular data with pagination, sorting, and filtering
- **NgRx_Store**: The state management system used for environment configuration data
- **Environment**: An enum representing deployment environments (PRODUCTION, STAGING, DEVELOPMENT, TEST, PREVIEW)

## Requirements

### Requirement 1: Environments DataGrid on Application Overview Tab

**User Story:** As a user, I want to see a list of environments on the Application Overview tab, so that I can quickly view the status of each environment and navigate to configure them.

#### Acceptance Criteria

1. WHEN the Application Detail Page Overview tab is displayed, THE Application_Detail_Page SHALL render an "Environments" DataGrid below the application form
2. THE DataGrid SHALL display columns for: Environment Name, API Key Status, Webhook Status, and Last Updated
3. WHEN a user clicks on an environment row, THE Application_Detail_Page SHALL navigate to `/customers/applications/:appId/environments/:env`
4. THE DataGrid SHALL only display environments that are configured for the application (from `application.environments` array)
5. WHEN no environments are configured, THE DataGrid SHALL display an empty state message directing users to configure environments in the form above

### Requirement 2: Remove Security Tab from Application Detail Page

**User Story:** As a user, I want a simplified Application Detail Page without the Security tab, so that environment configuration is accessed through the dedicated Environment Detail Page instead.

#### Acceptance Criteria

1. THE Application_Detail_Page SHALL NOT display the Security tab in the tab navigation
2. THE Application_Detail_Page SHALL retain the Overview, Groups, and Danger Zone tabs
3. WHEN the application is in draft mode, THE Application_Detail_Page SHALL still allow environment selection in the Overview form
4. THE API Keys DataGrid previously in the Security tab SHALL be moved to the Environment Detail Page

### Requirement 3: Environment Detail Page Route

**User Story:** As a user, I want to access environment configuration through a dedicated URL, so that I can bookmark and share links to specific environment configurations.

#### Acceptance Criteria

1. THE Router SHALL support the route `/customers/applications/:appId/environments/:env`
2. WHEN navigating to the Environment Detail Page, THE System SHALL load the application and environment configuration from the NgRx store
3. IF the environment parameter does not match a configured environment, THE Environment_Detail_Page SHALL display an error message and provide navigation back to the application
4. THE Environment_Detail_Page SHALL display a breadcrumb navigation showing: Applications > [App Name] > [Environment Name]

### Requirement 4: Environment Detail Page Content

**User Story:** As a user, I want to view and manage all configuration for a single environment on one page, so that I can efficiently configure API keys, origins, rate limits, webhooks, and feature flags.

#### Acceptance Criteria

1. THE Environment_Detail_Page SHALL display the environment name in the page header
2. THE Environment_Detail_Page SHALL display an API Keys section showing the key status and actions (Generate, Rotate, Revoke)
3. THE Environment_Detail_Page SHALL display an Allowed Origins section for CORS configuration
4. THE Environment_Detail_Page SHALL display a Rate Limits section for configuring request limits
5. THE Environment_Detail_Page SHALL display a Webhooks section for webhook URL, events, and secret management
6. THE Environment_Detail_Page SHALL display a Feature Flags section for managing environment-specific flags
7. WHEN saving any configuration, THE Environment_Detail_Page SHALL dispatch the appropriate NgRx actions and display loading/error states

### Requirement 5: Reuse Existing NgRx Store

**User Story:** As a developer, I want the Environment Detail Page to use the existing environment-config NgRx store, so that we maintain consistency and avoid code duplication.

#### Acceptance Criteria

1. THE Environment_Detail_Page SHALL use the existing `EnvironmentConfigActions` for all data operations
2. THE Environment_Detail_Page SHALL use the existing `selectSelectedConfig`, `selectIsLoading`, `selectIsSaving`, and error selectors
3. WHEN the page loads, THE Environment_Detail_Page SHALL dispatch `loadConfig` with the applicationId and environment from route parameters
4. THE Environment_Detail_Page SHALL dispatch `setApplicationContext` to set the current application and organization context

### Requirement 6: API Keys Display in Environment Detail Page

**User Story:** As a user, I want to see and manage API keys for the specific environment, so that I can generate, rotate, or revoke keys as needed.

#### Acceptance Criteria

1. THE Environment_Detail_Page SHALL display the current API key status (Active, Revoked, Expired, or Not Configured)
2. WHEN an API key exists, THE Environment_Detail_Page SHALL display the key prefix and key type (publishable pk_* or secret sk_*)
3. THE Environment_Detail_Page SHALL provide a Generate button when no active key exists
4. THE Environment_Detail_Page SHALL provide Rotate and Revoke buttons when an active key exists
5. WHEN a new key is generated, THE Environment_Detail_Page SHALL display the full key with a copy button and warning that it won't be shown again

### Requirement 7: Navigation and Back Button

**User Story:** As a user, I want clear navigation to return to the Application Detail Page, so that I can easily move between application and environment views.

#### Acceptance Criteria

1. THE Environment_Detail_Page SHALL display a back link that navigates to `/customers/applications/:appId`
2. THE Environment_Detail_Page SHALL include breadcrumb navigation showing the full path
3. WHEN the user clicks the back link, THE System SHALL navigate to the Application Detail Page Overview tab
