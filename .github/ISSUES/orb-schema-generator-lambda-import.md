# Bug: Lambda Data Source Uses from_function_arn Instead of from_function_attributes

## Reporting Team
orb-integration-hub

## Team Contact
@orb-integration-hub-team

## orb-schema-generator Version
0.18.1

## Output Target
CDK (infrastructure)

## Schema Type
Lambda schema (LambdaType)

## Source YAML Schema

```yaml
name: CheckEmailExists
type: lambda
description: Lambda function to check if email exists
attributes:
  - name: email
    type: string
    required: true
```

## Actual Output (Incorrect)

```python
check_email_exists_lambda_arn = ssm.StringParameter.value_for_string_parameter(
    self, "/orb/integration-hub/dev/lambda/checkemailexists/arn"
)
check_email_exists_lambda = lambda_.Function.from_function_arn(
    self, "CheckEmailExistsLambda", check_email_exists_lambda_arn
)
check_email_exists_lambda_data_source = self.api.add_lambda_data_source(
    "CheckEmailExistsLambdaDataSource",
    check_email_exists_lambda,
)
```

## Expected Output (Correct)

```python
check_email_exists_lambda_arn = ssm.StringParameter.value_for_string_parameter(
    self, "/orb/integration-hub/dev/lambda/checkemailexists/arn"
)
check_email_exists_lambda = lambda_.Function.from_function_attributes(
    self, 
    "CheckEmailExistsLambda", 
    function_arn=check_email_exists_lambda_arn,
    same_environment=True,
)
check_email_exists_lambda_data_source = self.api.add_lambda_data_source(
    "CheckEmailExistsLambdaDataSource",
    check_email_exists_lambda,
)
```

## Steps to Reproduce

1. Create a Lambda schema with `type: lambda`
2. Run `orb-schema generate --cdk-only`
3. Observe generated code in `infrastructure/cdk/generated/appsync/api.py`
4. Run `cdk synth` - fails with error:
   ```
   RuntimeError: ValidationError: Cannot modify permission to lambda function. 
   Function is either imported or $LATEST version.
   If the function is imported from the same account use `fromFunctionAttributes()` 
   API with the `sameEnvironment` flag.
   ```

## Configuration (schema-generator.yml)

```yaml
output:
  infrastructure:
    format: cdk
    cdk:
      base_dir: ./infrastructure/cdk/generated
      language: python
      generate_stack: false
```

## Environment Details

- OS: Linux (Ubuntu) / GitHub Actions ubuntu-latest
- Python version: 3.12/3.13
- Installation method: pipenv

## Impact Level
Critical (Blocking deployment)

## Current Workaround
None - CI deployments are blocked. Must skip tests to deploy.

## Security Considerations
None - this is a CDK construct generation issue.

## Root Cause

In `src/generators/cdk_generator.py` around line 518:

```python
lines.append(f"        {name_snake}_lambda = lambda_.Function.from_function_arn(")
lines.append(f'            self, "{name}Lambda", {name_snake}_lambda_arn')
lines.append("        )")
```

Should be:

```python
lines.append(f"        {name_snake}_lambda = lambda_.Function.from_function_attributes(")
lines.append(f'            self,')
lines.append(f'            "{name}Lambda",')
lines.append(f'            function_arn={name_snake}_lambda_arn,')
lines.append(f'            same_environment=True,')
lines.append("        )")
```

## CDK Documentation Reference

https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_lambda/Function.html#aws_cdk.aws_lambda.Function.from_function_attributes

> If the function is imported from the same account, use `from_function_attributes()` with `same_environment=True` to allow adding permissions.
