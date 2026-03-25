## Summary

After upgrading from orb-schema-generator v2.0.13 to v3.2.6, the dual-API GraphQL schema generation produces identical schemas for both `graphql-main` and `graphql-sdk` targets. The SDK schema should only contain pre-authentication operations (CheckEmailExists, CreateUserFromCognito, GetApplicationUsers) but instead contains all 48 types — identical to the main schema.

This was previously tracked in #103 and #105 for v2.x. Both were closed as fixed (v2.0.7/v2.0.8), but the issue has resurfaced in v3.x where the `targets` field was removed from schemas and the generator broadcasts all types to all GraphQL targets.

## Environment

- orb-schema-generator version: 3.2.6
- Python version: 3.12
- Operating System: Linux

## Configuration

```yaml
# schema-generator.yml (relevant sections)
output:
  code:
    graphql:
      targets:
        graphql-main:
          base_dir: ./apps/api/graphql
        graphql-sdk:
          base_dir: ./apps/api/graphql-sdk
```

## Evidence

### Both schemas are identical (408 lines each, 0 diff)

```bash
$ wc -l apps/api/graphql/schema.graphql apps/api/graphql-sdk/schema.graphql
  408 apps/api/graphql/schema.graphql
  408 apps/api/graphql-sdk/schema.graphql

$ diff apps/api/graphql/schema.graphql apps/api/graphql-sdk/schema.graphql
# (no output — files are identical)
```

### SDK schema contains ALL types (should only have SDK operations)

The SDK schema includes all 12 DynamoDB table types, all 27 registry types, all 4 model types, and all 5 lambda types. It should only contain:
- `CheckEmailExists` (query)
- `CreateUserFromCognito` (mutation)
- `GetApplicationUsers` (query)
- Supporting types referenced by those operations

### Both schemas have empty Query/Mutation blocks

```graphql
# Both schemas end with:
type Query {
}

type Mutation {
}
```

No operations, inputs, or response types are generated for either API.

### CDK constructs generated but have no resolvers

Both `main_api/app_sync_main_api_api.py` and `sdk_api/app_sync_sdk_api_api.py` are generated with correct auth configurations (Cognito vs Lambda authorizer) but neither construct creates any data sources or resolvers.

## Root Cause Analysis

In v2.x, schemas had a `targets` field that controlled which GraphQL target received each schema:

```yaml
# v2 format (worked)
targets:
  - graphql-sdk
```

In v3.x, the `targets` field was removed. The v3 format has no mechanism to scope schemas to specific GraphQL targets. The generator appears to broadcast all schemas to all GraphQL targets identically.

## Expected Behavior

1. `graphql-main` schema should contain types and operations for all DynamoDB tables (Cognito-authenticated)
2. `graphql-sdk` schema should contain ONLY lambda-backed operations (CheckEmailExists, CreateUserFromCognito, GetApplicationUsers)
3. Each schema should have populated Query/Mutation blocks with the appropriate operations
4. CDK constructs should include resolvers (DynamoDB for main, Lambda for SDK)

## Impact

- **Severity**: High — SDK API is non-functional without manual schema and resolver management
- **Scope**: Affects all v3 multi-API setups
- **Workaround**: Hand-written GraphQL schemas and manual resolver creation in CDK stacks (defeats code generation purpose)

## Related Issues

- #103 (closed) — Lambda Resolvers Not Generated for SDK API in Multi-API Setup (v2.x)
- #105 (closed) — Multi-API AppSync Configuration Not Recognized in v2.0.7
- #83 — Enhancement: Multi-AppSync API Support with Lambda Authorizer

## Request

Please add a v3-compatible mechanism for scoping schemas to specific GraphQL targets. Options could include:
1. A new field in the schema's `appsync` or `lambda` section (e.g., `graphql_targets: [graphql-sdk]`)
2. Target-level `include_schemas` / `exclude_schemas` filters in `schema-generator.yml`
3. Restoring `targets` support in v3 format

## Files for Reference

- `schema-generator.yml` — Current v3 configuration
- `apps/api/graphql/schema.graphql` — Generated main schema (408 lines)
- `apps/api/graphql-sdk/schema.graphql` — Generated SDK schema (identical 408 lines)
- `infrastructure/cdk/generated/main_api/app_sync_main_api_api.py` — Main API CDK construct (no resolvers)
- `infrastructure/cdk/generated/sdk_api/app_sync_sdk_api_api.py` — SDK API CDK construct (no resolvers)
- `schemas/lambdas/CheckEmailExists.yml` — Lambda schema that should only go to SDK
