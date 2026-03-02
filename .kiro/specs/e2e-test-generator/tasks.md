# Implementation Plan: E2E Test Generator

## Overview

This implementation plan breaks down the E2E Test Generator development into 5 phases following the design document. The generator will be implemented as a Python module at `tools/e2e_generator/` that reads YAML schemas and generates Playwright test files in TypeScript. All tasks are required (no optional tasks per user specification).

## Tasks

- [x] 1. Phase 1: Core Infrastructure
  - [x] 1.1 Create module structure and package initialization
    - Create `tools/e2e_generator/` directory
    - Create `__init__.py` with version and exports
    - Create `templates/` subdirectory for Jinja2 templates
    - Create `tests/` subdirectory for unit tests
    - _Requirements: 1.1, 1.6_
  
  - [x] 1.2 Implement configuration models
    - Create `config.py` with `E2ETestingConfig` dataclass
    - Implement `E2EConfig` dataclass with `from_file()` class method
    - Add YAML parsing for `output.testing.e2e` section
    - Add default values for all configuration fields
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  
  - [x] 1.3 Implement schema loader with E2E metadata extraction
    - Create `schema_loader.py` with `E2EMetadata` dataclass
    - Implement `SchemaWithE2E` dataclass
    - Implement `SchemaLoader` class with `load_schemas_with_e2e()` method
    - Add recursive YAML file scanning in schemas directory
    - Add E2E metadata extraction from schema files
    - Add schema filtering by name
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  
  - [x] 1.4 Implement base generator class
    - Create `base.py` with `BaseE2EGenerator` abstract class
    - Implement `_write_file()` method with AUTO-GENERATED header detection
    - Implement `_has_auto_generated_header()` method
    - Implement `_get_file_header()` method
    - Add dry-run mode support
    - Add version tracking
    - _Requirements: 1.2, 12.7, 4.5_
  
  - [x] 1.5 Implement CLI entry point
    - Create `__main__.py` with argument parsing
    - Add `generate` command
    - Add `--config` flag for configuration file path
    - Add `--schema` flag for single schema filtering
    - Add `--dry-run` flag for preview mode
    - Add `--verbose` flag for debug logging
    - Add exit code handling (0 for success, non-zero for failure)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  
  - [x] 1.6 Write unit tests for configuration loading
    - Test `E2ETestingConfig.from_dict()` with valid data
    - Test default values when fields are missing
    - Test `E2EConfig.from_file()` with valid YAML
    - Test error handling for invalid YAML syntax
    - Test error handling for missing configuration file
    - _Requirements: 18.1, 18.3_
  
  - [x] 1.7 Write unit tests for schema loading
    - Test loading schemas with E2E metadata
    - Test skipping schemas without E2E metadata
    - Test schema filtering by name
    - Test error handling for invalid YAML
    - Test error handling for missing required fields
    - Test E2EMetadata extraction
    - _Requirements: 18.1, 18.3_
  
  - [x] 1.8 Write unit tests for base generator
    - Test AUTO-GENERATED header detection
    - Test file writing with header check
    - Test dry-run mode (no files written)
    - Test file header generation
    - Test directory creation
    - _Requirements: 18.1, 18.3_
  
  - [x] 1.9 Write unit tests for CLI
    - Test command-line argument parsing
    - Test --config flag
    - Test --schema flag
    - Test --dry-run flag
    - Test --verbose flag
    - Test exit codes (0 for success, 1 for failure)
    - _Requirements: 18.1, 18.3_

