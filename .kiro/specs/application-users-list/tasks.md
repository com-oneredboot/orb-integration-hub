# Implementation Plan: Application Users List

## Overview

This implementation plan breaks down the Application Users List feature into discrete coding tasks. The feature follows the Organizations pattern for NgRx store management and uses the shared DataGridComponent for list display. Tasks are organized to build incrementally, with testing integrated throughout.

## Tasks

- [x] 1. Set up NgRx store structure for Users feature
  - Create `features/customers/users/store/` directory
  - Create `users.state.ts` with UserTableRow interface and UsersState interface
  - Define initial state with all required properties (users, userRows, filteredUserRows, filters, loading states, errors)
  - Create `users.actions.ts` with all action definitions (load, filter, select, error management)
  - _Requirements: 4.2_

- [x] 2. Implement Users reducer with filtering logic
  - [x] 2.1 Create `users.reducer.ts` following Organizations pattern
    - Implement `loadUsersSuccess` handler to build userRows from raw data
    - Calculate application counts by grouping ApplicationUsers by userId
    - Filter out users with only REMOVED status ApplicationUsers
    - Compute lastActivity from max(ApplicationUsers.updatedAt)
    - Initialize filteredUserRows = userRows
    - _Requirements: 2.1, 2.4, 3.3, 3.4_
  
  - [x] 2.2 Implement filter actions in reducer
    - Implement `setSearchTerm` handler to update filteredUserRows
    - Implement `setStatusFilter` handler to update filteredUserRows
    - Create `applyFilters()` helper function for search and status filtering
    - Ensure filters are applied whenever userRows or filter values change
    - _Requirements: 6.1, 6.3, 6.4_
  
  - [x] 2.3 Add helper functions to reducer
    - Implement `formatLastActivity()` helper for relative time formatting
    - Support "Just now", "X min ago", "X hours ago", "X days ago", "Mon DD" formats
    - _Requirements: 3.4_
  
  - [x] 2.4 Write property test for reducer filtering
    - **Property 1: User Query Filtering**
    - **Validates: Requirements 2.1, 2.4**
  
  - [x] 2.5 Write property test for combined filters
    - **Property 7: Combined Filter Application**
    - **Validates: Requirements 6.1, 6.3, 6.4**
  
  - [x] 2.6 Write unit tests for reducer edge cases
    - Test empty user list
    - Test users with only REMOVED status (should be excluded)
    - Test formatLastActivity with various timestamps
    - _Requirements: 2.3_

- [x] 3. Implement Users selectors
  - [x] 3.1 Create `users.selectors.ts` with simple state accessors
    - Create feature selector `selectUsersState`
    - Create `selectUsers`, `selectUserRows`, `selectFilteredUserRows`
    - Create `selectIsLoading`, `selectError`
    - Create `selectSearchTerm`, `selectStatusFilter`
    - Create `selectSelectedUser`, `selectSelectedUserId`
    - All selectors should be simple state accessors (no computation)
    - _Requirements: 4.2_
  
  - [x] 3.2 Write property test for selectors
    - **Property 13: Total Count Display**
    - **Validates: Requirements 4.5**
  
  - [x] 3.3 Write unit tests for selectors
    - Test selectors return correct state values
    - Test selectors handle undefined state gracefully
    - _Requirements: 4.2_

- [x] 4. Implement Users effects for API calls
  - [x] 4.1 Create `users.effects.ts` with loadUsers effect
    - Implement `loadUsers$` effect to call UsersService
    - Use `withLatestFrom` to get current user/organization
    - Dispatch `loadUsersSuccess` with users and applicationUserRecords
    - Dispatch `loadUsersFailure` on error with error message
    - Implement `refreshUsers$` effect (same as loadUsers)
    - _Requirements: 2.1, 10.2_
  
  - [x] 4.2 Write unit tests for effects
    - Test loadUsers$ dispatches success action with data
    - Test loadUsers$ dispatches failure action on error
    - Test refreshUsers$ triggers data reload
    - _Requirements: 2.1, 10.2_

