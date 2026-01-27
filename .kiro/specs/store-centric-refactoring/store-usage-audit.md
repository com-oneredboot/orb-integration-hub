# Store Usage Audit Report

**Last Updated:** January 27, 2026

## Executive Summary

| Component | Store Selectors | Store Dispatches | Direct Service Calls | Local State | Status | Priority |
|-----------|-----------------|------------------|---------------------|-------------|--------|----------|
| Auth Flow | 12 | 29 | 7 (auth-related) | Minimal | ✅ Good | - |
| Dashboard | 4 | 0 | 2 (utility) | None | ✅ Good | - |
| Profile | 2 | 5 | 6 (CRUD) | Yes | ⚠️ Hybrid | Medium |
| Organizations List | 5 | 8 | 1 (create draft) | Minimal | ✅ Good | - |
| Organization Detail Page | 10 | 4 | 0 | Minimal | ✅ **REFACTORED** | - |
| Organization Detail | 6 | 3 | 0 | None | ✅ Good | - |
| Applications List | 8 | 4 | 0 | Minimal | ✅ **REFACTORED** | - |
| Application Detail Page | 7 | 5 | 0 | Minimal | ✅ **REFACTORED** | - |
| Application Detail | 0 | 0 | 0 | None | ✅ Good | - |

---

## Refactoring Status

### ✅ Completed Refactoring (January 2026)

The following components have been refactored to follow the store-first architecture:

#### 1. Applications List Component ✅ REFACTORED

**File:** `apps/web/src/app/features/customers/applications/components/applications-list/applications-list.component.ts`

**Before:**
- 0 store dispatches
- 2 direct service calls
- All state managed locally

**After:**
| Metric | Count | Details |
|--------|-------|---------|
| Store Selectors | 8 | `selectApplicationRows`, `selectFilteredApplicationRows`, `selectIsLoading`, `selectIsCreatingNew`, `selectOrganizations`, `selectSearchTerm`, `selectOrganizationFilter`, `selectStatusFilter` |
| Store Dispatches | 4 | `loadApplications`, `setSearchTerm`, `setOrganizationFilter`, `setStatusFilter` |
| Direct Service Calls | 0 | None |
| Local State | Minimal | UI state only (form binding synced with store) |

---

#### 2. Application Detail Page Component ✅ REFACTORED

**File:** `apps/web/src/app/features/customers/applications/components/application-detail-page/application-detail-page.component.ts`

**Before:**
- 2 store selectors
- 1 store dispatch
- 7 direct service calls
- All CRUD bypassed store

**After:**
| Metric | Count | Details |
|--------|-------|---------|
| Store Selectors | 7 | `selectSelectedApplication`, `selectIsLoading`, `selectIsSaving`, `selectError`, `selectSaveError`, `selectOrganizations`, `selectDebugMode` |
| Store Dispatches | 5 | `loadApplication`, `createDraftApplication`, `updateApplication`, `deleteApplication`, `loadOrganizations` |
| Direct Service Calls | 0 | None |
| Local State | Minimal | Form data, validation (UI concerns only) |

---

#### 3. Organization Detail Page Component ✅ REFACTORED

**File:** `apps/web/src/app/features/customers/organizations/components/organization-detail-page/organization-detail-page.component.ts`

**Before:**
- 1 store selector
- 3 store dispatches
- 6 direct service calls
- All CRUD bypassed store

**After:**
| Metric | Count | Details |
|--------|-------|---------|
| Store Selectors | 10 | `selectSelectedOrganization`, `selectIsLoading`, `selectIsSaving`, `selectIsDeleting`, `selectError`, `selectSaveError`, `selectApplications`, `selectIsLoadingApplications`, `selectApplicationsError`, `selectDebugMode` |
| Store Dispatches | 4 | `loadOrganization`, `updateOrganization`, `deleteOrganization`, `loadApplications` |
| Direct Service Calls | 0 | None |
| Local State | Minimal | Form data, validation (UI concerns only) |

---

#### 4. Applications Effects ✅ COMPLETED

**File:** `apps/web/src/app/features/customers/applications/store/applications.effects.ts`

**Added Effects:**
| Effect | Description |
|--------|-------------|
| `loadApplications$` | Loads all applications for user across organizations |
| `loadApplication$` | Loads single application by ID for detail page |
| `createDraftApplication$` | Creates draft application (create-on-click pattern) |
| `updateApplication$` | Updates application |
| `deleteApplication$` | Deletes application |
| `refreshAfterSuccessfulOperation$` | Auto-refreshes after CRUD success |

**Unit Tests:** 17 tests passing in `applications.effects.spec.ts`

---

## Remaining Items

### ⚠️ Profile Component (Medium Priority - Optional)

**File:** `apps/web/src/app/features/user/components/profile/profile.component.ts`

**Current Status:**
| Metric | Count | Details |
|--------|-------|---------|
| Store Selectors | 2 | `selectCurrentUser`, `selectDebugMode` |
| Store Dispatches | 5 | `UserActions.updateProfileSuccess` after updates |
| Direct Service Calls | 6 | `userService.userUpdate()`, `userService.verifySMSCode()`, `userService.sendSMSVerificationCode()` |
| Local State | Yes | `isLoading`, `setupState`, `phoneVerificationState` |

**Issues:**
1. Directly calls `userService.userUpdate()` instead of dispatching action
2. Directly calls `userService.verifySMSCode()` instead of dispatching action
3. Directly calls `userService.sendSMSVerificationCode()` instead of dispatching action
4. Local `isLoading` state instead of store selector
5. Local `phoneVerificationState` instead of store state

**Mitigating Factors:**
- Does dispatch `updateProfileSuccess` after successful updates
- Single-user edit form (less critical than list pages)
- Profile setup flow has complex multi-step state

**Recommendation:** Optional refactoring. The profile component works correctly and the complexity of the multi-step flow may not justify full store migration.

---

## Effects Comparison (Updated)

| Feature | Effect | Organizations | Applications |
|---------|--------|---------------|--------------|
| Load List | `load*$` | ✅ Yes | ✅ **ADDED** |
| Load Single | `load*$` | ✅ Yes | ✅ **ADDED** |
| Create Draft | `createDraft*$` | ✅ Yes | ✅ Yes |
| Create | `create*$` | ✅ Yes | ✅ Yes |
| Update | `update*$` | ✅ Yes | ✅ Yes |
| Delete | `delete*$` | ✅ Yes | ✅ Yes |
| Refresh After Success | `refreshAfterSuccessfulOperation$` | ✅ Yes | ✅ Yes |

---

## Summary

### Completed ✅
- Applications List Component - Now uses store-first pattern
- Application Detail Page Component - Now uses store-first pattern
- Organization Detail Page Component - Now uses store-first pattern
- Applications Effects - All effects implemented and tested
- Steering File - Updated with store-first standards

### No Action Needed ✅
- Auth Flow Component
- Dashboard Component
- Organizations List Component
- Organization Detail Component (child)
- Application Detail Component (child)
- All presentational components

### Optional (Not Critical)
- Profile Component - Works correctly, complex multi-step flow

---

## Verification

All refactored components have been verified:
- ✅ Unit tests updated to use MockStore
- ✅ All tests passing
- ✅ Linting passes
- ✅ No direct service calls for CRUD operations
- ✅ All data flows through store selectors
- ✅ All mutations dispatch actions
