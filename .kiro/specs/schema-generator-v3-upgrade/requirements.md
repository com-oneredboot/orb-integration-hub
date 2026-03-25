# Requirements Document

## Introduction

Upgrade orb-schema-generator from v2.0.13 to v3.2.1 in the orb-integration-hub project. This is a breaking-change upgrade that requires migrating all 48 YAML schemas from v2.x format to v3.0.0 format, updating the Pipfile dependency, verifying the dual-API architecture (main-api + sdk-api) continues to function, and ensuring the MCP server integration works with the new v3 schemas. The v3 format introduces separation of data models from persistence configurations, a common type system, hash-based integrity verification, and target inference from configuration sections.

## Glossary

- **Schema_Generator**: The orb-schema-generator tool (Python package) that reads YAML schema definitions and generates Python models, TypeScript models, GraphQL schemas, VTL resolvers, and CDK constructs.
- **Migration_Tool**: The `orb-schema migrate-v3` CLI command that converts v2.x schemas to v3.0.0 format automatically.
- **Rehash_Tool**: The `orb-schema rehash` CLI command that computes and updates SHA-256 hash fields in v3 schemas.
- **Validation_Tool**: The `orb-schema validate-v3` CLI command that validates v3 schemas against format and integrity rules.
- **V2_Schema**: A YAML schema file in v2.x format with `type`, `targets`, and flat `model.attributes` structure.
- **V3_Schema**: A YAML schema file in v3.0.0 format with `version`, `hash`, `model` section, and separate configuration sections (dynamodb, appsync, lambda, etc.).
- **MCP_Server**: The Model Context Protocol server provided by orb-schema-generator v3.2.1, exposing tools (list_schemas, inspect_schema, validate_schema, generate_from_schema) for IDE integration.
- **Main_API**: The primary AppSync GraphQL API using Cognito user pool authentication, serving all 12 DynamoDB tables and all operations.
- **SDK_API**: The secondary AppSync GraphQL API using Lambda authorizer authentication, serving the Users table with limited operations (CheckEmailExists, CreateUserFromCognito, GetApplicationUsers).
- **Pipfile**: The Python dependency manifest at `apps/api/Pipfile` that pins the orb-schema-generator version.
- **CodeArtifact**: The AWS CodeArtifact private PyPI repository hosting orb-schema-generator packages.
- **Schema_Config**: The `schema-generator.yml` configuration file defining project settings, paths, output targets, and API endpoint definitions.
- **Table_Schema**: A schema in `schemas/tables/` defining a DynamoDB table with keys, indexes, stream config, and auth config.
- **Model_Schema**: A schema in `schemas/models/` defining a standard GraphQL type without database persistence.
- **Registry_Schema**: A schema in `schemas/registries/` defining an enum/registry type with named values.
- **Lambda_Schema**: A schema in `schemas/lambdas/` defining a Lambda resolver operation (query or mutation).
- **Core_Schema**: A schema in `schemas/core/` defining shared types and validators.

## Requirements

### Requirement 1: Migrate Table Schemas to v3 Format

**User Story:** As a developer, I want all 12 DynamoDB table schemas migrated to v3 format, so that they use the new model/configuration separation and common type system.

#### Acceptance Criteria

1. WHEN the Migration_Tool processes a Table_Schema, THE Migration_Tool SHALL add `version: "1"` and a valid `hash` field to the migrated file.
2. WHEN the Migration_Tool processes a Table_Schema, THE Migration_Tool SHALL move attribute definitions into a `model.attributes` section using the common type system.
3. WHEN the Migration_Tool processes a Table_Schema with `type: dynamodb`, THE Migration_Tool SHALL create a `dynamodb` configuration section containing partition_key, sort_key, GSI, LSI, stream, and pitr_enabled settings extracted from the v2.x `model.keys` and `model.stream` sections.
4. WHEN the Migration_Tool processes a Table_Schema with AppSync auth configuration, THE Migration_Tool SHALL create an `appsync` configuration section containing the auth_config settings extracted from the v2.x `model.authConfig` section.
5. WHEN the Migration_Tool processes a Table_Schema, THE Migration_Tool SHALL remove the v2.x `type`, `targets`, and flat key/stream structures that are replaced by v3 configuration sections.
6. THE Validation_Tool SHALL confirm all 12 migrated Table_Schemas pass `orb-schema validate-v3 schemas/tables/ --strict` with zero errors.

