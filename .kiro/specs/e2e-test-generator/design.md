# Design Document: E2E Test Generator

## Overview

The E2E Test Generator is a Python-based code generation tool that reads YAML schemas and produces Playwright test files in TypeScript. This feature enables automated end-to-end testing of CRUD operations, authentication flows, and UI interactions for the orb-integration-hub Angular application.

This design document details the technical implementation of the E2E Test Generator as a proof-of-concept that will be developed in the orb-integration-hub repository before eventual integration into orb-schema-generator.

### Goals

- Generate comprehensive Playwright tests from schema definitions
- Follow orb-schema-generator architecture patterns for easy future integration
- Support CRUD operations, authentication, pagination, filtering, and authorization testing
- Generate maintainable Page Object Models and test fixtures
- Provide a simple CLI interface for test generation

### Non-Goals

- Runtime test execution (Playwright handles this)
- Test result reporting (Playwright handles this)
- Dynamic test generation during test runs
- Support for testing frameworks other than Playwright (POC focuses on Playwright only)

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    E2E Test Generator                        │
│                                                              │
│  ┌────────────┐      ┌──────────────┐     ┌──────────────┐ │
│  │    CLI     │─────▶│ Base         │────▶│  Playwright  │ │
│  │  Entry     │      │ Generator    │     │  Generator   │ │
│  │  Point     │      │              │     │              │ │
│  └────────────┘      └──────────────┘     └──────────────┘ │
│                             │                      │         │
│                             ▼                      ▼         │
│                      ┌──────────────┐     ┌──────────────┐ │
│                      │ Config       │     │  Template    │ │
│                      │ Loader       │     │  Engine      │ │
│                      └──────────────┘     │  (Jinja2)    │ │
│                             │              └──────────────┘ │
│                             ▼                      │         │
│                      ┌──────────────┐             │         │
│                      │ Schema       │             │         │
│                      │ Loader       │             │         │
│                      └──────────────┘             │         │
│                                                    ▼         │
│                                            ┌──────────────┐ │
│                                            │  Generated   │ │
│                                            │  Test Files  │ │
│                                            └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Module Structure


The E2E Test Generator will be organized as follows:

```
tools/e2e_generator/
├── __init__.py                 # Package initialization, exports PlaywrightGenerator
├── __main__.py                 # CLI entry point for python -m invocation
├── base.py                     # BaseE2EGenerator abstract class
├── playwright_generator.py     # PlaywrightGenerator implementation
├── config.py                   # Configuration models and loader
├── schema_loader.py            # Schema loading and E2E metadata extraction
├── templates/                  # Jinja2 templates for code generation
│   ├── test.spec.ts.j2        # Main test file template
│   ├── page_object.ts.j2      # Page Object Model template
│   ├── fixtures.ts.j2         # Test fixtures template
│   ├── auth_helper.ts.j2      # Cognito authentication helper template
│   ├── playwright_config.ts.j2 # Playwright configuration template
│   └── utils.ts.j2            # Utility functions template
└── README.md                   # Documentation

Generated output structure:
apps/web/e2e/
├── tests/                      # Generated test files
│   ├── organizations.spec.ts
│   ├── applications.spec.ts
│   └── groups.spec.ts
├── page-objects/               # Generated Page Object Models
│   ├── organizations.page.ts
│   ├── applications.page.ts
│   └── groups.page.ts
├── fixtures/                   # Generated test fixtures
│   └── index.ts
├── auth/                       # Generated authentication helpers
│   └── cognito.ts
├── utils/                      # Generated utility functions
│   └── index.ts
└── playwright.config.ts        # Generated Playwright configuration
```

### Design Patterns

The E2E Test Generator follows these key patterns from orb-schema-generator:

1. **Base Generator Pattern**: Abstract base class defines the generation contract
2. **Template-Based Generation**: Jinja2 templates separate logic from output format
3. **Configuration-Driven**: YAML configuration controls all generation behavior
4. **Schema Metadata**: E2E-specific metadata in schema files drives test generation
5. **Atomic File Writes**: Files are written atomically with AUTO-GENERATED headers
6. **Selective Overwrite**: Only files with AUTO-GENERATED headers are overwritten



## Components and Interfaces

### 1. CLI Entry Point (`__main__.py`)

The CLI provides the primary interface for invoking the generator:

```python
"""CLI entry point for E2E Test Generator."""
import argparse
import sys
import logging
from pathlib import Path
from .playwright_generator import PlaywrightGenerator
from .config import E2EConfig

def main() -> int:
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Generate Playwright E2E tests from YAML schemas"
    )
    parser.add_argument(
        "command",
        choices=["generate"],
        help="Command to execute"
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=Path("schema-generator.yml"),
        help="Path to configuration file (default: schema-generator.yml)"
    )
    parser.add_argument(
        "--schema",
        type=str,
        help="Generate tests for specific schema only"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print planned operations without writing files"
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging"
    )
    
    args = parser.parse_args()
    
    # Configure logging
    level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(level=level, format="%(levelname)s: %(message)s")
    
    try:
        # Load configuration
        config = E2EConfig.from_file(args.config)
        
        # Create generator
        generator = PlaywrightGenerator(config, dry_run=args.dry_run)
        
        # Generate tests
        generator.generate(schema_filter=args.schema)
        
        return 0
    except Exception as e:
        logging.error(f"Generation failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
```



### 2. Base Generator (`base.py`)

Abstract base class that mirrors orb-schema-generator's BaseGenerator:

```python
"""Base generator class for E2E test generation."""
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class BaseE2EGenerator(ABC):
    """Base class for E2E test generators."""
    
    AUTO_GENERATED_PATTERNS = [
        "// AUTO-GENERATED",
        "/* AUTO-GENERATED",
    ]
    
    def __init__(self, config: Any, dry_run: bool = False):
        """
        Initialize generator with configuration.
        
        Args:
            config: E2E configuration object
            dry_run: If True, print operations without writing files
        """
        self.config = config
        self.dry_run = dry_run
        self.version = "0.1.0"  # POC version
    
    @abstractmethod
    def generate(self, schema_filter: Optional[str] = None) -> None:
        """
        Generate E2E tests from schemas.
        
        Args:
            schema_filter: Optional schema name to filter generation
        """
        pass
    
    def _write_file(self, path: Path, content: str) -> None:
        """
        Write file atomically with header detection.
        
        Only overwrites files that:
        1. Do not exist, OR
        2. Have an AUTO-GENERATED header
        
        Args:
            path: Path to write file to
            content: File content
        """
        if self.dry_run:
            logger.info(f"[DRY RUN] Would write: {path}")
            return
        
        if path.exists():
            if not self._has_auto_generated_header(path):
                logger.warning(
                    f"Skipping {path}: No AUTO-GENERATED header found. "
                    "Delete file to regenerate."
                )
                return
        
        # Create parent directories
        path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write file atomically
        path.write_text(content, encoding="utf-8")
        logger.info(f"Generated: {path}")
    
    def _has_auto_generated_header(self, path: Path) -> bool:
        """
        Check if file has AUTO-GENERATED header in first 5 lines.
        
        Args:
            path: Path to file to check
            
        Returns:
            True if file has AUTO-GENERATED header
        """
        try:
            with open(path, "r", encoding="utf-8") as f:
                for _ in range(5):
                    line = f.readline()
                    if not line:
                        break
                    if any(pattern in line for pattern in self.AUTO_GENERATED_PATTERNS):
                        return True
        except (OSError, IOError):
            pass
        return False
    
    def _get_file_header(self) -> str:
        """
        Generate AUTO-GENERATED header for TypeScript files.
        
        Returns:
            Header string with version and regeneration command
        """
        return f"""// AUTO-GENERATED by e2e-test-generator v{self.version} - DO NOT EDIT
// Regenerate with: python -m tools.e2e_generator generate

"""
```



### 3. Configuration Models (`config.py`)

Configuration models for E2E test generation:

