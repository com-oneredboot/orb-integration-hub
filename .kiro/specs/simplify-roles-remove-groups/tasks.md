# Implementation Plan: Simplify Roles and Remove Groups

## Overview

This implementation plan removes unused groups functionality and simplifies the application roles model by removing permissions arrays. The work is organized into phases: schema cleanup, schema modification, code regeneration, Lambda updates, frontend updates, test updates, and final verification.

## Tasks

- [x] 1. Delete group-related schema files
  - [x] 1.1 Delete group table schemas
    - Delete `schemas/tables/ApplicationGroups.yml`
    - Delete `schemas/tables/ApplicationGroupUsers.yml`
    - Delete `schemas/tables/ApplicationGroupRoles.yml`
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 1.2 Delete group status registry schemas
    - Delete `schemas/registries/ApplicationGroupStatus.yml`
    - Delete `schemas/registries/ApplicationGroupUserStatus.yml`
    - Delete `schemas/registries/ApplicationGroupRoleStatus.yml`
    - _Requirements: 1.4, 1.5, 1.6_

- [x] 2. Simplify ApplicationRoles schema
  - [x] 2.1 Update ApplicationRoles.yml
    - Remove `userId` attribute
    - Remove `permissions` array attribute
    - Remove `UserRoleIndex` GSI (references userId)
    - Add optional `description` attribute
    - Update version number
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Simplify ApplicationUserRoles schema
  - [x] 3.1 Update ApplicationUserRoles.yml
    - Remove `permissions` array attribute
    - Update version number
    - Verify all other attributes retained
    - _Requirements: 3.1, 3.2_

- [x] 4. Regenerate code from schemas
  - [x] 4.1 Run schema generator
    - Run `pipenv run orb-schema generate`
    - Verify no errors during generation
    - _Requirements: 6.1_
  
  - [x] 4.2 Verify generated Python models
    - Check `apps/api/models/ApplicationRolesModel.py` has no permissions/userId
    - Check `apps/api/models/ApplicationUserRolesModel.py` has no permissions
    - Verify no group-related model files exist
    - _Requirements: 6.2_
  
  - [x] 4.3 Verify generated TypeScript models
    - Check `apps/web/src/app/core/models/ApplicationRolesModel.ts` has no permissions/userId
    - Check `apps/web/src/app/core/models/ApplicationUserRolesModel.ts` has no permissions
    - Verify no group-related model files exist
    - _Requirements: 6.3_
  
  - [x] 4.4 Verify generated CDK constructs
    - Check `infrastructure/cdk/generated/` has no group table constructs
    - Verify ApplicationRoles table has no UserRoleIndex GSI
    - _Requirements: 6.4_

- [x] 5. Checkpoint - Verify schema changes
  - Ensure schema generator completed successfully
  - Ensure all generated files are correct
  - Ask the user if questions arise

- [x] 6. Update GetApplicationUsers Lambda
  - [x] 6.1 Update Lambda dataclasses
    - Remove `permissions` from `RoleAssignment` dataclass in `apps/api/lambdas/get_application_users/index.py`
    - _Requirements: 4.1_
  
  - [x] 6.2 Update response building
    - Remove `permissions` from `build_users_with_roles()` function
    - Remove `permissions` from response dict in `lambda_handler()`
    - _Requirements: 4.1, 4.3_

- [x] 7. Update frontend GraphQL query
  - [x] 7.1 Update GetApplicationUsers.graphql.ts
    - Remove `permissions` from GraphQL query string
    - Remove `permissions` from `RoleAssignment` interface
    - File: `apps/web/src/app/core/graphql/GetApplicationUsers.graphql.ts`
    - _Requirements: 5.1_

- [x] 8. Update Lambda schema
  - [x] 8.1 Update GetApplicationUsers Lambda schema
    - Check if `schemas/lambdas/GetApplicationUsers.yml` references permissions
    - Update if necessary
    - _Requirements: 4.1_

