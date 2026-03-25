## Summary

`orb-schema migrate-v3` in v3.2.5 strips all attributes, keys, auth config, stream config, and other model data from schemas during migration. The migrated output contains only the schema name, an empty `model.attributes: []`, and the type-specific section (e.g., `dynamodb` or `lambda`) with minimal fields. This is a regression — the same command in v3.2.4 preserved all schema data correctly.

## Environment

- **Tool/Package version**: orb-schema-generator 3.2.5
- **Language version**: Python 3.12
- **OS**: Linux
- **Project**: orb-integration-hub
- **Schema count**: 17 schemas affected (12 tables + 5 lambdas)

## Steps to Reproduce

1. Install orb-schema-generator 3.2.5 from CodeArtifact
2. Have a v2.x table schema with attributes, keys, auth config, stream config (e.g., Users.yml with 15 attributes, 3 GSIs, auth groups, stream config)
3. Run `orb-schema migrate-v3 schemas/tables/ --force`
4. Inspect the migrated file

## Expected vs Actual Behavior

**Expected:** Migrated schema preserves all data — attributes with types/descriptions/required flags, keys (primary + GSIs), auth config, stream config — converted to v3 structure.

**Actual:** Migrated schema contains only:
```yaml
version: '1'
name: Users
model:
  attributes: []
dynamodb:
  pitr_enabled: false
hash: sha256:788cf3d04e972c00c95f5908d2c7f225be3f6111e71f84f3627f4e561ad69876
```

All 15 attributes, 3 GSIs, auth config, stream config, and targets are gone. The `model.attributes` is an empty list.

Same issue with lambda schemas:
```yaml
version: '1'
name: CheckEmailExists
model:
  attributes: []
lambda:
  operation: mutation
hash: sha256:b8935fb7fe707aafa3c783ae394c7556e85d446c2d6f41a57babeb436bd3e511
```

## Original Schema (Before Migration)

Users.yml had:
- 15 attributes (userId, cognitoId, email, firstName, lastName, status, etc.) with types, required flags, descriptions, enum_type references
- Primary key: userId
- 3 GSIs: EmailIndex, CognitoIdIndex, CognitoSubIndex
- Stream config: NEW_AND_OLD_IMAGES
- Auth config: apiKeyAuthentication + cognitoAuthentication with 4 group-level permission sets
- Targets: python-main, ts-main, graphql-main, graphql-sdk

After migration: all of this is gone, replaced with `model.attributes: []`.

## Root Cause Analysis

The `migrate-v3` command appears to be creating a new schema structure but not copying the `model.attributes` dict entries into the v3 list format. It also drops `model.keys`, `model.stream`, `model.authConfig`, and `targets` without converting them to their v3 equivalents (`dynamodb.partition_key`, `dynamodb.global_secondary_indexes`, `dynamodb.stream`, `appsync.auth_config`).

## Impact

- **Blocked functionality**: Cannot migrate v2 schemas to v3 — migration destroys all schema data
- **Urgency**: High — blocks v3 migration for orb-integration-hub
- **Workaround**: None — manual migration of 17 schemas is not practical

## Related Issues

- #133 — v3.2.5 fixed generation bugs but introduced this migration regression
- #111 — Original target validation bug
