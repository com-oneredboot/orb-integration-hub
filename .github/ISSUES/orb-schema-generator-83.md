# Enhancement: Multi-AppSync API Support with Lambda Authorizer

## Summary

Add support for generating multiple AppSync APIs from a single schema-generator configuration, with full support for all AppSync authorization modes including `AWS_LAMBDA` authorizers.

## Use Case

We need to expose a separate AppSync API for SDK/external developer access that:
- Uses `AWS_LAMBDA` authorization (custom API key validation)
- Exposes only a subset of operations (SDK-relevant operations)
- Has separate WAF rules and rate limiting
- Shares the same DynamoDB tables as the main API

Currently, orb-schema-generator only supports generating a single AppSync API with Cognito + API Key auth modes.

## Proposed Configuration

```yaml
appsync:
  # Primary API (web/mobile app users)
  api:
    name: "${project}-${env}-appsync-api"
    auth:
      default: AMAZON_COGNITO_USER_POOLS
      cognito:
        user_pool_ssm_param: "/orb/${project}/${env}/cognito/user-pool-id"
      additional:
        - API_KEY
    schema_output: apps/api/graphql/schema.graphql
    resolvers_output: apps/api/graphql/resolvers/
    cdk_output: infrastructure/cdk/generated/appsync/api/
    tables: all  # or explicit list
    
  # SDK API (external developers)
  sdk:
    name: "${project}-${env}-appsync-sdk"
    auth:
      default: AWS_LAMBDA
      lambda_authorizer:
        function_name: api-key-authorizer  # Reference to lambda in lambdas section
        result_ttl_seconds: 300
        identity_validation_expression: "^orb_[a-z]+_[a-zA-Z0-9]+$"
    schema_output: apps/api/graphql/sdk-schema.graphql
    resolvers_output: apps/api/graphql/sdk-resolvers/
    cdk_output: infrastructure/cdk/generated/appsync/sdk/
    tables:
      - ApplicationGroups
      - ApplicationGroupUsers
      - ApplicationGroupRoles
      - ApplicationUserRoles
    # Optionally filter which operations to include
    include_operations:
      - "*Create"
      - "*Update"
      - "*Delete"
      - "*Get"
      - "*ListBy*"
    exclude_operations:
      - "ApplicationApiKeys*"  # SDK shouldn't manage its own keys
```

## Required Features

### 1. Multi-API Support
- Support multiple named AppSync APIs under `appsync:` key
- Each API gets its own:
  - Generated schema file
  - Generated resolvers directory
  - Generated CDK construct
  - SSM parameters (with API name suffix)

### 2. All Authorization Modes
Support all AppSync auth modes:
- `AMAZON_COGNITO_USER_POOLS` (existing)
- `API_KEY` (existing)
- `AWS_LAMBDA` (new)
- `AWS_IAM` (new)
- `OPENID_CONNECT` (new)

### 3. Lambda Authorizer Configuration
For `AWS_LAMBDA` auth mode:
```yaml
lambda_authorizer:
  function_name: api-key-authorizer  # Reference to lambda schema
  # OR
  function_arn_ssm_param: "/orb/${project}/${env}/lambda/authorizer-arn"
  result_ttl_seconds: 300  # Cache authorization results
  identity_validation_expression: "^orb_.*$"  # Optional regex
```

### 4. Table/Operation Filtering
- `tables:` - List of tables to include (or `all`)
- `include_operations:` - Glob patterns for operations to include
- `exclude_operations:` - Glob patterns for operations to exclude

### 5. Generated CDK Construct Changes
Each API construct should:
- Accept Lambda function references for authorizers
- Support configurable auth modes
- Generate separate SSM parameters with API-specific names

## Example Generated Construct Usage

```python
# Main API
self.main_api = AppSyncApiApi(
    self, "MainApi",
    tables=tables,
    enable_api_key=True,
)

# SDK API with Lambda authorizer
self.sdk_api = AppSyncSdkApi(
    self, "SdkApi",
    tables=sdk_tables,
    lambda_authorizer=lambda_stack.functions["api-key-authorizer"],
)
```

## Impact

- **Blocking**: orb-integration-hub SDK implementation (Phase 5 of Application Access Management)
- **Priority**: High

## Acceptance Criteria

1. [ ] Multiple AppSync APIs can be defined in schema-generator.yml
2. [ ] Each API generates separate schema, resolvers, and CDK construct
3. [ ] `AWS_LAMBDA` authorization mode is supported with configurable authorizer
4. [ ] `AWS_IAM` and `OPENID_CONNECT` auth modes are supported
5. [ ] Tables can be filtered per API
6. [ ] Operations can be filtered per API using glob patterns
7. [ ] Generated CDK constructs accept Lambda function references
8. [ ] SSM parameters are namespaced per API
9. [ ] Documentation updated with multi-API examples

## Related Issues

- #73 - Enhancement: AppSyncApi Construct Missing Production Features