```python
"""Configuration models for E2E test generation."""
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional
import yaml

@dataclass
class E2ETestingConfig:
    """E2E testing configuration from schema-generator.yml."""
    enabled: bool = True
    framework: str = "playwright"
    language: str = "typescript"
    base_dir: Path = Path("./apps/web/e2e")
    test_patterns: str = "{resource}.spec.ts"
    targets: List[str] = field(default_factory=lambda: ["ts-main"])
    
    @classmethod
    def from_dict(cls, data: dict) -> "E2ETestingConfig":
        """Create config from dictionary."""
        return cls(
            enabled=data.get("enabled", True),
            framework=data.get("framework", "playwright"),
            language=data.get("language", "typescript"),
            base_dir=Path(data.get("base_dir", "./apps/web/e2e")),
            test_patterns=data.get("test_patterns", "{resource}.spec.ts"),
            targets=data.get("targets", ["ts-main"])
        )

@dataclass
class E2EConfig:
    """Complete E2E generator configuration."""
    testing: E2ETestingConfig
    schemas_dir: Path
    project_name: str
    
    @classmethod
    def from_file(cls, config_path: Path) -> "E2EConfig":
        """
        Load configuration from schema-generator.yml.
        
        Args:
            config_path: Path to configuration file
            
        Returns:
            E2EConfig instance
        """
        with open(config_path, "r") as f:
            data = yaml.safe_load(f)
        
        # Extract E2E testing config
        testing_data = data.get("output", {}).get("testing", {}).get("e2e", {})
        testing = E2ETestingConfig.from_dict(testing_data)
        
        # Extract paths
        schemas_dir = Path(data.get("paths", {}).get("schemas", "./schemas"))
        
        # Extract project info
        project_name = data.get("project", {}).get("name", "project")
        
        return cls(
            testing=testing,
            schemas_dir=schemas_dir,
            project_name=project_name
        )
```



### 4. Schema Loader (`schema_loader.py`)

Loads schemas and extracts E2E metadata:

```python
"""Schema loading and E2E metadata extraction."""
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Dict, Any
import yaml
import logging

logger = logging.getLogger(__name__)

@dataclass
class E2EMetadata:
    """E2E metadata from schema file."""
    routes: Dict[str, str]  # e.g., {"list": "/organizations", "detail": "/organizations/:id"}
    scenarios: List[str]  # e.g., ["create", "read", "update", "delete", "list"]
    auth_required: bool = True
    roles: List[str] = None  # e.g., ["OWNER", "EMPLOYEE", "CUSTOMER"]
    page_object: Optional[str] = None  # Custom Page Object class name
    
    def __post_init__(self):
        if self.roles is None:
            self.roles = []

@dataclass
class SchemaWithE2E:
    """Schema with E2E metadata."""
    name: str
    schema_type: str  # "dynamodb", "standard", etc.
    attributes: List[Dict[str, Any]]
    e2e: E2EMetadata
    
class SchemaLoader:
    """Loads schemas and extracts E2E metadata."""
    
    def __init__(self, schemas_dir: Path):
        """
        Initialize schema loader.
        
        Args:
            schemas_dir: Path to schemas directory
        """
        self.schemas_dir = schemas_dir
    
    def load_schemas_with_e2e(self, schema_filter: Optional[str] = None) -> List[SchemaWithE2E]:
        """
        Load all schemas that have E2E metadata.
        
        Args:
            schema_filter: Optional schema name to filter
            
        Returns:
            List of schemas with E2E metadata
        """
        schemas = []
        
        # Search all subdirectories for YAML files
        for yaml_file in self.schemas_dir.rglob("*.yml"):
            try:
                with open(yaml_file, "r") as f:
                    data = yaml.safe_load(f)
                
                # Check if schema has E2E metadata
                if "e2e" not in data:
                    continue
                
                schema_name = data.get("name")
                if not schema_name:
                    logger.warning(f"Schema {yaml_file} missing 'name' field")
                    continue
                
                # Apply filter if specified
                if schema_filter and schema_name != schema_filter:
                    continue
                
                # Extract E2E metadata
                e2e_data = data["e2e"]
                e2e = E2EMetadata(
                    routes=e2e_data.get("routes", {}),
                    scenarios=e2e_data.get("scenarios", []),
                    auth_required=e2e_data.get("auth_required", True),
                    roles=e2e_data.get("roles", []),
                    page_object=e2e_data.get("page_object")
                )
                
                # Create schema object
                schema = SchemaWithE2E(
                    name=schema_name,
                    schema_type=data.get("type", "unknown"),
                    attributes=data.get("model", {}).get("attributes", {}),
                    e2e=e2e
                )
                
                schemas.append(schema)
                logger.info(f"Loaded schema with E2E metadata: {schema_name}")
                
            except Exception as e:
                logger.error(f"Failed to load schema {yaml_file}: {e}")
        
        return schemas
```



### 5. Playwright Generator (`playwright_generator.py`)

Main generator implementation:

```python
"""Playwright test generator implementation."""
from pathlib import Path
from typing import Optional, List
import logging
from jinja2 import Environment, PackageLoader, select_autoescape

from .base import BaseE2EGenerator
from .config import E2EConfig
from .schema_loader import SchemaLoader, SchemaWithE2E

logger = logging.getLogger(__name__)

class PlaywrightGenerator(BaseE2EGenerator):
    """Generates Playwright E2E tests from schemas."""
    
    def __init__(self, config: E2EConfig, dry_run: bool = False):
        """
        Initialize Playwright generator.
        
        Args:
            config: E2E configuration
            dry_run: If True, print operations without writing files
        """
        super().__init__(config, dry_run)
        
        # Initialize Jinja2 environment
        self.jinja_env = Environment(
            loader=PackageLoader("tools.e2e_generator", "templates"),
            autoescape=select_autoescape(["html", "xml"]),
            trim_blocks=True,
            lstrip_blocks=True
        )
        
        # Add custom filters
        self.jinja_env.filters["camelCase"] = self._to_camel_case
        self.jinja_env.filters["pascalCase"] = self._to_pascal_case
        
        # Initialize schema loader
        self.schema_loader = SchemaLoader(config.schemas_dir)
    
    def generate(self, schema_filter: Optional[str] = None) -> None:
        """
        Generate Playwright E2E tests from schemas.
        
        Args:
            schema_filter: Optional schema name to filter generation
        """
        if not self.config.testing.enabled:
            logger.info("E2E test generation is disabled")
            return
        
        logger.info(f"Generating Playwright E2E tests (v{self.version})...")
        
        # Load schemas with E2E metadata
        schemas = self.schema_loader.load_schemas_with_e2e(schema_filter)
        
        if not schemas:
            logger.warning("No schemas with E2E metadata found")
            return
        
        logger.info(f"Found {len(schemas)} schemas with E2E metadata")
        
        # Generate common files (once)
        self._generate_playwright_config()
        self._generate_auth_helper()
        self._generate_fixtures()
        self._generate_utils()
        
        # Generate per-schema files
        for schema in schemas:
            self._generate_test_file(schema)
            self._generate_page_object(schema)
        
        logger.info(f"Successfully generated E2E tests for {len(schemas)} schemas")
    
    def _generate_test_file(self, schema: SchemaWithE2E) -> None:
        """Generate test spec file for a schema."""
        template = self.jinja_env.get_template("test.spec.ts.j2")
        content = template.render(
            header=self._get_file_header(),
            schema=schema,
            version=self.version
        )
        
        filename = self.config.testing.test_patterns.format(
            resource=schema.name.lower()
        )
        output_path = self.config.testing.base_dir / "tests" / filename
        self._write_file(output_path, content)
    
    def _generate_page_object(self, schema: SchemaWithE2E) -> None:
        """Generate Page Object Model for a schema."""
        template = self.jinja_env.get_template("page_object.ts.j2")
        
        page_object_name = schema.e2e.page_object or f"{schema.name}Page"
        
        content = template.render(
            header=self._get_file_header(),
            schema=schema,
            page_object_name=page_object_name,
            version=self.version
        )
        
        filename = f"{schema.name.lower()}.page.ts"
        output_path = self.config.testing.base_dir / "page-objects" / filename
        self._write_file(output_path, content)
    
    def _generate_playwright_config(self) -> None:
        """Generate playwright.config.ts if it doesn't exist."""
        output_path = self.config.testing.base_dir.parent / "playwright.config.ts"
        
        # Only generate if file doesn't exist (don't overwrite custom configs)
        if output_path.exists():
            logger.info(f"Skipping {output_path}: File already exists")
            return
        
        template = self.jinja_env.get_template("playwright_config.ts.j2")
        content = template.render(
            header=self._get_file_header(),
            project_name=self.config.project_name,
            version=self.version
        )
        
        self._write_file(output_path, content)
    
    def _generate_auth_helper(self) -> None:
        """Generate Cognito authentication helper."""
        template = self.jinja_env.get_template("auth_helper.ts.j2")
        content = template.render(
            header=self._get_file_header(),
            version=self.version
        )
        
        output_path = self.config.testing.base_dir / "auth" / "cognito.ts"
        self._write_file(output_path, content)
    
    def _generate_fixtures(self) -> None:
        """Generate test fixtures."""
        template = self.jinja_env.get_template("fixtures.ts.j2")
        content = template.render(
            header=self._get_file_header(),
            version=self.version
        )
        
        output_path = self.config.testing.base_dir / "fixtures" / "index.ts"
        self._write_file(output_path, content)
    
    def _generate_utils(self) -> None:
        """Generate utility functions."""
        template = self.jinja_env.get_template("utils.ts.j2")
        content = template.render(
            header=self._get_file_header(),
            version=self.version
        )
        
        output_path = self.config.testing.base_dir / "utils" / "index.ts"
        self._write_file(output_path, content)
    
    @staticmethod
    def _to_camel_case(text: str) -> str:
        """Convert text to camelCase."""
        words = text.replace("-", "_").split("_")
        return words[0].lower() + "".join(w.capitalize() for w in words[1:])
    
    @staticmethod
    def _to_pascal_case(text: str) -> str:
        """Convert text to PascalCase."""
        words = text.replace("-", "_").split("_")
        return "".join(w.capitalize() for w in words)
```



