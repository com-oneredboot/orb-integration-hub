# Requirements Document

## Introduction

This document defines the requirements for standardizing the orb-integration-hub repository to align with the orb-templates organizational standards. The standardization will restructure the project to follow Nx-style conventions, integrate with orb-schema-generator, and establish proper Kiro steering files for AI-assisted development.

## Glossary

- **Nx-Style Layout**: A monorepo structure where all deployable applications reside under an `apps/` directory, following industry-standard conventions used by Nx and Turborepo
- **orb-schema-generator**: The organization's multi-platform code generation tool that produces models from YAML schemas
- **Steering_Files**: Kiro configuration files that provide project-specific instructions to the AI assistant
- **Apps_Directory**: The `apps/` directory containing all deployable applications (api, web, mobile, cli)
- **Packages_Directory**: The `packages/` directory containing reusable, publishable libraries
- **Schema_Generator_Config**: The `schema-generator.yml` configuration file for orb-schema-generator

## Requirements

### Requirement 1: Directory Structure Standardization

**User Story:** As a developer, I want the project to follow Nx-style directory conventions, so that the codebase is consistent with other orb projects and easily understood by LLMs.

#### Acceptance Criteria

1. THE Repository SHALL have an `apps/` directory containing all deployable applications
2. THE Repository SHALL move the current `backend/` contents to `apps/api/`
3. THE Repository SHALL move the current `frontend/` contents to `apps/web/`
4. THE Repository SHALL maintain the existing `infrastructure/` directory structure
5. THE Repository SHALL maintain the existing `schemas/` directory structure
6. THE Repository SHALL have a `packages/` directory for reusable libraries (initially empty with .gitkeep)
7. THE Repository SHALL update all import paths and references after restructuring

### Requirement 2: Schema Generator Integration

**User Story:** As a developer, I want to use orb-schema-generator instead of the custom generate.py script, so that code generation is consistent across all orb projects.

#### Acceptance Criteria

1. THE Repository SHALL have a `schema-generator.yml` configuration file in the project root
2. THE Schema_Generator_Config SHALL define output paths following the standard structure:
   - `apps/api/models/` for Python models
   - `apps/api/enums/` for Python enums
   - `apps/api/graphql/` for GraphQL schemas
   - `apps/web/src/models/` for TypeScript models
   - `apps/web/src/enums/` for TypeScript enums
3. THE Repository SHALL migrate existing YAML schemas in `schemas/entities/` to the orb-schema-generator format
4. THE Repository SHALL deprecate and remove the custom `schemas/generate.py` script after migration
5. WHEN orb-schema-generator is run THEN the generated code SHALL be placed in the correct output directories

### Requirement 3: Kiro Steering Files Setup

**User Story:** As a developer using Kiro, I want project-specific steering files, so that the AI assistant understands our project conventions and can provide consistent guidance.

#### Acceptance Criteria

1. THE Repository SHALL have a `.kiro/steering/project-standards.md` file with project-specific settings
2. THE Steering_Files SHALL include documentation references to orb-templates via `#[[file:repositories/orb-templates/...]]` syntax
3. THE Steering_Files SHALL define AWS configuration (profile: sso-orb-dev, region: us-east-1)
4. THE Steering_Files SHALL define package management conventions (pipenv for Python, npm for TypeScript)
5. THE Steering_Files SHALL include GitHub issue ownership rules
6. THE Steering_Files SHALL include command phrases for common operations (review issues, run checks, sync dependencies)
7. THE Repository SHALL have conditional steering files for testing and infrastructure work

### Requirement 4: Repositories Directory Configuration

**User Story:** As a developer, I want the repositories directory properly configured, so that I can reference orb-templates documentation without committing cloned repos.

#### Acceptance Criteria

1. THE Repository SHALL have `repositories/` in the `.gitignore` file
2. THE Steering_Files SHALL document how to clone reference repositories
3. THE Steering_Files SHALL mark the `repositories/` directory as READ-ONLY
4. WHEN a developer clones the project THEN they SHALL be able to set up reference repositories with documented commands

### Requirement 5: GitHub Configuration Alignment

**User Story:** As a developer, I want GitHub workflows and issue templates aligned with orb-infrastructure standards, so that CI/CD and issue management are consistent.

#### Acceptance Criteria

1. THE Repository SHALL have issue templates copied from orb-infrastructure
2. THE Repository SHALL have a `.github/ISSUES/` directory for cross-team issue tracking
3. THE Repository SHALL update GitHub workflows to use OIDC authentication patterns from orb-infrastructure
4. WHEN creating issues THEN the templates SHALL follow orb-infrastructure standards

### Requirement 6: Documentation Updates

**User Story:** As a developer, I want the README and documentation updated to reflect the new structure, so that onboarding is clear and accurate.

#### Acceptance Criteria

1. THE README.md SHALL be updated to reflect the new Nx-style directory structure
2. THE README.md SHALL include instructions for setting up reference repositories
3. THE README.md SHALL reference orb-schema-generator instead of the custom generate.py script
4. THE docs/ directory SHALL be updated with any path changes resulting from restructuring
5. WHEN a new developer reads the README THEN they SHALL understand the project structure and setup process

### Requirement 7: Migration Safety

**User Story:** As a developer, I want the migration to be safe and reversible, so that we don't lose any functionality during the transition.

#### Acceptance Criteria

1. THE Migration SHALL preserve all existing functionality
2. THE Migration SHALL be performed in phases with checkpoints
3. THE Migration SHALL update all internal references and imports
4. IF any tests fail after migration THEN the issue SHALL be documented and resolved before proceeding
5. THE Migration SHALL maintain backward compatibility for any external integrations
