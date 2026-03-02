# Requirements Document

## Introduction

This document defines requirements for an End-to-End (E2E) Test Generator that integrates with orb-schema-generator. The E2E Test Generator reads YAML schemas and generates Playwright test files in TypeScript, enabling automated testing of CRUD operations, authentication flows, and UI interactions. This feature will be developed as a proof-of-concept in orb-integration-hub before integration into orb-schema-generator.

## Glossary

- **E2E_Test_Generator**: Python module that generates Playwright test files from YAML schemas
- **orb-schema-generator**: Existing code generation tool that creates models, GraphQL schemas, and infrastructure from YAML schemas
- **Schema**: YAML file defining data models, tables, or operations (located in `schemas/` directory)
- **Playwright**: End-to-end testing framework for web applications
- **Page_Object_Model**: Design pattern that creates object repository for web UI elements
- **Test_Fixture**: Setup and teardown code for test data and environment
- **CRUD**: Create, Read, Update, Delete operations
- **Cognito**: AWS authentication service used for user management
- **Configuration_File**: `schema-generator.yml` file containing generator settings
- **Test_Scenario**: Specific test case defined in schema metadata (e.g., create organization, list with pagination)
- **Generated_Test**: Playwright test file created by E2E_Test_Generator
- **Base_Generator**: Abstract class in orb-schema-generator that all generators inherit from

## Requirements

### Requirement 1: Generator Architecture

**User Story:** As a developer, I want the E2E Test Generator to follow orb-schema-generator patterns, so that it can be easily integrated later.

#### Acceptance Criteria

1. THE E2E_Test_Generator SHALL be implemented as a Python module at `tools/e2e_generator/`
2. THE E2E_Test_Generator SHALL include a base generator class that mirrors orb-schema-generator's BaseGenerator pattern
3. THE E2E_Test_Generator SHALL include a Playwright-specific generator class that inherits from the base generator
4. THE E2E_Test_Generator SHALL use Jinja2 templates for code generation
5. THE E2E_Test_Generator SHALL follow the same file organization patterns as orb-schema-generator (base.py, playwright_generator.py, templates/)
6. THE E2E_Test_Generator SHALL include an `__init__.py` file that exports the main generator class
7. THE E2E_Test_Generator SHALL use the same YAML parsing utilities as orb-schema-generator

### Requirement 2: Configuration Integration

**User Story:** As a developer, I want to configure E2E test generation in schema-generator.yml, so that it integrates seamlessly with existing workflows.

#### Acceptance Criteria

1. WHEN schema-generator.yml is extended, THE Configuration_File SHALL include a new `output.testing.e2e` section
2. THE Configuration_File SHALL support a `framework` field with value "playwright"
3. THE Configuration_File SHALL support a `base_dir` field specifying the output directory (default: `./apps/web/e2e/`)
4. THE Configuration_File SHALL support a `language` field with value "typescript"
5. THE Configuration_File SHALL support a `test_patterns` field defining test file naming conventions
6. THE Configuration_File SHALL support an `enabled` boolean field to enable/disable E2E generation
7. THE Configuration_File SHALL support a `targets` field to specify which schemas to generate tests for

### Requirement 3: Schema Metadata for Test Configuration

**User Story:** As a developer, I want to define test scenarios in schema files, so that I can control which tests are generated for each resource.

#### Acceptance Criteria

1. WHEN a schema includes E2E metadata, THE Schema SHALL support an `e2e` section in the YAML file
2. THE Schema SHALL support an `e2e.routes` field defining URL paths for the resource (e.g., `/organizations`, `/organizations/:id`)
3. THE Schema SHALL support an `e2e.scenarios` field listing test scenarios to generate (e.g., `create`, `read`, `update`, `delete`, `list`, `pagination`, `filter`)
4. THE Schema SHALL support an `e2e.auth_required` boolean field indicating if authentication is needed
5. THE Schema SHALL support an `e2e.roles` field specifying which user roles can access the resource
6. WHEN a schema lacks E2E metadata, THE E2E_Test_Generator SHALL skip test generation for that schema
7. THE Schema SHALL support an `e2e.page_object` field to customize the Page Object Model class name

