# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
