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

## Key Tables and Relationships

| Table             | Primary Key            | Purpose                                 | References                        |
|-------------------|-----------------------|-----------------------------------------|------------------------------------|
| Users             | userId                | Identity, Cognito mapping, groups       | —                                  |
| Applications      | applicationId         | Customer applications                   | ownerId (Users)                    |
| Roles             | roleId                | Canonical role definitions              | —                                  |
| ApplicationRoles  | applicationRoleId     | User's role(s) in a specific app        | userId, applicationId, roleId      |
| ApplicationUsers  | applicationUserId     | User's membership in an application     | userId, applicationId              |

### Join Tables

- **ApplicationRoles**: Maps a user to a role within a specific application. References `userId` (Users), `applicationId` (Applications), and `roleId` (Roles).
- **ApplicationUsers**: Maps a user to an application. References `userId` (Users) and `applicationId` (Applications).

### Diagram

```
Users (userId)
 └─< ApplicationUsers (applicationUserId, userId, applicationId) >─┐
                                                                   |
Applications (applicationId) <─┘

Users (userId)
 └─< ApplicationRoles (applicationRoleId, userId, applicationId, roleId) >─┐
                                                                           |
Applications (applicationId) <─┬─> Roles (roleId)
```

## Notes
- All primary keys are now explicit and descriptive (e.g., `userId`, `applicationId`, `roleId`, `applicationRoleId`, `applicationUserId`).
- Roles are not stored directly on the user; use ApplicationRoles for all role assignments.
- ApplicationUsers is used for managing user membership in applications.
- This structure supports multi-tenancy, custom roles per application, and scalable authorization. 

## Code Generation & GraphQL Auth Guarantees

- Query operations are generated for both primary and all secondary indexes for every table schema.
- Each query and mutation operation in the generated GraphQL schema is guaranteed to have an explicit `@aws_auth` directive, as enforced by the YAML schemas.
- The YAML schemas in `schemas/entities/` are the single source of truth for all model, index, and authentication configuration.
- The code generation pipeline will fail if any query or mutation is missing an explicit group assignment in the YAML, ensuring no operation is left unauthenticated.
- All naming conventions for operations, types, and indexes are now strictly enforced and validated.

### Pipeline Improvements
- The generator now automatically includes queries for both primary and secondary indexes.
- Operation names are consistent and predictable, matching the YAML schema definitions.
- Validation ensures that all required fields, keys, and auth directives are present and correct.

Refer to this section when updating schemas or troubleshooting codegen issues. 