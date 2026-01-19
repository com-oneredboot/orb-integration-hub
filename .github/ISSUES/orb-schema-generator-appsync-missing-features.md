# Enhancement: AppSyncApi Construct Missing Production Features

## Summary

The generated `AppSyncApi` construct is missing several production-ready features:
1. X-Ray tracing support (configurable)
2. API Key storage in Secrets Manager (should be default when `enable_api_key=True`)
3. SSM parameter for API Key secret name

## Reporting Team

orb-integration-hub

## Team Contact

@orb-integration-hub-team

## orb-schema-generator Version

0.18.0

## Output Target

CDK (infrastructure)

## Current Behavior

The generated `AppSyncApi` construct:
- Does not enable X-Ray tracing (no option)
- Creates API Key but doesn't store it in Secrets Manager
- Only creates SSM parameters for API ID and GraphQL URL (missing API Key secret name)

## Expected Behavior

### 1. X-Ray Tracing Support (Configurable)

Add `enable_xray` parameter:

```python
def __init__(
    self,
    ...
    enable_xray: bool = False,
) -> None:
    ...
    self.api = appsync.GraphqlApi(
        ...
        xray_enabled=enable_xray,
    )
```

### 2. API Key Storage in Secrets Manager (Default)

When `enable_api_key=True`, automatically store the API key in Secrets Manager:

```python
if enable_api_key:
    self.api_key = appsync.CfnApiKey(...)
    
    # Store in Secrets Manager (default behavior)
    self.api_key_secret = secretsmanager.Secret(
        self,
        "ApiKeySecret",
        secret_name=f"orb-integration-hub-dev-graphql-api-key",
        description="GraphQL API Key for unauthenticated access",
        secret_string_value=SecretValue.unsafe_plain_text(self.api_key.attr_api_key),
    )
    
    # SSM parameter for secret name
    ssm.StringParameter(
        self, "ApiKeySecretNameParameter",
        parameter_name="/orb/integration-hub/dev/appsync/api-key-secret-name",
        string_value=self.api_key_secret.secret_name,
    )
```

## Proposed Constructor Signature

```python
def __init__(
    self,
    scope: Construct,
    id: str,
    tables: Dict[str, dynamodb.Table],
    lambda_functions: Dict[str, lambda_.IFunction] | None = None,
    enable_api_key: bool = False,
    api_key_expiration_days: int = 365,
    enable_xray: bool = False,  # NEW
) -> None:
```

When `enable_api_key=True`:
- Create API Key
- Store in Secrets Manager (default, not optional)
- Create SSM parameter for secret name

## Use Case

We need to retrieve the API key securely from Secrets Manager in our frontend setup scripts. Currently the API key is created but not stored anywhere retrievable.

## Impact

- **orb-integration-hub**: Cannot securely retrieve API key for frontend configuration
- Affects any project using API key authentication

## Environment

- orb-schema-generator version: 0.18.0
- Project: orb-integration-hub
