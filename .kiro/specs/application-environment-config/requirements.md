# Requirements Document

## Introduction

This feature expands the application environment configuration system to support comprehensive per-environment settings. It introduces a new `ApplicationEnvironmentConfig` table for storing environment-specific configurations including CORS allowed origins, rate limits, feature flags, and webhook settings. The feature also implements a dual key system with publishable keys (safe for frontend use) and secret keys (backend only), enabling applications to have both frontend and backend consumers per environment.

## Glossary

- **Application_Environment_Config**: A DynamoDB record containing all configuration settings for a specific application environment
- **Environment**: A deployment context (PRODUCTION, STAGING, DEVELOPMENT, TEST, PREVIEW)
- **Publishable_Key**: An API key safe for frontend use with `pk_` prefix, validated against allowed origins
- **Secret_Key**: A backend-only API key with `sk_` prefix, never exposed to browsers
- **Allowed_Origins**: A list of domain URLs permitted to make requests using publishable keys
- **Rate_Limit**: The maximum number of API requests allowed within a time window
- **Quota**: The total number of API requests allowed within a billing period
- **Webhook**: An HTTP callback that delivers event notifications to external URLs
- **Webhook_Secret**: A shared secret used to sign webhook payloads for verification
- **Feature_Flag**: A boolean or string setting that enables/disables functionality per environment
- **Key_Type**: The classification of an API key as either PUBLISHABLE or SECRET

## Requirements

### Requirement 1: Environment Configuration Table

**User Story:** As an application owner, I want to configure environment-specific settings, so that I can customize behavior for each deployment context.

#### Acceptance Criteria

1. THE System SHALL store environment configurations in an `ApplicationEnvironmentConfig` DynamoDB table
2. THE ApplicationEnvironmentConfig table SHALL use a composite primary key of `applicationId` (partition) and `environment` (sort)
3. WHEN an application is created, THE System SHALL create default configuration records for each selected environment
4. THE ApplicationEnvironmentConfig record SHALL include `allowedOrigins` as an array of URL strings
5. THE ApplicationEnvironmentConfig record SHALL include `rateLimitPerMinute` as a number (default: 60)
6. THE ApplicationEnvironmentConfig record SHALL include `rateLimitPerDay` as a number (default: 10000)
7. THE ApplicationEnvironmentConfig record SHALL include `featureFlags` as a map of string keys to boolean or string values
8. THE ApplicationEnvironmentConfig record SHALL include `metadata` as a map for custom key-value pairs
9. WHEN an environment is removed from an application, THE System SHALL delete the corresponding configuration record

### Requirement 2: Allowed Origins Management

**User Story:** As an application owner, I want to specify allowed origins per environment, so that I can control which domains can use my publishable keys.

#### Acceptance Criteria

1. THE System SHALL validate that allowed origins are valid URL patterns (e.g., `https://example.com`, `https://*.example.com`)
2. WHEN a user adds an allowed origin, THE System SHALL store it in the `allowedOrigins` array
3. THE System SHALL support wildcard subdomains in allowed origins (e.g., `https://*.example.com`)
4. THE System SHALL limit allowed origins to a maximum of 10 per environment
5. WHEN validating a publishable key request, THE System SHALL check the request origin against allowed origins
6. IF the request origin does not match any allowed origin, THEN THE System SHALL reject the request with a 403 error
7. THE System SHALL allow `localhost` origins only for DEVELOPMENT and TEST environments

### Requirement 3: Rate Limiting Configuration

**User Story:** As an application owner, I want to configure rate limits per environment, so that I can protect my API from abuse while allowing different limits for different contexts.

#### Acceptance Criteria

1. THE ApplicationEnvironmentConfig SHALL include `rateLimitPerMinute` with default value of 60
2. THE ApplicationEnvironmentConfig SHALL include `rateLimitPerDay` with default value of 10000
3. WHEN a rate limit is exceeded, THE System SHALL return a 429 Too Many Requests response
4. THE rate limit response SHALL include `Retry-After` header with seconds until reset
5. THE System SHALL track rate limit usage per API key
6. THE System SHALL allow PRODUCTION environments to have higher rate limits than non-production
7. WHEN rate limits are updated, THE System SHALL apply changes immediately to new requests

### Requirement 4: Webhook Configuration

**User Story:** As an application owner, I want to configure webhooks per environment, so that I can receive event notifications at environment-specific endpoints.

#### Acceptance Criteria

1. THE ApplicationEnvironmentConfig SHALL include a `webhook` object with configuration settings
2. THE webhook configuration SHALL include `url` as a required HTTPS URL string
3. THE webhook configuration SHALL include `secret` as a generated 32-character random string
4. THE webhook configuration SHALL include `events` as an array of event type strings to subscribe to
5. THE webhook configuration SHALL include `enabled` as a boolean (default: false)
6. THE webhook configuration SHALL include `retryConfig` with `maxRetries` (default: 3) and `retryDelaySeconds` (default: 60)
7. WHEN a webhook is created, THE System SHALL generate a unique webhook secret
8. THE System SHALL sign webhook payloads using HMAC-SHA256 with the webhook secret
9. THE webhook payload signature SHALL be included in the `X-Webhook-Signature` header
10. IF a webhook delivery fails, THEN THE System SHALL retry according to the retry configuration

