# Requirements Document: Product Completion Phases

## Introduction

This specification addresses the final items needed to complete the orb-integration-hub product before SDK implementation. The work is organized into four phases: Application Users Management (missing feature), UI Standards Compliance, Quality Assurance & Polish, and SDK Implementation.

## Glossary

- **Application_Users_Management**: Feature allowing administrators to view and manage which users have access to specific applications and their role assignments per environment
- **Store_First_Architecture**: Angular state management pattern where all data flows through NgRx stores before reaching components
- **UserPageComponent**: Standardized wrapper component providing consistent page layout and metadata sections
- **DataGridComponent**: Reusable component for displaying tabular data with sorting, filtering, and pagination
- **WCAG_2.1_AA**: Web Content Accessibility Guidelines Level AA compliance standard
- **SDK**: Software Development Kit providing programmatic access to the platform
- **orb_CSS_Classes**: Global CSS utility classes following orb design system conventions

## Requirements

### Requirement 1: Application Users List View

**User Story:** As an administrator, I want to view all users assigned to an application, so that I can understand who has access to the application.

#### Acceptance Criteria

1. WHEN an administrator navigates to an application detail page, THE System SHALL display a "Users" tab alongside existing tabs
2. WHEN the Users tab is selected, THE System SHALL display a list of all users assigned to the application
3. WHEN displaying user assignments, THE System SHALL show the user's name, email, and role assignments per environment
4. WHEN no users are assigned to the application, THE System SHALL display an empty state message
5. THE ApplicationUsersListComponent SHALL use the DataGridComponent for displaying user data
6. THE ApplicationUsersListComponent SHALL follow store-first architecture with a dedicated application-users store

### Requirement 2: Application User Invitation Management

**User Story:** As an administrator, I want to invite users to applications via email, so that I can control application access while protecting user privacy.

#### Acceptance Criteria

1. WHEN an administrator clicks "Invite User" on the Users tab, THE System SHALL display a dialog requesting an email address
2. WHEN an administrator enters an email and confirms, THE System SHALL send an invitation notification to that email address
3. WHEN a user accepts an invitation, THE System SHALL add the user to the application's user list
4. WHEN an administrator clicks "Remove" next to a user, THE System SHALL display a confirmation dialog
5. WHEN the administrator confirms removal, THE System SHALL remove the user's access to the application
6. WHEN invitation or removal completes, THE System SHALL display a success notification
7. IF invitation or removal fails, THEN THE System SHALL display an error message with details
8. THE System SHALL NOT allow administrators to directly add users without sending an invitation
9. THE System SHALL NOT expose user email addresses or PII to administrators until the user accepts the invitation

### Requirement 3: Application User Role Management

**User Story:** As an administrator, I want to change user roles per environment within an application, so that I can grant appropriate permissions.

#### Acceptance Criteria

1. WHEN an administrator clicks "Edit Role" next to a user's environment assignment, THE System SHALL display a role selection dialog
2. WHEN the administrator selects a new role and confirms, THE System SHALL update the user's role for that environment
3. WHEN role update completes, THE System SHALL display a success notification and refresh the user list
4. IF role update fails, THEN THE System SHALL display an error message with details
5. THE System SHALL validate that the selected role exists for the application before updating
6. THE System SHALL only allow role changes for users who have already accepted their invitation

### Requirement 3a: User Invitation Acceptance Flow

**User Story:** As a user, I want to accept or reject invitations to join applications/organizations, so that I control which resources I have access to.

#### Acceptance Criteria

1. WHEN a user receives an invitation notification, THE System SHALL display it in their notifications list
2. WHEN a user views an invitation, THE System SHALL show the organization/application name and inviting administrator
3. WHEN a user clicks "Accept" on an invitation, THE System SHALL add them to the organization/application users list
4. WHEN a user clicks "Reject" on an invitation, THE System SHALL mark the invitation as rejected and remove it from pending invitations
5. WHEN an invitation is accepted, THE System SHALL notify the inviting administrator
6. WHEN an invitation expires (after 7 days), THE System SHALL automatically mark it as expired
7. THE System SHALL NOT expose the user's email or PII to administrators until the invitation is accepted

