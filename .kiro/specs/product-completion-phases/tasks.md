# Implementation Plan: Product Completion Phases

## Overview

This implementation plan addresses the final items needed to complete the orb-integration-hub product before SDK implementation. The work is organized into four sequential phases, with each phase building upon the previous one.

## Tasks

### Phase 1: Application Users Management

- [x] 1. Create Application Users Store
  - Create `application-users.state.ts` with state interface following Organizations pattern
  - Create `application-users.actions.ts` with load, assign, unassign, and role update actions
  - Create `application-users.reducer.ts` with filtering logic in reducer
  - Create `application-users.selectors.ts` with simple state accessors
  - Create `application-users.effects.ts` with API call handling
  - _Requirements: 1.6, 9.1_

- [ ]* 1.1 Write property test for application users store
  - **Property 1: User list displays all assigned users**
  - **Validates: Requirements 1.2, 1.3**

- [x] 2. Create ApplicationUsersListComponent
  - [x] 2.1 Create component with DataGridComponent integration
    - Create component file in `features/customers/applications/components/application-users-list/`
    - Configure DataGridComponent with columns for user info, role assignments, last activity
    - Implement store selectors for users, filtered users, loading state
    - Implement row click handler for user detail navigation
    - _Requirements: 1.1, 1.2, 1.3, 1.5_
  
  - [ ]* 2.2 Write property test for user list display
    - **Property 1: User list displays all assigned users**
    - **Validates: Requirements 1.2, 1.3**
  
  - [x] 2.3 Add empty state handling
    - Add empty state template to component
    - Display when no users assigned
    - _Requirements: 1.4_
  
  - [ ]* 2.4 Write unit test for empty state
    - Test empty state displays when no users
    - _Requirements: 1.4_



- [x] 3. Create AssignUserDialogComponent
  - [x] 3.1 Create dialog component with form
    - Create component file in `features/customers/applications/components/assign-user-dialog/`
    - Create reactive form with user selection and environment role assignments
    - Implement form validation
    - Implement submit handler that dispatches assign action
    - _Requirements: 2.1, 2.2_
  
  - [ ]* 3.2 Write property test for user assignment
    - **Property 2: User assignment adds user to application**
    - **Validates: Requirements 2.2**
  
  - [x] 3.3 Add confirmation dialog for unassignment
    - Create confirmation dialog component
    - Show when unassign button clicked
    - Dispatch unassign action on confirm
    - _Requirements: 2.3, 2.4_
  
  - [ ]* 3.4 Write property test for user unassignment
    - **Property 3: User unassignment removes user from application**
    - **Validates: Requirements 2.4**

- [x] 4. Create EditUserRoleDialogComponent
  - [x] 4.1 Create dialog component with role selection
    - Create component file in `features/customers/applications/components/edit-user-role-dialog/`
    - Create reactive form with role dropdown
    - Load available roles for application
    - Implement submit handler that dispatches update role action
    - _Requirements: 3.1, 3.2_
  
  - [ ]* 4.2 Write property test for role updates
    - **Property 4: Role update changes user's environment role**
    - **Validates: Requirements 3.2**
  
  - [x] 4.3 Add role validation
    - Validate selected role exists for application
    - Show error if invalid role selected
    - _Requirements: 3.5_
  
  - [ ]* 4.4 Write property test for invalid role rejection
    - **Property 5: Invalid role assignment is rejected**
    - **Validates: Requirements 3.5**

- [x] 5. Add Users tab to ApplicationDetailPageComponent
  - Integrate ApplicationUsersListComponent into application detail page
  - Add "Users" tab to tab configuration
  - Load application users when tab selected
  - _Requirements: 1.1_

- [ ]* 6. Write property test for operation notifications
  - **Property 6: Operation notifications are displayed**
  - **Validates: Requirements 2.5, 2.6, 3.3, 3.4**

- [x] 7. Checkpoint - Phase 1 Complete
  - Ensure all tests pass, ask the user if questions arise.



### Phase 2: UI Standards Compliance