- [x] 5. Checkpoint - Ensure store tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement UsersService for GraphQL queries
  - [x] 6.1 Create or update `core/services/users.service.ts`
    - Add `getApplicationUsers(organizationId: string)` method
    - Query Users table for users in organization
    - Query ApplicationUsers table for application assignments
    - Return both users array and applicationUserRecords array
    - Handle authentication modes (AMAZON_COGNITO_USER_POOLS)
    - _Requirements: 2.1, 2.2_
  
  - [x] 6.2 Write unit tests for UsersService
    - Test getApplicationUsers returns correct data structure
    - Test error handling for failed queries
    - _Requirements: 2.1_

- [-] 7. Create GraphQL query definitions
  - [x] 7.1 Create or update `core/graphql/users.graphql.ts`
    - Define `GetApplicationUsers` query
    - Include Users fields: userId, firstName, lastName, status, createdAt, updatedAt
    - Exclude PII fields: email, phoneNumber, cognitoId, cognitoSub
    - _Requirements: 2.1, 3.5_
  
  - [x] 7.2 Create or update `core/graphql/application-users.graphql.ts`
    - Define query for ApplicationUsers by organization
    - Include fields: userId, applicationId, status, updatedAt
    - _Requirements: 2.1_

- [x] 8. Register Users store in app state
  - [x] 8.1 Update `store/app.state.ts` to include users feature state
    - Add `users: UsersState` to AppState interface
    - _Requirements: 4.2_
  
  - [x] 8.2 Update `store/app.reducer.ts` to include users reducer
    - Import and register usersReducer
    - _Requirements: 4.2_
  
  - [x] 8.3 Register UsersEffects in app module or providers
    - Add UsersEffects to effects array
    - _Requirements: 4.2_

- [x] 9. Create UsersListComponent structure
  - [x] 9.1 Create `features/customers/users/components/users-list/` directory
    - Create `users-list.component.ts` as standalone component
    - Create `users-list.component.html` template
    - Create `users-list.component.scss` styles (minimal, use global classes)
    - _Requirements: 4.1_
  
  - [x] 9.2 Set up component class with store selectors
    - Inject Store
    - Create Observable properties for all selectors (userRows$, filteredUserRows$, isLoading$, error$)
    - Initialize breadcrumbItems and tabs configuration
    - _Requirements: 4.2_
  
  - [x] 9.3 Implement ngOnInit to dispatch loadUsers
    - Dispatch `UsersActions.loadUsers()` on component init
    - _Requirements: 2.1_

- [ ] 10. Implement DataGrid configuration
  - [ ] 10.1 Define column definitions for DataGrid
    - Create columns array with User, Status, Applications, Last Updated columns
    - Configure sortable, filterable, width, align properties
    - Set up filter options for status dropdown (ACTIVE, INACTIVE, PENDING)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3, 5.4, 6.2_
  
  - [ ] 10.2 Create cell templates with ViewChild references
    - Create userInfoCell template (orb-info with name and userId)
    - Create statusCell template (status-badge with icon)
    - Create applicationCountCell template (orb-count with clickable styling)
    - Wire templates to column definitions in ngAfterViewInit
    - _Requirements: 3.1, 3.2, 3.3, 3.6_
  
  - [ ] 10.3 Write property test for display fields
    - **Property 3: Required Display Fields**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
  
  - [ ] 10.4 Write property test for PII exclusion
    - **Property 4: PII Field Exclusion**
    - **Validates: Requirements 3.5**
  
  - [ ] 10.5 Write property test for name formatting
    - **Property 5: Full Name Formatting**
    - **Validates: Requirements 3.6**

- [ ] 11. Implement pagination, sorting, and filtering handlers
  - [ ] 11.1 Initialize pageState, sortState, filterState
    - Set default pageState (currentPage: 1, pageSize: 25)
    - Set default sortState (field: 'user', direction: 'asc')
    - Initialize empty filterState
    - _Requirements: 5.6, 9.1_
  
  - [ ] 11.2 Implement onPageChange handler
    - Update pageState with new page number
    - Slice filteredUserRows based on page and pageSize
    - _Requirements: 9.3_
  
  - [ ] 11.3 Implement onSortChange handler
    - Update sortState with new field and direction
    - Dispatch sort action (or handle locally if client-side)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ] 11.4 Implement onFilterChange handler
    - Extract search term and status filter from event
    - Dispatch `setSearchTerm` and `setStatusFilter` actions
    - _Requirements: 6.1, 6.3, 6.4_
  
  - [ ] 11.5 Implement onResetGrid handler
    - Dispatch actions to clear search term and status filter
    - Reset sortState to default
    - Reset pageState to page 1
    - _Requirements: 6.5_
  
  - [ ] 11.6 Write property test for sorting
    - **Property 6: Sorting Consistency**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
  
  - [ ] 11.7 Write property test for pagination
    - **Property 10: Pagination Data Slicing**
    - **Property 11: Pagination Metadata Calculation**
    - **Validates: Requirements 9.3, 9.4**
  
  - [ ] 11.8 Write unit tests for pagination edge cases
    - Test previous button disabled on first page
    - Test next button disabled on last page
    - Test default page size is 25
    - _Requirements: 9.1, 9.5, 9.6_

