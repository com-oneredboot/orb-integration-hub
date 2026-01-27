# Tasks: Store-Centric Refactoring

## Phase 1: Applications Store Foundation

### Task 1.1: Add loadApplications$ Effect
- [x] Add `loadApplications$` effect to `apps/web/src/app/features/customers/applications/store/applications.effects.ts`
- [x] Follow pattern from `OrganizationsEffects.loadOrganizations$`
- [x] Listen for `loadApplications` and `refreshApplications` actions
- [x] Get current user from store with `withLatestFrom`
- [x] Call `applicationService.getUserApplications()` or equivalent
- [x] Dispatch `loadApplicationsSuccess` or `loadApplicationsFailure`

**Reference:** `apps/web/src/app/features/customers/organizations/store/organizations.effects.ts` lines 27-47

**Requirements:** 1.1, 1.2

### Task 1.2: Add loadApplication$ Effect (Single Resource)
- [x] Add `loadApplication$` effect for detail page use
- [x] Listen for `loadApplication` action with `applicationId` prop
- [x] Call `applicationService.getApplication(applicationId)`
- [x] Dispatch `loadApplicationSuccess` with single application
- [x] Update `selectedApplication` in reducer

**Requirements:** 3.1

### Task 1.3: Add Missing Actions
- [x] Add `loadApplications` action (if not exists)
- [x] Add `refreshApplications` action (if not exists)
- [x] Add `loadApplication` action with `applicationId` prop
- [x] Add `loadApplicationSuccess` action with single application
- [x] Add `loadApplicationFailure` action
- [x] Add `setSearchTerm` action
- [x] Add `setOrganizationFilter` action
- [x] Add `setStatusFilter` action

**File:** `apps/web/src/app/features/customers/applications/store/applications.actions.ts`

**Requirements:** 2.2, 3.2

### Task 1.4: Add Missing Selectors
- [x] Add `selectApplicationRows` selector (transform to table rows)
- [x] Add `selectFilteredApplicationRows` selector (apply filters)
- [x] Add `selectSelectedApplication` selector
- [x] Add `selectIsSaving` selector
- [x] Add `selectSaveError` selector
- [x] Add `selectSearchTerm` selector
- [x] Add `selectOrganizationFilter` selector
- [x] Add `selectStatusFilter` selector

**File:** `apps/web/src/app/features/customers/applications/store/applications.selectors.ts`

**Requirements:** 2.1, 3.1

### Task 1.5: Update Applications Reducer
- [x] Add `searchTerm`, `organizationFilter`, `statusFilter` to state
- [x] Add `selectedApplication` to state
- [x] Add `isSaving`, `saveError` to state
- [x] Handle `loadApplicationsSuccess` - set applications array
- [x] Handle `loadApplicationSuccess` - set selectedApplication
- [x] Handle filter actions - update filter state
- [x] Handle save actions - update isSaving/saveError

**File:** `apps/web/src/app/features/customers/applications/store/applications.reducer.ts`

**Requirements:** 2.1, 3.1

### Task 1.6: Unit Tests for Applications Effects
- [x] Add test for `loadApplications$` effect
- [x] Add test for `loadApplication$` effect
- [x] Verify service is called with correct parameters
- [x] Verify success/failure actions are dispatched

**File:** `apps/web/src/app/features/customers/applications/store/applications.effects.spec.ts`

**Requirements:** 7.2

---

## Phase 2: Applications List Component Refactor

### Task 2.1: Replace Local State with Store Selectors
- [x] Remove local `applicationRows` and `filteredApplicationRows`
- [x] Remove local `isLoading`
- [x] Remove local `organizations`
- [x] Remove local `searchTerm`, `organizationFilter`, `statusFilter`
- [x] Add store selector observables:
  - `applicationRows$: Observable<ApplicationTableRow[]>`
  - `filteredApplicationRows$: Observable<ApplicationTableRow[]>`
  - `isLoading$: Observable<boolean>`
  - `isCreatingNew$: Observable<boolean>`

**File:** `apps/web/src/app/features/customers/applications/components/applications-list/applications-list.component.ts`

**Requirements:** 2.1, 2.4

### Task 2.2: Replace Service Calls with Action Dispatches
- [x] Replace `organizationService.getUserOrganizations()` call with store selector
- [x] Replace `applicationService.getApplicationsByOrganization()` call with `loadApplications` dispatch
- [x] Remove `loadApplications()` method that calls service directly
- [x] Add `ngOnInit` dispatch: `this.store.dispatch(ApplicationsActions.loadApplications())`

