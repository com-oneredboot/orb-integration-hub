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
   applicationsQueryById(input: ApplicationsQueryInput!): ApplicationsResponse
   ```

2. Mutation Operations:
   ```graphql
   applicationsCreate(input: ApplicationsCreateInput!): ApplicationsResponse
   applicationsUpdate(input: ApplicationsUpdateInput!): ApplicationsResponse
   applicationsDelete(id: ID!): ApplicationsResponse
   ```

### Application Roles

1. Query Operations:
   ```graphql
   applicationRolesQueryById(input: ApplicationRolesQueryInput!): ApplicationRolesResponse
   ```

2. Mutation Operations:
   ```graphql
   applicationRolesCreate(input: ApplicationRolesCreateInput!): ApplicationRolesResponse
   applicationRolesUpdate(input: ApplicationRolesUpdateInput!): ApplicationRolesResponse
   applicationRolesDelete(id: ID!): ApplicationRolesResponse
   ```

### Application Users

1. Query Operations:
   ```graphql
   applicationUsersQueryById(input: ApplicationUsersQueryInput!): ApplicationUsersResponse
   ```

2. Mutation Operations:
   ```graphql
   applicationUsersCreate(input: ApplicationUsersCreateInput!): ApplicationUsersResponse
   applicationUsersUpdate(input: ApplicationUsersUpdateInput!): ApplicationUsersResponse
   applicationUsersDelete(id: ID!): ApplicationUsersResponse
   ```

### Roles

1. Query Operations:
   ```graphql
   rolesQueryById(input: RolesQueryInput!): RolesResponse
   ```

2. Mutation Operations:
   ```graphql
   rolesCreate(input: RolesCreateInput!): RolesResponse
   rolesUpdate(input: RolesUpdateInput!): RolesResponse
   rolesDelete(id: ID!): RolesResponse
   ```

### Users

1. Query Operations:
   ```graphql
   usersQueryById(input: UsersQueryInput!): UsersResponse
   ```

2. Mutation Operations:
   ```graphql
   usersCreate(input: UsersCreateInput!): UsersResponse
   usersUpdate(input: UsersUpdateInput!): UsersResponse
   usersDelete(id: ID!): UsersResponse
   ```

## Response Types

All operations return a standard response type:

```graphql
type ApplicationsResponse {
  statusCode: Int!
  message: String!
  data: Applications
}

type ApplicationsListResponse {
  statusCode: Int!
  message: String!
  data: [Applications]
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
      "path": ["applicationsCreate"]
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