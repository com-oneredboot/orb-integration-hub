# Implementation Plan: Wrapper Component Elimination

## Overview

This plan eliminates unnecessary wrapper components and migrates all pages to use UserPageComponent directly. Each task is focused, testable, and builds on previous work.

## Tasks

### Phase 1: Organizations List Migration

- [x] 1. Migrate OrganizationsListComponent to use UserPageComponent
  - Open `apps/web/src/app/features/customers/organizations/components/organizations-list/organizations-list.component.ts`
  - Import UserPageComponent from `layouts/pages/user-page/`
  - Add component properties: `breadcrumbItems`, `tabs`, `activeTab`
  - Add `onTabChange(tabId: string)` method
  - Update template to wrap content in `<app-user-page>`
  - Move hero configuration from OrganizationsComponent (title, subtitle)
  - Move breadcrumbs from OrganizationsComponent
  - Move tabs from OrganizationsComponent
  - Keep DataGrid and card structure as content projection
  - Remove any custom layout CSS (max-width, padding, etc.)
  - _Requirements: 1.1, 1.4, 2.1_

- [x] 1.1 Update organizations routes to point directly to list component
  - Open `apps/web/src/app/features/customers/organizations/organizations.routes.ts`
  - Change root path component from `OrganizationsComponent` to `OrganizationsListComponent`
  - Verify route data (title, description) is correct
  - _Requirements: 1.3, 2.4_

- [x] 1.2 Delete OrganizationsComponent wrapper
  - Delete `apps/web/src/app/features/customers/organizations/organizations.component.ts`
  - Delete `apps/web/src/app/features/customers/organizations/organizations.component.html`
  - Delete `apps/web/src/app/features/customers/organizations/organizations.component.scss`
  - Delete `apps/web/src/app/features/customers/organizations/organizations.component.spec.ts` (if exists)
  - _Requirements: 1.3, 3.2_

- [x] 1.3 Test organizations list page
  - Run `npm run lint` to check for errors
  - Navigate to `/customers/organizations` in browser
  - Verify hero section displays correctly
  - Verify breadcrumbs display correctly
  - Verify tabs display correctly
  - Verify DataGrid displays correctly
  - Test create organization flow
  - Test navigation to detail page
  - _Requirements: 2.1, 3.1_

### Phase 2: Applications List Migration

- [x] 2. Migrate ApplicationsListComponent to use UserPageComponent
  - Open `apps/web/src/app/features/customers/applications/components/applications-list/applications-list.component.ts`
  - Import UserPageComponent from `layouts/pages/user-page/`
  - Add hero configuration properties (title, subtitle)
  - Verify breadcrumbItems and tabs are already defined
  - Update template to wrap content in `<app-user-page>`
  - Move hero configuration from ApplicationsComponent
  - Remove duplicate breadcrumbs/tabs (already in component)
  - Keep DataGrid and card structure as content projection
  - Remove any custom layout CSS
  - _Requirements: 1.1, 1.4, 2.1, 2.3_

- [x] 2.1 Update applications routes to point directly to list component
  - Open `apps/web/src/app/features/customers/applications/applications.routes.ts`
  - Change root path component from `ApplicationsComponent` to `ApplicationsListComponent`
  - Verify route data (title, description) is correct
  - _Requirements: 1.3, 2.4_

- [x] 2.2 Delete ApplicationsComponent wrapper
  - Delete `apps/web/src/app/features/customers/applications/applications.component.ts`
  - Delete `apps/web/src/app/features/customers/applications/applications.component.html`
  - Delete `apps/web/src/app/features/customers/applications/applications.component.scss`
  - Delete `apps/web/src/app/features/customers/applications/applications.component.spec.ts` (if exists)
  - _Requirements: 1.3, 3.2_

- [x] 2.3 Test applications list page
  - Run `npm run lint` to check for errors
  - Navigate to `/customers/applications` in browser
  - Verify hero section displays correctly
  - Verify breadcrumbs display correctly
  - Verify tabs display correctly
  - Verify DataGrid displays correctly
  - Test create application flow
  - Test navigation to detail page
  - Test organization filter from query params
  - _Requirements: 2.1, 3.1_

### Phase 3: Application Detail Page Migration

- [x] 3. Migrate ApplicationDetailPageComponent to use UserPageComponent
  - Open `apps/web/src/app/features/customers/applications/components/application-detail-page/application-detail-page.component.ts`
  - Import UserPageComponent from `layouts/pages/user-page/`
  - Add hero configuration: `[heroTitle]="application?.name || 'Loading...'"`, `[heroSubtitle]="'Application configuration and management'"`
  - Verify breadcrumbItems and tabs are already defined
  - Update template to wrap all content in `<app-user-page>`
  - Remove `<app-hero-split>` component
  - Remove `<app-breadcrumb>` component (handled by UserPageComponent)
  - Remove `<app-tab-navigation>` component (handled by UserPageComponent)
  - Keep tab content with @switch block as content projection
  - Remove custom layout divs and CSS classes
  - Remove component-specific layout CSS (max-width, padding, etc.)
  - _Requirements: 1.4, 2.2, 2.3_

- [x] 3.1 Test application detail page
  - Run `npm run lint` to check for errors
  - Navigate to `/customers/applications/:id` in browser
  - Verify hero section displays application name
  - Verify breadcrumbs show full path
  - Verify tabs display with correct badges
  - Verify Overview tab content displays correctly
  - Verify Environments tab content displays correctly
  - Verify Groups tab content displays correctly
  - Verify Danger Zone tab content displays correctly
  - Test tab switching
  - Test save/cancel functionality
  - _Requirements: 2.2, 3.1_