- [ ] 12. Implement row interaction handlers
  - [ ] 12.1 Implement onRowClick handler
    - Dispatch `selectUser` action with clicked user
    - Dispatch `setSelectedUserId` action with userId
    - Display toast message: "User detail view not yet implemented"
    - _Requirements: 7.2, 7.3_
  
  - [ ] 12.2 Implement onApplicationCountClick handler
    - Stop event propagation to prevent row click
    - Extract applicationIds from row
    - Navigate to `/customers/applications` with query params
    - Pass `filterByUser: userId` and `applicationIds: ids.join(',')` as query params
    - _Requirements: 8.1, 8.2, 8.3, 8.6_
  
  - [ ] 12.3 Write property test for row selection
    - **Property 8: Row Selection State**
    - **Validates: Requirements 7.2**
  
  - [ ] 12.4 Write property test for navigation parameters
    - **Property 9: Application Count Navigation Parameters**
    - **Validates: Requirements 8.3**
  
  - [ ] 12.5 Write unit tests for interaction handlers
    - Test row click stores userId
    - Test row click displays message
    - Test application count click stops propagation
    - Test application count click navigates with correct params
    - _Requirements: 7.2, 7.3, 8.1, 8.2, 8.6_

- [ ] 13. Implement refresh functionality
  - [ ] 13.1 Add refresh button to card header
    - Add orb-card-btn with refresh icon
    - Wire to onRefresh handler
    - _Requirements: 10.1_
  
  - [ ] 13.2 Implement onRefresh handler
    - Dispatch `refreshUsers` action
    - Maintain current filter and sort state
    - _Requirements: 10.2, 10.4_
  
  - [ ] 13.3 Write property test for refresh state preservation
    - **Property 12: Refresh State Preservation**
    - **Validates: Requirements 10.4**
  
  - [ ] 13.4 Write unit tests for refresh
    - Test refresh button exists
    - Test refresh dispatches action
    - Test loading indicator shows during refresh
    - _Requirements: 10.1, 10.2, 10.3_

- [ ] 14. Checkpoint - Ensure component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Create component template with UserPageComponent wrapper
  - [ ] 15.1 Implement template structure
    - Wrap content in `<app-user-page>` with hero, breadcrumbs, tabs
    - Set heroTitle="Users", heroSubtitle="View users assigned to applications"
    - Configure breadcrumbItems array
    - _Requirements: 4.1_
  
  - [ ] 15.2 Add orb-card with header and DataGrid
    - Use orb-card, orb-card__header, orb-card__title classes
    - Add Users icon and title in header
    - Add refresh button in header actions
    - Place DataGrid in orb-card__content
    - _Requirements: 4.1, 10.1_
  
  - [ ] 15.3 Configure DataGrid inputs and outputs
    - Bind columns, data, pageState, sortState, filterState
    - Bind loading, showFilters, showPagination, showReset
    - Wire up event handlers (pageChange, sortChange, filterChange, resetGrid, rowClick)
    - Set trackByField="user", emptyMessage="No users found"
    - _Requirements: 4.3, 4.4, 6.5_
  
  - [ ] 15.4 Add cell template definitions
    - Define ng-template for userInfoCell
    - Define ng-template for statusCell
    - Define ng-template for applicationCountCell
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 16. Add routing configuration
  - [ ] 16.1 Update `features/customers/customers.routes.ts`
    - Add route for 'users' path
    - Set component to UsersListComponent
    - Add canActivate guards: [AuthGuard, RoleGuard]
    - Set data: { roles: ['CUSTOMER', 'EMPLOYEE', 'OWNER'], title: 'Users' }
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [ ] 16.2 Write property test for authorization
    - **Property 2: Authorization Access Control**
    - **Validates: Requirements 1.3**
  
  - [ ] 16.3 Write unit tests for routing
    - Test navigation to /customers/users works
    - Test route guard allows CUSTOMER, EMPLOYEE, OWNER roles
    - Test route guard denies other roles
    - Test Users icon is highlighted when on page
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 17. Implement error handling and empty states
  - [ ] 17.1 Add error display in template
    - Show error message when error$ emits
    - Add "Retry" button that dispatches loadUsers
    - Use orb-error-message class for styling
    - _Requirements: 4.4_
  
  - [ ] 17.2 Add empty state handling
    - Show "No users found" when filteredUserRows is empty
    - Show "No users match your filters" when filters are active and list is empty
    - Add "Clear Filters" button for filtered empty state
    - _Requirements: 6.5_
  
  - [ ] 17.3 Write unit tests for error and empty states
    - Test error message displays when error exists
    - Test retry button dispatches loadUsers
    - Test empty state message displays
    - Test filtered empty state shows clear filters button
    - _Requirements: 4.4, 6.5_

