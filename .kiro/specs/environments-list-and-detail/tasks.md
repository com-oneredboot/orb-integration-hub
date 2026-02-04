# Implementation Plan: Environments List and Detail

## Overview

This implementation plan creates an environments list component and improves the environment detail page tab UI. The implementation follows the NgRx store-first architecture pattern established by the Organizations feature.

## Tasks

- [x] 1. Create NgRx store for environments list
  - [x] 1.1 Create environments state interface and initial state
    - Create `apps/web/src/app/features/customers/applications/store/environments/environments.state.ts`
    - Define `EnvironmentTableRow` interface with config, apiKey, status, statusLabel, keyPrefix, rateLimitDisplay, originsCount, webhookStatus, lastActivity
    - Define `EnvironmentsState` interface with configs, apiKeys, environmentRows, filteredEnvironmentRows, applicationId, organizationId, searchTerm, statusFilter, isLoading, error
    - Export initial state
    - _Requirements: 2.1, 4.5_

  - [x] 1.2 Create environments actions
    - Create `apps/web/src/app/features/customers/applications/store/environments/environments.actions.ts`
    - Define loadEnvironments, loadEnvironmentsSuccess, loadEnvironmentsFailure actions
    - Define setSearchTerm, setStatusFilter actions
    - Define setApplicationContext action
    - _Requirements: 2.2, 2.4_

  - [x] 1.3 Create environments reducer with status computation
    - Create `apps/web/src/app/features/customers/applications/store/environments/environments.reducer.ts`
    - Implement `computeEnvironmentStatus()` helper function
    - Implement `buildEnvironmentRows()` to transform configs and apiKeys into table rows
    - Implement `applyFilters()` helper function
    - Handle loadEnvironmentsSuccess to build environmentRows and filteredEnvironmentRows
    - Handle filter actions to update filteredEnvironmentRows
    - _Requirements: 2.5, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 1.4 Write property test for environment status computation
    - **Property 2: Environment Status Computation**
    - Test that status is correctly computed from API key state
    - Generate random API key states (ACTIVE, REVOKED, EXPIRED, null)
    - Verify status matches expected value
    - **Validates: Requirements 1.3, 4.1, 4.2, 4.3, 4.4**

  - [x] 1.5 Create environments selectors
    - Create `apps/web/src/app/features/customers/applications/store/environments/environments.selectors.ts`
    - Define selectEnvironmentsState, selectEnvironmentRows, selectFilteredEnvironmentRows
    - Define selectIsLoading, selectError, selectApplicationId
    - _Requirements: 2.1_

  - [x] 1.6 Create environments effects
    - Create `apps/web/src/app/features/customers/applications/store/environments/environments.effects.ts`
    - Implement loadEnvironments$ effect to call ApplicationEnvironmentConfigService
    - Load both configs and API keys for the application
    - _Requirements: 2.2_

  - [x] 1.7 Register environments store in applications module
    - Update `apps/web/src/app/features/customers/applications/applications.module.ts` or feature config
    - Register environments reducer and effects
    - _Requirements: 2.1_