- [ ] 8. Add Last Activity Column to List Pages
  - [ ] 8.1 Update ApplicationsListComponent
    - Add `lastActivity` field to ApplicationTableRow interface
    - Compute lastActivity in reducer using formatLastActivity helper
    - Add Last Activity column to DataGridComponent configuration
    - Make column sortable
    - _Requirements: 4.1, 4.3, 4.5_
  
  - [ ]* 8.2 Write property test for Last Activity formatting
    - **Property 7: Last Activity formatting is relative**
    - **Validates: Requirements 4.3**
  
  - [ ]* 8.3 Write property test for Last Activity sorting
    - **Property 8: Last Activity column is sortable**
    - **Validates: Requirements 4.5**
  
  - [ ] 8.4 Update UsersListComponent (if needed)
    - Verify Last Activity column exists
    - Add if missing following same pattern
    - _Requirements: 4.2_
  
  - [ ] 8.5 Add tooltip for absolute timestamp
    - Add tooltip directive to Last Activity cells
    - Show absolute timestamp on hover
    - _Requirements: 4.4_

- [ ] 9. Add Metadata Sections to Detail Pages
  - [ ] 9.1 Update ApplicationDetailPageComponent
    - Add metadata section HTML with resourceId, createdAt, updatedAt
    - Implement formatDate helper function
    - Style metadata section consistently
    - _Requirements: 5.1, 5.4_
  
  - [ ]* 9.2 Write property test for metadata formatting
    - **Property 9: Metadata timestamps are formatted**
    - **Validates: Requirements 5.4**
  
  - [ ] 9.3 Update EnvironmentDetailPageComponent
    - Add metadata section following same pattern
    - _Requirements: 5.2_
  
  - [ ] 9.4 Verify OrganizationDetailPageComponent
    - Check if metadata section exists
    - Add if missing
    - _Requirements: 5.3_



- [ ] 10. Audit and Fix UserPageComponent Compliance
  - [ ] 10.1 Audit all feature pages
    - List all components in features/ directories
    - Check each for UserPageComponent usage
    - Document non-compliant pages
    - _Requirements: 6.3_
  
  - [ ] 10.2 Refactor non-compliant pages
    - Wrap pages with UserPageComponent
    - Configure hero, breadcrumbs, tabs
    - Remove custom page wrappers
    - _Requirements: 6.1, 6.4_
  
  - [ ]* 10.3 Write property test for UserPageComponent
    - **Property 10: UserPageComponent accepts required configurations**
    - **Validates: Requirements 6.5**

- [ ] 11. Audit and Fix DataGridComponent Compliance
  - [ ] 11.1 Audit all list pages
    - Find all components with <table> elements
    - Check for custom table implementations
    - Document non-compliant pages
    - _Requirements: 7.2_
  
  - [ ] 11.2 Refactor non-compliant list pages
    - Replace custom tables with DataGridComponent
    - Create column definitions
    - Migrate custom cell rendering to ng-template
    - _Requirements: 7.1, 7.3_
  
  - [ ]* 11.3 Write property test for DataGridComponent features
    - **Property 11: DataGridComponent supports core features**
    - **Validates: Requirements 7.4**
  
  - [ ]* 11.4 Write property test for custom templates
    - **Property 12: DataGridComponent renders custom templates**
    - **Validates: Requirements 7.5**

- [ ] 12. Audit and Fix Global CSS Classes Compliance
  - [ ] 12.1 Audit component stylesheets
    - Review all component .scss files
    - Identify styles duplicating global classes
    - Document custom styles that cannot be replaced
    - _Requirements: 8.2, 8.4_
  
  - [ ] 12.2 Replace custom styles with orb-* classes
    - Update component templates to use global classes
    - Remove duplicate styles from component SCSS
    - Verify visual consistency
    - _Requirements: 8.1, 8.3_

- [ ] 13. Audit and Fix Store-First Architecture Compliance
  - [ ] 13.1 Audit components for direct service calls
    - Search for service method calls in components
    - Identify components with local data state
    - Identify components with local loading/error state
    - _Requirements: 9.2_
  
  - [ ] 13.2 Refactor non-compliant components
    - Create stores for components with direct service calls
    - Replace service calls with action dispatches
    - Replace local state with store selectors
    - _Requirements: 9.1, 9.3, 9.4, 9.5_

