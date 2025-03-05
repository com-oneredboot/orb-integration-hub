# API Error Handling Guidelines

## Overview

This document outlines the recommended approach for handling API errors in the ORB Integration Hub frontend. These guidelines replace the previous pattern of using mock fallbacks when API calls fail.

## Error Handling Pattern

1. **Service Layer**:
   - Catch specific API errors
   - Log errors with appropriate context
   - Transform errors into typed domain errors when possible
   - Re-throw the error to allow components to handle them

2. **Component Layer**:
   - Use try/catch when calling service methods
   - Display appropriate user-friendly messages
   - Log errors for debugging
   - Consider implementing retry logic for transient failures

3. **Store/Effects Layer**:
   - Handle errors through dedicated failure actions
   - Maintain error state in the store
   - Allow components to react to error states

## Example Implementation

### Service Method:
```typescript
public async userExists(input: UserQueryInput): Promise<boolean> {
  try {
    const response = await this.query(userExistQuery, {input}, 'apiKey');
    
    if (response.data?.userQueryById?.status_code === 404) {
      return false;
    }
    
    if (response.data?.userQueryById?.status_code !== 200) {
      throw new ApiError(
        `Invalid response code: ${response.data?.userQueryById?.status_code}`,
        response.data?.userQueryById?.status_code
      );
    }
    
    return Boolean(response.data?.userQueryById?.user?.user_id);
  } catch (error) {
    console.error('Error checking if user exists:', error);
    throw new UserServiceError('Failed to check if user exists', error);
  }
}
```

### Component Usage:
```typescript
async checkEmail() {
  try {
    this.isLoading = true;
    const exists = await this.userService.userExists({ email: this.email });
    this.userExists = exists;
  } catch (error) {
    this.errorMessage = 'Unable to verify email. Please try again later.';
    console.error('Email check error:', error);
  } finally {
    this.isLoading = false;
  }
}
```

### Store/Effects Handling:
```typescript
checkEmail$ = createEffect(() =>
  this.actions$.pipe(
    ofType(AuthActions.checkEmail),
    switchMap(({ email }) =>
      from(this.userService.userExists({ email })).pipe(
        map((exists) => AuthActions.checkEmailSuccess({ userExists: exists })),
        catchError((error) => of(AuthActions.checkEmailFailure({
          error: error.message || 'Failed to check email'
        })))
      )
    )
  )
);
```

## Key Differences from Mock Fallbacks

1. **Transparency**: Errors are properly communicated rather than silently falling back to mock data
2. **Debuggability**: Error information is preserved and logged for troubleshooting
3. **Reliability**: No false positives from mock data when APIs fail
4. **Maintainability**: Clear separation between production and test code

## Error Types

Consider implementing these error types to improve error handling:

```typescript
// Base application error
export class AppError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'AppError';
  }
}

// API-specific error
export class ApiError extends AppError {
  constructor(message: string, public statusCode?: number, cause?: unknown) {
    super(message, cause);
    this.name = 'ApiError';
  }
}

// Service-specific errors
export class UserServiceError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'UserServiceError';
  }
}
```