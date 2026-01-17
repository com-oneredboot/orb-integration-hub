# Design Document

## Standard Requirements

This spec follows the [orb-templates Spec Standards](../../../repositories/orb-templates/docs/kiro-steering/templates/spec-standards.md).

## Overview

The Smart Recovery Auth Flow provides a resilient authentication system that automatically detects and recovers from partial registration states. It addresses the two-phase commit problem where Cognito user creation succeeds but DynamoDB record creation fails, leaving users in an orphaned state.

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Auth Flow Component                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │ Email Entry │→ │Smart Check  │→ │ Route to    │                 │
│  │   Step      │  │  Service    │  │ Correct Step│                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Recovery Service                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Smart Check Logic                         │   │
│  │  1. Check DynamoDB for user record                          │   │
│  │  2. Check Cognito for user status (via Lambda)              │   │
│  │  3. Determine recovery action based on state matrix         │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ Cognito  │    │ DynamoDB │    │  Local   │
    │  (Auth)  │    │  (Data)  │    │ Storage  │
    └──────────┘    └──────────┘    └──────────┘
```

### State Decision Matrix

| Cognito State | DynamoDB State | Action | User Message |
|---------------|----------------|--------|--------------|
| None | None | New signup | "Let's create your account" |
| UNCONFIRMED | None | Resend code, EMAIL_VERIFY | "Welcome back! We've sent a new code" |
| CONFIRMED | None | Create DynamoDB record, continue | "Almost there! Let's finish setup" |
| FORCE_CHANGE_PASSWORD | None | Password reset flow | "Please set a new password" |
| CONFIRMED | Exists | Login flow | "Welcome back!" |
| None | Exists | Data integrity error (log) | "Please contact support" |

## Component Interfaces

### RecoveryService

```typescript
interface SmartCheckResult {
  cognitoStatus: CognitoUserStatus | null;
  dynamoExists: boolean;
  recoveryAction: RecoveryAction;
  userMessage: string;
  nextStep: AuthSteps;
}

enum CognitoUserStatus {
  UNCONFIRMED = 'UNCONFIRMED',
  CONFIRMED = 'CONFIRMED',
  FORCE_CHANGE_PASSWORD = 'FORCE_CHANGE_PASSWORD',
  RESET_REQUIRED = 'RESET_REQUIRED',
  UNKNOWN = 'UNKNOWN'
}

enum RecoveryAction {
  NEW_SIGNUP = 'NEW_SIGNUP',
  RESEND_VERIFICATION = 'RESEND_VERIFICATION',
  CREATE_DYNAMO_RECORD = 'CREATE_DYNAMO_RECORD',
  LOGIN = 'LOGIN',
  PASSWORD_RESET = 'PASSWORD_RESET',
  CONTACT_SUPPORT = 'CONTACT_SUPPORT'
}

class RecoveryService {
  /**
   * Performs smart check across Cognito and DynamoDB
   * @param email User's email address
   * @returns SmartCheckResult with recovery action
   */
  async smartCheck(email: string): Promise<SmartCheckResult>;
  
  /**
   * Resends verification code for UNCONFIRMED users
   * @param email User's email address
   */
  async resendVerificationCode(email: string): Promise<void>;
  
  /**
   * Creates DynamoDB record for orphaned Cognito users
   * @param email User's email
   * @param cognitoSub Cognito user ID
   */
  async createOrphanedUserRecord(email: string, cognitoSub: string): Promise<void>;
}
```

### CheckCognitoUserStatus Lambda (Backend Extension)

The existing `CheckEmailExists` Lambda will be extended to return Cognito user status:

```typescript
// Request
interface CheckEmailExistsRequest {
  email: string;
}

// Response (extended)
interface CheckEmailExistsResponse {
  exists: boolean;
  cognitoStatus?: CognitoUserStatus;  // NEW: Cognito user status
  cognitoSub?: string;                 // NEW: Cognito user ID if exists
}
```

### AuthProgressStorage

```typescript
interface AuthProgress {
  email: string;
  step: AuthSteps;
  timestamp: number;
  cognitoSub?: string;
}

class AuthProgressStorage {
  /**
   * Saves current auth progress to local storage
   */
  save(progress: AuthProgress): void;
  
  /**
   * Retrieves saved auth progress
   */
  get(): AuthProgress | null;
  
  /**
   * Clears saved auth progress
   */
  clear(): void;
  
  /**
   * Checks if saved progress is still valid (not expired)
   */
  isValid(progress: AuthProgress): boolean;
}
```

## Data Models

### SmartCheckResult

```typescript
interface SmartCheckResult {
  // Cognito state
  cognitoStatus: CognitoUserStatus | null;
  cognitoSub: string | null;
  
  // DynamoDB state
  dynamoExists: boolean;
  dynamoUser: IUsers | null;
  
  // Recovery decision
  recoveryAction: RecoveryAction;
  nextStep: AuthSteps;
  
  // User-facing message (no jargon)
  userMessage: string;
  
  // Debug info (for logging only)
  debugInfo: {
    checkTimestamp: Date;
    cognitoCheckMs: number;
    dynamoCheckMs: number;
  };
}
```

### AuthProgress (Local Storage)

```typescript
interface AuthProgress {
  email: string;
  step: AuthSteps;
  timestamp: number;
  cognitoSub?: string;
  expiresAt: number;  // 24 hours from creation
}
```

## Error Handling Strategy

### Network Errors

```typescript
// All network errors surface user-friendly message
const NETWORK_ERROR_MESSAGE = "We're having trouble connecting. Your progress is saved - please try again.";

