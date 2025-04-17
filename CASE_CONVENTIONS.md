# Case Conventions

## General Rules
- File names: snake_case (e.g., `application_roles.yml`)
- Table names: PascalCase (e.g., `ApplicationRoles`)
- Attribute names: snake_case (e.g., `application_id`)
- Index names: kebab-case (e.g., `role-id-index`)

## AWS Resources
- CloudFormation resource names: PascalCase
  - Example: `ApplicationRolesTable`
  - Example: `ApplicationRolesDataSource`
- SSM parameter paths: kebab-case
  - Example: `/orb/integration-hub/dev/dynamodb/application-roles/table-name`
- DynamoDB table names: kebab-case
  - Example: `orb-integration-hub-dev-application-roles`

## GraphQL Schema
- Type names: PascalCase
  - Example: `ApplicationRoles`
  - Example: `ApplicationUsers`
- Field names: PascalCase
  - Example: `ApplicationRolesCreate`
  - Example: `ApplicationRolesQueryByRoleId`
  - Example: `ApplicationRolesUpdate`
- Resolver names: PascalCase
  - Example: `ApplicationRolesCreateResolver`
  - Example: `ApplicationRolesQueryByRoleIdResolver`
  - Example: `ApplicationRolesUpdateResolver`

## DynamoDB Operations
- Field names in DynamoDB: snake_case
  - Example: `application_id`
  - Example: `role_id`
  - Example: `created_at`
- Index names: kebab-case
  - Example: `role-id-index`
  - Example: `user-id-index`

## Best Practices
1. When using `schema.table` in templates:
   - Use as-is for PascalCase contexts (e.g., resource names, GraphQL types)
   - Use `to_kebab_case` filter for kebab-case contexts (e.g., SSM parameters, DynamoDB table names)
   - Use `to_snake_case` filter for snake_case contexts (e.g., DynamoDB field names)

2. When using key names in templates:
   - Use `to_pascal_case` filter for PascalCase contexts (e.g., resolver names)
   - Use `to_snake_case` filter for snake_case contexts (e.g., DynamoDB operations)
   - Use `to_kebab_case` filter for kebab-case contexts (e.g., index names)

3. Common Mistakes to Avoid:
   - Don't convert `schema.table` to another case when it's already in PascalCase
   - Don't use camelCase for GraphQL field names
   - Don't use PascalCase for DynamoDB field names
   - Don't use snake_case for index names 