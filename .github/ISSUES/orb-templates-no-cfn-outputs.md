# Enhancement: Add "No CloudFormation Outputs" Rule to Infrastructure Standards

## Summary

Request to add a steering rule/standard that prohibits the use of CloudFormation Outputs with Export for cross-stack references. This pattern causes deployment failures and should be replaced with SSM Parameters.

## Problem

CloudFormation exports create tight coupling between stacks that causes deployment failures:

1. **Cannot update exports while in use**: When Stack A exports a value that Stack B imports, you cannot update the export in Stack A while Stack B still references it
2. **Layer version updates fail**: Lambda layer updates create new physical resources with new ARNs, but the export cannot be updated because it's in use
3. **Deployment order dependencies**: Creates complex deployment ordering that's hard to manage and prone to failures

### Real-World Example

We encountered this error when deploying lambda-layers:

```
Cannot update export orb-integration-hub-dev-lambda-layers:ExportsOutputRefOrganizationsSecurityLayer7A2BBD430B97D36F as it is in use by orb-integration-hub-dev-lambda
```

The stack went into `UPDATE_ROLLBACK_COMPLETE` state and required manual intervention.

## Proposed Solution

Add to infrastructure standards documentation:

### NEVER Use CloudFormation Outputs/Exports

```python
# WRONG - Creates export dependency
CfnOutput(self, "LayerArn", 
    value=layer.layer_version_arn, 
    export_name="layer-arn"
)

# CORRECT - Use SSM Parameter
ssm.StringParameter(self, "LayerArnParam",
    parameter_name=f"{prefix}-layer-arn",
    string_value=layer.layer_version_arn,
)
```

### Reading Cross-Stack Values

```python
# In consuming stack - read from SSM
layer_arn = ssm.StringParameter.value_for_string_parameter(
    self, f"{prefix}-layer-arn"
)
layer = lambda_.LayerVersion.from_layer_version_arn(
    self, "LayerRef", layer_arn
)
```

## Benefits of SSM Parameters

1. **No tight coupling**: Stacks can be updated independently
2. **No deployment order issues**: SSM parameters can be updated anytime
3. **Better visibility**: Parameters visible in AWS Console
4. **Versioning**: SSM supports parameter versioning
5. **Encryption**: Can use SecureString for sensitive values

## Affected Documentation

- `docs/coding-standards/README.md` - Add infrastructure section
- `docs/project-structure/README.md` - Update CDK patterns
- Any CDK/CloudFormation templates or examples

## Reporting Team

- **Team**: orb-integration-hub
- **Contact**: @fishbeak
