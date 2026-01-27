# Requirements Document

## Introduction

This spec addresses the integration gaps between Organizations and Applications features in the orb-integration-hub frontend. Currently, the Organizations list page has an "Applications" column that shows placeholder data, the Organization detail page does not display associated applications, and the Application detail page does not allow management of the `environments` field. This feature will connect these components with real data from the GraphQL API.

## Standard Requirements

This spec follows the [orb-templates Spec Standards](../../repositories/orb-templates/docs/kiro-steering/templates/spec-standards.md).

## Glossary

- **Organizations_List_Component**: The component displaying a paginated list of organizations with summary data
- **Organization_Detail_Component**: The component displaying and editing a single organization's details
- **Application_Detail_Component**: The component displaying and editing a single application's details
- **Applications_Store**: The NgRx store managing application state
- **Organizations_Store**: The NgRx store managing organization state
- **Application_Service**: The service providing GraphQL operations for applications
- **Environment**: A deployment target for an application (PRODUCTION, STAGING, DEVELOPMENT, TEST, PREVIEW)
- **Application_Count**: The number of applications belonging to an organization

## Requirements

### Requirement 1: Organization Application Count Attribute

**User Story:** As a user viewing the organizations list, I want to see the actual count of applications for each organization, so that I can understand the scope of each organization at a glance.

#### Acceptance Criteria

1. THE Organizations schema SHALL include an applicationCount attribute of type integer with default value 0
2. WHEN the Organizations_List_Component loads, THE Organizations_Store SHALL read the applicationCount from each organization record
3. THE Organizations_List_Component SHALL display the applicationCount in the Applications column
4. WHEN a user clicks on the application count cell, THE Organizations_List_Component SHALL navigate to the Applications list page with a filter for that organization

### Requirement 2: Organization Detail Applications Section

**User Story:** As a user viewing an organization's details, I want to see a list of applications belonging to that organization, so that I can navigate to and manage those applications.

#### Acceptance Criteria

1. WHEN the Organization_Detail_Component loads an organization, THE component SHALL fetch applications for that organization using Application_Service
2. WHEN applications are loaded, THE Organization_Detail_Component SHALL display them in a dedicated "Applications" section
3. THE Organization_Detail_Component SHALL display each application's name, status, and environment count
4. WHEN a user clicks on an application row, THE Organization_Detail_Component SHALL navigate to the Application_Detail_Component for that application
5. WHEN a user clicks "Create Application", THE Organization_Detail_Component SHALL create a draft application linked to the current organization and navigate to its detail page
6. WHILE applications are loading, THE Organization_Detail_Component SHALL display a loading indicator
7. IF no applications exist for the organization, THEN THE Organization_Detail_Component SHALL display an empty state with a "Create Application" call-to-action
8. IF fetching applications fails, THEN THE Organization_Detail_Component SHALL display an error message
9. WHEN applications are loaded, THE Organization_Detail_Component SHALL update the organization's applicationCount if it differs from the actual count
10. WHEN an application is created from the Organization_Detail_Component, THE component SHALL increment the organization's applicationCount
11. WHEN an application is deleted, THE Organization_Service SHALL decrement the organization's applicationCount

### Requirement 3: Application Environment Selection

**User Story:** As a user managing an application, I want to select which environments are enabled for the application, so that I can control where the application can be deployed.

#### Acceptance Criteria

1. WHEN the Application_Detail_Component loads, THE component SHALL display the current environments as selectable checkboxes
2. THE Application_Detail_Component SHALL display all five standard environment options from the ApplicationEnvironment enum: PRODUCTION, STAGING, DEVELOPMENT, TEST, PREVIEW
3. WHEN a user toggles an environment checkbox, THE Application_Detail_Component SHALL update the local form state
4. WHEN a user saves the application, THE Application_Service SHALL persist the selected environments array
5. THE Application_Detail_Component SHALL validate that at least one environment is selected before allowing save
6. IF no environments are selected, THEN THE Application_Detail_Component SHALL display a validation error message

### Requirement 4: Cross-Feature Data Consistency

**User Story:** As a user navigating between organizations and applications, I want the data to remain consistent, so that changes in one view are reflected in others.

#### Acceptance Criteria

1. WHEN an application is created from the Organization_Detail_Component, THE Applications_Store SHALL be updated with the new application
2. WHEN an application is deleted, THE Organizations_Store SHALL update the application count for the affected organization
3. WHEN navigating from Organization_Detail_Component to Application_Detail_Component, THE Application_Detail_Component SHALL receive the correct organizationId context
