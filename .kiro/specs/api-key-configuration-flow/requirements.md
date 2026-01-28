# Requirements Document

## Introduction

This feature ensures applications remain in PENDING status until all environments have API keys configured, and provides dashboard CTAs to guide users through completing their application setup.

## Glossary

- **Application**: A registered application in the integration hub
- **Environment**: A deployment target (Production, Staging, Development, Test, Preview)
- **API_Key**: An authentication credential for an environment
- **Dashboard_CTA_Service**: Service that generates call-to-action cards for the dashboard
- **Security_Tab**: The tab on Application Detail Page showing API key configuration

## Requirements

### Requirement 1: Application Status Validation

**User Story:** As a platform administrator, I want applications to remain PENDING until fully configured, so that incomplete applications cannot be used in production.

#### Acceptance Criteria

1. WHEN a user attempts to activate an application THEN the System SHALL verify all selected environments have active API keys
2. IF any environment lacks an active API key THEN the System SHALL keep the application in PENDING status
3. WHEN all environments have active API keys THEN the System SHALL allow the application to transition to ACTIVE status
4. WHEN an application is in PENDING status due to missing API keys THEN the System SHALL display a warning message indicating which environments need configuration

### Requirement 2: Dashboard CTA for Missing API Keys

**User Story:** As a user, I want to see a dashboard notification when my applications need API key configuration, so that I can complete setup.

#### Acceptance Criteria

1. WHEN a user has applications with missing API keys THEN the Dashboard_CTA_Service SHALL generate a CTA card for each such application
2. THE CTA card SHALL display with medium severity (yellow) styling
3. THE CTA card SHALL show the application name and number of environments needing keys
4. WHEN the user clicks the CTA action button THEN the System SHALL navigate to the application's Security tab
5. WHEN all environments for an application have active API keys THEN the Dashboard_CTA_Service SHALL NOT generate a CTA for that application

### Requirement 3: Inline Key Display After Generation

**User Story:** As a user, I want to see and copy my newly generated API key inline, so that I can save it before it's hidden.

#### Acceptance Criteria

1. WHEN an API key is successfully generated THEN the Security_Tab SHALL display the full key inline in the environment row
2. THE inline key display SHALL include a copy-to-clipboard button
3. THE inline key display SHALL include a warning that the key won't be shown again
4. WHEN the user navigates away from the Security tab THEN the System SHALL clear the displayed key from state
5. WHEN the user returns to the Security tab THEN the System SHALL show only the key prefix (not the full key)

### Requirement 4: Activation Flow Update

**User Story:** As a user, I want clear feedback when I try to activate an incomplete application, so that I know what steps remain.

#### Acceptance Criteria

1. WHEN a user clicks "Activate Application" with missing API keys THEN the System SHALL display an error message listing the environments that need keys
2. THE error message SHALL include a link or button to navigate to the Security tab
3. WHEN all API keys are configured THEN the "Activate Application" button SHALL successfully transition the application to ACTIVE status
