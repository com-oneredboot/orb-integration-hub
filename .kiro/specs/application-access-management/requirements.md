# Requirements Document

## Introduction

This specification defines the Application Access Management system for orb-integration-hub. The system enables organizations to manage user access to their applications through groups and roles defined at the application level, with role assignments scoped per environment. This allows the same group structure across environments while varying permissions (e.g., "Developers" group has "Writer" role in DEV but "Reader" role in PROD).

The feature is divided into five phases:
1. Groups & Roles Foundation
2. Permission Resolution
3. API Key Management
4. Frontend Integration
5. SDK Package

## Glossary

- **Application**: A software project registered within an organization
- **Application_Group**: A named collection of users within an application (defined at application level, shared across environments)
- **Application_Group_User**: A user's membership in an application group (membership is application-wide)
- **Application_Group_Role**: The role assigned to a group for a specific environment (e.g., "Developers" → "Reader" in PROD)
- **Application_User_Role**: A direct role assignment to a user for a specific environment
- **Role**: A canonical definition of permissions (ADMIN, USER, GUEST, CUSTOM) defined at application level
- **Permission**: A specific action a user can perform (e.g., "read:users", "write:config")
- **Application_API_Key**: A secret token used to authenticate SDK/API requests for an application environment (distinct from AppSync API keys)
- **Environment**: A deployment context (PRODUCTION, STAGING, DEVELOPMENT, TEST, PREVIEW) - role assignments are scoped per environment
- **SDK**: Software Development Kit - an npm/PyPI package external teams use to integrate with the platform
- **Organization**: A business entity that owns applications and manages users

## Requirements

### Requirement 1: Application Group Management

**User Story:** As an application owner, I want to create and manage groups within my application, so that I can organize users into logical collections that persist across all environments.

#### Acceptance Criteria

1. WHEN an application owner creates a group, THE System SHALL create an ApplicationGroup record with a unique ID, name, and description at the application level
2. WHEN an application owner updates a group, THE System SHALL update the group's name or description
3. WHEN an application owner deletes a group, THE System SHALL mark the group as DELETED and remove all member and role associations
4. WHEN listing groups for an application, THE System SHALL return all non-deleted groups with their member counts
5. THE System SHALL enforce unique group names within an application
6. WHEN loading the applications list, THE System SHALL display groupCount for each application

### Requirement 2: Group Membership Management

**User Story:** As an application owner, I want to add and remove users from groups, so that I can manage access at scale across all environments.

#### Acceptance Criteria

1. WHEN an owner adds a user to a group, THE System SHALL create an ApplicationGroupUser record linking the user to the group (application-wide membership)
2. WHEN an owner removes a user from a group, THE System SHALL mark the membership as REMOVED
3. WHEN a user is added to a group, THE System SHALL inherit the group's role permissions for each environment where the group has a role assignment
4. WHEN listing group members, THE System SHALL return all active members with their user details
5. THE System SHALL prevent duplicate memberships (same user in same group)
6. WHEN a user is removed from a group, THE System SHALL revoke the inherited permissions across all environments
7. WHEN loading the applications list, THE System SHALL display userCount for each application

### Requirement 3: Group Role Assignment Per Environment

**User Story:** As an application owner, I want to assign different roles to groups per environment, so that the same group can have different permissions in production vs development.

#### Acceptance Criteria

1. WHEN an owner assigns a role to a group for an environment, THE System SHALL create an ApplicationGroupRole record linking the group to the role for that specific environment
2. WHEN an owner updates a group's role for an environment, THE System SHALL update the ApplicationGroupRole record
3. WHEN an owner removes a group's role for an environment, THE System SHALL mark the assignment as DELETED
4. THE System SHALL allow a group to have different roles in different environments (e.g., "Developers" → "Writer" in DEV, "Reader" in PROD)
5. WHEN a group has no role assignment for an environment, THE System SHALL treat group members as having no permissions in that environment

### Requirement 4: Direct User Role Assignment Per Environment

**User Story:** As an application owner, I want to assign roles directly to users per environment, so that I can grant individual permissions that override group settings.

#### Acceptance Criteria

1. WHEN an owner assigns a role directly to a user for an environment, THE System SHALL create an ApplicationUserRole record
2. WHEN an owner removes a direct role assignment, THE System SHALL mark the assignment as DELETED
3. THE System SHALL allow multiple direct role assignments per user per application per environment
4. WHEN resolving permissions, THE System SHALL prioritize direct user role assignments over group-inherited roles
5. WHEN loading the applications list, THE System SHALL display roleCount (direct user roles) for each application

### Requirement 5: Permission Resolution

**User Story:** As a system, I want to resolve a user's effective permissions for a specific environment, so that authorization decisions are consistent and predictable.

#### Acceptance Criteria