### Requirement 2: Migrate Model Schemas to v3 Format

**User Story:** As a developer, I want all 4 standard model schemas migrated to v3 format, so that they conform to the new schema structure.

#### Acceptance Criteria

1. WHEN the Migration_Tool processes a Model_Schema with `type: standard`, THE Migration_Tool SHALL convert it to v3 format with `version: "1"`, `hash`, and a `model.attributes` section.
2. WHEN the Migration_Tool processes a Model_Schema, THE Migration_Tool SHALL create an `appsync` configuration section since these models are used in GraphQL types.
3. THE Validation_Tool SHALL confirm all 4 migrated Model_Schemas pass `orb-schema validate-v3 schemas/models/ --strict` with zero errors.

### Requirement 3: Migrate Registry Schemas to v3 Format

**User Story:** As a developer, I want all 27 registry/enum schemas migrated to v3 format, so that they use the new schema structure while preserving all enum values.

#### Acceptance Criteria

1. WHEN the Migration_Tool processes a Registry_Schema with `type: registry`, THE Migration_Tool SHALL convert it to v3 format with `version: "1"` and `hash` fields.
2. WHEN the Migration_Tool processes a Registry_Schema, THE Migration_Tool SHALL preserve all enum items with their values and descriptions unchanged.
3. THE Validation_Tool SHALL confirm all 27 migrated Registry_Schemas pass `orb-schema validate-v3 schemas/registries/ --strict` with zero errors.

### Requirement 4: Migrate Lambda Schemas to v3 Format

**User Story:** As a developer, I want all 5 Lambda resolver schemas migrated to v3 format, so that they use the new lambda configuration section.

#### Acceptance Criteria

1. WHEN the Migration_Tool processes a Lambda_Schema with `type: lambda`, THE Migration_Tool SHALL convert it to v3 format with `version: "1"`, `hash`, a `model.attributes` section, and a `lambda` configuration section.
2. WHEN the Migration_Tool processes a Lambda_Schema, THE Migration_Tool SHALL preserve the operation type (query or mutation) in the `lambda` configuration section.
3. THE Validation_Tool SHALL confirm all 5 migrated Lambda_Schemas pass `orb-schema validate-v3 schemas/lambdas/ --strict` with zero errors.

### Requirement 5: Migrate Core Schemas to v3 Format

**User Story:** As a developer, I want the 2 core schemas (types and validators) migrated to v3 format, so that shared type definitions are compatible with v3.

#### Acceptance Criteria

1. WHEN the Migration_Tool processes a Core_Schema, THE Migration_Tool SHALL convert it to v3 format with `version: "1"` and `hash` fields.
2. THE Validation_Tool SHALL confirm all migrated Core_Schemas pass `orb-schema validate-v3 schemas/core/ --strict` with zero errors.

### Requirement 6: Update Pipfile Dependency

**User Story:** As a developer, I want the Pipfile updated to pin orb-schema-generator at v3.2.1 from CodeArtifact, so that the project uses the correct version.

#### Acceptance Criteria

1. THE Pipfile SHALL specify `orb-schema-generator = {version = "==3.2.1", index = "codeartifact"}` in the `[packages]` section.
2. WHEN `pipenv lock` is executed with a valid CODEARTIFACT_AUTH_TOKEN, THE Pipfile lock resolution SHALL complete without errors.
3. WHEN `pipenv run pip show orb-schema-generator` is executed, THE installed version SHALL report `3.2.1`.

### Requirement 7: Validate Full Schema Suite After Migration

