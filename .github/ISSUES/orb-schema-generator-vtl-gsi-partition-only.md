## Bug: VTL Generator includes sort key in partition-only GSI queries

### Version
orb-schema-generator v0.18.4

### Description

When generating VTL resolvers for GSI queries that should only use the partition key (e.g., `QueryByOwnerId`), the generator incorrectly includes the sort key in the query expression.

### Expected Behavior

For a GSI with partition key `ownerId` and sort key `createdAt`, the generator should produce:

1. `OrganizationsQueryByOwnerId` - queries by partition key only
2. `OrganizationsQueryByOwnerIdAndCreatedAt` - queries by partition AND sort key

The `OrganizationsQueryByOwnerId` VTL should have:
```vtl
"expression": "ownerId = :ownerId",
"expressionValues": {
  ":ownerId": $util.dynamodb.toDynamoDBJson($ctx.args.input.ownerId)
}
```

### Actual Behavior

The `OrganizationsQueryByOwnerId` VTL incorrectly includes the sort key:
```vtl
"expression": "ownerId = :ownerId AND createdAt = :createdAt",
"expressionValues": {
  ":ownerId": $util.dynamodb.toDynamoDBJson($ctx.args.input.ownerId),
  ":createdAt": $util.dynamodb.toDynamoDBJson($ctx.args.input.createdAt)
}
```

This causes a DynamoDB error at runtime:
```
DynamoDB:DynamoDbException: One or more parameter values were invalid: 
Condition parameter type does not match schema type
```

### Schema Definition

```yaml
# schemas/tables/Organizations.yml
secondary:
  - name: OwnerIndex
    type: GSI
    partition: ownerId
    sort: createdAt
    projection_type: ALL
```

### GraphQL Input (Correct)

The GraphQL input type is correctly generated with only `ownerId`:
```graphql
input OrganizationsQueryByOwnerIdInput {
  ownerId: String!
  limit: Int
  nextToken: String
}
```

### Root Cause Analysis

Looking at `src/core/builders.py` lines 160-172, the `OperationBuilder` correctly creates the operation with `index_sort=None`:

```python
# Query by partition key only
field = f"{self.schema.name}QueryBy{idx_pascal}"
operation = Operation(
    name=f"QueryBy{idx_pascal}",
    type="Query",
    field=field,
    dynamodb_op="Query",
    index_partition=index["partition"],
    index_sort=None,  # Correctly set to None
    index_name=index["name"],
    ...
)
```

However, the VTL generator in `src/generators/vtl_generator.py` appears to not be respecting `index_sort=None` when building the query expression.

### Steps to Reproduce

1. Create a schema with a GSI that has both partition and sort keys
2. Run `orb-schema generate`
3. Check the generated `Query.{Schema}QueryBy{PartitionKey}.request.vtl` file
4. Observe that the sort key is incorrectly included in the expression

### Workaround

Manually edit the generated VTL file to remove the sort key from the expression. However, this gets overwritten on regeneration.

### Impact

- **Severity**: High - Breaks all partition-only GSI queries at runtime
- **Affected**: Any schema with GSIs that have sort keys
