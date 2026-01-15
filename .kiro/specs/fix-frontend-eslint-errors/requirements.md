# Requirements Document

## Standard Requirements

This spec follows the [orb-templates Spec Standards](../../../repositories/orb-templates/docs/kiro-steering/templates/spec-standards.md).

## Introduction

The Angular frontend (`apps/web`) has ESLint errors in hand-written TypeScript and HTML files that must be fixed to pass CI linting with zero errors and zero warnings. The errors fall into several categories:

**Phase 1 (Completed):** 74 errors - unused imports/variables, empty lifecycle methods, negated async pipes, case declarations, async promise executors

**Phase 2 (Current):** 192 additional issues - explicit `any` types (155), accessibility violations (34), non-standalone components (3)

Note: Issue #59 with orb-schema-generator has been resolved - models regenerated with v0.13.6.

## Glossary

- **ESLint**: Static analysis tool for identifying problematic patterns in JavaScript/TypeScript code
- **Angular_ESLint**: ESLint rules specific to Angular framework patterns
- **Linting_System**: The ESLint configuration and rules in `apps/web/eslint.config.js`
- **CI_Pipeline**: GitHub Actions workflow that runs linting checks on pull requests
- **Async_Pipe**: Angular pipe that subscribes to observables in templates
- **Lifecycle_Method**: Angular component hooks like `ngOnInit`, `ngOnDestroy`, `ngAfterViewInit`

## Requirements

### Requirement 1: Fix Unused Import Errors

**User Story:** As a developer, I want all imports to be used in the codebase, so that the code is clean and maintainable.

#### Acceptance Criteria

1. WHEN the Linting_System analyzes TypeScript files, THE Linting_System SHALL report zero `@typescript-eslint/no-unused-vars` errors for unused imports
2. WHEN an import is not used in a file, THE Developer SHALL remove the import statement
3. WHEN an import is needed for type annotations only, THE Developer SHALL use `import type` syntax

### Requirement 2: Fix Unused Variable Errors

**User Story:** As a developer, I want all declared variables to be used, so that the code is clean and free of dead code.

#### Acceptance Criteria

1. WHEN the Linting_System analyzes TypeScript files, THE Linting_System SHALL report zero `@typescript-eslint/no-unused-vars` errors for unused variables
2. WHEN a variable is assigned but never read, THE Developer SHALL either use the variable or remove the assignment
3. WHEN a function parameter is intentionally unused, THE Developer SHALL prefix it with underscore (`_param`)

### Requirement 3: Fix Empty Lifecycle Method Errors

**User Story:** As a developer, I want lifecycle methods to contain meaningful code, so that the codebase follows Angular best practices.

#### Acceptance Criteria

1. WHEN the Linting_System analyzes Angular components, THE Linting_System SHALL report zero `@angular-eslint/no-empty-lifecycle-method` errors
2. WHEN a lifecycle method is empty, THE Developer SHALL either add a comment explaining why it's needed or remove the method
3. IF a lifecycle method is required by an interface but has no implementation, THEN THE Developer SHALL add a descriptive comment

### Requirement 4: Fix Negated Async Pipe Errors

**User Story:** As a developer, I want async pipe usage to follow Angular best practices, so that template logic is clear and maintainable.

#### Acceptance Criteria

1. WHEN the Linting_System analyzes Angular templates, THE Linting_System SHALL report zero `@angular-eslint/template/no-negated-async` errors
2. WHEN checking if an observable is falsy, THE Developer SHALL use `(observable | async) === false` or `(observable | async) === null` instead of `!(observable | async)`

### Requirement 5: Fix Case Declaration Errors

**User Story:** As a developer, I want switch statements to follow JavaScript best practices, so that variable scoping is predictable.

#### Acceptance Criteria

1. WHEN the Linting_System analyzes TypeScript files, THE Linting_System SHALL report zero `no-case-declarations` errors
2. WHEN a case block requires variable declarations, THE Developer SHALL wrap the case block in braces `{ }` to create a block scope

### Requirement 6: Fix Async Promise Executor Errors

**User Story:** As a developer, I want Promise constructors to follow JavaScript best practices, so that error handling is predictable.

#### Acceptance Criteria

1. WHEN the Linting_System analyzes TypeScript files, THE Linting_System SHALL report zero `no-async-promise-executor` errors
2. WHEN async operations are needed in a Promise, THE Developer SHALL refactor to use async/await pattern outside the Promise constructor

### Requirement 7: CI Pipeline Passes

**User Story:** As a developer, I want the CI pipeline to pass linting checks, so that code quality is enforced automatically.

#### Acceptance Criteria

1. WHEN the CI_Pipeline runs the lint step, THE CI_Pipeline SHALL complete with zero ESLint errors
2. WHEN the CI_Pipeline runs the lint step, THE CI_Pipeline SHALL complete with zero ESLint warnings
3. THE Linting_System SHALL treat all linting issues as errors (no warnings allowed)

### Requirement 8: Fix Explicit Any Type Errors

**User Story:** As a developer, I want all types to be explicitly defined, so that the codebase has strong type safety.

#### Acceptance Criteria

1. WHEN the Linting_System analyzes TypeScript files, THE Linting_System SHALL report zero `@typescript-eslint/no-explicit-any` errors
2. WHEN a variable or parameter needs a type, THE Developer SHALL use a specific type from generated models or create a new interface
3. WHEN the exact type is unknown, THE Developer SHALL use `unknown` instead of `any` and add type guards

### Requirement 9: Fix Accessibility Errors

**User Story:** As a developer, I want the application to be accessible, so that all users can interact with it effectively.

#### Acceptance Criteria

1. WHEN the Linting_System analyzes Angular templates, THE Linting_System SHALL report zero `@angular-eslint/template/label-has-associated-control` errors
2. WHEN the Linting_System analyzes Angular templates, THE Linting_System SHALL report zero `@angular-eslint/template/click-events-have-key-events` errors
3. WHEN the Linting_System analyzes Angular templates, THE Linting_System SHALL report zero `@angular-eslint/template/interactive-supports-focus` errors
4. WHEN a form control exists, THE Developer SHALL associate it with a label using `for` attribute or by wrapping
5. WHEN a click handler exists on a non-button element, THE Developer SHALL add a corresponding keyboard handler

### Requirement 10: Fix Standalone Component Errors

**User Story:** As a developer, I want components to use Angular's standalone architecture, so that the codebase follows modern Angular patterns.

#### Acceptance Criteria

1. WHEN the Linting_System analyzes Angular components, THE Linting_System SHALL report zero `@angular-eslint/prefer-standalone` errors
2. WHEN a component is not standalone, THE Developer SHALL convert it to standalone by adding `standalone: true` and importing dependencies directly
