# Orb Integration Hub

A modern integration platform built with AWS AppSync, DynamoDB, and TypeScript/Python.

## Overview

Orb Integration Hub is a serverless application that provides a unified API for integrating various services and data sources. It uses AWS AppSync for GraphQL API, DynamoDB for data storage, and supports both TypeScript (frontend) and Python (backend) clients.

## Quick Links

- [Product Requirements (PRD)](.taskmaster/docs/prd.md) - Canonical requirements and feature planning document
- [Architecture Documentation](docs/architecture.md) - System design and component interactions
- [Development Guide](docs/development.md) - Setup and development workflow
- [Testing Guidelines](docs/testing-guidelines.md) - Testing best practices and structure
- [Python Packages](docs/python-packages.md) - Python package architecture guide
- [Feature Registry](.taskmaster/docs/features/REGISTRY.md) - List of active and completed features
- [Frontend Design Plan](docs/frontend-design.md) - Frontend architecture, UI/UX, and features
- [Frontend Implementation Plan](.taskmaster/docs/frontend-implementation-plan.md) - Frontend development phases and tasks (feature-based)
- [Frontend Todo List](.taskmaster/docs/frontend-todo.md) - Frontend development checklist (feature-based)
- [API Documentation](docs/api.md) - GraphQL API reference and examples
- [Schema Documentation](docs/schema.md) - Data models and schema definitions

## Getting Started

1. Review the [Development Guide](docs/development.md) for setup instructions
2. Check the [Product Requirements (PRD)](.taskmaster/docs/prd.md) for the latest requirements and features
3. Check the [Architecture Documentation](docs/architecture.md) to understand the system
4. Explore the [API Documentation](docs/api.md) to start integrating

## Project Structure

```
orb-integration-hub/
├── backend/                  # Python backend services
│   ├── src/
│   │   ├── lambdas/         # Lambda functions
│   │   └── layers/          # Lambda layers
│   └── packages/            # Python packages
│       ├── orb-common/      # Shared utilities and security
│       └── orb-models/      # Auto-generated data models
├── frontend/                # TypeScript frontend application
├── docs/                    # Technical documentation
│   ├── architecture.md      # System architecture
│   ├── development.md       # Development guide
│   ├── testing-guidelines.md # Testing best practices
│   └── python-packages.md   # Python package architecture
├── .taskmaster/             # Task management and planning
│   ├── docs/               # Planning documents (PRD, features)
│   └── tasks/              # Task definitions and tracking
└── schemas/                 # Schema definitions and generators
    ├── entities/           # YAML schema definitions
    ├── templates/          # Jinja templates for code generation
    └── generate.py         # Schema generation script
```

## Task & Project Management (AI-Driven)

