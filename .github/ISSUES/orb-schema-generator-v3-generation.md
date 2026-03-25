## Summary

After upgrading to orb-schema-generator v3.2.4 and migrating all 50 schemas to v3 format, code generation fails. The CLI `generate` command, MCP `inspect_schema`, and MCP `generate_from_schema` all fail with different errors. Schema validation (`validate-v3 --strict`) and hash verification (`rehash --verify-only`) pass cleanly. This is a follow-up to #111.

## Environment

- **Tool/Package version**: orb-schema-generator 3.2.4
- **Language version**: Python 3.12
- **OS**: Linux
- **Project**: orb-integration-hub
- **Schema count**: 50 schemas across 5 directories (tables, models, registries, lambdas, core)

## Error Messages

### CLI `validate-config` (with `output.code.*` wrapper)

```
WARNING [output.code]: Unknown field 'code'
ERROR [output.infrastructure.appsync]: The 'appsync' configuration section has been removed in v0.18.0.
```

### CLI `validate-config` (with `output.python.*` flat format from `orb-schema init`)

```
Target validation failed: Schema 'Validators' is missing required 'targets' field: schemas/core/validators.yml
Since v0.12.0, all schemas must have a 'targets' array:
  targets:
    - api  # or your target name
```

### CLI `generate` (with `--skip-validation`)

```
Generation failed: Schema 'Validators' is missing required 'targets' field: schemas/core/validators.yml
```

### MCP `inspect_schema`

```
'list' object has no attribute 'keys'
```

### MCP `generate_from_schema` (with `output.code.*` format)

```
No module named 'src'
```

## Steps to Reproduce

1. Install orb-schema-generator 3.2.4 from CodeArtifact
2. Migrate all schemas: `orb-schema migrate-v3 schemas/ --force`
3. Validate: `orb-schema validate-v3 schemas/ --strict` — passes (50/50)
4. Verify hashes: `orb-schema rehash schemas/ --verify-only` — passes (50/50)
5. Try to generate: `orb-schema generate` — fails

## Expected vs Actual Behavior

**Expected:** `orb-schema generate` should work with v3 schemas after successful migration and validation.

**Actual:** Generation fails because:
1. The CLI config validator rejects both the old `output.code.*` format (unknown field) and the new `output.python.*` format (schemas missing `targets`)
2. V3 schemas don't have `targets` arrays (removed by `migrate-v3`), but the generator still requires them
3. MCP `inspect_schema` crashes on v3 list-format `model.attributes` (expects dict)
4. MCP `generate_from_schema` crashes with `No module named 'src'`

## Root Cause Analysis

There appear to be multiple issues:

1. **Config format conflict**: `validate-config` says `output.code` is unknown and wants `output.python` directly. But `orb-schema init` generates a config without named targets, and the generator requires schemas to have `targets` arrays that reference named targets.

2. **V3 schema target gap**: `migrate-v3` removes `targets` from schemas (correct per v3 spec), but the generator's `_group_by_target()` and target validator still require them. The v3.2.2 fix (broadcast V3 schemas to all targets) doesn't seem to be working with the flat config format.

3. **MCP inspect_schema**: Calls `.keys()` on `model.attributes`, which is a list in v3 format (was a dict in v2).

4. **MCP generate_from_schema**: Has an internal `import src.xxx` that fails when run as an installed package.

## Suggested Fix

1. The generator needs to handle v3 schemas without `targets` arrays when using the flat config format (no named targets)
2. MCP `inspect_schema` needs to handle list-format `model.attributes`
3. MCP `generate_from_schema` needs to fix the `No module named 'src'` import

## Workaround

None available. Cannot generate code from v3 schemas.

## Impact

- **Blocked functionality**: Complete code generation pipeline — Python models, TypeScript models, GraphQL schemas, CDK constructs
- **Urgency**: High — blocks v3 migration for orb-integration-hub

## Related Issues

- #111 — Original target validation bug (closed, partially fixed in v3.2.1-v3.2.4)
