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

## Data Type Standards

### Timestamps
All timestamp fields (`created_at`, `updated_at`, etc.) must use ISO 8601 strings:
- Format: `YYYY-MM-DDTHH:mm:ss.sssZ` (e.g., `2025-03-07T16:23:17.488Z`)
- GraphQL Type: `String`
- Database Storage: String type containing ISO 8601 formatted value

The schema generator automatically handles timestamp fields to ensure consistency. Fields that are treated as timestamps include:
- `created_at`, `updated_at`, `deleted_at`, `last_modified`
- Any field ending with `_at` or `_date`