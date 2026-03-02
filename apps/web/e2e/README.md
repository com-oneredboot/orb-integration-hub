# E2E Testing with Playwright

Comprehensive end-to-end testing setup for orb-integration-hub using Playwright.

## Overview

This E2E testing framework provides a complete local development workflow for running Playwright tests against the Angular frontend and AWS backend services. Tests verify complete user workflows from authentication through resource management.

### Technology Stack

- **Test Framework**: Playwright
- **Language**: TypeScript
- **Frontend**: Angular (localhost:4200)
- **Backend**: AWS AppSync, Cognito, DynamoDB (deployed dev environment)
- **Authentication**: Cognito user pools
- **Test Data**: GraphQL mutations with automatic cleanup

### Test Coverage

- Authentication flows (signup, signin, signout, account cleanup)
- User profile management
- Organization CRUD operations
- Application CRUD operations
- Group CRUD operations
- Role-based access control
- Multi-step workflows

## Directory Structure

```
e2e/
├── fixtures/                 # Test data creation/cleanup
│   └── index.ts             # Resource fixtures (organizations, apps, groups)
├── page-objects/            # Page object models
│   ├── organizations.page.ts
│   ├── applications.page.ts
│   └── *.page.ts            # Generated page objects
├── tests/                    # Test specifications
│   ├── auth.spec.ts         # Self-contained auth lifecycle tests
│   ├── organizations.spec.ts
│   ├── applications.spec.ts
│   └── *.spec.ts            # Generated test specs
├── utils/                    # Utility functions
│   └── index.ts             # Helpers (waitForGraphQL, screenshots, etc.)
└── README.md                 # This file
```

## Setup Instructions

### Prerequisites

1. **Node.js and npm** — Already installed for Angular development
2. **AWS SSO** — Configured with `sso-orb-dev` profile
3. **Active AWS Session** — Run `aws sso login --profile sso-orb-dev`

### First-Time Setup

1. **Install Playwright browsers**:
   ```bash
   cd apps/web
   npm run e2e:install
   ```

2. **Verify AWS credentials are active**:
   ```bash
   aws --profile sso-orb-dev sts get-caller-identity
   ```

That's it. Auth tests are self-contained and don't require any additional configuration.

## Authentication Tests

### Self-Contained Approach

The auth test suite (`e2e/tests/auth.spec.ts`) is fully self-contained. It creates its own test user dynamically and cleans up after itself — no `.env.test` file, pre-existing test users, or Secrets Manager retrieval needed.

**How it works:**

