## AppSync Resolvers
- Resource names must be in PascalCase
- Field names in GraphQL schema should be in camelCase
- Resolver names should use PascalCase for both table names and key names
  - Example: `ApplicationRolesQueryByRoleIdResolver` (not `ApplicationRolesQueryByrole_idResolver`)
  - Example: `ApplicationUsersQueryByUserIdResolver` (not `ApplicationUsersQueryByuser_idResolver`)
- Response templates should use snake_case for DynamoDB field names
- Request templates should convert camelCase to snake_case for DynamoDB operations 