### Requirement 4: Last Activity Column on List Pages

**User Story:** As an administrator, I want to see when entities were last modified, so that I can identify stale or recently updated items.

#### Acceptance Criteria

1. THE Applications list page SHALL display a "Last Activity" column showing the most recent update timestamp
2. THE Users list page SHALL display a "Last Activity" column showing the most recent update timestamp
3. WHEN displaying Last Activity timestamps, THE System SHALL format them in a human-readable relative format (e.g., "2 hours ago")
4. WHEN a user hovers over a Last Activity timestamp, THE System SHALL display the absolute timestamp in a tooltip
5. THE Last Activity column SHALL be sortable in ascending and descending order

### Requirement 5: Metadata Sections on Detail Pages

**User Story:** As an administrator, I want to see creation and modification metadata on detail pages, so that I can track entity history.

#### Acceptance Criteria

1. THE Application detail page SHALL display a metadata section showing createdAt, createdBy, updatedAt, and updatedBy
2. THE Environment detail page SHALL display a metadata section showing createdAt, createdBy, updatedAt, and updatedBy
3. THE Organization detail page SHALL display a metadata section showing createdAt, createdBy, updatedAt, and updatedBy
4. WHEN displaying metadata, THE System SHALL format timestamps in human-readable format
5. THE metadata section SHALL be visually consistent across all detail pages

### Requirement 6: UserPageComponent Wrapper Compliance

**User Story:** As a developer, I want all pages to use the UserPageComponent wrapper, so that the UI is consistent across the application.

#### Acceptance Criteria

1. THE System SHALL wrap all feature pages with UserPageComponent
2. WHEN a page uses UserPageComponent, THE System SHALL provide consistent header, navigation, and layout
3. THE System SHALL audit all existing pages and identify any not using UserPageComponent
4. THE System SHALL refactor non-compliant pages to use UserPageComponent
5. THE UserPageComponent SHALL support all required page configurations (title, breadcrumbs, actions)

### Requirement 7: DataGridComponent Usage Compliance

**User Story:** As a developer, I want all list pages to use DataGridComponent, so that data presentation is consistent.

#### Acceptance Criteria

1. THE System SHALL use DataGridComponent for all list pages displaying tabular data
2. THE System SHALL audit all existing list pages and identify any not using DataGridComponent
3. THE System SHALL refactor non-compliant list pages to use DataGridComponent
4. THE DataGridComponent SHALL support sorting, filtering, and pagination for all list pages
5. THE DataGridComponent SHALL support custom column templates for specialized rendering

### Requirement 8: Global CSS Classes Compliance

**User Story:** As a developer, I want all pages to use global orb-* CSS classes, so that styling is consistent with the design system.

#### Acceptance Criteria

1. THE System SHALL use global orb-* CSS classes for all UI components
2. THE System SHALL audit all component stylesheets and identify custom styles that should use orb-* classes
3. THE System SHALL refactor components to replace custom styles with orb-* classes where applicable
4. THE System SHALL document any custom styles that cannot be replaced with orb-* classes
5. THE System SHALL ensure no duplicate or conflicting styles exist across components

### Requirement 9: Store-First Architecture Compliance

**User Story:** As a developer, I want all components to follow store-first architecture, so that state management is predictable and testable.

#### Acceptance Criteria

1. THE System SHALL ensure all data flows through NgRx stores before reaching components
2. THE System SHALL audit all components and identify any direct API calls bypassing stores
3. THE System SHALL refactor non-compliant components to use store selectors and actions
4. THE System SHALL ensure all async operations dispatch actions and update store state
5. THE System SHALL validate that components subscribe to store selectors rather than holding local state

### Requirement 10: Keyboard Navigation Accessibility

**User Story:** As a keyboard user, I want to navigate the entire application using only keyboard, so that I can use the application without a mouse.

#### Acceptance Criteria

