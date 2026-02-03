# Orb Integration Hub

A modern integration platform built with AWS AppSync, DynamoDB, and TypeScript/Python.

## Overview

Orb Integration Hub is a serverless application that provides a unified API for integrating various services and data sources. It uses AWS AppSync for GraphQL API, DynamoDB for data storage, and supports both TypeScript (frontend) and Python (backend) clients.

## Quick Links

- [Architecture Documentation](docs/architecture.md) - System design and component interactions
- [Development Guide](docs/development.md) - Setup and development workflow
- [Frontend Design Plan](docs/frontend-design.md) - Frontend architecture, UI/UX, and features
- [API Documentation](docs/api.md) - GraphQL API reference and examples
- [Schema Documentation](docs/schema.md) - Data models and schema definitions

## Getting Started

1. Review the [Development Guide](docs/development.md) for setup instructions
2. Check the [Architecture Documentation](docs/architecture.md) to understand the system
3. Explore the [API Documentation](docs/api.md) to start integrating

### Prerequisites

- Python 3.12+
- Node.js 20.x+
- AWS CLI configured with `--profile sso-orb-dev`
- pipenv for Python dependency management
- npm for TypeScript dependency management

### Quick Setup

```bash
# Clone the repository
git clone https://github.com/com-oneredboot/orb-integration-hub.git
cd orb-integration-hub

# Set up reference repositories (required for standards and MCP server)
mkdir -p repositories
git clone https://github.com/com-oneredboot/orb-templates.git repositories/orb-templates
git clone https://github.com/com-oneredboot/orb-infrastructure.git repositories/orb-infrastructure

# Install orb-templates MCP server (REQUIRED for Kiro users)
./repositories/orb-templates/scripts/install-mcp.sh --profile sso-orb-dev
# Then restart Kiro

# Install backend dependencies
cd apps/api && pipenv install --dev

# Install frontend dependencies
cd ../web && npm install
```

### orb-templates MCP Server

This project uses the orb-templates MCP server to provide access to organization standards directly in Kiro. After running the install script above, you'll have access to:

- `search_standards` - Search coding standards, testing guidelines, project structure docs
- `validate_naming` - Validate AWS resource names against orb conventions
- `get_workflow_template` - Get GitHub Actions workflow templates

The MCP server is configured in `.kiro/settings/mcp.json` and hooks in `.kiro/hooks/` will automatically remind you to use these tools when relevant.

## Project Structure

This project follows the Nx-style monorepo structure aligned with orb-templates standards:

```
orb-integration-hub/
├── apps/                    # Application code
│   ├── api/                 # Python backend (Lambda functions, layers)
│   │   ├── lambdas/         # Lambda function handlers
│   │   ├── layers/          # Lambda layers
│   │   ├── models/          # Generated Python models
│   │   ├── enums/           # Generated Python enums
│   │   ├── graphql/         # GraphQL schema and resolvers
│   │   ├── Pipfile          # Python dependencies
│   │   └── Pipfile.lock
│   └── web/                 # Angular frontend application
│       ├── src/             # Source code
│       ├── package.json     # Node.js dependencies
│       └── angular.json     # Angular configuration
├── packages/                # Shared packages (future use)
├── schemas/                 # Schema definitions
│   ├── models/              # Model schema definitions
│   ├── tables/              # DynamoDB table schemas
│   ├── core/                # Core types and enums
│   ├── lambdas/             # Lambda resolver schemas
│   └── registries/          # Registry definitions
├── infrastructure/          # AWS CDK infrastructure
│   └── cdk/                 # CDK Python application
│       ├── app.py           # CDK app entry point
│       ├── config.py        # Configuration management
│       ├── stacks/          # Stack definitions
│       ├── shared_constructs/ # Reusable constructs
│       └── generated/       # Auto-generated CDK constructs
├── docs/                    # Technical documentation
├── repositories/            # Reference repositories (READ-ONLY)
│   ├── orb-templates/       # Standards and documentation
│   ├── orb-infrastructure/  # Shared infrastructure
│   └── orb-geo-fence/       # Example project
├── .kiro/                   # Kiro AI assistant configuration
│   ├── steering/            # Steering files for AI guidance
│   └── specs/               # Feature specifications
├── .github/                 # GitHub configuration
│   ├── workflows/           # CI/CD workflows
│   ├── ISSUE_TEMPLATE/      # Issue templates
│   └── ISSUES/              # Cross-team issue tracking
└── schema-generator.yml     # orb-schema-generator configuration
```

