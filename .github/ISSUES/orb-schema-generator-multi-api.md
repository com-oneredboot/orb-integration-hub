# Multi-API AppSync Configuration Not Recognized in v2.0.7

## Summary

The `output.infrastructure.appsync` configuration section is not recognized in orb-schema-generator v2.0.7, despite documentation in the repository indicating it should be supported.

## Environment

- **orb-schema-generator version**: 2.0.7
- **Python version**: 3.12
- **Operating System**: Windows

## Expected Behavior

Based on the documentation in `repositories/orb-schema-generator/docs/configuration/appsync.md`, the following configuration should work:

```yaml
output:
  infrastructure:
    cdk:
      base_dir: ./infrastructure/cdk/generated
      language: python
      generate_stack: false
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
        cdk_output: infrastructure/cdk/generated/appsync/
      
      sdk:
        name: "${customerId}-${projectId}-${environment}-appsync-sdk"
        auth:
          default: AWS_LAMBDA
          lambda_authorizer:
            function_arn_ssm_param: "/${customerId}/${projectId}/${environment}/lambda/authorizer/arn"
        tables: []
        include_operations:
          - "CheckEmailExists"
          - "CreateUserFromCognito"
        schema_output: apps/api/graphql-sdk/schema.graphql
        resolvers_output: apps/api/graphql-sdk/resolvers/
        cdk_output: infrastructure/cdk/generated/appsync-sdk/
```

## Actual Behavior

Running `orb-schema generate` produces the following error:

```
WARNING: Unknown field 'appsync'

Configuration errors found:
  • output.infrastructure.appsync: The 'appsync' configuration section is not supported. VTL resolvers are now generated automatically for DynamoDB schemas. AppSyncApi construct uses naming conventions and constructor parameters.

To proceed:
  1. Run: orb-schema validate-config --fix
  2. Or: orb-schema generate --skip-validation
```

## Context

We need to generate two separate AppSync APIs:

1. **Main API**: Cognito authentication for authenticated users, accessing all DynamoDB tables
2. **SDK API**: Lambda authorizer authentication for pre-authentication operations (CheckEmailExists, CreateUserFromCognito)

The current single-API generation creates one unified API with all operations, but we need separate APIs with different authentication mechanisms.

## Investigation

- The CHANGELOG.md shows multi-API support in the "Unreleased" section
- The documentation exists in `docs/configuration/appsync.md` with detailed examples
- The repository has test files like `test_multi_appsync_api.py` and `test_lambda_resolvers_sdk_api_fix.py`
- Version 2.0.7 is the latest in CodeArtifact, but the multi-API feature appears to be on the main branch but not yet released

## Questions

1. Is multi-API AppSync configuration available in v2.0.7, or is it only in an unreleased version?
2. If unreleased, when will the next version with multi-API support be published to CodeArtifact?
3. If it should work in v2.0.7, what is the correct configuration format?

## Workaround Needed

Currently using two GraphQL targets (`graphql-main` and `graphql-sdk`) but this generates a single unified API. We need guidance on how to achieve two separate AppSync APIs with different auth modes in the current version, or confirmation that we need to wait for the next release.
