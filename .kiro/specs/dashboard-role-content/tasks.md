# Implementation Plan: Dashboard Role-Based Content

## Overview

This implementation plan adds role-based content to the dashboard left pane. The work is organized to build incrementally, starting with the layout restructure, then adding each content type component, and finally wiring everything together.

## Tasks

- [x] 1. Add Dashboard Content Type Infrastructure
  - [x] 1.1 Create DashboardContentType enum and interfaces
    - Add `DashboardContentType` enum with USER_MARKETING, CUSTOMER_ORGANIZATIONS, EMPLOYEE_PLACEHOLDER, OWNER_PLACEHOLDER
    - Add `OrganizationSummary` interface for organization list display
    - _Requirements: 5.1_

  - [x] 1.2 Implement getDashboardContentType method
    - Add method to DashboardComponent that determines content type from user groups
    - Implement role priority: OWNER > EMPLOYEE > CUSTOMER > USER
    - Handle null/empty groups defaulting to USER_MARKETING
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 1.3 Write property test for role priority determination
    - **Property 1: Role Priority Determination**
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [x] 1.4 Write property test for default content
    - **Property 2: Default Content for Empty Groups**
    - **Validates: Requirements 5.4**

- [x] 2. Restructure Dashboard Layout
  - [x] 2.1 Update dashboard HTML to two-column layout
    - Wrap existing content in right-pane container
    - Add left-pane container for role-based content
    - Add responsive CSS for mobile stacking
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 2.2 Update dashboard SCSS for two-column layout
    - Add flexbox/grid layout for 66%/34% split
    - Add media query for mobile breakpoint (768px)
    - Ensure header remains full-width above both panes
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 3. Checkpoint - Layout Complete
  - Ensure dashboard renders with two-column layout
  - Verify responsive behavior on mobile
  - Ask the user if questions arise

- [x] 4. Create User Marketing Content Component
  - [x] 4.1 Create UserMarketingContentComponent
    - Create new standalone component in dashboard folder
    - Add features array with icons, titles, descriptions
    - Add upgrade button with navigation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 4.2 Create user-marketing-content template
    - Add headline section explaining platform purpose
    - Add features grid with icons
    - Add benefits description
    - Add upgrade CTA button
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

  - [x] 4.3 Create user-marketing-content styles
    - Use orb-card styling
    - Add feature grid layout
    - Style CTA button with primary color
    - _Requirements: 6.1, 6.3, 6.4_

  - [x] 4.4 Write unit tests for UserMarketingContentComponent
    - Test component creation
    - Test upgrade button navigation
    - Test feature list rendering
    - _Requirements: 2.6_

- [x] 5. Create Customer Organizations Component
  - [x] 5.1 Create CustomerOrganizationsComponent
    - Create new standalone component in dashboard folder
    - Add organizations$ observable (mock data for now)
    - Add isLoading$ observable
    - Add navigation methods
    - _Requirements: 3.1, 3.6_

  - [x] 5.2 Create customer-organizations template
    - Add organization list with name and role display
    - Add loading state indicator
    - Add empty state with create button
    - Add click handler for organization navigation
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 5.3 Create customer-organizations styles
    - Use orb-card styling for list items
    - Style loading and empty states
    - Add hover effects for clickable items
    - _Requirements: 6.1, 6.3, 6.4_

  - [x] 5.4 Write unit tests for CustomerOrganizationsComponent
    - Test component creation
    - Test organization click navigation
    - Test empty state display
    - Test loading state display
    - _Requirements: 3.4, 3.5, 3.6_

  - [x] 5.5 Write property test for organization data display
    - **Property 4: Organization Data Display Integrity**
    - **Validates: Requirements 3.2, 3.3**

- [x] 6. Create Employee/Owner Placeholder Component
  - [x] 6.1 Create EmployeePlaceholderComponent
    - Create new standalone component in dashboard folder
    - Add roleType input for EMPLOYEE or OWNER
    - _Requirements: 4.1, 4.2_

  - [x] 6.2 Create employee-placeholder template
    - Add coming soon message
    - Add icon/visual element
    - Customize message based on roleType input
    - _Requirements: 4.3, 4.4_

  - [x] 6.3 Create employee-placeholder styles
    - Use orb-card styling
    - Center content with appropriate spacing
    - _Requirements: 6.1, 6.4_

  - [x] 6.4 Write unit tests for EmployeePlaceholderComponent
    - Test component creation
    - Test roleType input handling
    - Test placeholder message rendering
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 7. Checkpoint - Components Complete
  - Ensure all three content components render correctly
  - Verify styling matches design system
  - Ask the user if questions arise

- [x] 8. Wire Components to Dashboard
  - [x] 8.1 Import and register new components in DashboardComponent
    - Add imports for all three content components
    - Add contentType$ observable derived from currentUser$
    - _Requirements: 2.1, 3.1, 4.1, 4.2_

  - [x] 8.2 Update dashboard template with conditional rendering
    - Add ngSwitch on contentType
    - Render appropriate component for each content type
    - _Requirements: 2.1, 3.1, 4.1, 4.2_

  - [x] 8.3 Write property test for role-based content rendering
    - **Property 3: Role-Based Content Rendering**
    - **Validates: Requirements 2.1, 3.1, 4.1, 4.2**

  - [x] 8.4 Write unit tests for dashboard content switching
    - Test USER shows marketing content
    - Test CUSTOMER shows organization list
    - Test EMPLOYEE shows placeholder
    - Test OWNER shows placeholder
    - _Requirements: 2.1, 3.1, 4.1, 4.2_

- [x] 9. Final Checkpoint
  - Ensure all tests pass (509 tests passing)
  - Run linting and type checking (all pass)
  - Verify no console errors in browser
  - Ask the user if questions arise

## Notes

- All tasks are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Mock organization data will be used initially; real data integration is a future task