**Requirements:** 2.2, 2.3

### Task 2.3: Update Filter Handling
- [x] Replace local `applyFilters()` method with store dispatches
- [x] Dispatch `setSearchTerm` on search input change
- [x] Dispatch `setOrganizationFilter` on organization dropdown change
- [x] Dispatch `setStatusFilter` on status dropdown change
- [x] Use `selectFilteredApplicationRows` selector for filtered data

**Requirements:** 2.2

### Task 2.4: Update Template
- [x] Use async pipe with store observables
- [x] Replace `applicationRows` with `applicationRows$ | async`
- [x] Replace `isLoading` with `isLoading$ | async`
- [x] Ensure template handles null/undefined from async pipe

**File:** `apps/web/src/app/features/customers/applications/components/applications-list/applications-list.component.html`

**Requirements:** 2.1

### Task 2.5: Unit Tests for Applications List
- [x] Update tests to use MockStore
- [x] Verify `loadApplications` dispatched on init
- [x] Verify filter actions dispatched on filter changes
- [x] Verify NO direct service calls
- [x] Test selector subscriptions

**File:** `apps/web/src/app/features/customers/applications/components/applications-list/applications-list.component.spec.ts`

**Requirements:** 7.1

---

## Phase 3: Application Detail Page Refactor

### Task 3.1: Replace Local State with Store Selectors
- [x] Remove local `application`
- [x] Remove local `isLoading`, `loadError`
- [x] Remove local `isSaving`, `saveError`
- [x] Remove local `organizations`
- [x] Add store selector observables:
  - `application$: Observable<Applications | null>`
  - `isLoading$: Observable<boolean>`
  - `isSaving$: Observable<boolean>`
  - `error$: Observable<string | null>`

**File:** `apps/web/src/app/features/customers/applications/components/application-detail-page/application-detail-page.component.ts`

**Requirements:** 3.1, 3.4

### Task 3.2: Replace Service Calls with Action Dispatches
- [x] Replace `applicationService.getApplication()` with `loadApplication` dispatch
- [x] Replace `applicationService.updateApplication()` with `updateApplication` dispatch
- [x] Replace `applicationService.deleteApplication()` with `deleteApplication` dispatch
- [x] Replace `applicationService.createDraft()` with `createDraftApplication` dispatch
- [x] Replace `organizationService.getUserOrganizations()` with organizations store selector

**Requirements:** 3.2, 3.3

### Task 3.3: Update Save/Delete Handlers
- [x] Update `onSave()` to dispatch `updateApplication` action
- [x] Update `onDelete()` to dispatch `deleteApplication` action
- [x] Subscribe to success actions for navigation (or use effects)
- [x] Handle errors via store selectors

**Requirements:** 3.2

### Task 3.4: Update Template
- [x] Use async pipe with store observables
- [x] Replace `application` with `application$ | async`
- [x] Replace `isLoading` with `isLoading$ | async`
- [x] Replace `isSaving` with `isSaving$ | async`
- [x] Handle loading/error states from store

**File:** `apps/web/src/app/features/customers/applications/components/application-detail-page/application-detail-page.component.html`

**Requirements:** 3.1

### Task 3.5: Unit Tests for Application Detail Page
- [x] Update tests to use MockStore
- [x] Verify `loadApplication` dispatched on init with correct ID
- [x] Verify `updateApplication` dispatched on save
- [x] Verify `deleteApplication` dispatched on delete
- [x] Verify NO direct service calls

**File:** `apps/web/src/app/features/customers/applications/components/application-detail-page/application-detail-page.component.spec.ts`

**Requirements:** 7.1

---

## Phase 4: Organization Detail Page Refactor

### Task 4.1: Add loadOrganization$ Effect (if needed)
- [x] Check if single-resource load effect exists
- [x] If not, add `loadOrganization$` effect similar to applications
- [x] Add corresponding actions and reducer handling

**File:** `apps/web/src/app/features/customers/organizations/store/organizations.effects.ts`

**Requirements:** 4.1

### Task 4.2: Replace Local State with Store Selectors
- [x] Remove local `organization`
- [x] Remove local `isLoading`, `loadError`
- [x] Remove local `isSaving`, `saveError`
- [x] Remove local `applications`
- [x] Add store selector observables

**File:** `apps/web/src/app/features/customers/organizations/components/organization-detail-page/organization-detail-page.component.ts`

