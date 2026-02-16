# TypeScript Generator Missing Timestamp Conversion for AWSTimestamp

## Summary

The TypeScript generator maps `timestamp` schema type to JavaScript `Date`, but the GraphQL schema uses `AWSTimestamp` (Unix timestamp in seconds). This causes runtime errors when TypeScript code sends `Date` objects to GraphQL mutations.

## Problem

When a schema defines a field with `type: timestamp`:

```yaml
createdAt:
  type: timestamp
  required: true
  description: When the user was created
```

The generators produce inconsistent output:

### Python (Correct)
- Type: `int` (epoch seconds)
- Includes `@field_validator` that converts Date/string/float to epoch seconds automatically

```python
@field_validator("created_at", mode="before")
@classmethod
def parse_created_at(cls, value):
    """Parse timestamp to epoch seconds."""
    if isinstance(value, datetime):
        return int(value.timestamp())
    # ... handles int, float, string
```

### GraphQL (Correct)
- Type: `AWSTimestamp!` (Unix timestamp in seconds)

```graphql
createdAt: AWSTimestamp!
```

### TypeScript (Incorrect)
- Type: `Date` (JavaScript Date object)
- No conversion utilities generated

```typescript
export type UsersCreateInput = {
  createdAt: Date;
  // ...
};
```

## Error Encountered

```
Error creating User: {data: null, errors: Array(1)}
message: "Variable 'createdAt' has an invalid value."
```

This occurs because the TypeScript code passes a `Date` object to the GraphQL mutation, but AppSync expects an integer (Unix timestamp).

## Expected Behavior

The TypeScript generator should either:

1. **Option A**: Generate `number` type for timestamp fields to match `AWSTimestamp`
2. **Option B**: Generate conversion utilities similar to Python's `@field_validator`
3. **Option C**: Generate a helper function that converts the model before sending to GraphQL

## Suggested Fix (Option B)

Generate a static method or utility function in TypeScript models:

```typescript
export class Users implements IUsers {
  // ... existing fields

  /**
   * Convert Date fields to Unix timestamps for GraphQL compatibility
   */
  static toGraphQLInput(input: UsersCreateInput): Record<string, unknown> {
    return {
      ...input,
      createdAt: input.createdAt instanceof Date 
        ? Math.floor(input.createdAt.getTime() / 1000) 
        : input.createdAt,
      updatedAt: input.updatedAt instanceof Date 
        ? Math.floor(input.updatedAt.getTime() / 1000) 
        : input.updatedAt,
    };
  }
}
```

## Affected Files

- All TypeScript models with `timestamp` type fields
- Currently impacted: `UsersModel.ts`, `OrganizationsModel.ts`, `ApplicationsModel.ts`, etc.

## Workaround

Manual conversion in service layer before GraphQL mutation:

```typescript
const nowTimestamp = Math.floor(Date.now() / 1000);
const userCreateInput = {
  // ...
  createdAt: Math.floor(input.createdAt.getTime() / 1000),
  updatedAt: nowTimestamp,
};
```

## Environment

- orb-schema-generator version: v0.16.1
- Affected target: TypeScript/Angular frontend
- GraphQL backend: AWS AppSync with AWSTimestamp scalar
