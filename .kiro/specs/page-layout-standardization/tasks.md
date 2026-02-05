# Implementation Plan: Page Layout Standardization

## Overview

This implementation plan converts the page layout standardization design into discrete coding tasks. The approach follows a progressive migration strategy: first creating the reusable TabNavigationComponent with comprehensive testing, then updating global styles, and finally migrating each page component from simplest to most complex. Each task builds on previous work to ensure incremental validation and integration.

## Tasks

- [x] 1. Create TabConfig model and TabNavigationComponent foundation
  - Create `apps/web/src/app/shared/models/tab-config.model.ts` with TabConfig interface
  - Create `apps/web/src/app/shared/components/tab-navigation/` directory
  - Create `tab-navigation.component.ts` as standalone component with @Input() tabs and @Input() activeTabId
  - Create `tab-navigation.component.html` with basic tab rendering using @for loop
  - Create `tab-navigation.component.spec.ts` with basic component creation test
  - _Requirements: 1.1, 1.3, 7.4, 7.5_

- [x] 1.1 Write property test for tab rendering completeness
  - **Property 1: Tab rendering completeness**
  - **Validates: Requirements 1.1**
  - Install fast-check: `npm install --save-dev fast-check`
  - Create arbitrary generator for TabConfig
  - Test that component renders exactly one button per tab with correct labels
  - Configure test to run 100 iterations

- [x] 2. Implement tab interaction and event handling
  - Add @Output() tabChange EventEmitter to TabNavigationComponent
  - Implement selectTab(tabId: string) method that emits tabChange event
  - Implement isActive(tabId: string) method that checks activeTabId
  - Add (click) handler to tab buttons in template
  - Add [class.orb-tab-active] binding to tab buttons
  - _Requirements: 1.2, 1.3_

- [x] 2.1 Write property test for tab click event emission
  - **Property 2: Tab click event emission**
  - **Validates: Requirements 1.2**
  - Test that clicking any tab emits tabChange event with correct tab id
  - Use fast-check to generate random tab configurations
  - Verify event emission for each tab in configuration

- [x] 2.2 Write property test for active tab visual state
  - **Property 3: Active tab visual state**
  - **Validates: Requirements 1.3**
  - Test that exactly one tab has orb-tab-active class
  - Test that the active tab matches the activeTabId input
  - Use fast-check to generate random tab configurations and active indices

- [x] 3. Implement optional tab features (icons and badges)
  - Add @if (tab.icon) block in template to render icon element with class binding
  - Add @if (tab.badge !== undefined && tab.badge !== null) block to render badge element
  - Add CSS classes: orb-tab-icon and orb-tab-badge to template elements
  - _Requirements: 1.4, 1.5_

- [x] 3.1 Write property test for icon conditional rendering
  - **Property 4: Icon conditional rendering**
  - **Validates: Requirements 1.4**
  - Test that icons render if and only if icon property is present
  - Use fast-check to generate tabs with and without icons
  - Verify icon element exists and has correct class when icon is present

- [x] 3.2 Write property test for badge conditional rendering
  - **Property 5: Badge conditional rendering**
  - **Validates: Requirements 1.5**
  - Test that badges render if and only if badge property is present
  - Use fast-check to generate tabs with and without badges (numbers and strings)
  - Verify badge element exists and displays correct value when badge is present

- [x] 4. Add error handling and validation to TabNavigationComponent
  - Implement ngOnInit to validate tabs array and filter invalid tabs
  - Add default Overview tab fallback if no valid tabs exist
  - Implement ngOnChanges to validate activeTabId and default to first tab if invalid
  - Add console.warn for invalid configurations
  - _Requirements: 1.1, 1.3, 7.4_

- [x] 4.1 Write unit tests for error handling
  - Test empty tabs array defaults to Overview tab
  - Test invalid activeTabId defaults to first tab
  - Test tabs with missing id or label are filtered out
  - Test console.warn is called for invalid configurations

- [x] 4.2 Write property test for tab configuration validation
  - **Property 10: Tab configuration validation**
  - **Validates: Requirements 7.4**
  - Test that all rendered tabs have non-empty id and label properties
  - Use fast-check to generate tab configurations including invalid ones
  - Verify component filters out invalid tabs

