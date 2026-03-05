# Requirements: Console Logging Cleanup

## 1. Overview

### 1.1 Purpose
Replace all production `console.log()` and `console.info()` statements with appropriate logging levels (`console.debug()`, `console.error()`, `console.warn()`) to reduce noise in production console output and follow best practices for browser logging.

### 1.2 Background
The codebase currently contains 30-40+ instances of `console.log()` and `console.info()` in production code (effects, reducers, components, services). These statements appear in production builds and clutter the browser console, making it difficult to identify actual errors and warnings.

### 1.3 Goals
- Eliminate all `console.log()` and `console.info()` from production code
- Use `console.debug()` for development/debugging information
- Preserve `console.error()` and `console.warn()` for actual errors and warnings
- Maintain existing debug information for development troubleshooting

## 2. Functional Requirements

### 2.1 Logging Level Standards

**FR-2.1.1: Debug-Level Logging**
- **WHEN** code needs to log informational messages for development/debugging
- **THEN** it SHALL use `console.debug()` instead of `console.log()` or `console.info()`
- **Rationale**: `console.debug()` only appears when browser DevTools console filter is set to "Verbose", keeping production console clean

**FR-2.1.2: Error-Level Logging**
- **WHEN** code encounters an actual error condition
- **THEN** it SHALL use `console.error()` (no changes needed - already correct)
- **Rationale**: Errors should always be visible in production console

**FR-2.1.3: Warning-Level Logging**
- **WHEN** code encounters a warning condition (non-fatal issue)
- **THEN** it SHALL use `console.warn()` (no changes needed - already correct)
- **Rationale**: Warnings should be visible but distinct from errors

**FR-2.1.4: Test Code Exception**
- **WHEN** code is in test files (`*.spec.ts`)
- **THEN** `console.log()` MAY be used for test output
- **Rationale**: Test output is not part of production builds

### 2.2 File-Specific Requirements

**FR-2.2.1: NgRx Effects**
- **WHEN** effects log action processing, API calls, or state transitions
- **THEN** they SHALL use `console.debug()` with descriptive prefixes
- **Files**: `user.effects.ts`, `environments.effects.ts`, `applications.effects.ts`, etc.

**FR-2.2.2: NgRx Reducers**
- **WHEN** reducers log state changes
- **THEN** they SHALL use `console.debug()` with descriptive prefixes
- **Files**: `user.reducer.ts`

**FR-2.2.3: Components**
- **WHEN** components log user interactions or lifecycle events
- **THEN** they SHALL use `console.debug()` with descriptive prefixes
- **Files**: `dashboard.component.ts`, `user-layout.component.ts`, `application-detail-page.component.ts`

**FR-2.2.4: Services**
- **WHEN** services log operational information (not errors)
- **THEN** they SHALL use `console.debug()` instead of `console.info()`
- **Files**: `error-handler.service.ts`, `rate-limiting.service.ts`

**FR-2.2.5: Conditional Development Logging**
- **WHEN** code already wraps logging in `isDevelopment()` or `!environment.production` checks
- **THEN** it MAY continue using `console.log()` (already acceptable)
- **Files**: `auth-analytics.service.ts` (already correct)

### 2.3 Code Comment Documentation

**FR-2.3.1: JSDoc Comments in Examples**
- **WHEN** JSDoc examples show `console.log()` usage
- **THEN** they SHALL be updated to show `console.debug()` or removed if not essential
- **Files**: `api-key-validation.ts`

## 3. Non-Functional Requirements

### 3.1 Performance

**NFR-3.1.1: No Performance Impact**
- The logging level changes SHALL NOT impact application performance
- `console.debug()` has the same performance characteristics as `console.log()`

### 3.2 Maintainability

**NFR-3.2.1: Consistent Logging Pattern**
- All debug logging SHALL follow the pattern: `console.debug('[ComponentName] Message:', data)`
- This maintains consistency with existing `console.debug()` usage in `cognito.service.ts`

**NFR-3.2.2: Preserve Log Context**
- All existing log messages and data SHALL be preserved
- Only the logging method SHALL change (`.log()` → `.debug()`, `.info()` → `.debug()`)

### 3.3 Testing

**NFR-3.3.1: No Test Changes Required**
- Existing unit tests SHALL continue to pass without modification
- Test files (`*.spec.ts`) are exempt from this cleanup

## 4. Acceptance Criteria

### 4.1 Code Quality

**AC-4.1.1: Zero console.log in Production Code**
- **GIVEN** the codebase after cleanup
- **WHEN** searching for `console.log(` in `apps/web/src/app/**/*.ts` (excluding `*.spec.ts`)
- **THEN** zero matches SHALL be found