- [ ] 18. Add responsive styling (minimal, use global classes)
  - [ ] 18.1 Configure DataGrid responsive behavior
    - Set hideOnMobile: true for appropriate columns
    - DataGrid handles responsive layout automatically
    - _Requirements: 11.1, 11.2, 11.3_
  
  - [ ] 18.2 Test responsive behavior
    - Verify desktop layout shows all columns
    - Verify tablet layout adjusts appropriately
    - Verify mobile layout uses card view
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 19. Integration testing
  - [ ] 19.1 Write integration tests for full user journey
    - Test: Load page → Filter by name → Sort by status → Navigate to applications
    - Test: Apply filters → Refresh → Verify filters maintained
    - Test: Paginate → Filter → Verify correct data displayed
    - Test: Error state → Retry → Verify success
    - _Requirements: Multiple_
  
  - [ ] 19.2 Write accessibility tests
    - Test keyboard navigation works for all actions
    - Test ARIA labels are present on interactive elements
    - Test screen reader announcements for filter changes
    - Test color contrast meets WCAG 2.1 AA
    - _Requirements: 11.4_

- [ ] 20. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 21. Update documentation
  - [ ] 21.1 Update frontend architecture documentation
    - Add Users List page to architecture docs
    - Document ApplicationUsers query pattern
    - Document UserTableRow interface
    - Ensure no duplicate information across docs
    - Use consistent terminology
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 22. Update version and changelog
  - [ ] 22.1 Bump version in package.json
    - Increment MINOR version (new feature, backward compatible)
    - _Requirements: 13.1, 13.5_
  
  - [ ] 22.2 Update CHANGELOG.md
    - Add entry under "Added" section
    - Format: "- Users List page with filtering, sorting, and pagination (#issue)"
    - Include issue numbers if applicable
    - _Requirements: 13.2, 13.3, 13.4_

- [ ] 23. Final verification
  - [ ] 23.1 Run all checks
    - Run linter: `npm run lint` (must pass with 0 warnings)
    - Run type checker: `npm run typecheck` (must pass)
    - Run all tests: `npm test` (must pass)
    - Run build: `npm run build` (must succeed)
    - _Requirements: 15.1, 15.2, 15.3_
  
  - [ ] 23.2 Verify documentation
    - Verify documentation renders correctly
    - Verify CHANGELOG.md is updated
    - Verify version is bumped
    - _Requirements: 15.4, 15.5, 15.6_
  
  - [ ] 23.3 Verify commit messages
    - Ensure commits follow conventional commits format
    - Ensure commits reference issue numbers (if applicable)
    - Format: `feat: add users list page #issue`
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 15.7_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (100+ iterations each)
- Unit tests validate specific examples and edge cases
- Follow Organizations pattern exactly for NgRx store implementation
- Use DataGridComponent for all list display (no custom tables)
- Use global orb-* CSS classes (no custom component styles)
- Minimize PII exposure (exclude email, phone, cognitoId from display)