## Development Workflow

### Schema-Driven Development

The project uses `orb-schema-generator` for code generation from YAML schemas:

```bash
# Validate schemas
orb-schema-generator validate

# Generate code (Python models, TypeScript interfaces, GraphQL schema)
orb-schema-generator generate
```

Configuration is in `schema-generator.yml`. Generated files go to:
- Python models: `apps/api/models/`
- Python enums: `apps/api/enums/`
- TypeScript models: `apps/web/src/app/core/models/`
- GraphQL schema: `apps/api/graphql/`

### Running Tests

```bash
# Backend tests
cd apps/api && pipenv run pytest

# Frontend tests
cd apps/web && npm test

# Property-based tests
bash tests/property/test_import_path_migration.sh
bash tests/property/test_schema_generator_output.sh
```

### Code Quality with Pre-commit

This project uses pre-commit hooks for automated code quality checks. The hooks run ruff, black, mypy, and file hygiene checks.

```bash
# Install pre-commit hooks (first time setup)
cd apps/api && pipenv install --dev
pipenv run pre-commit install

# Or create custom wrapper to check ALL files (recommended)
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
cd apps/api && pipenv run pre-commit run --config=../../.pre-commit-config.yaml --all-files
EOF
chmod +x .git/hooks/pre-commit

# Run hooks manually
pipenv run pre-commit run --all-files

# Update hooks to latest versions
pipenv run pre-commit autoupdate
```

### Linting and Formatting

```bash
# Backend
cd apps/api
pipenv run black .
pipenv run ruff check . --fix
pipenv run mypy src/

# Frontend
cd apps/web
npm run lint
npm run format
```

## Deployment

Deployment is handled via GitHub Actions workflows:

- `deploy-infrastructure.yml` - CDK infrastructure deployment (synth/diff/deploy)
- `deploy-website.yml` - Angular frontend deployment to S3/CloudFront
- `comprehensive-testing.yml` - Full test suite

### CDK Commands

```bash
cd infrastructure

# Synthesize CloudFormation templates
cdk synth --all \
  -c customer_id=orb \
  -c project_id=integration-hub \
  -c environment=dev

# Preview changes
cdk diff --all \
  -c customer_id=orb \
  -c project_id=integration-hub \
  -c environment=dev

# Deploy all stacks
cdk deploy --all --require-approval never \
  -c customer_id=orb \
  -c project_id=integration-hub \
  -c environment=dev
```

### Running CDK Tests

```bash
cd infrastructure
pipenv install --dev
pipenv run pytest cdk/tests/ -v
```

## AWS Configuration

- Profile: `sso-orb-dev`
- Region: `us-east-1`
- CodeArtifact domain: `orb-infrastructure-shared-codeartifact-domain`
- CodeArtifact repository: `orb-shared`

## Cross-Team Collaboration

This project follows orb-templates standards for cross-team collaboration:

- **Issue Templates**: Use `.github/ISSUE_TEMPLATE/` for bug reports, enhancements, etc.
- **Cross-Team Issues**: Track upstream blockers in `.github/ISSUES/`
- **GitHub Issue Ownership**: Never close issues created by another team

## Kiro AI Assistant

This project includes Kiro steering files for AI-assisted development:

- `project-standards.md` - Always loaded, core project configuration
- `testing-standards.md` - Loaded when working with test files
- `infrastructure.md` - Loaded when working with CloudFormation
- `api-development.md` - Loaded when working with backend code
- `reference-projects.md` - Manual trigger with `#reference-projects`
- `git-workflow.md` - Manual trigger with `#git-workflow`
- `troubleshooting-guide.md` - Manual trigger with `#troubleshooting-guide`

## Response Type Contract for GraphQL Resolvers

All GraphQL response types follow a strict contract:

- `StatusCode`: Always non-nullable (`Int!`)
- `Message`: Always nullable (`String`)
- `Data`: Entity or list, as appropriate

### DynamoDB-backed Resolvers
```vtl
#if($ctx.error)
  { "StatusCode": 500, "Message": "$ctx.error.message", "Data": null }
#else
  { "StatusCode": 200, "Message": null, "Data": $util.toJson($ctx.result) }
#end
```

### Lambda-backed Resolvers
Lambda returns the full response object:
```json
{ "StatusCode": 404, "Message": "User not found", "Data": null }
```

## License

[Add your license information here]
