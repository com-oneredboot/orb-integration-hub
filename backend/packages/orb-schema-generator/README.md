# orb-schema-generator

A comprehensive schema-driven code generator for TypeScript, Python, GraphQL, and CloudFormation.

## Features

- **Multi-Target Generation**: Generate TypeScript, Python, GraphQL, and CloudFormation from a single schema
- **Duplicate Resolution**: Intelligent detection and resolution of duplicate type definitions
- **Template Engine**: DRY-compliant template system with reusable components
- **Extensible Architecture**: Plugin system for custom generators and processors
- **Type Safety**: Full type checking and validation for all generated code
- **CLI & API**: Both command-line and programmatic interfaces
- **MCP Integration**: Model Context Protocol server for AI-assisted development

## Installation

```bash
pip install orb-schema-generator
```

## Quick Start

### Command Line

```bash
# Generate all targets from schema directory
orb-schema-gen generate schemas/ --output generated/

# Generate specific targets
orb-schema-gen generate schemas/ --targets typescript,python

# Validate schemas
orb-schema-gen validate schemas/

# Resolve duplicates
orb-schema-gen resolve-duplicates schemas/
```

### Python API

```python
from orb_schema_generator import OrbSchemaGenerator

# Initialize generator
generator = OrbSchemaGenerator()

# Load schemas
generator.load_schemas("schemas/")

# Generate all targets
generator.generate_all(output_dir="generated/")

# Generate specific targets
generator.generate_typescript(output_dir="generated/typescript/")
generator.generate_python(output_dir="generated/python/")

# Resolve duplicates
duplicates = generator.resolve_duplicates()
```

## Schema Format

Schemas are defined in YAML format:

```yaml
name: User
table: users
description: User entity
fields:
  - name: id
    type: string
    required: true
    key: true
  - name: email
    type: string
    required: true
    unique: true
  - name: created_at
    type: datetime
    required: true
indexes:
  - name: email_index
    fields: [email]
    unique: true
```

## Configuration

Create a `.orb-schema-gen.yaml` configuration file:

```yaml
# Output directories
output:
  typescript: generated/typescript
  python: generated/python
  graphql: generated/graphql
  cloudformation: generated/cf

# Generator options
generators:
  typescript:
    style: interface  # or 'class'
    imports: relative
  python:
    style: pydantic  # or 'dataclass'
    version: "3.10"

# Template customization
templates:
  custom_dir: ./my-templates

# Duplicate resolution
duplicates:
  strategy: merge  # or 'error', 'ignore'
  report: true
```

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/orb-integration-hub/orb-schema-generator
cd orb-schema-generator

# Install in development mode
pip install -e ".[dev]"

# Run tests
pytest

# Run linting
black .
isort .
mypy .
```

### Architecture

The package is organized into several core modules:

- **core/**: Domain models, loaders, validators, and converters
- **generators/**: Target-specific code generators
- **templates/**: Jinja2 templates for code generation
- **plugins/**: Extension system for custom functionality
- **config/**: Configuration management
- **cli/**: Command-line interface
- **api/**: Programmatic API
- **utils/**: Utility functions and helpers

## Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.