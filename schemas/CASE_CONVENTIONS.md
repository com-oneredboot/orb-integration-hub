# Case Conventions

This document outlines the case conventions used throughout the codebase. Following these conventions consistently will help maintain code clarity and prevent issues with AWS resource naming.

## Table Names

### Schema Files (`schemas/entities/*.yml`)
- **File Names**: snake_case (e.g., `application_users.yml`)
- **Table Property**: PascalCase (e.g., `table: ApplicationUsers`)
- **Index Names**: kebab-case (e.g., `user-applications-index`)
- **Attribute Names**: snake_case (e.g., `application_id`, `user_id`)

### DynamoDB Resources
- **Table Names**: PascalCase (e.g., `ApplicationsTable`, `ApplicationUsersTable`)
- **TableName Property**: PascalCase (e.g., `TableName: orb-integration-hub-dev-ApplicationUsers`)
- **SSM Parameter Names**: kebab-case (e.g., `orb-integration-hub-dev-application-users-table-arn`)

### Lambda Resources
- **SSM Parameter References**: kebab-case (e.g., `{{resolve:ssm:${CustomerId}-${ProjectId}-${Environment}-users-table-arn}}`)

## Code Generation

### Python
- **Class Names**: PascalCase (e.g., `ApplicationUsers`)
- **Method Names**: snake_case (e.g., `get_user_by_id`)
- **Variable Names**: snake_case (e.g., `user_id`)

### TypeScript
- **Interface Names**: PascalCase (e.g., `IApplicationUser`)
- **Type Names**: PascalCase (e.g., `ApplicationUserStatus`)
- **Enum Names**: PascalCase (e.g., `ApplicationUserStatus`)
- **Enum Values**: UPPER_SNAKE_CASE (e.g., `ACTIVE`, `INACTIVE`)

### GraphQL
- **Type Names**: PascalCase (e.g., `ApplicationUser`)
- **Field Names**: camelCase (e.g., `userId`, `applicationId`)

## AWS Resources

### CloudFormation
- **Resource Names**: PascalCase (e.g., `ApplicationUsersTable`)
- **Parameter Names**: PascalCase (e.g., `Environment`, `CustomerId`)
- **Output Names**: PascalCase (e.g., `ApplicationUsersTableArn`)

### SSM Parameters
- **Parameter Names**: kebab-case (e.g., `orb-integration-hub-dev-application-users-table-arn`)
- **Parameter Paths**: kebab-case (e.g., `/orb/integration-hub/dev/application-users`)

## Best Practices

1. **Consistency**: Always use the specified case for each context. Don't mix cases within the same context.
2. **Documentation**: Update this document when adding new case conventions.
3. **Validation**: The schema generator should validate case conventions during generation.
4. **Templates**: Ensure all templates follow these conventions when generating resources.

## Common Mistakes to Avoid

1. Using PascalCase for SSM parameter names (should be kebab-case)
2. Using kebab-case for DynamoDB table names (should be PascalCase)
3. Mixing cases within the same context (e.g., using both `userId` and `user_id` in the same file)
4. Using snake_case for TypeScript/GraphQL types (should be PascalCase) 