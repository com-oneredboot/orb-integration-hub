# Bug: Lambda schema generates all attributes in both Input and Output types

## Summary

When generating GraphQL schema for Lambda types, orb-schema-generator puts ALL attributes in both the Input type and the Output type. For query operations, the input should only contain the query parameters, not the response fields.

## Environment

- orb-schema-generator version: 0.16.1

## Schema Definition

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
      description: Email address to check for existence
    exists:
      type: boolean
      required: true
      description: Whether the email exists in the system
```

## Current Behavior (Incorrect)

Generated GraphQL schema:

```graphql
type CheckEmailExists {
  email: String!
  exists: Boolean!
}

input CheckEmailExistsInput {
  email: String!
  exists: Boolean!  # <-- BUG: This should NOT be in the input!
}

type Query {
  CheckEmailExists(input: CheckEmailExistsInput!): CheckEmailExists @aws_api_key
}
```

## Expected Behavior

The input type should only contain fields that are query parameters (email), not response fields (exists):

```graphql
type CheckEmailExists {
  email: String!
  exists: Boolean!
}

input CheckEmailExistsInput {
  email: String!
  # exists should NOT be here - it's a response field
}

type Query {
  CheckEmailExists(input: CheckEmailExistsInput!): CheckEmailExists @aws_api_key
}
```

## Error Message

When calling the query from the frontend:
```
Variable 'input' has coerced Null value for NonNull type 'Boolean!'
```

This happens because the frontend only sends `{ email: "test@example.com" }` but the schema expects `{ email: "test@example.com", exists: true/false }`.

## Suggested Fix

For Lambda schemas with `operation: query`:
1. Add a way to distinguish input fields from output fields in the schema definition
2. Or automatically determine that fields like `exists` (boolean response) should only be in the output type

## Possible Schema Enhancement

```yaml
model:
  operation: query
  attributes:
    email:
      type: string
      required: true
      inputOnly: true  # Only in input type
    exists:
      type: boolean
      required: true
      outputOnly: true  # Only in output type
```

Or:

```yaml
model:
  operation: query
  input:
    email:
      type: string
      required: true
  output:
    email:
      type: string
      required: true
    exists:
      type: boolean
      required: true
```

## Impact

- **Critical**: Lambda queries are completely broken - cannot be called from frontend
- Blocking CheckEmailExists feature deployment
