# Requirements Document

## Introduction

The Application Users List feature provides a read-only view of users who are currently assigned to applications within an organization. This feature enables administrators and authorized personnel to view and understand user assignments across applications while maintaining appropriate privacy controls by minimizing PII exposure.

## Glossary

- **User**: An individual with an account in the system, identified by userId
- **Application_User**: A user who has been assigned to at least one application via the ApplicationUsers table
- **ApplicationUsers_Table**: The join table linking users to applications with status tracking
- **PII**: Personally Identifiable Information (email, phone number)
- **User_List_Page**: The Angular component displaying the list of application users
- **User_Store**: The NgRx store managing user list state
- **GraphQL_API**: The AppSync API providing user data queries
- **User_Status**: An enumeration of user states from Users table
- **ApplicationUser_Status**: An enumeration of application membership states (ACTIVE, INACTIVE, INVITED, REMOVED)
- **Quick_Actions_Nav**: The icon-based side navigation bar providing quick access to Organizations, Applications, Groups, and Users

## Requirements

### Requirement 1: Navigation Access

**User Story:** As an authorized user, I want to access the Users List page from the Quick Actions navigation, so that I can view application users.

#### Acceptance Criteria

1. WHEN a user with CUSTOMER, EMPLOYEE, or OWNER role views the Quick_Actions_Nav, THE System SHALL display a "Users" icon button (already implemented at `/customers/users`)
2. WHEN a user clicks the "Users" icon in Quick_Actions_Nav, THE System SHALL navigate to the Users List page at `/customers/users`
3. WHEN a user without CUSTOMER, EMPLOYEE, or OWNER role attempts to access the Users List page, THE System SHALL deny access and redirect to an unauthorized page
4. WHEN a user is on the Users List page, THE Quick_Actions_Nav SHALL highlight the Users icon as active

### Requirement 2: Query Application Users

**User Story:** As a system, I want to query only users assigned to applications, so that the list shows relevant users rather than all system users.

#### Acceptance Criteria

1. WHEN the Users List page loads, THE GraphQL_API SHALL query users who have at least one ApplicationUsers record with status ACTIVE, INACTIVE, or INVITED
2. WHEN retrieving user data, THE GraphQL_API SHALL join Users and ApplicationUsers tables to filter assigned users
3. WHEN no users are assigned to applications, THE System SHALL return an empty list
4. THE GraphQL_API SHALL exclude users with only REMOVED status in ApplicationUsers table

### Requirement 3: Display User Information

**User Story:** As an authorized user, I want to see essential user information with minimal PII exposure, so that I can identify users while respecting privacy.

#### Acceptance Criteria

1. WHEN displaying a user in the list, THE User_List_Page SHALL show the user's full name (firstName + lastName) for identification
2. WHEN displaying a user in the list, THE User_List_Page SHALL show the user status from the Users table
3. WHEN displaying a user in the list, THE User_List_Page SHALL show the count of applications assigned to that user (clickable)
4. WHEN displaying a user in the list, THE User_List_Page SHALL show the user's most recent updatedAt timestamp from ApplicationUsers records
5. WHEN displaying a user in the list, THE User_List_Page SHALL NOT display email, phoneNumber, or cognitoId fields
6. WHEN a user's full name is displayed, THE System SHALL format it as "FirstName LastName"

### Requirement 4: List Page Standard Pattern

**User Story:** As a developer, I want the Users List page to follow existing list page patterns, so that the implementation is consistent and maintainable.

#### Acceptance Criteria

1. THE User_List_Page SHALL use the same layout structure as Applications list and Organizations list pages
2. THE User_List_Page SHALL use NgRx store pattern for state management
3. THE User_List_Page SHALL display a loading indicator while fetching data
4. WHEN an error occurs during data fetching, THE User_List_Page SHALL display an error message
5. THE User_List_Page SHALL display the total count of users in the list

### Requirement 5: Sorting Capabilities

**User Story:** As an authorized user, I want to sort the users list, so that I can find users more easily.

#### Acceptance Criteria

1. THE User_List_Page SHALL provide sorting by full name (lastName, firstName) in ascending and descending order
2. THE User_List_Page SHALL provide sorting by status in ascending and descending order
3. THE User_List_Page SHALL provide sorting by application count in ascending and descending order
4. THE User_List_Page SHALL provide sorting by last updated date in ascending and descending order
5. WHEN a user selects a sort option, THE System SHALL re-order the list accordingly
6. THE default sort order SHALL be by full name ascending

### Requirement 6: Search and Filter

**User Story:** As an authorized user, I want to search and filter the users list, so that I can quickly find specific users.

#### Acceptance Criteria

1. WHEN a user enters text in the search field, THE System SHALL filter users by full name (firstName or lastName) containing the search text (case-insensitive)
2. THE User_List_Page SHALL provide a filter dropdown for user status (All statuses from Users table)
3. WHEN a user selects a status filter, THE System SHALL display only users with that status
4. WHEN search text and status filter are both applied, THE System SHALL apply both filters simultaneously
5. WHEN no users match the search and filter criteria, THE User_List_Page SHALL display a "No users found" message

### Requirement 7: User Row Interaction

