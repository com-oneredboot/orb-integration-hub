# Bug: TypeScript GraphQL Query Generator Not Updated for v0.19.0 Response Format

## Summary

The TypeScript GraphQL query generator in v0.19.0 still generates queries with the old response format (`items` array) instead of the new standardized format (`item` singular for mutations, envelope fields).

## Environment

- orb-schema-generator version: 0.19.0
- Project: orb-integration-hub

## Expected Behavior

After v0.19.0, TypeScript GraphQL queries should match the new GraphQL schema:

```typescript
// Mutations should use `item` (singular) and envelope fields
export const OrganizationsCreate = /* GraphQL */ `
  mutation OrganizationsCreate($input: OrganizationsCreateInput!) {
    OrganizationsCreate(input: $input) {
      code
      success
      message
      item {
        organizationId
        name
        ...
      }
    }
  }
`;

// List queries should use `items` (plural) and envelope fields
export const OrganizationsListByOwnerId = /* GraphQL */ `
  query OrganizationsListByOwnerId($input: OrganizationsListByOwnerIdInput!) {
    OrganizationsListByOwnerId(input: $input) {
      code
      success
      message
      items {
        organizationId
        name
        ...
      }
      nextToken
    }
  }
`;
```

## Actual Behavior

TypeScript queries still use the old format:

```typescript
export const OrganizationsCreate = /* GraphQL */ `
  mutation OrganizationsCreate($input: OrganizationsCreateInput!) {
    OrganizationsCreate(input: $input) {
      items {  // Should be `item` (singular)
        organizationId
        ...
      }
      nextToken  // Should not be present for mutations
    }
  }
`;
```

## Impact

- Frontend services cannot use the new response format
- Workaround code must remain in place to handle response format mismatch
- TypeScript types don't match actual GraphQL responses

## GraphQL Schema (Correct)

The GraphQL schema is correctly generated with the new format:

```graphql
type OrganizationsCreateResponse {
  code: Int!
  success: Boolean!
  message: String
  item: Organizations
}
```

## Root Cause

The TypeScript generator's `_generate_graphql_query()` method was not updated to:
1. Use `item` instead of `items` for mutation responses
2. Include envelope fields (`code`, `success`, `message`)
3. Distinguish between mutation responses (singular) and list responses (plural)

## Suggested Fix

Update `src/generators/typescript_generator.py` to:
1. Check if operation is a mutation or list query
2. For mutations: use `item` field, include envelope fields, no `nextToken`
3. For list queries: use `items` field, include envelope fields, include `nextToken`
4. For get queries: use `item` field, include envelope fields, no `nextToken`
