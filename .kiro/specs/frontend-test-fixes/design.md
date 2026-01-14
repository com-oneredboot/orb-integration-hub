# Design Document: Frontend Test Fixes

## Overview

This design addresses fixing frontend test failures caused by orb-schema-generator v0.13.5 model regeneration. The changes include Date type conversions, enum key updates, model property changes, and migrating Node-dependent tests.

## Architecture

The fix involves updating test files across multiple categories:
1. Component spec files (profile, dashboard, auth-flow)
2. Service spec files (cognito, user, organization)
3. Test data factories (auth, organization)
4. Property test files (branding, design-tokens, heading-hierarchy)

## Components and Interfaces

### Test Data Factory Updates

```typescript
// Before (incorrect)
const mockUser: IUsers = {
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: UserStatus.ACTIVE
};

// After (correct)
const mockUser: IUsers = {
  createdAt: new Date(),
  updatedAt: new Date(),
  status: UserStatus.Active
};
```

### Enum Reference Updates

```typescript
// Before (incorrect)
OrganizationUserRole.ADMINISTRATOR
OrganizationUserRole.VIEWER
UserStatus.ACTIVE

// After (correct)
OrganizationUserRole.Administrator
OrganizationUserRole.Viewer
UserStatus.Active
```

### Import Path Updates

```typescript
// Before (incorrect)
import { UserStatus } from '../models/UserStatusEnum';
import { UserGroup } from '../models/UserGroupEnum';

// After (correct)
import { UserStatus } from '../enums/UserStatusEnum';
import { UserGroup } from '../enums/UserGroupEnum';
```

### Applications Model Updates

```typescript
// Before (incorrect - missing required fields)
const app: Applications = {
  applicationId: 'app-1',
  organizationId: 'org-1',
  name: 'Test App',
  description: 'Test description', // REMOVED
  status: ApplicationStatus.Active,
  createdAt: new Date(),
  updatedAt: new Date()
};

// After (correct - all required fields)
const app: Applications = {
  applicationId: 'app-1',
  organizationId: 'org-1',
  name: 'Test App',
  ownerId: 'owner-1',        // ADDED
  apiKey: 'api-key-123',     // ADDED
  environments: ['dev'],      // ADDED
  status: ApplicationStatus.Active,
  createdAt: new Date(),
  updatedAt: new Date()
};
```

## Data Models

No new data models. Existing models from orb-schema-generator are used as-is.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

### Property 1: All Tests Compile

*For any* test file in the frontend test suite, the TypeScript compiler SHALL produce no errors.

**Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4**

### Property 2: All Tests Pass

*For any* test execution of `npm test`, the test runner SHALL report 0 failures and 0 errors.

**Validates: Requirements 7.1, 7.2**

### Property 3: Test Data Factory Validity

*For any* mock data created by a test data factory, the data SHALL conform to the corresponding TypeScript interface.

**Validates: Requirements 6.1, 6.2, 6.3**

## Error Handling

- If a test file cannot be fixed due to missing service methods, the test should be updated to use available methods
- If a property test cannot run in browser, it should be migrated to a Node-based runner or converted to a standard unit test

## Testing Strategy

### Unit Tests
- Each fixed test file should pass individually
- Run `npm test` to verify all tests pass

### Property Tests
- Property tests using Node.js modules will be converted to standard unit tests that can run in the browser
- Alternative: Create a separate Jest configuration for Node-based property tests

### Verification
- Final verification: `npm test -- --watch=false --browsers=ChromeHeadless` should report 0 failures
