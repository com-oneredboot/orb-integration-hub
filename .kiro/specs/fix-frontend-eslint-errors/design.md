# Design Document

## Overview

This design document describes the approach for fixing 74 ESLint errors in the Angular frontend (`apps/web`). The errors are distributed across multiple files and fall into six distinct categories. Each category requires a specific fix pattern.

## Architecture

No architectural changes are required. This is a code quality cleanup task that modifies existing files to comply with ESLint rules.

## Components and Interfaces

### Affected Files by Error Category

#### Category 1: Unused Imports (`@typescript-eslint/no-unused-vars`)
Files with unused import statements that need removal:

| File | Unused Imports |
|------|----------------|
| `features/base_feature.component.ts` | `CognitoService`, `IAuth` |
| `features/customers/applications/components/applications-list/applications-list.component.ts` | `takeUntil` |
| `features/customers/organizations/components/organizations-list/organizations-list.component.ts` | `OrganizationUserRole` |
| `features/customers/organizations/store/organizations.reducer.ts` | `Organizations`, `OrganizationStatus` |
| `features/user/components/auth-flow/auth-flow.component.ts` | `UsersCreateInput` |
| `features/user/components/auth-flow/containers/auth-container.component.ts` | `takeUntil` |
| `features/user/components/profile/profile.component.ts` | `UsersResponse`, `UsersQueryByUserIdInput` |
| `features/user/components/profile/profile.component.spec.ts` | `ReactiveFormsModule`, `Store` |
| `features/user/services/auth-analytics.service.ts` | `debounceTime` |
| `features/user/services/auth-performance.service.ts` | `startWith` |
| `features/user/store/user.actions.ts` | `UsersQueryByEmailInput` |
| `features/user/store/user.effects.ts` | `UsersQueryByEmail`, `UsersResponse` |
| `features/user/store/user.reducer.ts` | `UserState` |
| `shared/components/auth/auth-button.component.ts` | `takeUntil` |
| `shared/components/ui/status-badge.component.ts` | `StatusDisplayOptions` |
| `shared/services/form-validation.service.ts` | `FormControl` |

#### Category 2: Unused Variables (`@typescript-eslint/no-unused-vars`)
Files with unused variable assignments:

| File | Unused Variables |
|------|------------------|
| `features/user/components/auth-flow/auth-flow.component.ts` | `testResult`, `currentUrl`, `currentStep$` |
| `features/user/components/dashboard/dashboard.component.spec.ts` | `mockStore`, `mockRouter` |
| `features/user/components/profile/profile.component.spec.ts` | `store`, `router`, `mockUpdateInput`, `mockResponse` |
| `features/user/store/user.effects.ts` | `email`, `mfaEnabled`, `mfaSetupComplete` |
| `features/user/store/user.reducer.ts` | `phoneVerificationNeeded` |

#### Category 3: Unused Function Parameters (`@typescript-eslint/no-unused-vars`)
Files with unused function parameters that need underscore prefix:

| File | Unused Parameters |
|------|-------------------|
| `core/services/error-handler.service.ts` | `error` (line 388) |
| `features/user/components/auth-flow/auth-flow.component.ts` | `event` (line 471) |
| `features/user/components/profile/profile.component.spec.ts` | `input` (line 86) |
| `features/user/store/user.effects.ts` | `error` (multiple), `action` (multiple), `backendError`, `user` |
| `features/user/store/user.reducer.ts` | `message` (line 92) |
| `shared/components/auth/auth-input-field.component.ts` | `value` (line 184) |
| `shared/services/status-display.service.ts` | `type` (lines 331, 339, 347) |

#### Category 4: Empty Lifecycle Methods (`@angular-eslint/no-empty-lifecycle-method`)
Files with empty Angular lifecycle methods:

| File | Empty Method |
|------|--------------|
| `features/customers/applications/applications.component.ts` | `ngOnInit` (line 46) |
| `features/customers/organizations/organizations.component.ts` | `ngOnInit` (line 44) |
| `features/user/components/auth-flow/containers/auth-container.component.ts` | `ngOnDestroy` (line 84) |
| `features/user/components/dashboard/dashboard.component.ts` | `ngOnInit` (line 57) |

