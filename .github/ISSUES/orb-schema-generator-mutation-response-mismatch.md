# Bug: Mutation VTL Response Doesn't Match GraphQL Schema

## Summary

The generated VTL response templates for mutations return raw DynamoDB results, but the GraphQL schema expects a wrapped response format `{ items: [...], nextToken }`.

## Current Behavior

**GraphQL Schema:**
```graphql
type OrganizationsResponse {
  items: [Organizations!]
  nextToken: String
}

type Mutation {
  OrganizationsCreate(input: OrganizationsCreateInput!): OrganizationsResponse
}
```

**VTL Response Template:**
```velocity
#if($ctx.error)
  $util.error($ctx.error.message, $ctx.error.type)
#else
  $util.toJson($ctx.result)
#end
```

For a PutItem operation, `$ctx.result` is the item itself:
```json
{
  "organizationId": "abc-123",
  "name": "My Org",
  ...
}
```

But the GraphQL schema expects:
```json
{
  "items": [{ "organizationId": "abc-123", "name": "My Org", ... }],
  "nextToken": null
}
```

## Expected Behavior

Either:

### Option A: Fix VTL to wrap response
```velocity
#if($ctx.error)
  $util.error($ctx.error.message, $ctx.error.type)
#else
  {
    "items": [$util.toJson($ctx.result)],
    "nextToken": null
  }
#end
```

### Option B: Change GraphQL schema to return item directly
```graphql
type Mutation {
  OrganizationsCreate(input: OrganizationsCreateInput!): Organizations
}
```

Option B is simpler and more intuitive for mutations - you create one item, you get one item back.

## Impact

- Frontend services must handle both response formats
- Type safety is compromised
- Confusing API contract

## Affected Operations

All DynamoDB mutations (Create, Update, Delete) for all table types.

## Workaround

Frontend handles both formats:
```typescript
const result = response.data.OrganizationsCreate;
if ('items' in result && Array.isArray(result.items)) {
  // Wrapped format
  createdOrg = new Organizations(result.items[0]);
} else if ('organizationId' in result) {
  // Direct format
  createdOrg = new Organizations(result);
}
```

## Recommendation

Option B (return item directly) is cleaner for mutations. The `{ items, nextToken }` wrapper makes sense for queries that return lists, but not for mutations that operate on single items.
