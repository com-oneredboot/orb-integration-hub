# Schema Documentation

## Overview

The Orb Integration Hub uses a schema-driven development approach. All data models are defined in YAML files and used to generate code for multiple platforms.

## Schema Structure

### Entity Definitions
Located in `schemas/entities/`:

- `applications.yml` - Application entity schema
- `application_roles.yml` - Application roles schema (role definitions per application)
- `application_user_roles.yml` - Application user roles schema (user-role assignments per environment)
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
   - `application_user_roles.py`
   - `users.py`

2. TypeScript Models:
   - `Applications.ts`
   - `ApplicationRoles.ts`
   - `ApplicationUserRoles.ts`
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

## User Identity Model

**CRITICAL CONCEPT**: ALL users in the system are stored in the **Users** table. Everyone is a **User**. The distinction between different user types comes from:

1. **Cognito Groups** - Which group(s) a user belongs to (stored in the `groups` array field on Users table)
2. **Relationships** - Which organizations/applications they're associated with (via join tables)

The Users table is the single source of truth for ALL user identities.

### Cognito Groups Model

**Every user has AT LEAST the USER group** - it's the baseline for all authenticated users.

**Groups are additive and stored in an array** - a user can have multiple groups simultaneously:
- Platform Owner: `["USER", "OWNER"]` or `["USER", "CUSTOMER", "OWNER"]`
- Platform Employee: `["USER", "EMPLOYEE"]` or `["USER", "CUSTOMER", "EMPLOYEE"]`
- Customer (paying): `["USER", "CUSTOMER"]`
- End User (non-paying): `["USER"]`

**CUSTOMER group is tied to payment status**:
- Added when user subscribes/pays for platform
- Removed when subscription is cancelled
- Enables creating and owning organizations

### User Types Summary

| User Type | Cognito Group(s) | Description | Stored In | Relationships |
|-----------|------------------|-------------|-----------|---------------|
| **Platform Owner** | OWNER (+ USER, CUSTOMER optional) | User with full administrative access to platform | Users table | Can optionally have organization/application relationships |
| **Platform Employee** | EMPLOYEE (+ USER, CUSTOMER optional) | User who is internal team member | Users table | Can optionally have organization/application relationships |
| **Customer** | USER + CUSTOMER | User who is paying for platform subscription - can create organizations | Users table | OrganizationUsers → OWNER role in their organization(s)<br>Can also be EMPLOYEE in other organizations |
| **End User** | USER only | User with basic authenticated access - not paying for platform | Users table | OrganizationUsers → EMPLOYEE role in organizations<br>ApplicationUserRoles → permissions per environment |

**Key Points:** 
- Everyone is a **User** (stored in Users table)
- **Every user has at LEAST the USER group** - it's the baseline
- Cognito Groups are stored in the `groups` array field - **a user can have multiple groups**
- Groups are additive: USER is baseline, then CUSTOMER/EMPLOYEE/OWNER can be added
- CUSTOMER group is added when user pays for subscription, removed when they cancel

### OrganizationUsers Roles

When users are members of organizations (via OrganizationUsers table), they have organizational roles:

| Role | Description | How It's Assigned |
|------|-------------|-------------------|
| OWNER | Owner of the organization | Automatically assigned when CUSTOMER creates an organization |
| EMPLOYEE | Employee/member of the organization | Assigned when organization OWNER invites them |

**Note**: OrganizationUsers roles are separate from Cognito groups. A user with only USER Cognito group can be an EMPLOYEE in an organization.

## Key Tables and Relationships

| Table             | Primary Key            | Purpose                                 | References                        |
|-------------------|-----------------------|-----------------------------------------|------------------------------------|
| Users             | userId                | **ALL user identities** - Cognito mapping, groups, profile | —                                  |
| Organizations     | organizationId        | Customer organizations                  | ownerId (Users)                    |
| OrganizationUsers | userId + organizationId | User membership in organizations      | userId, organizationId             |
| Applications      | applicationId         | Customer applications                   | organizationId                     |
| ApplicationRoles  | applicationRoleId     | Role definitions per application        | applicationId                      |
| ApplicationUserRoles | applicationUserRoleId | Environment-specific role assignments | userId, applicationId, applicationRoleId |

### Join Tables

- **OrganizationUsers**: Maps users to organizations with organizational roles (OWNER, EMPLOYEE). References `userId` (Users) and `organizationId` (Organizations). The role field indicates whether the user owns the organization or is an employee/member.
- **ApplicationRoles**: Defines role types available within an application (e.g., Owner, Administrator, User, Guest). Each application can have custom roles with types like ADMIN, USER, GUEST, or CUSTOM. Default roles are created when an application is activated.
- **ApplicationUserRoles**: Maps users to roles within specific application environments (permissions). References `userId` (Users), `applicationId` (Applications), and `applicationRoleId` (ApplicationRoles). This table defines what role the user has in each environment (PRODUCTION, STAGING, etc.). Also stores denormalized `organizationId`, `organizationName`, and `applicationName` for efficient querying.

### Diagram

```
Users (userId) - ALL user identities
 ├─< OrganizationUsers (userId, organizationId) >─┐
 │                                                 |
 │   Organizations (organizationId) <─────────────┘
 │
 └─< ApplicationUserRoles (applicationUserRoleId, userId, applicationId, applicationRoleId, environment) >─┐
                                                                                                           |
     Applications (applicationId) <─┬─> ApplicationRoles (applicationRoleId)
```

## Notes
- All primary keys are now explicit and descriptive (e.g., `userId`, `applicationId`, `applicationRoleId`, `applicationUserRoleId`).
- **Every user has at least the USER Cognito group** - it's the baseline for all authenticated users.
- **Cognito groups are additive** - users can have multiple groups in their `groups` array field.
- **CUSTOMER Cognito group** is tied to payment/subscription status - added when user pays, removed when cancelled.
- **OrganizationUsers roles** (OWNER, EMPLOYEE) are separate from Cognito groups - they indicate organizational membership roles.
- **ApplicationRoles** defines role types available within an application (Owner, Administrator, User, Guest, or custom roles).
- **ApplicationUserRoles** assigns users to specific roles within application environments.
- Default roles (Owner, Administrator, User, Guest) are automatically created when an application is activated.
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