**AC-4.1.2: Zero console.info in Production Code**
- **GIVEN** the codebase after cleanup
- **WHEN** searching for `console.info(` in `apps/web/src/app/**/*.ts` (excluding `*.spec.ts`)
- **THEN** zero matches SHALL be found (except those wrapped in development checks)

**AC-4.1.3: Preserve console.error and console.warn**
- **GIVEN** the codebase after cleanup
- **WHEN** reviewing error handling code
- **THEN** all `console.error()` and `console.warn()` calls SHALL remain unchanged

### 4.2 Functionality

**AC-4.2.1: Application Functionality Unchanged**
- **GIVEN** the application after logging cleanup
- **WHEN** running the application in development mode
- **THEN** all features SHALL work identically to before the cleanup

**AC-4.2.2: Debug Information Available**
- **GIVEN** the application after logging cleanup
- **WHEN** browser DevTools console filter is set to "Verbose"
- **THEN** all debug messages SHALL be visible

**AC-4.2.3: Production Console Clean**
- **GIVEN** the application after logging cleanup
- **WHEN** running in production mode with default console filter
- **THEN** only errors and warnings SHALL appear in the console

### 4.3 Testing

**AC-4.3.1: All Tests Pass**
- **GIVEN** the codebase after cleanup
- **WHEN** running `npm test`
- **THEN** all unit tests SHALL pass

**AC-4.3.2: No Linting Errors**
- **GIVEN** the codebase after cleanup
- **WHEN** running `npm run lint`
- **THEN** zero linting errors SHALL be reported

**AC-4.3.3: Build Succeeds**
- **GIVEN** the codebase after cleanup
- **WHEN** running `npm run build`
- **THEN** the build SHALL complete successfully

## 5. Constraints

### 5.1 Technical Constraints

**C-5.1.1: No Breaking Changes**
- The logging cleanup SHALL NOT change any application behavior
- Only logging method calls SHALL be modified

**C-5.1.2: Backward Compatibility**
- The changes SHALL be compatible with all supported browsers
- `console.debug()` is supported in all modern browsers

### 5.2 Scope Constraints

**C-5.2.1: Frontend Only**
- This cleanup applies ONLY to the Angular frontend (`apps/web/`)
- Backend Python code is out of scope

**C-5.2.2: Exclude Test Files**
- Test files (`*.spec.ts`) are excluded from this cleanup
- Test output may continue using `console.log()`

## 6. Dependencies

### 6.1 No External Dependencies
- This cleanup has no external dependencies
- All changes are internal code modifications

## 7. Risks and Mitigations

### 7.1 Risk: Loss of Debug Information

**Risk**: Developers might not see debug messages if console filter is not set to "Verbose"

**Mitigation**: 
- Document the console filter setting in development guidelines
- Add a comment in `main.ts` explaining how to enable verbose logging
- Most developers already use "Verbose" filter during active development

### 7.2 Risk: Missed Instances

**Risk**: Some `console.log()` instances might be missed during cleanup

**Mitigation**:
- Use automated search to find all instances
- Create a comprehensive task list with file paths and line numbers
- Add a linting rule to prevent future `console.log()` usage (optional future enhancement)

## 8. Standard Requirements (from orb-templates)

### 8.1 Documentation Updates
- Update `README.md` if it mentions console logging practices
- Update any developer guides that reference logging

### 8.2 Version and Changelog Management
- Bump version following semantic versioning (patch version)
- Update `CHANGELOG.md` with cleanup description

### 8.3 Git Commit Standards
- Reference issue numbers in commits (if applicable)
- Follow conventional commits: `refactor: replace console.log with console.debug`

### 8.4 Final Verification
- All tests pass (unit tests)
- No linting errors
- No compilation errors
- Build succeeds
- Manual verification: console is clean in production mode

## 9. Glossary

**Console Logging Levels**:
- `console.debug()`: Verbose-level logging, only visible when console filter is set to "Verbose"
- `console.log()`: Info-level logging, always visible (should be avoided in production)
- `console.info()`: Info-level logging, always visible (should be avoided in production)
- `console.warn()`: Warning-level logging, always visible (appropriate for warnings)
- `console.error()`: Error-level logging, always visible (appropriate for errors)

**Production Code**: Code that runs in the deployed application (excludes test files)

**Development Mode**: Running the application locally with `ng serve` or in development build

**Production Mode**: Running the application with production build (`ng build --configuration production`)