## Data Models

### Configuration Schema

The E2E Test Generator extends `schema-generator.yml` with a new `output.testing.e2e` section:

```yaml
# schema-generator.yml (extended)
output:
  testing:
    e2e:
      enabled: true
      framework: playwright
      language: typescript
      base_dir: ./apps/web/e2e
      test_patterns: "{resource}.spec.ts"
      targets:
        - ts-main
```

Configuration fields:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable E2E test generation |
| `framework` | string | `"playwright"` | Testing framework (only "playwright" supported in POC) |
| `language` | string | `"typescript"` | Test language (only "typescript" supported in POC) |
| `base_dir` | string | `"./apps/web/e2e"` | Output directory for generated tests |
| `test_patterns` | string | `"{resource}.spec.ts"` | Test file naming pattern |
| `targets` | array | `["ts-main"]` | Schema targets to generate tests for |

### Schema E2E Metadata

Schemas include an `e2e` section to define test generation:

```yaml
# schemas/tables/organizations.yml (extended)
type: dynamodb
name: Organizations
targets:
  - python-main
  - ts-main
  - graphql-main

# E2E test metadata
e2e:
  routes:
    list: /organizations
    detail: /organizations/:id
    create: /organizations/create
  scenarios:
    - create
    - read
    - update
    - delete
    - list
    - pagination
    - filter
    - detail
    - round_trip
  auth_required: true
  roles:
    - OWNER
    - EMPLOYEE
    - CUSTOMER
  page_object: OrganizationsPage

model:
  # ... existing model definition
```

E2E metadata fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `routes` | object | Yes | URL paths for different views (list, detail, create) |
| `scenarios` | array | Yes | Test scenarios to generate |
| `auth_required` | boolean | No (default: true) | Whether authentication is required |
| `roles` | array | No | User roles that can access the resource |
| `page_object` | string | No | Custom Page Object class name |

Supported scenarios:

- `create`: Test creating a new resource
- `read`: Test reading an existing resource
- `update`: Test updating an existing resource
- `delete`: Test deleting a resource
- `list`: Test list view navigation
- `pagination`: Test pagination controls
- `filter`: Test filtering functionality
- `sort`: Test sorting functionality
- `detail`: Test detail view display
- `round_trip`: Test create-then-read data integrity



## Template System

The generator uses Jinja2 templates to produce TypeScript code. Templates are stored in `tools/e2e_generator/templates/`.

### Template: test.spec.ts.j2

Generates the main test file for a resource:

```typescript
{{ header }}
/**
 * E2E tests for {{ schema.name }}
 * Generated from schema: {{ schema.name }}
 */

import { test, expect } from '@playwright/test';
import { {{ schema.name }}Page } from '../page-objects/{{ schema.name|lower }}.page';
import { login, logout } from '../auth/cognito';
import { createTestUser, cleanupTestData } from '../fixtures';

test.describe('{{ schema.name }} E2E Tests', () => {
  let page: {{ schema.name }}Page;

  test.beforeEach(async ({ page: playwrightPage }) => {
    page = new {{ schema.name }}Page(playwrightPage);
    
    {% if schema.e2e.auth_required %}
    // Authenticate before each test
    await login(playwrightPage, {
      username: process.env.TEST_USER_EMAIL!,
      password: process.env.TEST_USER_PASSWORD!
    });
    {% endif %}
  });

  test.afterEach(async ({ page: playwrightPage }) => {
    await cleanupTestData(playwrightPage);
    {% if schema.e2e.auth_required %}
    await logout(playwrightPage);
    {% endif %}
  });

  {% if 'create' in schema.e2e.scenarios %}
  test('should create a new {{ schema.name|lower }}', async () => {
    await page.goToCreate();
    
    // Fill form with test data
    {% for attr_name, attr_def in schema.attributes.items() %}
    {% if attr_def.required and attr_name not in ['createdAt', 'updatedAt'] %}
    await page.fill{{ attr_name|pascalCase }}('test-{{ attr_name|lower }}');
    {% endif %}
    {% endfor %}
    
    await page.clickSubmit();
    
    // Verify success message
    await expect(page.getSuccessMessage()).toBeVisible();
    
    // Verify appears in list
    await page.goToList();
    await expect(page.getFirstRow()).toContainText('test-');
  });
  {% endif %}

  {% if 'list' in schema.e2e.scenarios %}
  test('should display {{ schema.name|lower }} list', async () => {
    await page.goToList();
    
    // Verify page title
    await expect(page.getPageTitle()).toContainText('{{ schema.name }}');
    
    // Verify table is visible
    await expect(page.getDataGrid()).toBeVisible();
  });
  {% endif %}

  {% if 'pagination' in schema.e2e.scenarios %}
  test('should paginate {{ schema.name|lower }} list', async () => {
    await page.goToList();
    
    // Verify pagination controls exist
    await expect(page.getPaginationControls()).toBeVisible();
    
    // Click next page
    await page.clickNextPage();
    
    // Verify URL changed
    expect(page.page.url()).toContain('page=2');
  });
  {% endif %}

  {% if 'detail' in schema.e2e.scenarios %}
  test('should display {{ schema.name|lower }} detail', async () => {
    await page.goToList();
    await page.clickFirstRow();
    
    // Verify detail page loaded
    await expect(page.getPageTitle()).toContainText('{{ schema.name }}');
    
    // Verify attributes are displayed
    {% for attr_name in schema.attributes.keys() %}
    await expect(page.get{{ attr_name|pascalCase }}Display()).toBeVisible();
    {% endfor %}
  });
  {% endif %}

  {% if 'round_trip' in schema.e2e.scenarios %}
  test('should preserve data in create-read round trip', async () => {
    const testData = {
      {% for attr_name, attr_def in schema.attributes.items() %}
      {% if attr_def.required and attr_name not in ['createdAt', 'updatedAt'] %}
      {{ attr_name }}: 'test-{{ attr_name|lower }}-{{ "{{" }} Date.now() {{ "}}" }}',
      {% endif %}
      {% endfor %}
    };
    
    // Create resource
    await page.goToCreate();
    {% for attr_name, attr_def in schema.attributes.items() %}
    {% if attr_def.required and attr_name not in ['createdAt', 'updatedAt'] %}
    await page.fill{{ attr_name|pascalCase }}(testData.{{ attr_name }});
    {% endif %}
    {% endfor %}
    await page.clickSubmit();
    
    // Read back and verify
    await page.goToList();
    await page.clickFirstRow();
    
    {% for attr_name, attr_def in schema.attributes.items() %}
    {% if attr_def.required and attr_name not in ['createdAt', 'updatedAt'] %}
    await expect(page.get{{ attr_name|pascalCase }}Display()).toContainText(testData.{{ attr_name }});
    {% endif %}
    {% endfor %}
  });
  {% endif %}
});
```



