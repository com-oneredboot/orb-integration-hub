# Bugfix Requirements Document

## Introduction

The application makes unnecessary Cognito API calls on startup that result in 400 errors when no user is logged in. This is a code bug where `fetchAuthSession()` is called immediately without first checking if tokens exist in local storage. The fix will implement a true lightweight local token check that reads from IndexedDB/localStorage directly before making any API calls to Cognito.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the app starts and no user is logged in THEN the system calls `fetchAuthSession()` which makes an HTTP request to Cognito resulting in a 400 "Bad Request" error

1.2 WHEN `checkIsAuthenticated()` is called at line 285 THEN the system immediately calls `fetchAuthSession()` without checking local storage first

1.3 WHEN `checkHasTokens()` is called at line 382 THEN the system also calls `fetchAuthSession()` making it not a lightweight check

1.4 WHEN the app initialization completes with no logged-in user THEN the system displays red error messages in the console from failed Cognito API calls

### Expected Behavior (Correct)

2.1 WHEN the app starts THEN the system SHALL check IndexedDB/localStorage for tokens FIRST without making any API calls

2.2 WHEN no tokens exist in local storage THEN the system SHALL skip the Cognito API call and return false immediately

2.3 WHEN tokens exist in local storage THEN the system SHALL call `fetchAuthSession()` to validate tokens with Cognito

2.4 WHEN no user is logged in THEN the system SHALL NOT display any 400 errors in the console

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user is logged in with valid tokens THEN the system SHALL CONTINUE TO validate authentication state correctly

3.2 WHEN tokens are expired or expiring soon THEN the system SHALL CONTINUE TO refresh them automatically

3.3 WHEN `checkIsAuthenticated()` is called with valid tokens THEN the system SHALL CONTINUE TO verify user groups and app access

3.4 WHEN authentication state changes THEN the system SHALL CONTINUE TO update the `isAuthenticatedSubject` observable correctly

3.5 WHEN the app redirects authenticated users from `/authenticate` to `/dashboard` THEN the system SHALL CONTINUE TO perform this redirect correctly