**User Story:** As an authorized user, I want to click on a user row, so that I can view detailed information about that user in the future.

#### Acceptance Criteria

1. WHEN a user hovers over a user row, THE User_List_Page SHALL provide visual feedback indicating the row is clickable
2. WHEN a user clicks on a user row, THE System SHALL store the selected userId for future navigation
3. WHEN a user clicks on a user row, THE System SHALL display a message indicating that user detail view is not yet implemented
4. THE User_List_Page SHALL prepare the routing structure for future user detail page navigation

### Requirement 8: Application Count Navigation

**User Story:** As an authorized user, I want to click on the application count for a user, so that I can see which applications they are assigned to.

#### Acceptance Criteria

1. WHEN displaying the application count, THE User_List_Page SHALL render it as a clickable link or button
2. WHEN a user clicks on the application count, THE System SHALL navigate to the Applications List page at `/customers/applications`
3. WHEN navigating to Applications List, THE System SHALL pass the list of applicationIds for that user as a filter parameter
4. WHEN the Applications List page loads with a filter parameter, THE System SHALL display only the applications matching the provided applicationIds
5. WHEN the Applications List page loads with a filter, THE System SHALL display a "Filtered by user: [Full Name]" indicator with a clear filter button
6. THE application count click SHALL stop event propagation to prevent triggering the row click

### Requirement 9: Pagination

**User Story:** As an authorized user, I want the users list to be paginated, so that the page loads quickly with large datasets.

#### Acceptance Criteria

1. THE User_List_Page SHALL display 25 users per page by default
2. THE User_List_Page SHALL provide pagination controls (previous, next, page numbers)
3. WHEN a user navigates to a different page, THE System SHALL fetch and display the appropriate page of results
4. THE User_List_Page SHALL display the current page number and total page count
5. WHEN on the first page, THE System SHALL disable the previous button
6. WHEN on the last page, THE System SHALL disable the next button

### Requirement 10: Data Refresh

**User Story:** As an authorized user, I want to refresh the users list, so that I can see the most current data.

#### Acceptance Criteria

1. THE User_List_Page SHALL provide a refresh button
2. WHEN a user clicks the refresh button, THE System SHALL re-query the GraphQL_API for current user data
3. WHEN refreshing data, THE User_List_Page SHALL display a loading indicator
4. WHEN refresh completes, THE System SHALL update the list with new data while maintaining current sort and filter settings

### Requirement 11: Responsive Design

**User Story:** As an authorized user, I want the Users List page to work on different screen sizes, so that I can access it from various devices.

#### Acceptance Criteria

1. WHEN viewing on desktop (>1024px width), THE User_List_Page SHALL display all columns in a table layout
2. WHEN viewing on tablet (768px-1024px width), THE User_List_Page SHALL adjust column widths appropriately
3. WHEN viewing on mobile (<768px width), THE User_List_Page SHALL display users in a card layout with essential information
4. THE User_List_Page SHALL maintain usability and readability across all screen sizes

### Requirement 12: Documentation Updates

**User Story:** As a developer, I want documentation to be updated when new features are added, so that the codebase remains maintainable.

#### Acceptance Criteria

1. WHEN the Users List feature is implemented, THE Documentation_System SHALL update relevant documentation files
2. THE Documentation_System SHALL add Users List page to the frontend architecture documentation
3. THE Documentation_System SHALL document the ApplicationUsers query pattern for future reference
4. THE Documentation_System SHALL ensure no duplicate information exists across documentation files
5. THE Documentation_System SHALL use consistent terminology with existing documentation

### Requirement 13: Version and Changelog Management

**User Story:** As a project maintainer, I want version and changelog updates when features are added, so that releases are properly tracked.

#### Acceptance Criteria

1. WHEN the Users List feature is complete, THE Version_System SHALL bump the application version following semantic versioning
2. THE Version_System SHALL update CHANGELOG.md with the new feature under "Added" section
3. THE CHANGELOG entry SHALL include the feature description and any related issue numbers
4. THE CHANGELOG entry SHALL follow the format: `- Users List page with filtering, sorting, and pagination (#issue)`
5. THE version bump SHALL be MINOR (new feature, backward compatible)

### Requirement 14: Git Commit Standards

**User Story:** As a developer, I want commits to follow standards, so that the git history is clear and traceable.

#### Acceptance Criteria

1. WHEN committing changes for this feature, THE commit message SHALL reference any related issue numbers
2. THE commit message SHALL follow conventional commits format: `feat: add users list page #issue`
3. WHEN multiple issues are addressed, THE commit message SHALL reference all issue numbers
4. THE commit message SHALL be descriptive of the changes made

### Requirement 15: Final Verification

**User Story:** As a developer, I want a final verification checklist, so that nothing is missed before completion.

#### Acceptance Criteria

1. THE System SHALL verify all tests pass (unit tests and property tests)
2. THE System SHALL verify no linting errors exist
3. THE System SHALL verify no TypeScript compilation errors exist
4. THE System SHALL verify documentation renders correctly
5. THE System SHALL verify CHANGELOG.md is updated
6. THE System SHALL verify version is bumped appropriately
7. THE System SHALL verify all commits reference issue numbers (if applicable)
