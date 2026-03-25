## Bug: `orb-schema generate` fails with target validation errors after v3 migration

**Package version:** orb-schema-generator 3.2.0
**Project:** orb-integration-hub

### Description

After migrating all 50 schemas from v2.x to v3 format using `orb-schema migrate-v3`, running `orb-schema generate` fails with target validation errors. All schemas pass `validate-v3 --strict` and `rehash --verify-only`, but code generation cannot proceed.

### Error Output

```
Generation failed: Target validation failed:
  - Target 'ts-main' defined in typescript configuration but not referenced by any schema
  - Target 'graphql-main' defined in graphql configuration but not referenced by any schema
  - Target 'graphql-sdk' defined in graphql configuration but not referenced by any schema
  - Target 'python-main' defined in python configuration but not referenced by any schema
```

### Root Cause

V3 schemas no longer have a `targets` array (e.g., `targets: [python-main, ts-main, graphql-main]`). The migration tool removes the `targets` field and replaces it with infrastructure-level configuration sections (`dynamodb`, `appsync`, `lambda`).

The `TargetValidator._collect_schema_targets()` calls `getattr(schema, "targets", [])` on V3Schema objects, which returns `[]` (V3Schema has no `targets` attribute). The validator then reports all configured named targets (`python-main`, `ts-main`, etc.) as unused.

The `BaseGenerator._group_by_target()` has the same issue — V3Schema objects return no targets, so no schemas are routed to any configured output target.

### Steps to Reproduce

1. Start with a project using v2.x schemas that have named targets in `schema-generator.yml`:
   ```yaml
   output:
     code:
       python:
         targets:
           python-main:
             base_dir: ./apps/api
       typescript:
         targets:
           ts-main:
             base_dir: ./apps/web/src/app
       graphql:
         targets:
           graphql-main:
             base_dir: ./apps/api/graphql
           graphql-sdk:
             base_dir: ./apps/api/graphql-sdk
   ```
2. Migrate all schemas: `orb-schema migrate-v3 schemas/ --force`
3. Validate: `orb-schema validate-v3 schemas/ --strict` → passes
4. Generate: `orb-schema generate` → fails with target validation errors

### Expected Behavior

`orb-schema generate` should work with v3 schemas and the existing `schema-generator.yml` named target configuration. The v3 migration guide and docs state that the existing config format is compatible with v3.

### Actual Behavior

Generation fails because V3Schema objects don't carry named output targets, and the target validator + generator routing logic expects them.

### Environment

- orb-schema-generator: 3.2.0 (installed from CodeArtifact, not editable)
- Python: 3.12
- OS: Linux
- 50 schemas across 5 directories (tables, models, registries, lambdas, core)
- Dual AppSync API setup (main-api + sdk-api)
