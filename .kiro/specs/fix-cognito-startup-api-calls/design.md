# Fix Cognito Startup API Calls - Bugfix Design

## Overview

This bugfix eliminates unnecessary Cognito API calls on application startup by implementing a true lightweight local token check. The current implementation calls `fetchAuthSession()` immediately, which makes HTTP requests to Cognito even when no user is logged in, resulting in 400 errors. The fix will check IndexedDB/localStorage for tokens FIRST before making any API calls, eliminating console errors and improving startup performance.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when `checkIsAuthenticated()` or `checkHasTokens()` is called and no tokens exist in local storage
- **Property (P)**: The desired behavior - no Cognito API calls should be made when no tokens exist locally
- **Preservation**: Existing authentication validation, token refresh, and redirect behavior must remain unchanged
- **fetchAuthSession**: Amplify Auth function that validates tokens with Cognito (makes HTTP request)
- **checkIsAuthenticated**: CognitoService method that validates full authentication state (line 282)
- **checkHasTokens**: CognitoService method intended as lightweight token check (line 380)
- **IndexedDB**: Browser storage where Amplify stores authentication tokens
- **KeyValueStorage**: Amplify's storage abstraction that uses IndexedDB by default in browsers

## Bug Details

### Fault Condition

The bug manifests when the application starts without a logged-in user. The `checkIsAuthenticated()` and `checkHasTokens()` methods immediately call `fetchAuthSession()`, which makes HTTP requests to Cognito even when no tokens exist in local storage. This results in 400 "Bad Request" errors in the console.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { method: string, hasLocalTokens: boolean }
  OUTPUT: boolean
  
  RETURN (input.method IN ['checkIsAuthenticated', 'checkHasTokens'])
         AND (input.hasLocalTokens === false)
         AND fetchAuthSessionCalled(input.method)
END FUNCTION
```

### Examples

- **Example 1**: User opens app for first time → `checkIsAuthenticated()` called → `fetchAuthSession()` makes HTTP request → 400 error logged
- **Example 2**: User previously logged out → app starts → `checkHasTokens()` called → `fetchAuthSession()` makes HTTP request → 400 error logged
- **Example 3**: User refreshes page while logged out → `checkIsAuthenticated()` called → `fetchAuthSession()` makes HTTP request → 400 error logged
- **Edge Case**: User has expired tokens in IndexedDB → local check finds tokens → `fetchAuthSession()` called to validate → proper token refresh flow executes

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Token validation with Cognito must continue to work for logged-in users
- Automatic token refresh for expired/expiring tokens must continue to work
- User group verification and app access checks must continue to work
- Authentication state observable updates must continue to work
- Redirect from `/authenticate` to `/dashboard` for authenticated users must continue to work

**Scope:**
All inputs where tokens DO exist in local storage should be completely unaffected by this fix. This includes:
- Logged-in users with valid tokens
- Logged-in users with expired tokens (refresh flow)
- All authentication state checks for authenticated users
- All token validation and group verification logic

## Hypothesized Root Cause

Based on the bug description, the most likely issues are:

1. **Missing Local Storage Check**: The `checkIsAuthenticated()` method at line 285 immediately calls `fetchAuthSession()` without first checking if tokens exist in IndexedDB/localStorage
   - This causes unnecessary HTTP requests to Cognito
   - Results in 400 errors when no tokens exist

2. **checkHasTokens Not Lightweight**: The `checkHasTokens()` method at line 382 also calls `fetchAuthSession()`, making it not a true lightweight check
   - Method name implies local-only check but actually makes API calls
   - Defeats the purpose of having a "lightweight" token check

3. **No Direct Storage Access**: Neither method accesses Amplify's underlying storage (IndexedDB) directly
   - Amplify v6 uses `aws-amplify/utils` KeyValueStorage which wraps IndexedDB
   - Storage keys follow pattern: `CognitoIdentityServiceProvider.{clientId}.LastAuthUser` and `CognitoIdentityServiceProvider.{clientId}.{username}.{tokenType}`

4. **Startup Sequence Issue**: The app initialization calls authentication checks before verifying local token existence
   - Guards and services call `checkIsAuthenticated()` immediately
   - No early-exit path for "definitely not logged in" case

## Correctness Properties

Property 1: Fault Condition - No API Calls Without Local Tokens

_For any_ authentication check where no tokens exist in IndexedDB/localStorage, the fixed functions SHALL return false immediately without making any HTTP requests to Cognito, eliminating 400 errors in the console.

**Validates: Requirements 2.1, 2.2, 2.4**

Property 2: Preservation - Authenticated User Behavior

_For any_ authentication check where tokens DO exist in local storage, the fixed functions SHALL produce exactly the same behavior as the original functions, preserving all token validation, refresh, group verification, and redirect logic.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `apps/web/src/app/core/services/cognito.service.ts`

**Function**: `checkHasTokens()` (line 380-387)

**Specific Changes**:

1. **Add Local Storage Check Helper**: Create a new private method `hasLocalTokens()` that directly checks IndexedDB for token existence
   - Use Amplify's `defaultStorage` from `aws-amplify/utils`
   - Check for `LastAuthUser` key to determine if any user was logged in
   - If `LastAuthUser` exists, check for `accessToken` and `idToken` keys for that user
   - Return boolean without making any API calls

2. **Update checkHasTokens()**: Modify to check local storage FIRST
   - Call `hasLocalTokens()` before `fetchAuthSession()`
   - If no local tokens, return false immediately
   - If local tokens exist, proceed with current `fetchAuthSession()` logic

3. **Update checkIsAuthenticated()**: Add early-exit for no local tokens
   - Call `hasLocalTokens()` at the start (before line 285)
   - If no local tokens, set `isAuthenticatedSubject.next(false)` and return false immediately
   - If local tokens exist, proceed with current full validation logic

4. **Import Required Utilities**: Add import for Amplify storage utilities
   - Import `defaultStorage` from `@aws-amplify/utils/storage`
   - Import `KeyValueStorageInterface` type if needed

5. **Handle Storage Errors Gracefully**: Wrap storage access in try-catch
   - If IndexedDB access fails (private browsing, storage full), fall back to current behavior
   - Log debug message but don't throw errors

### Implementation Pseudocode

```typescript
// New helper method
private async hasLocalTokens(): Promise<boolean> {
  try {
    const storage = defaultStorage;
    const clientId = environment.cognito.userPoolClientId;
    
    // Check if any user was logged in
    const lastAuthUser = await storage.getItem(
      `CognitoIdentityServiceProvider.${clientId}.LastAuthUser`
    );
    
    if (!lastAuthUser) {
      return false;
    }
    
    // Check if tokens exist for that user
    const accessToken = await storage.getItem(
      `CognitoIdentityServiceProvider.${clientId}.${lastAuthUser}.accessToken`
    );
    const idToken = await storage.getItem(
      `CognitoIdentityServiceProvider.${clientId}.${lastAuthUser}.idToken`
    );
    
    return !!(accessToken && idToken);
  } catch (error) {
    console.debug('[CognitoService] Failed to check local storage, falling back to API call');
    return true; // Fall back to API call if storage check fails
  }
}

