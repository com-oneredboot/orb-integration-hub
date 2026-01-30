# Design Document

## Overview

This design addresses the failing GraphQL service tests by introducing a mock strategy for the AWS Amplify GraphQL client. The core issue is that services extending `ApiService` call `generateClient()` during construction, which triggers Amplify configuration warnings in the test environment. The solution creates a testable architecture where the GraphQL client can be mocked without modifying the service implementations.

### Key Insight

The existing tests are well-designed - they verify:
1. Input validation (synchronous throws)
2. Observable return types (checking `.subscribe` exists)
3. Property-based invariants across generated inputs

The tests do NOT subscribe to the Observables, so no real GraphQL calls are made. The issue is purely the Amplify initialization warning during service construction.

## Architecture

### Current State (Problem)

```
┌─────────────────────┐     ┌──────────────────────┐
│  TestBed.inject()   │────▶│  OrganizationService │
│                     │     │  extends ApiService  │
└─────────────────────┘     └──────────────────────┘
                                      │
                                      ▼
                            ┌──────────────────────┐
                            │  generateClient()    │
                            │  (Amplify not        │
                            │   configured)        │
                            └──────────────────────┘
                                      │
                                      ▼
                            ⚠️ Warning: Amplify has not
                               been configured
```

### Target State (Solution)

```
┌─────────────────────┐     ┌──────────────────────┐
│  TestBed.inject()   │────▶│  OrganizationService │
│  with providers     │     │  extends ApiService  │
└─────────────────────┘     └──────────────────────┘
         │                            │
         │                            ▼
         │                  ┌──────────────────────┐
         └─────────────────▶│  MockApiService      │
                            │  (no Amplify calls)  │
                            └──────────────────────┘
                                      │
                                      ▼
                            ✅ No warnings, tests pass
```

## Components and Interfaces

### Solution Approach: Spy on Protected Methods

Since the services extend `ApiService` and call protected methods (`executeMutation`, `executeGetQuery`, `executeListQuery`), we can spy on these methods to prevent the actual GraphQL client from being invoked.

```typescript
// Test setup pattern for service tests
beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [OrganizationService],
  });
  service = TestBed.inject(OrganizationService);
  
  // Spy on protected methods to prevent Amplify calls
  // These spies return resolved promises that won't be awaited
  // since tests only check Observable.subscribe exists
  spyOn<any>(service, 'executeMutation').and.returnValue(
    Promise.resolve({ organizationId: 'mock-id' })
  );
  spyOn<any>(service, 'executeGetQuery').and.returnValue(
    Promise.resolve({ organizationId: 'mock-id' })
  );
  spyOn<any>(service, 'executeListQuery').and.returnValue(
    Promise.resolve({ items: [], nextToken: null })
  );
});
```

### Alternative: Configure Amplify in Test Environment

A simpler approach is to configure Amplify with minimal mock configuration in the test setup:

```typescript
// apps/web/src/test.ts or test setup file
import { Amplify } from 'aws-amplify';

// Minimal Amplify configuration for tests
Amplify.configure({
  API: {
    GraphQL: {
      endpoint: 'http://localhost:4000/graphql',
      region: 'us-east-1',
      defaultAuthMode: 'apiKey',
      apiKey: 'mock-api-key'
    }
  }
});
```

### Recommended Solution: Test Module with Mock Providers

Create a reusable test module that provides mock implementations:

```typescript
// apps/web/src/app/core/testing/api-service.testing.ts

import { NgModule } from '@angular/core';
import { Amplify } from 'aws-amplify';

/**
 * Configure Amplify with mock settings for testing.
 * This prevents "Amplify has not been configured" warnings.
 */
export function configureAmplifyForTesting(): void {
  // Only configure if not already configured
  try {
    Amplify.configure({
      API: {
        GraphQL: {
          endpoint: 'http://localhost/graphql',
          region: 'us-east-1',
          defaultAuthMode: 'apiKey',
          apiKey: 'test-api-key'
        }
      }
    });
  } catch {
    // Already configured, ignore
  }
}

/**
 * Call this in test.ts to configure Amplify before any tests run
 */
export function setupTestEnvironment(): void {
  configureAmplifyForTesting();
}
```