- [ ] 14. Checkpoint - Phase 2 Complete
  - Ensure all tests pass, ask the user if questions arise.



### Phase 3: Quality Assurance & Polish

- [ ] 15. Implement Keyboard Navigation
  - [ ] 15.1 Add keyboard navigation support
    - Ensure Tab/Shift+Tab moves focus correctly
    - Ensure Enter/Space activates buttons
    - Ensure Escape closes dialogs
    - Add visible focus indicators
    - Verify no keyboard traps exist
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  
  - [ ]* 15.2 Write property tests for keyboard navigation
    - **Property 13: Keyboard navigation moves focus correctly**
    - **Property 14: Keyboard activates buttons**
    - **Property 15: Escape closes dialogs**
    - **Property 16: Focus indicators are visible**
    - **Property 17: No keyboard traps exist**
    - **Validates: Requirements 10.1-10.6**

- [ ] 16. Implement Screen Reader Support
  - [ ] 16.1 Add ARIA labels and live regions
    - Add ARIA labels for icon-only buttons
    - Add ARIA live regions for dynamic updates
    - Ensure form errors are announced
    - Ensure loading states are announced
    - Add alt text for informational images
    - Use semantic HTML elements
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_
  
  - [ ]* 16.2 Write property tests for screen reader support
    - **Property 18: ARIA labels exist for icon-only elements**
    - **Property 19: Dynamic content updates are announced**
    - **Property 20: Form errors are announced**
    - **Property 21: Loading states are announced**
    - **Property 22: Images have alt text**
    - **Property 23: Semantic HTML is used**
    - **Validates: Requirements 11.1-11.6**

- [ ] 17. Implement Focus Management
  - [ ] 17.1 Add focus management to dialogs
    - Move focus to first element on dialog open
    - Return focus to trigger on dialog close
    - Set initial focus on page load
    - Announce navigation changes
    - Trap focus within modals
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  
  - [ ]* 17.2 Write property tests for focus management
    - **Property 24: Dialog focus is managed**
    - **Property 25: Page load sets initial focus**
    - **Property 26: Navigation changes are announced**
    - **Property 27: Modal focus is trapped**
    - **Validates: Requirements 12.1-12.5**



- [ ] 18. Verify Color Contrast Compliance
  - [ ] 18.1 Audit color combinations
    - Check all text against backgrounds (4.5:1 minimum)
    - Check large text against backgrounds (3:1 minimum)
    - Check interactive elements against adjacent colors (3:1 minimum)
    - _Requirements: 13.1, 13.2, 13.3, 13.4_
  
  - [ ] 18.2 Update colors to meet requirements
    - Update color values that fail contrast requirements
    - Verify changes don't break design
    - _Requirements: 13.5_
  
  - [ ]* 18.3 Write property tests for color contrast
    - **Property 28: Text contrast meets requirements**
    - **Property 29: Interactive element contrast meets requirements**
    - **Validates: Requirements 13.1-13.3**

- [ ] 19. Implement Mobile Responsive Layout
  - [ ] 19.1 Add mobile layout optimizations
    - Optimize layouts for screens < 768px
    - Stack columns vertically on mobile
    - Ensure touch targets are 44x44px minimum
    - Collapse navigation into hamburger menu
    - Verify no horizontal scrolling
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  
  - [ ]* 19.2 Write property tests for mobile layout
    - **Property 30: Mobile layout is optimized**
    - **Property 31: Mobile navigation is collapsed**
    - **Property 32: No horizontal scrolling on mobile**
    - **Validates: Requirements 14.1-14.5**

- [ ] 20. Optimize Mobile Dialogs
  - [ ] 20.1 Add mobile dialog optimizations
    - Display dialogs full-screen or with margins on mobile
    - Ensure content fits without horizontal scrolling
    - Handle keyboard without obscuring content
    - Make close buttons touch-friendly (44x44px)
    - _Requirements: 15.1, 15.2, 15.3, 15.4_
  
  - [ ]* 20.2 Write property tests for mobile dialogs
    - **Property 33: Mobile dialogs are appropriately sized**
    - **Property 34: Mobile keyboard doesn't obscure content**
    - **Property 35: Mobile close buttons are touch-friendly**
    - **Validates: Requirements 15.1-15.4**

