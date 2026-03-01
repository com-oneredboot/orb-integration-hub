# Design Document: Angular 21 Upgrade

## Overview

This design document outlines the technical approach for upgrading the orb-integration-hub Angular frontend from version 19.2.18 to Angular 21. The upgrade will be performed using Angular's official migration path, leveraging automated schematics where possible and manually resolving breaking changes where necessary.

### Current State

- Angular version: 19.2.18
- TypeScript version: 5.6.3
- NgRx version: 19.2.1
- Build system: Angular CLI with esbuild
- Node.js requirement: 18.19+ or 20.11+ (current Angular 19 requirement)

### Target State

- Angular version: 21.x.x (latest stable)
- TypeScript version: 5.7+ (Angular 21 requirement)
- NgRx version: 21.x.x (matching Angular version)
- Build system: Angular CLI with esbuild (maintained)
- Node.js requirement: 20.11+ or 22.0+ (Angular 21 requirement)

### Upgrade Strategy

The upgrade will follow Angular's recommended incremental approach:
1. Angular 19 → Angular 20 (intermediate step)
2. Angular 20 → Angular 21 (final step)

This two-step approach minimizes risk by allowing breaking changes to be addressed incrementally rather than all at once.

## Architecture

### Migration Phases

```
Phase 1: Pre-Migration Preparation
├── Verify all tests pass
├── Document current bundle sizes
├── Create backup branch
└── Review Angular 20 and 21 changelogs

Phase 2: Angular 20 Migration
├── Update to Angular 20 using ng update
├── Run automated migration schematics
├── Resolve breaking changes
├── Update dependencies
└── Verify tests and functionality

Phase 3: Angular 21 Migration
├── Update to Angular 21 using ng update
├── Run automated migration schematics
├── Resolve breaking changes
├── Update dependencies
└── Verify tests and functionality

Phase 4: Post-Migration Verification
├── Run full test suite
├── Verify bundle sizes
├── Test all critical workflows
└── Update documentation
```

### Dependency Update Strategy

Dependencies will be updated in this order to minimize conflicts:

1. **Core Angular packages** (all updated together)
   - @angular/core
   - @angular/common
   - @angular/router
   - @angular/forms
   - @angular/platform-browser
   - @angular/platform-browser-dynamic
   - @angular/animations
   - @angular/cdk
   - @angular/material

2. **Angular CLI and build tools**
   - @angular/cli
   - @angular-devkit/build-angular
   - @angular/compiler-cli

3. **TypeScript** (must meet Angular 21 requirements)

4. **NgRx packages** (all updated together)
   - @ngrx/store
   - @ngrx/effects
   - @ngrx/entity
   - @ngrx/store-devtools

5. **Third-party Angular integrations**
   - @fortawesome/angular-fontawesome
   - angular-eslint

6. **Testing dependencies**
   - karma
   - jasmine-core
   - @types/jasmine

7. **Other dependencies** (aws-amplify, rxjs, zone.js)

## Components and Interfaces

### Angular CLI Migration Tool

The primary tool for the upgrade is the Angular CLI's `ng update` command:

```bash
# Update to Angular 20
ng update @angular/core@20 @angular/cli@20

# Update to Angular 21
ng update @angular/core@21 @angular/cli@21
```

The `ng update` command:
- Analyzes the current project
- Updates package.json dependencies
- Runs migration schematics to transform code
- Reports breaking changes that require manual intervention

### Migration Schematics

Angular provides automated migration schematics that handle common breaking changes:

- **API Renames**: Automatically updates renamed APIs
- **Import Path Changes**: Updates import statements
- **Deprecated API Removal**: Replaces deprecated APIs with new equivalents
- **Configuration Updates**: Updates angular.json and tsconfig.json

### Manual Migration Tasks

Some changes require manual intervention:

