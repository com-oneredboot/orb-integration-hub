# Implementation Tasks

## Standard Requirements

This spec follows the [orb-templates Spec Standards](../../../repositories/orb-templates/docs/kiro-steering/templates/spec-standards.md).

## Task Overview

| Task | Component | Effort | Dependencies |
|------|-----------|--------|--------------|
| 1 | Backend Lambda Extension | Medium | None |
| 2 | RecoveryService | Medium | Task 1 |
| 3 | AuthProgressStorage | Small | None |
| 4 | NgRx Integration | Medium | Tasks 2, 3 |
| 5 | User Messages | Small | Task 4 |
| 6 | Property-Based Tests | Medium | Tasks 2, 3 |
| 7 | Integration Tests | Medium | All above |
| 8 | Documentation & Version | Small | All above |

---

## Task 1: Extend CheckEmailExists Lambda

### Objective
Extend the existing `CheckEmailExists` Lambda to return Cognito user status alongside existence check.

### Files to Modify
- `apps/api/src/lambdas/check_email_exists/handler.py`
- `apps/api/graphql/schema.graphql` (if response type needs update)

### Implementation Steps

- [x] 1.1 Add `adminGetUser` call to check Cognito user status
- [x] 1.2 Map Cognito `UserStatus` to response enum
- [x] 1.3 Return `cognitoStatus` and `cognitoSub` in response
- [x] 1.4 Handle case where user doesn't exist in Cognito (return null status)
- [x] 1.5 Add error handling for Cognito API failures
- [x] 1.6 Update GraphQL response type if needed
- [x] 1.7 Test Lambda locally with various user states

### Acceptance Criteria
- Lambda returns `cognitoStatus` for existing users
- Lambda returns `null` status for non-existent users
- Lambda handles Cognito API errors gracefully

---

## Task 2: Create RecoveryService

### Objective
Create a new Angular service that implements the smart check logic and recovery actions.

### Files to Create
- `apps/web/src/app/core/services/recovery.service.ts`
- `apps/web/src/app/core/models/RecoveryModel.ts`

### Implementation Steps

- [x] 2.1 Create `RecoveryModel.ts` with interfaces:
  - `SmartCheckResult`
  - `CognitoUserStatus` enum
  - `RecoveryAction` enum
- [x] 2.2 Create `RecoveryService` class
- [x] 2.3 Implement `smartCheck(email)` method:
  - Call extended `CheckEmailExists` Lambda
  - Query DynamoDB for user record
  - Apply state decision matrix
  - Return `SmartCheckResult`
- [x] 2.4 Implement `resendVerificationCode(email)` method
- [x] 2.5 Implement `createOrphanedUserRecord(email, cognitoSub)` method
- [x] 2.6 Add debug logging via `DebugLogService`
- [x] 2.7 Ensure all user messages are jargon-free

### Acceptance Criteria
- Service correctly identifies all state combinations
- Service returns appropriate recovery actions
- All user messages are friendly and jargon-free

---

## Task 3: Create AuthProgressStorage

### Objective
Create a service for persisting auth progress to local storage.

### Files to Create
- `apps/web/src/app/core/services/auth-progress-storage.service.ts`

### Implementation Steps

- [x] 3.1 Create `AuthProgressStorage` service
- [x] 3.2 Implement `save(progress)` method
- [x] 3.3 Implement `get()` method
- [x] 3.4 Implement `clear()` method
- [x] 3.5 Implement `isValid(progress)` method with 24-hour expiry
- [x] 3.6 Add storage key constant: `orb_auth_progress`
- [x] 3.7 Handle localStorage unavailability gracefully

### Acceptance Criteria
- Progress persists across page refreshes
- Expired progress is detected and cleared
- Service handles localStorage errors gracefully

---

## Task 4: NgRx Integration

### Objective
Update NgRx effects to use the new recovery services.

### Files to Modify
- `apps/web/src/app/features/user/store/user.effects.ts`
- `apps/web/src/app/features/user/store/user.actions.ts`
- `apps/web/src/app/features/user/store/user.reducer.ts`
- `apps/web/src/app/features/user/store/user.state.ts`

### Implementation Steps

- [x] 4.1 Add new actions:
  - `smartCheck`
  - `smartCheckSuccess`
  - `smartCheckFailure`
  - `recoverOrphanedUser`
  - `recoverOrphanedUserSuccess`
  - `recoverOrphanedUserFailure`
  - `resumeFromStorage`
- [x] 4.2 Update `checkEmail$` effect to use `RecoveryService.smartCheck()`
- [x] 4.3 Add `smartCheck$` effect that routes based on `SmartCheckResult`
- [x] 4.4 Add `recoverOrphanedUser$` effect for Cognito-only users
- [x] 4.5 Update `createUser$` effect to handle `UsernameExistsException`:
  - Catch exception
  - Trigger smart check
  - Route to recovery flow
- [x] 4.6 Add `resumeFromStorage$` effect for page load
- [x] 4.7 Update reducer to handle new actions
- [x] 4.8 Add `recoveryMessage` to state for user-facing messages

