# Requirements Document

## Introduction

This feature restructures the Application Detail Page to rename the "API Keys" tab to "Security" and reorganize the content to show API keys organized by environment. The Security tab provides a unified location for all application security settings, starting with API key management and designed to accommodate future security features.

## Glossary

- **Application_Detail_Page**: The page component that displays and manages a single application's settings
- **Security_Tab**: The tab within the Application Detail Page that contains security-related settings
- **API_Key**: A secret credential used to authenticate API requests for a specific environment
- **Environment**: A deployment context (PRODUCTION, STAGING, DEVELOPMENT, TEST, PREVIEW)
- **Environment_Key_Row**: A UI row showing an environment and its associated API key status
- **CTA**: Call-to-action button prompting user to take an action

## Requirements

### Requirement 1: Rename API Keys Tab to Security

**User Story:** As a user, I want the API Keys tab renamed to Security, so that the tab can accommodate additional security features in the future.

#### Acceptance Criteria

1. WHEN the Application Detail Page loads, THE Security_Tab SHALL display with a shield icon and "Security" label
2. THE Application_Detail_Page SHALL update the tab enum from `ApiKeys` to `Security`
3. WHEN navigating between tabs, THE Security_Tab SHALL maintain the same position (third tab after Details and Groups)

### Requirement 2: Environment-Based API Key Display

**User Story:** As a user, I want to see my API keys organized by environment, so that I can easily manage keys for each deployment context.

#### Acceptance Criteria

1. WHEN the Security tab is active, THE Security_Tab SHALL display a card titled "API Keys"
2. THE Security_Tab SHALL show one row per environment that is selected for the application
3. WHEN an environment has an active API key, THE Environment_Key_Row SHALL display the key prefix, status badge, and last used date
4. WHEN an environment has no API key, THE Environment_Key_Row SHALL display a "Generate Key" CTA button
5. THE Environment_Key_Row SHALL display the environment name with appropriate styling (production=red, staging=yellow, development=blue, test=purple, preview=gray)

### Requirement 3: API Key Generation from Environment Row

**User Story:** As a user, I want to generate an API key directly from the environment row, so that I can quickly create keys for new environments.

#### Acceptance Criteria

1. WHEN a user clicks "Generate Key" on an Environment_Key_Row, THE System SHALL initiate API key generation for that environment
2. WHEN key generation succeeds, THE System SHALL display the generated key in a modal with copy functionality
3. WHEN key generation succeeds, THE Environment_Key_Row SHALL update to show the new key's prefix and status
4. IF key generation fails, THEN THE System SHALL display an error message and allow retry

### Requirement 4: API Key Management Actions

**User Story:** As a user, I want to manage existing API keys from the environment row, so that I can rotate or revoke keys as needed.

#### Acceptance Criteria

1. WHEN an environment has an active key, THE Environment_Key_Row SHALL display a "Rotate" action button
2. WHEN an environment has an active or rotating key, THE Environment_Key_Row SHALL display a "Revoke" action button
3. WHEN a user clicks "Rotate", THE System SHALL initiate key rotation and update the status to "Rotating"
4. WHEN a user clicks "Revoke", THE System SHALL prompt for confirmation before revoking the key
5. WHEN a key is revoked, THE Environment_Key_Row SHALL update to show "Revoked" status and display "Generate Key" CTA

### Requirement 5: Empty State Handling

**User Story:** As a user, I want clear guidance when no environments are configured, so that I understand what action to take.

#### Acceptance Criteria

1. WHEN the application has no environments selected, THE Security_Tab SHALL display an empty state message
2. THE empty state message SHALL include a link to the Details tab to configure environments
3. WHEN environments are added via the Details tab, THE Security_Tab SHALL automatically show the new environment rows

### Requirement 6: Extensible Security Section Structure

**User Story:** As a developer, I want the Security tab structured to support future security features, so that we can add new sections without major refactoring.

#### Acceptance Criteria

1. THE Security_Tab SHALL use a card-based layout where each security feature is a separate card
2. THE API Keys card SHALL be the first card in the Security tab
3. THE Security_Tab SHALL support adding additional cards for future features (IP allowlists, rate limiting, etc.)
