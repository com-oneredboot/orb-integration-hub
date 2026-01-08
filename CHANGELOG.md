# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
