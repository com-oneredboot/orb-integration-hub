# Implementation Plan: API Key Lifecycle Management

## Overview

This implementation enhances the API key management system with full lifecycle support including generation, rotation with 7-day grace periods, revocation, and automatic cleanup. The work builds on the existing Security tab implementation.

## Tasks

- [x] 1. Update schema and regenerate code
  - [x] 1.1 Update ApplicationApiKeys schema with new fields
    - Add `activatesAt` timestamp field (optional)
    - Add `revokedAt` timestamp field (optional)
    - Add `ttl` number field for DynamoDB TTL
    - Update `expiresAt` description for clarity
    - _Requirements: 10.1, 10.2, 10.3_
  - [x] 1.2 Run schema generator
    - Execute `pipenv run orb-schema generate`
    - Verify generated models include new fields
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 2. Checkpoint - Verify schema changes
  - Ensure generated TypeScript models have new fields
  - Ensure generated Python models have new fields
  - Ensure GraphQL schema updated
  - Ask user if questions arise

- [x] 3. Update API key store for lifecycle management
  - [x] 3.1 Update API keys state interface
    - Add `isRegenerating` loading state
    - Add `regeneratedKeyResult` for showing both keys
    - _Requirements: 4.1_
  - [x] 3.2 Add regeneration actions
    - Add `regenerateApiKey` action with applicationId, environment
    - Add `regenerateApiKeySuccess` with old key (ROTATING) and new key (ACTIVE)
    - Add `regenerateApiKeyFailure` with error
    - _Requirements: 4.1_
  - [x] 3.3 Update reducer for regeneration
    - Handle regeneration success by updating both keys in state
    - Store regenerated key result for display
    - _Requirements: 4.1, 4.4_
  - [x] 3.4 Add regeneration effect
    - Call GraphQL mutation for regeneration
    - Handle success/failure
    - _Requirements: 4.1_

- [x] 4. Update environment key row computation
  - [x] 4.1 Update computeEnvironmentKeyRows method
    - Group keys by environment
    - Sort environments by priority (PROD > STAGING > DEV > TEST > PREVIEW)
    - Sort keys within environment by status (ACTIVE > ROTATING > REVOKED > EXPIRED)
    - _Requirements: 2.2, 2.3_
  - [x] 4.2 Update EnvironmentKeyRow interface
    - Add `activityText` computed field
    - Add `expiresInDays` for ROTATING keys
    - Add `isMuted` for REVOKED/EXPIRED styling
    - _Requirements: 2.7, 7.1, 8.4_
  - [x] 4.3 Write property test for environment sorting
    - **Property 2: Rows Sorted by Environment Priority**
    - **Validates: Requirements 2.2**
  - [x] 4.4 Write property test for status sorting
    - **Property 3: Rows Sorted by Status Within Environment**
    - **Validates: Requirements 2.3**

- [x] 5. Implement activity text computation
  - [x] 5.1 Create getActivityText helper function
    - ACTIVE: "Last used {relative_time}" or "Never used"
    - ROTATING: "Expires in {days} days" or "Expires {date}"
    - REVOKED: "Revoked on {date}"
    - EXPIRED: "Expired on {date}"
    - _Requirements: 2.7, 4.5, 5.4_
  - [x] 5.2 Write property test for activity text
    - **Property 7: Activity Text Matches Key Status**
    - **Validates: Requirements 2.7, 5.4**

- [x] 6. Checkpoint - Verify row computation
  - Test that rows are sorted correctly
  - Test that activity text displays correctly
  - Ask user if questions arise

- [x] 7. Update Security tab template for lifecycle display
  - [x] 7.1 Update row template for status badges
    - Green badge for ACTIVE
    - Orange badge for ROTATING with "Expiring" label
    - Red badge for REVOKED
    - Gray badge for EXPIRED
    - _Requirements: 7.1_
  - [x] 7.2 Add muted styling for inactive keys
    - Apply reduced opacity to REVOKED/EXPIRED rows
    - _Requirements: 8.4_
  - [x] 7.3 Update action buttons based on status
    - ACTIVE: [Regenerate] [Revoke]
    - ROTATING: [Revoke] only
    - REVOKED/EXPIRED: No action buttons
    - No key: [Generate Key]
    - _Requirements: 4.1, 5.1_
  - [x] 7.4 Write property test for badge colors
    - **Property 12: Status Badge Color Matches Status**
    - **Validates: Requirements 7.1**
  - [x] 7.5 Write property test for muted styling
    - **Property 15: Muted Styling for Inactive Keys**
    - **Validates: Requirements 8.4**

