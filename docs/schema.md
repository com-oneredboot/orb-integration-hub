# Schema Documentation

## Overview

The Orb Integration Hub uses a schema-driven development approach. All data models are defined in YAML files and used to generate code for multiple platforms.

## Schema Structure

### Entity Definitions
Located in `schemas/entities/`:

- `applications.yml` - Application entity schema
- `application_roles.yml` - Application roles schema
- `application_users.yml` - Application users schema
- `roles.yml` - Roles schema
- `users.yml` - Users schema

### Code Generation Templates
Located in `schemas/templates/`:

- `python_model.jinja` - Template for Python model classes
- `typescript_model.jinja` - Template for TypeScript interfaces
- `graphql_schema.jinja` - Template for GraphQL schema
- `appsync_cloudformation.jinja` - Template for AppSync resolvers
- `dynamodb_cloudformation.jinja` - Template for DynamoDB tables

## Naming Conventions

### Schema Files
- File names: PascalCase (e.g., `Applications.yml`, `ApplicationRoles.yml`)
- Table names: PascalCase (e.g., `Applications`, `ApplicationRoles`)
- Attribute names: camelCase (e.g., `applicationId`, `roleId`)
- Index names: kebab-case (e.g., `application-name-index`)

### GraphQL Schema
- Type names: PascalCase (e.g., `Applications`, `ApplicationRoles`)
- Field names: camelCase (e.g., `applicationId`, `roleId`)
- Input types: PascalCase with Input suffix (e.g., `ApplicationsCreateInput`)
- Response types: PascalCase with Response suffix (e.g., `ApplicationsResponse`)
- List response types: PascalCase with ListResponse suffix (e.g., `ApplicationsListResponse`)
- Query operations: PascalCase with Query suffix (e.g., `ApplicationsQuery`)
- Mutation operations: PascalCase with action suffix (e.g., `ApplicationsCreate`, `ApplicationsUpdate`)
- Response fields: camelCase (e.g., `statusCode`, `message`, `data`)

### Database Tables
- Table names: kebab-case (e.g., `applications-table`, `application-roles-table`)
- Column names: camelCase (e.g., `applicationId`, `roleId`)

### Generated Code
- Python classes: PascalCase (e.g., `Applications`, `ApplicationRoles`)
- TypeScript interfaces: PascalCase (e.g., `Applications`, `ApplicationRoles`)
- Field names: camelCase in both TypeScript and Python

## Schema Generation

The schema generation process is handled by `schemas/generate.py`. This script:

1. Reads entity definitions from YAML files
2. Validates schema definitions
3. Generates:
   - Python models in `backend/src/models/`
   - TypeScript models in `frontend/src/models/`
   - GraphQL schema in `infrastructure/cloudformation/appsync_[timestamp].graphql`
   - DynamoDB template in `infrastructure/cloudformation/dynamodb.yml`
   - AppSync template in `infrastructure/cloudformation/appsync.yml`

### Running Schema Generation

```bash
python schemas/generate.py
```

### Generated Files

The generator creates:

1. Python Models:
   - `applications.py`
   - `application_roles.py`
   - `application_users.py`
   - `roles.py`
   - `users.py`

2. TypeScript Models:
   - `Applications.ts`
   - `ApplicationRoles.ts`
   - `ApplicationUsers.ts`
   - `Roles.ts`
   - `Users.ts`

3. GraphQL Schema:
   - Timestamped schema file (e.g., `appsync_20250417_072615.graphql`)
   - Contains all types, inputs, queries, and mutations

4. CloudFormation Templates:
   - DynamoDB tables configuration
   - AppSync resolvers and data sources

## Best Practices

1. Never edit generated files directly
2. Always update the YAML schema files in `schemas/entities/`
3. Run schema generation after any schema changes
4. Commit both schema changes and generated files
5. Keep naming conventions consistent across all layers
6. Update documentation when making schema changes 