### Requirement 4: CLI Invocation

**User Story:** As a developer, I want to run the E2E Test Generator from the command line, so that I can generate tests independently or as part of CI/CD.

#### Acceptance Criteria

1. THE E2E_Test_Generator SHALL be invocable via `python -m tools.e2e_generator generate`
2. WHEN invoked with `--config` flag, THE E2E_Test_Generator SHALL read configuration from the specified file path
3. WHEN invoked without `--config` flag, THE E2E_Test_Generator SHALL default to `schema-generator.yml`
4. WHEN invoked with `--schema` flag, THE E2E_Test_Generator SHALL generate tests for only the specified schema
5. WHEN invoked with `--dry-run` flag, THE E2E_Test_Generator SHALL print planned operations without writing files
6. WHEN generation succeeds, THE E2E_Test_Generator SHALL exit with code 0
7. WHEN generation fails, THE E2E_Test_Generator SHALL exit with non-zero code and print error messages

### Requirement 5: CRUD Test Generation

**User Story:** As a developer, I want automated CRUD tests generated from schemas, so that I can verify basic operations work correctly.

#### Acceptance Criteria

1. WHEN a schema includes `create` scenario, THE E2E_Test_Generator SHALL generate a test that creates a new resource
2. WHEN a schema includes `read` scenario, THE E2E_Test_Generator SHALL generate a test that retrieves an existing resource
3. WHEN a schema includes `update` scenario, THE E2E_Test_Generator SHALL generate a test that modifies an existing resource
4. WHEN a schema includes `delete` scenario, THE E2E_Test_Generator SHALL generate a test that removes a resource
5. THE Generated_Test SHALL use schema attributes to populate form fields with valid test data
6. THE Generated_Test SHALL verify success messages after each operation
7. THE Generated_Test SHALL verify the resource appears in list views after creation

### Requirement 6: Authentication Flow Tests

**User Story:** As a developer, I want authentication tests generated automatically, so that I can verify login, logout, and signup flows.

#### Acceptance Criteria

1. WHEN E2E generation is enabled, THE E2E_Test_Generator SHALL generate a Cognito authentication helper module
2. THE Generated_Test SHALL include a `login` function that authenticates with Cognito using test credentials
3. THE Generated_Test SHALL include a `logout` function that clears authentication state
4. THE Generated_Test SHALL include a `signup` function that creates a new user account
5. WHEN a schema requires authentication, THE Generated_Test SHALL call the login function before executing test scenarios
6. THE Generated_Test SHALL support MFA (Multi-Factor Authentication) flows when enabled
7. THE Generated_Test SHALL store authentication tokens for reuse across tests

### Requirement 7: List View Tests

**User Story:** As a developer, I want list view tests generated from schemas, so that I can verify pagination, filtering, and sorting work correctly.

#### Acceptance Criteria

1. WHEN a schema includes `list` scenario, THE E2E_Test_Generator SHALL generate a test that navigates to the list page
2. WHEN a schema includes `pagination` scenario, THE E2E_Test_Generator SHALL generate a test that verifies pagination controls
3. WHEN a schema includes `filter` scenario, THE E2E_Test_Generator SHALL generate a test that applies filters and verifies results
4. WHEN a schema includes `sort` scenario, THE E2E_Test_Generator SHALL generate a test that sorts columns and verifies order
5. THE Generated_Test SHALL verify the correct number of items are displayed per page
6. THE Generated_Test SHALL verify navigation between pages works correctly
7. THE Generated_Test SHALL verify filtered results match the filter criteria

### Requirement 8: Detail View Tests

**User Story:** As a developer, I want detail view tests generated from schemas, so that I can verify resource details are displayed correctly.

#### Acceptance Criteria