**User Story:** As a developer, I want to validate all migrated schemas together, so that I can confirm cross-schema references and the complete schema suite are consistent.

#### Acceptance Criteria

1. WHEN `orb-schema validate-v3 schemas/ --strict` is executed against all migrated schemas, THE Validation_Tool SHALL report zero errors and zero warnings.
2. WHEN a V3_Schema references an enum_type (e.g., `UserStatus`), THE Validation_Tool SHALL confirm the referenced Registry_Schema exists and is valid.
3. WHEN a V3_Schema references another model type (e.g., `Users` in Auth.yml), THE Validation_Tool SHALL confirm the referenced schema exists and is valid.

### Requirement 8: Verify Hash Integrity for All Schemas

**User Story:** As a developer, I want all migrated schemas to have valid SHA-256 hashes, so that integrity verification works correctly.

#### Acceptance Criteria

1. THE Rehash_Tool SHALL compute and embed a valid SHA-256 hash in every migrated V3_Schema file.
2. WHEN `orb-schema rehash schemas/ --verify-only` is executed, THE Rehash_Tool SHALL report all hashes as valid with zero mismatches.

### Requirement 9: Regenerate All Code Artifacts

**User Story:** As a developer, I want to regenerate all code artifacts from the migrated v3 schemas, so that Python models, TypeScript models, GraphQL schemas, VTL resolvers, and CDK constructs are updated.

#### Acceptance Criteria

1. WHEN `orb-schema generate` is executed with v3 schemas, THE Schema_Generator SHALL produce Python models in `apps/api/models/` without errors.
2. WHEN `orb-schema generate` is executed with v3 schemas, THE Schema_Generator SHALL produce Python enums in `apps/api/enums/` without errors.
3. WHEN `orb-schema generate` is executed with v3 schemas, THE Schema_Generator SHALL produce the Main_API GraphQL schema at `apps/api/graphql/schema.graphql`.
4. WHEN `orb-schema generate` is executed with v3 schemas, THE Schema_Generator SHALL produce the SDK_API GraphQL schema at `apps/api/graphql-sdk/schema.graphql`.
5. WHEN `orb-schema generate` is executed with v3 schemas, THE Schema_Generator SHALL produce TypeScript models and enums in `apps/web/src/app/core/`.
6. WHEN `orb-schema generate` is executed with v3 schemas, THE Schema_Generator SHALL produce VTL resolvers and CDK constructs in `infrastructure/cdk/generated/`.

### Requirement 10: Preserve Dual-API Architecture

**User Story:** As a developer, I want the dual-API architecture (Main_API with Cognito auth and SDK_API with Lambda authorizer) to continue functioning after the v3 upgrade, so that both APIs serve their intended consumers.

#### Acceptance Criteria

1. WHEN code is generated from v3 schemas, THE Schema_Generator SHALL produce a Main_API GraphQL schema containing types and operations for all 12 DynamoDB tables.
2. WHEN code is generated from v3 schemas, THE Schema_Generator SHALL produce an SDK_API GraphQL schema containing types and operations limited to the Users table with only CheckEmailExists, CreateUserFromCognito, and GetApplicationUsers operations.
3. THE Schema_Config SHALL continue to define both `main-api` and `sdk-api` entries in the `api_definitions` section with their respective auth configurations.
4. WHILE v3 uses target inference from configuration sections, THE Schema_Config SHALL map inferred targets to the correct API endpoints as defined in `schema-generator.yml`.

### Requirement 11: Verify MCP Server Integration

**User Story:** As a developer, I want the MCP server tools (list_schemas, inspect_schema, validate_schema, generate_from_schema) to work with the migrated v3 schemas, so that IDE-assisted schema operations function correctly.

#### Acceptance Criteria

