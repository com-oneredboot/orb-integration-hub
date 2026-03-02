# E2E Test Generator

Automated Playwright E2E test generation from YAML schema definitions.

## Overview

The E2E Test Generator is a Python tool that reads YAML schema files and automatically generates Playwright end-to-end tests in TypeScript. It creates complete test suites including test files, Page Object Models, authentication helpers, fixtures, and configuration.

## Features

- **Schema-Driven Generation**: Define E2E test requirements directly in your schema YAML files
- **Multiple Test Scenarios**: Supports create, read, update, delete, list, pagination, filter, detail, and round-trip scenarios
- **Page Object Pattern**: Automatically generates Page Object Models for maintainable tests
- **Authentication Integration**: Built-in Cognito authentication support
- **Role-Based Testing**: Generate tests for different user roles (OWNER, EMPLOYEE, CUSTOMER)
- **Dry-Run Mode**: Preview generated files without writing to disk
- **AUTO-GENERATED Headers**: All generated files include headers to prevent manual editing

## Installation Requirements

### Python Dependencies

The generator requires Python 3.8+ and the following packages:

```bash
pip install pyyaml jinja2
```

### Frontend Dependencies

The generated tests require:

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

## Configuration

### schema-generator.yml

Add E2E testing configuration to your `schema-generator.yml`:

```yaml
output:
  testing:
    e2e:
      enabled: true
      framework: playwright
      base_dir: ./apps/web/e2e
      tests_subdir: tests
      page_objects_subdir: page-objects
      fixtures_subdir: fixtures
      config_file: playwright.config.ts
```

**Configuration Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable E2E test generation |
| `framework` | string | `"playwright"` | Testing framework (currently only Playwright) |
| `base_dir` | string | `"./e2e"` | Base directory for E2E tests |
| `tests_subdir` | string | `"tests"` | Subdirectory for test files |
| `page_objects_subdir` | string | `"page-objects"` | Subdirectory for Page Objects |
| `fixtures_subdir` | string | `"fixtures"` | Subdirectory for test fixtures |
| `config_file` | string | `"playwright.config.ts"` | Playwright configuration filename |

## Schema Metadata Format

Add E2E metadata to your schema YAML files:

```yaml
# schemas/tables/Organizations.yml
name: Organizations
type: dynamodb
model:
  attributes:
    organizationId:
      type: string
      required: true
    name:
      type: string
      required: true
    # ... other attributes

e2e:
  enabled: true
  auth_required: true
  scenarios:
    - create
    - read
    - update
    - delete
    - list
    - detail
    - round_trip
  roles:
    - OWNER
    - EMPLOYEE
  page_object: OrganizationsPage
  routes:
    list: /organizations
    detail: /organizations/:id
    create: /organizations/new
  test_data:
    name: "Test Organization"
    description: "E2E test organization"
    status: "ACTIVE"
```

**E2E Metadata Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `enabled` | boolean | No | Enable E2E test generation for this schema (default: true) |
| `auth_required` | boolean | No | Whether tests require authentication (default: true) |
| `scenarios` | array | Yes | List of test scenarios to generate |
| `roles` | array | No | User roles to test with |
| `page_object` | string | No | Custom Page Object class name (default: `{SchemaName}Page`) |
| `routes` | object | Yes | URL routes for list, detail, and create pages |
| `test_data` | object | No | Default test data values |

**Available Scenarios:**

- `create` - Test creating a new resource
- `read` - Test reading resource details
- `update` - Test updating an existing resource
- `delete` - Test deleting a resource
- `list` - Test displaying resource list
- `pagination` - Test list pagination
- `filter` - Test list filtering
- `detail` - Test detail page display
- `round_trip` - Test create-read data preservation

## CLI Usage

### Basic Usage

```bash
python -m tools.e2e_generator generate --config schema-generator.yml
```

### Command-Line Options

| Option | Description |
|--------|-------------|
| `--config PATH` | Path to configuration file (default: `schema-generator.yml`) |
| `--schema NAME` | Generate tests for a single schema only |
| `--dry-run` | Preview operations without writing files |
| `--verbose` | Enable debug logging |

### Examples

**Generate all E2E tests:**
```bash
python -m tools.e2e_generator generate --config schema-generator.yml
```

**Generate tests for a single schema:**
```bash
python -m tools.e2e_generator generate --config schema-generator.yml --schema Organizations
```

**Preview without writing files:**
```bash
python -m tools.e2e_generator generate --config schema-generator.yml --dry-run
```

