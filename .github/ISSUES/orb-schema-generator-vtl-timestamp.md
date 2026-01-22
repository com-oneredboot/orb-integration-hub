# Bug: VTL Resolvers Use ISO8601 Instead of Epoch Seconds for AWSTimestamp Fields

## Summary

Generated VTL resolvers use `$util.time.nowISO8601()` for `updatedAt` fields, but AppSync's `AWSTimestamp` scalar requires Unix epoch seconds. This causes serialization errors when querying records.

## Problem

The generated `Mutation.*.Update.request.vtl` resolvers set `updatedAt` using:

```vtl
$!{expressionValues.put(":updatedAt", $util.dynamodb.toDynamoDB($util.time.nowISO8601()))}
```

This stores ISO 8601 strings like `"2026-01-22T17:48:30.032Z"` in DynamoDB.

When these records are queried, AppSync throws:

```
Can't serialize value (/UsersQueryByEmail/items[0]/updatedAt) : Unable to serialize `2026-01-22T17:48:30.032Z` as a valid timestamp.
```

## Expected Behavior

VTL resolvers should use `$util.time.nowEpochSeconds()` for `AWSTimestamp` fields:

```vtl
$!{expressionValues.put(":updatedAt", $util.dynamodb.toDynamoDB($util.time.nowEpochSeconds()))}
```

## Affected Files

All generated `Mutation.*.Update.request.vtl` and `Mutation.*.Create.request.vtl` files that set timestamp fields.

## Proposed Solution

In the VTL generator, detect when a field has `AWSTimestamp` type and use:
- `$util.time.nowEpochSeconds()` instead of `$util.time.nowISO8601()`

## Workaround

Currently using `orb_common.timestamps.ensure_timestamp()` in Lambda resolvers to convert timestamps, but VTL resolvers don't have this option.

## Related Issues

- orb-infrastructure#17 - Added timestamp utilities to orb-common for Lambda use

## Priority

High - Causes runtime errors for any query returning records updated via VTL resolvers.

## Labels

bug, vtl, graphql
