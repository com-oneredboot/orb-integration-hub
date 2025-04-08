# Orb Integration Hub

A modern integration platform built with AWS AppSync, DynamoDB, and TypeScript/Python.

## Overview

Orb Integration Hub is a serverless application that provides a unified API for integrating various services and data sources. It uses AWS AppSync for GraphQL API, DynamoDB for data storage, and supports both TypeScript (frontend) and Python (backend) clients.

## Quick Links

- [Architecture Documentation](docs/architecture.md) - System design and component interactions
- [Development Guide](docs/development.md) - Setup and development workflow
- [Feature Registry](docs/features/REGISTRY.md) - List of active and completed features
- [Frontend Design Plan](docs/frontend-design.md) - Frontend architecture, UI/UX, and features
- [Frontend Implementation Plan](docs/frontend-implementation-plan.md) - Frontend development phases and tasks (feature-based)
- [Frontend Todo List](docs/frontend-todo.md) - Frontend development checklist (feature-based)
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

- **Schema changes require regeneration of code.** Do not edit generated files directly. See [Schema Documentation](docs/schema.md) for the correct workflow.
- GraphQL schema is timestamped in `infrastructure/cloudformation/`
- DynamoDB templates are in `infrastructure/cloudformation/dynamodb.yml`
- Generated models are placed in respective frontend/backend directories

## Key Commands

- **Regenerate code:** `python schemas/generate.py` (Run from root)
- **Backend Tests:** `cd backend && pytest` (Requires pytest)
- **Frontend Tests:** `cd frontend && npm run test`

## Deployment

Deployment is handled via GitHub Actions. See the workflow files in `.github/workflows/` for details, specifically:
- Backend: `.github/workflows/deploy-backend.yml`
- Frontend: `.github/workflows/deploy-frontend.yml`

## ORB Master Plan Integration

This project is part of the ORB ecosystem, which is managed through the [orb-master-plan](https://github.com/com-oneredboot/orb-master-plan) repository. The orb-master-plan serves as the central documentation and planning hub for all ORB ecosystem projects.

### Documentation Structure

To ensure compatibility with the orb-master-plan, this project follows a standardized documentation structure:

```
docs/
├── core/                  # Core project documentation
│   ├── DESIGN_PLAN.md     # Overall design plan
│   ├── IMPLEMENTATION_PLAN.md # Implementation timeline
│   └── TODO.md            # Current tasks and action items
├── features/              # Feature-specific documentation
│   └── [feature-name]/    # Documentation for each feature
│       ├── feature-plan.md # Feature design and implementation plan
│       └── summary.md      # Feature completion summary
├── architecture.md        # System architecture documentation
├── development.md         # Development setup and workflow
└── api.md                 # API documentation
```

### Keeping Documentation Up-to-Date

When working on this project:

1. **Update Feature Documentation**: When implementing new features, create or update the corresponding feature documentation in `docs/features/[feature-name]/`.
2. **Update Core Documentation**: Keep the core documentation files (`DESIGN_PLAN.md`, `IMPLEMENTATION_PLAN.md`, `TODO.md`) up-to-date with the latest project status.
3. **Follow Standards**: Adhere to the development standards defined in the orb-master-plan.
4. **Report Progress**: Update the orb-master-plan's task tracking when completing significant milestones.

The orb-master-plan will periodically scan project repositories to update its documentation and ensure all projects are aligned with the overall ecosystem vision.

## License

[Add your license information here]