1. **Signup** — Creates a new Cognito user with a unique timestamped email (`e2e-test-{timestamp}@test.orb-integration-hub.com`) and a generated password. Uses `AdminConfirmSignUp` via AWS SDK to bypass email verification.
2. **Signin** — Signs in with the credentials created during signup, verifies navigation to the dashboard.
3. **Signout** — Signs out and verifies redirect to `/authenticate` and that protected routes are inaccessible.
4. **Cleanup** — Deletes the test user from both Cognito and DynamoDB in an `afterAll` hook (best-effort — errors are logged but don't fail the suite).

Tests run serially using `test.describe.serial` since each test depends on the previous test's state. If signup fails, subsequent tests are skipped.

### Running Auth Tests

```bash
# Prerequisite: active AWS SSO session
aws sso login --profile sso-orb-dev

# Ensure the local frontend is running at http://localhost:4200
npm start

# Run auth tests
npx playwright test auth.spec.ts
```

### Auth Test Prerequisites

| Prerequisite | Why |
|--------------|-----|
| Active AWS SSO session (`sso-orb-dev`) | AWS SDK calls for user confirmation and cleanup |
| Local frontend running at `localhost:4200` | Tests interact with the Angular app via Playwright |

No `.env.test` file is needed for auth tests.

## Running Tests

### Quick Start

```bash
# Run all tests (headless)
npm run e2e

# Open Playwright UI (recommended for development)
npm run e2e:ui

# Run with visible browser
npm run e2e:headed

# Debug mode (step through tests)
npm run e2e:debug
```

### Available npm Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `e2e` | `playwright test` | Run all tests headless |
| `e2e:ui` | `playwright test --ui` | Open Playwright UI |
| `e2e:headed` | `playwright test --headed` | Run with visible browser |
| `e2e:debug` | `playwright test --debug` | Debug mode with inspector |
| `e2e:report` | `playwright show-report` | Open HTML report |
| `e2e:codegen` | `playwright codegen http://localhost:4200` | Generate test code |
| `e2e:install` | `playwright install` | Install browser binaries |

### Running Specific Tests

```bash
# Run a single test file
npm run e2e -- organizations.spec.ts

# Run tests matching a pattern
npm run e2e -- --grep "create organization"

# Run tests in a specific browser
npm run e2e -- --project=chromium
```

## Test User Management

### Auth Tests — Dynamic Users

Auth tests create their own user dynamically each run:
- A unique email is generated with a timestamp prefix (`e2e-test-{timestamp}@test.orb-integration-hub.com`)
- A strong random password is generated meeting Cognito policy requirements
- The user is auto-confirmed via `AdminConfirmSignUp` (bypasses email verification)
- After all tests complete, the user is deleted from Cognito and DynamoDB

No manual user management is needed for auth tests.

### Other Tests — Fixtures

Other test types (organizations, applications, groups) may use fixtures from `e2e/fixtures/index.ts` to create and clean up test resources via GraphQL mutations. These fixtures use the `e2e-test-` prefix for all resource names.

## Test Data Management

### Naming Convention

All test resources use the `e2e-test-` prefix:
- Organizations: `e2e-test-org-1234567890`
- Applications: `e2e-test-app-1234567890`
- Groups: `e2e-test-group-1234567890`
- Auth test users: `e2e-test-1234567890@test.orb-integration-hub.com`

This prefix:
- Distinguishes test data from production data
- Enables automated cleanup
- Prevents accidental deletion of real resources

### Cleanup Strategy

Each test creates and cleans up its own data:

```typescript
import { createTestOrganization, cleanupTestData, TestResource } from '../fixtures';

test('create organization', async ({ page }) => {
  const resources: TestResource[] = [];
  
  try {
    // Create test data
    const org = await createTestOrganization({
      name: 'test-org',
      description: 'Test organization'
    });
    resources.push(org);
    
    // Run test assertions
    // ...
  } finally {
    // Cleanup runs even if test fails
    await cleanupTestData(resources);
  }
});
```

### Manual Cleanup

If automated cleanup fails, manually delete resources:

```bash
# List test resources
aws --profile sso-orb-dev dynamodb scan \
  --table-name orb-integration-hub-dev-organizations \
  --filter-expression "begins_with(#name, :prefix)" \
  --expression-attribute-names '{"#name":"name"}' \
  --expression-attribute-values '{":prefix":{"S":"e2e-test-"}}'

# Delete specific resource via GraphQL
# Use the frontend or write a cleanup script
```

## Debugging

### Playwright UI Mode (Recommended)

```bash
npm run e2e:ui
```

Features:
- Visual test runner
- Time-travel debugging
- Watch mode (re-run on file changes)
- Inspect DOM at any point
- View network requests
- See console logs

### Debug Mode

```bash
npm run e2e:debug
```

Features:
- Playwright Inspector opens
- Step through test line-by-line
- Pause and resume execution
- Inspect page state
- Execute commands in console

### HTML Reports

After test run, view detailed HTML report:

```bash
npm run e2e:report
```

Report includes:
- Test results summary
- Screenshots on failure
- Videos on failure
- Traces on retry
- Network activity
- Console logs

### Artifacts

Test artifacts are saved in `test-results/`:
- **Screenshots**: `test-results/screenshots/` (on failure)
- **Videos**: `test-results/` (on failure)
- **Traces**: `test-results/` (on retry)

### Taking Manual Screenshots

```typescript
import { takeTimestampedScreenshot } from '../utils';

test('my test', async ({ page }) => {
  await takeTimestampedScreenshot(page, 'before-action');
  // ... perform action
  await takeTimestampedScreenshot(page, 'after-action');
});
```

## Troubleshooting

### Auth Test Issues

**Problem**: Signup test fails with timeout

**Solutions**:
1. Verify the local frontend is running at `http://localhost:4200`
2. Verify AWS SSO session is active:
   ```bash
   aws --profile sso-orb-dev sts get-caller-identity
   ```
3. Check Playwright test output for specific error messages — the `beforeAll` hook validates AWS credentials and will log a clear message if they're expired

**Problem**: Cleanup fails (test user not deleted)

**Solutions**:
1. The `afterAll` hook logs cleanup errors — check test output
2. Manually delete the user if needed:
   ```bash
   aws --profile sso-orb-dev cognito-idp admin-delete-user \
     --user-pool-id us-east-1_8ch8unBaX \
     --username "e2e-test-<timestamp>@test.orb-integration-hub.com"
   ```

### Timeout Issues

**Problem**: Tests timeout waiting for elements

**Solutions**:
1. Increase timeout in `playwright.config.ts`:
   ```typescript
   timeout: 90000, // 90 seconds
   ```

2. Check if frontend is running:
   ```bash
   curl http://localhost:4200
   ```

### Cleanup Failures

**Problem**: Test data cleanup fails

**Solutions**:
1. Check AWS credentials are active:
   ```bash
   aws --profile sso-orb-dev sts get-caller-identity
   ```

2. Manually delete resources via AWS Console or CLI

3. Review cleanup error messages in test output

### AWS Credential Errors

**Problem**: "AWS credentials are invalid or expired"

**Solutions**:
1. Re-authenticate with AWS SSO:
   ```bash
   aws sso login --profile sso-orb-dev
   ```

2. Verify SSO session is active:
   ```bash
   aws --profile sso-orb-dev sts get-caller-identity
   ```

## Writing New Tests

### Using Page Objects

```typescript
import { test, expect } from '@playwright/test';
import { OrganizationsPage } from '../page-objects/organizations.page';
import { createTestOrganization, cleanupTestData, TestResource } from '../fixtures';

test.describe('Organizations', () => {
  let page: OrganizationsPage;
  const resources: TestResource[] = [];

  test.beforeEach(async ({ page: playwrightPage }) => {
    page = new OrganizationsPage(playwrightPage);
    await page.goto();
  });

  test.afterEach(async () => {
    await cleanupTestData(resources);
    resources.length = 0;
  });

  test('create organization', async () => {
    const org = await page.createOrganization({
      name: 'Test Org',
      description: 'Test description'
    });
    resources.push(org);

    await expect(page.organizationName).toHaveText('Test Org');
  });
});
```

### Best Practices

1. **Use Page Objects** — Encapsulate page interactions for non-auth tests
2. **Clean Up Test Data** — Always use `afterEach` or `afterAll` hooks
3. **Use Fixtures** — Create test data via fixtures module
4. **Wait for GraphQL** — Use `waitForGraphQL()` for mutations
5. **Descriptive Names** — Use clear test and variable names
6. **Isolate Tests** — Each test should be independent (except serial auth tests)
7. **Handle Errors** — Use try/finally for cleanup
8. **Use Selectors** — Prefer `data-testid` attributes or stable `id` attributes

### Example Test Structure

```typescript
test('feature description', async ({ page }) => {
  const resources: TestResource[] = [];
  
  try {
    // Arrange: Create test data
    const org = await createTestOrganization({ name: 'test' });
    resources.push(org);
    
    // Act: Perform actions
    await page.goto(`/organizations/${org.id}`);
    await page.click('[data-testid="edit-button"]');
    await page.fill('[data-testid="name-input"]', 'Updated Name');
    await page.click('[data-testid="save-button"]');
    
    // Assert: Verify results
    await expect(page.locator('[data-testid="org-name"]')).toHaveText('Updated Name');
  } finally {
    // Cleanup: Always runs
    await cleanupTestData(resources);
  }
});
```

## CI/CD Integration

### GitHub Actions

Tests run automatically in CI/CD pipeline:

```yaml
- name: Run E2E Tests
  run: |
    cd apps/web
    npm run e2e
  env:
    AWS_PROFILE: sso-orb-dev
```

### CI-Specific Configuration

Playwright config automatically adjusts for CI:
- **Workers**: 1 (sequential execution)
- **Retries**: 2 (retry flaky tests)
- **Server**: Doesn't reuse existing server
- **Artifacts**: Always captured on failure

## Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [orb-templates Testing Standards](../../repositories/orb-templates/docs/testing-standards/)
