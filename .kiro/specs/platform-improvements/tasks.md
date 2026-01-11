# Implementation Plan: Platform Improvements

## Overview

This implementation plan addresses security hardening, documentation updates, branding fixes, cross-team issue resolution, and landing page improvements. Tasks are ordered by priority: security first, then documentation, then user-facing changes.

## Tasks

- [ ] 1. Security Hardening - IAM Policy Scoping
  - [ ] 1.1 Scope AppSync service role DynamoDB permissions
    - Remove `AmazonDynamoDBFullAccess` managed policy
    - Add inline policy with specific actions: GetItem, PutItem, UpdateItem, DeleteItem, Query, Scan, BatchGetItem, BatchWriteItem
    - Scope resources to `arn:aws:dynamodb:*:*:table/${prefix}-*` and indexes
    - _Requirements: 1.1, 1.2_

  - [ ] 1.2 Scope Cognito SMS role SNS permissions
    - Replace wildcard `*` resource with specific topic ARN reference
    - Use `self.sms_verification_topic.topic_arn` for resource
    - _Requirements: 1.3_

  - [ ] 1.3 Scope Cognito Lambda trigger permissions
    - Replace wildcard `*` resource with specific User Pool ARN
    - Use `self.user_pool.user_pool_arn` for Cognito permissions
    - _Requirements: 1.4_

  - [ ] 1.4 Write property test for IAM policy scoping
    - **Property 1: IAM Policies Are Scoped to Project Resources**
    - Parse synthesized CloudFormation and verify no wildcard resources
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [ ] 2. Security Hardening - Data Protection
  - [ ] 2.1 Enable Point-in-Time Recovery on all DynamoDB tables
    - Add `point_in_time_recovery=True` to all table definitions in dynamodb_stack.py
    - _Requirements: 1.5_

  - [ ] 2.2 Write property test for PITR enablement
    - **Property 2: All DynamoDB Tables Have Point-in-Time Recovery**
    - Parse synthesized CloudFormation and verify PITR on all tables
    - **Validates: Requirements 1.5**

- [ ] 3. Checkpoint - Security verification
  - Run `cdk synth --all` to verify stacks synthesize
  - Run CDK tests to verify security properties
  - Ensure no deployment errors

- [ ] 4. Documentation Updates - Development Guide
  - [ ] 4.1 Update docs/development.md paths
    - Replace `backend/` references with `apps/api/`
    - Replace `frontend/` references with `apps/web/`
    - Replace `schemas/generate.py` with `orb-schema-generator generate`
    - _Requirements: 2.1_

  - [ ] 4.2 Update docs/development.md deployment section
    - Replace SAM deployment commands with CDK commands
    - Reference `deploy-infrastructure.yml` workflow
    - Add CDK prerequisites (Node.js for CDK CLI)
    - _Requirements: 2.2_

- [ ] 5. Documentation Updates - Frontend and API
  - [ ] 5.1 Update docs/frontend-design.md paths
    - Replace `frontend/src/models/` with `apps/web/src/app/core/models/`
    - Update module references for new structure
    - _Requirements: 2.3_

  - [ ] 5.2 Update docs/api.md with complete operations
    - Add Organizations operations (Create, Update, Delete, Query)
    - Add Notifications operations
    - Add PrivacyRequests operations
    - Add OwnershipTransferRequests operations
    - _Requirements: 2.4_

  - [ ] 5.3 Add architecture diagram to docs/architecture.md
    - Add Mermaid diagram showing stack dependencies
    - Add data flow diagram
    - _Requirements: 2.5_

- [ ] 6. Branding Updates - Infrastructure
  - [ ] 6.1 Update Cognito email templates
    - Replace "OneRedBoot" with "Orb Integration Hub" in user invitation email
    - Update application URL to correct domain
    - _Requirements: 3.3, 3.4_