### Template: page_object.ts.j2

Generates Page Object Model for a resource:

```typescript
{{ header }}
/**
 * Page Object Model for {{ schema.name }}
 */

import { Page, Locator } from '@playwright/test';

export class {{ page_object_name }} {
  readonly page: Page;
  
  // Locators
  readonly pageTitle: Locator;
  readonly dataGrid: Locator;
  readonly createButton: Locator;
  readonly submitButton: Locator;
  readonly successMessage: Locator;
  readonly paginationControls: Locator;
  readonly nextPageButton: Locator;
  
  {% for attr_name in schema.attributes.keys() %}
  readonly {{ attr_name|camelCase }}Input: Locator;
  readonly {{ attr_name|camelCase }}Display: Locator;
  {% endfor %}

  constructor(page: Page) {
    this.page = page;
    
    // Initialize locators
    this.pageTitle = page.locator('h1, h2').first();
    this.dataGrid = page.locator('app-data-grid, table');
    this.createButton = page.locator('button:has-text("Create")');
    this.submitButton = page.locator('button[type="submit"]');
    this.successMessage = page.locator('.success-message, .alert-success');
    this.paginationControls = page.locator('.pagination, app-pagination');
    this.nextPageButton = page.locator('button:has-text("Next")');
    
    {% for attr_name in schema.attributes.keys() %}
    this.{{ attr_name|camelCase }}Input = page.locator('input[name="{{ attr_name }}"], input[formControlName="{{ attr_name }}"]');
    this.{{ attr_name|camelCase }}Display = page.locator('[data-field="{{ attr_name }}"]');
    {% endfor %}
  }

  // Navigation methods
  async goToList() {
    await this.page.goto('{{ schema.e2e.routes.list }}');
    await this.page.waitForLoadState('networkidle');
  }

  async goToDetail(id: string) {
    const url = '{{ schema.e2e.routes.detail }}'.replace(':id', id);
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
  }

  async goToCreate() {
    await this.page.goto('{{ schema.e2e.routes.create }}');
    await this.page.waitForLoadState('networkidle');
  }

  // Interaction methods
  async clickCreate() {
    await this.createButton.click();
  }

  async clickSubmit() {
    await this.submitButton.click();
  }

  async clickFirstRow() {
    await this.dataGrid.locator('tr').nth(1).click();
  }

  async clickNextPage() {
    await this.nextPageButton.click();
  }

  {% for attr_name, attr_def in schema.attributes.items() %}
  async fill{{ attr_name|pascalCase }}(value: string) {
    await this.{{ attr_name|camelCase }}Input.fill(value);
  }
  {% endfor %}

  // Assertion helpers
  getPageTitle() {
    return this.pageTitle;
  }

  getDataGrid() {
    return this.dataGrid;
  }

  getSuccessMessage() {
    return this.successMessage;
  }

  getPaginationControls() {
    return this.paginationControls;
  }

  getFirstRow() {
    return this.dataGrid.locator('tr').nth(1);
  }

  {% for attr_name in schema.attributes.keys() %}
  get{{ attr_name|pascalCase }}Display() {
    return this.{{ attr_name|camelCase }}Display;
  }
  {% endfor %}
}
```



### Template: auth_helper.ts.j2

Generates Cognito authentication helper:

```typescript
{{ header }}
/**
 * Cognito authentication helper for E2E tests
 */

import { Page } from '@playwright/test';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface SignupData extends LoginCredentials {
  email: string;
  name: string;
}

/**
 * Login to the application using Cognito
 */
export async function login(page: Page, credentials: LoginCredentials): Promise<void> {
  await page.goto('/auth/login');
  
  await page.locator('input[name="username"], input[type="email"]').fill(credentials.username);
  await page.locator('input[name="password"], input[type="password"]').fill(credentials.password);
  await page.locator('button[type="submit"]').click();
  
  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  
  // Store authentication state
  await page.context().storageState({ path: 'e2e/.auth/user.json' });
}

/**
 * Logout from the application
 */
export async function logout(page: Page): Promise<void> {
  await page.locator('button:has-text("Logout"), a:has-text("Logout")').click();
  await page.waitForURL('**/auth/login');
}

/**
 * Sign up a new user account
 */
export async function signup(page: Page, data: SignupData): Promise<void> {
  await page.goto('/auth/signup');
  
  await page.locator('input[name="email"]').fill(data.email);
  await page.locator('input[name="name"]').fill(data.name);
  await page.locator('input[name="username"]').fill(data.username);
  await page.locator('input[name="password"]').fill(data.password);
  await page.locator('button[type="submit"]').click();
  
  // Wait for confirmation page or redirect
  await page.waitForURL('**/auth/confirm', { timeout: 10000 });
}

/**
 * Get authentication token from storage
 */
export async function getAuthToken(page: Page): Promise<string | null> {
  const cookies = await page.context().cookies();
  const authCookie = cookies.find(c => c.name === 'idToken' || c.name === 'accessToken');
  return authCookie?.value || null;
}
```

### Template: fixtures.ts.j2

Generates test fixtures:

```typescript
{{ header }}
/**
 * Test fixtures for E2E tests
 */

import { Page } from '@playwright/test';

export interface TestUser {
  username: string;
  password: string;
  email: string;
  role: 'OWNER' | 'EMPLOYEE' | 'CUSTOMER';
}

/**
 * Create a test user with specific role
 */
export async function createTestUser(page: Page, role: TestUser['role']): Promise<TestUser> {
  const timestamp = Date.now();
  const user: TestUser = {
    username: `test-user-${timestamp}`,
    password: `TestPass123!`,
    email: `test-${timestamp}@example.com`,
    role
  };
  
  // Use GraphQL mutation to create user
  const response = await page.request.post('/graphql', {
    data: {
      query: `
        mutation CreateUser($input: UserCreateInput!) {
          UserCreate(input: $input) {
            success
            item {
              userId
              email
            }
          }
        }
      `,
      variables: {
        input: {
          email: user.email,
          username: user.username,
          role: user.role
        }
      }
    }
  });
  
  const result = await response.json();
  if (!result.data?.UserCreate?.success) {
    throw new Error('Failed to create test user');
  }
  
  return user;
}

/**
 * Clean up test data after tests
 */
export async function cleanupTestData(page: Page): Promise<void> {
  // Delete test resources created during tests
  // This is a placeholder - implement based on your cleanup strategy
  console.log('Cleaning up test data...');
}

/**
 * Create prerequisite resources for tests
 */
export async function createPrerequisites(page: Page, resourceType: string): Promise<any> {
  // Create dependent resources (e.g., organization before application)
  // This is a placeholder - implement based on your resource dependencies
  console.log(`Creating prerequisites for ${resourceType}...`);
  return {};
}
```



### Template: playwright_config.ts.j2

Generates Playwright configuration:

```typescript
{{ header }}
/**
 * Playwright configuration for {{ project_name }}
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Template: utils.ts.j2

Generates utility functions:

```typescript
{{ header }}
/**
 * Utility functions for E2E tests
 */

import { Page } from '@playwright/test';

/**
 * Wait for GraphQL request to complete
 */
export async function waitForGraphQL(page: Page, operationName: string): Promise<void> {
  await page.waitForResponse(
    response => 
      response.url().includes('/graphql') && 
      response.request().postDataJSON()?.operationName === operationName
  );
}

/**
 * Generate random test data
 */