1. **Breaking API Changes**: Where schematics cannot automatically migrate
2. **Custom Code Patterns**: Application-specific code that uses deprecated patterns
3. **Third-Party Library Updates**: Ensuring compatibility with updated libraries
4. **Test Updates**: Updating tests that rely on framework internals

## Data Models

### Package Version Matrix

The following version constraints must be satisfied:

```typescript
interface VersionMatrix {
  angular: {
    version: '21.x.x',
    requires: {
      typescript: '>=5.7.0',
      node: '>=20.11.0 || >=22.0.0',
      rxjs: '^7.8.0',
      zoneJs: '^0.15.0'
    }
  },
  ngrx: {
    version: '21.x.x',
    requires: {
      angular: '21.x.x'
    }
  },
  angularMaterial: {
    version: '21.x.x',
    requires: {
      angular: '21.x.x',
      cdk: '21.x.x'
    }
  }
}
```

### Breaking Changes Tracking

```typescript
interface BreakingChange {
  id: string;
  description: string;
  affectedFiles: string[];
  migrationStrategy: 'automatic' | 'manual';
  status: 'pending' | 'in-progress' | 'resolved';
  resolution?: string;
}
```

### Test Results Baseline

```typescript
interface TestBaseline {
  totalTests: number;
  passingTests: number;
  failingTests: number;
  coverage: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Angular Package Version Consistency

*For all* packages in package.json with names matching `@angular/*`, the version SHALL be 21.x.x

**Validates: Requirements 1.2, 1.4**

### Property 2: Build Success Preservation

*For any* valid build command (development or production), if the build succeeded before the upgrade, it SHALL succeed after the upgrade

**Validates: Requirements 1.3, 2.3, 3.5, 5.3, 8.2, 13.4**

### Property 3: Code Quality Standards Maintained

*For all* source files, if linting passed before the upgrade, linting SHALL pass after the upgrade with zero errors

**Validates: Requirements 2.4, 8.4, 13.2**

### Property 4: Functional Regression Prevention

*For all* existing features and user workflows, if they functioned correctly before the upgrade, they SHALL function correctly after the upgrade

**Validates: Requirements 2.5, 4.5, 7.4, 7.5, 9.5, 13.5**

### Property 5: Ecosystem Package Compatibility

*For all* Angular ecosystem packages (NgRx, Material, Font Awesome, AWS Amplify), the installed versions SHALL be compatible with Angular 21

**Validates: Requirements 3.3, 4.1, 4.2, 4.3, 4.4, 7.1, 7.2, 7.3**

### Property 6: Dependency Resolution Success

*For any* execution of `npm install`, if dependency resolution succeeded before the upgrade, it SHALL succeed after the upgrade without conflicts

**Validates: Requirements 3.4, 13.1**

### Property 7: Development Workflow Preservation

*For all* development commands (serve, build, test, lint), if they executed successfully before the upgrade, they SHALL execute successfully after the upgrade

**Validates: Requirements 5.4, 8.1, 8.2, 8.3, 8.4**

### Property 8: Test Suite Integrity

*For all* unit tests, if they passed before the upgrade, they SHALL pass after the upgrade

**Validates: Requirements 6.4, 8.3, 13.3**

### Property 9: Test Coverage Maintenance

*For any* code coverage metric (statements, branches, functions, lines), the coverage percentage after the upgrade SHALL be greater than or equal to the coverage percentage before the upgrade

**Validates: Requirements 6.5**

## Error Handling

### Build Errors

**Scenario**: TypeScript compilation fails after upgrade

**Handling Strategy**:
1. Review error messages for deprecated API usage
2. Check Angular migration guide for breaking changes
3. Update code to use new APIs
4. Re-run build to verify fix

**Example**:
```typescript
// Before (deprecated in Angular 21)
import { ComponentFactoryResolver } from '@angular/core';

// After (new approach)
import { ViewContainerRef } from '@angular/core';
// Use ViewContainerRef.createComponent() directly
```

### Dependency Conflicts

**Scenario**: npm install fails with peer dependency conflicts

**Handling Strategy**:
1. Identify conflicting packages
2. Check if newer versions are available
3. Update to compatible versions
4. Use `npm install --legacy-peer-deps` as last resort (document why)

**Example**:
```bash
# Error: @fortawesome/angular-fontawesome@1.0.0 requires @angular/core@^19.0.0
# Solution: Update to @fortawesome/angular-fontawesome@2.0.0
npm install @fortawesome/angular-fontawesome@^2.0.0
```

### Test Failures

**Scenario**: Tests fail after upgrade due to framework changes

**Handling Strategy**:
1. Analyze test failure messages
2. Determine if failure is due to:
   - Test implementation using deprecated APIs
   - Actual regression in application code
   - Change in framework test utilities
3. Update tests to use new patterns
4. Verify application behavior is unchanged

**Example**:
```typescript
// Before (deprecated TestBed API)
TestBed.get(MyService);

// After (new API)
TestBed.inject(MyService);
```

### Migration Schematic Failures

**Scenario**: Automated migration schematics fail or produce incorrect code

**Handling Strategy**:
1. Review schematic error messages
2. Manually apply the intended transformation
3. Document the manual change for future reference
4. Report issue to Angular team if it's a schematic bug

### Runtime Errors

**Scenario**: Application runs but throws errors at runtime

**Handling Strategy**:
1. Check browser console for error messages
2. Identify the failing component or service
3. Review Angular 21 changelog for related breaking changes
4. Update code to match new framework behavior
5. Add regression test to prevent future issues

## Testing Strategy

### Dual Testing Approach

This upgrade will use both unit tests and property-based tests to ensure correctness:

**Unit Tests**: Verify specific examples, edge cases, and error conditions
- Specific version checks (Angular 21.x.x installed)
- Build command success
- Lint command success
- Individual feature functionality

**Property Tests**: Verify universal properties across all inputs
- All Angular packages at consistent version
- All tests that passed before still pass
- All features that worked before still work
- Coverage maintained or improved

### Pre-Upgrade Baseline

Before starting the upgrade, establish a baseline:

```bash
# Capture current test results
npm test -- --code-coverage > baseline-tests.txt

# Capture current bundle sizes
npm run build > baseline-build.txt

# Capture current dependency tree
npm list > baseline-deps.txt
```

### Post-Upgrade Verification

After completing the upgrade, verify against baseline:

```bash
# Verify all tests still pass
npm test -- --code-coverage

# Compare: Should have same or more passing tests
# Compare: Coverage should be >= baseline

# Verify bundle sizes
npm run build

# Compare: Bundle sizes should be similar (within 10%)

# Verify dependency tree
npm list

# Compare: All dependencies resolved without conflicts
```

### Property-Based Testing Configuration

For property-based tests, use fast-check library (already in devDependencies):

```typescript
import fc from 'fast-check';

describe('Angular 21 Upgrade Properties', () => {
  it('Property 1: All Angular packages at version 21.x.x', () => {
    // Feature: angular-21-upgrade, Property 1: All Angular packages at version 21.x.x
    const packageJson = require('../../package.json');
    const angularPackages = Object.keys(packageJson.dependencies)
      .filter(pkg => pkg.startsWith('@angular/'));
    
    angularPackages.forEach(pkg => {
      const version = packageJson.dependencies[pkg];
      expect(version).toMatch(/^[\^~]?21\./);
    });
  });

  it('Property 4: Functional regression prevention', () => {
    // Feature: angular-21-upgrade, Property 4: Functional regression prevention
    // This is verified by the entire test suite passing
    // Individual feature tests validate this property
  });

  it('Property 9: Test coverage maintenance', () => {
    // Feature: angular-21-upgrade, Property 9: Test coverage maintenance
    // This test compares coverage metrics before and after upgrade
    // Run with: npm test -- --code-coverage
    // Coverage thresholds enforced in karma.conf.js
  });
});
```

**Configuration**: Each property test runs with minimum 100 iterations (where applicable)

### Critical Test Scenarios

The following scenarios MUST be tested manually after the upgrade:

1. **Authentication Flow**
   - User can log in with valid credentials
   - User can log out
   - Protected routes redirect to login
   - JWT tokens are properly handled

2. **User Dashboard**
   - Dashboard loads without errors
   - User data displays correctly
   - Navigation works

3. **Customer Features**
   - Organizations list loads
   - Organization detail page works
   - Create/edit/delete operations function
   - Applications list loads
   - Application detail page works
   - Groups list loads
   - Group detail page works

4. **GraphQL Integration**
   - Queries execute successfully
   - Mutations execute successfully
   - Error handling works
   - Loading states display correctly

5. **State Management**
   - NgRx store updates correctly
   - Effects trigger as expected
   - Selectors return correct data
   - DevTools work

### Automated Test Requirements

All existing unit tests must pass:
- Component tests
- Service tests
- Store tests (actions, reducers, selectors, effects)
- Guard tests
- Pipe tests

### Bundle Size Verification

Bundle sizes must remain within acceptable limits:

```json
{
  "budgets": [
    {
      "type": "initial",
      "maximumWarning": "1.25mb",
      "maximumError": "2mb"
    },
    {
      "type": "anyComponentStyle",
      "maximumWarning": "25kb",
      "maximumError": "35kb"
    }
  ]
}
```

If bundle sizes increase significantly (>10%), investigate:
- New dependencies added by Angular 21
- Changes in tree-shaking effectiveness
- Opportunities for lazy loading

## Implementation Checklist

### Phase 1: Pre-Migration Preparation

- [ ] Create feature branch: `feat/angular-21-upgrade`
- [ ] Run full test suite and capture baseline
- [ ] Document current bundle sizes
- [ ] Review Angular 20 changelog
- [ ] Review Angular 21 changelog
- [ ] Identify potential breaking changes
- [ ] Verify Node.js version meets requirements (20.11+ or 22.0+)
- [ ] Verify all current tests pass

### Phase 2: Angular 20 Migration

- [ ] Run `ng update @angular/core@20 @angular/cli@20`
- [ ] Review and apply migration schematics
- [ ] Update TypeScript if required
- [ ] Update NgRx to version 20
- [ ] Update Angular Material to version 20
- [ ] Resolve any breaking changes
- [ ] Run `npm install` and resolve conflicts
- [ ] Run `npm run build` and fix compilation errors
- [ ] Run `npm test` and fix failing tests
- [ ] Run `npm run lint` and fix linting errors
- [ ] Manually test critical workflows
- [ ] Commit changes: `feat: upgrade to Angular 20 #issue`

### Phase 3: Angular 21 Migration

- [ ] Run `ng update @angular/core@21 @angular/cli@21`
- [ ] Review and apply migration schematics
- [ ] Update TypeScript to 5.7+ if required
- [ ] Update NgRx to version 21
- [ ] Update Angular Material to version 21
- [ ] Update @fortawesome/angular-fontawesome to compatible version
- [ ] Update aws-amplify to compatible version
- [ ] Resolve any breaking changes
- [ ] Run `npm install` and resolve conflicts
- [ ] Run `npm run build` and fix compilation errors
- [ ] Run `npm test` and fix failing tests
- [ ] Run `npm run lint` and fix linting errors
- [ ] Manually test critical workflows
- [ ] Commit changes: `feat: upgrade to Angular 21 #issue`

### Phase 4: Post-Migration Verification

- [ ] Run full test suite - verify all tests pass
- [ ] Compare test coverage to baseline - verify maintained or improved
- [ ] Run production build - verify bundle sizes within limits
- [ ] Test authentication flow manually
- [ ] Test user dashboard manually
- [ ] Test organizations feature manually
- [ ] Test applications feature manually
- [ ] Test groups feature manually
- [ ] Test GraphQL queries and mutations
- [ ] Verify NgRx DevTools work
- [ ] Verify hot module replacement works
- [ ] Update README.md with Angular 21 version
- [ ] Update CHANGELOG.md with upgrade details
- [ ] Bump version in package.json (minor version bump)
- [ ] Create pull request with detailed description
- [ ] Request code review

## Documentation Updates

### README.md

Update the framework version section:

```markdown
## Technology Stack

- **Framework**: Angular 21.x.x
- **State Management**: NgRx 21.x.x
- **UI Components**: Angular Material 21.x.x
- **TypeScript**: 5.7+
- **Node.js**: 20.11+ or 22.0+
```

### CHANGELOG.md

Add entry for the upgrade:

```markdown
## [0.5.0] - 2025-01-XX

### Changed
- Upgraded Angular from 19.2.18 to 21.x.x (#issue-number)
- Upgraded NgRx from 19.2.1 to 21.x.x
- Upgraded TypeScript from 5.6.3 to 5.7.x
- Updated all Angular ecosystem packages to Angular 21 compatible versions

### Fixed
- Resolved breaking changes from Angular 20 migration
- Resolved breaking changes from Angular 21 migration
- Updated deprecated API usage

### Technical Details
- Migration performed in two steps: Angular 19 → 20 → 21
- All automated migration schematics applied successfully
- Manual updates required for: [list specific changes]
- All tests passing, coverage maintained at X%
- Bundle sizes within acceptable limits
```

### Migration Notes

Document any significant changes or patterns that future developers should know:

```markdown
## Angular 21 Migration Notes

### Breaking Changes Resolved

1. **[Specific API Change]**
   - Old pattern: `...`
   - New pattern: `...`
   - Files affected: `...`

2. **[Another Change]**
   - Description: `...`
   - Resolution: `...`

### New Features Adopted

- [Feature 1]: Description and usage
- [Feature 2]: Description and usage

### Known Issues

- None

### Rollback Plan

If critical issues are discovered after deployment:
1. Revert to previous commit: `git revert [commit-hash]`
2. Redeploy previous version
3. Investigate issues in feature branch
```

## Risk Mitigation

### High-Risk Areas

1. **NgRx Store Integration**
   - Risk: Breaking changes in NgRx APIs
   - Mitigation: Update NgRx alongside Angular; test all store interactions thoroughly

2. **Third-Party Library Compatibility**
   - Risk: Libraries not yet compatible with Angular 21
   - Mitigation: Check compatibility before starting; have fallback plans

3. **Custom Build Configuration**
   - Risk: angular.json changes break custom configuration
   - Mitigation: Review schema changes carefully; test all build configurations

### Rollback Strategy

If the upgrade causes critical issues:

1. **Immediate Rollback**
   ```bash
   git revert [upgrade-commit-hash]
   npm install
   npm run build
   ```

2. **Investigation**
   - Identify root cause of issues
   - Determine if fixable quickly or requires more time

3. **Re-attempt**
   - Fix identified issues in feature branch
   - Re-test thoroughly before merging

### Success Metrics

The upgrade is considered successful when:

- ✅ All Angular packages at version 21.x.x
- ✅ All tests passing (100% pass rate)
- ✅ Test coverage maintained or improved
- ✅ Build completes without errors
- ✅ Linting passes without errors
- ✅ Bundle sizes within limits
- ✅ All critical workflows tested and working
- ✅ Documentation updated
- ✅ Version bumped and CHANGELOG updated

## Conclusion

This design provides a comprehensive approach to upgrading Angular from version 19.2.18 to 21.x.x. By following the incremental migration path (19 → 20 → 21), using automated schematics where possible, and thoroughly testing at each step, we minimize risk while ensuring all functionality is preserved. The correctness properties defined in this document provide clear success criteria that can be verified through both automated and manual testing.
