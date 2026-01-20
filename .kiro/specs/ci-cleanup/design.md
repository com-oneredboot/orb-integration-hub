# Design Document: CI Cleanup and Test Integration

## Overview

This design document outlines the approach for removing incomplete test infrastructure from orb-integration-hub and integrating unit tests into the deployment workflows, following the established pattern in orb-geo-fence.

The current state has a `comprehensive-testing.yml` workflow that runs on every PR/push but fails due to missing dependencies and incomplete implementations. The target state moves to deployment-time testing where unit tests run as part of the manual deployment workflows, with an option to skip for emergencies.

## Architecture

### Current State

```
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions Workflows                      │
├─────────────────────────────────────────────────────────────────┤
│  comprehensive-testing.yml (BROKEN)                              │
│  ├── Unit Tests (frontend/backend)                               │
│  ├── Integration Tests (missing jest)                            │
│  ├── E2E Tests (missing env config)                              │
│  ├── Performance Tests (missing puppeteer)                       │
│  └── Security Tests                                              │
├─────────────────────────────────────────────────────────────────┤
│  deploy-infrastructure.yml ✓                                     │
│  deploy-lambda-layers.yml ✓                                      │
│  deploy-website.yml ✓                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Target State (Following orb-geo-fence Pattern)

```
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions Workflows                      │
├─────────────────────────────────────────────────────────────────┤
│  deploy-infrastructure.yml                                       │
│  ├── [NEW] Run backend unit tests (unless skip_tests)            │
│  ├── [NEW] Run code quality checks (unless skip_tests)           │
│  ├── CDK Synth                                                   │
│  ├── CDK Diff                                                    │
│  └── CDK Deploy                                                  │
├─────────────────────────────────────────────────────────────────┤
│  deploy-lambda-layers.yml (unchanged)                            │
├─────────────────────────────────────────────────────────────────┤
│  deploy-website.yml                                              │
│  ├── [NEW] skip_tests input parameter                            │
│  ├── [NEW] Run frontend unit tests (unless skip_tests)           │
│  ├── [NEW] Run linting (unless skip_tests)                       │
│  ├── Build Angular project                                       │
│  ├── Deploy to S3                                                │
│  └── Invalidate CloudFront                                       │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Files to Delete

| Path | Type | Reason |
|------|------|--------|
| `.github/workflows/comprehensive-testing.yml` | Workflow | Broken, replaced by deployment-time testing |
| `apps/web/integration-tests/` | Directory | Missing jest dependency, incomplete |
| `apps/web/cypress/` | Directory | Requires env config unavailable in CI |
| `apps/web/cypress.config.ts` | File | Cypress configuration |
| `apps/web/performance-tests/` | Directory | Missing puppeteer, broken configs |

### Files to Modify

| Path | Changes |
|------|---------|
| `.github/workflows/deploy-infrastructure.yml` | Add backend tests step |
| `.github/workflows/deploy-website.yml` | Add skip_tests input, frontend tests step |
| `apps/web/package.json` | Remove unused scripts and dependencies |
| `CHANGELOG.md` | Document the changes |

### Package.json Changes

**Scripts to Remove:**
```json
{
  "test:e2e": "cypress run",
  "test:e2e:open": "cypress open",
  "test:e2e:headless": "cypress run --headless",
  "test:coverage": "ng test --code-coverage && cypress run",
  "perf:load": "artillery run ...",
  "perf:stress": "artillery run ...",
  "perf:lighthouse": "lighthouse ...",
  "perf:lighthouse:mobile": "lighthouse ...",
  "perf:memory": "node performance-tests/...",
  "perf:mobile": "node performance-tests/...",
  "perf:network": "node performance-tests/...",
  "perf:all": "node performance-tests/...",
  "perf:baseline": "npm run perf:all && ...",
  "bundle:analyze": "webpack-bundle-analyzer ...",
  "test:integration": "jest integration-tests/...",
  "test:integration:watch": "jest integration-tests/...",
  "test:integration:cognito": "jest integration-tests/...",
  "test:integration:sms": "jest integration-tests/...",
  "test:integration:graphql": "jest integration-tests/...",
  "test:contracts": "jest integration-tests/...",
  "test:contracts:publish": "npm run test:contracts && ...",
  "test:all": "npm run test && npm run test:e2e && ..."
}
```

**Dependencies to Remove:**
```json
{
  "devDependencies": {
    "artillery": "^2.0.21",
    "cypress": "^14.5.0",
    "lighthouse": "^12.6.1",
    "webpack-bundle-analyzer": "^4.10.2"
  }
}
```

**Scripts to Keep:**
```json
{
  "test": "ng test",
  "lint": "ng lint"
}
```

## Data Models

Not applicable - this is a CI/CD infrastructure change with no data model changes.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*



Based on the prework analysis, all acceptance criteria for this feature are discrete verification checks (file existence, YAML structure, JSON parsing) rather than universal properties that apply across a range of inputs. This is a CI/CD infrastructure cleanup task, not a feature with algorithmic logic.

**No property-based tests are applicable for this feature.** All verification can be done through:
- File/directory existence checks
- YAML/JSON structure validation
- Manual workflow execution testing

## Error Handling

| Scenario | Handling |
|----------|----------|
| Unit tests fail during deployment | Deployment stops, error reported, user must fix tests or use skip_tests |
| skip_tests used | Warning displayed, deployment proceeds without test validation |
| Deleted files referenced elsewhere | Pre-cleanup grep search to identify any references |

## Testing Strategy

### Verification Approach

Since this is an infrastructure cleanup task, testing is verification-based rather than property-based:

1. **Pre-cleanup verification**: Confirm all files to be deleted exist
2. **Post-cleanup verification**: Confirm all files are deleted and package.json is updated
3. **Workflow validation**: Run `yamllint` on modified workflow files
4. **Deployment smoke test**: Manually trigger deploy-website.yml with `action: diff` to verify workflow syntax

### Unit Tests (Preserved)

The existing unit tests will continue to work:
- Frontend: `npm test` (Angular/Karma/Jasmine)
- Backend: `pipenv run pytest` (Python/pytest)

These tests will now run as part of the deployment workflows rather than a separate CI pipeline.

### Manual Verification Checklist

After implementation:
- [ ] `comprehensive-testing.yml` deleted
- [ ] `apps/web/integration-tests/` deleted
- [ ] `apps/web/cypress/` deleted
- [ ] `apps/web/cypress.config.ts` deleted
- [ ] `apps/web/performance-tests/` deleted
- [ ] `package.json` scripts cleaned up
- [ ] `package.json` devDependencies cleaned up
- [ ] `deploy-infrastructure.yml` has backend test step
- [ ] `deploy-website.yml` has frontend test step and skip_tests input
- [ ] `CHANGELOG.md` updated