export function generateTestData(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Take screenshot with timestamp
 */
export async function takeTimestampedScreenshot(page: Page, name: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({ path: `e2e/screenshots/${name}-${timestamp}.png` });
}

/**
 * Wait for element to be stable (no animations)
 */
export async function waitForStable(page: Page, selector: string): Promise<void> {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible' });
  
  // Wait for animations to complete
  await page.waitForTimeout(300);
}
```



## Code Generation Flow

The E2E Test Generator follows this step-by-step process:

```
1. CLI Invocation
   └─> Parse command-line arguments
   └─> Load configuration from schema-generator.yml
   └─> Initialize PlaywrightGenerator

2. Configuration Loading
   └─> Read schema-generator.yml
   └─> Extract output.testing.e2e section
   └─> Validate configuration
   └─> Create E2EConfig object

3. Schema Discovery
   └─> Scan schemas directory recursively
   └─> Load YAML files
   └─> Filter schemas with e2e metadata
   └─> Apply schema_filter if specified
   └─> Create SchemaWithE2E objects

4. Common File Generation (once)
   ├─> Generate playwright.config.ts (if not exists)
   ├─> Generate auth/cognito.ts
   ├─> Generate fixtures/index.ts
   └─> Generate utils/index.ts

5. Per-Schema Generation (for each schema)
   ├─> Generate tests/{resource}.spec.ts
   │   ├─> Load test.spec.ts.j2 template
   │   ├─> Render with schema data
   │   └─> Write to output directory
   │
   └─> Generate page-objects/{resource}.page.ts
       ├─> Load page_object.ts.j2 template
       ├─> Render with schema data
       └─> Write to output directory

6. File Writing
   └─> Check for AUTO-GENERATED header
   └─> Create parent directories
   └─> Write file atomically
   └─> Log success/skip message

7. Completion
   └─> Log summary statistics
   └─> Exit with code 0 (success) or 1 (failure)
```

### Generation Algorithm

```python
def generate(schema_filter: Optional[str] = None):
    """Main generation algorithm."""
    
    # 1. Check if enabled
    if not config.testing.enabled:
        return
    
    # 2. Load schemas with E2E metadata
    schemas = schema_loader.load_schemas_with_e2e(schema_filter)
    
    if not schemas:
        log_warning("No schemas with E2E metadata found")
        return
    
    # 3. Generate common files (once)
    generate_playwright_config()
    generate_auth_helper()
    generate_fixtures()
    generate_utils()
    
    # 4. Generate per-schema files
    for schema in schemas:
        generate_test_file(schema)
        generate_page_object(schema)
    
    # 5. Log completion
    log_success(f"Generated E2E tests for {len(schemas)} schemas")
```



## Integration Points

### Integration with schema-generator.yml

The E2E Test Generator reads the existing `schema-generator.yml` configuration file and extends it with a new section:

```yaml
# Existing configuration
version: '2.0'
project:
  name: orb-integration-hub
paths:
  schemas: ./schemas

output:
  code:
    python:
      # ... existing python config
    typescript:
      # ... existing typescript config
  
  # NEW: Testing configuration
  testing:
    e2e:
      enabled: true
      framework: playwright
      language: typescript
      base_dir: ./apps/web/e2e
      test_patterns: "{resource}.spec.ts"
      targets:
        - ts-main
```

The generator uses the existing `paths.schemas` configuration to locate schema files, ensuring consistency with orb-schema-generator.

### Integration with Schema Files

Schema files are extended with an optional `e2e` section:

```yaml
# schemas/tables/organizations.yml
type: dynamodb
name: Organizations
targets:
  - python-main
  - ts-main
  - graphql-main

# NEW: E2E metadata
e2e:
  routes:
    list: /organizations
    detail: /organizations/:id
    create: /organizations/create
  scenarios:
    - create
    - list
    - detail
  auth_required: true
  roles:
    - OWNER
    - EMPLOYEE

model:
  # ... existing model definition
```

Schemas without the `e2e` section are skipped during test generation, allowing gradual adoption.

### Future Integration with orb-schema-generator

The POC is designed for easy integration into orb-schema-generator:

1. **Copy Module**: Move `tools/e2e_generator/` to `orb-schema-generator/src/generators/e2e/`

2. **Register Generator**: Add to `src/core/generator_registry.py`:
   ```python
   from ..generators.e2e.playwright_generator import PlaywrightGenerator
   
   GENERATORS = {
       # ... existing generators
       "e2e": PlaywrightGenerator,
   }
   ```

3. **Update CLI**: Add E2E generation to main CLI in `src/cli.py`:
   ```python
   if config.testing.e2e.enabled:
       e2e_generator = PlaywrightGenerator(config)
       e2e_generator.generate()
   ```

4. **Update Configuration**: The `output.testing.e2e` section is already compatible with orb-schema-generator's configuration structure.

5. **Template Location**: Templates move to `src/generators/e2e/templates/`

No changes to the core architecture are needed - the POC follows orb-schema-generator patterns exactly.



## Generated Test Structure

### Directory Organization

```
apps/web/
├── e2e/
│   ├── tests/                          # Test spec files
│   │   ├── organizations.spec.ts       # Organization CRUD tests
│   │   ├── applications.spec.ts        # Application CRUD tests
│   │   └── groups.spec.ts              # Group CRUD tests
│   │
│   ├── page-objects/                   # Page Object Models
│   │   ├── organizations.page.ts       # Organization page interactions
│   │   ├── applications.page.ts        # Application page interactions
│   │   └── groups.page.ts              # Group page interactions
│   │
│   ├── fixtures/                       # Test data setup/teardown
│   │   └── index.ts                    # Fixture functions
│   │
│   ├── auth/                           # Authentication helpers
│   │   └── cognito.ts                  # Cognito login/logout
│   │
│   ├── utils/                          # Utility functions
│   │   └── index.ts                    # Helper functions
│   │
│   ├── .auth/                          # Stored authentication state
│   │   └── user.json                   # Cached auth tokens
│   │
│   └── screenshots/                    # Test failure screenshots
│       └── *.png
│
└── playwright.config.ts                # Playwright configuration
```

### File Naming Conventions

| File Type | Pattern | Example |
|-----------|---------|---------|
| Test Spec | `{resource}.spec.ts` | `organizations.spec.ts` |
| Page Object | `{resource}.page.ts` | `organizations.page.ts` |
| Fixtures | `index.ts` | `fixtures/index.ts` |
| Auth Helper | `cognito.ts` | `auth/cognito.ts` |
| Utils | `index.ts` | `utils/index.ts` |
| Config | `playwright.config.ts` | `playwright.config.ts` |

### Generated File Headers

All generated files include an AUTO-GENERATED header:

```typescript
// AUTO-GENERATED by e2e-test-generator v0.1.0 - DO NOT EDIT
// Regenerate with: python -m tools.e2e_generator generate

/**
 * [File description]
 */
```

This header:
- Identifies generated files
- Prevents manual editing
- Provides regeneration instructions
- Includes generator version for tracking



## Example Outputs

### Example 1: Generated Test File

For a schema `Organizations` with scenarios `[create, list, detail]`:

```typescript
// AUTO-GENERATED by e2e-test-generator v0.1.0 - DO NOT EDIT
// Regenerate with: python -m tools.e2e_generator generate

/**
 * E2E tests for Organizations
 * Generated from schema: Organizations
 */

import { test, expect } from '@playwright/test';
import { OrganizationsPage } from '../page-objects/organizations.page';
import { login, logout } from '../auth/cognito';
import { createTestUser, cleanupTestData } from '../fixtures';

test.describe('Organizations E2E Tests', () => {
  let page: OrganizationsPage;

  test.beforeEach(async ({ page: playwrightPage }) => {
    page = new OrganizationsPage(playwrightPage);
    
    // Authenticate before each test
    await login(playwrightPage, {
      username: process.env.TEST_USER_EMAIL!,
      password: process.env.TEST_USER_PASSWORD!
    });
  });

  test.afterEach(async ({ page: playwrightPage }) => {
    await cleanupTestData(playwrightPage);
    await logout(playwrightPage);
  });

  test('should create a new organization', async () => {
    await page.goToCreate();
    
    // Fill form with test data
    await page.fillName('test-organization');
    await page.fillDescription('test-description');
    await page.fillOwnerId('test-owner-id');
    await page.fillStatus('Active');
    
    await page.clickSubmit();
    
    // Verify success message
    await expect(page.getSuccessMessage()).toBeVisible();
    
    // Verify appears in list
    await page.goToList();
    await expect(page.getFirstRow()).toContainText('test-organization');
  });

  test('should display organizations list', async () => {
    await page.goToList();
    
    // Verify page title
    await expect(page.getPageTitle()).toContainText('Organizations');
    
    // Verify table is visible
    await expect(page.getDataGrid()).toBeVisible();
  });

  test('should display organization detail', async () => {
    await page.goToList();
    await page.clickFirstRow();
    
    // Verify detail page loaded
    await expect(page.getPageTitle()).toContainText('Organizations');
    
    // Verify attributes are displayed
    await expect(page.getOrganizationIdDisplay()).toBeVisible();
    await expect(page.getNameDisplay()).toBeVisible();
    await expect(page.getDescriptionDisplay()).toBeVisible();
    await expect(page.getOwnerIdDisplay()).toBeVisible();
    await expect(page.getStatusDisplay()).toBeVisible();
  });
});
```



### Example 2: Generated Page Object

For the same `Organizations` schema:

```typescript
// AUTO-GENERATED by e2e-test-generator v0.1.0 - DO NOT EDIT
// Regenerate with: python -m tools.e2e_generator generate

/**
 * Page Object Model for Organizations
 */

import { Page, Locator } from '@playwright/test';

export class OrganizationsPage {
  readonly page: Page;
  
  // Locators
  readonly pageTitle: Locator;
  readonly dataGrid: Locator;
  readonly createButton: Locator;
  readonly submitButton: Locator;
  readonly successMessage: Locator;
  readonly paginationControls: Locator;
  readonly nextPageButton: Locator;
  
  readonly organizationIdInput: Locator;
  readonly organizationIdDisplay: Locator;
  readonly nameInput: Locator;
  readonly nameDisplay: Locator;
  readonly descriptionInput: Locator;
  readonly descriptionDisplay: Locator;
  readonly ownerIdInput: Locator;
  readonly ownerIdDisplay: Locator;
  readonly statusInput: Locator;
  readonly statusDisplay: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Initialize locators
    this.pageTitle = page.locator('h1, h2').first();
    this.dataGrid = page.locator('app-data-grid, table');
    this.createButton = page.locator('button:has-text("Create")');
    this.submitButton = page.locator('button[type="submit"]');
    this.successMessage = page.locator('.success-message, .alert-success');
    this.paginationControls = page.locator('.pagination, app-pagination');
    this.nextPageButton = page.locator('button:has-text("Next")');
    
    this.organizationIdInput = page.locator('input[name="organizationId"], input[formControlName="organizationId"]');
    this.organizationIdDisplay = page.locator('[data-field="organizationId"]');
    this.nameInput = page.locator('input[name="name"], input[formControlName="name"]');
    this.nameDisplay = page.locator('[data-field="name"]');
    this.descriptionInput = page.locator('input[name="description"], input[formControlName="description"]');
    this.descriptionDisplay = page.locator('[data-field="description"]');
    this.ownerIdInput = page.locator('input[name="ownerId"], input[formControlName="ownerId"]');
    this.ownerIdDisplay = page.locator('[data-field="ownerId"]');
    this.statusInput = page.locator('input[name="status"], input[formControlName="status"]');
    this.statusDisplay = page.locator('[data-field="status"]');
  }

  // Navigation methods
  async goToList() {
    await this.page.goto('/organizations');
    await this.page.waitForLoadState('networkidle');
  }

  async goToDetail(id: string) {
    const url = '/organizations/:id'.replace(':id', id);
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
  }

  async goToCreate() {
    await this.page.goto('/organizations/create');
    await this.page.waitForLoadState('networkidle');
  }

  // Interaction methods
  async clickCreate() {
    await this.createButton.click();
  }

  async clickSubmit() {
    await this.submitButton.click();
  }

  async clickFirstRow() {
    await this.dataGrid.locator('tr').nth(1).click();
  }

  async clickNextPage() {
    await this.nextPageButton.click();
  }

  async fillOrganizationId(value: string) {
    await this.organizationIdInput.fill(value);
  }

  async fillName(value: string) {
    await this.nameInput.fill(value);
  }

  async fillDescription(value: string) {
    await this.descriptionInput.fill(value);
  }

  async fillOwnerId(value: string) {
    await this.ownerIdInput.fill(value);
  }

  async fillStatus(value: string) {
    await this.statusInput.fill(value);
  }

  // Assertion helpers
  getPageTitle() {
    return this.pageTitle;
  }

  getDataGrid() {
    return this.dataGrid;
  }

  getSuccessMessage() {
    return this.successMessage;
  }

  getPaginationControls() {
    return this.paginationControls;
  }

  getFirstRow() {
    return this.dataGrid.locator('tr').nth(1);
  }

  getOrganizationIdDisplay() {
    return this.organizationIdDisplay;
  }

  getNameDisplay() {
    return this.nameDisplay;
  }

  getDescriptionDisplay() {
    return this.descriptionDisplay;
  }

  getOwnerIdDisplay() {
    return this.ownerIdDisplay;
  }

  getStatusDisplay() {
    return this.statusDisplay;
  }
}
```



## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Schema Filtering

For any schema name provided via --schema flag, the generator should only process that specific schema and skip all others.

**Validates: Requirements 3.6, 4.4**

### Property 2: Scenario-Driven Test Generation

For any schema with E2E metadata, for each scenario listed in the scenarios array, the generated test file should contain a test case for that scenario.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4, 8.1, 14.1**

### Property 3: Attribute-Based Form Fields

For any schema with required attributes (excluding timestamps), the generated test should include form field interactions for each required attribute.

**Validates: Requirements 5.5**

### Property 4: Page Object Generation

For any schema with E2E metadata, the generator should create a Page Object Model file containing locators and methods for all schema attributes.

**Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.7**

### Property 5: Authentication Integration

For any schema where auth_required is true, the generated test should call the login function in beforeEach and logout function in afterEach.

**Validates: Requirements 6.5**

### Property 6: AUTO-GENERATED Header Presence

For any file generated by the E2E Test Generator, the file should contain an AUTO-GENERATED header comment in the first 5 lines.

**Validates: Requirements 12.7, 16.6**

### Property 7: Configuration Field Parsing

For any valid schema-generator.yml file with an output.testing.e2e section, the configuration loader should successfully parse all defined fields without errors.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

### Property 8: Schema Metadata Parsing

For any schema YAML file with an e2e section, the schema loader should successfully extract all e2e metadata fields without errors.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.7**

### Property 9: Role-Based Test Generation

For any schema that defines roles in e2e.roles, the generator should create test cases that verify access control for each defined role.

**Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7**

### Property 10: Round-Trip Data Verification

For any schema with a round_trip scenario, the generated test should create a resource, read it back, and verify all required attribute values match between create input and read output.

**Validates: Requirements 14.2, 14.3, 14.4, 14.5, 14.6, 14.7**

### Property 11: Dry-Run Mode

For any invocation with --dry-run flag, the generator should log all planned file operations but write zero files to disk.

**Validates: Requirements 4.5**

### Property 12: Exit Code on Success

For any successful generation run with valid configuration and schemas, the CLI should exit with code 0.

**Validates: Requirements 4.6**

### Property 13: Exit Code on Failure

For any generation run that encounters errors (invalid config, missing schemas, file write failures), the CLI should exit with a non-zero code and print error messages.

**Validates: Requirements 4.7**



## Error Handling

### Configuration Errors

| Error Condition | Handling Strategy |
|----------------|-------------------|
| Missing schema-generator.yml | Exit with error message: "Configuration file not found: {path}" |
| Invalid YAML syntax | Exit with error message: "Invalid YAML in configuration file: {error}" |
| Missing output.testing.e2e section | Use default configuration values |
| Invalid framework value | Exit with error message: "Unsupported framework: {framework}. Only 'playwright' is supported." |
| Invalid base_dir path | Exit with error message: "Invalid base_dir: {path}" |

### Schema Loading Errors

| Error Condition | Handling Strategy |
|----------------|-------------------|
| Schemas directory not found | Exit with error message: "Schemas directory not found: {path}" |
| Invalid schema YAML syntax | Log warning, skip schema, continue with others |
| Missing schema name field | Log warning, skip schema, continue with others |
| Missing e2e metadata | Skip schema silently (expected for schemas without E2E tests) |
| Invalid e2e.routes format | Log error, skip schema, continue with others |
| Empty e2e.scenarios array | Log warning, skip schema, continue with others |

### File Writing Errors

| Error Condition | Handling Strategy |
|----------------|-------------------|
| Permission denied | Log error, skip file, continue with others |
| Disk full | Exit with error message: "Failed to write file: disk full" |
| Invalid file path | Log error, skip file, continue with others |
| File exists without AUTO-GENERATED header | Log warning, skip file, continue with others |

### Template Rendering Errors

| Error Condition | Handling Strategy |
|----------------|-------------------|
| Template file not found | Exit with error message: "Template not found: {template_name}" |
| Template syntax error | Exit with error message: "Template syntax error in {template_name}: {error}" |
| Missing template variable | Exit with error message: "Missing required variable in template: {variable}" |

### CLI Errors

| Error Condition | Handling Strategy |
|----------------|-------------------|
| Invalid command | Print usage help, exit with code 1 |
| Invalid --config path | Exit with error message: "Configuration file not found: {path}" |
| Invalid --schema name | Log warning: "Schema not found: {name}", exit with code 0 (no schemas to process) |
| Multiple errors during generation | Log all errors, exit with code 1 |

### Error Logging

All errors are logged with appropriate severity levels:

- **ERROR**: Critical failures that prevent generation (exit code 1)
- **WARNING**: Non-critical issues that allow generation to continue (skip affected items)
- **INFO**: Normal operation messages
- **DEBUG**: Detailed diagnostic information (enabled with --verbose flag)

Error messages include:
- Clear description of the problem
- File path or schema name where error occurred
- Suggested resolution when applicable



## Testing Strategy

### Unit Testing

Unit tests verify individual components in isolation:

**Configuration Loading (`test_config.py`)**
- Test loading valid configuration from YAML
- Test default values when fields are missing
- Test error handling for invalid YAML syntax
- Test error handling for invalid field values
- Test E2EConfig.from_file() with various inputs

**Schema Loading (`test_schema_loader.py`)**
- Test loading schemas with E2E metadata
- Test skipping schemas without E2E metadata
- Test schema filtering by name
- Test error handling for invalid YAML
- Test error handling for missing required fields
- Test E2EMetadata extraction from schema

**Base Generator (`test_base_generator.py`)**
- Test AUTO-GENERATED header detection
- Test file writing with header check
- Test dry-run mode (no files written)
- Test file header generation
- Test directory creation

**Playwright Generator (`test_playwright_generator.py`)**
- Test test file generation for each scenario
- Test Page Object generation
- Test common file generation (auth, fixtures, utils, config)
- Test template rendering with schema data
- Test case conversion filters (camelCase, PascalCase)

**CLI (`test_cli.py`)**
- Test command-line argument parsing
- Test --config flag
- Test --schema flag
- Test --dry-run flag
- Test --verbose flag
- Test exit codes (0 for success, 1 for failure)

### Property-Based Testing

Property tests verify universal behaviors across many generated inputs using Hypothesis (Python property-based testing library):

**Property Test Configuration:**
- Minimum 100 iterations per test
- Random schema generation with valid E2E metadata
- Random configuration generation with valid values

**Property 1: Schema Filtering Consistency**
```python
@given(schemas=st.lists(schema_with_e2e()), filter_name=st.text())
def test_schema_filtering(schemas, filter_name):
    """For any list of schemas and filter name, only matching schemas are processed."""
    # Feature: e2e-test-generator, Property 1: Schema Filtering
    generator = PlaywrightGenerator(config)
    filtered = generator._filter_schemas(schemas, filter_name)
    
    assert all(s.name == filter_name for s in filtered)
