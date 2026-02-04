# Requirements Document

## Introduction

This feature adds an environments list component and improves the environment detail page for the orb-integration-hub Angular frontend. Environments are `ApplicationEnvironmentConfig` records representing per-application environment configurations (Production, Staging, Development, Test, Preview). The environments list displays all environments for a single application using the `DataGridComponent`, following the NgRx store-first architecture. The environment detail page improvements add proper tab UI navigation using `orb-tabs` CSS classes.

## Glossary

- **Environment**: An `ApplicationEnvironmentConfig` record representing configuration for a specific deployment environment (Production, Staging, Development, Test, Preview)
- **Application**: A parent resource that contains multiple environments
- **DataGridComponent**: The shared table component used for all list pages in the application
- **NgRx_Store**: The centralized state management system used for all data operations
- **Environment_Status**: A computed status based on API key state (Active, Not Configured, Revoked, Expired)
- **Tab_UI**: The visual tab navigation interface using `orb-tabs` CSS classes

## Requirements

### Requirement 1: Environments List Component

**User Story:** As a customer, I want to view all environments for an application in a list, so that I can quickly see the status and configuration of each environment.

#### Acceptance Criteria

1. WHEN a user navigates to an application's environments section, THE Environments_List_Component SHALL display all environments for that application using the DataGridComponent
2. WHEN environments are loaded, THE Environments_List_Component SHALL show the environment name with an appropriate icon for each environment type
3. WHEN environments are loaded, THE Environments_List_Component SHALL display a computed status badge (Active, Not Configured, Revoked, Expired) based on API key state
4. WHEN an environment has an API key, THE Environments_List_Component SHALL display the key prefix (e.g., `pk_live_abc...`)
5. WHEN an environment has no API key, THE Environments_List_Component SHALL display "—" in the API Key column
6. WHEN environments are loaded, THE Environments_List_Component SHALL display the rate limit per minute (e.g., "60/min")
7. WHEN environments are loaded, THE Environments_List_Component SHALL display the count of allowed origins with an icon
8. WHEN environments are loaded, THE Environments_List_Component SHALL display webhook status as Enabled/Disabled badge
9. WHEN environments are loaded, THE Environments_List_Component SHALL display the last activity time using relative time format
10. WHEN a user clicks on an environment row, THE Environments_List_Component SHALL navigate to the environment detail page

### Requirement 2: NgRx Store Integration for Environments List

**User Story:** As a developer, I want the environments list to follow the NgRx store-first architecture, so that data management is consistent with other features.

#### Acceptance Criteria

1. THE Environments_List_Component SHALL use NgRx_Store selectors for all data (environments, loading state, errors)
2. THE Environments_List_Component SHALL dispatch actions to load environments when initialized
3. THE Environments_List_Component SHALL NOT call services directly for data operations
4. WHEN filters are applied, THE Environments_List_Component SHALL dispatch filter actions to the store
5. THE NgRx_Store reducer SHALL compute filtered environment rows when filter state changes

### Requirement 3: Environment Detail Page Tab UI

**User Story:** As a customer, I want to navigate between different configuration sections using tabs, so that I can easily find and manage specific settings.

#### Acceptance Criteria

1. THE Environment_Detail_Page SHALL display a tab navigation bar using `orb-tabs` CSS classes
2. WHEN the page loads, THE Environment_Detail_Page SHALL display the API Keys tab as active by default
3. THE Tab_UI SHALL include tabs for: API Keys, Origins, Rate Limits, Webhooks, Feature Flags
4. WHEN a user clicks a tab, THE Environment_Detail_Page SHALL display the corresponding content section
5. WHEN a tab has configuration issues, THE Tab_UI SHALL display a badge with the issue count
6. THE Tab_UI SHALL highlight the active tab using the `orb-tabs__tab--active` class

### Requirement 4: Environment Status Computation

**User Story:** As a customer, I want to see the status of each environment at a glance, so that I can identify environments that need attention.

#### Acceptance Criteria

1. WHEN an environment has an active API key, THE Environment_Status SHALL be "Active"
2. WHEN an environment has no API key configured, THE Environment_Status SHALL be "Not Configured"
3. WHEN an environment's API key is revoked, THE Environment_Status SHALL be "Revoked"
4. WHEN an environment's API key is expired, THE Environment_Status SHALL be "Expired"
5. THE Environment_Status SHALL be computed in the NgRx_Store reducer, not in the component

### Requirement 5: Environments List Data Grid Columns

**User Story:** As a customer, I want to see relevant information about each environment in the list, so that I can make informed decisions about which environment to configure.

#### Acceptance Criteria

1. THE DataGridComponent SHALL display an "Environment" column with the environment name and icon
2. THE DataGridComponent SHALL display a "Status" column with a status badge
3. THE DataGridComponent SHALL display an "API Key" column with the key prefix or "—"
4. THE DataGridComponent SHALL display a "Rate Limit" column with the per-minute limit
5. THE DataGridComponent SHALL display an "Origins" column with the count of allowed origins
6. THE DataGridComponent SHALL display a "Webhooks" column with Enabled/Disabled status
7. THE DataGridComponent SHALL display a "Last Activity" column with relative time

### Requirement 6: Accessibility

**User Story:** As a user with accessibility needs, I want the environments list and detail page to be accessible, so that I can use the application effectively.

#### Acceptance Criteria

1. THE Tab_UI SHALL support keyboard navigation between tabs
2. THE Tab_UI SHALL include appropriate ARIA attributes for tab roles
3. THE DataGridComponent rows SHALL be keyboard navigable
4. THE Environment_Status badges SHALL have appropriate color contrast
