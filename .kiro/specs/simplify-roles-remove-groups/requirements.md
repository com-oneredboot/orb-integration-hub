# Requirements Document

## Introduction

This feature simplifies the application roles model by removing the unused groups functionality and eliminating the permissions arrays from role tables. The goal is to create a cleaner data model where:

- Platform Roles (OWNER, EMPLOYEE, CUSTOMER, USER) remain in Cognito groups and the Users table
- Application Roles become simple labels that customers define for their apps (e.g., "Admin", "Editor", "Viewer")
- Role labels are returned in JWTs when users log into customer applications
- Customer applications interpret what each role label means - orb-integration-hub doesn't enforce permissions

## Glossary

- **Platform_Roles**: Cognito groups (OWNER, EMPLOYEE, CUSTOMER, USER) that define user access within the orb-integration-hub platform itself
- **Application_Roles**: Simple role labels that customers define for their own applications
- **ApplicationRoles_Table**: DynamoDB table storing role definitions per application
- **ApplicationUserRoles_Table**: DynamoDB table storing role assignments to users per environment
- **Group_Tables**: The three tables being removed: ApplicationGroups, ApplicationGroupUsers, ApplicationGroupRoles
- **Schema_Generator**: The orb-schema-generator tool that generates code from YAML schemas
- **JWT**: JSON Web Token containing user identity and role information

## Requirements

### Requirement 1: Remove Group Tables

**User Story:** As a developer, I want to remove the unused group tables, so that the data model is simpler and easier to maintain.

#### Acceptance Criteria

1. WHEN the schema files are updated, THE System SHALL delete the ApplicationGroups.yml schema file from schemas/tables/
2. WHEN the schema files are updated, THE System SHALL delete the ApplicationGroupUsers.yml schema file from schemas/tables/
3. WHEN the schema files are updated, THE System SHALL delete the ApplicationGroupRoles.yml schema file from schemas/tables/
4. WHEN the schema files are updated, THE System SHALL delete the ApplicationGroupStatus.yml registry file from schemas/registries/
5. WHEN the schema files are updated, THE System SHALL delete the ApplicationGroupUserStatus.yml registry file from schemas/registries/
6. WHEN the schema files are updated, THE System SHALL delete the ApplicationGroupRoleStatus.yml registry file from schemas/registries/

### Requirement 2: Simplify ApplicationRoles Schema

**User Story:** As a developer, I want to simplify the ApplicationRoles table to only store role definitions, so that the schema reflects its actual purpose as a role label registry.

#### Acceptance Criteria

1. WHEN the ApplicationRoles schema is updated, THE System SHALL remove the permissions array attribute
2. WHEN the ApplicationRoles schema is updated, THE System SHALL remove the userId attribute since this table defines roles, not assigns them
3. WHEN the ApplicationRoles schema is updated, THE System SHALL remove the UserRoleIndex GSI that references userId
4. WHEN the ApplicationRoles schema is updated, THE System SHALL retain applicationRoleId, applicationId, roleId, roleName, roleType, status, createdAt, and updatedAt attributes
5. WHEN the ApplicationRoles schema is updated, THE System SHALL add an optional description attribute for role documentation

### Requirement 3: Simplify ApplicationUserRoles Schema

**User Story:** As a developer, I want to simplify the ApplicationUserRoles table by removing permissions, so that role assignments are just references to role labels.

#### Acceptance Criteria

1. WHEN the ApplicationUserRoles schema is updated, THE System SHALL remove the permissions array attribute
2. WHEN the ApplicationUserRoles schema is updated, THE System SHALL retain all other attributes including denormalized fields for filtering and display

### Requirement 4: Update Backend Lambda Code

**User Story:** As a developer, I want to update Lambda functions to not reference permissions or groups, so that the code matches the simplified data model.

#### Acceptance Criteria

1. WHEN the GetApplicationUsers Lambda is updated, THE System SHALL not return permissions in the response
2. WHEN any Lambda code references group tables, THE System SHALL remove those references
3. WHEN any Lambda code references permissions arrays, THE System SHALL remove those references

### Requirement 5: Update Frontend Code

**User Story:** As a developer, I want to update the frontend to not display permissions, so that the UI matches the simplified data model.

#### Acceptance Criteria

1. WHEN the frontend displays application user roles, THE System SHALL not display permissions
2. WHEN the frontend has components referencing groups, THE System SHALL remove those references

### Requirement 6: Regenerate Code

**User Story:** As a developer, I want to regenerate all code after schema changes, so that the generated models, resolvers, and types are consistent with the updated schemas.

#### Acceptance Criteria

1. WHEN schema changes are complete, THE System SHALL run the schema generator to regenerate all code
2. WHEN code is regenerated, THE System SHALL verify that no compilation errors exist in generated Python models
3. WHEN code is regenerated, THE System SHALL verify that no compilation errors exist in generated TypeScript models
4. WHEN code is regenerated, THE System SHALL verify that no compilation errors exist in generated CDK constructs

### Requirement 7: Documentation Updates

**User Story:** As a developer, I want documentation updated to reflect the simplified roles model, so that future developers understand the design.

#### Acceptance Criteria

1. WHEN documentation is updated, THE System SHALL update relevant architecture documentation to describe the simplified roles model
2. WHEN documentation is updated, THE System SHALL ensure no duplication exists across documentation files
3. WHEN documentation is updated, THE System SHALL use consistent terminology throughout

### Requirement 8: Version and Changelog Management

**User Story:** As a developer, I want version and changelog properly updated, so that the changes are tracked.

#### Acceptance Criteria

1. WHEN the feature is complete, THE System SHALL bump the version following semantic versioning
2. WHEN the feature is complete, THE System SHALL update CHANGELOG.md with a description of the changes
3. WHEN the changelog is updated, THE System SHALL include issue numbers if applicable

### Requirement 9: Git Commit Standards

**User Story:** As a developer, I want commits to follow standards, so that the git history is clean and traceable.

#### Acceptance Criteria

1. WHEN commits are made, THE System SHALL reference issue numbers in commit messages
2. WHEN commits are made, THE System SHALL follow conventional commits format

### Requirement 10: Final Verification

**User Story:** As a developer, I want all tests to pass and no errors to exist, so that the changes are production-ready.

#### Acceptance Criteria

1. WHEN verification is performed, THE System SHALL ensure all unit tests pass
2. WHEN verification is performed, THE System SHALL ensure no linting errors exist
3. WHEN verification is performed, THE System SHALL ensure no compilation errors exist
4. WHEN verification is performed, THE System SHALL ensure documentation renders correctly