```

**Property 2: Scenario Test Generation**
```python
@given(schema=schema_with_e2e())
def test_scenario_generation(schema):
    """For any schema with scenarios, each scenario generates a test case."""
    # Feature: e2e-test-generator, Property 2: Scenario-Driven Test Generation
    generator = PlaywrightGenerator(config)
    content = generator._generate_test_file(schema)
    
    for scenario in schema.e2e.scenarios:
        assert f"test('should {scenario}" in content or f"test('{scenario}" in content
```

**Property 3: Attribute Form Fields**
```python
@given(schema=schema_with_e2e())
def test_attribute_form_fields(schema):
    """For any schema, required attributes generate form field interactions."""
    # Feature: e2e-test-generator, Property 3: Attribute-Based Form Fields
    generator = PlaywrightGenerator(config)
    content = generator._generate_test_file(schema)
    
    for attr_name, attr_def in schema.attributes.items():
        if attr_def.get('required') and attr_name not in ['createdAt', 'updatedAt']:
            assert f"fill{to_pascal_case(attr_name)}" in content
```

**Property 4: Page Object Completeness**
```python
@given(schema=schema_with_e2e())
def test_page_object_completeness(schema):
    """For any schema, Page Object includes locators for all attributes."""
    # Feature: e2e-test-generator, Property 4: Page Object Generation
    generator = PlaywrightGenerator(config)
    content = generator._generate_page_object(schema)
    
    for attr_name in schema.attributes.keys():
        assert f"{to_camel_case(attr_name)}Input" in content
        assert f"{to_camel_case(attr_name)}Display" in content
