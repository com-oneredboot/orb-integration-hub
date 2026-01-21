# Design Document: Auth Workflow Review

## Overview

This design document outlines the approach for conducting a comprehensive security and engineering review of the orb-integration-hub authentication workflow. The review will systematically audit all components of the auth system, assess test coverage, and produce a prioritized remediation plan.

## Architecture

The auth workflow consists of the following components that will be reviewed:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Frontend (Angular)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  auth-flow.component.ts    │  cognito.service.ts    │  user.service.ts      │
│  user.effects.ts           │  user.reducer.ts       │  recovery.service.ts  │
│  auth.guard.ts             │  rate-limiting.service │  auth-progress.service│
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AWS AppSync (GraphQL)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  CheckEmailExists          │  CreateUserFromCognito │  UsersCreate          │
│  UsersUpdate               │  UsersQuery*           │  SmsVerification      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
┌──────────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│   AWS Cognito        │  │   AWS Lambda     │  │   AWS DynamoDB       │
├──────────────────────┤  ├──────────────────┤  ├──────────────────────┤
│  User Pool           │  │  CheckEmailExists│  │  Users Table         │
│  PostConfirmation    │  │  CreateUserFrom  │  │  EmailIndex          │
│  Trigger             │  │  Cognito         │  │  CognitoSubIndex     │
└──────────────────────┘  └──────────────────┘  └──────────────────────┘
```

### Auth Flow Sequence

```
EMAIL_ENTRY → PASSWORD_SETUP → EMAIL_VERIFY → SIGNIN → MFA_SETUP → CreateUserFromCognito → DASHBOARD
     │              │               │            │           │              │
     ▼              ▼               ▼            ▼           ▼              ▼
 smartCheck    createCognito   confirmSignUp  signIn    confirmSignIn   Lambda
              User (only)                              (TOTP setup)    creates
                                                                      DynamoDB
