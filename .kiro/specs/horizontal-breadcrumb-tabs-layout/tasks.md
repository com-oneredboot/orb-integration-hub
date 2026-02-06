# Implementation Plan: Horizontal Breadcrumb and Tabs Layout

## Overview

This implementation plan breaks down the horizontal breadcrumb and tabs layout feature into discrete coding tasks. The approach focuses on modifying three existing components: the breadcrumb component (adding truncation logic), the tab navigation component (ensuring font size consistency), and the user page layout (implementing responsive flexbox layout). Each task builds incrementally, with property-based tests integrated alongside implementation to catch errors early.

## Tasks

- [x] 1. Implement breadcrumb truncation logic
  - [x] 1.1 Add truncation function to BreadcrumbComponent
    - Create `truncateBreadcrumbs()` method that takes BreadcrumbItem array
    - Implement logic: if length < 4, return original; else return [first, ellipsis, ...lastTwo]
    - Add `truncationThreshold` @Input property with default value of 4
    - Create `displayItems` computed property that applies truncation
    - Update BreadcrumbItem interface to include optional `isEllipsis` boolean
    - _Requirements: 2.1, 2.2, 2.3, 5.4_
  
  - [x] 1.2 Write property test for truncation threshold
    - **Property 2: Truncation Threshold Enforcement**
    - **Validates: Requirements 2.1, 2.3**
    - Generate random breadcrumb arrays of lengths 0-20
    - Verify truncation applied only when length >= 4
    - Use fast-check with 100 iterations
    - Tag: `Feature: horizontal-breadcrumb-tabs-layout, Property 2`
  
  - [x] 1.3 Write property test for truncation pattern
    - **Property 3: Truncation Pattern Correctness**
    - **Validates: Requirements 2.2, 2.4**
    - Generate random breadcrumb arrays with length >= 4
    - Verify result has exactly 4 items: [first, ellipsis, secondToLast, last]
    - Verify ellipsis has isEllipsis: true and url: null
    - Tag: `Feature: horizontal-breadcrumb-tabs-layout, Property 3`
  
  - [x] 1.4 Write property test for truncation preservation
    - **Property 6: Truncation Preserves First and Last Items**
    - **Validates: Requirements 2.2**
    - Generate random breadcrumb arrays with length >= 4
    - Verify first and last items in result match original array
    - Tag: `Feature: horizontal-breadcrumb-tabs-layout, Property 6`
  
  - [x] 1.5 Write unit tests for breadcrumb truncation edge cases
    - Test with 0, 1, 2, 3 items (no truncation)
    - Test with exactly 4 items (boundary case)
    - Test with 5+ items (truncation applied)
    - Test with null/undefined input
    - _Requirements: 2.1, 2.2, 2.3_


- [x] 2. Update breadcrumb component template and styles
  - [x] 2.1 Modify breadcrumb template to handle ellipsis
    - Update template to use `displayItems` instead of `items`
    - Add conditional rendering for ellipsis items (non-clickable span)
    - Ensure separators render between all items including ellipsis
    - Add `[class.ellipsis]="item.isEllipsis"` for styling
    - _Requirements: 2.2, 2.4, 2.5_
  
  - [x] 2.2 Add breadcrumb CSS for responsive layout
    - Add `flex-shrink: 1` and `min-width: 0` to allow flexbox truncation
    - Style ellipsis with secondary text color and user-select: none
    - Ensure font-size matches tab navigation (1rem)
    - Maintain existing spacing and separator styles
    - _Requirements: 1.5, 2.5, 4.1_
  
  - [x] 2.3 Write property test for separator rendering
    - **Property 7: Separator Rendering Between Items**
    - **Validates: Requirements 2.5**
    - Generate random breadcrumb arrays (truncated and non-truncated)
    - Verify separator count equals item count - 1
    - Tag: `Feature: horizontal-breadcrumb-tabs-layout, Property 7`
  
  - [x] 2.4 Write unit tests for breadcrumb rendering
    - Test ellipsis renders as non-clickable span
    - Test separators appear between all items
    - Test CSS classes applied correctly
    - _Requirements: 2.4, 2.5_

