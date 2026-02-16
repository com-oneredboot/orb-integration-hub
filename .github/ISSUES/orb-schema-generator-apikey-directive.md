# Bug: apiKeyAuthentication directive not rendered in GraphQL schema

## Summary

The `apiKeyAuthentication` configuration in schema YAML files is correctly parsed and stored in `response_auth_directives`, but the `@aws_api_key` directive is never rendered in the generated GraphQL schema.

## Team

orb-integration-hub

## Contact

Corey Dale Peters

## Version

orb-schema-generator 0.13.6

## Steps to Reproduce

1. Create a schema with `apiKeyAuthentication` configured:

```yaml
# schemas/tables/Users.yml
type: dynamodb
name: Users
targets:
  - api
model:
  authConfig:
    apiKeyAuthentication:
      - UsersQueryByEmail
      - UsersCreate
    cognitoAuthentication:
      groups:
        USER:
          - '*'
  keys:
    primary:
      partition: userId
    secondary:
      - name: EmailIndex
        type: GSI
        partition: email
        projection_type: ALL
  attributes:
    userId:
      type: string
      required: true
    email:
      type: string
      required: true
```

2. Run `orb-schema generate`

3. Check the generated GraphQL schema

## Expected Behavior

The generated GraphQL should include both directives:

```graphql
type Query {
  UsersQueryByEmail(input: UsersQueryByEmailInput!): UsersResponse @aws_api_key @aws_auth(cognito_groups: ["USER"])
}
```

## Actual Behavior

The generated GraphQL only includes the cognito auth directive:

```graphql
type Query {
  UsersQueryByEmail(input: UsersQueryByEmailInput!): UsersResponse @aws_auth(cognito_groups: ["USER"])
```

The `@aws_api_key` directive is missing.

## Root Cause Analysis

The bug is in `src/generators/graphql_generator.py` in the `_generate_auth_directive()` method (around line 665-688):

```python
def _generate_auth_directive(self, operation: Operation) -> str:
    if not operation.response_auth_directives:
        return ""

    # Extract cognito groups from directives
    groups = []
    for directive in operation.response_auth_directives:
        if "cognito_groups" in directive:  # <-- Only looks for cognito_groups
            groups_str = directive.split("cognito_groups: [")[1].split("]")[0]
            groups = [g.strip().strip('"') for g in groups_str.split(",")]
            break

    if groups:
        groups_str = ", ".join([f'"{g}"' for g in groups])
        return f"@aws_auth(cognito_groups: [{groups_str}])"

    return ""  # <-- @aws_api_key is never rendered
```

The method only extracts and renders `@aws_auth(cognito_groups: [...])` directives. It completely ignores `@aws_api_key` even though:

1. The `OperationBuilder._get_auth_directives()` correctly adds `@aws_api_key` to `response_auth_directives`
2. The directive is stored in the Operation object

## Suggested Fix

Update `_generate_auth_directive()` to render all directives in `response_auth_directives`:

```python
def _generate_auth_directive(self, operation: Operation) -> str:
    if not operation.response_auth_directives:
        return ""
    
    # Return all directives joined with space
    return " ".join(operation.response_auth_directives)
```

Or if more control is needed:

```python
def _generate_auth_directive(self, operation: Operation) -> str:
    if not operation.response_auth_directives:
        return ""
    
    directives = []
    for directive in operation.response_auth_directives:
        if directive == "@aws_api_key":
            directives.append("@aws_api_key")
        elif "cognito_groups" in directive:
            directives.append(directive)
    
    return " ".join(directives)
```

## Impact

- **High** - This prevents using API key authentication for public endpoints (like email existence checks during signup)
- Affects any schema that needs both Cognito and API key authentication on the same operation
- Workaround: Manually edit the generated GraphQL schema (not ideal as it gets overwritten)

## Use Case

We need `@aws_api_key` on `UsersQueryByEmail` to allow unauthenticated users to check if their email exists during the signup/signin flow. Currently, the query fails for unauthenticated users because only `@aws_auth` is rendered.
