# Feature Request: Custom Lambda Operations for lambda-dynamodb Tables

## Summary
Add support for defining custom Lambda-backed operations on `lambda-dynamodb` tables that go beyond standard CRUD operations.

## Use Case
We have a `GetApplicationUsers` Lambda function that:
- Queries `ApplicationUserRoles` table (lambda-dynamodb type)
- Joins with `Users` table to enrich data (firstName, lastName, status)
- Deduplicates and groups role assignments by user
- Applies authorization filtering based on Cognito groups
- Returns paginated list of users with their role assignments

This is a LIST operation but requires custom logic that VTL resolvers cannot handle (joins, deduplication, authorization).

## Current Workaround
We manually:
1. Created the Lambda function at `apps/api/lambdas/get_application_users/index.py`
2. Manually added GraphQL types to `apps/api/graphql/schema.graphql` (which breaks on regeneration)
3. Manually created TypeScript query files
4. Manually configured AppSync Lambda resolver in CDK

This breaks the schema-driven workflow and requires manual maintenance.

## Proposed Solution

Add a `customOperations` section to `lambda-dynamodb` schemas:

```yaml
type: lambda-dynamodb
name: ApplicationUserRoles
# ... existing keys and attributes ...

customOperations:
  - name: GetApplicationUsers
    type: LIST  # or GET, CREATE, UPDATE, DELETE
    description: List users with their role assignments (Lambda handles authorization filtering)
    input:
      organizationIds:
        type: array
        items:
          type: string
        required: false
        description: Filter by organization IDs
      applicationIds:
        type: array
        items:
          type: string
        required: false
        description: Filter by application IDs
      environment:
        type: string
        required: false
        description: Filter by environment
      limit:
        type: integer
        required: false
        default: 50
        description: Maximum number of users to return (1-100)
      nextToken:
        type: string
        required: false
        description: Pagination token
    output:
      type: object
      object_ref: GetApplicationUsersOutput
      description: Paginated list of users with role assignments
```

## Expected Generated Code

### GraphQL Schema
```graphql
input GetApplicationUsersInput {
  organizationIds: [String]
  applicationIds: [String]
  environment: String
  limit: Int
  nextToken: String
}

type GetApplicationUsersOutput {
  users: [UserWithRoles!]!
  nextToken: String
}

type Query {
  GetApplicationUsers(input: GetApplicationUsersInput!): GetApplicationUsersOutput 
    @aws_auth(cognito_groups: ["OWNER", "EMPLOYEE", "CUSTOMER"])
}
```

### TypeScript Query File
```typescript
// apps/web/src/app/core/graphql/GetApplicationUsers.graphql.ts
export const GetApplicationUsers = /* GraphQL */ `
  query GetApplicationUsers($input: GetApplicationUsersInput!) {
    GetApplicationUsers(input: $input) {
      users {
        userId
        firstName
        lastName
        status
        roleAssignments {
          applicationUserRoleId
          applicationId
          applicationName
          organizationId
          organizationName
          environment
          roleId
          roleName
          permissions
          status
          createdAt
          updatedAt
        }
      }
      nextToken
    }
  }
`;
```

### CDK Lambda Resolver
```python
# infrastructure/cdk/generated/appsync/resolvers.py
get_application_users_lambda = _lambda.Function(
    self, "GetApplicationUsersFunction",
    runtime=_lambda.Runtime.PYTHON_3_12,
    handler="index.lambda_handler",
    code=_lambda.Code.from_asset("apps/api/lambdas/get_application_users"),
    # ... environment variables, etc.
)

api.add_lambda_data_source(
    "GetApplicationUsersDataSource",
    get_application_users_lambda
)

# Resolver configuration
```

## Benefits
1. **Schema-driven**: Custom operations defined in YAML, not manual code
2. **Type safety**: Auto-generated TypeScript types and queries
3. **Consistency**: Follows same patterns as standard CRUD operations
4. **Maintainability**: Regeneration doesn't break custom operations
5. **Documentation**: Custom operations documented in schema

## Authorization Handling
- The table-level `authConfig` applies to custom operations (which Cognito groups can call)
- Complex authorization logic (e.g., CUSTOMER can only see their own orgs) is handled inside the Lambda function itself
- This separation keeps the schema clean while allowing flexible authorization

## Related Files
- Lambda implementation: `apps/api/lambdas/get_application_users/index.py`
- Schema: `schemas/tables/ApplicationUserRoles.yml`
- Spec: `.kiro/specs/application-users-management/`

## Questions
1. Should `customOperations` support all CRUD types (GET, LIST, CREATE, UPDATE, DELETE)?
2. Should there be validation rules (e.g., conditionallyRequired, min/max)?
3. How should output types reference other models (object_ref vs inline definition)?
4. Should custom operations inherit table-level authConfig or require their own?