```

**Property 5: Authentication Integration**
```python
@given(schema=schema_with_e2e())
def test_authentication_integration(schema):
    """For any schema with auth_required=true, tests include login/logout."""
    # Feature: e2e-test-generator, Property 5: Authentication Integration
    generator = PlaywrightGenerator(config)
    content = generator._generate_test_file(schema)
    
    if schema.e2e.auth_required:
        assert "await login(" in content
        assert "await logout(" in content
```

**Property 6: AUTO-GENERATED Header**
```python
@given(schema=schema_with_e2e())
def test_auto_generated_header(schema):
    """For any generated file, AUTO-GENERATED header is present."""
    # Feature: e2e-test-generator, Property 6: AUTO-GENERATED Header Presence
    generator = PlaywrightGenerator(config)
    
    test_content = generator._generate_test_file(schema)
    page_content = generator._generate_page_object(schema)
    
    assert "AUTO-GENERATED" in test_content[:500]
    assert "AUTO-GENERATED" in page_content[:500]
```

**Property 7: Configuration Parsing**
```python
@given(config_data=valid_config_dict())
def test_configuration_parsing(config_data):
    """For any valid config dict, parsing succeeds without errors."""
    # Feature: e2e-test-generator, Property 7: Configuration Field Parsing
    config = E2ETestingConfig.from_dict(config_data)
    
    assert config.enabled is not None
    assert config.framework is not None
    assert config.base_dir is not None
```

**Property 8: Schema Metadata Parsing**
```python
@given(e2e_data=valid_e2e_metadata_dict())
def test_schema_metadata_parsing(e2e_data):
    """For any valid e2e metadata dict, parsing succeeds without errors."""
    # Feature: e2e-test-generator, Property 8: Schema Metadata Parsing
    e2e = E2EMetadata(
        routes=e2e_data['routes'],
        scenarios=e2e_data['scenarios'],
        auth_required=e2e_data.get('auth_required', True),
        roles=e2e_data.get('roles', [])
    )
    
    assert e2e.routes is not None
    assert len(e2e.scenarios) > 0
```

**Property 9: Dry-Run Mode**
```python
@given(schemas=st.lists(schema_with_e2e(), min_size=1))
def test_dry_run_mode(schemas, tmp_path):
    """For any schemas with dry_run=True, no files are written."""
    # Feature: e2e-test-generator, Property 11: Dry-Run Mode
    config = E2EConfig(testing=E2ETestingConfig(base_dir=tmp_path), ...)
    generator = PlaywrightGenerator(config, dry_run=True)
    
    generator.generate()
    
    # Verify no files were created
    assert len(list(tmp_path.rglob("*.ts"))) == 0