- [x] 2. Phase 2: Template System
  - [x] 2.1 Create test spec template
    - Create `templates/test.spec.ts.j2`
    - Add AUTO-GENERATED header
    - Add imports for Playwright, Page Object, auth, fixtures
    - Add test.describe block with beforeEach/afterEach hooks
    - Add authentication integration (login/logout)
    - Add test cases for create scenario
    - Add test cases for read scenario
    - Add test cases for update scenario
    - Add test cases for delete scenario
    - Add test cases for list scenario
    - Add test cases for pagination scenario
    - Add test cases for filter scenario
    - Add test cases for detail scenario
    - Add test cases for round_trip scenario
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.5, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_
  
  - [x] 2.2 Create Page Object Model template
    - Create `templates/page_object.ts.j2`
    - Add AUTO-GENERATED header
    - Add imports for Playwright types
    - Add class definition with constructor
    - Add locator definitions for all UI elements
    - Add locators for each schema attribute (input and display)
    - Add navigation methods (goToList, goToDetail, goToCreate)
    - Add interaction methods (click, fill, select)
    - Add assertion helper methods (getters for locators)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.7_
  
  - [x] 2.3 Create authentication helper template
    - Create `templates/auth_helper.ts.j2`
    - Add AUTO-GENERATED header
    - Add imports for Playwright types
    - Add LoginCredentials interface
    - Add SignupData interface
    - Implement login() function with Cognito authentication
    - Implement logout() function
    - Implement signup() function
    - Add authentication state storage
    - Add getAuthToken() function
    - _Requirements: 6.2, 6.3, 6.4, 6.7_
  
  - [x] 2.4 Create test fixtures template
    - Create `templates/fixtures.ts.j2`
    - Add AUTO-GENERATED header
    - Add imports for Playwright types
    - Add TestUser interface
    - Implement createTestUser() function with role support
    - Implement cleanupTestData() function
    - Implement createPrerequisites() function
    - Add GraphQL mutation support for test data creation
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_
  
  - [x] 2.5 Create Playwright configuration template
    - Create `templates/playwright_config.ts.j2`
    - Add AUTO-GENERATED header
    - Add imports for Playwright types
    - Configure test directory
    - Configure browser types (chromium, firefox, webkit)
    - Configure timeout and retry settings
    - Configure screenshot and video capture
    - Configure test parallelization
    - Configure authentication state storage
    - Configure base URL from environment variables
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_
  
  - [x] 2.6 Create utility functions template
    - Create `templates/utils.ts.j2`
    - Add AUTO-GENERATED header
    - Add imports for Playwright types
    - Implement waitForGraphQL() function
    - Implement generateTestData() function
    - Implement takeTimestampedScreenshot() function
    - Implement waitForStable() function
    - _Requirements: 12.6_
  
  - [x] 2.7 Write template rendering tests
    - Test all templates render without errors
    - Test templates with sample schema data
    - Test output is valid TypeScript syntax
    - Test conditional blocks (auth_required, scenarios)
    - Test loops (attributes, scenarios)
    - Test filters (camelCase, pascalCase)
    - _Requirements: 18.1, 18.2_

- [x] 3. Phase 3: Generator Implementation
  - [x] 3.1 Implement Playwright generator class
    - Create `playwright_generator.py` with `PlaywrightGenerator` class
    - Inherit from `BaseE2EGenerator`
    - Initialize Jinja2 environment with template loader
    - Configure Jinja2 autoescape and trim settings
    - Add custom filters (camelCase, pascalCase)
    - Initialize schema loader
    - _Requirements: 1.3, 1.4_
  
  - [x] 3.2 Implement main generate() method
    - Check if E2E generation is enabled
    - Load schemas with E2E metadata
    - Apply schema filter if specified
    - Generate common files (once)
    - Generate per-schema files (loop)
    - Log summary statistics
    - _Requirements: 1.7, 4.4_
  
  - [x] 3.3 Implement test file generation
    - Implement `_generate_test_file()` method
    - Load test.spec.ts.j2 template
    - Render template with schema data
    - Apply test file naming pattern
    - Write to tests/ directory
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 12.2_
  
  - [x] 3.4 Implement Page Object generation
    - Implement `_generate_page_object()` method
    - Load page_object.ts.j2 template
    - Render template with schema data
    - Use custom page_object name if specified
    - Write to page-objects/ directory
    - _Requirements: 9.1, 9.6, 12.3_
  
  - [x] 3.5 Implement common file generation
    - Implement `_generate_playwright_config()` method (skip if exists)
    - Implement `_generate_auth_helper()` method
    - Implement `_generate_fixtures()` method
    - Implement `_generate_utils()` method
    - Write to appropriate directories
    - _Requirements: 12.4, 12.5, 12.6, 13.1_
  
  - [x] 3.6 Implement case conversion filters
    - Implement `_to_camel_case()` static method
    - Implement `_to_pascal_case()` static method
    - Register filters with Jinja2 environment
    - Test filters with various input formats
    - _Requirements: 9.2, 9.3_
  
  - [x] 3.7 Write unit tests for Playwright generator
    - Test test file generation for each scenario
    - Test Page Object generation
    - Test common file generation
    - Test template rendering with schema data
    - Test case conversion filters
    - Test file organization
    - _Requirements: 18.1, 18.3_
  
  - [x] 3.8 Write integration tests for end-to-end workflow
    - Create temporary directory with test schemas
    - Create test configuration file
    - Run generator CLI
    - Verify all expected files are created
    - Verify file contents match expected patterns
    - Verify generated tests are syntactically valid TypeScript
    - _Requirements: 18.1, 18.2_