- [ ] 21. Optimize Mobile Navigation
  - [ ] 21.1 Add mobile navigation optimizations
    - Implement hamburger menu for mobile
    - Make navigation links touch-friendly
    - Provide breadcrumbs/back navigation
    - Ensure navigation doesn't obscure content
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_
  
  - [ ]* 21.2 Write property tests for mobile navigation
    - **Property 36: Mobile hamburger menu works**
    - **Property 37: Mobile navigation links are touch-friendly**
    - **Property 38: Mobile navigation provides context**
    - **Property 39: Mobile navigation doesn't obscure content**
    - **Validates: Requirements 16.2-16.5**



- [ ] 22. Implement Consistent Error Handling
  - [ ] 22.1 Create centralized error handling service
    - Create ErrorHandlingService with getErrorMessage method
    - Handle GraphQL, validation, network, and authorization errors
    - Integrate with notification service
    - _Requirements: 17.1, 17.2, 17.3, 17.4_
  
  - [ ] 22.2 Update all components to use error service
    - Replace custom error handling with service
    - Ensure consistent error message formatting
    - _Requirements: 17.5_
  
  - [ ]* 22.3 Write property test for error messages
    - **Property 40: Error messages are displayed**
    - **Validates: Requirements 17.1-17.4**

- [ ] 23. Implement Loading States
  - [ ] 23.1 Add loading indicators
    - Add loading spinners for data fetches
    - Disable buttons during form submissions
    - Show loading state during page loads
    - Prevent duplicate submissions
    - _Requirements: 18.1, 18.2, 18.3, 18.4_
  
  - [ ]* 23.2 Write property tests for loading states
    - **Property 41: Loading states are displayed**
    - **Property 42: Duplicate submissions are prevented**
    - **Validates: Requirements 18.1-18.4**

- [ ] 24. Implement Notification System
  - [ ] 24.1 Create notification service
    - Create NotificationService with success/error methods
    - Implement auto-dismiss after 5 seconds
    - Implement manual dismiss on close button click
    - Ensure notifications don't obscure content
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_
  
  - [ ]* 24.2 Write property test for notifications
    - **Property 43: Notifications are displayed and dismissed**
    - **Property 44: Notifications don't obscure content**
    - **Validates: Requirements 19.1-19.5**

- [ ] 25. Verify Lazy Loading
  - [ ] 25.1 Verify lazy loading configuration
    - Check routes for lazy loading
    - Verify modules load only on route access
    - _Requirements: 20.1, 20.2_
  
  - [ ]* 25.2 Write property test for lazy loading
    - **Property 45: Lazy-loaded modules load on route access**
    - **Validates: Requirements 20.2**

- [ ] 26. Optimize API Calls
  - [ ] 26.1 Implement caching service
    - Create CachedDataService with cache duration
    - Implement cache get/set logic
    - _Requirements: 22.2_
  
  - [ ] 26.2 Implement API call batching
    - Identify related API calls that can be batched
    - Implement batching logic
    - _Requirements: 22.3_
  
  - [ ] 26.3 Verify pagination usage
    - Check all list pages use pagination
    - Verify page size limits are appropriate
    - _Requirements: 22.4_
  
  - [ ]* 26.4 Write property tests for API optimizations
    - **Property 46: Data caching works correctly**
    - **Property 47: API calls are batched**
    - **Property 48: Pagination is used for large data sets**
    - **Validates: Requirements 22.2-22.4**

- [ ] 27. Checkpoint - Phase 3 Complete
  - Ensure all tests pass, ask the user if questions arise.



### Phase 4: SDK Implementation

- [ ] 28. Create TypeScript SDK Package Structure
  - Create `packages/orb-sdk-core/` directory
  - Create package.json with dependencies
  - Create tsconfig.json for TypeScript configuration
  - Create src/ directory structure (auth/, authorization/, graphql/, errors/)
  - _Requirements: 23.5_

