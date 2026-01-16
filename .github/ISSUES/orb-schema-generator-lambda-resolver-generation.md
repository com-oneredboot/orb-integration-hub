# Enhancement: Generate Lambda Data Sources and Resolvers for LambdaType Schemas

## Summary

When defining a `type: lambda` schema, orb-schema-generator should generate the CDK infrastructure to wire the Lambda function to AppSync, including the Lambda data source and resolver attachment.

## Current Behavior

For a LambdaType schema like:

```yaml
type: lambda
name: CheckEmailExists
targets:
  - api
model:
  operation: query
  authConfig:
    apiKeyAuthentication:
      - CheckEmailExists
  attributes:
    email:
      type: string
      required: true
    exists:
      type: boolean
      required: true
```

The generator currently produces:
- ✅ GraphQL type (`type CheckEmailExists { ... }`)
- ✅ GraphQL input type (`input CheckEmailExistsInput { ... }`)
- ✅ GraphQL query operation in schema
- ✅ TypeScript `.graphql.ts` file (v0.15.0+)
- ✅ Python/TypeScript models

But does NOT produce:
- ❌ Lambda data source in AppSync CDK
- ❌ Resolver attachment connecting the GraphQL operation to the Lambda

## Expected Behavior

The generator should also produce CDK code to:

1. **Create Lambda data source** - Reference the Lambda function (by convention or SSM parameter)
2. **Attach resolver** - Connect the GraphQL operation to the Lambda data source

### Proposed CDK Output

```python
# In appsync_stack.py or generated appsync/api.py

# Lambda data source (reference by SSM parameter convention)
check_email_exists_lambda_arn = ssm.StringParameter.value_for_string_parameter(
    self,
    f"/{config.environment}/{config.customer_id}/{config.project_id}/lambda/check-email-exists/arn"
)

check_email_exists_lambda = lambda_.Function.from_function_arn(
    self,
    "CheckEmailExistsLambda",
    check_email_exists_lambda_arn
)

check_email_exists_data_source = self.api.add_lambda_data_source(
    "CheckEmailExistsDataSource",
    check_email_exists_lambda,
    name="CheckEmailExistsLambdaDataSource",
)

# Resolver attachment
check_email_exists_data_source.create_resolver(
    "CheckEmailExistsResolver",
    type_name="Query",
    field_name="CheckEmailExists",
)
```

### Configuration Options

Allow configuration of Lambda ARN resolution strategy:

```yaml
output:
  infrastructure:
    lambda:
      # Option 1: SSM parameter (default)
      arn_resolution: ssm
      ssm_pattern: "/${environment}/${customer_id}/${project_id}/lambda/${schema_name}/arn"
      
      # Option 2: Direct ARN pattern
      # arn_resolution: pattern
      # arn_pattern: "arn:aws:lambda:${region}:${account}:function:${prefix}-${schema_name}"
```

## Use Case

We have a `CheckEmailExists` Lambda-backed query for checking email existence during authentication. Currently we must manually:

1. Create the Lambda function in CDK (expected - business logic is custom)
2. Create the Lambda data source (should be generated)
3. Attach the resolver (should be generated)

Steps 2 and 3 are boilerplate that can be derived from the schema definition.

## Scope Clarification

**Should generate:**
- Lambda data source configuration
- Resolver attachment

**Should NOT generate:**
- Lambda function code (business logic is custom)
- Lambda CDK construct (needs custom IAM, env vars, etc.)

The Lambda function itself should be created manually or via a separate mechanism, then referenced by the generated data source.

## Related Issues

- Issue #67: `@aws_api_key` directive not rendering for `apiKeyAuthentication` config

## Impact

- **orb-integration-hub**: Blocked on CheckEmailExists feature until this is implemented
- Affects any project using Lambda-backed GraphQL operations

## Environment

- orb-schema-generator version: 0.13.5
- Project: orb-integration-hub