### Integration with Karma Test Setup

```typescript
// apps/web/src/test.ts

import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { setupTestEnvironment } from './app/core/testing/api-service.testing';

// Configure Amplify before tests
setupTestEnvironment();

// Initialize Angular testing environment
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting()
);
```

## Data Models

### Mock Response Types

The mock configuration doesn't require new data models. The existing response envelope types from the graphql-service-cleanup spec are used:

```typescript
interface GraphQLResponseEnvelope<T> {
  code: number;
  success: boolean;
  message?: string;
  item?: T;
  items?: T[];
  nextToken?: string;
}
```

### Test Arbitrary Types

Property tests use fast-check arbitraries that match the service input types:

```typescript
// Existing arbitraries in property tests
const organizationIdArb = fc.uuid();
const ownerIdArb = fc.uuid();
const organizationNameArb = fc.string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Observable Return Type Consistency

*For any* service method that returns an Observable and *for any* valid input to that method, the returned value SHALL have a `subscribe` property that is a function, confirming it is a valid Observable.

**Validates: Requirements 1.2, 2.2, 5.1**

### Property 2: Input Validation Error Handling

*For any* service method with required parameters and *for any* invalid input (empty string, undefined, or null), calling the method SHALL throw an Error with a descriptive message indicating which parameter is required.

**Validates: Requirements 2.1, 3.1, 3.2, 3.3, 3.4**

Note: The following acceptance criteria are verified through example-based tests and test execution verification rather than property-based tests:
- 1.1, 1.3, 1.4: Test environment configuration (verified by running tests without warnings)
- 2.3, 2.4: Test execution results (verified by test runner output)
- 4.2, 4.3, 4.4: Test isolation (verified by running tests in CI environment)

## Error Handling

### Test Failure Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Amplify not configured | Mock configuration prevents warning |
| Invalid input to service | Synchronous throw with descriptive error |
| Property test iteration fails | fast-check reports failing example |
| Test timeout | Karma reports timeout, no hanging |

### Warning Suppression

The solution configures Amplify rather than suppressing warnings, ensuring:
1. No hidden issues masked by suppression
2. Clear test output for debugging
3. Consistent behavior across test runs

## Testing Strategy

### Unit Tests

Unit tests verify:
1. Service instantiation succeeds
2. Input validation throws for invalid inputs
3. Methods return Observable types
4. Error messages are descriptive

### Property-Based Tests

Property tests verify:
1. Observable return type for all valid inputs (100 iterations)
2. Input validation for all invalid input patterns
3. Consistent behavior across generated inputs

### Test Configuration

```typescript
// Karma configuration ensures:
// - ChromeHeadless browser for CI
// - Single run mode (no watch)
// - Coverage reporting
// - Timeout handling

// fast-check configuration:
{ numRuns: 100 }  // Minimum iterations per property
```

### Verification Commands

```bash
# Run all service tests
npm test -- --include='**/services/**/*.spec.ts' --no-watch --browsers=ChromeHeadless

# Run specific service tests
npm test -- --include='**/organization.service*.spec.ts' --no-watch --browsers=ChromeHeadless

# Run with verbose output
npm test -- --include='**/services/**/*.spec.ts' --no-watch --browsers=ChromeHeadless --reporters=progress,kjhtml
```

## Implementation Notes

### Files to Modify

1. `apps/web/src/test.ts` - Add Amplify configuration
2. `apps/web/src/app/core/testing/api-service.testing.ts` - Create test utilities (new file)

### Files NOT to Modify

The existing test files are well-designed and should NOT be modified:
- `organization.service.spec.ts`
- `organization.service.property.spec.ts`
- `application.service.spec.ts`
- `application.service.property.spec.ts`
- `api.service.spec.ts`
- `api.service.property.spec.ts`
- `user.service.spec.ts`

### Migration Path

1. Create `api-service.testing.ts` with mock configuration
2. Update `test.ts` to call setup function
3. Run tests to verify warnings are eliminated
4. Verify all 222 service tests pass