1. WHEN a user presses Tab, THE System SHALL move focus to the next interactive element in logical order
2. WHEN a user presses Shift+Tab, THE System SHALL move focus to the previous interactive element
3. WHEN a user presses Enter or Space on a button, THE System SHALL activate the button action
4. WHEN a user presses Escape in a dialog, THE System SHALL close the dialog
5. THE System SHALL provide visible focus indicators for all interactive elements
6. THE System SHALL ensure no keyboard traps exist where users cannot escape using keyboard alone

### Requirement 11: Screen Reader Support

**User Story:** As a screen reader user, I want all UI elements to be properly announced, so that I can understand and navigate the application.

#### Acceptance Criteria

1. THE System SHALL provide ARIA labels for all interactive elements without visible text
2. THE System SHALL provide ARIA live regions for dynamic content updates
3. WHEN form validation errors occur, THE System SHALL announce errors to screen readers
4. WHEN loading states occur, THE System SHALL announce loading status to screen readers
5. THE System SHALL provide descriptive alt text for all informational images
6. THE System SHALL use semantic HTML elements (button, nav, main, etc.) for proper structure

### Requirement 12: Focus Management

**User Story:** As a keyboard user, I want focus to be managed appropriately when dialogs open and close, so that I don't lose my place in the application.

#### Acceptance Criteria

1. WHEN a dialog opens, THE System SHALL move focus to the first interactive element in the dialog
2. WHEN a dialog closes, THE System SHALL return focus to the element that triggered the dialog
3. WHEN a page loads, THE System SHALL set focus to the main content area or first heading
4. WHEN navigation occurs, THE System SHALL announce the page change to screen readers
5. THE System SHALL trap focus within modal dialogs until they are closed

### Requirement 13: Color Contrast Compliance

**User Story:** As a user with visual impairments, I want sufficient color contrast, so that I can read all text and identify interactive elements.

#### Acceptance Criteria

1. THE System SHALL ensure all text has a contrast ratio of at least 4.5:1 against its background
2. THE System SHALL ensure large text (18pt+) has a contrast ratio of at least 3:1 against its background
3. THE System SHALL ensure interactive elements have a contrast ratio of at least 3:1 against adjacent colors
4. THE System SHALL audit all color combinations and identify any failing contrast requirements
5. THE System SHALL update color values to meet WCAG 2.1 AA contrast requirements

### Requirement 14: Mobile Responsive Layout

**User Story:** As a mobile user, I want all pages to work on small screens, so that I can use the application on my phone or tablet.

#### Acceptance Criteria

1. WHEN viewing on screens smaller than 768px, THE System SHALL display a mobile-optimized layout
2. WHEN viewing on mobile, THE System SHALL stack columns vertically for readability
3. WHEN viewing on mobile, THE System SHALL provide touch-friendly tap targets (minimum 44x44px)
4. WHEN viewing on mobile, THE System SHALL hide or collapse secondary navigation into a menu
5. THE System SHALL test all pages on mobile viewports and ensure no horizontal scrolling occurs

### Requirement 15: Mobile Dialog Optimization

**User Story:** As a mobile user, I want dialogs to work properly on small screens, so that I can complete actions on my mobile device.

#### Acceptance Criteria

1. WHEN a dialog opens on mobile, THE System SHALL display it full-screen or with appropriate margins
2. WHEN viewing dialog content on mobile, THE System SHALL ensure all content is visible without horizontal scrolling
3. WHEN interacting with form fields in dialogs on mobile, THE System SHALL ensure the keyboard doesn't obscure content
4. WHEN viewing dialogs on mobile, THE System SHALL provide easy-to-tap close buttons
5. THE System SHALL test all dialogs on mobile viewports and ensure usability

### Requirement 16: Mobile Navigation

**User Story:** As a mobile user, I want navigation to be mobile-friendly, so that I can easily move between sections.

#### Acceptance Criteria

1. WHEN viewing on mobile, THE System SHALL provide a hamburger menu for primary navigation
2. WHEN the hamburger menu is tapped, THE System SHALL display navigation options in a mobile-friendly format
3. WHEN viewing on mobile, THE System SHALL ensure all navigation links are touch-friendly
4. WHEN viewing on mobile, THE System SHALL provide breadcrumbs or back navigation for context
5. THE System SHALL ensure navigation doesn't obscure content on mobile devices

