# Requirements Document

## Standard Requirements

This spec follows the [orb-templates Spec Standards](../../../repositories/orb-templates/docs/kiro-steering/templates/spec-standards.md).

## Introduction

The Angular frontend (`apps/web`) has 74 ESLint errors in hand-written TypeScript and HTML files that must be fixed to pass CI linting. These errors fall into several categories: unused imports/variables, empty lifecycle methods, negated async pipes, case declarations in switch statements, and async promise executors.

Note: 2 additional errors exist in generated model files (`AuthModel.ts`) which are tracked in GitHub issue #59 with orb-schema-generator and will be resolved when v0.13.6 is published to CodeArtifact.

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

1. WHEN the CI_Pipeline runs the lint step, THE CI_Pipeline SHALL complete with zero ESLint errors in hand-written files
2. THE Linting_System SHALL allow warnings (which are acceptable) but SHALL fail on errors
