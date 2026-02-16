# Bug: Generated AppSyncApi Construct Has Hardcoded Values - Not Usable as Subcomponent

## Summary

The generated `AppSyncApi` construct in `infrastructure/cdk/generated/appsync/api.py` has hardcoded values that prevent it from being used as a subcomponent in an existing CDK stack, as documented in the [CDK Integration Guide](https://github.com/com-oneredboot/orb-schema-generator/blob/main/docs/infrastructure/cdk-integration-guide.md).

## Reporting Team

orb-integration-hub

## Team Contact

@orb-integration-hub-team

## orb-schema-generator Version

0.17.0

## Output Target

CDK (infrastructure)

## Schema Type

Multiple types (AppSync API generation)

## Current Behavior

The generated `api.py` has several hardcoded values:

```python
# Line 49 - Hardcoded API name
self.api = appsync.GraphqlApi(
    self, "Api",
    name="GeneratedApi",  # Should be configurable
    ...
)

# Lines 32-34 - Hardcoded SSM path (not environment-aware)
user_pool_id = ssm.StringParameter.value_for_string_parameter(
    self, "/orb/integration-hub/dev/cognito/user-pool-id"
)

# Lines 67-77 - Creates SSM parameters that conflict with parent stack
ssm.StringParameter(
    self, "ApiIdParameter",
    parameter_name="/orb/integration-hub/dev/appsync/api-id",
    string_value=self.api.api_id,
)
```

Additionally:
- No API Key authorization mode (required for `@aws_api_key` endpoints like `CheckEmailExists`)
- No X-Ray tracing option
- Creates duplicate logging role instead of accepting one from parent

## Expected Behavior

Per the [CDK Integration Guide](https://github.com/com-oneredboot/orb-schema-generator/blob/main/docs/infrastructure/cdk-integration-guide.md), the generated construct should be importable into an existing stack:

```python
from .generated.appsync.api import AppSyncApi

api = AppSyncApi(
    self, "Api",
    tables={"Users": users_table.table},
)
```

The construct should:

1. **Accept configuration parameters** instead of hardcoding:
   ```python
   def __init__(
       self,
       scope: Construct,
       id: str,
       tables: Dict[str, dynamodb.Table],
       api_name: str,  # Required - no hardcoded default
       user_pool: cognito.IUserPool,  # Accept user pool directly
       enable_api_key: bool = False,
       logging_role: Optional[iam.IRole] = None,
       create_ssm_parameters: bool = False,  # Default False - let parent handle
       ssm_prefix: Optional[str] = None,
   ) -> None:
   ```

2. **Not create SSM parameters by default** - The parent stack should control SSM parameter creation to avoid conflicts

3. **Support API Key auth mode** when `enable_api_key=True` (needed for `@aws_api_key` directives)

4. **Accept user pool directly** instead of looking it up via hardcoded SSM path

## Source YAML Schema

```yaml
# schema-generator.yml
output:
  infrastructure:
    cdk:
      output: ./infrastructure/cdk/generated
      language: python
    appsync:
      auth:
        userPoolId: "${customerId}-${projectId}-${environment}-cognito-user-pool-id"
        publicEndpoints: true  # Should enable API_KEY auth mode
```

## Actual Output (Incorrect)

```python
# infrastructure/cdk/generated/appsync/api.py
class AppSyncApi(Construct):
    def __init__(
        self,
        scope: Construct,
        id: str,
        tables: Dict[str, dynamodb.Table],
        lambda_functions: Dict[str, lambda_.IFunction] | None = None,
    ) -> None:
        # Hardcoded SSM lookup
        user_pool_id = ssm.StringParameter.value_for_string_parameter(
            self, "/orb/integration-hub/dev/cognito/user-pool-id"
        )
        
        # Hardcoded API name
        self.api = appsync.GraphqlApi(
            self, "Api",
            name="GeneratedApi",
            authorization_config=appsync.AuthorizationConfig(
                default_authorization=appsync.AuthorizationMode(
                    authorization_type=appsync.AuthorizationType.USER_POOL,
                    # ... no API_KEY additional auth mode
                ),
            ),
        )
        
        # Creates SSM params that conflict with parent stack
        ssm.StringParameter(
            self, "ApiIdParameter",
            parameter_name="/orb/integration-hub/dev/appsync/api-id",
            ...
        )
```

## Expected Output (Correct)

```python
# infrastructure/cdk/generated/appsync/api.py
class AppSyncApi(Construct):
    def __init__(
        self,
        scope: Construct,
        id: str,
        tables: Dict[str, dynamodb.Table],
        api_name: str,
        user_pool: cognito.IUserPool,
        lambda_functions: Dict[str, lambda_.IFunction] | None = None,
        enable_api_key: bool = False,
        logging_role: Optional[iam.IRole] = None,
        create_ssm_parameters: bool = False,
        ssm_prefix: Optional[str] = None,
    ) -> None:
        # Use provided logging role or create one
        if logging_role is None:
            logging_role = iam.Role(...)
        
        # Build auth config
        additional_auth_modes = []
        if enable_api_key:
            additional_auth_modes.append(
                appsync.AuthorizationMode(
                    authorization_type=appsync.AuthorizationType.API_KEY,
                )
            )
        
        self.api = appsync.GraphqlApi(
            self, "Api",
            name=api_name,  # Configurable
            authorization_config=appsync.AuthorizationConfig(
                default_authorization=appsync.AuthorizationMode(
                    authorization_type=appsync.AuthorizationType.USER_POOL,
                    user_pool_config=appsync.UserPoolConfig(
                        user_pool=user_pool,  # Passed in directly
                    ),
                ),
                additional_authorization_modes=additional_auth_modes if additional_auth_modes else None,
            ),
        )
        
        # Only create SSM params if explicitly requested
        if create_ssm_parameters and ssm_prefix:
            ssm.StringParameter(
                self, "ApiIdParameter",
                parameter_name=f"{ssm_prefix}/appsync/api-id",
                ...
            )
```

## Steps to Reproduce

1. Run `orb-schema generate` with CDK output enabled
2. Observe generated `infrastructure/cdk/generated/appsync/api.py`
3. Attempt to import into existing stack per CDK Integration Guide
4. Encounter conflicts:
   - API named "GeneratedApi" instead of project name
   - SSM parameter conflicts with existing stack
   - No API Key auth for `@aws_api_key` endpoints
   - Hardcoded SSM lookup fails in different environments

## Configuration (schema-generator.yml)

```yaml
project:
  name: orb-integration-hub
  customerId: orb
  projectId: integration-hub

output:
  infrastructure:
    cdk:
      output: ./infrastructure/cdk/generated
      language: python
      generate_stack: true
    appsync:
      auth:
        publicEndpoints: true
      logging:
        enabled: true
        level: ALL
```

## Environment Details

- OS: Linux
- Python version: 3.11
- Installation method: pipenv via CodeArtifact

## Impact Level

Critical (Blocking deployment)

The generated AppSync construct cannot be used as documented. We have a hand-written `appsync_stack.py` that works, but it doesn't include the generated resolvers. This means:
- `CheckEmailExists` resolver is not deployed
- Smart recovery auth flow is broken
- Users cannot complete registration

## Current Workaround

We maintain a separate hand-written `infrastructure/cdk/stacks/appsync_stack.py` that:
- Uses proper naming conventions
- Has API Key auth mode
- Creates SSM parameters correctly

But this means we don't get the generated resolvers from the schema, requiring manual resolver creation.

## Security Considerations

- The hardcoded SSM paths could expose configuration from wrong environments if accidentally deployed
- Missing API Key auth mode means public endpoints don't work correctly

## Related Issues

- Issue #68: Generate Lambda Data Sources and Resolvers (resolved, but resolvers go to unusable construct)
- Issue #67: `@aws_api_key` directive rendering (resolved for GraphQL, but CDK doesn't enable API_KEY auth)

## Proposed Solution

1. Make `AppSyncApi` construct accept all configuration as parameters
2. Remove hardcoded values
3. Default `create_ssm_parameters=False` to avoid conflicts
4. Add `enable_api_key` parameter that adds API_KEY auth mode
5. Accept `user_pool` directly instead of SSM lookup

This aligns with the documented usage pattern in the CDK Integration Guide.
