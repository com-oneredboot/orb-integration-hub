## Summary

The generated DynamoDB table constructs do not create SSM parameters for table ARNs and names. This requires manual stacks to duplicate SSM parameter creation, which could be automated by orb-schema-generator.

## Environment

- **Tool/Package version**: orb-schema-generator v0.13.6
- **Language version**: Python 3.11
- **OS**: Linux

## Current Behavior

Generated table constructs (e.g., `infrastructure/cdk/generated/users_table.py`) create the DynamoDB table but do not export any SSM parameters. Manual stacks must add:

```python
ssm.StringParameter(
    self, "UsersTableArnParameter",
    parameter_name=config.ssm_parameter_name("dynamodb/users/arn"),
    string_value=users_table.table_arn,
)
ssm.StringParameter(
    self, "UsersTableNameParameter",
    parameter_name=config.ssm_parameter_name("dynamodb/users/name"),
    string_value=users_table.table_name,
)
```

## Expected Behavior

Generated table constructs should optionally create SSM parameters following the path-based naming convention:
- `/{customer_id}/{project_id}/{environment}/dynamodb/{table-name}/arn`
- `/{customer_id}/{project_id}/{environment}/dynamodb/{table-name}/name`

## Suggested Implementation

Add a schema attribute to enable SSM parameter generation:

```yaml
# schemas/tables/users.yml
name: Users
type: dynamodb
ssm_parameters: true  # New attribute
partition_key:
  name: pk
  type: string
```

When `ssm_parameters: true`, the generated construct would include:

```python
ssm.StringParameter(
    self, "TableArnParameter",
    parameter_name=f"/{customer_id}/{project_id}/{environment}/dynamodb/{table_name}/arn",
    string_value=self.table.table_arn,
)
```

## Impact

- **Blocked functionality**: None (workaround exists)
- **Urgency**: Low

## Workaround

Manual stacks wrap generated constructs and add SSM parameters manually.

## Related Issues

- Part of CDK refactoring to align with orb-schema-generator conventions