- [x] 3. Checkpoint - Ensure breadcrumb tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [x] 4. Update tab navigation component styles
  - [x] 4.1 Add tab navigation CSS for responsive layout
    - Add `flex-shrink: 0` to prevent tabs from shrinking
    - Ensure font-size is 1rem to match breadcrumb
    - Maintain existing tab styling (colors, spacing, active states)
    - _Requirements: 1.5, 4.2_
  
  - [x] 4.2 Write unit tests for tab navigation styling
    - Test font-size matches breadcrumb
    - Test flex-shrink: 0 applied
    - Test existing styles preserved
    - _Requirements: 1.5, 4.2_

- [x] 5. Implement user page layout responsive flexbox
  - [x] 5.1 Create user-page-header container with flexbox
    - Wrap breadcrumb and tab navigation in `.user-page-header` div
    - Add CSS: `display: flex`, `flex-direction: column`, `gap: 1rem`
    - Add margin-bottom for spacing from content
    - _Requirements: 1.1, 3.1, 4.3_
  
  - [x] 5.2 Add desktop media query for horizontal layout
    - Add `@media (min-width: 1024px)` media query
    - Set `flex-direction: row` for horizontal layout
    - Set `justify-content: space-between` for left/right positioning
    - Set `align-items: center` for vertical centering
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.4_
  
  - [x] 5.3 Write property test for desktop layout
    - **Property 1: Desktop Viewport Triggers Horizontal Layout**
    - **Validates: Requirements 1.1**
    - Generate random viewport widths >= 1024px
    - Verify flex-direction: row applied
    - Tag: `Feature: horizontal-breadcrumb-tabs-layout, Property 1`
  
  - [x] 5.4 Write property test for mobile layout
    - **Property 4: Mobile Viewport Triggers Vertical Layout**
    - **Validates: Requirements 3.1**
    - Generate random viewport widths < 1024px
    - Verify flex-direction: column applied
    - Tag: `Feature: horizontal-breadcrumb-tabs-layout, Property 4`
  
  - [x] 5.5 Write property test for font size consistency
    - **Property 5: Font Size Consistency**
    - **Validates: Requirements 1.5, 4.5**
    - Generate random component configurations
    - Verify breadcrumb and tab font sizes match
    - Tag: `Feature: horizontal-breadcrumb-tabs-layout, Property 5`
  
  - [x] 5.6 Write unit tests for user page layout
    - Test desktop layout (>= 1024px): horizontal, space-between, center-aligned
    - Test mobile layout (< 1024px): vertical, breadcrumb above tabs, full width
    - Test vertical spacing maintained (margin-bottom)
    - Test breadcrumb positioned left, tabs positioned right on desktop
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 3.4, 4.3, 4.4_


- [x] 6. Verify backward compatibility and integration
  - [x] 6.1 Test API compatibility with existing pages
    - Verify all existing @Input properties still work on BreadcrumbComponent
    - Verify all existing @Input properties still work on TabNavigationComponent
    - Verify all existing @Output events still fire correctly
    - Test with existing page implementations (user profile, organization pages, etc.)
    - _Requirements: 5.1, 5.2, 5.3, 5.5_
  
  - [x] 6.2 Write unit tests for API compatibility
    - Test truncationThreshold @Input property (new)
    - Test existing breadcrumb @Input properties preserved
    - Test existing tab navigation @Input properties preserved
    - Test @Output events fire correctly
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 6.3 Write integration tests for user page layout
    - Test breadcrumb navigation links work correctly
    - Test tab clicks trigger correct navigation/events
    - Test layout works with various breadcrumb and tab configurations
    - _Requirements: 5.5_

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- fast-check library used for property-based testing in TypeScript
- All tests tagged with feature name and property number for traceability
