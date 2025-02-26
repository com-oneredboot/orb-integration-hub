# Schema Generator

This directory contains the schema generator for the Orb Integration Hub project.

## Available Scripts

### `run-generator.sh`

Runs the schema generator to create:
- TypeScript models
- Python models
- GraphQL schemas
- DynamoDB CloudFormation templates

### `deploy.sh`

A convenient script that:
1. Runs the schema generator
2. Deploys the generated schema to AWS AppSync

**Usage**:
```bash
./deploy.sh
```

**What it does**:
1. Calls `run-generator.sh` to generate the latest schema
2. Calls the deployment script in the backend to:
   - Upload the schema to S3
   - Update the CloudFormation stack
   - Update the AppSync schema directly

## Schema Files

- `index.yml`: Registry of all schema files
- `tables/`: Contains table definitions (users, roles, etc.)
- `core/`: Core types and validators
- `templates/`: Jinja2 templates for code generation