### Requirement 17: Consistent Error Messages

**User Story:** As a user, I want consistent error messages, so that I can understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN an error occurs, THE System SHALL display a user-friendly error message explaining what happened
2. WHEN a validation error occurs, THE System SHALL display the error next to the relevant form field
3. WHEN a network error occurs, THE System SHALL display a message indicating connectivity issues
4. WHEN an authorization error occurs, THE System SHALL display a message indicating insufficient permissions
5. THE System SHALL use consistent error message formatting and styling across all pages

### Requirement 18: Loading States for Async Operations

**User Story:** As a user, I want to see loading indicators during async operations, so that I know the system is working.

#### Acceptance Criteria

1. WHEN data is being fetched, THE System SHALL display a loading spinner or skeleton screen
2. WHEN a form is being submitted, THE System SHALL disable the submit button and show a loading indicator
3. WHEN a page is loading, THE System SHALL display a loading state until data is available
4. WHEN an action is in progress, THE System SHALL prevent duplicate submissions
5. THE System SHALL ensure loading states are visually consistent across all pages

### Requirement 19: Success and Failure Notifications

**User Story:** As a user, I want to receive notifications when actions succeed or fail, so that I know the outcome of my actions.

#### Acceptance Criteria

1. WHEN an action succeeds, THE System SHALL display a success notification with a descriptive message
2. WHEN an action fails, THE System SHALL display an error notification with details about the failure
3. WHEN a notification is displayed, THE System SHALL automatically dismiss it after 5 seconds
4. WHEN a user clicks a notification close button, THE System SHALL immediately dismiss the notification
5. THE System SHALL ensure notifications don't obscure important content or actions

### Requirement 20: Lazy Loading Verification

**User Story:** As a developer, I want to verify lazy loading is working correctly, so that initial bundle size is minimized.

#### Acceptance Criteria

1. THE System SHALL lazy load all feature modules that are not needed on initial page load
2. THE System SHALL verify that feature modules are only loaded when their routes are accessed
3. THE System SHALL measure initial bundle size and ensure it meets performance targets
4. THE System SHALL audit all imports and identify any that prevent lazy loading
5. THE System SHALL document which modules are lazy loaded and which are eagerly loaded

### Requirement 21: Bundle Size Optimization

**User Story:** As a developer, I want to optimize bundle size, so that the application loads quickly for users.

#### Acceptance Criteria

1. THE System SHALL analyze bundle composition and identify large dependencies
2. THE System SHALL remove unused dependencies from package.json
3. THE System SHALL use tree-shaking to eliminate unused code from bundles
4. THE System SHALL split large modules into smaller chunks where appropriate
5. THE System SHALL measure bundle size before and after optimization and document improvements

### Requirement 22: API Call Optimization

**User Story:** As a developer, I want to optimize API calls, so that the application is responsive and efficient.

#### Acceptance Criteria

1. THE System SHALL audit all API calls and identify redundant or unnecessary requests
2. THE System SHALL implement caching for frequently accessed data
3. THE System SHALL batch multiple related API calls where possible
4. THE System SHALL use pagination for large data sets to reduce payload size
5. THE System SHALL measure API call frequency and response times before and after optimization

### Requirement 23: TypeScript SDK Core Module

**User Story:** As a TypeScript developer, I want to use an SDK to interact with the platform, so that I can integrate the platform into my applications.

#### Acceptance Criteria

1. THE SDK SHALL provide an authentication module for obtaining and refreshing access tokens
2. THE SDK SHALL provide an authorization module for checking user permissions
3. THE SDK SHALL provide a GraphQL client for executing queries and mutations
4. THE SDK SHALL provide error handling with typed error responses
5. THE SDK SHALL be published to npm as @orb/sdk-core

### Requirement 24: Python SDK Core Module

**User Story:** As a Python developer, I want to use an SDK to interact with the platform, so that I can integrate the platform into my applications.

#### Acceptance Criteria