- [ ] 29. Implement TypeScript SDK Authentication
  - [ ] 29.1 Create AuthClient class
    - Implement signIn method
    - Implement signOut method
    - Implement refreshToken method
    - Implement getCurrentUser method
    - _Requirements: 23.1_
  
  - [ ] 29.2 Create TokenManager class
    - Implement token storage
    - Implement token refresh logic
    - Implement token expiration checking
    - _Requirements: 23.1_
  
  - [ ]* 29.3 Write property test for SDK authentication
    - **Property 49: SDK authentication returns tokens**
    - **Validates: Requirements 23.1**

- [ ] 30. Implement TypeScript SDK Authorization
  - [ ] 30.1 Create PermissionChecker class
    - Implement checkPermission method
    - Implement getUserPermissions method
    - Integrate with GraphQL client
    - _Requirements: 23.2_
  
  - [ ]* 30.2 Write property test for SDK authorization
    - **Property 50: SDK authorization checks permissions correctly**
    - **Validates: Requirements 23.2**

- [ ] 31. Implement TypeScript SDK GraphQL Client
  - [ ] 31.1 Create GraphQLClient class
    - Implement query method
    - Implement mutate method
    - Integrate with AuthClient for token management
    - Handle GraphQL errors
    - _Requirements: 23.3_
  
  - [ ]* 31.2 Write property test for SDK GraphQL operations
    - **Property 51: SDK executes GraphQL operations**
    - **Validates: Requirements 23.3**

- [ ] 32. Implement TypeScript SDK Error Handling
  - [ ] 32.1 Create error classes
    - Create SDKError base class
    - Create AuthenticationError class
    - Create AuthorizationError class
    - Create GraphQLError class
    - _Requirements: 23.4_
  
  - [ ]* 32.2 Write property test for SDK error handling
    - **Property 52: SDK provides typed errors**
    - **Validates: Requirements 23.4**

- [ ] 33. Create TypeScript SDK Main Class
  - Create OrbSDK class that integrates all modules
  - Export all public interfaces and classes
  - Create index.ts with exports
  - _Requirements: 23.1, 23.2, 23.3, 23.4_



- [ ] 34. Create Python SDK Package Structure
  - Create `packages/orb-sdk-python/` directory
  - Create setup.py with dependencies
  - Create orb_sdk/ directory structure (auth/, authorization/, graphql/, errors/)
  - Create __init__.py files
  - _Requirements: 24.5_

- [ ] 35. Implement Python SDK Authentication
  - [ ] 35.1 Create AuthClient class
    - Implement sign_in method
    - Implement sign_out method
    - Implement refresh_token method
    - Implement get_current_user method
    - _Requirements: 24.1_
  
  - [ ] 35.2 Create TokenManager class
    - Implement token storage
    - Implement token refresh logic
    - Implement token expiration checking
    - _Requirements: 24.1_
  
  - [ ]* 35.3 Write property test for Python SDK authentication
    - **Property 49: SDK authentication returns tokens**
    - **Validates: Requirements 24.1**

- [ ] 36. Implement Python SDK Authorization
  - [ ] 36.1 Create PermissionChecker class
    - Implement check_permission method
    - Implement get_user_permissions method
    - Integrate with GraphQL client
    - _Requirements: 24.2_
  
  - [ ]* 36.2 Write property test for Python SDK authorization
    - **Property 50: SDK authorization checks permissions correctly**
    - **Validates: Requirements 24.2**

- [ ] 37. Implement Python SDK GraphQL Client
  - [ ] 37.1 Create GraphQLClient class
    - Implement query method
    - Implement mutate method
    - Integrate with AuthClient for token management
    - Handle GraphQL errors
    - _Requirements: 24.3_
  
  - [ ]* 37.2 Write property test for Python SDK GraphQL operations
    - **Property 51: SDK executes GraphQL operations**
    - **Validates: Requirements 24.3**

