## Summary

The generated DynamoDB table constructs do not support Point-in-Time Recovery (PITR) configuration. This requires manual stacks to add PITR after importing generated constructs, which could be automated by orb-schema-generator.

## Environment

- **Tool/Package version**: orb-schema-generator v0.13.6
- **Language version**: Python 3.11
- **OS**: Linux

## Current Behavior

Generated table constructs create DynamoDB tables without PITR enabled. Manual stacks must add:

```python
# After importing generated construct
cfn_table = users_table.node.default_child
cfn_table.point_in_time_recovery_specification = {
    "pointInTimeRecoveryEnabled": True
}
```

## Expected Behavior

Generated table constructs should support PITR configuration via schema attribute:

```yaml
# schemas/tables/users.yml
name: Users
type: dynamodb
pitr_enabled: true  # New attribute
partition_key:
  name: pk
  type: string
```

## Suggested Implementation

When `pitr_enabled: true`, the generated construct would include:

```python
self.table = dynamodb.Table(
    self, "Table",
    # ... existing config ...
    point_in_time_recovery=True,
)
```

## Impact

- **Blocked functionality**: None (workaround exists)
- **Urgency**: Low

## Workaround

Manual stacks access the CfnTable and set PITR specification manually.

## Related Issues

- Part of CDK refactoring to align with orb-schema-generator conventions
- Related to SSM parameter generation enhancement
