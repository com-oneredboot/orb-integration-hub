# Implementation Plan: Repository Standards Phase 2

## Overview

This implementation plan adds code quality automation, release management, and alignment with the latest orb-templates standards to orb-integration-hub.

## Tasks

- [x] 1. Phase 1: Pre-commit Setup
  - [x] 1.1 Create .pre-commit-config.yaml
    - Create configuration file in project root
    - Include ruff hooks for linting and formatting
    - Include black hook for code formatting
    - Include mypy hook for type checking
    - Include file hygiene hooks (trailing-whitespace, end-of-file-fixer, check-yaml, check-json)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 1.2 Add pre-commit to Pipfile dev dependencies
    - Add pre-commit package to apps/api/Pipfile [dev-packages]
    - Run pipenv lock to update lock file
    - _Requirements: 1.7_

  - [x] 1.3 Create git hook wrapper for all-files checking
    - Document the git hook setup command in README
    - The wrapper ensures ALL files are checked, not just staged files
    - _Requirements: 1.6_

  - [x] 1.4 Update README with pre-commit setup instructions
    - Add "Code Quality" section to README
    - Document how to install pre-commit hooks
    - Document how to run hooks manually
    - _Requirements: 1.8_

- [x] 2. Checkpoint - Verify Phase 1 completion
  - Verify .pre-commit-config.yaml exists and is valid YAML
  - Verify pre-commit is in Pipfile
  - Verify README has pre-commit instructions
  - Ask the user if questions arise

- [x] 3. Phase 2: Steering and Documentation
  - [x] 3.1 Create .kiro/steering/spec-standards.md
    - Add front-matter with `inclusion: always`
    - Reference orb-templates spec standards document
    - Include git commit standards section
    - Include GitHub issue response standards
    - Include documentation quality checklist
    - Include "Never Do" list
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.2 Create CHANGELOG.md
    - Create file in project root
    - Follow Keep a Changelog format
    - Include Unreleased section
    - Document Phase 1 standardization work (Nx-style structure, schema generator, etc.)
    - Include sections for Added, Changed, Fixed, Removed
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Checkpoint - Verify Phase 2 completion
  - Verify spec-standards.md exists with correct front-matter
  - Verify CHANGELOG.md exists with proper format
  - Ask the user if questions arise

- [-] 5. Phase 3: Dependency and Config Updates
  - [x] 5.1 Add orb-common to Pipfile
    - Add orb-common to apps/api/Pipfile [packages]
    - Run pipenv lock to update lock file
    - Note: Requires CodeArtifact access
    - _Requirements: 4.1_

  - [x] 5.2 Verify schema-generator.yml uses standard environment values
    - Check environment field uses standard values (dev, stg, prd)
    - Update if necessary
    - _Requirements: 4.3_

  - [x] 5.3 Modernize .gitignore structure
    - Reorganize with clear section headers
    - Add CDK/Infrastructure section
    - Remove obsolete entries (old backend/frontend paths)
    - Add project-specific section at end
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 5.4 Write property test for gitignore obsolete entries
    - **Property 1: No Obsolete Gitignore Entries**
    - **Validates: Requirements 5.4**

  - [x] 5.5 Review and update GitHub workflows
    - Add timeout-minutes to jobs missing it
    - Verify triggers are specific (not broad)
    - Check workflow_dispatch input ordering
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 5.6 Write property test for workflow configuration
    - **Property 3: Workflow Timeout Configuration**
    - **Property 4: Workflow Trigger Specificity**
    - **Validates: Requirements 6.2, 6.3**

- [x] 6. Final Checkpoint - Complete verification
  - Run all property tests
  - Verify all requirements are met
  - Run pre-commit hooks to validate configuration
  - Ask the user if questions arise
  - _Requirements: All_

## Notes

- All tasks are required for comprehensive standardization
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Pre-commit hooks will run automatically after setup
- orb-common requires CodeArtifact access - ensure AWS SSO login is configured
