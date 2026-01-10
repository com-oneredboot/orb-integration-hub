# GraphQL enum values generated with invalid hyphens

## Context

From: orb-integration-hub  
Related: Infrastructure modernization - CDK migration

## Issue

When generating GraphQL schema from registry YAML files, the generator creates enum values with hyphens (e.g., `ORB-AUTH-001`), which are invalid in GraphQL.

## Error

```
Schema Creation Status is FAILED with details: Failed to parse schema document - ensure it's a valid SDL-formatted document.
```

GraphQL schema linter output:
```
1168:7 Syntax Error: Invalid number, expected digit but got: "A".
```

## Source

`schemas/registries/ErrorRegistry.yml`:
```yaml
items:
  ORB-AUTH-001:
    message: Invalid email format
    ...
```

## Generated Output (Invalid)

```graphql
enum ErrorRegistry {
  ORB-AUTH-001  # Invalid - hyphens not allowed
  ORB-AUTH-002
  ...
}
```

## Expected Output

```graphql
enum ErrorRegistry {
  ORB_AUTH_001  # Valid - underscores
  ORB_AUTH_002
  ...
}
```

## Workaround

Manual sed replacement:
```bash
sed -i 's/ORB-AUTH-/ORB_AUTH_/g; s/ORB-API-/ORB_API_/g; ...' schema.graphql
```

## Suggested Fix

In the GraphQL schema generator, convert registry item keys to valid GraphQL identifiers by replacing hyphens with underscores.

## Priority

High - Blocks deployment until manually fixed