### Acceptance Criteria
- Smart check routes to correct step for all state combinations
- `UsernameExistsException` triggers recovery instead of error
- Progress resumes correctly from local storage

---

## Task 5: Update User Messages

### Objective
Replace all technical error messages with user-friendly alternatives.

### Files to Modify
- `apps/web/src/app/features/user/components/auth-flow/auth-flow.component.ts`
- `apps/web/src/app/features/user/components/auth-flow/auth-flow.component.html`
- `apps/web/src/app/core/models/ErrorRegistryModel.ts` (if needed)

### Implementation Steps

- [x] 5.1 Create message constants file or add to existing:
  ```typescript
  const AUTH_MESSAGES = {
    WELCOME_BACK: "Welcome back! Let's finish setting up your account.",
    NEW_CODE_SENT: "We've sent a new verification code to your email.",
    NETWORK_ERROR: "We're having trouble connecting. Your progress is saved - please try again.",
    GENERIC_ERROR: "Something went wrong. Please try again or contact support if this continues.",
    RESUMING: "We found your account. Let's pick up where you left off."
  };
  ```
- [x] 5.2 Update auth-flow component to display recovery messages
- [x] 5.3 Add loading states with friendly messages
- [x] 5.4 Remove any technical jargon from existing error displays
- [x] 5.5 Add "Resume" prompt when returning with saved progress

### Acceptance Criteria
- No technical terms visible to users
- All error states have friendly messages
- Loading states provide reassurance

---

## Task 6: Property-Based Tests

### Objective
Implement property-based tests for correctness properties defined in design.md.

### Files to Create
- `apps/web/src/app/core/services/recovery.service.spec.ts`
- `apps/web/src/app/core/services/auth-progress-storage.service.spec.ts`

### Implementation Steps

- [x] 6.1 Install `fast-check` if not present: `npm install --save-dev fast-check`
- [x] 6.2 Implement Property 1 test: Idempotent smart check
- [x] 6.3 Implement Property 2 test: State consistency
- [x] 6.4 Implement Property 3 test: No jargon in user messages
- [x] 6.5 Implement Property 4 test: Progress persistence round-trip
- [x] 6.6 Implement Property 5 test: Expired progress detection
- [x] 6.7 Implement Property 6 test: Recovery action completeness
- [x] 6.8 Ensure all tests run with `numRuns: 100`

### Acceptance Criteria
- All 6 correctness properties have passing tests
- Tests run minimum 100 iterations each
- Tests include property tags per spec standards

---

## Task 7: Integration Tests

### Objective
Create integration tests for recovery scenarios.

### Files to Create/Modify
- `apps/web/src/app/features/user/store/user.effects.spec.ts`

### Implementation Steps

- [x] 7.1 Test: Orphaned Cognito user recovery
  - Mock Cognito user exists, DynamoDB empty
  - Verify routes to EMAIL_VERIFY
  - Verify resends verification code
- [x] 7.2 Test: Complete user login
  - Mock both Cognito and DynamoDB exist
  - Verify routes to PASSWORD_VERIFY
- [x] 7.3 Test: Fresh signup
  - Mock neither exists
  - Verify routes to PASSWORD_SETUP
- [x] 7.4 Test: Network failure recovery
  - Mock network error
  - Verify shows retry message
  - Verify preserves progress
- [x] 7.5 Test: UsernameExistsException handling
  - Mock exception during createUser
  - Verify triggers smart check
  - Verify routes to recovery

### Acceptance Criteria
- All recovery scenarios have passing tests
- Tests verify correct routing and messaging
- Tests verify progress persistence

---

## Task 8: Documentation & Version

### Objective
Update documentation, bump version, and update changelog.

### Files to Modify
- `CHANGELOG.md`
- `apps/web/package.json` (version bump)

### Implementation Steps

- [x] 8.1 Bump version in `package.json` (minor version for new feature)
- [x] 8.2 Update `CHANGELOG.md` with new version section:
  ```markdown
  ## [X.Y.0] - 2026-01-17
  
  ### Added
  - Smart Recovery Auth Flow for resilient registration
  - RecoveryService for automatic state detection
  - AuthProgressStorage for progress persistence
  - Property-based tests for auth flow correctness
  
  ### Changed
  - CheckEmailExists Lambda now returns Cognito user status
  - Auth flow automatically recovers from partial states
  - User messages are now jargon-free
  ```
- [x] 8.3 Run all checks: `npm run lint && npm test`
- [x] 8.4 Commit with message: `feat: add smart recovery auth flow`
- [x] 8.5 Push changes
  - Note: Completed in previous session

### Acceptance Criteria
- Version bumped appropriately
- CHANGELOG updated with all changes
- All checks pass
- Changes committed and pushed

---

## Final Checklist

Before marking spec complete:

- [x] All verification checks pass
- [x] No linting errors or warnings
- [x] All tests pass (unit, property, integration)
- [x] Git commit includes descriptive message
- [x] Version bumped in package.json
- [x] CHANGELOG updated
- [x] No technical jargon in user-facing messages
- [x] Debug logging captures recovery decisions
