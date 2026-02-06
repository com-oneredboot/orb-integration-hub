# Requirements Document: User Layout Page Standardization

## Introduction

This specification addresses visual inconsistencies across pages within the user-layout component. Users experience layout shifts when navigating between pages (e.g., breadcrumbs and tables moving, different padding/spacing), indicating non-uniform page structure and styling patterns. The goal is to audit ALL user-layout pages, identify structural differences, and establish a single standard pattern that eliminates visual shifting and makes creating new pages straightforward.

## Glossary

- **User_Layout**: The main authenticated user layout component wrapping dashboard, profile, and customer feature pages
- **Page_Container**: The outermost div for a page (e.g., `dashboard-container`, `org-detail-page`, `app-detail-container`)
- **Hero_Split**: Shared component displaying logo and content side-by-side at page top
- **Content_Section**: A div containing breadcrumbs and main content with max-width and padding (e.g., `org-detail-page__content`, `app-detail-content`)
- **Breadcrumb_Container**: A div with class `orb-breadcrumb-container` wrapping breadcrumb navigation
- **Global_CSS**: Predefined `orb-*` classes in `components.scss` for consistent styling
- **Page_Wrapper**: The standard structure pattern all pages must follow
- **Layout_Shift**: Visual movement of elements when navigating between pages due to inconsistent positioning

## Requirements

### Requirement 1: Audit All User-Layout Pages

**User Story:** As a developer, I want a complete inventory of all user-layout pages and their current structure, so that I can identify inconsistencies.

#### Acceptance Criteria

1. THE System SHALL document the structure of ALL pages under user-layout
2. THE System SHALL identify pages with Page_Container, Hero_Split, Content_Section, and breadcrumbs
3. THE System SHALL identify pages missing standard structural elements
4. THE System SHALL document current max-width, padding, and margin values for each page
5. THE System SHALL identify pages using custom wrappers (e.g., `page-content` in applications-list)
6. THE System SHALL document which pages use global CSS classes vs component-specific styles
7. THE System SHALL create a comparison matrix showing structural differences

### Requirement 2: Identify Layout Shift Root Causes

**User Story:** As a developer, I want to understand why breadcrumbs and tables shift position, so that I can fix the root cause.

#### Acceptance Criteria

1. WHEN comparing organization-detail-page and applications-list, THE System SHALL identify structural differences causing shifts
2. THE System SHALL document differences in container nesting (e.g., extra `page-content` wrapper)
3. THE System SHALL document differences in padding application (Hero_Split vs Content_Section)
4. THE System SHALL document differences in breadcrumb placement (inside vs outside Content_Section)
5. THE System SHALL document differences in max-width application points
6. THE System SHALL measure actual pixel differences in element positioning between pages

### Requirement 3: Establish Standard Page Structure

**User Story:** As a developer, I want a single standard page structure, so that all pages look consistent.

#### Acceptance Criteria

1. THE System SHALL define a standard Page_Wrapper structure with exact HTML hierarchy
2. THE Page_Wrapper SHALL specify: Page_Container → Hero_Split → Content_Section → Breadcrumbs → Main Content
3. THE System SHALL define exact max-width value for Content_Section (currently 1400px)
4. THE System SHALL define exact padding for Content_Section (currently `0 spacing-lg spacing-lg`)
5. THE System SHALL specify that Hero_Split handles its own spacing and sits outside Content_Section
6. THE System SHALL specify that breadcrumbs sit inside Content_Section with `orb-breadcrumb-container` class
7. THE System SHALL prohibit extra wrapper divs between Content_Section and main content

### Requirement 4: Standardize Hero Split Usage

**User Story:** As a user, I want page headers to appear identical across all pages, so that navigation feels seamless.

#### Acceptance Criteria

1. THE System SHALL use Hero_Split component on ALL user-layout pages
2. THE Hero_Split SHALL sit outside Content_Section (no padding from Content_Section)
3. THE Hero_Split SHALL use consistent logo, title, and subtitle patterns
4. THE Hero_Split SHALL handle its own responsive behavior (side-by-side > 1024px, stacked ≤ 1024px)
5. THE System SHALL document the standard Hero_Split configuration for each page type
6. WHEN a page needs custom header content, THE System SHALL use Hero_Split's content projection slot

### Requirement 5: Standardize Breadcrumb Placement

**User Story:** As a user, I want breadcrumbs to appear in the same location on every page, so that I don't lose my place.

#### Acceptance Criteria

1. THE System SHALL place breadcrumbs inside Content_Section on ALL pages
2. THE breadcrumbs SHALL use `orb-breadcrumb-container` class with `margin-bottom: spacing-lg`
3. THE breadcrumbs SHALL appear immediately after Hero_Split (first element in Content_Section)
4. THE breadcrumbs SHALL appear before any tab navigation or main content
5. WHEN a page has no breadcrumbs, THE System SHALL not render an empty container

