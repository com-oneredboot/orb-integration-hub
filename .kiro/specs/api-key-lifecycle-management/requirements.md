# Requirements Document

## Introduction

This feature enhances the API key management system on the Application Detail Page's Security tab. It implements a complete lifecycle for API keys including generation, rotation with grace periods, revocation, and automatic cleanup. The system ensures lazy loading of API keys, proper synchronization with environment selection, and clear visual indicators for key status.

## Glossary

- **Application_Detail_Page**: The page component that displays and manages a single application's settings
- **Security_Tab**: The tab within the Application Detail Page containing API key management
- **API_Key**: A secret credential used to authenticate API requests for a specific environment
- **Environment**: A deployment context (PRODUCTION, STAGING, DEVELOPMENT, TEST, PREVIEW)
- **Environment_Key_Row**: A UI row showing an environment and its associated API key(s)
- **Key_Prefix**: The visible portion of an API key for identification (e.g., `orb_api_xxxx****`)
- **Grace_Period**: The 7-day window during rotation where both old and new keys are valid
- **Retention_Period**: The 30-day window after expiration/revocation before automatic deletion

## Requirements

### Requirement 1: Lazy Loading of API Keys

**User Story:** As a user, I want API keys to only be fetched when I navigate to the Security tab, so that the application loads faster and reduces unnecessary API calls.

#### Acceptance Criteria

1. WHEN the Application Detail Page loads, THE System SHALL NOT fetch API keys automatically
2. WHEN a user clicks on the Security tab, THE System SHALL fetch API keys for the current application
3. WHEN API keys are being fetched, THE Security_Tab SHALL display a loading indicator
4. IF the API key fetch fails, THEN THE Security_Tab SHALL display an error message with retry option

### Requirement 2: Environment-Based Key Row Display

**User Story:** As a user, I want to see API keys organized by environment with clear status indicators, so that I can easily manage keys for each deployment context.

#### Acceptance Criteria

1. THE Security_Tab SHALL display one section per environment selected for the application
2. THE Security_Tab SHALL group and sort rows by environment in order: PRODUCTION, STAGING, DEVELOPMENT, TEST, PREVIEW
3. WITHIN each environment group, THE rows SHALL be sorted by status priority: ACTIVE first, then ROTATING, then REVOKED, then EXPIRED
4. WHEN an environment has no API key (or only REVOKED/EXPIRED keys), THE Environment_Key_Row SHALL display a "Generate Key" CTA button
5. WHEN an environment has an ACTIVE key, THE Environment_Key_Row SHALL display the key prefix in format `orb_api_xxxx****` with status badge and last used date
6. WHEN an environment has a ROTATING key, THE Security_Tab SHALL display two rows: one for the expiring key and one for the new active key
7. THE Environment_Key_Row SHALL display activity text showing relevant timestamps (created, last used, expires, revoked)

### Requirement 3: API Key Generation

**User Story:** As a user, I want to generate API keys for my environments, so that I can authenticate API requests.

#### Acceptance Criteria

1. WHEN a user clicks "Generate Key" on an Environment_Key_Row, THE System SHALL immediately create a new API key in DynamoDB
2. WHEN key generation succeeds, THE System SHALL display the full key inline with a copy-to-clipboard button
3. THE inline key display SHALL include a warning that the key will not be shown again after leaving the page
4. WHEN the user navigates away from the Security tab, THE System SHALL clear the displayed full key from memory
5. THE generated key SHALL follow the format `orb_api_{environment_prefix}_{random_string}` (e.g., `orb_api_dev_a1b2c3d4e5f6`)

### Requirement 4: API Key Regeneration with Grace Period

**User Story:** As a user, I want to regenerate API keys with a grace period, so that I can update my integrations without downtime.

#### Acceptance Criteria

1. WHEN a user clicks "Regenerate" on an ACTIVE key, THE System SHALL create a new ACTIVE key and mark the old key as ROTATING
2. THE ROTATING key SHALL have an expiresAt timestamp set to 7 days from regeneration
3. WHILE a key is in ROTATING status, THE System SHALL accept both the old and new keys for API authentication
4. THE Security_Tab SHALL display both the ROTATING (old) and ACTIVE (new) keys as separate rows
5. THE ROTATING key row SHALL display "Expires in X days" with countdown
6. WHEN the grace period expires, THE System SHALL automatically transition the ROTATING key to EXPIRED status