1. WHEN the MCP_Server `list_schemas` tool is invoked after migration, THE MCP_Server SHALL return a list of all schemas without errors.
2. WHEN the MCP_Server `inspect_schema` tool is invoked on a migrated V3_Schema, THE MCP_Server SHALL return the schema details including version, hash, model, and configuration sections.
3. WHEN the MCP_Server `validate_schema` tool is invoked on a migrated V3_Schema, THE MCP_Server SHALL report the schema as valid.
4. IF the MCP_Server `validate_schema` tool is invoked on a schema with an invalid hash, THEN THE MCP_Server SHALL report a hash verification error.

### Requirement 12: Verify Generated Code Compatibility

**User Story:** As a developer, I want the regenerated Python models and enums to remain import-compatible with existing Lambda handler code, so that no application code changes are required.

#### Acceptance Criteria

1. WHEN Python models are regenerated from v3 schemas, THE Schema_Generator SHALL produce models with the same class names, attribute names, and method signatures as the v2.x-generated models.
2. WHEN Python enums are regenerated from v3 schemas, THE Schema_Generator SHALL produce enums with the same class names and member values as the v2.x-generated enums.
3. WHEN `pipenv run pytest` is executed in `apps/api/`, THE test suite SHALL pass with zero failures attributable to schema migration changes.

### Requirement 13: Update schema-generator.yml for v3 Compatibility

**User Story:** As a developer, I want the schema-generator.yml configuration updated for v3 compatibility, so that the generator correctly processes v3 schemas with the existing output targets and API definitions.

#### Acceptance Criteria

1. THE Schema_Config SHALL be compatible with Schema_Generator v3.2.1 configuration format.
2. THE Schema_Config SHALL preserve all existing output target definitions (python-main, ts-main, graphql-main, graphql-sdk) and their base directories.
3. THE Schema_Config SHALL preserve both API endpoint definitions (main-api and sdk-api) with their auth configurations, table assignments, and operation filters.
4. IF Schema_Generator v3.2.1 requires new configuration fields or format changes in `schema-generator.yml`, THEN THE Schema_Config SHALL include those fields with appropriate values.

### Requirement 14: Documentation Updates

**User Story:** As a developer, I want the upgrade documented, so that the team understands what changed and how to work with v3 schemas going forward.

#### Acceptance Criteria

1. THE CHANGELOG.md SHALL include an entry describing the v2.0.13 to v3.2.1 upgrade with a summary of breaking changes and migration steps performed.
2. WHEN a developer reads the changelog entry, THE entry SHALL reference the migration guide at `repositories/orb-schema-generator/docs/migration-v3.md` for detailed v3 format documentation.

### Requirement 15: Version and Changelog Management

**User Story:** As a developer, I want version and changelog updates to follow semantic versioning and project conventions, so that the upgrade is properly tracked.

#### Acceptance Criteria

1. THE CHANGELOG.md SHALL follow the existing changelog format with date, summary, and changes sections.
2. THE CHANGELOG.md entry SHALL reference the relevant issue number in the format `(#issue)` if an issue exists.

### Requirement 16: Git Commit Standards

**User Story:** As a developer, I want commits for this upgrade to follow conventional commit format, so that the git history is consistent and traceable.

#### Acceptance Criteria

1. THE git commit messages SHALL follow conventional commits format (e.g., `feat: upgrade orb-schema-generator to v3.2.1`).
2. WHEN multiple issues are addressed, THE commit messages SHALL reference all relevant issue numbers.

### Requirement 17: Final Verification

**User Story:** As a developer, I want a final verification pass to confirm the entire upgrade is complete and correct, so that no regressions are introduced.

#### Acceptance Criteria

1. WHEN `orb-schema validate-v3 schemas/ --strict` is executed, THE Validation_Tool SHALL report zero errors.
2. WHEN `orb-schema rehash schemas/ --verify-only` is executed, THE Rehash_Tool SHALL report zero hash mismatches.
3. WHEN `orb-schema generate` is executed, THE Schema_Generator SHALL complete without errors.
4. WHEN `pipenv run pytest` is executed in `apps/api/`, THE test suite SHALL pass with zero failures.
5. WHEN the MCP_Server tools are invoked, THE MCP_Server SHALL respond without errors for all schema operations.