#### Category 5: Negated Async Pipes (`@angular-eslint/template/no-negated-async`)
HTML templates with negated async pipe usage:

| File | Line |
|------|------|
| `features/customers/organizations/components/organization-detail/organization-detail.component.html` | 18 |
| `features/customers/organizations/components/organizations-list/organizations-list.component.html` | 155 |
| `features/user/components/auth-flow/components/password/password.component.html` | 16, 46 |
| `layouts/platform-layout/platform-layout.component.html` | 21 |
| `layouts/user-layout/user-layout.component.html` | 26 |

#### Category 6: Case Declarations (`no-case-declarations`)
Files with lexical declarations in case blocks:

| File | Lines |
|------|-------|
| `features/user/components/auth-flow/auth-flow.component.ts` | 833, 841 |
| `features/user/services/auth-performance.service.ts` | 74, 79 |

#### Category 7: Async Promise Executors (`no-async-promise-executor`)
Files with async functions as Promise executors:

| File | Lines |
|------|-------|
| `core/testing/security-test-utils.ts` | 174, 222, 260 |

## Data Models

No data model changes required.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

This task is a code cleanup effort verified by running ESLint. The correctness is verified by example tests (running the linter) rather than property-based tests.

### Verification Examples

**Example 1: Zero ESLint Errors**
Running `npm run lint` in `apps/web` SHALL produce zero errors in hand-written files.
**Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1**

**Example 2: Warnings Are Acceptable**
Running `npm run lint` MAY produce warnings (e.g., `@typescript-eslint/no-explicit-any`) without failing the build.
**Validates: Requirements 7.2**

## Error Handling

No error handling changes required. This is a code cleanup task.

## Testing Strategy

### Verification Approach

This task does not require property-based testing. Correctness is verified by:

1. **ESLint Execution**: Run `npm run lint` in `apps/web` directory
2. **Error Count Check**: Verify zero errors (warnings are acceptable)
3. **CI Pipeline**: Ensure the comprehensive-testing workflow passes

### Test Commands

```bash
# Run linting
cd apps/web && npm run lint

# Check error count (should be 0 for hand-written files, 2 for generated files until v0.13.6)
npm run lint 2>&1 | grep -c "error"
```

### Acceptance Test

The task is complete when:
1. `npm run lint` reports ≤2 errors (only the 2 in generated `AuthModel.ts`)
2. All 74 errors in hand-written files are resolved
3. No new errors are introduced
4. Existing functionality is preserved (no behavioral changes)

## Fix Patterns

### Pattern 1: Remove Unused Imports
```typescript
// Before
import { Component, OnInit } from '@angular/core';
import { UnusedService } from './unused.service';  // Remove this

// After
import { Component, OnInit } from '@angular/core';
```

### Pattern 2: Remove Unused Variables
```typescript
// Before
const unusedVar = someFunction();  // Remove if not needed

// After
someFunction();  // Keep only the side effect if needed
```

### Pattern 3: Prefix Unused Parameters
```typescript
// Before
catchError((error) => {  // error is unused

// After
catchError((_error) => {  // Prefixed with underscore
```

### Pattern 4: Add Comment to Empty Lifecycle Methods
```typescript
// Before
ngOnInit(): void {
}

// After
ngOnInit(): void {
  // Lifecycle hook required by interface - initialization handled in constructor
}
```

### Pattern 5: Fix Negated Async Pipes
```html
<!-- Before -->
*ngIf="!(loading$ | async)"

<!-- After -->
*ngIf="(loading$ | async) === false"
```

### Pattern 6: Wrap Case Declarations in Braces
```typescript
// Before
case 'value':
  const result = compute();
  break;

// After
case 'value': {
  const result = compute();
  break;
}
```

### Pattern 7: Refactor Async Promise Executors
```typescript
// Before
new Promise(async (resolve, reject) => {
  const result = await asyncOperation();
  resolve(result);
});

// After
async function wrapper() {
  const result = await asyncOperation();
  return result;
}
wrapper().then(resolve).catch(reject);
// Or simply use async/await directly without Promise constructor
```
