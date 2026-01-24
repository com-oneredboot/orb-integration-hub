# Requirements Document

## Introduction

This feature enhances the dashboard to display role-specific content in a left-hand pane (approximately 2/3 of the UI width). The content varies based on the user's group membership:

- **USER**: Marketing content to encourage upgrade to CUSTOMER, plus information about the platform's purpose and value
- **CUSTOMER**: List of organizations the user belongs to or manages
- **EMPLOYEE/OWNER**: Placeholder content for future development

The existing right-hand pane (Quick Actions, Account Health, Recent Activity) remains unchanged.

## Glossary

- **Dashboard**: The main landing page for authenticated users after login
- **User_Group**: The role assigned to a user (USER, CUSTOMER, EMPLOYEE, OWNER)
- **Left_Pane**: The primary content area occupying approximately 2/3 of the dashboard width
- **Right_Pane**: The secondary content area containing Quick Actions, Account Health, and Recent Activity
- **Marketing_Content**: Promotional content designed to encourage USER to upgrade to CUSTOMER
- **Organization_List**: A list of organizations a CUSTOMER user is associated with

## Requirements

### Requirement 1: Dashboard Layout Structure

**User Story:** As a user, I want the dashboard to have a clear two-column layout, so that I can see role-specific content alongside my account actions.

#### Acceptance Criteria

1. THE Dashboard SHALL display a two-column layout with the left pane occupying approximately 66% width and the right pane occupying approximately 34% width
2. WHEN the viewport width is below 768px, THE Dashboard SHALL stack the panes vertically with the left pane above the right pane
3. THE Dashboard SHALL maintain the existing header section above both panes

### Requirement 2: USER Role Marketing Content

**User Story:** As a USER, I want to see information about the platform and how to become a CUSTOMER, so that I understand the value proposition and can upgrade my account.

#### Acceptance Criteria

1. WHEN a user has the USER group, THE Left_Pane SHALL display marketing content
2. THE Marketing_Content SHALL include a headline explaining the platform's purpose
3. THE Marketing_Content SHALL include a description of benefits available to CUSTOMER users
4. THE Marketing_Content SHALL include a call-to-action button to upgrade to CUSTOMER
5. THE Marketing_Content SHALL include visual elements (icons or illustrations) to enhance engagement
6. WHEN the upgrade button is clicked, THE Dashboard SHALL navigate to the customer upgrade flow

### Requirement 3: CUSTOMER Role Organization List

**User Story:** As a CUSTOMER, I want to see my organizations on the dashboard, so that I can quickly access and manage them.

#### Acceptance Criteria

1. WHEN a user has the CUSTOMER group, THE Left_Pane SHALL display an organization list
2. THE Organization_List SHALL show the name of each organization
3. THE Organization_List SHALL show the user's role within each organization
4. WHEN an organization is clicked, THE Dashboard SHALL navigate to that organization's detail page
5. IF the user has no organizations, THE Left_Pane SHALL display an empty state with a button to create an organization
6. THE Organization_List SHALL display a loading state while fetching organization data

### Requirement 4: EMPLOYEE/OWNER Role Placeholder

**User Story:** As an EMPLOYEE or OWNER, I want to see a placeholder on my dashboard, so that I know this area will have content in the future.

#### Acceptance Criteria

1. WHEN a user has the EMPLOYEE group, THE Left_Pane SHALL display a placeholder message
2. WHEN a user has the OWNER group, THE Left_Pane SHALL display a placeholder message
3. THE Placeholder_Message SHALL indicate that additional features are coming soon
4. THE Placeholder_Message SHALL include an icon or visual element

### Requirement 5: Role Detection and Content Switching

**User Story:** As a user with multiple roles, I want the dashboard to show the most relevant content for my primary role, so that I see the most useful information.

#### Acceptance Criteria

1. THE Dashboard SHALL determine the user's primary role from their groups array
2. THE Dashboard SHALL use the following role priority: OWNER > EMPLOYEE > CUSTOMER > USER
3. WHEN a user has multiple groups, THE Dashboard SHALL display content for the highest priority role
4. IF a user has no groups, THE Dashboard SHALL default to USER content

### Requirement 6: Visual Consistency

**User Story:** As a user, I want the new dashboard content to match the existing design system, so that the experience feels cohesive.

#### Acceptance Criteria

1. THE Left_Pane content SHALL use the existing orb-card styling
2. THE Left_Pane content SHALL use the existing color variables from the design system
3. THE Left_Pane content SHALL use FontAwesome icons consistent with the rest of the application
4. THE Left_Pane content SHALL follow the BEM naming convention for CSS classes