- [x] 4. Phase 4: Testing and Refinement
  - [x] 4.1 Write property test for schema filtering
    - Use Hypothesis to generate random schemas and filter names
    - Verify only matching schemas are processed
    - **Property 1: Schema Filtering**
    - **Validates: Requirements 3.6, 4.4**
    - _Requirements: 18.1_
  
  - [x] 4.2 Write property test for scenario generation
    - Use Hypothesis to generate schemas with various scenarios
    - Verify each scenario generates a test case
    - **Property 2: Scenario-Driven Test Generation**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4, 8.1, 14.1**
    - _Requirements: 18.1_
  
  - [x] 4.3 Write property test for attribute form fields
    - Use Hypothesis to generate schemas with various attributes
    - Verify required attributes generate form field interactions
    - **Property 3: Attribute-Based Form Fields**
    - **Validates: Requirements 5.5**
    - _Requirements: 18.1_
  
  - [x] 4.4 Write property test for Page Object completeness
    - Use Hypothesis to generate schemas with various attributes
    - Verify Page Object includes locators for all attributes
    - **Property 4: Page Object Generation**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.7**
    - _Requirements: 18.1_
  
  - [x] 4.5 Write property test for authentication integration
    - Use Hypothesis to generate schemas with auth_required flag
    - Verify tests include login/logout when auth_required=true
    - **Property 5: Authentication Integration**
    - **Validates: Requirements 6.5**
    - _Requirements: 18.1_
  
  - [x] 4.6 Write property test for AUTO-GENERATED header
    - Use Hypothesis to generate various schemas
    - Verify all generated files contain AUTO-GENERATED header
    - **Property 6: AUTO-GENERATED Header Presence**
    - **Validates: Requirements 12.7, 16.6**
    - _Requirements: 18.1_
  
  - [x] 4.7 Write property test for configuration parsing
    - Use Hypothesis to generate valid configuration dictionaries
    - Verify parsing succeeds without errors
    - **Property 7: Configuration Field Parsing**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
    - _Requirements: 18.1_
  
  - [x] 4.8 Write property test for schema metadata parsing
    - Use Hypothesis to generate valid E2E metadata dictionaries
    - Verify parsing succeeds without errors
    - **Property 8: Schema Metadata Parsing**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.7**
    - _Requirements: 18.1_
  
  - [x] 4.9 Write property test for role-based test generation
    - Use Hypothesis to generate schemas with various roles
    - Verify tests are generated for each role
    - **Property 9: Role-Based Test Generation**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7**
    - _Requirements: 18.1_
  
  - [x] 4.10 Write property test for round-trip verification
    - Use Hypothesis to generate schemas with round_trip scenario
    - Verify generated test creates, reads, and verifies data
    - **Property 10: Round-Trip Data Verification**
    - **Validates: Requirements 14.2, 14.3, 14.4, 14.5, 14.6, 14.7**
    - _Requirements: 18.1_
  
  - [x] 4.11 Write property test for dry-run mode
    - Use Hypothesis to generate various schemas
    - Verify no files are written when dry_run=True
    - **Property 11: Dry-Run Mode**
    - **Validates: Requirements 4.5**
    - _Requirements: 18.1_
  
  - [x] 4.12 Write property test for exit code on success
    - Use Hypothesis to generate valid configurations
    - Verify CLI exits with code 0 on success
    - **Property 12: Exit Code on Success**
    - **Validates: Requirements 4.6**
    - _Requirements: 18.1_
  
  - [x] 4.13 Write property test for exit code on failure
    - Use Hypothesis to generate invalid configurations
    - Verify CLI exits with non-zero code on failure
    - **Property 13: Exit Code on Failure**
    - **Validates: Requirements 4.7**
    - _Requirements: 18.1_
  
  - [x] 4.14 Test with real orb-integration-hub schemas
    - Add E2E metadata to Organizations schema
    - Add E2E metadata to Applications schema
    - Add E2E metadata to Groups schema
    - Run generator on real schemas
    - Verify generated files are correct
    - _Requirements: 18.2_
  
  - [x] 4.15 Verify generated tests run with Playwright
    - Install Playwright in orb-integration-hub
    - Run generated tests for Organizations
    - Run generated tests for Applications
    - Run generated tests for Groups
    - Fix any runtime issues
    - _Requirements: 18.2_
  
  - [x] 4.16 Fix bugs and edge cases
    - Test with schemas missing optional fields
    - Test with schemas with nested objects
    - Test with schemas with array fields
    - Test with schemas with enum fields
    - Fix any discovered issues
    - _Requirements: 18.1, 18.2_
  
  - [x] 4.17 Optimize template output
    - Review generated code for readability
    - Remove unnecessary whitespace
    - Ensure consistent formatting
    - Add helpful comments
    - _Requirements: 18.2_