- [x] 8. Implement regeneration UI flow
  - [x] 8.1 Add onRegenerateKey handler
    - Dispatch regenerateApiKey action
    - _Requirements: 4.1_
  - [x] 8.2 Display both keys after regeneration
    - Show ROTATING key with expiration countdown
    - Show new ACTIVE key with copy button
    - _Requirements: 4.4, 4.5_
  - [x] 8.3 Write property test for regeneration result
    - **Property 10: Regeneration Creates ACTIVE and ROTATING Pair**
    - **Validates: Requirements 4.1**

- [x] 9. Checkpoint - Verify regeneration flow
  - Test regeneration creates two keys
  - Test both keys displayed correctly
  - Test expiration countdown shows
  - Ask user if questions arise

- [x] 10. Implement environment deselection auto-revoke
  - [x] 10.1 Update onEnvironmentToggle handler
    - Check if environment has active/rotating keys
    - Show confirmation dialog if keys exist
    - _Requirements: 6.1, 6.2_
  - [x] 10.2 Create confirmation dialog content
    - Warning message about API key revocation
    - Environment name and key count
    - Confirm/Cancel buttons
    - _Requirements: 6.2_
  - [x] 10.3 Implement auto-revoke on confirmation
    - Dispatch revokeApiKey for each active/rotating key
    - Then update application to remove environment
    - _Requirements: 6.1, 6.4_
  - [x] 10.4 Handle cancel - restore checkbox state
    - Re-add environment to form if user cancels
    - _Requirements: 6.3_

- [x] 11. Update revocation to set expiresAt
  - [x] 11.1 Update revokeApiKey effect
    - Set expiresAt = revokedAt when revoking
    - Set ttl = expiresAt + 30 days for DynamoDB cleanup
    - _Requirements: 8.1, 8.2_
  - [x] 11.2 Write property test for revoked expiresAt
    - **Property 13: Revoked Key Has ExpiresAt Equal to RevokedAt**
    - **Validates: Requirements 8.1**

- [x] 12. Checkpoint - Verify revocation and auto-revoke
  - Test manual revocation sets correct timestamps
  - Test environment deselection shows confirmation
  - Test auto-revoke works on confirmation
  - Test cancel preserves environment selection
  - Ask user if questions arise

- [x] 13. Update key prefix format
  - [x] 13.1 Update key generation to use new format
    - Full key: `orb_api_{env}_{32_random_chars}`
    - Prefix stored: `orb_api_{first_4}****`
    - _Requirements: 3.5, 9.1, 9.2_
  - [x] 13.2 Write property test for key format
    - **Property 9: Key Format Matches Pattern**
    - **Validates: Requirements 3.5**
  - [x] 13.3 Write property test for prefix format
    - **Property 16: Key Prefix Format**
    - **Validates: Requirements 9.1, 9.2**

- [x] 14. Write remaining property tests
  - [x] 14.1 Write property test for environment row count
    - **Property 1: Environment Row Count Matches Selected Environments**
    - **Validates: Requirements 2.1**
  - [x] 14.2 Write property test for generate CTA visibility
    - **Property 4: Generate CTA Visible When No Active Key**
    - **Validates: Requirements 2.4**
  - [x] 14.3 Write property test for active key row content
    - **Property 5: Active Key Row Content**
    - **Validates: Requirements 2.5**
  - [x] 14.4 Write property test for rotating shows two rows
    - **Property 6: Rotating Environment Shows Two Rows**
    - **Validates: Requirements 2.6**
  - [x] 14.5 Write property test for generated key cleared
    - **Property 8: Generated Key Cleared on Tab Change**
    - **Validates: Requirements 3.4**
  - [x] 14.6 Write property test for rotating expires in 7 days
    - **Property 11: Rotating Key Expires in 7 Days**
    - **Validates: Requirements 4.2**
  - [x] 14.7 Write property test for all keys displayed
    - **Property 14: All API Keys Displayed**
    - **Validates: Requirements 8.3**
  - [x] 14.8 Write property test for distinguishable prefixes
    - **Property 17: Multiple Keys Have Distinguishable Prefixes**
    - **Validates: Requirements 9.3**

- [x] 15. Write unit tests
  - [x] 15.1 Write unit tests for lazy loading
    - Test API keys not fetched on page load
    - Test API keys fetched on Security tab click
    - _Requirements: 1.1, 1.2_
  - [x] 15.2 Write unit tests for confirmation dialogs
    - Test revoke confirmation appears
    - Test environment deselection confirmation appears
    - _Requirements: 5.1, 6.2_
  - [x] 15.3 Write unit tests for copy functionality
    - Test copy button copies full key
    - Test success feedback shown
    - _Requirements: 3.2_

- [x] 16. Final checkpoint
  - Ensure all tests pass
  - Verify complete lifecycle flow works
  - Test all user scenarios
  - Ask user if questions arise

## Notes

- All tasks are required for comprehensive implementation
- Schema changes require running `pipenv run orb-schema generate`
- Follow store-first NgRx pattern per project standards
- Use existing DataGridComponent for key list display
- Use global `orb-*` CSS classes for styling