- [x] 2. Checkpoint - Ensure store compiles and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Create environments list component
  - [x] 3.1 Create environments list component files
    - Create `apps/web/src/app/features/customers/applications/components/environments-list/environments-list.component.ts`
    - Create `apps/web/src/app/features/customers/applications/components/environments-list/environments-list.component.html`
    - Create `apps/web/src/app/features/customers/applications/components/environments-list/environments-list.component.scss`
    - Follow OrganizationsListComponent pattern exactly
    - _Requirements: 1.1, 2.1, 2.2, 2.3_

  - [x] 3.2 Implement component TypeScript
    - Import DataGridComponent, ColumnDefinition, PageState, SortState, FilterState
    - Define store selectors: environmentRows$, filteredEnvironmentRows$, isLoading$
    - Define ViewChild template references for custom cells
    - Implement ngOnInit to dispatch loadEnvironments action
    - Implement grid event handlers: onPageChange, onSortChange, onFilterChange, onResetGrid, onRowClick
    - _Requirements: 1.1, 1.10, 2.1, 2.2, 2.4_

  - [x] 3.3 Implement component template with DataGridComponent
    - Use orb-card structure with header and content
    - Configure DataGridComponent with columns, data, pageState, sortState, filterState
    - Create custom cell templates: environmentCell, statusCell, apiKeyCell, originsCell, webhookCell
    - Use orb-info, orb-count, status-badge global CSS classes
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 3.4 Write property test for environment list data integrity
    - **Property 1: Environment List Data Integrity**
    - Generate random environment configs
    - Verify row count matches config count
    - Verify each row contains correct data
    - **Validates: Requirements 1.1, 1.2, 1.6, 1.7, 1.8, 1.9**

  - [x] 3.5 Write property test for API key display
    - **Property 3: API Key Display**
    - Generate environments with and without API keys
    - Verify key prefix displayed when present, "—" when absent
    - **Validates: Requirements 1.4, 1.5**

  - [x] 3.6 Write property test for filter state updates
    - **Property 4: Filter State Updates Filtered Rows**
    - Generate random environments and filter criteria
    - Verify filtered rows match filter criteria
    - **Validates: Requirements 2.4, 2.5**

- [x] 4. Checkpoint - Ensure environments list renders correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update environment detail page with tab UI
  - [x] 5.1 Update environment detail page template with orb-tabs
    - Replace current section-based layout with tab navigation
    - Add orb-tabs container with tab buttons
    - Add orb-tabs__tab class to each tab button
    - Add orb-tabs__tab--active class binding for active tab
    - Add orb-tabs__icon for tab icons
    - Add orb-tabs__badge for issue counts
    - _Requirements: 3.1, 3.2, 3.3, 3.6_

  - [x] 5.2 Update environment detail page TypeScript for tab navigation
    - Define tabs array with TabConfig objects
    - Implement setActiveTab method
    - Add ARIA attributes for accessibility (role="tab", aria-selected)
    - Add keyboard navigation support (arrow keys)
    - _Requirements: 3.4, 6.1, 6.2_

  - [x] 5.3 Update environment detail page SCSS for tab styling
    - Import orb-tabs styles or use global classes
    - Add any component-specific tab styling
    - Ensure proper spacing and alignment
    - _Requirements: 3.1, 3.6_

  - [x] 5.4 Write property test for tab switching
    - **Property 5: Tab Switching Updates Content and Styling**
    - Generate random tab selections
    - Verify active class applied correctly
    - Verify correct content section visible
    - **Validates: Requirements 3.4, 3.6**

  - [x] 5.5 Write property test for tab issue count
    - **Property 6: Tab Issue Count Accuracy**
    - Generate random configuration states
    - Verify badge count matches issue count
    - **Validates: Requirements 3.5**

- [x] 6. Wire up routing and integration
  - [x] 6.1 Add environments list to application detail page
    - Import EnvironmentsListComponent in application detail page
    - Add environments section to application detail template
    - Pass applicationId to environments list
    - _Requirements: 1.1_

  - [x] 6.2 Verify navigation from list to detail
    - Test clicking environment row navigates to detail page
    - Verify route parameters are correct
    - _Requirements: 1.10_

- [x] 7. Add accessibility features
  - [x] 7.1 Add keyboard navigation to tabs
    - Implement arrow key navigation between tabs
    - Add Enter/Space key to activate tab
    - Add tabindex management
    - _Requirements: 6.1_

  - [x] 7.2 Add ARIA attributes
    - Add role="tablist" to tab container
    - Add role="tab" to tab buttons
    - Add role="tabpanel" to content sections
    - Add aria-selected, aria-controls, aria-labelledby
    - _Requirements: 6.2_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks including property tests are required
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Follow the Organizations list pattern as the canonical reference