- [ ] 38. Implement Python SDK Error Handling
  - [ ] 38.1 Create error classes
    - Create SDKError base exception
    - Create AuthenticationError exception
    - Create AuthorizationError exception
    - Create GraphQLError exception
    - _Requirements: 24.4_
  
  - [ ]* 38.2 Write property test for Python SDK error handling
    - **Property 52: SDK provides typed errors**
    - **Validates: Requirements 24.4**

- [ ] 39. Create Python SDK Main Class
  - Create OrbSDK class that integrates all modules
  - Export all public classes and functions
  - Create __init__.py with exports
  - _Requirements: 24.1, 24.2, 24.3, 24.4_



- [ ] 40. Create SDK Documentation
  - [ ] 40.1 Write TypeScript SDK documentation
    - Write installation instructions
    - Write authentication examples
    - Write CRUD operation examples
    - Write API reference documentation
    - Write troubleshooting guide
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5_
  
  - [ ] 40.2 Write Python SDK documentation
    - Write installation instructions
    - Write authentication examples
    - Write CRUD operation examples
    - Write API reference documentation
    - Write troubleshooting guide
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5_

- [ ] 41. Publish SDKs
  - Publish TypeScript SDK to npm as @orb/sdk-core
  - Publish Python SDK to PyPI as orb-sdk-python
  - Verify packages are accessible
  - _Requirements: 23.5, 24.5_

- [ ] 42. Checkpoint - Phase 4 Complete
  - Ensure all tests pass, ask the user if questions arise.



### Phase 5: Invitation-Based User Management Conversion

- [ ] 43. Update Notifications Schema for Invitations
  - [ ] 43.1 Verify Notifications table schema
    - Verify ORGANIZATION_INVITATION_RECEIVED type exists
    - Verify APPLICATION_INVITATION_RECEIVED type exists
    - Verify metadata field supports invitation context (organizationId, applicationId, roleIds)
    - _Requirements: 2.8, 3a.1_
  
  - [ ] 43.2 Create invitation notification templates
    - Create email template for organization invitations
    - Create email template for application invitations
    - Include accept/reject links in templates
    - _Requirements: 3a.2_

- [ ] 44. Replace AssignUserDialogComponent with InviteUserDialogComponent
  - [ ] 44.1 Create InviteUserDialogComponent
    - Create component file in `features/customers/applications/components/invite-user-dialog/`
    - Create reactive form with email input and environment role assignments
    - Implement email validation
    - Implement submit handler that dispatches invite action
    - _Requirements: 2.1, 2.2_
  
  - [ ]* 44.2 Write property test for user invitation
    - **Property: User invitation creates notification**
    - **Validates: Requirements 2.2, 3a.1**
  
  - [ ] 44.3 Delete AssignUserDialogComponent
    - Remove component files
    - Remove from imports
    - Update references to use InviteUserDialogComponent
    - _Requirements: 2.8_

- [ ] 45. Update Application Users Store for Invitations
  - [ ] 45.1 Replace assign actions with invite actions
    - Replace `assignUserToApplication` with `inviteUserToApplication`
    - Replace `assignUserSuccess` with `inviteUserSuccess`
    - Replace `assignUserFailure` with `inviteUserFailure`
    - Update state interface: `isAssigning` → `isInviting`, `assignError` → `inviteError`
    - _Requirements: 2.2, 2.5_
  
  - [ ] 45.2 Replace unassign actions with remove actions
    - Replace `unassignUserFromApplication` with `removeUserFromApplication`
    - Replace `unassignUserSuccess` with `removeUserSuccess`
    - Replace `unassignUserFailure` with `removeUserFailure`
    - Update state interface: `isUnassigning` → `isRemoving`, `unassignError` → `removeError`
    - _Requirements: 2.4, 2.6_
  
  - [ ] 45.3 Update effects for invitation flow
    - Update `inviteUserToApplication$` effect to create notification instead of direct assignment
    - Update `removeUserFromApplication$` effect to handle removal
    - Remove user detail fetching from invite flow (user not yet accepted)
    - _Requirements: 2.2, 2.4_
  
  - [ ]* 45.4 Write property test for invitation store
    - **Property: Invitation action creates notification**
    - **Validates: Requirements 2.2**