1. THE SDK SHALL provide an authentication module for obtaining and refreshing access tokens
2. THE SDK SHALL provide an authorization module for checking user permissions
3. THE SDK SHALL provide an API client for executing GraphQL operations
4. THE SDK SHALL provide error handling with typed exception classes
5. THE SDK SHALL be published to PyPI as orb-sdk-python

### Requirement 25: SDK Documentation

**User Story:** As a developer, I want comprehensive SDK documentation, so that I can quickly learn how to use the SDK.

#### Acceptance Criteria

1. THE SDK documentation SHALL include installation instructions for both TypeScript and Python SDKs
2. THE SDK documentation SHALL include authentication examples showing how to obtain tokens
3. THE SDK documentation SHALL include code examples for common operations (create, read, update, delete)
4. THE SDK documentation SHALL include API reference documentation for all public methods
5. THE SDK documentation SHALL include troubleshooting guidance for common issues

### Requirement 26: Documentation Updates

**User Story:** As a developer, I want updated documentation reflecting all product completion changes, so that I can understand the current system state.

#### Acceptance Criteria

1. THE System SHALL update architecture documentation to reflect new Application Users Management feature
2. THE System SHALL update UI standards documentation to reflect compliance requirements
3. THE System SHALL update accessibility documentation with WCAG 2.1 AA compliance details
4. THE System SHALL update SDK documentation with usage examples and API reference
5. THE System SHALL ensure no duplicate or outdated information exists across documentation files

### Requirement 27: Version and Changelog Management

**User Story:** As a developer, I want version numbers and changelogs updated, so that I can track product evolution.

#### Acceptance Criteria

1. WHEN product completion phases are implemented, THE System SHALL bump the version following semantic versioning
2. THE System SHALL update CHANGELOG.md with descriptions of all new features and improvements
3. THE System SHALL include issue numbers in changelog entries
4. THE System SHALL follow the format: "- Feature description (#issue)"
5. THE System SHALL ensure changelog entries are clear and user-facing

### Requirement 28: Git Commit Standards

**User Story:** As a developer, I want git commits to follow standards, so that project history is clear and traceable.

#### Acceptance Criteria

1. THE System SHALL reference issue numbers in all commit messages
2. THE System SHALL follow conventional commits format: "feat: description #issue"
3. THE System SHALL reference all related issues if multiple are addressed
4. THE System SHALL use descriptive commit messages explaining what changed and why
5. THE System SHALL ensure commits are atomic and focused on single concerns

### Requirement 29: Final Verification

**User Story:** As a developer, I want comprehensive final verification, so that I can be confident the product is ready for release.

#### Acceptance Criteria

1. THE System SHALL verify all unit tests pass
2. THE System SHALL verify all property-based tests pass
3. THE System SHALL verify no linting errors or warnings exist
4. THE System SHALL verify no compilation errors exist
5. THE System SHALL verify documentation renders correctly
6. THE System SHALL verify CHANGELOG.md is updated
7. THE System SHALL verify version is bumped appropriately
8. THE System SHALL verify all commits reference issues
9. THE System SHALL verify accessibility audit passes WCAG 2.1 AA
10. THE System SHALL verify mobile responsiveness testing passes

### Requirement 30: Invitation-Based User Management (Phase 5)

**User Story:** As a platform architect, I want to convert the direct user assignment implementation to an invitation-based flow, so that user privacy is protected and PII is not exposed without consent.

#### Acceptance Criteria

1. THE System SHALL replace AssignUserDialogComponent with InviteUserDialogComponent that accepts email addresses
2. THE System SHALL create invitation notifications in the Notifications table when users are invited
3. THE System SHALL NOT expose user email addresses or PII to administrators until invitations are accepted
4. THE System SHALL provide an invitation acceptance interface for users to accept or reject invitations
5. THE System SHALL create ApplicationUsers or OrganizationUsers records only after invitation acceptance
6. THE System SHALL expire invitations after 7 days if not accepted
7. THE System SHALL notify inviting administrators when invitations are accepted
8. THE System SHALL support the same invitation flow for both applications and organizations