- [-] 5. Phase 5: Integration Preparation and Documentation
  - [x] 5.1 Create comprehensive README documentation
    - Create `tools/e2e_generator/README.md`
    - Document installation requirements (Playwright, TypeScript)
    - Document configuration options in schema-generator.yml
    - Document schema metadata format for E2E tests
    - Document CLI usage with examples
    - Document generated file structure
    - Document how to run generated tests
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_
  
  - [ ] 5.2 Add usage examples to README
    - Add example schema with E2E metadata
    - Add example configuration file
    - Add example CLI invocations
    - Add example generated test file
    - Add example generated Page Object
    - _Requirements: 15.5_
  
  - [x] 5.3 Document integration steps for orb-schema-generator
    - Document how to copy module to orb-schema-generator
    - Document how to register generator
    - Document how to update CLI
    - Document template location changes
    - Document testing strategy
    - _Requirements: 15.1_
  
  - [ ] 5.4 Create migration guide
    - Document POC to production migration steps
    - Document breaking changes
    - Document configuration changes
    - Document schema metadata changes
    - _Requirements: 15.1_
  
  - [x] 5.5 Update version in __init__.py
    - Set version to 0.1.0 for POC
    - Add version export
    - Add generator class export
    - _Requirements: 16.1, 16.7_
  
  - [x] 5.6 Update CHANGELOG.md
    - Add entry for E2E Test Generator feature
    - Include issue number in changelog entry
    - Follow format: `- Feature description (#issue)`
    - Document all major features added
    - _Requirements: 16.2, 16.3, 16.4, 16.5_
  
  - [x] 5.7 Verify all tests pass
    - Run all unit tests
    - Run all property tests
    - Run all integration tests
    - Verify 90%+ code coverage
    - _Requirements: 18.1_
  
  - [ ] 5.8 Verify no linting errors
    - Run ruff on all Python files
    - Fix any linting issues
    - Run black formatter
    - _Requirements: 18.3_
  
  - [ ] 5.9 Verify no type checking errors
    - Run mypy on all Python files
    - Fix any type errors
    - Add type hints where missing
    - _Requirements: 18.4_
  
  - [ ] 5.10 Verify documentation renders correctly
    - Check README.md in Markdown viewer
    - Verify all links work
    - Verify code blocks are formatted correctly
    - Verify tables render correctly
    - _Requirements: 18.5_
  
  - [ ] 5.11 Commit with conventional commit format
    - Use format: `feat: add E2E Test Generator #<issue>`
    - Reference issue number in commit message
    - Write descriptive commit message
    - _Requirements: 17.1, 17.2, 17.6_
  
  - [ ] 5.12 Final verification checkpoint
    - Ensure all tests pass
    - Ensure generated tests run successfully with Playwright
    - Ensure no linting or type errors
    - Ensure documentation is complete
    - Ensure CHANGELOG is updated
    - Ensure version is bumped
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7_

## Notes

- All tasks are required (no optional tasks per user specification)
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from design
- Integration tests verify end-to-end workflow
- Generated tests must be syntactically valid and runnable with Playwright
- Follow orb-schema-generator architecture patterns for easy future integration
- Use Jinja2 templates for all code generation
- Include AUTO-GENERATED headers in all generated files
- Support dry-run mode for previewing operations
- Exit with code 0 on success, non-zero on failure