### Requirement 5: API Key Revocation

**User Story:** As a user, I want to revoke API keys immediately when needed, so that I can respond to security incidents.

#### Acceptance Criteria

1. WHEN a user clicks "Revoke" on an ACTIVE or ROTATING key, THE System SHALL prompt for confirmation
2. WHEN confirmed, THE System SHALL immediately update the key status to REVOKED in DynamoDB
3. THE REVOKED key SHALL no longer be accepted for API authentication
4. THE Environment_Key_Row SHALL display "Revoked on {date}" for revoked keys
5. WHEN a key is revoked, THE Environment_Key_Row SHALL display a "Generate Key" CTA to create a replacement

### Requirement 6: Environment Deselection Auto-Revoke

**User Story:** As a user, I want API keys automatically revoked when I remove an environment, so that unused credentials don't remain active.

#### Acceptance Criteria

1. WHEN a user unchecks an environment on the Overview tab, THE System SHALL automatically revoke any ACTIVE or ROTATING API keys for that environment
2. BEFORE revoking, THE System SHALL display a confirmation dialog warning about the API key revocation
3. IF the user cancels, THEN THE System SHALL not uncheck the environment
4. WHEN auto-revocation occurs, THE System SHALL update the key status to REVOKED in DynamoDB immediately

### Requirement 7: Key Status Visual Indicators

**User Story:** As a user, I want clear visual indicators for API key status, so that I can quickly understand the state of each key.

#### Acceptance Criteria

1. THE Environment_Key_Row SHALL display a colored status badge based on key status:
   - ACTIVE: Green badge with "Active" label
   - ROTATING: Orange badge with "Expiring" label
   - REVOKED: Red badge with "Revoked" label
   - EXPIRED: Gray badge with "Expired" label
2. THE Environment_Key_Row SHALL display contextual activity text:
   - ACTIVE: "Last used {relative_time}" or "Never used"
   - ROTATING: "Expires in {days} days" or "Expires {date}"
   - REVOKED: "Revoked on {date}"
   - EXPIRED: "Expired on {date}"
3. WHEN a key is newly generated, THE row SHALL highlight briefly to draw attention

### Requirement 8: Automatic Key Cleanup

**User Story:** As a system administrator, I want expired and revoked keys automatically cleaned up, so that the database doesn't accumulate stale records.

#### Acceptance Criteria

1. WHEN a key is revoked, THE System SHALL set its expiresAt timestamp to the revocation date
2. THE System SHALL delete REVOKED and EXPIRED key records 30 days after their expiresAt timestamp
3. THE Security_Tab SHALL always display all keys for an environment until they are deleted from DynamoDB
4. WHEN displaying REVOKED or EXPIRED keys, THE row SHALL show muted styling to indicate inactive status
5. THE System SHALL use DynamoDB TTL to automatically delete records 30 days after expiresAt

### Requirement 9: Key Prefix Display Format

**User Story:** As a user, I want to see a recognizable prefix for my API keys, so that I can identify which key is which without exposing the full secret.

#### Acceptance Criteria

1. THE key prefix SHALL follow the format `orb_api_{first_4_chars}****`
2. THE masked portion SHALL always show exactly 4 asterisks regardless of actual key length
3. WHEN multiple keys exist for the same environment (during rotation), THE prefixes SHALL be distinguishable
4. THE key prefix SHALL be stored in DynamoDB at key creation time

### Requirement 10: DynamoDB Schema Updates

**User Story:** As a developer, I want the API key schema to support the full lifecycle, so that all status transitions and metadata are properly stored.

#### Acceptance Criteria

1. THE ApplicationApiKeys table SHALL include an `activatesAt` timestamp field (optional, for future-dated keys)
2. THE ApplicationApiKeys table SHALL include an `expiresAt` timestamp field (optional, for expiring keys)
3. THE ApplicationApiKeys table SHALL include a `revokedAt` timestamp field (optional, for revoked keys)
4. THE ApplicationApiKeyStatus enum SHALL include values: ACTIVE, ROTATING, REVOKED, EXPIRED
5. THE System SHALL update `updatedAt` timestamp on every status change
