# Implementation Plan: Repository Standardization

## Overview

This implementation plan transforms orb-integration-hub from its current structure to an Nx-style monorepo aligned with orb-templates standards. The migration is performed in phases with checkpoints to ensure safety and reversibility.

## Tasks

- [x] 1. Phase 1: Preparation
  - [x] 1.1 Create backup branch for safety
    - Run `git checkout -b backup/pre-standardization`
    - Push to remote as safety net
    - _Requirements: 7.2_

  - [x] 1.2 Update .gitignore with repositories/ entry
    - Add `repositories/` to .gitignore if not present
    - Verify the entry is correctly placed
    - _Requirements: 4.1_

  - [x] 1.3 Create .kiro/steering/project-standards.md
    - Copy template from orb-templates
    - Customize for orb-integration-hub project
    - Include AWS configuration (profile: sso-orb-dev, region: us-east-1)
    - Include package management conventions
    - Include GitHub issue ownership rules
    - Include command phrases
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 1.4 Create conditional steering files
    - Create .kiro/steering/testing-standards.md with fileMatch front-matter
    - Create .kiro/steering/infrastructure.md with fileMatch front-matter
    - Create .kiro/steering/reference-projects.md with manual inclusion
    - _Requirements: 3.7_

- [x] 2. Checkpoint - Verify Phase 1 completion
  - Ensure all steering files are created and valid
  - Verify .gitignore is updated
  - Ask the user if questions arise

- [x] 3. Phase 2: Directory Restructure
  - [x] 3.1 Create apps/ directory structure
    - Create apps/api/ directory
    - Create apps/web/ directory
    - Create packages/ directory with .gitkeep
    - _Requirements: 1.1, 1.6_

  - [x] 3.2 Move backend/ to apps/api/
    - Use `git mv backend/src/* apps/api/` to preserve history
    - Move Pipfile and Pipfile.lock to apps/api/
    - Remove empty backend/ directory
    - _Requirements: 1.2_

  - [x] 3.3 Move frontend/ to apps/web/
    - Use `git mv frontend/* apps/web/` to preserve history
    - Verify all frontend files are moved
    - Remove empty frontend/ directory
    - _Requirements: 1.3_

  - [x] 3.4 Update Python import paths
    - Update imports in apps/api/ files
    - Update any references to backend/ paths
    - Verify no old import paths remain
    - _Requirements: 1.7_

  - [x] 3.5 Update TypeScript import paths
    - Update imports in apps/web/ files
    - Update angular.json paths
    - Update tsconfig.json paths
    - Verify no old import paths remain
    - _Requirements: 1.7_

  - [x] 3.6 Write property test for import path migration
    - **Property 1: Import Path Migration Completeness**
    - **Validates: Requirements 1.7, 7.3**

- [x] 4. Checkpoint - Verify Phase 2 completion
  - Run existing tests to verify functionality preserved
  - Verify no references to old paths exist
  - Ask the user if questions arise

- [x] 5. Phase 3: Schema Generator Integration
  - [x] 5.1 Create schema-generator.yml configuration
    - Create schema-generator.yml in project root
    - Define project name and IDs
    - Define output paths for apps/api and apps/web
    - _Requirements: 2.1, 2.2_

  - [x] 5.2 Restructure schemas/ directory
    - Create schemas/models/ directory
    - Create schemas/tables/ directory
    - Move schemas/entities/*.yml to appropriate locations
    - _Requirements: 2.3_

  - [x] 5.3 Migrate schemas to orb-schema-generator format
    - Update YAML schema format as needed
    - Validate schemas with orb-schema-generator validate
    - _Requirements: 2.3_

  - [x] 5.4 Test schema generation
    - Run orb-schema-generator generate --dry-run
    - Verify output paths are correct
    - _Requirements: 2.5_

  - [x] 5.5 Write property test for schema generator output
    - **Property 2: Schema Generator Output Correctness**
    - **Validates: Requirements 2.5**

  - [x] 5.6 Remove legacy generate.py script
    - Archive schemas/generate.py (move to .archive/ or delete)
    - Remove schemas/templates/ directory
    - Update any scripts that called generate.py
    - _Requirements: 2.4_

- [x] 6. Checkpoint - Verify Phase 3 completion
  - Verify schema generation works correctly
  - Ensure all tests pass
  - Ask the user if questions arise

- [x] 7. Phase 4: GitHub Alignment
  - [x] 7.1 Copy issue templates from orb-infrastructure
    - Copy .github/ISSUE_TEMPLATE/ from repositories/orb-infrastructure
    - Customize templates for orb-integration-hub if needed
    - _Requirements: 5.1_

  - [x] 7.2 Create cross-team issue tracking directory
    - Create .github/ISSUES/ directory
    - Create .github/ISSUES/README.md with tracking tables
    - _Requirements: 5.2_

  - [x] 7.3 Review and update GitHub workflows
    - Review existing workflows in .github/workflows/
    - Update paths from backend/ to apps/api/
    - Update paths from frontend/ to apps/web/
    - Consider OIDC authentication patterns if applicable
    - _Requirements: 5.3_

- [x] 8. Checkpoint - Verify Phase 4 completion
  - Verify issue templates are in place
  - Verify workflows reference correct paths
  - Ask the user if questions arise

- [x] 9. Phase 5: Documentation Updates
  - [x] 9.1 Update README.md with new structure
    - Update project structure diagram
    - Add Nx-style directory explanation
    - Add reference repository setup instructions
    - Update schema generation instructions to use orb-schema-generator
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 9.2 Update docs/ references
    - Search for references to backend/ and frontend/
    - Update to apps/api/ and apps/web/
    - Verify all documentation paths are correct
    - _Requirements: 6.4_

  - [x] 9.3 Update infrastructure documentation
    - Verify infrastructure/ paths are still correct
    - Update any references to moved files
    - _Requirements: 1.4_

- [x] 10. Final Checkpoint - Complete verification
  - Run full test suite
  - Verify all requirements are met
  - Verify backward compatibility
  - Ask the user if questions arise
  - _Requirements: 7.1, 7.5_

## Notes

- All tasks are required for comprehensive standardization
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Use `git mv` for all file moves to preserve git history
- The repositories/ directory is already set up with orb-templates, orb-infrastructure, and orb-geo-fence