This project uses [task-master-ai](https://github.com/CoreyDalePeters/task-master-ai) for requirements-driven planning and task management.

- The canonical source of requirements is [.taskmaster/docs/prd.md](.taskmaster/docs/prd.md).
- To update or generate tasks:
  1. Edit `.taskmaster/docs/prd.md` as requirements evolve.
  2. Run `task-master-ai parse-prd` to generate or update the project's tasks.
  3. Use `task-master-ai` to expand, update, and track tasks throughout the project lifecycle.
- See [docs/development.md](docs/development.md) for detailed workflow instructions.

All features, tasks, and documentation should trace back to the PRD to ensure alignment and traceability.

### Using task-master-ai

- **Parse PRD and generate tasks:**
  ```bash
  npx task-master-ai parse-prd --input=.taskmaster/docs/prd.md
  ```
- **Expand tasks into subtasks:**
  ```bash
  npx task-master-ai expand --all
  ```
- **List and track tasks:**
  ```bash
  npx task-master-ai list
  ```

See [task-master-ai documentation](https://github.com/CoreyDalePeters/task-master-ai) for more details.

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
├── prd.md                 # Product Requirements Document (PRD)
├── core/                  # Core project documentation
│   ├── DESIGN_PLAN.md     # Overall design plan
│   ├── IMPLEMENTATION_PLAN.md # Implementation timeline
│   └── TODO.md            # Current tasks and action items
├── .taskmaster/docs/
│   ├── prd.md             # Product Requirements Document
│   ├── core/              # Core planning documents
│   ├── features/          # Feature-specific documentation
│   │   └── [feature-name]/ # Documentation for each feature
│   │       ├── feature-plan.md # Feature design and implementation plan
│   │       └── summary.md      # Feature completion summary
│   └── market-research/   # Business analysis and research
├── architecture.md        # System architecture documentation
├── development.md         # Development setup and workflow
└── api.md                 # API documentation
```

### Keeping Documentation Up-to-Date

When working on this project:

1. **Update Feature Documentation**: When implementing new features, create or update the corresponding feature documentation in `.taskmaster/docs/features/[feature-name]/`.
2. **Update Core Documentation**: Keep the core documentation files (`.taskmaster/docs/core/DESIGN_PLAN.md`, `IMPLEMENTATION_PLAN.md`) up-to-date with the latest project status.
3. **Follow Standards**: Adhere to the development standards defined in the orb-master-plan.
4. **Report Progress**: Update the orb-master-plan's task tracking when completing significant milestones.

The orb-master-plan will periodically scan project repositories to update its documentation and ensure all projects are aligned with the overall ecosystem vision.

## License

[Add your license information here]

## Recent Changes

### Timestamp Handling
- Updated timestamp handling across the application to use ISO string format
- Ensures consistency between TypeScript, Python, and DynamoDB
- Fixed type mismatches in user creation and update flows

### Error Handling
- Implemented proper error registry pattern
- Improved error messages and error handling flow
- Added better error tracking and logging

### User Profile Management
- Fixed user profile update functionality
- Improved state management with NgRx
- Added proper validation and error handling
- Ensures all required fields are present in updates

### Type Safety
- Fixed TypeScript type definitions
- Improved type checking across the application
- Added proper interfaces for all models

## Development Guidelines

### Timestamps
- Always use `new Date().toISOString()` for timestamps
- Never use `Date.now()` for database operations
- Ensure timestamps are stored as strings in ISO format

### Error Handling
- Use the `ErrorRegistry` class for error handling
- Include proper error codes and messages
- Log errors with appropriate context

### User Updates
- Always include all required fields in update operations
- Validate input before sending to the server
- Handle errors appropriately and provide user feedback

### Type Safety
- Use proper TypeScript interfaces
- Avoid using `any` type
- Ensure all required fields are present in type definitions

## Response Type Contract for GraphQL Resolvers

All GraphQL response types follow a strict contract:

- `StatusCode`: Always non-nullable (`Int!`)
- `Message`: Always nullable (`String`)
- `Data`: Entity or list, as appropriate

### DynamoDB-backed Resolvers
- On success: `StatusCode` is always 200, `Message` is `null`, `Data` is the result
- On error: `StatusCode` is 500, `Message` is the error message, `Data` is `null`
- This is enforced in the VTL mapping template:

```vtl
#if($ctx.error)
  {
    "StatusCode": 500,
    "Message": "$ctx.error.message",
    "Data": null
  }
#else
  {
    "StatusCode": 200,
    "Message": null,
    "Data": $util.toJson($ctx.result)
  }
#end
```

### Lambda-backed Resolvers
- The Lambda function must return the full response object, e.g.:

```json
{
  "StatusCode": 404,
  "Message": "User not found",
  "Data": null
}
```

- The VTL simply passes through the Lambda's response:

```vtl
#if($ctx.error)
  {
    "StatusCode": 500,
    "Message": "$ctx.error.message",
    "Data": null
  }
#else
  $util.toJson($ctx.result)
#end
```

> **Note:** This contract is enforced in the GraphQL schema and all generated VTL templates. All resolvers must adhere to this structure for consistent error handling and client experience.
