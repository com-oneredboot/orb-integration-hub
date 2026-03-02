# Integration Guide: E2E Test Generator → orb-schema-generator

This document provides step-by-step instructions for integrating the E2E Test Generator POC into the `orb-schema-generator` package.

## Overview

The E2E Test Generator was developed as a POC in `orb-integration-hub` and is designed for easy integration into `orb-schema-generator`. This guide covers the migration process, architectural considerations, and testing strategy.

## Prerequisites

- Access to `orb-schema-generator` repository
- Python 3.8+ development environment
- Understanding of orb-schema-generator architecture

## Integration Steps

### Step 1: Copy Module Files

Copy the E2E generator module to orb-schema-generator:

```bash
# From orb-integration-hub root
cp -r tools/e2e_generator/ ../orb-schema-generator/src/generators/e2e/
```

**Files to copy:**
```
tools/e2e_generator/
├── __init__.py
├── __main__.py
├── base.py
├── config.py
├── schema_loader.py
├── playwright_generator.py
├── templates/
│   ├── test.spec.ts.j2
│   ├── page_object.ts.j2
│   ├── auth_helper.ts.j2
│   ├── fixtures.ts.j2
│   ├── playwright_config.ts.j2
│   └── utils.ts.j2
└── tests/
    ├── test_config.py
    ├── test_schema_loader.py
    ├── test_base_generator.py
    ├── test_playwright_generator.py
    ├── test_templates.py
    ├── test_integration.py
    ├── test_cli.py
    └── test_properties.py
```

### Step 2: Update Import Paths

Update import statements to match orb-schema-generator structure:

**Before (POC):**
```python
from ..playwright_generator import PlaywrightGenerator
from ..config import E2EConfig
```

**After (orb-schema-generator):**
```python
from orb_schema_generator.generators.e2e.playwright_generator import PlaywrightGenerator
from orb_schema_generator.generators.e2e.config import E2EConfig
```

### Step 3: Register Generator in CLI

Add E2E generator to the main CLI in `orb_schema_generator/cli.py`:

```python
from orb_schema_generator.generators.e2e.playwright_generator import PlaywrightGenerator

def generate_command(config_path: str, schema_filter: Optional[str] = None):
    """Main generate command."""
    config = load_config(config_path)
    
    # ... existing generators ...
    
    # E2E Test Generator
    if config.output.testing.e2e.enabled:
        e2e_generator = PlaywrightGenerator(config)
        e2e_generator.generate(schema_filter=schema_filter)
```

### Step 4: Update Configuration Schema

Add E2E testing configuration to orb-schema-generator's config schema:

```python
# orb_schema_generator/config.py

@dataclass
class TestingConfig:
    """Testing output configuration."""
    e2e: E2ETestingConfig = field(default_factory=E2ETestingConfig)

@dataclass
class OutputConfig:
    """Output configuration."""
    code: CodeConfig
    infrastructure: InfrastructureConfig
    testing: TestingConfig = field(default_factory=TestingConfig)
```

### Step 5: Update Template Paths

Ensure template paths are relative to the package:

```python
# playwright_generator.py

def __init__(self, config: E2EConfig, dry_run: bool = False):
    # Get template directory relative to this file
    template_dir = Path(__file__).parent / "templates"
    self.jinja_env = Environment(
        loader=FileSystemLoader(str(template_dir)),
        autoescape=False,
        trim_blocks=True,
        lstrip_blocks=True,
    )
```

### Step 6: Add Dependencies

Update `pyproject.toml` or `setup.py` to include E2E generator dependencies:

```toml
[tool.poetry.dependencies]
python = "^3.8"
pyyaml = "^6.0"
jinja2 = "^3.1"
# ... existing dependencies
```

### Step 7: Update Package Exports

Export E2E generator classes in `__init__.py`:

```python
# orb_schema_generator/generators/e2e/__init__.py

from .playwright_generator import PlaywrightGenerator
from .config import E2EConfig, E2ETestingConfig
from .schema_loader import SchemaLoader, E2EMetadata

__all__ = [
    "PlaywrightGenerator",
    "E2EConfig",
    "E2ETestingConfig",
    "SchemaLoader",
    "E2EMetadata",
]
```

