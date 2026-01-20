# Lambda Type Auth Directives Not Generated in GraphQL Schema

## Summary

Lambda-backed GraphQL operations with `apiKeyAuthentication` config do not get `@aws_api_key` directives generated on either the query/mutation field OR the return type, causing AppSync to reject access to response fields.

## Environment

- orb-schema-generator version: 0.18.2
- orb-integration-hub using Lambda type schema for `CheckEmailExists`

## Schema Configuration

```yaml
# schemas/lambdas/CheckEmailExists.yml
type: lambda
name: CheckEmailExists
targets:
  - api
model:
  operation: query
  authConfig:
    apiKeyAuthentication:
      - CheckEmailExists
  attributes:
    email:
      type: string
      required: true
    exists:
      type: boolean
      required: false
    cognitoStatus:
      type: string
      required: false
    cognitoSub:
      type: string
      required: false
```

## Generated GraphQL (Current - Broken)

```graphql
type CheckEmailExists {
  email: String!
  exists: Boolean
  cognitoStatus: String
  cognitoSub: String
}

type Query {
  CheckEmailExists(input: CheckEmailExistsInput!): CheckEmailExists
  # Missing @aws_api_key directive!
}
```

## Expected GraphQL

```graphql
type CheckEmailExists @aws_api_key {
  email: String!
  exists: Boolean
  cognitoStatus: String
  cognitoSub: String
}

type Query {
  CheckEmailExists(input: CheckEmailExistsInput!): CheckEmailExists @aws_api_key
}
```

## Error from AppSync

```json
{
  "errors": [
    {
      "path": ["CheckEmailExists", "email"],
      "errorType": "Unauthorized",
      "message": "Not Authorized to access email on type CheckEmailExists"
    },
    {
      "path": ["CheckEmailExists", "exists"],
      "errorType": "Unauthorized", 
      "message": "Not Authorized to access exists on type CheckEmailExists"
    }
  ]
}
```

## Root Cause Analysis

In `src/generators/graphql_generator.py`:

1. **Query generation (lines 612-613)** - Lambda queries are generated WITHOUT auth directives:
   ```python
   if isinstance(schema, LambdaType) and schema.operation == "query":
       lines.append(f"  {schema.name}(input: {schema.name}Input!): {schema.name}")
       # Missing: auth directive from schema.auth_config
   ```

2. **Type generation (lines 373-404)** - Types are generated WITHOUT auth directives:
   ```python
   lines.append(f"type {type_name} {{")
   # Missing: @aws_api_key or @aws_auth directive on type
   ```

3. **`_generate_auth_directive` method** only handles `Operation` objects, not `LambdaType.auth_config`

## Proposed Fix

1. Add method to generate auth directive from `LambdaType.auth_config`:
   ```python
   def _generate_lambda_auth_directive(self, schema: LambdaType) -> str:
       if not schema.auth_config:
           return ""
       if "apiKeyAuthentication" in schema.auth_config:
           return "@aws_api_key"
       if "cognitoAuthentication" in schema.auth_config:
           groups = schema.auth_config["cognitoAuthentication"].get("groups", {})
           group_names = list(groups.keys())
           if group_names:
               return f'@aws_auth(cognito_groups: [{", ".join(f\'"{g}\'" for g in group_names)}])'
       return ""
   ```

2. Apply directive to Lambda query/mutation generation
3. Apply directive to type definition when type has auth_config

## Impact

- **Severity**: High - Breaks all Lambda-backed public endpoints
- **Affected**: Any Lambda type with `apiKeyAuthentication` config
- **Workaround**: None - requires manual schema editing after generation

## Related

- Issue #63 introduced Lambda type support but didn't implement auth directive generation