- [ ] 7. Branding Updates - Frontend
  - [ ] 7.1 Update landing page branding
    - Replace all "OneRedBoot" references with "Orb Integration Hub"
    - Update logo references if needed
    - Update page title and meta tags
    - _Requirements: 3.1, 3.2_

  - [ ] 7.2 Write property test for branding consistency
    - **Property 3: No OneRedBoot References in User-Visible Content**
    - Grep frontend files for "OneRedBoot" and verify none found
    - **Validates: Requirements 3.2**

- [ ] 8. Landing Page Improvements
  - [ ] 8.1 Add JSON-LD structured data
    - Add script tag with type="application/ld+json"
    - Include SoftwareApplication schema
    - _Requirements: 6.2_

  - [ ] 8.2 Update navigation and CTAs
    - Ensure "Get Started" navigates to /authenticate
    - Add anchor links for smooth scrolling (#features, #pricing)
    - Update "Documentation" to link to docs or show "Coming Soon"
    - _Requirements: 6.4, 6.9_

  - [ ] 8.3 Update pricing section
    - Mark pricing as "Coming Soon" or update with actual tiers
    - Ensure pricing cards are scannable
    - _Requirements: 6.6_

  - [ ] 8.4 Ensure semantic HTML structure
    - Verify h1 > h2 > h3 hierarchy
    - Add proper ARIA labels where needed
    - _Requirements: 6.8_

  - [ ] 8.5 Write property test for heading hierarchy
    - **Property 4: Semantic HTML Heading Hierarchy**
    - Parse HTML templates and verify heading order
    - **Validates: Requirements 6.8**

- [ ] 9. Design System Setup
  - [ ] 9.1 Create design tokens file
    - Create `apps/web/src/styles/_tokens.scss`
    - Define CSS custom properties for colors, typography, spacing
    - _Requirements: 7.5_

  - [ ] 9.2 Update landing page to use design tokens
    - Replace hardcoded colors with `var(--color-*)` references
    - Replace hardcoded spacing with `var(--spacing-*)` references
    - _Requirements: 7.5_

  - [ ] 9.3 Write property test for CSS custom properties
    - **Property 5: CSS Custom Properties for Design Tokens**
    - Parse SCSS files and verify custom property usage
    - **Validates: Requirements 7.5**

- [ ] 10. Design Handoff Documentation
  - [ ] 10.1 Create docs/design/design-handoff.md
    - Document design token structure
    - Document component naming conventions
    - Document Figma-to-Angular workflow
    - Include Figma project link placeholder
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6_

- [ ] 11. Cross-Team Issue Resolution
  - [ ] 11.1 Review and update cross-team issue status
    - Check status of orb-geo-fence #1, #2
    - Check status of orb-templates #34
    - Update `.github/ISSUES/README.md` with current status
    - _Requirements: 4.1_

  - [ ] 11.2 Comment on resolved issues
    - Add verification comments to any issues that have been fixed
    - _Requirements: 4.2_

- [ ] 12. Version and Changelog
  - [ ] 12.1 Update CHANGELOG.md
    - Add [1.2.0] section with date
    - Document Added: Security hardening, design system, design handoff guide
    - Document Changed: Documentation updates, branding updates
    - Document Fixed: IAM policy scoping, outdated documentation
    - _Requirements: 5.2, 5.3_

  - [ ] 12.2 Bump version to 1.2.0
    - Update version references in appropriate files
    - _Requirements: 5.1_

- [ ] 13. Final Checkpoint - Complete verification
  - Run `cdk synth --all` to verify all stacks synthesize
  - Run all property tests
  - Verify documentation renders correctly
  - Verify landing page displays correctly
  - Commit with message: `feat: platform improvements - security, docs, branding #issues`
  - _Requirements: All_

## Notes

- All property tests are required for comprehensive coverage
- Security tasks (1-3) should be completed first
- Documentation tasks (4-5) can be done in parallel
- Frontend tasks (7-9) depend on branding decisions
- Follow orb-templates spec standards for commits and issue comments
- All changes should reference this spec in commit messages
