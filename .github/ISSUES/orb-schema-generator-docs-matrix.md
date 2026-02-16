## Summary

The orb-schema-generator documentation lacks a clear matrix showing what each schema type generates. This makes it difficult to understand what resources are created and what must be added manually.

## Environment

- **Tool/Package version**: orb-schema-generator v0.13.6
- **Language version**: Python 3.11
- **OS**: Linux

## Current Documentation Gaps

1. **No schema type generation matrix**: It's unclear what `type: dynamodb` vs `type: lambda-dynamodb` generates
2. **No construct extension guidance**: No examples of how to extend generated constructs with PITR, removal policies, or tags
3. **No integration examples**: No examples of integrating generated constructs with manual stacks

## Requested Documentation

### 1. Schema Type Generation Matrix

A table showing what each schema type generates:

| Schema Type | DynamoDB Table | SSM Params | Lambda Function | AppSync Resolver | VTL Templates |
|-------------|----------------|------------|-----------------|------------------|---------------|
| `dynamodb` | ✅ | ❌ | ❌ | ✅ (DynamoDB) | ✅ |
| `lambda-dynamodb` | ✅ | ❌ | ✅ | ✅ (Lambda) | ❌ |
| `lambda` | ❌ | ❌ | ✅ | ✅ (Lambda) | ❌ |

### 2. Construct Extension Examples

```python
# Example: Extending generated table with PITR and removal policy
from generated.users_table import UsersTable

users_construct = UsersTable(self, "Users")
users_table = users_construct.table

# Add PITR
cfn_table = users_table.node.default_child
cfn_table.point_in_time_recovery_specification = {
    "pointInTimeRecoveryEnabled": True
}

# Set removal policy
users_table.apply_removal_policy(RemovalPolicy.RETAIN)

# Add tags
Tags.of(users_table).add("Environment", "dev")
```

### 3. Integration with Manual Stacks

Example showing how to import generated constructs into a manual stack and add SSM parameters.

## Impact

- **Blocked functionality**: None (trial and error works)
- **Urgency**: Low

## Workaround

Reading generated code to understand what's created, trial and error for extensions.

## Related Issues

- Part of CDK refactoring to align with orb-schema-generator conventions
- Related to SSM parameter and PITR enhancement requests