1. WHEN a schema includes `detail` scenario, THE E2E_Test_Generator SHALL generate a test that navigates to a detail page
2. THE Generated_Test SHALL verify all schema attributes are displayed on the detail page
3. THE Generated_Test SHALL verify navigation from list view to detail view works correctly
4. THE Generated_Test SHALL verify breadcrumb navigation is present and functional
5. THE Generated_Test SHALL verify action buttons (edit, delete) are present when authorized
6. WHEN a schema has nested objects, THE Generated_Test SHALL verify nested data is displayed correctly
7. THE Generated_Test SHALL verify status badges and icons match the resource state

### Requirement 9: Page Object Model Generation

**User Story:** As a developer, I want Page Object Models generated for each resource, so that tests are maintainable and reusable.

#### Acceptance Criteria

1. THE E2E_Test_Generator SHALL generate a Page Object Model class for each schema with E2E metadata
2. THE Page_Object_Model SHALL include locator definitions for all UI elements (buttons, inputs, tables)
3. THE Page_Object_Model SHALL include methods for common interactions (click, fill, select)
4. THE Page_Object_Model SHALL include navigation methods (goToList, goToDetail, goToCreate)
5. THE Page_Object_Model SHALL include assertion methods (verifyTitle, verifyData, verifyMessage)
6. THE Page_Object_Model SHALL be stored in `apps/web/e2e/page-objects/` directory
7. THE Generated_Test SHALL import and use the Page_Object_Model instead of direct locators

### Requirement 10: Test Fixture Generation

**User Story:** As a developer, I want test fixtures generated for data setup and teardown, so that tests are isolated and repeatable.

#### Acceptance Criteria

1. THE E2E_Test_Generator SHALL generate a fixtures module at `apps/web/e2e/fixtures/`
2. THE Test_Fixture SHALL include a `beforeEach` hook that sets up test data
3. THE Test_Fixture SHALL include an `afterEach` hook that cleans up test data
4. THE Test_Fixture SHALL support creating test users with specific roles
5. THE Test_Fixture SHALL support creating prerequisite resources (e.g., organization before application)
6. THE Test_Fixture SHALL use GraphQL mutations to create test data
7. THE Test_Fixture SHALL delete created resources after test completion

### Requirement 11: Authorization Tests

**User Story:** As a developer, I want role-based access control tests generated, so that I can verify users only access authorized resources.

#### Acceptance Criteria

1. WHEN a schema defines roles, THE E2E_Test_Generator SHALL generate tests for each role
2. THE Generated_Test SHALL verify authorized users can access the resource
3. THE Generated_Test SHALL verify unauthorized users receive access denied messages
4. THE Generated_Test SHALL test OWNER role permissions (full access)
5. THE Generated_Test SHALL test EMPLOYEE role permissions (limited access)
6. THE Generated_Test SHALL test CUSTOMER role permissions (restricted access)
7. THE Generated_Test SHALL verify UI elements are hidden for unauthorized roles

### Requirement 12: Test File Organization

**User Story:** As a developer, I want generated tests organized logically, so that I can find and maintain them easily.

#### Acceptance Criteria

1. THE E2E_Test_Generator SHALL output test files to `apps/web/e2e/tests/` directory
2. THE E2E_Test_Generator SHALL organize tests by resource (e.g., `organizations.spec.ts`, `applications.spec.ts`)
3. THE E2E_Test_Generator SHALL generate Page Object Models in `apps/web/e2e/page-objects/` directory
4. THE E2E_Test_Generator SHALL generate fixtures in `apps/web/e2e/fixtures/` directory
5. THE E2E_Test_Generator SHALL generate authentication helpers in `apps/web/e2e/auth/` directory
6. THE E2E_Test_Generator SHALL generate utility functions in `apps/web/e2e/utils/` directory
7. THE E2E_Test_Generator SHALL include an AUTO-GENERATED header in all generated files

### Requirement 13: Playwright Configuration

**User Story:** As a developer, I want Playwright configuration generated automatically, so that tests run with correct settings.

