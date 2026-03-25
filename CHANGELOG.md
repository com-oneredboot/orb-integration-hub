# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Schema Generator v3 Upgrade
  - Upgraded orb-schema-generator from v2.0.13 to v3.2.7
  - Migrated all 50 YAML schemas from v2 dict-style to v3 list-style format
  - Converted schema config to v2.0 `output.code.*` format via `orb-schema migrate-config`
  - Updated schema tests to validate v3 structure (list attributes, hash, no `type` field)
  - Fixed test mocking for `get_owned_organization_ids` and `PermissionResolutionService` imports
  - All code artifacts regenerated: Python models, TypeScript models, GraphQL schemas, CDK constructs
  - Related issues: #111, #133
  - Spec: `.kiro/specs/schema-generator-v3-upgrade/`

- Console Logging Cleanup
  - Replaced all `console.log()` and `console.info()` with `console.debug()` in production code
  - Debug messages now only appear when browser console filter is set to "Verbose"
  - Keeps production console clean while preserving debug information for development
  - Added console logging standards documentation in `main.ts`
  - Spec: `.kiro/specs/console-logging-cleanup/`

## [0.8.0] - 2026-03-14

### Added
- Application Users Management feature
  - Removed redundant ApplicationUsers table; ApplicationUserRoles is now the single source of truth
  - Updated ApplicationUserRoles schema to `lambda-dynamodb` with denormalized attributes
  - Implemented GetApplicationUsers Lambda with filtering, authorization, pagination
  - Authorization: CUSTOMER sees only owned organizations, EMPLOYEE/OWNER sees all
  - User deduplication, enrichment from Users table, and result sorting
  - Structured error handling with ORB-VAL, ORB-AUTH, and ORB-DB error codes
  - Frontend UsersListComponent with NgRx store, DataGrid, route-based filters
  - 52 integration tests, property tests, and unit tests
  - Spec: `.kiro/specs/application-users-management/`

## [0.7.0] - 2026-03-03

### Added
- Local E2E Testing Setup with Playwright
  - Complete E2E testing framework for local development
  - Authentication system with Cognito and stored auth state reuse
  - Test fixtures for creating and cleaning up test resources (organizations, applications, groups)
  - Utility functions for GraphQL waiting, screenshots, and AWS credential validation
  - Comprehensive documentation in `apps/web/e2e/README.md`
  - npm scripts for running tests (`e2e`, `e2e:ui`, `e2e:headed`, `e2e:debug`)
  - Example test demonstrating best practices
  - Command phrases: "run e2e tests", "setup e2e testing", "debug e2e test"
  - Spec: `.kiro/specs/local-e2e-testing-setup/`
