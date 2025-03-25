# Orb Integration Hub

A modern integration platform built with AWS AppSync, DynamoDB, and TypeScript/Python.

## Overview

Orb Integration Hub is a serverless application that provides a unified API for integrating various services and data sources. It uses AWS AppSync for GraphQL API, DynamoDB for data storage, and supports both TypeScript (frontend) and Python (backend) clients.

## Quick Links

- [Architecture Documentation](docs/architecture.md) - System design and component interactions
- [Development Guide](docs/development.md) - Setup and development workflow
- [API Documentation](docs/api.md) - GraphQL API reference and examples
- [Schema Documentation](docs/schema.md) - Data models and schema definitions

## Getting Started

1. Review the [Development Guide](docs/development.md) for setup instructions
2. Check the [Architecture Documentation](docs/architecture.md) to understand the system
3. Explore the [API Documentation](docs/api.md) to start integrating

## Project Structure

```
orb-integration-hub/
├── backend/           # Python backend services
├── frontend/         # TypeScript frontend application
├── docs/            # Project documentation
└── schemas/         # Schema definitions and generators
    ├── entities/    # YAML schema definitions
    ├── templates/   # Jinja templates for code generation
    └── generate.py  # Schema generation script
```

## Development Workflow

### Schema Generation

The project uses a schema-driven development approach. Key files and directories:

- `schemas/entities/*.yml` - Define data models and relationships
- `schemas/templates/*.jinja` - Templates for generating code
- `schemas/generate.py` - Main generation script

To regenerate code after schema changes:
```bash
python schemas/generate.py
```

This will:
1. Generate Python models
2. Generate TypeScript models
3. Update GraphQL schema
4. Generate DynamoDB CloudFormation templates

### Important Context

- Schema changes require regeneration of code
- GraphQL schema is timestamped in `backend/infrastructure/cloudformation/`
- DynamoDB templates are in `backend/infrastructure/cloudformation/dynamodb.yml`
- Generated models are placed in respective frontend/backend directories

## License

[Add your license information here]