// Retry strategy
const RETRY_CONFIG = {
  maxRetries: 3,
  backoffMs: [1000, 2000, 4000],  // Exponential backoff
  retryableErrors: ['NetworkError', 'TimeoutError', 'ERR_NAME_NOT_RESOLVED']
};
```

### Recovery Error Handling

| Error Type | Recovery Action | User Message |
|------------|-----------------|--------------|
| Network timeout | Retry with backoff | "Connecting..." |
| Cognito rate limit | Wait and retry | "Please wait a moment..." |
| DynamoDB error | Log, continue with Cognito data | "Almost there..." |
| Unknown error | Log, offer manual retry | "Something went wrong. Please try again." |

## Correctness Properties

### Property 1: Idempotent Smart Check
*For any* email address, calling `smartCheck(email)` multiple times SHALL return the same `recoveryAction` if the underlying state hasn't changed.
**Validates: Requirements 5.1, 5.2**

### Property 2: State Consistency
*For any* valid `SmartCheckResult`, the `nextStep` SHALL be consistent with the `recoveryAction`:
- `NEW_SIGNUP` → `PASSWORD_SETUP`
- `RESEND_VERIFICATION` → `EMAIL_VERIFY`
- `CREATE_DYNAMO_RECORD` → `PHONE_SETUP` or `MFA_SETUP`
- `LOGIN` → `PASSWORD_VERIFY`
- `PASSWORD_RESET` → `PASSWORD_SETUP`
**Validates: Requirements 1.2, 1.4, 1.5**

### Property 3: No Jargon in User Messages
*For any* `SmartCheckResult`, the `userMessage` SHALL NOT contain: "Cognito", "DynamoDB", "Lambda", "API", "500", "401", "exception", "error code".
**Validates: Requirements 4.3**

### Property 4: Progress Persistence Round-Trip
*For any* valid `AuthProgress` object, `storage.save(progress)` followed by `storage.get()` SHALL return an equivalent object.
**Validates: Requirements 6.1, 6.2**

### Property 5: Expired Progress Detection
*For any* `AuthProgress` with `expiresAt < Date.now()`, `storage.isValid(progress)` SHALL return `false`.
**Validates: Requirements 6.4**

### Property 6: Recovery Action Completeness
*For any* combination of `(cognitoStatus, dynamoExists)`, there SHALL exist exactly one valid `recoveryAction`.
**Validates: Requirements 1.1 through 1.5**

## Testing Strategy

### Unit Tests

| Component | Test Focus | Coverage Target |
|-----------|------------|-----------------|
| RecoveryService | State matrix logic | 100% of state combinations |
| AuthProgressStorage | Persistence, expiry | Round-trip, edge cases |
| User messages | No jargon validation | All message strings |

### Property-Based Tests

Using `fast-check` library:

```typescript
// Property 1: Idempotent smart check
fc.assert(
  fc.property(fc.emailAddress(), async (email) => {
    const result1 = await recoveryService.smartCheck(email);
    const result2 = await recoveryService.smartCheck(email);
    return result1.recoveryAction === result2.recoveryAction;
  }),
  { numRuns: 100 }
);

// Property 3: No jargon
const FORBIDDEN_TERMS = ['Cognito', 'DynamoDB', 'Lambda', 'API', '500', '401', 'exception'];
fc.assert(
  fc.property(
    fc.record({
      cognitoStatus: fc.constantFrom(null, ...Object.values(CognitoUserStatus)),
      dynamoExists: fc.boolean()
    }),
    (state) => {
      const result = determineRecoveryAction(state);
      return !FORBIDDEN_TERMS.some(term => 
        result.userMessage.toLowerCase().includes(term.toLowerCase())
      );
    }
  ),
  { numRuns: 100 }
);
```

### Integration Tests

| Scenario | Setup | Expected Outcome |
|----------|-------|------------------|
| Orphaned Cognito user | Create Cognito user, no DynamoDB | Routes to EMAIL_VERIFY, resends code |
| Complete user | Both Cognito and DynamoDB exist | Routes to LOGIN |
| Fresh signup | Neither exists | Routes to PASSWORD_SETUP |
| Network failure | Mock network error | Shows retry message, preserves progress |

## Implementation Sequence

1. **Backend**: Extend `CheckEmailExists` Lambda to return Cognito status
2. **Frontend**: Create `RecoveryService` with smart check logic
3. **Frontend**: Create `AuthProgressStorage` for local persistence
4. **Frontend**: Update `checkEmail$` effect to use smart check
5. **Frontend**: Add recovery handling in `createUser$` effect
6. **Frontend**: Update user messages throughout auth flow
7. **Tests**: Property-based tests for correctness properties
8. **Tests**: Integration tests for recovery scenarios

## Related Documentation

- [Requirements](./requirements.md) - Feature requirements
- [Tasks](./tasks.md) - Implementation checklist
- [Testing Standards](../../../repositories/orb-templates/docs/testing-standards/README.md)
- [Spec Standards](../../../repositories/orb-templates/docs/kiro-steering/templates/spec-standards.md)