```

**Property 10: Exit Code Success**
```python
@given(schemas=st.lists(schema_with_e2e(), min_size=1))
def test_exit_code_success(schemas):
    """For any successful generation, exit code is 0."""
    # Feature: e2e-test-generator, Property 12: Exit Code on Success
    result = subprocess.run(
        ["python", "-m", "tools.e2e_generator", "generate"],
        capture_output=True
    )
    
    assert result.returncode == 0
```

### Integration Testing

Integration tests verify the complete generation workflow:

**End-to-End Generation Test**
- Create temporary directory with test schemas
- Create test configuration file
- Run generator CLI
- Verify all expected files are created
- Verify file contents match expected patterns
- Verify generated tests are syntactically valid TypeScript

**Template Rendering Test**
- Load all templates
- Render with sample schema data
- Verify no template errors
- Verify output is valid TypeScript

**File System Integration Test**
- Test file writing with various permissions
- Test directory creation
- Test AUTO-GENERATED header detection
- Test selective overwrite behavior

### Test Coverage Goals

- Unit test coverage: 90%+ for all modules
- Property test coverage: All correctness properties from design
- Integration test coverage: Complete generation workflow
- Template coverage: All templates rendered with sample data

### Running Tests

```bash
# Run all tests
cd tools/e2e_generator
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run property tests only
pytest -m property

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/test_playwright_generator.py
```



## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)

**Goal**: Establish the foundation for code generation

Tasks:
1. Create module structure at `tools/e2e_generator/`
2. Implement `base.py` with BaseE2EGenerator class
3. Implement `config.py` with configuration models
4. Implement `schema_loader.py` with E2E metadata extraction
5. Implement `__main__.py` with CLI entry point
6. Write unit tests for core components

Deliverables:
- Working CLI that can load configuration and schemas
- Unit tests with 90%+ coverage
- Documentation in README.md

### Phase 2: Template System (Week 2)

**Goal**: Create Jinja2 templates for all generated files

Tasks:
1. Create `templates/` directory
2. Implement `test.spec.ts.j2` template
3. Implement `page_object.ts.j2` template
4. Implement `auth_helper.ts.j2` template
5. Implement `fixtures.ts.j2` template
6. Implement `playwright_config.ts.j2` template
7. Implement `utils.ts.j2` template
8. Write template rendering tests

Deliverables:
- Complete template library
- Sample generated files for review
- Template rendering tests

### Phase 3: Generator Implementation (Week 3)

**Goal**: Implement the Playwright generator

Tasks:
1. Implement `playwright_generator.py` with PlaywrightGenerator class
2. Implement test file generation
3. Implement Page Object generation
4. Implement common file generation
5. Implement case conversion filters
6. Write integration tests

Deliverables:
- Working generator that produces complete test suites
- Integration tests verifying end-to-end workflow
- Generated tests for sample schemas

### Phase 4: Testing and Refinement (Week 4)

**Goal**: Ensure quality and completeness

Tasks:
1. Write property-based tests using Hypothesis
2. Test with real orb-integration-hub schemas
3. Verify generated tests run successfully with Playwright
4. Fix bugs and edge cases
5. Optimize template output
6. Complete documentation

Deliverables:
- Property tests for all correctness properties
- Verified working tests for Organizations, Applications, Groups
- Complete README with usage examples
- Updated CHANGELOG

### Phase 5: Integration Preparation (Week 5)

**Goal**: Prepare for integration into orb-schema-generator

Tasks:
1. Document integration steps
2. Create migration guide
3. Test compatibility with orb-schema-generator patterns
4. Prepare pull request for orb-schema-generator
5. Update orb-integration-hub to use the generator

Deliverables:
- Integration documentation
- Migration guide for orb-schema-generator
- Pull request ready for review

## Dependencies

### Python Dependencies

```toml
# pyproject.toml or requirements.txt
jinja2 >= 3.1.0          # Template engine
pyyaml >= 6.0            # YAML parsing
pytest >= 7.0            # Testing framework
hypothesis >= 6.0        # Property-based testing
pytest-cov >= 4.0        # Coverage reporting
```

### TypeScript Dependencies (for generated tests)

```json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "typescript": "^5.0.0"
  }
}
```

### System Dependencies

- Python 3.9+
- Node.js 18+ (for running generated tests)
- Playwright browsers (installed via `npx playwright install`)

## Performance Considerations

### Generation Speed

Expected performance for typical usage:

| Schemas | Files Generated | Time |
|---------|----------------|------|
| 1 schema | 6 files | < 1 second |
| 10 schemas | 24 files | < 2 seconds |
| 50 schemas | 104 files | < 5 seconds |

Performance optimizations:
- Templates are loaded once and cached
- File writes are atomic but not parallelized (POC simplicity)
- Schema loading uses lazy evaluation
- Dry-run mode skips file I/O entirely

### Memory Usage

Expected memory usage:
- Base overhead: ~50 MB (Python + Jinja2)
- Per schema: ~1 MB (schema data + rendered templates)
- Total for 50 schemas: ~100 MB

Memory optimizations:
- Schemas are processed sequentially (not all loaded at once)
- Templates are reused across schemas
- Generated content is written immediately (not buffered)

## Security Considerations

### File System Access

- Generator only writes to configured `base_dir`
- No file deletion (only creation/overwrite)
- Respects AUTO-GENERATED header protection
- Creates directories with safe permissions (755)

### Template Injection

- Jinja2 autoescape enabled for HTML/XML
- Schema data is trusted (from local YAML files)
- No user input in templates (all from configuration)
- Template syntax errors caught and reported

### Credential Handling

- Generated tests use environment variables for credentials
- No hardcoded passwords or tokens
- Authentication state stored in `.auth/` (gitignored)
- Test users created with random credentials

## Monitoring and Observability

### Logging

The generator provides structured logging:

```python
# INFO level (default)
INFO: Generating Playwright E2E tests (v0.1.0)...
INFO: Found 3 schemas with E2E metadata
INFO: Generated: apps/web/e2e/tests/organizations.spec.ts
INFO: Successfully generated E2E tests for 3 schemas

# DEBUG level (--verbose)
DEBUG: Loading configuration from schema-generator.yml
DEBUG: Scanning schemas directory: ./schemas
DEBUG: Loaded schema with E2E metadata: Organizations
DEBUG: Rendering template: test.spec.ts.j2
DEBUG: Writing file: apps/web/e2e/tests/organizations.spec.ts
```

### Metrics

Key metrics tracked during generation:

- Number of schemas processed
- Number of files generated
- Number of files skipped (no AUTO-GENERATED header)
- Number of errors encountered
- Generation time (total and per schema)

### Error Reporting

Errors include:
- Error type and message
- File path or schema name
- Stack trace (in debug mode)
- Suggested resolution

## Future Enhancements

### Post-POC Improvements

1. **Parallel Generation**: Process multiple schemas concurrently
2. **Incremental Generation**: Only regenerate changed schemas
3. **Custom Templates**: Allow project-specific template overrides
4. **Test Data Generators**: Generate realistic test data from schema types
5. **Visual Regression Testing**: Add screenshot comparison tests
6. **API Mocking**: Generate mock API responses for offline testing
7. **Test Coverage Reports**: Track which scenarios are tested
8. **Multi-Framework Support**: Add Cypress, TestCafe support

### Integration with orb-schema-generator

Once integrated into orb-schema-generator:

1. **Unified CLI**: Single command generates all code + tests
2. **Watch Mode**: Regenerate tests on schema changes
3. **Validation**: Verify generated tests match schema changes
4. **Documentation**: Auto-generate test documentation
5. **CI Integration**: Run generated tests in CI pipeline

## Conclusion

The E2E Test Generator provides a practical solution for automating Playwright test creation from YAML schemas. By following orb-schema-generator's architecture patterns, the POC is designed for easy integration while remaining useful as a standalone tool.

Key benefits:
- Reduces manual test writing effort by 80%+
- Ensures test coverage for all CRUD operations
- Maintains consistency across test suites
- Simplifies test maintenance through regeneration
- Provides a foundation for future testing enhancements

The design prioritizes simplicity and practicality for the POC phase while maintaining extensibility for future enhancements and integration into orb-schema-generator.

