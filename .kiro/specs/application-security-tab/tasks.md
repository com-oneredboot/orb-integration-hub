# Implementation Plan: Application Security Tab

## Overview

This implementation restructures the Application Detail Page's "API Keys" tab into a "Security" tab with environment-based API key display. The changes are primarily in the application-detail-page component, with minimal store changes needed.

## Tasks

- [x] 1. Update tab enum and navigation
  - [x] 1.1 Rename ApplicationDetailTab.ApiKeys to ApplicationDetailTab.Security
    - Update enum in application-detail-page.component.ts
    - Update all references in component and template
    - _Requirements: 1.1, 1.2_
  - [x] 1.2 Update tab button in template
    - Change icon from "key" to "shield-alt"
    - Change label from "API Keys" to "Security"
    - Update aria attributes
    - _Requirements: 1.1, 1.3_

- [x] 2. Create environment key row data structure
  - [x] 2.1 Add EnvironmentKeyRow interface and computed property
    - Define interface with environment, apiKey, hasKey, canRotate, canRevoke, canGenerate
    - Add computeEnvironmentKeyRows() method
    - Add environmentKeyRows property
    - _Requirements: 2.2, 2.3, 2.4_
  - [x] 2.2 Subscribe to API keys from store
    - Add apiKeys$ observable from API keys store
    - Subscribe and update environmentKeyRows when keys or environments change
    - _Requirements: 2.2, 2.3_

- [x] 3. Implement Security tab template
  - [x] 3.1 Replace ApiKeysListComponent with card-based layout
    - Remove app-api-keys-list usage
    - Add orb-card with "API Keys" title and key icon
    - _Requirements: 6.1, 6.2_
  - [x] 3.2 Add empty state for no environments
    - Show message when application has no environments
    - Include link to Details tab
    - _Requirements: 5.1, 5.2_
  - [x] 3.3 Add environment key row template
    - Environment badge with color styling
    - Key info section (prefix, status, last used) when key exists
    - "No API key" text when no key
    - Action buttons based on canGenerate/canRotate/canRevoke
    - _Requirements: 2.3, 2.4, 2.5, 4.1, 4.2_

- [x] 4. Add environment key row styling
  - [x] 4.1 Add SCSS for security tab layout
    - Style security-key-list container
    - Style security-key-row with flexbox layout
    - Style environment badges with color variants
    - Style action buttons alignment
    - _Requirements: 2.5_

- [x] 5. Wire up action handlers
  - [x] 5.1 Implement onGenerateKey handler
    - Dispatch ApiKeysActions.generateApiKey with environment
    - Handle success/error states
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 5.2 Implement onRotateKey handler
    - Dispatch ApiKeysActions.rotateApiKey
    - Show confirmation if needed
    - _Requirements: 4.3_
  - [x] 5.3 Implement onRevokeKey handler
    - Show confirmation dialog
    - Dispatch ApiKeysActions.revokeApiKey on confirm
    - _Requirements: 4.4, 4.5_

- [x] 6. Checkpoint - Verify basic functionality
  - Ensure tab displays correctly
  - Verify environment rows show for selected environments
  - Test generate/rotate/revoke actions work
  - Ask user if questions arise

- [x] 7. Write tests
  - [x] 7.1 Write unit tests for tab rename and structure
    - Test enum value exists
    - Test tab renders with correct icon and label
    - Test empty state renders when no environments
    - _Requirements: 1.1, 5.1_
  - [x] 7.2 Write property test for environment row count
    - **Property 1: Environment Row Count Matches Selected Environments**
    - **Validates: Requirements 2.2**
  - [x] 7.3 Write property test for row content correctness
    - **Property 2: Environment Row Content Correctness**
    - **Validates: Requirements 2.3, 2.4, 4.1, 4.2**
  - [x] 7.4 Write property test for action button visibility
    - **Property 3: Action Button Visibility Based on Key Status**
    - **Validates: Requirements 4.1, 4.2, 4.5**

- [x] 8. Final checkpoint
  - Ensure all tests pass
  - Verify UI matches design
  - Test all user flows (generate, rotate, revoke)
  - Ask user if questions arise

## Notes

- All tasks are required for comprehensive implementation
- Reuses existing API Keys store - no new store changes needed
- ApiKeysListComponent can be kept for potential reuse elsewhere, or removed if not needed
- Follow store-first NgRx pattern per project standards