### Requirement 5: Dual Key System - Publishable Keys

**User Story:** As an application owner, I want publishable keys for frontend use, so that I can safely embed API credentials in client-side code.

#### Acceptance Criteria

1. THE System SHALL support a `keyType` field on ApplicationApiKeys with values PUBLISHABLE or SECRET
2. WHEN generating a publishable key, THE System SHALL use the prefix `pk_{environment}_{random}`
3. THE publishable key SHALL be validated against the environment's allowed origins
4. THE publishable key SHALL have restricted permissions (read-only operations only)
5. THE System SHALL allow multiple publishable keys per environment (maximum 3)
6. WHEN a publishable key request lacks an Origin header, THE System SHALL reject the request
7. THE publishable key validation SHALL check both the key and the request origin

### Requirement 6: Dual Key System - Secret Keys

**User Story:** As an application owner, I want secret keys for backend use, so that I can authenticate server-to-server API requests with full permissions.

#### Acceptance Criteria

1. WHEN generating a secret key, THE System SHALL use the prefix `sk_{environment}_{random}`
2. THE secret key SHALL NOT be validated against allowed origins
3. THE secret key SHALL have full permissions for all API operations
4. THE System SHALL allow only one active secret key per environment
5. THE secret key SHALL support the same rotation and revocation lifecycle as existing API keys
6. WHEN displaying secret keys in the UI, THE System SHALL mask all but the prefix (e.g., `sk_dev_xxxx****`)
7. THE System SHALL warn users that secret keys must never be exposed in client-side code

### Requirement 7: API Key Validation Enhancement

**User Story:** As a system, I want to validate API keys against environment configuration, so that I can enforce security policies consistently.

#### Acceptance Criteria

1. WHEN validating an API key, THE System SHALL determine the key type from the prefix (`pk_` or `sk_`)
2. WHEN validating a publishable key, THE System SHALL verify the request origin against allowed origins
3. WHEN validating any key, THE System SHALL check rate limits for the environment
4. WHEN rate limits are exceeded, THE System SHALL return 429 with rate limit headers
5. THE validation response SHALL include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers
6. WHEN validation succeeds, THE System SHALL update the `lastUsedAt` timestamp on the key record
7. THE System SHALL log all validation attempts for audit purposes

### Requirement 8: Feature Flags Per Environment

**User Story:** As an application owner, I want to configure feature flags per environment, so that I can enable features progressively across environments.

#### Acceptance Criteria

1. THE ApplicationEnvironmentConfig SHALL include `featureFlags` as a map of string keys to values
2. THE feature flag values SHALL support boolean, string, and number types
3. THE System SHALL provide a GraphQL query to retrieve feature flags for an environment
4. WHEN a feature flag is not set, THE System SHALL return null for that flag
5. THE System SHALL limit feature flags to a maximum of 50 per environment
6. THE feature flag keys SHALL follow snake_case naming convention
7. WHEN updating feature flags, THE System SHALL validate key format before saving

### Requirement 9: Environment Configuration GraphQL API

**User Story:** As a developer, I want GraphQL operations for environment configuration, so that I can manage settings programmatically.

#### Acceptance Criteria

1. THE System SHALL provide `getApplicationEnvironmentConfig` query to retrieve configuration
2. THE System SHALL provide `updateApplicationEnvironmentConfig` mutation to modify configuration
3. THE System SHALL provide `addAllowedOrigin` mutation to add a single origin
4. THE System SHALL provide `removeAllowedOrigin` mutation to remove a single origin
5. THE System SHALL provide `updateWebhookConfig` mutation to modify webhook settings
6. THE System SHALL provide `regenerateWebhookSecret` mutation to generate a new webhook secret
7. THE System SHALL provide `setFeatureFlag` mutation to set a single feature flag
8. THE System SHALL provide `deleteFeatureFlag` mutation to remove a feature flag
9. ALL mutations SHALL require OWNER or EMPLOYEE Cognito group membership

### Requirement 10: Key Type Registry and Schema Updates

**User Story:** As a developer, I want the schema to support the dual key system, so that key types are properly tracked and validated.

#### Acceptance Criteria

1. THE System SHALL create an `ApplicationApiKeyType` registry with values: PUBLISHABLE, SECRET
2. THE ApplicationApiKeys table SHALL include a `keyType` field referencing the registry
3. THE ApplicationApiKeys table SHALL include a `permissions` array field for key capabilities
4. THE existing API key generation flow SHALL default to SECRET key type for backward compatibility
5. THE Security tab UI SHALL display separate sections for publishable and secret keys
6. WHEN listing keys, THE System SHALL group them by key type within each environment
