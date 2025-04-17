# API Documentation

## Overview

The Orb Integration Hub exposes a GraphQL API through AWS AppSync. The API provides CRUD operations for managing applications, roles, and users.

## Authentication

The API supports two authentication methods:

1. **Cognito User Pool**: Primary authentication method for user operations
   - Required for all admin operations
   - User must belong to the "admin" group

2. **API Key**: Secondary authentication for unauthenticated access
   - Limited to specific operations
   - Key stored in AWS Secrets Manager

## API Operations

### Applications

1. Query Operations:
   ```graphql
   ApplicationsQuery(input: ApplicationsQueryInput!): ApplicationsResponse
   ```

2. Mutation Operations:
   ```graphql
   ApplicationsCreate(input: ApplicationsCreateInput!): ApplicationsResponse
   ApplicationsUpdate(input: ApplicationsUpdateInput!): ApplicationsResponse
   ApplicationsDelete(id: ID!): ApplicationsResponse
   ```

### Application Roles

1. Query Operations:
   ```graphql
   ApplicationRolesQuery(input: ApplicationRolesQueryInput!): ApplicationRolesResponse
   ```

2. Mutation Operations:
   ```graphql
   ApplicationRolesCreate(input: ApplicationRolesCreateInput!): ApplicationRolesResponse
   ApplicationRolesUpdate(input: ApplicationRolesUpdateInput!): ApplicationRolesResponse
   ApplicationRolesDelete(id: ID!): ApplicationRolesResponse
   ```

### Application Users

1. Query Operations:
   ```graphql
   ApplicationUsersQuery(input: ApplicationUsersQueryInput!): ApplicationUsersResponse
   ```

2. Mutation Operations:
   ```graphql
   ApplicationUsersCreate(input: ApplicationUsersCreateInput!): ApplicationUsersResponse
   ApplicationUsersUpdate(input: ApplicationUsersUpdateInput!): ApplicationUsersResponse
   ApplicationUsersDelete(id: ID!): ApplicationUsersResponse
   ```

### Roles

1. Query Operations:
   ```graphql
   RolesQuery(input: RolesQueryInput!): RolesResponse
   ```

2. Mutation Operations:
   ```graphql
   RolesCreate(input: RolesCreateInput!): RolesResponse
   RolesUpdate(input: RolesUpdateInput!): RolesResponse
   RolesDelete(id: ID!): RolesResponse
   ```

### Users

1. Query Operations:
   ```graphql
   UsersQuery(input: UsersQueryInput!): UsersResponse
   ```

2. Mutation Operations:
   ```graphql
   UsersCreate(input: UsersCreateInput!): UsersResponse
   UsersUpdate(input: UsersUpdateInput!): UsersResponse
   UsersDelete(id: ID!): UsersResponse
   ```

## Response Types

All operations return a standard response type:

```graphql
type ApplicationsResponse {
  StatusCode: Int!
  Message: String!
  Data: Applications
}

type ApplicationsListResponse {
  StatusCode: Int!
  Message: String!
  Data: [Applications]
}
```

## Error Handling

The API uses standard HTTP status codes and GraphQL errors:

- 200: Success
- 400: Bad Request (invalid input)
- 401: Unauthorized (missing or invalid authentication)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 500: Internal Server Error

Error responses include:
- Status code
- Error message
- Error type (for debugging)

Example error:
```json
{
  "errors": [
    {
      "message": "Not authorized to access this resource",
      "errorType": "UnauthorizedException",
      "path": ["ApplicationsCreate"]
    }
  ]
}
```

## Best Practices

1. Always use input types for mutations
2. Include proper error handling in clients
3. Use appropriate authentication method
4. Follow naming conventions
5. Test responses for both success and error cases
6. Keep queries focused and specific
7. Use proper authorization headers 