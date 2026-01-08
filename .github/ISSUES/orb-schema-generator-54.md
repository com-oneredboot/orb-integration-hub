# GraphQL schema generated to wrong location with skip: true targets

## Environment

- orb-schema-generator version: 0.13.0
- Project: orb-integration-hub
- OS: Linux

## Description

When configuring GraphQL output with `skip: true` for certain targets, the generator creates files in a `generated/` directory at the project root instead of the configured `base_dir` path.

## Configuration

```yaml
output:
  graphql:
    enabled: true
    targets:
      api:
        base_dir: ./apps/api/graphql
      web:
        skip: true
```

## Expected Behavior

GraphQL schema should be generated to `./apps/api/graphql/schema.graphql`

## Actual Behavior

1. GraphQL schema is generated to `./generated/schema.graphql` (wrong location)
2. The `apps/api/graphql/` directory remains empty
3. Log shows validation warnings referencing both paths:
   ```
   GraphQL validation warnings for apps/api/graphql/schema.graphql:
     • GraphQL syntax error: Syntax Error: Unexpected <EOF>. (line 1, column 18375)
   Skipping generated/schema.graphql: No AUTO-GENERATED header found.
   ```

## Steps to Reproduce

1. Configure `schema-generator.yml` with GraphQL targets where one target has `skip: true`
2. Run `orb-schema generate`
3. Observe that `generated/schema.graphql` is created instead of the configured path

## Additional Context

- orb-geo-fence uses version 0.9.6 and doesn't have this issue (they don't use `skip: true` for GraphQL)
- The Python and TypeScript generators correctly respect `skip: true` and generate to the correct paths
- This may be a regression in 0.13.0 or a bug specific to the GraphQL generator's handling of skipped targets

## Workaround

Currently working around by manually moving the file, but this breaks the regeneration workflow.