### Phase 4: Environment Detail Page Migration

- [x] 4. Migrate EnvironmentDetailPageComponent to use UserPageComponent
  - Open `apps/web/src/app/features/customers/applications/components/environment-detail-page/environment-detail-page.component.ts`
  - Import UserPageComponent from `layouts/pages/user-page/`
  - Add hero configuration: `[heroTitle]="getEnvironmentLabel(environment) + ' Environment'"`, `[heroSubtitle]="'Configure environment-specific settings'"`
  - Verify breadcrumbItems is already defined
  - Update tabs configuration to use single Overview tab (or keep legacy tabs if needed)
  - Update template to wrap all content in `<app-user-page>`
  - Remove `<app-hero-split>` component
  - Remove `<app-breadcrumb>` component (handled by UserPageComponent)
  - Remove `<app-tab-navigation>` component if using UserPageComponent tabs
  - Keep legacy tab implementation or migrate to UserPageComponent tabs
  - Remove custom layout divs and CSS classes
  - Remove component-specific layout CSS
  - _Requirements: 1.4, 2.2, 2.3_

- [x] 4.1 Test environment detail page
  - Run `npm run lint` to check for errors
  - Navigate to `/customers/applications/:id/environments/:env` in browser
  - Verify hero section displays environment name
  - Verify breadcrumbs show full path (Organizations > Org > Applications > App > Environments > Env)
  - Verify tabs display correctly
  - Verify API Keys section displays correctly
  - Verify Origins section displays correctly
  - Verify Rate Limits section displays correctly
  - Verify Webhooks section displays correctly
  - Verify Feature Flags section displays correctly
  - Test tab switching
  - Test all CRUD operations
  - _Requirements: 2.2, 3.1_

### Phase 5: Final Verification

- [x] 5. Run comprehensive tests
  - Run `npm run lint` to ensure no linting errors
  - Run `npm test` to verify all unit tests pass
  - Run `npm run build` to ensure production build succeeds
  - _Requirements: 3.4_

- [x] 5.1 Manual testing checklist
  - Test all routes work correctly
  - Test navigation between list and detail pages
  - Test breadcrumb navigation
  - Test tab navigation on all pages
  - Test create flows (organizations, applications)
  - Test edit flows (all detail pages)
  - Test delete flows
  - Verify no visual regressions
  - Test responsive behavior on mobile/tablet
  - _Requirements: 2.1, 2.2, 3.1_

- [x] 5.2 Create final status table
  - Document all migrated components
  - Verify all wrapper components deleted
  - Verify all pages use UserPageComponent
  - Create summary table showing component status
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

### Phase 6: Documentation

- [ ] 6. Update documentation
  - Update `apps/web/src/app/layouts/pages/README.md` with migration examples
  - Update `.kiro/steering/frontend-components.md` to reflect new patterns
  - Add canonical reference links to migrated components
  - Document any lessons learned
  - _Requirements: 3.4_

## Final Status Table Template

After completing all tasks, create this table in the spec:

| Route Path | Component | Uses UserPageComponent | Wrapper Deleted | Status |
|------------|-----------|----------------------|-----------------|--------|
| `/customers/organizations` | OrganizationsListComponent | ✅ Yes | ✅ OrganizationsComponent | ✅ Complete |
| `/customers/organizations/:id` | OrganizationDetailPageComponent | ✅ Yes | N/A (already done) | ✅ Complete |
| `/customers/applications` | ApplicationsListComponent | ✅ Yes | ✅ ApplicationsComponent | ✅ Complete |
| `/customers/applications/:id` | ApplicationDetailPageComponent | ✅ Yes | N/A | ✅ Complete |
| `/customers/applications/:id/environments/:env` | EnvironmentDetailPageComponent | ✅ Yes | N/A | ✅ Complete |

## Notes

- Each phase is independent and can be tested before moving to the next
- OrganizationDetailPageComponent serves as the canonical reference (already migrated)
- All pages should follow the same UserPageComponent pattern
- Remove all custom layout CSS - use global orb-* classes
- Test thoroughly after each migration to catch issues early


---

## Final Status Table

| Route Path | Component | Uses UserPageComponent | Wrapper Deleted | Status |
|------------|-----------|----------------------|-----------------|--------|
| `/customers/organizations` | OrganizationsListComponent | ✅ Yes | ✅ OrganizationsComponent | ✅ Complete |
| `/customers/organizations/:id` | OrganizationDetailPageComponent | ✅ Yes | N/A (already done) | ✅ Complete |
| `/customers/applications` | ApplicationsListComponent | ✅ Yes | ✅ ApplicationsComponent | ✅ Complete |
| `/customers/applications/:id` | ApplicationDetailPageComponent | ✅ Yes | N/A | ✅ Complete |
| `/customers/applications/:id/environments/:env` | EnvironmentDetailPageComponent | ✅ Yes | N/A | ✅ Complete |

## Summary

All wrapper components have been successfully eliminated:
- **2 wrapper components deleted**: OrganizationsComponent, ApplicationsComponent
- **4 page components migrated** to use UserPageComponent: OrganizationsListComponent, ApplicationsListComponent, ApplicationDetailPageComponent, EnvironmentDetailPageComponent
- **All routes updated** to point directly to list/detail components
- **All linting passes** with zero errors
- **Consistent architecture** across all customer-facing pages

The migration is complete and all pages now follow the standardized UserPageComponent pattern with Hero → Breadcrumbs → Tabs → Content structure.
