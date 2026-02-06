# Requirements: Wrapper Component Elimination

## Overview

Eliminate unnecessary wrapper components (OrganizationsComponent, ApplicationsComponent) and migrate all list and detail pages to use UserPageComponent directly. This resolves naming confusion where plural component names don't actually render the list, and eliminates code duplication.

## Problem Statement

The current architecture has unnecessary wrapper components that:
1. Create naming confusion (OrganizationsComponent doesn't render the list directly)
2. Duplicate layout responsibilities (wrappers have hero/breadcrumbs, children also have breadcrumbs/tabs)
3. Add unnecessary component layers
4. Don't align with the UserPageComponent pattern

## User Stories

### 1. As a developer, I want clear component naming
**Acceptance Criteria:**
- 1.1 Plural component names (OrganizationsListComponent) render the list page
- 1.2 Singular component names (OrganizationDetailPageComponent) render detail pages
- 1.3 No wrapper components between routes and page components
- 1.4 All page components use UserPageComponent for layout

### 2. As a developer, I want consistent page structure
**Acceptance Criteria:**
- 2.1 All list pages use UserPageComponent with hero, breadcrumbs, tabs, and content
- 2.2 All detail pages use UserPageComponent with hero, breadcrumbs, tabs, and content
- 2.3 No duplication of layout elements between parent and child components
- 2.4 Routes point directly to page components (no wrappers)

### 3. As a developer, I want maintainable code
**Acceptance Criteria:**
- 3.1 Each page component is self-contained with UserPageComponent
- 3.2 No orphaned wrapper components
- 3.3 Routes are simple and direct
- 3.4 All pages follow the same pattern

## Current vs Target Architecture

### Current (Problematic)

```
Route: /customers/organizations
  ↓
OrganizationsComponent (wrapper)
  ├── Hero
  ├── Breadcrumbs
  ├── Tabs
  └── OrganizationsListComponent (actual list)
      └── DataGrid

Route: /customers/applications
  ↓
ApplicationsComponent (wrapper)
  ├── Hero
  └── ApplicationsListComponent (actual list)
      ├── Breadcrumbs (duplication!)
      ├── Tabs (duplication!)
      └── DataGrid
```

### Target (Clean)

```
Route: /customers/organizations
  ↓
OrganizationsListComponent
  └── UserPageComponent
      ├── Hero
      ├── Breadcrumbs
      ├── Tabs
      └── Content (DataGrid)

Route: /customers/applications
  ↓
ApplicationsListComponent
  └── UserPageComponent
      ├── Hero
      ├── Breadcrumbs
      ├── Tabs
      └── Content (DataGrid)
```

## Components to Refactor

| Component | Current Status | Target Action |
|-----------|---------------|---------------|
| OrganizationsComponent | Wrapper with hero/breadcrumbs/tabs | DELETE |
| OrganizationsListComponent | Child component with DataGrid | MIGRATE to use UserPageComponent |
| ApplicationsComponent | Wrapper with hero | DELETE |
| ApplicationsListComponent | Child with breadcrumbs/tabs/DataGrid | MIGRATE to use UserPageComponent |
| ApplicationDetailPageComponent | Detail page with custom layout | MIGRATE to use UserPageComponent |
| EnvironmentDetailPageComponent | Detail page with custom layout | MIGRATE to use UserPageComponent |

## Success Criteria

### Functional Requirements
- All routes work correctly after refactoring
- All pages display hero, breadcrumbs, tabs, and content correctly
- No visual regressions
- All existing functionality preserved

### Technical Requirements
- OrganizationsComponent deleted
- ApplicationsComponent deleted
- All list components use UserPageComponent
- All detail components use UserPageComponent
- Routes point directly to page components
- No layout duplication
- All tests pass
- No linting errors

## Out of Scope

- Changing the UserPageComponent API
- Modifying routing structure (paths stay the same)
- Changing component selectors
- Refactoring store logic
- Changing business logic

## Dependencies

- UserPageComponent must be available and stable
- OrganizationDetailPageComponent serves as canonical reference (already migrated)

## Risks

- Breaking existing routes
- Visual regressions during migration
- Test failures due to component structure changes

## Mitigation

- Migrate one component at a time
- Test thoroughly after each migration
- Use OrganizationDetailPageComponent as reference
- Keep git history clean for easy rollback