### Step 8: Run Tests

Execute the test suite to verify integration:

```bash
cd orb-schema-generator
pytest src/generators/e2e/tests/ -v
```

**Expected results:**
- All unit tests pass
- All property tests pass
- All integration tests pass
- Code coverage > 90%

### Step 9: Update Documentation

Add E2E generator documentation to orb-schema-generator docs:

1. Update main README with E2E generation section
2. Add E2E generator to feature list
3. Include configuration examples
4. Document CLI usage

### Step 10: Version and Release

1. Bump orb-schema-generator version (e.g., 2.1.0)
2. Update CHANGELOG.md with E2E generator feature
3. Create release notes
4. Publish to CodeArtifact

## Architectural Considerations

### Generator Pattern

The E2E generator follows the same pattern as other orb-schema-generator generators:

1. **Configuration Loading**: Read from `schema-generator.yml`
2. **Schema Loading**: Load and parse YAML schemas
3. **Template Rendering**: Use Jinja2 for code generation
4. **File Writing**: Write generated files with AUTO-GENERATED headers

### Template System

Templates use Jinja2 with custom filters:

- `camelCase` - Convert to camelCase
- `pascalCase` - Convert to PascalCase
- `lower` - Convert to lowercase

### Dry-Run Mode

The generator supports dry-run mode for previewing operations without writing files. This is consistent with other orb-schema-generator generators.

### Version Tracking

Generated files include version information in headers:

```typescript
// AUTO-GENERATED by e2e-test-generator v0.1.0 - DO NOT EDIT
```

## Testing Strategy

### Unit Tests

Test individual components in isolation:

- Configuration loading
- Schema loading
- Template rendering
- File writing
- Case conversion filters

### Property Tests

Use Hypothesis for property-based testing:

- Schema filtering correctness
- Scenario generation completeness
- Attribute form field generation
- Page Object completeness
- Authentication integration
- AUTO-GENERATED header presence

### Integration Tests

Test end-to-end workflow:

- Full generation pipeline
- File organization
- TypeScript syntax validity
- Template rendering with real data

### Coverage Goals

- Unit test coverage: > 90%
- Property test coverage: All critical properties
- Integration test coverage: All workflows

## Migration Checklist

- [ ] Copy module files to orb-schema-generator
- [ ] Update import paths
- [ ] Register generator in CLI
- [ ] Update configuration schema
- [ ] Update template paths
- [ ] Add dependencies to pyproject.toml
- [ ] Update package exports
- [ ] Run test suite
- [ ] Update documentation
- [ ] Bump version
- [ ] Update CHANGELOG
- [ ] Create release notes
- [ ] Publish to CodeArtifact

## Breaking Changes

### None Expected

The E2E generator is a new feature and should not introduce breaking changes to existing orb-schema-generator functionality.

### Configuration Changes

New configuration section added:

```yaml
output:
  testing:
    e2e:
      enabled: true
      # ... configuration options
```

This is additive and does not affect existing configurations.

## Rollback Plan

If issues arise after integration:

1. Disable E2E generation in configuration:
   ```yaml
   output:
     testing:
       e2e:
         enabled: false
   ```

2. Revert orb-schema-generator to previous version

3. Remove E2E generator module

## Support and Maintenance

### Ownership

The E2E generator will be maintained by the orb-schema-generator team after integration.

### Issue Tracking

Issues should be filed in the orb-schema-generator repository with the `e2e-generator` label.

### Future Enhancements

Potential future improvements:

- Support for additional testing frameworks (Cypress, TestCafe)
- Advanced Page Object patterns (component composition)
- Visual regression testing integration
- API mocking and stubbing
- Test data generation strategies
- Parallel test execution optimization
- Custom assertion libraries
- Screenshot comparison
- Accessibility testing integration

## Contact

For questions or assistance with integration:

- orb-schema-generator team
- orb-integration-hub team (POC developers)

## References

- [orb-schema-generator Documentation](https://github.com/com-oneredboot/orb-schema-generator)
- [Playwright Documentation](https://playwright.dev/)
- [Jinja2 Documentation](https://jinja.palletsprojects.com/)