**Requirements:** 4.1, 4.4

### Task 4.3: Replace Service Calls with Action Dispatches
- [x] Replace `organizationService.getOrganization()` with store dispatch/selector
- [x] Replace `organizationService.updateOrganization()` with `updateOrganization` dispatch
- [x] Replace `organizationService.deleteOrganization()` with `deleteOrganization` dispatch
- [x] Replace `applicationService.getApplicationsByOrganization()` with applications store

**Requirements:** 4.2, 4.3

### Task 4.4: Update Template
- [x] Use async pipe with store observables
- [x] Handle loading/error states from store

**File:** `apps/web/src/app/features/customers/organizations/components/organization-detail-page/organization-detail-page.component.html`

**Requirements:** 4.1

### Task 4.5: Unit Tests for Organization Detail Page
- [x] Update tests to use MockStore
- [x] Verify correct actions dispatched
- [x] Verify NO direct service calls

**File:** `apps/web/src/app/features/customers/organizations/components/organization-detail-page/organization-detail-page.component.spec.ts`

**Requirements:** 7.1

---

## Phase 5: Profile Component Refactor (Optional)

### Task 5.1: Add User Update Effects
- [ ] Add `updateProfile$` effect to user effects
- [ ] Add `sendPhoneVerification$` effect
- [ ] Add `verifyPhone$` effect
- [ ] Add corresponding actions

**File:** `apps/web/src/app/features/user/store/user.effects.ts`

**Requirements:** 5.1

### Task 5.2: Replace Service Calls with Action Dispatches
- [ ] Replace `userService.userUpdate()` with `updateProfile` dispatch
- [ ] Replace `userService.sendSMSVerificationCode()` with dispatch
- [ ] Replace `userService.verifySMSCode()` with dispatch
- [ ] Remove local loading states

**File:** `apps/web/src/app/features/user/components/profile/profile.component.ts`

**Requirements:** 5.1, 5.2

### Task 5.3: Unit Tests for Profile Component
- [ ] Update tests to use MockStore
- [ ] Verify correct actions dispatched

**File:** `apps/web/src/app/features/user/components/profile/profile.component.spec.ts`

**Requirements:** 7.1

---

## Phase 6: Steering File Updates

### Task 6.1: Add Store-First Standards to Steering File
- [x] Add "NgRx Store-First Architecture" section
- [x] Document required store selectors for list pages
- [x] Document required store selectors for detail pages
- [x] Document required action dispatches for CRUD
- [x] Document prohibited patterns (direct service calls)
- [x] Add reference implementations

**File:** `.kiro/steering/frontend-components.md`

**Requirements:** 6.1, 6.2

### Task 6.2: Add Store Pattern Checklist
- [x] Add checklist for new list components
- [x] Add checklist for new detail page components
- [x] Add anti-pattern examples with explanations

**Requirements:** 6.2

---

## Phase 7: Final Verification

### Task 7.1: Run All Tests
- [x] Run `npm test` in apps/web
- [x] Verify all tests pass
- [x] Fix any failing tests

### Task 7.2: Run Linting
- [x] Run `npm run lint` in apps/web
- [x] Fix any linting errors

### Task 7.3: Manual Testing
- [x] Test Applications List page loads correctly
- [x] Test Application Detail page loads and saves correctly
- [x] Test Organization Detail page loads and saves correctly
- [x] Test filtering works on list pages
- [x] Test create/update/delete flows

### Task 7.4: Update Audit Report
- [x] Re-run store usage audit
- [x] Update `store-usage-audit.md` with new status
- [x] Verify all critical/high items resolved

### Task 7.5: Git Commit
- [ ] Commit with conventional commit format
- [ ] Reference any related issues
- [ ] Push changes

---

## Summary

| Phase | Components | Priority | Status |
|-------|------------|----------|--------|
| 1 | Applications Store Foundation | Critical | ✅ Complete |
| 2 | Applications List Component | Critical | ✅ Complete |
| 3 | Application Detail Page | Critical | ✅ Complete |
| 4 | Organization Detail Page | High | ✅ Complete |
| 5 | Profile Component | Medium (Optional) | Not Started (Optional) |
| 6 | Steering File Updates | Required | ✅ Complete |
| 7 | Final Verification | Required | ✅ Complete (except git commit) |

**Remaining Tasks:**
- Task 7.5: Git commit (user action required)
- Phase 5 (Optional): Profile component refactor

**All critical and high priority tasks are complete.**
