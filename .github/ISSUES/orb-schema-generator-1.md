# Bug: GraphQL operations built but not written to schema.graphql

## Environment
- orb-schema-generator version: 0.13.2
- Project: orb-integration-hub
- OS: Linux

## Description

The generator reports building operations for each table schema but the generated `schema.graphql` file has empty Query and Mutation types.

## Steps to Reproduce

1. Configure `schema-generator.yml` with GraphQL output enabled:
```yaml
output:
  graphql:
    enabled: true
    targets:
      api:
        base_dir: ./apps/api/graphql
```

2. Create table schemas with `type: dynamodb` and `targets: [api]`

3. Run `orb-schema-generator generate`

## Expected Behavior

The generated `schema.graphql` should contain Query and Mutation operations for each table.

## Actual Behavior

Generator output shows operations being built:
```
Built 9 operations for Notifications
Built 9 operations for ApplicationUsers
Built 5 operations for SmsRateLimit
Built 9 operations for OrganizationUsers
Built 11 operations for ApplicationRoles
Built 7 operations for Roles
Built 7 operations for Applications
Built 8 operations for Users
```

But the generated schema has empty types:
```graphql
type Query {
}

type Mutation {
}
```

## Comparison with Working Project

orb-geo-fence uses the same generator version and successfully generates operations. Key differences observed:
- orb-geo-fence has `version: '1.0'` at top level (but generator says this is deprecated)
- Both projects have similar table schema structures

## Configuration Files

### schema-generator.yml (orb-integration-hub)
```yaml
version: '1.0'

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
  graphql:
    enabled: true
    targets:
      api:
        base_dir: ./apps/api/graphql
      web:
        base_dir: ./apps/api/graphql
```

### Example Table Schema (Users.yml)
```yaml
type: dynamodb
version: '1.0'
name: Users
targets:
  - api
model:
  authConfig:
    cognitoAuthentication:
      groups:
        OWNER:
          - '*'
        USER:
          - '*'
  keys:
    primary:
      partition: userId
    secondary:
      - name: EmailIndex
        type: GSI
        partition: email
        projection_type: ALL
  attributes:
    userId:
      type: string
      required: true
    # ... more attributes
```

## Impact

This blocks all GraphQL API development for orb-integration-hub. We cannot proceed with frontend integration or API testing until this is resolved.

## Workaround Attempted

None - per team policy, we do not implement workarounds for generator bugs.