### Requirement 6: Eliminate Custom Page Wrappers

**User Story:** As a developer, I want to remove unnecessary wrapper divs, so that pages have consistent structure.

#### Acceptance Criteria

1. THE System SHALL identify all pages using custom wrappers (e.g., `page-content` in applications-list)
2. THE System SHALL remove custom wrappers that duplicate Content_Section functionality
3. THE System SHALL migrate content from custom wrappers directly into Content_Section
4. WHEN a custom wrapper provides unique functionality, THE System SHALL document why it's needed
5. THE applications-list page SHALL be migrated to remove `page-content` wrapper

### Requirement 7: Standardize Content Section Dimensions

**User Story:** As a user, I want consistent spacing and width across all pages, so that content doesn't jump around.

#### Acceptance Criteria

1. THE Content_Section SHALL have `max-width: 1400px` on ALL pages
2. THE Content_Section SHALL have `margin: 0 auto` for centering on ALL pages
3. THE Content_Section SHALL have `padding: 0 spacing-lg spacing-lg` on ALL pages
4. THE Content_Section SHALL NOT have top padding (Hero_Split handles its own spacing)
5. THE System SHALL use CSS variables for spacing values (not hardcoded pixels)
6. WHEN viewport width is ≤ 768px, THE Content_Section SHALL adjust padding to `spacing-md`

### Requirement 8: Standardize Card and Table Layout

**User Story:** As a developer, I want cards and tables to use global CSS classes, so that styling is consistent.

#### Acceptance Criteria

1. THE System SHALL use global `orb-card` classes for ALL card components
2. THE System SHALL use `orb-card__header` for card headers with black background
3. THE System SHALL use `orb-card__content` for card body content
4. THE System SHALL use `orb-card__content--padded` for content with padding
5. THE System SHALL use `orb-card__content--table` for content without padding (tables)
6. THE System SHALL NOT duplicate `orb-card` styles in component SCSS files
7. THE System SHALL document which pages currently duplicate global styles

### Requirement 9: Create Canonical Reference Implementation

**User Story:** As a developer, I want a reference implementation to copy, so that I can quickly create compliant pages.

#### Acceptance Criteria

1. THE System SHALL designate organization-detail-page as the canonical reference for detail pages
2. THE System SHALL designate organizations-list as the canonical reference for list pages
3. THE canonical references SHALL demonstrate proper Page_Wrapper structure
4. THE canonical references SHALL demonstrate proper Hero_Split usage
5. THE canonical references SHALL demonstrate proper Content_Section dimensions
6. THE canonical references SHALL demonstrate proper breadcrumb placement
7. THE System SHALL document both canonical references with annotated code examples

### Requirement 10: Document Standard in Frontend Components Guide

**User Story:** As a developer, I want clear documentation, so that I know how to create compliant pages.

#### Acceptance Criteria

1. THE System SHALL document the standard Page_Wrapper structure in frontend-components.md
2. THE System SHALL provide annotated HTML examples showing correct structure
3. THE System SHALL provide a checklist for creating new pages
4. THE System SHALL document common mistakes and how to avoid them
5. THE System SHALL document when to use Hero_Split vs custom headers
6. THE System SHALL document when to use Content_Section vs custom containers
7. THE System SHALL include before/after examples of migrated pages

### Requirement 11: Migrate Non-Compliant Pages

**User Story:** As a developer, I want to fix all non-compliant pages, so that the entire app is consistent.

#### Acceptance Criteria

1. THE System SHALL create a migration checklist for each non-compliant page
2. WHEN a page lacks Hero_Split, THE System SHALL add it
3. WHEN a page lacks Content_Section, THE System SHALL add it with standard dimensions
4. WHEN a page uses custom wrappers, THE System SHALL remove them
5. WHEN a page has inconsistent breadcrumb placement, THE System SHALL fix it
6. WHEN a page duplicates global CSS, THE System SHALL remove duplicates
7. THE System SHALL verify each migrated page eliminates layout shifts

### Requirement 12: Verify Layout Shift Elimination

**User Story:** As a user, I want to navigate between pages without visual shifting, so that the experience feels polished.

#### Acceptance Criteria

1. WHEN navigating from organizations-list to organization-detail-page, THE breadcrumbs SHALL NOT shift position
2. WHEN navigating from applications-list to application-detail-page, THE breadcrumbs SHALL NOT shift position
3. WHEN navigating between any two user-layout pages, THE content width SHALL remain constant
4. WHEN navigating between any two user-layout pages, THE horizontal padding SHALL remain constant
5. THE System SHALL measure breadcrumb position on ALL pages and verify consistency
6. THE System SHALL measure content width on ALL pages and verify consistency