- [ ] 46. Create Invitation Acceptance Flow
  - [ ] 46.1 Create InvitationListComponent
    - Create component in `features/user/components/invitation-list/`
    - Display pending invitations from Notifications table
    - Show organization/application name and inviting administrator
    - Implement accept/reject buttons
    - _Requirements: 3a.1, 3a.2_
  
  - [ ] 46.2 Create invitation acceptance store
    - Create `invitation.state.ts` with pending invitations
    - Create `invitation.actions.ts` with accept/reject actions
    - Create `invitation.reducer.ts` with invitation state management
    - Create `invitation.selectors.ts` with invitation queries
    - Create `invitation.effects.ts` with API call handling
    - _Requirements: 3a.3, 3a.4_
  
  - [ ] 46.3 Implement accept invitation logic
    - Create ApplicationUsers or OrganizationUsers record on accept
    - Update notification status to ACCEPTED
    - Notify inviting administrator
    - _Requirements: 3a.3, 3a.5_
  
  - [ ] 46.4 Implement reject invitation logic
    - Update notification status to REJECTED
    - Remove from pending invitations list
    - _Requirements: 3a.4_
  
  - [ ] 46.5 Implement invitation expiration
    - Add Lambda function to expire invitations after 7 days
    - Update notification status to EXPIRED
    - Schedule via EventBridge rule (daily)
    - _Requirements: 3a.6_
  
  - [ ]* 46.6 Write property tests for invitation acceptance
    - **Property: Accepting invitation adds user to application**
    - **Property: Rejecting invitation removes from pending**
    - **Property: Expired invitations are marked as expired**
    - **Validates: Requirements 3a.3, 3a.4, 3a.6**

- [ ] 47. Update ApplicationUsersListComponent
  - [ ] 47.1 Replace "Assign User" button with "Invite User"
    - Update button text and icon
    - Update click handler to open InviteUserDialogComponent
    - _Requirements: 2.1_
  
  - [ ] 47.2 Replace "Unassign" button with "Remove"
    - Update button text
    - Update confirmation dialog text
    - Update action dispatch to use removeUserFromApplication
    - _Requirements: 2.4_
  
  - [ ] 47.3 Remove PII from list view
    - Ensure email addresses are not displayed in user list
    - Only show userId, name, roles, environments
    - _Requirements: 2.9_
  
  - [ ] 47.4 Add pending invitations indicator
    - Show count of pending invitations for this application
    - Link to invitations view
    - _Requirements: 3a.1_

- [ ] 48. Update ApplicationUsersService
  - [ ] 48.1 Replace assignUserToApplication with inviteUserToApplication
    - Update method signature to accept email instead of userId
    - Create notification record instead of ApplicationUsers record
    - Send invitation email
    - _Requirements: 2.2_
  
  - [ ] 48.2 Replace unassignUserFromApplication with removeUserFromApplication
    - Update method name
    - Keep deletion logic the same
    - _Requirements: 2.4_
  
  - [ ] 48.3 Add invitation acceptance methods
    - Add acceptInvitation method
    - Add rejectInvitation method
    - _Requirements: 3a.3, 3a.4_

- [ ] 49. Create Organization Users Management (Mirror Application Users)
  - [ ] 49.1 Create OrganizationUsersListComponent
    - Follow same pattern as ApplicationUsersListComponent
    - Display users assigned to organization
    - Support invite/remove/role change operations
    - _Requirements: Similar to Req 1-3 but for organizations_
  
  - [ ] 49.2 Create organization-users store
    - Follow same pattern as application-users store
    - Implement invite/remove/role update actions
    - _Requirements: Similar to Req 1-3 but for organizations_
  
  - [ ] 49.3 Add Users tab to OrganizationDetailPageComponent
    - Add tab configuration
    - Integrate OrganizationUsersListComponent
    - Load organization users when tab selected
    - _Requirements: Similar to Req 1 but for organizations_
  
  - [ ] 49.4 Create InviteUserToOrganizationDialogComponent
    - Follow same pattern as InviteUserDialogComponent
    - Support organization-level role assignments
    - _Requirements: Similar to Req 2 but for organizations_

