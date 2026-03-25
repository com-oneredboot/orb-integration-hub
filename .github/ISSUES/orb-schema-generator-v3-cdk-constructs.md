## Summary

After upgrading to orb-schema-generator v3.2.7, the generated CDK AppSync constructs have multiple breaking changes that prevent `cdk synth` from succeeding. The constructs have changed import paths, class names, constructor signatures, and contain a broken GraphQL schema file path that causes `ENOENT: no such file or directory` at synth time.

## Environment

- **Tool/Package version**: orb-schema-generator 3.2.7
- **Language version**: Python 3.12
- **OS**: Linux (GitHub Actions runner + local)
- **Project**: orb-integration-hub
- **CDK version**: aws-cdk-lib 2.x

## Error Messages

### CDK Synth failure (deploy-infrastructure workflow)

```
ENOENT: no such file or directory, open '/home/runner/work/orb-integration-hub/orb-integration-hub/infrastructure/cdk/generated/schema.graphql'
```

### Import errors (after updating imports to new paths)

```
TypeError: AppSyncMainApiApi.__init__() got an unexpected keyword argument 'enable_api_key'
```

## Steps to Reproduce

1. Install orb-schema-generator 3.2.7
2. Run `orb-schema generate` from project root
3. Observe new generated files in `infrastructure/cdk/generated/main_api/` and `infrastructure/cdk/generated/sdk_api/`
4. Run `cdk synth` — fails with ENOENT for `schema.graphql`

## Breaking Changes in v3.2.7 Generated CDK Constructs

### 1. Import paths changed

```python
# Before (v2.x generated)
from generated.appsync.api import AppSyncApi
from generated.appsync.sdk_api import AppSyncSdkApi

# After (v3.2.7 generated)
from generated.main_api.app_sync_main_api_api import AppSyncMainApiApi
from generated.sdk_api.app_sync_sdk_api_api import AppSyncSdkApiApi
```

### 2. Class names changed

- `AppSyncApi` → `AppSyncMainApiApi`
- `AppSyncSdkApi` → `AppSyncSdkApiApi`

### 3. Constructor signatures changed

```python
# Before (v2.x generated)
AppSyncApi(self, "MainApi", tables=tables, enable_api_key=True, enable_xray=True)
AppSyncSdkApi(self, "SdkApi", tables=tables, enable_xray=True)

# After (v3.2.7 generated) — enable_api_key and enable_xray removed
AppSyncMainApiApi(self, "MainApi", tables=tables)
AppSyncSdkApiApi(self, "SdkApi", tables=tables, lambda_authorizer=lambda_authorizer)
```

### 4. GraphQL schema path broken (CRITICAL)

Both generated constructs reference:
```python
definition=appsync.Definition.from_file(
    str(Path(__file__).parent.parent / "schema.graphql")
)
```

This resolves to `infrastructure/cdk/generated/schema.graphql` which does not exist. The GraphQL schemas are generated at:
- `apps/api/graphql/schema.graphql` (main-api)
- `apps/api/graphql-sdk/schema.graphql` (sdk-api)

The old v2.x construct correctly used:
```python
schema_path = Path(__file__).parent / "../../../../apps/api/graphql/schema.graphql"
```

### 5. Both constructs reference the same schema file

Both `AppSyncMainApiApi` and `AppSyncSdkApiApi` point to the same `schema.graphql` path. In a dual-API setup, each API needs its own schema file (main-api has all operations, sdk-api has a subset).

## Expected Behavior

Generated CDK constructs should:
1. Reference the correct GraphQL schema paths as configured in `schema-generator.yml`
2. Use separate schema files for each API definition (main-api vs sdk-api)
3. Maintain backward-compatible constructor signatures or document breaking changes in a migration guide

## Workaround

None available. The `api_stack.py` imports were reverted to the old v2.x construct paths (`generated.appsync.api`), which still exist but will eventually be stale.

## Impact

- **Blocked functionality**: CDK synth and deploy — cannot deploy infrastructure changes
- **Urgency**: High — blocks all infrastructure deployments

## Related Issues

- #133 — Config format and MCP bugs (partially fixed in v3.2.5-v3.2.7)
- #111 — Original target validation bug