**Enable verbose logging:**
```bash
python -m tools.e2e_generator generate --config schema-generator.yml --verbose
```

## Generated File Structure

```
apps/web/e2e/
├── playwright.config.ts          # Playwright configuration
├── auth/
│   └── cognito.ts                # Cognito authentication helper
├── fixtures/
│   └── index.ts                  # Test fixtures and data setup
├── utils/
│   └── index.ts                  # Utility functions
├── tests/
│   ├── organizations.spec.ts     # Generated test file
│   ├── applications.spec.ts
│   └── ...
└── page-objects/
    ├── organizations.page.ts     # Generated Page Object
    ├── applications.page.ts
    └── ...
```

## Running Generated Tests

### Prerequisites

1. Start your development server:
   ```bash
   npm start
   ```

2. Set environment variables:
   ```bash
   export TEST_USER_EMAIL="test@example.com"
   export TEST_USER_PASSWORD="password123"
   export BASE_URL="http://localhost:4200"
   ```

### Run Tests

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test e2e/tests/organizations.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run in debug mode
npx playwright test --debug

# Run specific browser
npx playwright test --project=chromium
```

### View Test Report

```bash
npx playwright show-report
```

## Customization

### Modifying Templates

Templates are located in `tools/e2e_generator/templates/`:

- `test.spec.ts.j2` - Test file template
- `page_object.ts.j2` - Page Object Model template
- `auth_helper.ts.j2` - Authentication helper template
- `fixtures.ts.j2` - Test fixtures template
- `playwright_config.ts.j2` - Playwright configuration template
- `utils.ts.j2` - Utility functions template

**Note:** After modifying templates, regenerate tests to apply changes.

### Custom Page Object Names

Specify a custom Page Object class name in schema metadata:

```yaml
e2e:
  page_object: CustomOrganizationsPage
```

### Custom Test Data

Provide default test data values:

```yaml
e2e:
  test_data:
    name: "Custom Test Name"
    description: "Custom description"
    status: "ACTIVE"
```

## Integration with orb-schema-generator

This tool is designed as a POC for integration into `orb-schema-generator`. To integrate:

1. Copy the `tools/e2e_generator/` directory to `orb-schema-generator/src/generators/e2e/`
2. Register the generator in the main CLI
3. Update template paths to match orb-schema-generator structure
4. Add E2E generation to the main generation workflow

See `INTEGRATION.md` for detailed integration steps.

## Troubleshooting

### Tests Not Generated

**Problem:** No test files are created.

**Solutions:**
- Verify `e2e.enabled: true` in schema YAML
- Check that `output.testing.e2e.enabled: true` in config
- Ensure schema has `e2e` section with required fields
- Run with `--verbose` to see detailed logs

### TypeScript Compilation Errors

**Problem:** Generated TypeScript files have compilation errors.

**Solutions:**
- Ensure `@playwright/test` is installed
- Check that Page Object locators match your UI
- Verify import paths are correct
- Run `npx tsc --noEmit` to check for errors

### Tests Fail at Runtime

**Problem:** Tests fail when executed.

**Solutions:**
- Verify development server is running
- Check environment variables are set
- Ensure authentication credentials are valid
- Update Page Object locators to match actual UI
- Check that routes in schema match actual URLs

### AUTO-GENERATED Files Modified

**Problem:** Generated files were manually edited and changes are lost.

**Solutions:**
- Never edit files with AUTO-GENERATED headers
- Customize via templates or schema metadata instead
- Use `--dry-run` to preview before regenerating

## Development

### Running Tests

```bash
# Run all tests
pytest tools/e2e_generator/tests/

# Run specific test file
pytest tools/e2e_generator/tests/test_playwright_generator.py

# Run with coverage
pytest tools/e2e_generator/tests/ --cov=tools/e2e_generator

# Run property tests
pytest tools/e2e_generator/tests/test_properties.py -v
```

### Code Quality

```bash
# Format code
black tools/e2e_generator/

# Lint code
ruff check tools/e2e_generator/

# Type check
mypy tools/e2e_generator/
```

## Version History

### v0.1.0 (POC)

- Initial implementation
- Schema-driven test generation
- Page Object Model generation
- Authentication integration
- Multiple test scenarios
- Dry-run mode
- Property-based testing

## License

Copyright © 2026 orb-integration-hub

## Support

For issues or questions, please contact the orb-integration-hub team.
