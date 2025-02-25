# DynamoDB Resolver Standards and Best Practices

## Core Principles

When working with DynamoDB resolvers in AppSync, follow these standards to ensure consistent behavior across all resolvers.

## Update Operation Standards

### Static Update Approach (Recommended)

The standard pattern for DynamoDB update operations in AppSync resolvers:

```graphql
{
  "version": "2018-05-29",
  "operation": "UpdateItem",
  "key": {
    "primary_key": $util.dynamodb.toDynamoDBJson($ctx.args.input.primary_key)
  },
  "update": {
    "expression": "set field1 = :field1, field2 = :field2",
    "expressionValues": {
      ":field1": $util.dynamodb.toDynamoDBJson($ctx.args.input.field1),
      ":field2": $util.dynamodb.toDynamoDBJson($ctx.args.input.field2)
    }
  }
}
```

### Key Components

1. **Version**: Always use the latest resolver version (`2018-05-29`)
2. **Key**: Include only the primary key (and sort key if applicable)
3. **Update Expression**: Use a fixed expression that updates all required fields
4. **Expression Values**: Include all values referenced in the expression

### Type Handling

- Always use `$util.dynamodb.toDynamoDBJson()` for all values
- Do not use naked string values - always wrap with DynamoDB JSON conversion
- Use a static update expression rather than dynamic expression building
- Avoid dynamic map building with bracket notation as it can cause type errors

### Response Templates

Standard response template:

```graphql
#if($ctx.error)
  $util.error($ctx.error.message, $ctx.error.type)
#end

{
  "status_code": 200,
  "message": "Resource updated successfully"
}
```

## Query Operation Standards

The standard pattern for DynamoDB get operations:

```graphql
{
  "version": "2018-05-29",
  "operation": "GetItem",
  "key": {
    "primary_key": $util.dynamodb.toDynamoDBJson($ctx.args.input.primary_key)
  }
}
```

## Common Pitfalls to Avoid

1. **Expression Building**: Avoid dynamically building expressions as this can lead to format errors
2. **Parameter Formats**: Always use the same parameter format throughout the resolver
3. **Complex Logic**: Keep resolvers simple and focused - business logic should be in a Lambda function
4. **String vs Object Errors**: The most common error is "Expected JSON object for attribute value but got STRING instead" which occurs when trying to build dynamic expressionValues

## Working Example: Static Update Expression

This approach is simple and reliable, with predictable results:

```graphql
{
  "version": "2018-05-29",
  "operation": "UpdateItem",
  "key": {
    "user_id": $util.dynamodb.toDynamoDBJson($ctx.args.input.user_id)
  },
  "update": {
    "expression": "set first_name = :first_name, last_name = :last_name",
    "expressionValues": {
      ":first_name": $util.dynamodb.toDynamoDBJson($ctx.args.input.first_name),
      ":last_name": $util.dynamodb.toDynamoDBJson($ctx.args.input.last_name)
    }
  }
}
```

## For Advanced Cases: Lambda-Enhanced Resolvers

For cases that require dynamic expressions or complex logic, use a Lambda function:

```graphql
{
  "version": "2018-05-29",
  "operation": "Invoke",
  "payload": {
    "field": "updateUser",
    "arguments": $utils.toJson($ctx.arguments)
  }
}
```

The Lambda function can then build the proper DynamoDB expressions with full access to language features for complex logic.

## Testing Update Operations

When testing update operations:

1. Always include all fields in the input, even if they don't change
2. Verify the operation by fetching the item after update
3. Check the logs for any expression or type errors
4. If you get STRING vs OBJECT errors, switch to the static approach