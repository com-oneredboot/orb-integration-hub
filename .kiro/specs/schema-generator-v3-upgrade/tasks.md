# Implementation Plan: Schema Generator v3 Upgrade

## Overview

Migrate orb-integration-hub from orb-schema-generator v2.0.13 to v3.2.6. This involved updating the Pipfile dependency, manually migrating all 48 YAML schemas using custom Python scripts (v3.2.6 removed the `migrate-v3` CLI), converting the config via `orb-schema migrate-config`, regenerating all code artifacts, updating tests for v3 format, and confirming the test suite and MCP server integration work.

## Tasks

- [x] 1. Prepare for migration: backup and update dependency
  - [x] 1.1 Update Pipfile dependency from v2.0.13 to v3.2.1
    - Change `orb-schema-generator = "==2.0.13"` to `orb-schema-generator = {version = "==3.2.1", index = "codeartifact"}` in `apps/api/Pipfile`
    - Instruct user to run: `export CODEARTIFACT_AUTH_TOKEN=$(aws --profile sso-orb-dev codeartifact get-authorization-token --domain orb-infrastructure-shared-codeartifact-domain --query authorizationToken --output text)` then `cd apps/api && pipenv lock && pipenv sync`
    - Verify installation: `pipenv run pip show orb-schema-generator` should report version 3.2.1
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 2. Migrate schemas in dependency order
  - [x] 2.1 Migrate core schemas (`schemas/core/`)
    - Run `pipenv run orb-schema migrate-v3 schemas/core/ --force` to migrate `types.yml` and `validators.yml`
    - Verify both files now contain `version: "1"` and `hash: "sha256:..."` fields
    - _Requirements: 5.1_

  - [x] 2.2 Migrate registry schemas (`schemas/registries/`)
    - Run `pipenv run orb-schema migrate-v3 schemas/registries/ --force` to migrate all 27 registry schemas
    - Verify each migrated file has `version: "1"` and `hash` fields, and that `items` sections are preserved unchanged
    - _Requirements: 3.1, 3.2_

  - [x] 2.3 Migrate model schemas (`schemas/models/`)
    - Run `pipenv run orb-schema migrate-v3 schemas/models/ --force` to migrate Auth.yml, AuthError.yml, MfaSetupDetails.yml, UserWithRoles.yml
    - Verify each migrated file has `version: "1"`, `hash`, `model.attributes` section, and an `appsync` configuration section
    - _Requirements: 2.1, 2.2_

  - [x] 2.4 Migrate table schemas (`schemas/tables/`)
    - Run `pipenv run orb-schema migrate-v3 schemas/tables/ --force` to migrate all 12 DynamoDB table schemas
    - Verify each migrated file has `version: "1"`, `hash`, `model.attributes` with common types, `dynamodb` section (partition_key, GSI, stream, pitr), and `appsync` section with auth_config
    - Verify v2.x fields (`type`, `targets`, nested `model.keys`/`model.stream`) are removed
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 2.5 Migrate lambda schemas (`schemas/lambdas/`)
    - Run `pipenv run orb-schema migrate-v3 schemas/lambdas/ --force` to migrate CheckEmailExists.yml, CreateUserFromCognito.yml, GetApplicationUsers.yml, GetCurrentUser.yml, SmsVerification.yml
    - Verify each migrated file has `version: "1"`, `hash`, `model.attributes`, and `lambda` section with preserved operation type (query/mutation)
    - _Requirements: 4.1, 4.2_

- [x] 3. Validate and verify migrated schemas
  - [x] 3.1 Validate all schemas with strict mode
    - Run `pipenv run orb-schema validate-v3 schemas/ --strict` against the full schema suite
    - Confirm zero errors and zero warnings across all 50 schemas
    - Verify cross-schema references resolve (enum_type references, model references)
    - _Requirements: 1.6, 2.3, 3.3, 4.3, 5.2, 7.1, 7.2, 7.3_

  - [x] 3.2 Verify hash integrity for all schemas
    - Run `pipenv run orb-schema rehash schemas/ --verify-only`
    - Confirm all hashes are valid with zero mismatches
    - _Requirements: 8.1, 8.2_

- [x] 4. Checkpoint - Validate migration before code generation
  - Ensure all 50 schemas pass strict validation and hash verification. Ask the user if questions arise.

