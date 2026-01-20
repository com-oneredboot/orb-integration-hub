---
inclusion: fileMatch
fileMatchPattern: "**/infrastructure/**,**/cloudformation/**"
---
# Infrastructure Standards

This file loads automatically when working with infrastructure/CloudFormation files.

## Documentation References

For complete CDK coding standards, see:
- #[[file:repositories/orb-templates/docs/coding-standards/cdk.md]]

## CRITICAL: No CloudFormation Outputs/Exports - EVER

**NEVER use CloudFormation Outputs with Export for cross-stack references.**
**NEVER pass stack objects between stacks (this creates implicit exports).**

CloudFormation exports create tight coupling between stacks that causes deployment failures:
- Cannot update an export while another stack imports it
- Layer version updates fail with "Cannot update export as it is in use"
- Creates deployment order dependencies that are hard to manage

### What NOT to do:

```python
# WRONG - Explicit export
CfnOutput(self, "LayerArn", value=layer.layer_version_arn, export_name="layer-arn")

# WRONG - Passing stack objects creates IMPLICIT exports
class MonitoringStack(Stack):
    def __init__(self, appsync_stack: AppSyncStack, ...):  # BAD!
        api_id = appsync_stack.api.api_id  # Creates implicit export!

# WRONG - Using resources from another stack
lambda_stack.functions["sms-verification"]  # Creates implicit export!
dynamodb_stack.tables["users"]  # Creates implicit export!
```

### What TO do:

```python
# CORRECT - Use SSM Parameters for ALL cross-stack references
ssm.StringParameter(self, "ApiIdParam",
    parameter_name=config.ssm_parameter_name("appsync/api-id"),
    string_value=self.api.api_id,
)

# In consuming stack - read from SSM
api_id = ssm.StringParameter.value_for_string_parameter(
    self, config.ssm_parameter_name("appsync/api-id")
)
```

### Stack Dependencies

Use `add_dependency()` for deployment ordering, but NEVER pass stack objects:

```python
# CORRECT - Dependency without passing stack object
monitoring_stack.add_dependency(appsync_stack)

# Then read values from SSM in monitoring_stack
api_id = ssm.StringParameter.value_for_string_parameter(
    self, config.ssm_parameter_name("appsync/api-id")
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

SSM parameters use path-based naming aligned with orb-schema-generator conventions:

```yaml
# Pattern: /{customer_id}/{project_id}/{environment}/{resource-type}/{resource-name}/{attribute}

# Examples:
# /orb/integration-hub/dev/cognito/user-pool-id
# /orb/integration-hub/dev/dynamodb/users/arn
# /orb/integration-hub/dev/lambda-layers/organizations-security/arn
# /orb/integration-hub/dev/lambda/sms-verification/arn
# /orb/integration-hub/dev/appsync/api-url
```

### Using the Config Helper

The `Config` class provides a helper method for generating parameter names:

```python
# In config.py
config.ssm_parameter_name("cognito/user-pool-id")
# Returns: /orb/integration-hub/dev/cognito/user-pool-id

config.ssm_parameter_name("dynamodb/users/arn")
# Returns: /orb/integration-hub/dev/dynamodb/users/arn
```

### Parameter Path Structure by Resource Type

| Resource Type | Path Pattern | Example |
|---------------|--------------|---------|
| Cognito | `/cognito/{attribute}` | `/orb/integration-hub/dev/cognito/user-pool-id` |
| DynamoDB | `/dynamodb/{table-name}/{attribute}` | `/orb/integration-hub/dev/dynamodb/users/arn` |
| Lambda | `/lambda/{function-name}/{attribute}` | `/orb/integration-hub/dev/lambda/sms-verification/arn` |
| Lambda Layers | `/lambda-layers/{layer-name}/{attribute}` | `/orb/integration-hub/dev/lambda-layers/common/arn` |
| AppSync | `/appsync/{attribute}` | `/orb/integration-hub/dev/appsync/api-url` |
| SQS | `/sqs/{queue-name}/{attribute}` | `/orb/integration-hub/dev/sqs/alerts-queue/arn` |
| Frontend | `/frontend/{attribute}` | `/orb/integration-hub/dev/frontend/distribution-id` |
| Monitoring | `/monitoring/{resource}/{attribute}` | `/orb/integration-hub/dev/monitoring/audit-log-group/name` |

See `infrastructure/cdk/README.md` for complete parameter reference.

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
