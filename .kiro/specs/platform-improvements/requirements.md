# Requirements Document

## Introduction

This spec addresses all issues identified in the comprehensive review (docs/comprehensive-review.md), including security hardening, documentation updates, branding fixes, and cross-team issue resolution. The goal is to bring the platform to production-ready state with proper security, accurate documentation, and consistent branding.

## Standard Requirements

This spec follows the [orb-templates Spec Standards](../../repositories/orb-templates/docs/kiro-steering/templates/spec-standards.md).

## Glossary

- **Platform**: The orb-integration-hub application and infrastructure
- **IAM_Policy_System**: AWS IAM policies controlling resource access
- **Documentation_System**: Markdown files in `docs/` directory
- **Frontend_Application**: Angular application in `apps/web/`
- **Landing_Page**: The public-facing platform component at `/platform`
- **Cross_Team_Tracker**: Issue tracking in `.github/ISSUES/`

## Requirements

### Requirement 1: Security Hardening

**User Story:** As a security engineer, I want IAM policies scoped to minimum required permissions, so that the blast radius of any compromise is minimized.

#### Acceptance Criteria

1. WHEN the AppSync service role is created, THE IAM_Policy_System SHALL grant DynamoDB access only to tables with the project prefix
2. WHEN the AppSync service role is created, THE IAM_Policy_System SHALL grant only required DynamoDB actions (GetItem, PutItem, UpdateItem, DeleteItem, Query, Scan)
3. WHEN the Cognito SMS role is created, THE IAM_Policy_System SHALL scope SNS permissions to the verification topic ARN
4. WHEN the Cognito Lambda trigger role is created, THE IAM_Policy_System SHALL scope permissions to specific User Pool ARN
5. WHEN DynamoDB tables are created, THE Platform SHALL enable Point-in-Time Recovery for data protection

### Requirement 2: Documentation Updates

**User Story:** As a developer, I want accurate documentation reflecting the current CDK-based architecture, so that I can onboard quickly and work effectively.

#### Acceptance Criteria

1. WHEN a developer reads `docs/development.md`, THE Documentation_System SHALL reference the correct paths (`apps/api/`, `apps/web/`)
2. WHEN a developer reads `docs/development.md`, THE Documentation_System SHALL describe CDK deployment commands instead of SAM
3. WHEN a developer reads `docs/frontend-design.md`, THE Documentation_System SHALL reference correct model paths (`apps/web/src/app/core/models/`)
4. WHEN a developer reads `docs/api.md`, THE Documentation_System SHALL include all GraphQL operations (Organizations, Notifications, PrivacyRequests, OwnershipTransferRequests)
5. WHEN a developer reads `docs/architecture.md`, THE Documentation_System SHALL include a visual architecture diagram

### Requirement 3: Branding Consistency

**User Story:** As a user, I want consistent branding throughout the platform, so that I have a professional and trustworthy experience.

#### Acceptance Criteria

1. WHEN the landing page is displayed, THE Frontend_Application SHALL show "Orb Integration Hub" as the product name
2. WHEN the landing page is displayed, THE Frontend_Application SHALL NOT reference "OneRedBoot" in user-visible content
3. WHEN Cognito sends email invitations, THE Platform SHALL use "Orb Integration Hub" branding
4. WHEN Cognito sends email invitations, THE Platform SHALL reference the correct application URL
5. WHEN the landing page displays pricing, THE Frontend_Application SHALL show accurate pricing tiers or placeholder indicating "Coming Soon"

### Requirement 4: Cross-Team Issue Resolution

**User Story:** As a project maintainer, I want cross-team issues tracked and resolved, so that upstream dependencies don't block progress.

#### Acceptance Criteria

1. WHEN cross-team issues are resolved, THE Cross_Team_Tracker SHALL update `.github/ISSUES/README.md` status
2. WHEN issues are verified fixed, THE Cross_Team_Tracker SHALL add closing comments to GitHub issues we created
3. WHEN new blockers are identified, THE Cross_Team_Tracker SHALL create issues with proper body files

### Requirement 5: Version and Changelog Management

**User Story:** As a release manager, I want version and changelog properly maintained, so that releases are traceable and documented.

#### Acceptance Criteria

1. WHEN this spec is completed, THE Platform SHALL bump version to 1.2.0 (minor feature release)
2. WHEN version is bumped, THE Documentation_System SHALL update CHANGELOG.md with all changes
3. THE CHANGELOG entry SHALL follow Keep a Changelog format with Added, Changed, Fixed, Removed sections

### Requirement 6: Landing Page Improvements

**User Story:** As a visitor, I want a simple, cohesive landing page that quickly communicates value, so that I can understand and get started without navigating walls of content.

#### Acceptance Criteria

1. WHEN the landing page is displayed, THE Landing_Page SHALL present a single-page experience with clear sections
2. WHEN the landing page is displayed, THE Landing_Page SHALL include structured data (JSON-LD) for LLM and search engine discoverability
3. WHEN the landing page is displayed, THE Landing_Page SHALL have a clear call-to-action above the fold
4. WHEN "Get Started" is clicked, THE Landing_Page SHALL navigate directly to authentication/signup
5. THE Landing_Page SHALL NOT require navigation to multiple pages to understand the product
6. WHEN pricing is displayed, THE Landing_Page SHALL show simple, scannable pricing tiers
7. WHEN the landing page is displayed, THE Landing_Page SHALL be responsive on mobile devices
8. THE Landing_Page SHALL include semantic HTML with proper heading hierarchy for accessibility and LLM parsing
9. WHEN a user scrolls, THE Landing_Page SHALL use smooth scrolling to anchor sections

### Requirement 7: Design System and Figma Integration

**User Story:** As a project owner, I want external designers to contribute via Figma, so that professional UI/UX designs can guide frontend development.

#### Acceptance Criteria

1. WHEN a designer needs to contribute, THE Documentation_System SHALL provide a design handoff guide
2. THE design handoff guide SHALL document the design token structure (colors, typography, spacing)
3. THE design handoff guide SHALL document the component naming conventions matching Angular components
4. THE design handoff guide SHALL include Figma-to-Angular workflow instructions
5. WHEN design tokens are defined, THE Frontend_Application SHALL use CSS custom properties for theming
6. THE Documentation_System SHALL include a link to the Figma project (or placeholder for future setup)