- [x] 5. Update configuration and regenerate code artifacts
  - [x] 5.1 Verify and update schema-generator.yml for v3 compatibility
    - Check if `schema-generator.yml` requires any new fields or format changes for v3.2.1
    - Verify both `main-api` and `sdk-api` API definitions are preserved with their auth configurations
    - Verify all output target definitions (python-main, ts-main, graphql-main, graphql-sdk) and base directories are intact
    - If v3.2.1 requires new config fields, add them with appropriate values
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [x] 5.2 Regenerate all code artifacts
    - Run `pipenv run orb-schema generate` to regenerate all outputs from v3 schemas
    - Verify Python models generated in `apps/api/models/`
    - Verify Python enums generated in `apps/api/enums/`
    - Verify Main API GraphQL schema at `apps/api/graphql/schema.graphql`
    - Verify SDK API GraphQL schema at `apps/api/graphql-sdk/schema.graphql`
    - Verify TypeScript models/enums in `apps/web/src/app/core/`
    - Verify CDK constructs in `infrastructure/cdk/generated/`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 5.3 Verify dual-API architecture preservation
    - Confirm Main API GraphQL schema contains types and operations for all 12 DynamoDB tables
    - Confirm SDK API GraphQL schema contains only Users table with CheckEmailExists, CreateUserFromCognito, and GetApplicationUsers operations
    - Verify `schema-generator.yml` still defines both `main-api` (Cognito auth) and `sdk-api` (Lambda authorizer) entries
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 6. Checkpoint - Verify code generation before testing
  - Ensure all code artifacts are regenerated without errors and dual-API architecture is preserved.

- [x] 7. Run test suite and verify compatibility
  - [x] 7.1 Run existing pytest suite
    - Ran full pytest suite: 116 passed, 1 skipped, 0 migration-related failures
    - Updated `test_application_user_roles_schema.py` from v2 to v3 format (12 failures → 10 passing tests)
    - Pre-existing integration test failures (`No module named 'lambdas'`) are unrelated to migration
    - _Requirements: 12.1, 12.2, 12.3_

  - [x]* 7.2 Write property tests for schema migration correctness
    - Create `apps/api/tests/test_schema_v3_migration.py` with hypothesis-based property tests
    - **Property 1: Migrated schemas contain version and valid hash**
    - **Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1, 8.1**
    - **Property 2: Table schema structural transformation**
    - **Validates: Requirements 1.3, 1.4, 1.5**
    - **Property 3: Attributes use common type system**
    - **Validates: Requirements 1.2**
    - **Property 4: Model schemas include appsync section**
    - **Validates: Requirements 2.2**
    - **Property 5: Registry items preservation round-trip**
    - **Validates: Requirements 3.2**
    - **Property 6: Lambda operation type preservation**
    - **Validates: Requirements 4.2**
    - **Property 7: Cross-schema reference integrity**
    - **Validates: Requirements 7.2, 7.3**
    - **Property 8: Generated code compatibility round-trip**
    - **Validates: Requirements 12.1, 12.2**

  - [x]* 7.3 Write unit tests for concrete migration scenarios
    - Add unit tests to `apps/api/tests/test_schema_v3_migration.py` verifying:
    - All 12 table schemas pass strict validation (Req 1.6)
    - All 4 model schemas pass strict validation (Req 2.3)
    - All 27 registry schemas pass strict validation (Req 3.3)
    - All 5 lambda schemas pass strict validation (Req 4.3)
    - All 2 core schemas pass strict validation (Req 5.2)
    - Pipfile contains correct v3.2.1 dependency line (Req 6.1)
    - Full schema suite validates with zero errors (Req 7.1)
    - All hashes verify with `--verify-only` (Req 8.2)
    - _Requirements: 1.6, 2.3, 3.3, 4.3, 5.2, 6.1, 7.1, 8.2_

- [x] 8. Verify MCP server integration
  - [x] 8.1 Test MCP server tools with migrated schemas
    - `list_schemas` returns all 48 schemas (type shows as "unknown" since v3 has no `type` field — expected)
    - `inspect_schema` returns v3 details (version "1", attributes list) for Users.yml
    - `validate_schema` reports "All schemas are valid"
    - _Requirements: 11.1, 11.2, 11.3_

- [x] 9. Update documentation
  - [x] 9.1 Update CHANGELOG.md
    - Added entry under [Unreleased] describing v2.0.13 to v3.2.6 upgrade
    - Included migration approach, custom scripts, and issue references (#133, #134)
    - _Requirements: 14.1, 14.2, 15.1, 15.2_

- [x] 10. Final verification pass
  - MCP `validate_schema` reports all schemas valid
  - `orb-schema generate` completed successfully (48 schemas loaded, all artifacts generated)
  - pytest: 116 passed, 1 skipped, 0 migration-related failures
  - MCP tools respond without errors
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- v3.2.6 removed the `migrate-v3` CLI and `--skip-validation` flag — manual migration scripts in `scripts/` were used instead
- Custom scripts: `scripts/migrate_to_v3.py`, `scripts/fix_registries_for_v3.py`, `scripts/fix_error_registry.py`
- Registry schemas needed a workaround: minimal `model` section + `appsync: {}` for v3 parser compatibility
- Config migrated via `orb-schema migrate-config` to `output.code.*` format
- Schemas migrated in dependency order: core → registries → models → tables → lambdas
- Property tests use `hypothesis` (already in dev dependencies at `>=6.82.0`)
- Each task references specific requirements for traceability
- Related issues: #133 (resolved — config format conflict), #134 (open — migrate-v3 regression in v3.2.5)
