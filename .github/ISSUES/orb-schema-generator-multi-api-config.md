# Multi-API AppSync Configuration Clarification Needed

## Context

We're trying to configure orb-schema-generator v1.3.0 to generate two separate AppSync APIs:
1. Main API with Cognito authentication
2. SDK API with Lambda authorizer authentication

## Issue

The documentation in `docs/configuration/appsync.md` and `docs/migration/multi-api.md` shows a multi-API configuration format:

```yaml
output:
  infrastructure:
    appsync:
      api:
        name: "${customerId}-${projectId}-${environment}-appsync-api"
        auth:
          default: AMAZON_COGNITO_USER_POOLS
          cognito:
            user_pool_ssm_param: "/${customerId}/${projectId}/${environment}/cognito/user-pool-id"
        tables:
          - Users
          - Organizations
        include_operations:
          - "*"
        schema_output: apps/api/graphql/schema.graphql
        resolvers_output: apps/api/graphql/resolvers/
        cdk_output: infrastructure/cdk/generated/appsync/api/
      sdk:
        name: "${customerId}-${projectId}-${environment}-appsync-sdk"
        auth:
          default: AWS_LAMBDA
          lambda_authorizer:
            function_arn_ssm_param: "/${customerId}/${projectId}/${environment}/lambda/authorizer/arn"
        tables:
          - Users
          - Applications
        include_operations:
          - "Users*"
          - "Applications*"
        schema_output: apps/api/graphql/sdk-schema.graphql
        resolvers_output: apps/api/graphql/sdk-resolvers/
        cdk_output: infrastructure/cdk/generated/appsync/sdk/
```

However, when we try to use this configuration with v1.3.0, we get:

```
Configuration errors found:
  • output.infrastructure.appsync: The 'appsync' configuration section has been removed in v0.18.0. 
    VTL resolvers are now generated automatically for DynamoDB schemas. 
    AppSyncApi construct uses naming conventions and constructor parameters.
```

## Questions

1. **Is multi-API configuration supported in v1.3.0?**
   - The CHANGELOG shows it was added in v1.0.0
   - But the error says appsync config was removed in v0.18.0
   - These seem contradictory

2. **If multi-API is supported, what is the correct configuration format for v1.3.0?**

3. **If multi-API is NOT supported in v1.3.0, which version should we use?**
   - Should we upgrade to v2.0.0?
   - Or is there a different approach?

4. **What is the recommended way to have two separate AppSync APIs with different auth modes?**
   - One for web/mobile users (Cognito)
   - One for SDK/external developers (Lambda authorizer)

## Environment

- orb-schema-generator: v1.3.0
- Python: 3.12
- Project: orb-integration-hub

## Expected Behavior

We expect to be able to define two separate AppSync APIs in schema-generator.yml that generate:
- Two separate GraphQL schemas
- Two separate sets of VTL resolvers
- Two separate CDK constructs (AppSyncApiApi and AppSyncSdkApi)

## Current Workaround

Currently using:
- Generated BackendStack for main API (single API, auto-generated)
- Manual appsync_sdk_stack.py for SDK API

But we'd prefer both to be auto-generated if possible.