- [x] 5. Update global styles for tab navigation
  - Open `apps/web/src/styles/components.scss`
  - Add or update .orb-tabs class for tab container styling
  - Add or update .orb-tab class for individual tab button styling
  - Add or update .orb-tab-active class for active tab state
  - Add .orb-tab-icon class for icon styling
  - Add .orb-tab-badge class for badge styling
  - Add hover, focus, and active pseudo-class styles
  - Ensure consistent spacing, colors, and typography
  - _Requirements: 1.6, 3.1, 3.3, 3.4_

- [x] 6. Migrate Environment Detail page (simplest - single tab)
  - Open `apps/web/src/app/features/environments/environment-detail-page/environment-detail-page.component.ts`
  - Import TabNavigationComponent and TabConfig
  - Add tabs property: `[{ id: 'overview', label: 'Overview', icon: 'fas fa-info-circle' }]`
  - Add activeTab property: `'overview'`
  - Add onTabChange method (empty for single tab)
  - Update template to include `<app-tab-navigation>` after breadcrumb
  - Remove any max-width CSS from component stylesheet
  - _Requirements: 2.1, 2.2, 2.5, 6.1, 6.2, 6.3, 8.1, 8.3_

- [x] 6.1 Write integration test for Environment Detail page
  - Test that page uses TabNavigationComponent
  - Test that page has Overview tab as first tab
  - Test that page renders with full-width layout
  - Test layout order: breadcrumb → tabs → content

- [x] 7. Migrate Applications List page
  - Open `apps/web/src/app/features/applications/applications-list-page/applications-list-page.component.ts`
  - Import TabNavigationComponent and TabConfig
  - Add tabs property: `[{ id: 'overview', label: 'Overview', icon: 'fas fa-list' }]`
  - Add activeTab property: `'overview'`
  - Add onTabChange method (empty for single tab)
  - Update template to add `<app-tab-navigation>` and wrap table in content div
  - Remove any max-width CSS from component stylesheet
  - _Requirements: 2.1, 2.2, 2.4, 2.5, 5.1, 8.2, 8.3_

- [~] 7.1 Write property test for list page tab restriction
  - **Property 8: List page tab restriction**
  - **Validates: Requirements 2.4**
  - Test that applications list page has exactly one tab with id 'overview'
  - Test that organizations list page has exactly one tab with id 'overview'

- [x] 8. Migrate Organizations List page
  - Open `apps/web/src/app/features/organizations/organizations-list-page/organizations-list-page.component.ts`
  - Import TabNavigationComponent and TabConfig
  - Add tabs property: `[{ id: 'overview', label: 'Overview', icon: 'fas fa-list' }]`
  - Add activeTab property: `'overview'`
  - Add onTabChange method (empty for single tab)
  - Update template to add `<app-tab-navigation>` and wrap table in content div
  - Remove any max-width CSS from component stylesheet
  - _Requirements: 2.1, 2.2, 2.4, 2.5, 4.1, 8.2, 8.3_

- [x] 9. Checkpoint - Verify list pages and simple detail page
  - Run `npm run lint` to check for linting errors
  - Run `npm test` to verify all tests pass
  - Manually test each migrated page (Environment Detail, Applications List, Organizations List)
  - Verify tab navigation works correctly
  - Verify full-width layouts on all pages
  - Ask the user if questions arise

- [x] 10. Migrate Application Detail page (2 tabs)
  - Open `apps/web/src/app/features/applications/application-detail-page/application-detail-page.component.ts`
  - Import TabNavigationComponent and TabConfig
  - Add tabs property with Overview and Security tabs (with icons)
  - Add activeTab property: `'overview'`
  - Add onTabChange method to handle tab switching
  - Update template to replace existing tabs with `<app-tab-navigation>`
  - Add @switch block in content area to show different content per tab
  - Remove page-specific tab CSS from component stylesheet
  - Remove any max-width CSS from component stylesheet
  - _Requirements: 2.1, 2.2, 2.3, 2.5, 5.2, 5.3, 5.4, 8.1, 8.3_