- [ ] 50. Update GraphQL Schema and Resolvers
  - [ ] 50.1 Add InviteUserToApplication mutation
    - Define mutation input (email, applicationId, roleIds)
    - Create VTL resolver or Lambda resolver
    - Return invitation notification record
    - _Requirements: 2.2_
  
  - [ ] 50.2 Add InviteUserToOrganization mutation
    - Define mutation input (email, organizationId, roleIds)
    - Create VTL resolver or Lambda resolver
    - Return invitation notification record
    - _Requirements: Similar to 2.2 but for organizations_
  
  - [ ] 50.3 Add AcceptInvitation mutation
    - Define mutation input (notificationId)
    - Create Lambda resolver for complex logic
    - Create ApplicationUsers or OrganizationUsers record
    - Update notification status
    - _Requirements: 3a.3_
  
  - [ ] 50.4 Add RejectInvitation mutation
    - Define mutation input (notificationId)
    - Update notification status to REJECTED
    - _Requirements: 3a.4_
  
  - [ ] 50.5 Add GetPendingInvitations query
    - Define query for current user's pending invitations
    - Filter by recipientUserId and status=PENDING
    - Return invitation notifications
    - _Requirements: 3a.1_

- [ ] 51. Update Documentation for Invitation Flow
  - Update architecture documentation to reflect invitation-based flow
  - Document Notifications table usage for invitations
  - Document invitation acceptance workflow
  - Update API documentation with new mutations/queries
  - _Requirements: 26.1, 26.2_

- [ ] 52. Checkpoint - Phase 5 Complete
  - Ensure all tests pass, ask the user if questions arise.
  - Verify invitation flow works end-to-end
  - Verify no PII is exposed before invitation acceptance
  - Verify notifications are created correctly
  - Verify invitation expiration works



### Standard Requirements (All Phases)

- [ ] 53. Update Documentation
  - Update architecture documentation to reflect Application Users Management feature
  - Update UI standards documentation to reflect compliance requirements
  - Update accessibility documentation with WCAG 2.1 AA compliance details
  - Update SDK documentation with usage examples and API reference
  - Ensure no duplicate or outdated information exists
  - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5_

- [ ] 54. Version and Changelog Management
  - Bump version following semantic versioning (major.minor.patch)
  - Update CHANGELOG.md with descriptions of all new features and improvements
  - Include issue numbers in changelog entries
  - Follow format: "- Feature description (#issue)"
  - Ensure changelog entries are clear and user-facing
  - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5_

- [ ] 55. Git Commit Standards
  - Reference issue numbers in all commit messages
  - Follow conventional commits format: "feat: description #issue"
  - Reference all related issues if multiple are addressed
  - Use descriptive commit messages explaining what changed and why
  - Ensure commits are atomic and focused on single concerns
  - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5_

- [ ] 56. Final Verification
  - Verify all unit tests pass
  - Verify all property-based tests pass
  - Verify no linting errors or warnings exist
  - Verify no compilation errors exist
  - Verify documentation renders correctly
  - Verify CHANGELOG.md is updated
  - Verify version is bumped appropriately
  - Verify all commits reference issues
  - Verify accessibility audit passes WCAG 2.1 AA
  - Verify mobile responsiveness testing passes
  - _Requirements: 29.1, 29.2, 29.3, 29.4, 29.5, 29.6, 29.7, 29.8, 29.9, 29.10_

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation after each phase
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Follow Organizations pattern as canonical reference for all store implementations
- Use DataGridComponent for all list pages
- Use UserPageComponent wrapper for all feature pages
- Use global orb-* CSS classes instead of custom styles
- All components must follow store-first architecture
- WCAG 2.1 AA compliance is mandatory for all UI components
- Mobile responsiveness is mandatory for all pages
- SDKs must be published before project is considered complete
- Phase 5 (Invitation-Based User Management) converts the existing direct assignment implementation to a privacy-focused invitation flow
- Invitation flow protects user PII by not exposing email addresses until users accept invitations