1. WHEN resolving permissions for a user in an environment, THE System SHALL collect all direct ApplicationUserRole assignments for the user in that environment
2. WHEN resolving permissions for a user in an environment, THE System SHALL collect all ApplicationGroupRole assignments for groups the user belongs to in that environment
3. WHEN merging permissions, THE System SHALL combine permissions from all sources (union)
4. WHEN a conflict exists between direct user roles and group roles, THE System SHALL use the direct user role assignment
5. THE System SHALL cache resolved permissions for performance (with invalidation on changes)
6. FOR ALL permission resolution requests, THE System SHALL return the same result for identical inputs (deterministic)

### Requirement 6: Per-Environment Application API Key Generation

**User Story:** As an application owner, I want to generate separate API keys for each environment, so that I can isolate access between production and development.

#### Acceptance Criteria

1. WHEN an owner requests a new API key for an environment, THE System SHALL generate a cryptographically secure Application_API_Key (distinct from AppSync API keys)
2. THE System SHALL store Application_API_Keys in a dedicated table with their associated application, environment, creation timestamp, and optional expiration
3. WHEN an owner rotates an API key, THE System SHALL generate a new key and store the old key as "next" for graceful rotation
4. WHEN an owner revokes an API key, THE System SHALL immediately invalidate the key
5. THE System SHALL support up to 5 environments per application (starter plan limit)
6. WHEN validating an Application_API_Key, THE System SHALL return the associated application, organization, and environment context

### Requirement 7: Application API Key Authentication Flow

**User Story:** As an external developer, I want to authenticate my SDK/API requests using an Application API key, so that my application can access the platform without user interaction.

#### Acceptance Criteria

1. WHEN an SDK request includes a valid Application_API_Key, THE System SHALL authenticate the request and establish organization, application, and environment context
2. WHEN an SDK request includes an invalid or expired Application_API_Key, THE System SHALL reject the request with a 401 error
3. WHEN an SDK request includes a revoked Application_API_Key, THE System SHALL reject the request with a 401 error
4. THE System SHALL log Application_API_Key usage for auditing purposes
5. THE System SHALL rate-limit Application_API_Key requests to prevent abuse

### Requirement 8: Frontend Group Management UI

**User Story:** As an application owner, I want to manage groups and members through the web interface, so that I can administer access without using the API directly.

#### Acceptance Criteria

1. WHEN viewing an application, THE System SHALL display a "Groups" tab showing all groups
2. WHEN creating a group, THE System SHALL provide a form for name, description, and role selection
3. WHEN viewing a group, THE System SHALL display the member list with add/remove capabilities
4. WHEN managing members, THE System SHALL provide a user search/select interface
5. THE System SHALL follow the store-first NgRx pattern for all state management
6. THE System SHALL display loading states and error messages appropriately

### Requirement 9: Frontend API Key Management UI

**User Story:** As an application owner, I want to manage API keys through the web interface, so that I can generate and rotate keys securely.

#### Acceptance Criteria

1. WHEN viewing an application, THE System SHALL display an "API Keys" tab showing keys per environment
2. WHEN generating a key, THE System SHALL display the key once and require confirmation before hiding
3. WHEN rotating a key, THE System SHALL show both current and next keys during the rotation period
4. WHEN revoking a key, THE System SHALL require confirmation before proceeding
5. THE System SHALL mask API keys by default with a "reveal" option
6. THE System SHALL provide a "copy to clipboard" function for API keys

### Requirement 10: SDK Package Core Functions

**User Story:** As an external developer, I want to use an SDK package to manage users and permissions in my application, so that I can integrate access management without building it from scratch.

#### Acceptance Criteria

1. THE SDK SHALL authenticate using Application_API_Keys which establish organization, application, and environment context
2. THE SDK SHALL provide functions for user management: assignUser, removeUser, getUsers (scoped to environment)
3. THE SDK SHALL provide functions for group management: createGroup, updateGroup, deleteGroup, addMember, removeMember (scoped to environment)
4. THE SDK SHALL provide functions for role management: assignRole, removeRole, getUserPermissions (scoped to environment)
5. THE SDK SHALL provide functions for API key management: generateKey, rotateKey, revokeKey
6. THE SDK SHALL be published as an npm package (TypeScript) and PyPI package (Python)
7. WHEN calling SDK functions, THE System SHALL require environment, application context (derived from API key) and user identifiers as appropriate

### Requirement 11: SDK Documentation and Versioning

**User Story:** As an external developer, I want comprehensive documentation and semantic versioning, so that I can integrate confidently and upgrade safely.

#### Acceptance Criteria

1. THE SDK SHALL include inline documentation for all public functions
2. THE SDK SHALL include a README with quick-start examples
3. THE SDK SHALL follow semantic versioning (MAJOR.MINOR.PATCH)
4. THE SDK SHALL maintain a CHANGELOG documenting all changes
5. THE SDK SHALL include TypeScript type definitions
6. THE SDK SHALL include unit tests with >80% coverage
7. THE SDK SHALL follow orb-templates guidance for documentation, versions, changelogs, and issue updates