#### Acceptance Criteria

1. THE E2E_Test_Generator SHALL generate a `playwright.config.ts` file if it does not exist
2. THE Configuration_File SHALL specify base URL from environment variables
3. THE Configuration_File SHALL configure browser types (chromium, firefox, webkit)
4. THE Configuration_File SHALL configure test timeout and retry settings
5. THE Configuration_File SHALL configure screenshot and video capture on failure
6. THE Configuration_File SHALL configure test parallelization settings
7. THE Configuration_File SHALL configure authentication state storage

### Requirement 14: Round-Trip Property Testing

**User Story:** As a developer, I want round-trip tests for data serialization, so that I can verify data integrity through create-read cycles.

#### Acceptance Criteria

1. WHEN a schema includes `round_trip` scenario, THE E2E_Test_Generator SHALL generate a test that creates a resource and immediately reads it back
2. THE Generated_Test SHALL verify all attribute values match between create input and read output
3. THE Generated_Test SHALL verify timestamp fields are set correctly
4. THE Generated_Test SHALL verify enum values are preserved correctly
5. THE Generated_Test SHALL verify nested objects are serialized correctly
6. THE Generated_Test SHALL verify array fields are preserved correctly
7. THE Generated_Test SHALL verify optional fields handle null/undefined correctly

### Requirement 15: Documentation Updates

**User Story:** As a developer, I want documentation updated with E2E test generation instructions, so that team members can use the feature effectively.

#### Acceptance Criteria

1. THE E2E_Test_Generator SHALL include a README.md file at `tools/e2e_generator/README.md`
2. THE README SHALL document installation requirements (Playwright, TypeScript)
3. THE README SHALL document configuration options in schema-generator.yml
4. THE README SHALL document schema metadata format for E2E tests
5. THE README SHALL document CLI usage with examples
6. THE README SHALL document generated file structure
7. THE README SHALL document how to run generated tests

### Requirement 16: Version and Changelog Management

**User Story:** As a developer, I want version tracking for the E2E Test Generator, so that I can manage releases and track changes.

#### Acceptance Criteria

1. THE E2E_Test_Generator SHALL include a version number in `tools/e2e_generator/__init__.py`
2. WHEN a new feature is added, THE version SHALL be bumped following semantic versioning
3. THE CHANGELOG.md SHALL be updated with E2E Test Generator changes
4. THE CHANGELOG SHALL include the issue number for each change
5. THE CHANGELOG SHALL follow the format: `- Feature description (#issue)`
6. THE Generated_Test SHALL include a comment with the generator version used
7. THE E2E_Test_Generator SHALL log the version number when invoked

### Requirement 17: Git Commit Standards

**User Story:** As a developer, I want commits to follow conventional commit format, so that changes are traceable to issues.

#### Acceptance Criteria

1. WHEN committing E2E Test Generator code, THE commit message SHALL reference the issue number
2. THE commit message SHALL follow conventional commits format: `feat: description #issue`
3. WHEN fixing bugs, THE commit message SHALL use `fix:` prefix
4. WHEN adding documentation, THE commit message SHALL use `docs:` prefix
5. WHEN refactoring code, THE commit message SHALL use `refactor:` prefix
6. WHEN multiple issues are addressed, THE commit message SHALL reference all issue numbers
7. THE commit message SHALL be descriptive and concise

### Requirement 18: Final Verification

**User Story:** As a developer, I want verification steps before completing the feature, so that I can ensure quality and completeness.

#### Acceptance Criteria

1. THE E2E_Test_Generator SHALL pass all unit tests before deployment
2. THE Generated_Test SHALL pass when executed with Playwright
3. THE E2E_Test_Generator SHALL produce no linting errors
4. THE E2E_Test_Generator SHALL produce no type checking errors
5. THE documentation SHALL render correctly in Markdown viewers
6. THE CHANGELOG.md SHALL be updated with the feature description
7. THE version SHALL be bumped appropriately in `__init__.py`