- [x] 9. Delete group-related test files
  - [x] 9.1 Delete property test files for groups
    - Delete `apps/api/tests/property/test_application_group_role_environment_property.py`
    - Delete `apps/api/tests/property/test_permission_union_property.py`
    - _Requirements: 4.2_

- [x] 10. Update remaining test files
  - [x] 10.1 Update schema test file
    - Update `apps/api/tests/schemas/test_application_user_roles_schema.py`
    - Remove `permissions` from expected attributes list
    - _Requirements: 4.3_
  
  - [x] 10.2 Update GetApplicationUsers unit tests
    - Update `apps/api/lambdas/get_application_users/test_get_application_users.py`
    - Remove `permissions` from test data and assertions
    - _Requirements: 4.3_
  
  - [x] 10.3 Update GetApplicationUsers property tests
    - Update `apps/api/lambdas/get_application_users/test_get_application_users_property.py`
    - Remove `permissions` from test data generators
    - _Requirements: 4.3_
  
  - [x] 10.4 Update application count aggregation tests
    - Update `apps/api/tests/property/test_application_count_aggregation_property.py`
    - Remove `permissions` from test data
    - _Requirements: 4.3_

- [x] 11. Update frontend services
  - [x] 11.1 Update group service if it exists
    - Check `apps/web/src/app/core/services/group.service.ts` for permissions references
    - Remove or update as needed
    - _Requirements: 5.2_

- [x] 12. Checkpoint - Run all tests
  - Run `cd apps/api && pipenv run pytest`
  - Run `cd apps/web && npm test`
  - Ensure all tests pass
  - Ask the user if questions arise

- [x] 13. Run linting and type checking
  - [x] 13.1 Run Python checks
    - Run `cd apps/api && pipenv run ruff check .`
    - Run `cd apps/api && pipenv run mypy src/`
    - Fix any errors
    - _Requirements: 10.2, 10.3_
  
  - [x] 13.2 Run TypeScript checks
    - Run `cd apps/web && npm run lint`
    - Run `cd apps/web && npm run typecheck`
    - Fix any errors
    - _Requirements: 10.2, 10.3_

- [x] 14. Update documentation
  - [x] 14.1 Update API documentation
    - Update `docs/api.md` to remove permissions from ApplicationUserRoles
    - Update any references to groups
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [x] 14.2 Update user management documentation
    - Update `docs/user-management-views.md` if it references permissions or groups
    - _Requirements: 7.1_

- [x] 15. Update version and changelog
  - [x] 15.1 Bump version
    - Update version in appropriate config file
    - _Requirements: 8.1_
  
  - [x] 15.2 Update CHANGELOG.md
    - Add entry describing the simplified roles model
    - Include issue number if applicable
    - _Requirements: 8.2, 8.3_

- [x] 16. Final verification
  - [x] 16.1 Run all checks
    - Run schema generator: `pipenv run orb-schema generate`
    - Run Python tests: `cd apps/api && pipenv run pytest`
    - Run frontend tests: `cd apps/web && npm test`
    - Run linting: `cd apps/api && pipenv run ruff check .` and `cd apps/web && npm run lint`
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [x] 16.2 Verify no remaining references
    - Grep for `ApplicationGroup` in codebase
    - Grep for `permissions` in Lambda and frontend code
    - Ensure no stale references remain
    - _Requirements: 4.2, 4.3, 5.2_

- [x] 17. Final checkpoint
  - Ensure all tests pass
  - Ensure no linting errors
  - Ensure no compilation errors
  - Ask the user if questions arise

## Notes

- Tasks are ordered to minimize build failures (delete schemas first, then regenerate)
- Checkpoints at tasks 5, 12, and 17 allow verification before proceeding
- Generated files (models, GraphQL, CDK) are auto-updated by schema generator
- Manual updates needed for Lambda code, frontend GraphQL query, and tests
- The GetApplicationUsers.graphql.ts file is manually maintained (not auto-generated)
