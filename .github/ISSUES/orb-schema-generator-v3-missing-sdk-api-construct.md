## Summary

After upgrading to orb-schema-generator v3.2.8, the CDK generator produces the main API construct (`generated/appsync/api.py` with `AppSyncApi`) but does not produce the SDK API construct (`generated/appsync/sdk_api.py` with `AppSyncSdkApi`). In v2.x (specifically v2.0.3), both constructs were generated. The `api_stack.py` imports `AppSyncSdkApi` from `generated.appsync.sdk_api`, which no longer exists.

## Environment

- **Tool/Package version**: orb-schema-generator 3.2.8
- **Language version**: Python 3.12
- **OS**: Linux
- **Project**: orb-integration-hub (dual-API setup: main-api + sdk-api)

## Error Message

```
ModuleNotFoundError: No module named 'generated.appsync.sdk_api'
```

## Steps to Reproduce

1. Install orb-schema-generator 3.2.8
2. Have `schema-generator.yml` with dual API definitions (main-api with Cognito auth, sdk-api with Lambda authorizer) — note: these were in the `output.infrastructure.appsync` section which was removed in v3
3. Run `orb-schema generate`
4. Check `infrastructure/cdk/generated/appsync/` — only `api.py` exists, no `sdk_api.py`

## Expected vs Actual Behavior

**Expected:** Generator produces both `api.py` (AppSyncApi for main-api) and `sdk_api.py` (AppSyncSdkApi for sdk-api) in `generated/appsync/`.

**Actual:** Only `api.py` is generated. The SDK API construct is missing entirely.

## Root Cause Analysis

The v2.x `schema-generator.yml` had an `output.infrastructure.appsync` section that defined both `main-api` and `sdk-api` with their auth configs, table assignments, and operation filters. This section was removed in v3 (the validator says "The 'appsync' configuration section has been removed in v0.18.0"). Without this config, the CDK generator has no information about the second API and only generates a single construct.

The v2.x config that drove SDK API generation:

```yaml
output:
  infrastructure:
    appsync:
      sdk-api:
        name: sdk-api
        auth:
          default: AWS_LAMBDA
          lambda_authorizer:
            function_arn_ssm_param: "/${customerId}/${projectId}/${environment}/lambda/authorizer/arn"
            result_ttl_seconds: 300
        tables:
          - Users
        include_operations:
          - "CheckEmailExists"
          - "CreateUserFromCognito"
          - "GetApplicationUsers"
        schema_output: apps/api/graphql-sdk/schema.graphql
        resolvers_output: apps/api/graphql-sdk/resolvers
        cdk_output: infrastructure/cdk/generated/sdk_api
```

## Suggested Fix

Either:
1. Re-support the `appsync` API definitions section in the config (or a v3 equivalent) so the CDK generator knows about multiple APIs
2. Or infer multiple API constructs from the GraphQL targets (graphql-main and graphql-sdk map to separate APIs)

## Workaround

None available. The SDK API construct must be hand-written or restored from git history until the generator supports dual-API CDK output.

## Impact

- **Blocked functionality**: CDK synth and deploy — cannot deploy SDK API infrastructure
- **Urgency**: High — blocks all infrastructure deployments

## Related Issues

- #136 — CDK construct path and signature bugs (fixed in v3.2.8 for main API)
- #133 — Config format and generation bugs
- #111 — Original target validation bug
