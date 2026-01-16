---
inclusion: fileMatch
fileMatchPattern: "**/infrastructure/**,**/cloudformation/**"
---
# Infrastructure Standards

This file loads automatically when working with infrastructure/CloudFormation files.

## CRITICAL: No CloudFormation Outputs/Exports

**NEVER use CloudFormation Outputs with Export for cross-stack references.**

CloudFormation exports create tight coupling between stacks that causes deployment failures:
- Cannot update an export while another stack imports it
- Layer version updates fail with "Cannot update export as it is in use"
- Creates deployment order dependencies that are hard to manage

**ALWAYS use SSM Parameters instead:**

```python
# WRONG - Creates export dependency
CfnOutput(self, "LayerArn", value=layer.layer_version_arn, export_name="layer-arn")

# CORRECT - Use SSM Parameter
ssm.StringParameter(self, "LayerArnParam",
    parameter_name=f"{prefix}-layer-arn",
    string_value=layer.layer_version_arn,
)

# In consuming stack - read from SSM
layer_arn = ssm.StringParameter.value_for_string_parameter(
    self, f"{prefix}-layer-arn"
)
```

## Infrastructure Structure

```
infrastructure/
├── cdk/
│   ├── app.py                   # Main CDK app (excludes lambda-layers)
│   ├── app_lambda_layers.py     # Separate CDK app for lambda layers
│   ├── config.py                # Configuration management
│   └── stacks/                  # CDK stack definitions
└── cdk.json                     # CDK configuration
```

## Stack Deployment Order

Lambda layers are deployed separately to avoid cross-stack export issues:

1. **deploy-lambda-layers** workflow - Deploys lambda-layers stack
2. **deploy-infrastructure** workflow - Deploys all other stacks

The lambda stack reads layer ARNs from SSM parameters (set by lambda-layers stack).

## Stack Naming Convention

```yaml
# Pattern: {customer_id}-{project_id}-{environment}-{purpose}
# Examples:
# orb-integration-hub-dev-lambda
# orb-integration-hub-dev-lambda-layers
# orb-integration-hub-prod-dynamodb
```

## Parameter Naming

```yaml
# SSM Parameter pattern
{customer_id}-{project_id}-{environment}-<resource>-<attribute>

# Examples:
# orb-integration-hub-dev-users-table-arn
# orb-integration-hub-dev-cognito-user-pool-id
# orb-integration-hub-dev-organizations-security-layer-arn
```

## Lambda Function Paths

Lambda code paths should reference `apps/api/`:

```python
code=lambda_.Code.from_asset("../apps/api/lambdas/sms_verification")
```

## Lambda Layer Paths

Layer code paths should reference `apps/api/layers/`:

```python
code=lambda_.Code.from_asset("../apps/api/layers/organizations_security")
```

## CDK Commands

```bash
# Synth all stacks (excludes lambda-layers)
pipenv run cdk synth --all

# Deploy all stacks (excludes lambda-layers)
pipenv run cdk deploy --all --require-approval never

# Deploy lambda-layers separately
pipenv run cdk --app "python cdk/app_lambda_layers.py" deploy

# Diff
pipenv run cdk diff --all
```

## Tagging Standards

All resources must include these tags:

```python
Tags.of(self).add("Billable", "true")
Tags.of(self).add("CustomerId", config.customer_id)
Tags.of(self).add("Environment", config.environment)
Tags.of(self).add("ProjectId", config.project_id)
```

## Security Best Practices

- Never hardcode secrets - use Secrets Manager or Parameter Store
- Use least-privilege IAM policies
- Enable encryption at rest for all data stores
- Enable Point-in-Time Recovery (PITR) for DynamoDB tables
- Scope IAM policies to specific resources (no wildcards except where required by AWS)

## Common Configuration

Standard configuration via CDK context:

```python
config = Config(
    customer_id="orb",
    project_id="integration-hub",
    environment="dev",
    region="us-east-1",
    account="123456789012",
    sms_origination_number="+15551234567",
)
```
