# Schema Generator

This directory contains the schema generator for the Orb Integration Hub project.

## IMPORTANT: Schema-Driven Development

This project follows a schema-driven development approach where:

1. **Single Source of Truth**: 
   - ALL database tables, GraphQL types, and models are defined in the `schemas/tables/` directory
   - NEVER create or modify CloudFormation templates directly in `backend/infrastructure/cloudformation/`
   - The schema generator creates all necessary infrastructure code

2. **Schema Definition Process**:
   - Create/modify table definitions in `schemas/tables/`
   - Run the schema generator
   - Generated files are placed in appropriate directories
   - Deploy through GitHub Actions workflow

3. **File Organization**:
   ```
   schemas/
   ├── tables/          # TABLE DEFINITIONS GO HERE (Single source of truth)
   │   ├── users.yml
   │   ├── roles.yml
   │   └── etc...
   ├── core/           # Core types and validators
   ├── templates/      # Code generation templates
   ├── graphql/        # GraphQL specific definitions
   └── index.yml       # Schema registry
   ```

## Generated Files

### GraphQL Schema Files
- The schema generator creates timestamped AppSync schema files (e.g., `appsync_20250321_164810.graphql`)
- These files are placed in `backend/infrastructure/cloudformation/`
- **IMPORTANT**: Do not create or maintain a separate `schema.graphql` file
- The timestamped AppSync schema file is the single source of truth for GraphQL schema
- The deployment workflow uses the latest timestamped schema file

### Other Generated Files
- TypeScript models in `frontend/src/models/`
- Python models in `backend/src/models/`
- DynamoDB CloudFormation templates in `backend/infrastructure/cloudformation/`

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

## Table Schema Structure

Each table schema in `tables/` must follow this structure:
```yaml
# file: schemas/tables/example.yml
version: '1.0'
table: example
model:
  auth_config:
    api_key_operations: []    # Operations that allow API key access
    default_auth: user_pools  # Default auth mode
  keys:
    primary:
      partition: id          # Primary key definition
    secondary: []           # Secondary indexes
  attributes:
    id:
      type: string
      required: true
    # ... other attributes
```