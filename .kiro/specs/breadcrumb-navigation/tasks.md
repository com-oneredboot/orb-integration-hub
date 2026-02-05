# Implementation Plan: Breadcrumb Navigation

## Overview

This plan implements a shared breadcrumb navigation component and integrates it into the customers area pages. The implementation follows Angular 19 standalone component patterns with BEM CSS naming.

## Tasks

- [x] 1. Create shared BreadcrumbComponent
  - [x] 1.1 Create component files in `apps/web/src/app/shared/components/breadcrumb/`
    - Create `breadcrumb.component.ts` with BreadcrumbItem interface and component
    - Create `breadcrumb.component.html` with nav, ol, and li structure
    - Create `breadcrumb.component.scss` with BEM styling
    - Create `index.ts` barrel export
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 6.1, 6.2, 6.3, 6.4_
  - [x] 1.2 Write unit tests for BreadcrumbComponent
    - Test renders correct number of items
    - Test last item is plain text
    - Test non-last items with routes are links
    - Test separator count equals items minus one
    - Test accessibility attributes
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 6.1, 6.3_
  - [x] 1.3 Write property test for breadcrumb rendering
    - **Property 1: Last item is never a link**
    - **Property 3: Separator count equals items minus one**
    - **Validates: Requirements 1.4, 1.5**

- [x] 2. Update shared components barrel export
  - Add breadcrumb export to `apps/web/src/app/shared/components/index.ts`
  - _Requirements: 1.1_

- [x] 3. Integrate breadcrumb into Organization Detail Page
  - [x] 3.1 Update organization-detail-page.component.ts
    - Import BreadcrumbComponent
    - Add breadcrumbItems computed property
    - _Requirements: 2.1_
  - [x] 3.2 Update organization-detail-page.component.html
    - Replace "Back to Organizations" link with app-breadcrumb
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 4. Integrate breadcrumb into Application Detail Page
  - [x] 4.1 Update application-detail-page.component.ts
    - Import BreadcrumbComponent
    - Add breadcrumbItems computed property with organization context
    - _Requirements: 4.1_
  - [x] 4.2 Update application-detail-page.component.html
    - Replace "Back to Applications" link with app-breadcrumb
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 5. Update Environment Detail Page breadcrumb
  - [x] 5.1 Update environment-detail-page.component.ts
    - Import BreadcrumbComponent
    - Update breadcrumbItems to include full hierarchy from Organizations
    - _Requirements: 5.1_
  - [x] 5.2 Update environment-detail-page.component.html
    - Replace existing partial breadcrumb with app-breadcrumb component
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 6. Checkpoint - Verify all breadcrumbs work correctly
  - Ensure all pages display correct breadcrumb hierarchy
  - Ensure navigation works for all clickable items
  - Ensure accessibility attributes are present

- [x] 7. Create placeholder spec for organization-centric navigation
  - Create `.kiro/specs/organization-centric-navigation/` directory
  - Create placeholder `requirements.md` with decision question: Should organizations be the required root for all customer navigation?
  - Note implications: Applications list would require org context, direct app links would redirect through org
  - _This is a future consideration, not blocking current breadcrumb work_

## Notes

- All tasks are required for comprehensive testing
- The BreadcrumbComponent is a simple presentational component with no store dependencies
- Each page is responsible for building its own breadcrumb items array
- The Applications List page breadcrumb (Requirement 3) is deferred as it requires organization context that may not always be available
- **Future consideration:** Task 7 creates a placeholder spec to decide if organizations should be the mandatory root for all navigation (would affect how applications are accessed)