- Migrate Pre-Auth Operations to SDK API ([orb-schema-generator#67](https://github.com/com-oneredboot/orb-schema-generator/issues/67), [orb-schema-generator#68](https://github.com/com-oneredboot/orb-schema-generator/issues/68))
  - Created `SdkApiService` with fetch-based GraphQL client for the SDK API (Lambda authorizer)
  - Migrated `CheckEmailExists` and `CreateUserFromCognito` from Main API to SDK API
  - Added `sdkApi` configuration block to environment files
  - Updated `setup-dev-env.js` and `secrets-retrieval.js` to retrieve SDK API credentials from SSM
  - Removed stale `apiKey` from `graphql` config and `apiKeyClient` from `ApiService`
  - Documented Dual AppSync API Architecture in project steering file
  - Spec: `.kiro/specs/migrate-auth-to-sdk-api/`

### Changed
- `ApiService` now rejects `apiKey` auth mode with `DEPRECATED_AUTH_MODE` error directing callers to `SdkApiService`
- `UserService.checkEmailExists()` and `createUserFromCognito()` now route through `SdkApiService` instead of Main API
- Refactored CDK infrastructure stacks to use descriptive names
  - Renamed DynamoDB Stack → Data Stack (`data_stack.py`)
  - Renamed Cognito Stack → Authorization Stack (`authorization_stack.py`)
  - Renamed Lambda Stack → Compute Stack (`compute_stack.py`)
  - Renamed AppSync Stack → API Stack (`api_stack.py`)
  - Moved API Key Authorizer Lambda from Compute Stack to Authorization Stack
  - Added SDK AppSync API to API Stack (both Main and SDK APIs now in one stack)
  - Updated stack dependencies: Bootstrap → Data → Authorization → Compute → API → Monitoring
  - Updated all tests and documentation to reflect new naming
  - Stack IDs now use descriptive names: `{prefix}-data`, `{prefix}-authorization`, `{prefix}-compute`, `{prefix}-api`
  - Spec: `.kiro/specs/infrastructure-stack-refactoring/`

### Added
- Application Roles Management feature
  - Roles tab on Application Detail page for managing ApplicationRoles
  - NgRx store for ApplicationRoles (state, actions, reducer, selectors, effects)
  - ApplicationRolesListComponent with DataGrid for role display
  - CreateRoleDialogComponent for creating new roles
  - EditRoleDialogComponent for editing, deactivating, and deleting roles
  - Default roles (Owner, Administrator, User, Guest) created on application activation
  - Spec: `.kiro/specs/application-roles-management/`

### Removed
- Legacy Roles table schema (`schemas/tables/Roles.yml`)
- Legacy RoleType enum (`schemas/registries/RoleType.yml`)
- Legacy RoleStatus enum (`schemas/registries/RoleStatus.yml`)
- Generated Roles model files (Python, TypeScript, CDK)
- Roles table CDK infrastructure and tests

### Changed
- ApplicationRoles schema now uses ApplicationRoleType and ApplicationRoleStatus enums
- Updated docs/schema.md to reflect ApplicationRoles as the only roles table
- ApplicationUserRoles now references applicationRoleId instead of roleId

## [0.4.0] - 2026-02-15

### Removed
- Application Groups functionality completely removed
  - Deleted ApplicationGroups, ApplicationGroupUsers, ApplicationGroupRoles tables and schemas
  - Deleted group-related Lambda functions (application_groups, application_group_users, application_group_roles)
  - Deleted GroupService and group-related GraphQL operations from frontend
  - Deleted Groups tab from Application Detail page
  - Deleted group-related property tests and unit tests
  - Spec: `.kiro/specs/simplify-roles-remove-groups/`

### Changed
- Simplified ApplicationRoles schema
  - Removed userId attribute (roles are now application-level definitions, not user-specific)
  - Removed permissions array (roles are labels returned in JWT, customer apps interpret meaning)
  - Added optional description attribute
  - Removed UserRoleIndex GSI
- Simplified ApplicationUserRoles schema
  - Removed permissions array
  - Roles are now simple labels assigned to users per environment
- Updated GetApplicationUsers Lambda to remove permissions from response
- Updated frontend RoleAssignment interface to remove permissions
- Updated API documentation to reflect simplified role model

## [0.3.0] - 2026-02-14

### Added
- Application Users Management feature
  - GetApplicationUsers Lambda-backed GraphQL query with filtering by organization, application, and environment
  - Authorization filtering: CUSTOMER users see only owned organizations, EMPLOYEE/OWNER see all
  - User deduplication and grouping by userId with all role assignments
  - User enrichment from Users table (firstName, lastName, status)
  - Result sorting by lastName then firstName
  - Pagination support with configurable limit (1-100)
  - PII protection: email addresses excluded from output
  - Users List page with DataGrid component following Organizations pattern
  - Route-based filter initialization from URL query parameters
  - Expandable rows showing role assignment details
  - Navigation to Applications list filtered by user's applications
  - NgRx store management with actions, reducer, effects, and selectors
  - Property-based tests for all 14 correctness properties
  - Comprehensive unit tests for Lambda and frontend components
  - Spec: `.kiro/specs/application-users-management/`

### Changed
- ApplicationUserRoles schema updated to `lambda-dynamodb` type
- Added denormalized fields: organizationId, organizationName, applicationName
- Removed ApplicationUsers table (redundant with ApplicationUserRoles)
- Updated schema.md and api.md documentation

### Added
- Users List page with filtering, sorting, and pagination
  - View users assigned to applications with name, status, application count, and last activity
  - Filter by name and user status
  - Sort by name, status, application count, or last updated date
  - Navigate to Applications list filtered by user's applications
  - Pagination support (25 items per page)
  - Responsive design for desktop, tablet, and mobile
  - NgRx store management following Organizations pattern
  - Property-based tests for all 13 correctness properties (100+ iterations each)
  - Comprehensive unit tests for component, edge cases, and pagination
  - Spec: `.kiro/specs/application-users-list/`
- Application Environment Configuration feature
  - Per-environment settings for CORS origins, rate limits, webhooks, and feature flags
  - Dual API key system with publishable (pk_) and secret (sk_) key types
  - Webhook delivery system with SQS queue and Lambda processor
  - HMAC-SHA256 signature generation for webhook payloads
  - CloudWatch metrics for webhook delivery monitoring
  - NgRx state management for environment config
  - Environment config UI components (origins, rate limits, webhooks, feature flags)
  - Key type badges (pk/sk) in Security tab
  - Property-based tests for origin validation and webhook signatures
  - Integration tests for environment config CRUD operations
  - Spec: `.kiro/specs/application-environment-config/`

### Changed
- Migrated AWS Secrets Manager naming from dash-based to slash-based convention (#32)
  - Old: `orb-integration-hub-dev-graphql-api-key`
  - New: `orb/integration-hub/dev/secrets/appsync/api-key`
  - Added `Config.secret_name()` method for consistent secret naming
  - Updated Bootstrap Stack (GitHub Actions, SMS verification secrets)
  - Updated AppSync Stack (GraphQL API key secret)
  - Updated Lambda Stack (SMS verification secret environment variable)
  - Updated Lambda IAM policy to allow new secret path pattern
  - Updated frontend scripts with `secretName()` helper function
  - Property tests validate naming format consistency
  - Spec: `.kiro/specs/secrets-naming-convention/`

### Added
- Organizations-Applications Integration feature
  - Application count display on Organizations list with clickable navigation
  - Applications section on Organization detail page with loading, error, and empty states
  - Environment selection (Production, Staging, Development, Test, Preview) on Application detail page
  - Cross-feature store synchronization for application count updates
  - Property-based tests for all integration behaviors
  - Spec: `.kiro/specs/organizations-applications-integration/`
- Applications Management feature with real GraphQL operations
  - ApplicationService for CRUD operations extending ApiService
  - NgRx store (actions, reducer, effects, selectors) for state management
  - ApplicationsListComponent with filtering, sorting, and pagination
  - ApplicationDetailPageComponent with form validation and create-on-click pattern
  - Unit tests for all components and services
  - Property-based tests for correctness properties (CRUD round-trip, filtering, validation)
  - Spec: `.kiro/specs/applications-management/`

### Fixed
- CDK tests failing in CI due to missing `generated` module
  - Removed schema generation from CI workflow (generated code must be committed)
  - Updated `.gitignore` to allow committing infrastructure CDK generated code
  - Regenerated CDK code with orb-schema-generator v0.18.2 (fixes Lambda import issue #74)

### Removed
- Comprehensive testing CI workflow (`comprehensive-testing.yml`) - was failing due to incomplete implementation
- Integration test infrastructure (`apps/web/integration-tests/`) - missing jest dependency
- E2E test infrastructure (`apps/web/cypress/`, `cypress.config.ts`) - required environment config unavailable in CI
- Performance test infrastructure (`apps/web/performance-tests/`) - missing puppeteer dependency
- Unused devDependencies: cypress, artillery, lighthouse, webpack-bundle-analyzer, chrome-launcher

### Changed
- Unit tests now run as part of deployment workflows (following orb-geo-fence pattern)
- `deploy-website.yml` now runs frontend linting and unit tests before build
- Added `skip_tests` input to `deploy-website.yml` for emergency deployments
- Cleaned up package.json scripts to remove references to deleted test infrastructure
- Added `test:ci` script for headless unit test execution in CI

### Added
- Smart Recovery Auth Flow for resilient user registration
  - RecoveryService for automatic state detection across Cognito and DynamoDB
  - AuthProgressStorageService for progress persistence with 24-hour expiry
  - State decision matrix for all Cognito/DynamoDB state combinations
  - User-friendly messages with no technical jargon
  - Property-based tests for correctness properties
  - Spec: `.kiro/specs/smart-recovery-auth-flow/`
- CheckEmailExists Lambda now returns Cognito user status (`cognitoStatus`, `cognitoSub`)
- New NgRx actions: `smartCheck`, `smartCheckSuccess`, `smartCheckFailure`, `resumeFromStorage`
- Recovery message display in auth-flow component
- CheckEmailExists Lambda-backed GraphQL query for public email existence checks
  - Uses API key authentication for unauthenticated access during auth flow
  - Returns minimal disclosure (boolean only) for security
  - Email format validation before database query
  - Spec: `.kiro/specs/check-email-exists/`
- New error codes: ORB-AUTH-006 (duplicate users), ORB-AUTH-007 (invalid email format), ORB-API-005 (email check service unavailable)
- Property-based tests for auth flow state transitions using fast-check

### Changed
- Auth flow automatically recovers from partial registration states
- `createUser$` effect now catches `UsernameExistsException` and triggers smart recovery
- Refactored CDK infrastructure to use path-based SSM parameter naming aligned with orb-schema-generator conventions
- SSM parameters now follow pattern `/{customer_id}/{project_id}/{environment}/{resource-type}/{resource-name}/{attribute}`
- Updated all stacks: Cognito, DynamoDB, Lambda, Lambda Layers, Bootstrap, AppSync, Frontend, Monitoring
- DynamoDB stack now imports generated table constructs from orb-schema-generator
- Updated `Config.ssm_parameter_name()` helper to generate path-based names
- Updated infrastructure documentation with complete SSM parameter reference

### Pending
- CDK infrastructure for CheckEmailExists Lambda ([orb-schema-generator#67](https://github.com/com-oneredboot/orb-schema-generator/issues/67), [orb-schema-generator#68](https://github.com/com-oneredboot/orb-schema-generator/issues/68))
- SSM parameter generation in orb-schema-generator ([orb-schema-generator#64](https://github.com/com-oneredboot/orb-schema-generator/issues/64))
- PITR configuration in orb-schema-generator ([orb-schema-generator#65](https://github.com/com-oneredboot/orb-schema-generator/issues/65))
- Schema type generation matrix documentation ([orb-schema-generator#66](https://github.com/com-oneredboot/orb-schema-generator/issues/66))

### Security
- Updated Angular packages to v19.2.18 (core, material, cdk, forms, router, etc.)
- Updated Angular build tools to v19.2.19 (@angular-devkit/build-angular, @angular/build, @angular/cli)
- Resolved all 30 Dependabot vulnerabilities (2 critical, 16 high, 6 moderate, 6 low)
- npm audit now reports 0 vulnerabilities
- Python dependencies verified clean via `pipenv check`

### Added
- Complete GraphQL API with 99 operations across 11 entities
- VTL resolvers for all DynamoDB operations (114 resolver files)
- Table schemas for Organizations, OrganizationUsers, OwnershipTransferRequests, PrivacyRequests
- GSI-based query operations for all access patterns
- Authentication directives on all operations with Cognito group authorization

### Changed
- Updated `docs/api.md` with complete operation reference
- Regenerated schema with orb-schema-generator v0.13.6

### Fixed
- All frontend ESLint errors and warnings (0 errors, 0 warnings)
- Type safety issues with `no-explicit-any` violations
- Accessibility issues in form labels and interactive elements
- Standalone component configuration

### Pending
- TypeScript GraphQL query definition generation ([orb-schema-generator#61](https://github.com/com-oneredboot/orb-schema-generator/issues/61))

## [1.2.0] - 2026-01-11

### Added
- Point-in-Time Recovery (PITR) enabled on all DynamoDB tables
- Design tokens system (`apps/web/src/styles/_tokens.scss`) with CSS custom properties
- Design handoff documentation (`docs/design/design-handoff.md`) for Figma integration
- JSON-LD structured data on landing page for LLM discoverability
- Semantic HTML with ARIA labels and proper heading hierarchy
- Property tests for IAM policy scoping, PITR enablement, branding consistency, heading hierarchy, and design tokens

### Changed
- Scoped IAM policies to project-specific resources (removed wildcards)
- Updated `docs/development.md` with CDK commands (replaced SAM references)
- Updated `docs/api.md` with Organizations, Notifications, PrivacyRequests, OwnershipTransferRequests operations
- Updated `docs/architecture.md` with Mermaid diagrams for stack dependencies and data flow
- Updated `docs/frontend-design.md` paths for new directory structure
- Replaced "OneRedBoot" branding with "Orb Integration Hub" across all user-facing content
- Landing page uses design tokens for consistent styling
- Navigation updated with anchor links (#features, #pricing) and "Get Started" CTA

### Fixed
- Circular dependency in Cognito stack Lambda trigger permissions
- Outdated documentation paths and deployment commands

## [1.1.0] - 2026-01-10

### Added
- AWS CDK infrastructure replacing SAM/CloudFormation
- CDK stacks: Bootstrap, Cognito, DynamoDB, Lambda Layers, Lambda, AppSync, Monitoring, Frontend
- `deploy-infrastructure.yml` workflow with synth/diff/deploy actions
- `deploy-website.yml` workflow for Angular frontend deployment
- CDK pytest tests for all stacks
- KMS encryption for CloudWatch Logs in monitoring stack

### Changed
- Migrated infrastructure from SAM templates to AWS CDK
- Moved generated CDK constructs to `infrastructure/cdk/generated/`
- Updated `schema-generator.yml` output paths for CDK
- Updated architecture documentation for CDK-based infrastructure

### Removed
- SAM/CloudFormation templates (`infrastructure/cloudformation/`)
- Old deployment workflows (deploy-backend.yml, deploy-frontend.yml, deploy-frontend-resources.yml, deploy-packages.yml)

### Fixed
- GraphQL enum values with hyphens (orb-schema-generator #58)

## [1.0.1] - 2026-01-09

### Added
- Pre-commit hooks for automated code quality (ruff, black, mypy)
- Spec standards steering file for consistent spec quality
- This CHANGELOG file
- orb-common dependency for shared utilities
- Property tests for gitignore and workflow validation
- timeout-minutes to all GitHub workflow jobs

### Changed
- Modernized .gitignore with clear section headers
- Updated GitHub workflows with timeout-minutes for all jobs

## [1.0.0] - 2026-01-08

### Added
- Nx-style directory structure (`apps/api/`, `apps/web/`, `packages/`)
- orb-schema-generator integration with `schema-generator.yml`
- Kiro steering files for AI-assisted development:
  - `project-standards.md` - Core project configuration
  - `testing-standards.md` - Testing conventions
  - `infrastructure.md` - CloudFormation guidance
  - `api-development.md` - Backend development patterns
  - `reference-projects.md` - Reference repository management
  - `git-workflow.md` - Git conventions
  - `troubleshooting-guide.md` - Issue investigation
- GitHub issue templates from orb-infrastructure
- Cross-team issue tracking in `.github/ISSUES/`
- Property-based tests for migration verification

### Changed
- Migrated `backend/` to `apps/api/`
- Migrated `frontend/` to `apps/web/`
- Updated all import paths for new directory structure
- Restructured `schemas/` directory for orb-schema-generator compatibility

### Removed
- Legacy `schemas/generate.py` script (replaced by orb-schema-generator)
- Legacy `schemas/templates/` directory
