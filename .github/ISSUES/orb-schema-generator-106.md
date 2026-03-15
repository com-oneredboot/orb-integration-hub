# Need Help: Multi-API Configuration for Two Separate AppSync APIs

## Goal

Generate two separate AppSync GraphQL APIs with different authentication modes and operation subsets:

1. **Main API**: Cognito authentication for authenticated users, accessing all DynamoDB tables
2. **SDK API**: Lambda authorizer authentication for pre-authentication operations (CheckEmailExists, CreateUserFromCognito, GetApplicationUsers)

## Current Configuration

```yaml
project:
  name: orb-integration-hub
  customerId: orb
  projectId: integration-hub
  environment: dev

paths:
  schemas: ./schemas
  subdirectories:
    core: core
    tables: tables
    models: models
    registries: registries
    graphql: graphql
    lambdas: lambdas

output:
  code:
    python:
      targets:
        python-main:
          base_dir: ./apps/api
          enums_subdir: enums
          models_subdir: models
    typescript:
      targets:
        ts-main:
          base_dir: ./apps/web/src/app
          enums_subdir: core/enums
          models_subdir: core/models
          graphql_queries_subdir: core/graphql
    graphql:
      targets:
        graphql-main:
          base_dir: ./apps/api/graphql
        graphql-sdk:
          base_dir: ./apps/api/graphql-sdk
  infrastructure:
    cdk:
      base_dir: ./infrastructure/cdk/generated
      language: python
    appsync:
      # Main API for authenticated users (Cognito)
      main-api:
        name: "${customerId}-${projectId}-${environment}-appsync-api"
        auth:
          default: AMAZON_COGNITO_USER_POOLS
          cognito:
            user_pool_ssm_param: "/${customerId}/${projectId}/${environment}/cognito/user-pool-id"
        tables:
          - Users
          - Organizations
          - OrganizationUsers
          - Applications
          - ApplicationRoles
          - ApplicationUserRoles
          - ApplicationEnvironmentConfig
          - ApplicationApiKeys
          - Notifications
          - OwnershipTransferRequests
          - PrivacyRequests
          - SmsRateLimit
        include_operations:
          - "*"
        schema_output: apps/api/graphql
        resolvers_output: apps/api/graphql/resolvers
        cdk_output: infrastructure/cdk/generated/main_api
      
      # SDK API for pre-authentication operations (Lambda authorizer)
      sdk-api:
        name: "${customerId}-${projectId}-${environment}-appsync-sdk"
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
        schema_output: apps/api/graphql-sdk
        resolvers_output: apps/api/graphql-sdk/resolvers
        cdk_output: infrastructure/cdk/generated/sdk_api

generation:
  validate_schemas: true
  validate_graphql: true
  cleanup_old_files: true

logging:
  level: INFO
  file: ./schema_generator.log
```

## What's Happening

When I run `orb-schema generate`:

1. ✅ Generation completes successfully
2. ✅ GraphQL schemas are generated in both `apps/api/graphql/` and `apps/api/graphql-sdk/`
3. ✅ 218 VTL resolver templates are generated
4. ✅ CDK constructs are generated in `infrastructure/cdk/generated/`
5. ⚠️ Validation warning: "Unknown field 'appsync'"
6. ❌ Only ONE AppSync API construct is generated in `infrastructure/cdk/generated/appsync/api.py`

## Expected Behavior

I expected to see TWO separate CDK constructs generated:
- `infrastructure/cdk/generated/main_api/` with the Main API construct
- `infrastructure/cdk/generated/sdk_api/` with the SDK API construct

OR at minimum, the single `api.py` file should contain TWO separate API constructs (one for main-api, one for sdk-api).

## Current Generated Structure

```
infrastructure/cdk/generated/
├── appsync/
│   ├── api.py          # Only contains ONE API (main-api)
│   └── resolvers/
├── tables/
│   ├── users_table.py
│   └── ... (other tables)
└── __init__.py
```

The generated `api.py` only creates the Main API with Cognito auth. The SDK API with Lambda authorizer is not generated.

## Questions

1. Is the configuration format correct for multi-API generation?
2. Should I expect separate directories (`main_api/` and `sdk_api/`) or a single file with multiple constructs?
3. Is there additional configuration needed to generate both APIs?
4. Is the multi-API feature fully implemented in v2.0.10?

## Environment

- orb-schema-generator version: 2.0.10
- Python version: 3.12
- OS: Windows 11
- CDK language: Python

## Request

Please provide the correct configuration or guidance on how to generate two separate AppSync APIs with this setup. Thank you!