- [~] 10.1 Write integration test for Application Detail page
  - Test that page uses TabNavigationComponent
  - Test that page has Overview and Security tabs
  - Test that Overview is the first tab
  - Test that tab switching updates displayed content
  - Test that page renders with full-width layout

- [~] 11. Migrate Organization Detail page (4 tabs with badges)
  - Open `apps/web/src/app/features/organizations/organization-detail-page/organization-detail-page.component.ts`
  - Import TabNavigationComponent and TabConfig
  - Add tabs property with Overview, Security, Applications (with badge), and Members (with badge) tabs
  - Add activeTab property: `'overview'`
  - Add onTabChange method to handle tab switching
  - Update template to replace existing tabs with `<app-tab-navigation>`
  - Add @switch block in content area to show different content per tab
  - Update badge values dynamically based on data (applicationCount, memberCount)
  - Remove page-specific tab CSS from component stylesheet
  - Remove any max-width CSS from component stylesheet
  - _Requirements: 2.1, 2.2, 2.3, 2.5, 4.2, 4.3, 4.4, 8.1, 8.3_

- [~] 11.1 Write integration test for Organization Detail page
  - Test that page uses TabNavigationComponent
  - Test that page has Overview, Security, Applications, and Members tabs
  - Test that Overview is the first tab
  - Test that Applications and Members tabs display badges
  - Test that tab switching updates displayed content
  - Test that page renders with full-width layout

- [~] 12. Verify page layout consistency across all pages
  - Create utility function to check page layout structure in tests
  - Verify all pages follow Breadcrumb → Tabs → Content order
  - Verify all pages have Overview as first tab
  - Verify all pages use full-width layout (no max-width)
  - _Requirements: 2.2, 2.5, 8.3_

- [~] 12.1 Write property test for page layout element order
  - **Property 9: Page layout element order**
  - **Validates: Requirements 2.5**
  - Test that all page components have breadcrumb, tabs, and content in correct order
  - Test each migrated page component

- [~] 12.2 Write property test for Overview tab presence
  - **Property 7: Overview tab presence**
  - **Validates: Requirements 2.2**
  - Test that all page components have 'overview' as first tab id
  - Test each migrated page component

- [~] 12.3 Write property test for full-width layout consistency
  - **Property 6: Full-width layout consistency**
  - **Validates: Requirements 2.1, 8.1, 8.2, 8.3**
  - Test that all page components have no max-width constraint
  - Test computed styles on page containers
  - Test each migrated page component

- [~] 12.4 Write property test for page padding consistency
  - **Property 11: Page padding consistency**
  - **Validates: Requirements 8.4**
  - Test that all page components have equal left and right padding
  - Test that padding values are consistent across all pages
  - Test each migrated page component

- [~] 13. Add accessibility features to TabNavigationComponent
  - Add role="tablist" to nav element
  - Add role="tab" to button elements
  - Add [attr.aria-selected] binding based on isActive()
  - Implement @HostListener for keyboard navigation (ArrowLeft, ArrowRight, Home, End)
  - Add selectPreviousTab and selectNextTab helper methods
  - Add focus management when navigating with keyboard
  - _Requirements: 1.2, 1.3_

- [~] 13.1 Write unit tests for accessibility features
  - Test that ARIA attributes are present and correct
  - Test keyboard navigation with ArrowLeft and ArrowRight
  - Test keyboard navigation with Home and End keys
  - Test focus management during keyboard navigation

- [~] 14. Final checkpoint - Run all checks and verify completion
  - Run `npm run lint` to ensure no linting errors
  - Run `npm test` to verify all tests pass (including property tests)
  - Run `npm run build` to ensure production build succeeds
  - Manually test all migrated pages in browser
  - Test tab navigation on all pages
  - Test keyboard navigation on all pages
  - Verify full-width layouts on all pages
  - Verify consistent styling across all pages
  - Ask the user if questions arise

## Notes

- Each task references specific requirements for traceability
- Property tests use fast-check library with 100+ iterations
- Checkpoints ensure incremental validation
- Migration order goes from simplest (single tab) to most complex (4 tabs with badges)
- All pages will use the same TabNavigationComponent for consistency