```

## Components and Interfaces

### Frontend Components to Review

| Component | File Path | Security Concerns |
|-----------|-----------|-------------------|
| Auth Flow Component | `apps/web/src/app/features/user/components/auth-flow/` | XSS, form validation, error exposure |
| Cognito Service | `apps/web/src/app/core/services/cognito.service.ts` | Token handling, session management |
| User Service | `apps/web/src/app/core/services/user.service.ts` | API calls, auth modes |
| User Effects | `apps/web/src/app/features/user/store/user.effects.ts` | State transitions, error handling |
| User Reducer | `apps/web/src/app/features/user/store/user.reducer.ts` | State management |
| Recovery Service | `apps/web/src/app/core/services/recovery.service.ts` | Smart check logic |
| Auth Guard | `apps/web/src/app/core/guards/auth.guard.ts` | Route protection |
| Rate Limiting | `apps/web/src/app/core/services/rate-limiting.service.ts` | Brute force protection |

### Backend Components to Review

| Component | File Path | Security Concerns |
|-----------|-----------|-------------------|
| CheckEmailExists Lambda | `apps/api/lambdas/check_email_exists/` | Timing attacks, enumeration |
| CreateUserFromCognito Lambda | `apps/api/lambdas/create_user_from_cognito/` | Input validation, IAM |
| PostConfirmation Trigger | `infrastructure/cdk/stacks/cognito_stack.py` | Group assignment |
| Users Table Schema | `schemas/tables/Users.yml` | Auth directives |
| Lambda Schema | `schemas/lambdas/` | API key vs Cognito auth |

### Infrastructure Components to Review

| Component | File Path | Security Concerns |
|-----------|-----------|-------------------|
| Cognito Stack | `infrastructure/cdk/stacks/cognito_stack.py` | User pool config, triggers |
| Lambda Stack | `infrastructure/cdk/stacks/lambda_stack.py` | IAM roles, permissions |
| AppSync Stack | `infrastructure/cdk/stacks/appsync_stack.py` | API config, auth modes |

## Data Models

### Security Audit Finding Model

```typescript
interface SecurityFinding {
  id: string;                    // e.g., "SEC-001"
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: 'AUTH' | 'API' | 'DATA' | 'CONFIG' | 'CODE';
  title: string;
  description: string;
  affectedFiles: string[];
  recommendation: string;
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  blocksSDKRelease: boolean;
}
```

### Test Coverage Gap Model

```typescript
interface TestCoverageGap {
  id: string;                    // e.g., "TEST-001"
  file: string;
  function: string;
  currentCoverage: number;       // percentage
  missingTests: string[];        // descriptions of missing test cases
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  testType: 'UNIT' | 'PROPERTY' | 'INTEGRATION';
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Auth Directive Consistency

*For any* GraphQL operation (query or mutation) in the schema, the auth directive (@aws_api_key or @aws_auth) SHALL match the security requirements documented in the API documentation and schema definitions.

**Validates: Requirements 1.2, 3.1**

### Property 2: No Information Leakage

*For any* log statement, error response, or user-facing message in auth-related code, the output SHALL NOT contain:
- Email addresses in plaintext (except masked versions)
- Phone numbers
- Passwords or tokens
- Stack traces or internal file paths
- Database query details

**Validates: Requirements 1.3, 3.5, 4.4, 5.6**

### Property 3: Input Validation Completeness

*For any* user-supplied input to auth endpoints (frontend forms, GraphQL inputs, Lambda event parameters), validation SHALL be performed before processing, including:
- Type validation
- Format validation (email, phone, UUID)
- Length limits
- XSS/injection prevention

**Validates: Requirements 3.4, 4.3, 5.5**

### Property 4: Lambda Security Configuration

*For any* Lambda function in the auth workflow:
- The execution role SHALL only have permissions required for that function's operation
- Environment variables SHALL NOT contain hardcoded secrets (use SSM/Secrets Manager references)

**Validates: Requirements 4.1, 4.2**

### Property 5: Rate Limiting Coverage

*For any* authentication attempt (email check, password verify, MFA verify), the rate limiting service SHALL be invoked before processing the request.

**Validates: Requirements 1.5**

### Property 6: Route Guard Coverage

*For any* Angular route that requires authentication, an auth guard SHALL be configured to protect access.

**Validates: Requirements 5.4**

### Property 7: XSS Protection

*For any* user input rendered in the Angular application, sanitization SHALL be applied using Angular's DomSanitizer or equivalent protection.

**Validates: Requirements 5.1**

## Error Handling

### Audit Process Error Handling

| Error Scenario | Handling |
|----------------|----------|
| File not found | Log warning, continue with available files |
| Parse error | Log error with file path, skip file |
| Test execution failure | Log failure, include in report |
| Coverage tool unavailable | Document limitation, use alternative |

## Testing Strategy

### Audit Verification Tests

The audit will produce verification tests that can be run to confirm findings:

1. **Schema Auth Directive Tests** - Verify GraphQL operations have correct auth modes
2. **PII Logging Tests** - Grep for potential PII patterns in log statements
3. **Input Validation Tests** - Property tests for input validation functions
4. **Error Message Tests** - Verify error responses don't leak information

### Test Coverage Analysis

The audit will use the following tools:

| Language | Coverage Tool | Command |
|----------|---------------|---------|
| Python | pytest-cov | `pytest --cov=apps/api --cov-report=html` |
| TypeScript | Jest/Karma | `npm run test:coverage` |

### Property-Based Test Gaps

The audit will identify where property tests should exist but don't:

- Round-trip tests for serialization
- Invariant tests for state transitions
- Idempotency tests for retry-safe operations

## Review Methodology

### Phase 1: Static Analysis

1. Review all auth-related source files
2. Check for common vulnerability patterns (OWASP Top 10)
3. Verify auth directives in GraphQL schema
4. Check IAM policies for least privilege

### Phase 2: Configuration Review

1. Review Cognito User Pool settings
2. Review AppSync API configuration
3. Review Lambda environment variables
4. Review CDK security constructs

### Phase 3: Test Coverage Analysis

1. Run coverage tools on backend and frontend
2. Identify untested code paths
3. Identify missing property tests
4. Prioritize test gaps by risk

### Phase 4: Documentation Review

1. Compare implementation to documentation
2. Identify documentation gaps
3. Verify error codes are documented
4. Check security considerations

### Phase 5: Remediation Planning

1. Compile all findings
2. Assign severity ratings
3. Estimate remediation effort
4. Identify SDK release blockers
5. Create prioritized task list

## Deliverables

1. **Security Findings Report** - All findings with severity, recommendations
2. **Test Coverage Report** - Current coverage, gaps, prioritized tests to add
3. **Documentation Gaps Report** - Missing or outdated documentation
4. **Remediation Plan** - Prioritized tasks with effort estimates
5. **Verification Tests** - Automated tests to confirm findings are addressed