// Updated checkHasTokens
public async checkHasTokens(): Promise<boolean> {
  // Check local storage first - no API call
  const hasLocal = await this.hasLocalTokens();
  if (!hasLocal) {
    return false;
  }
  
  // Tokens exist locally, validate with Cognito
  try {
    const session = await fetchAuthSession();
    return !!session.tokens?.accessToken && !!session.tokens?.idToken;
  } catch {
    return false;
  }
}

// Updated checkIsAuthenticated
public async checkIsAuthenticated(): Promise<boolean> {
  try {
    // Early exit if no local tokens - no API call
    const hasLocal = await this.hasLocalTokens();
    if (!hasLocal) {
      console.debug('[CognitoService] No local tokens found');
      this.isAuthenticatedSubject.next(false);
      return false;
    }
    
    // Tokens exist locally, proceed with full validation
    let session = await fetchAuthSession();
    // ... rest of existing logic unchanged ...
  } catch (error) {
    console.debug('[CognitoService] Error during authentication check');
    this.isAuthenticatedSubject.next(false);
    return false;
  }
}
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate app startup with no logged-in user and observe network requests. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Fresh App Start Test**: Clear IndexedDB, call `checkIsAuthenticated()`, observe HTTP request to Cognito (will fail on unfixed code)
2. **After Logout Test**: Simulate logout, restart app, call `checkHasTokens()`, observe HTTP request (will fail on unfixed code)
3. **No LastAuthUser Test**: Remove `LastAuthUser` key from IndexedDB, call authentication checks, observe HTTP requests (will fail on unfixed code)
4. **Expired Tokens Test**: Set expired tokens in IndexedDB, call checks, observe proper refresh flow (should pass on unfixed code)

**Expected Counterexamples**:
- HTTP requests to Cognito when no tokens exist in IndexedDB
- 400 "Bad Request" errors in console on app startup
- Possible causes: missing local storage check, immediate `fetchAuthSession()` call, no early-exit path

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := checkIsAuthenticated_fixed(input)
  ASSERT result === false
  ASSERT noHttpRequestMade()
  ASSERT noConsoleErrors()
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT checkIsAuthenticated_original(input) = checkIsAuthenticated_fixed(input)
  ASSERT tokenValidationBehaviorUnchanged()
  ASSERT tokenRefreshBehaviorUnchanged()
  ASSERT redirectBehaviorUnchanged()
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all authenticated user scenarios

**Test Plan**: Observe behavior on UNFIXED code first for authenticated users, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Valid Tokens Preservation**: Observe that logged-in users pass authentication checks on unfixed code, then write test to verify this continues after fix
2. **Token Refresh Preservation**: Observe that expired tokens trigger refresh on unfixed code, then write test to verify this continues after fix
3. **Group Verification Preservation**: Observe that group checks work on unfixed code, then write test to verify this continues after fix
4. **Redirect Preservation**: Observe that `/authenticate` → `/dashboard` redirect works on unfixed code, then write test to verify this continues after fix

### Unit Tests

- Test `hasLocalTokens()` with various IndexedDB states (no user, no tokens, valid tokens, expired tokens)
- Test `checkHasTokens()` early-exit path (no local tokens)
- Test `checkHasTokens()` validation path (local tokens exist)
- Test `checkIsAuthenticated()` early-exit path (no local tokens)
- Test `checkIsAuthenticated()` full validation path (local tokens exist)
- Test storage error handling (IndexedDB unavailable, private browsing)

### Property-Based Tests

- Generate random app startup scenarios and verify no HTTP requests when no tokens exist
- Generate random authenticated user states and verify behavior is unchanged
- Generate random token expiration scenarios and verify refresh logic is unchanged
- Test across many combinations of storage states and authentication checks

### Integration Tests

- Test full app startup flow with no logged-in user (no console errors)
- Test full app startup flow with logged-in user (authentication succeeds)
- Test logout → restart → login flow (proper state transitions)
- Test token refresh during active session (automatic refresh works)
- Test redirect behavior for authenticated users (proper navigation)
