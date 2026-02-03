# Implementation Tasks: Application Environment Configuration

## Overview

This task list implements the application environment configuration system with dual API keys, CORS origins, rate limits, webhooks, and feature flags.

**Execution Order:** Schema → Generate → Backend → Frontend → Integration Tests

---

## Phase 1: Schema Definitions

- [x] 1. Create schema files for new tables and registries
  - [x] 1.1 Create `schemas/registries/ApplicationApiKeyType.yml` with PUBLISHABLE and SECRET values
  - [x] 1.2 Create `schemas/registries/WebhookEventType.yml` with event types (USER_CREATED, USER_UPDATED, etc.)
  - [x] 1.3 Create `schemas/tables/ApplicationEnvironmentConfig.yml` with all attributes from design
  - [x] 1.4 Update `schemas/tables/ApplicationApiKeys.yml` to add `keyType` and `permissions` fields

- [x] 2. Run schema generation and verify output
  - [x] 2.1 Run `pipenv run orb-schema generate` to generate all artifacts
  - [x] 2.2 Verify generated Python models in `apps/api/models/`
  - [x] 2.3 Verify generated TypeScript models in `apps/web/src/app/core/models/`
  - [x] 2.4 Verify generated CDK constructs in `infrastructure/cdk/generated/`

---

## Phase 2: Backend - Lambda Resolvers

- [-] 3. Implement environment config CRUD operations
  - [x] 3.1 Create `apps/api/lambdas/environment_config/get_config.py` resolver
  - [x] 3.2 Create `apps/api/lambdas/environment_config/update_config.py` resolver
  - [x] 3.3 Create `apps/api/lambdas/environment_config/create_default_configs.py` for new applications
  - [-] 3.4 Add unit tests for environment config resolvers

- [ ] 4. Implement allowed origins management
  - [x] 4.1 Create `apps/api/lambdas/environment_config/add_origin.py` resolver
  - [x] 4.2 Create `apps/api/lambdas/environment_config/remove_origin.py` resolver
  - [x] 4.3 Implement origin validation logic (URL format, wildcard support)
  - [x] 4.4 Add unit tests for origin validation

- [ ] 5. Implement webhook configuration
  - [x] 5.1 Create `apps/api/lambdas/environment_config/update_webhook.py` resolver
  - [x] 5.2 Create `apps/api/lambdas/environment_config/regenerate_webhook_secret.py` resolver
  - [x] 5.3 Implement webhook secret generation (32-char random string)
  - [ ] 5.4 Add unit tests for webhook configuration

- [ ] 6. Implement feature flags management
  - [x] 6.1 Create `apps/api/lambdas/environment_config/set_feature_flag.py` resolver
  - [x] 6.2 Create `apps/api/lambdas/environment_config/delete_feature_flag.py` resolver
  - [x] 6.3 Implement feature flag key validation (snake_case, max 50)
  - [ ] 6.4 Add unit tests for feature flags

- [-] 7. Implement dual key system
  - [x] 7.1 Update `apps/api/lambdas/api_keys/generate_key.py` to support keyType parameter
  - [x] 7.2 Implement publishable key prefix generation (`pk_{env}_{random}`)
  - [x] 7.3 Implement secret key prefix generation (`sk_{env}_{random}`)
  - [x] 7.4 Add unit tests for key generation with types

- [-] 8. Implement enhanced key validation
  - [x] 8.1 Update key validation to detect key type from prefix
  - [x] 8.2 Implement origin validation for publishable keys
  - [x] 8.3 Implement rate limit checking with Redis/DynamoDB counter
  - [x] 8.4 Add rate limit headers to validation response
  - [x] 8.5 Add unit tests for key validation enhancements

---

## Phase 3: GraphQL Schema

- [ ] 9. Define GraphQL types and operations
  - [ ] 9.1 Add `ApplicationEnvironmentConfig` type to schema
  - [ ] 9.2 Add `WebhookConfig` type for nested webhook settings
  - [ ] 9.3 Add `getApplicationEnvironmentConfig` query
  - [ ] 9.4 Add `updateApplicationEnvironmentConfig` mutation
  - [ ] 9.5 Add `addAllowedOrigin` and `removeAllowedOrigin` mutations
  - [ ] 9.6 Add `updateWebhookConfig` and `regenerateWebhookSecret` mutations
  - [ ] 9.7 Add `setFeatureFlag` and `deleteFeatureFlag` mutations
  - [ ] 9.8 Update `generateApiKey` mutation to accept keyType parameter

- [ ] 10. Create VTL resolvers for AppSync
  - [ ] 10.1 Create request/response templates for environment config queries
  - [ ] 10.2 Create request/response templates for environment config mutations
  - [ ] 10.3 Wire resolvers to Lambda functions in CDK

---

## Phase 4: Infrastructure (CDK)

- [x] 11. Deploy new DynamoDB table
  - [x] 11.1 Add ApplicationEnvironmentConfig table to DynamoDB stack
  - [x] 11.2 Configure GSI for OrgEnvIndex
  - [x] 11.3 Update IAM policies for Lambda access to new table

- [ ] 12. Deploy Lambda functions
  - [ ] 12.1 Add environment config Lambda functions to stack
  - [ ] 12.2 Configure environment variables for new Lambdas
  - [ ] 12.3 Update AppSync resolver mappings

- [x] 13. Run CDK tests
  - [x] 13.1 Add unit tests for new table construct
  - [x] 13.2 Add unit tests for new Lambda constructs
  - [x] 13.3 Run `pipenv run pytest infrastructure/cdk/tests/`

---

## Phase 5: Frontend - Angular

- [ ] 14. Create TypeScript GraphQL operations
  - [ ] 14.1 Create `apps/web/src/app/core/graphql/environment-config.graphql.ts`
  - [ ] 14.2 Add queries: getApplicationEnvironmentConfig
  - [ ] 14.3 Add mutations: updateConfig, addOrigin, removeOrigin, updateWebhook, etc.

- [ ] 15. Create NgRx state management
  - [ ] 15.1 Create `apps/web/src/app/features/applications/store/environment-config/` directory
  - [ ] 15.2 Create environment-config.actions.ts
  - [ ] 15.3 Create environment-config.reducer.ts
  - [ ] 15.4 Create environment-config.effects.ts
  - [ ] 15.5 Create environment-config.selectors.ts

- [ ] 16. Create environment configuration UI components
  - [ ] 16.1 Create `EnvironmentConfigTabComponent` for main config view
  - [ ] 16.2 Create `AllowedOriginsComponent` for CORS origin management
  - [ ] 16.3 Create `RateLimitsComponent` for rate limit configuration
  - [ ] 16.4 Create `WebhookConfigComponent` for webhook settings
  - [ ] 16.5 Create `FeatureFlagsComponent` for feature flag management

- [ ] 17. Update Security tab for dual keys
  - [ ] 17.1 Update `SecurityTabComponent` to show publishable and secret key sections
  - [ ] 17.2 Add key type selector to key generation dialog
  - [ ] 17.3 Update key display to show type badges (pk/sk)
  - [ ] 17.4 Add warning message for secret key exposure

- [ ] 18. Add frontend unit tests
  - [ ] 18.1 Add tests for environment-config NgRx store
  - [ ] 18.2 Add tests for environment config components
  - [ ] 18.3 Add tests for key type display logic

---

## Phase 6: Integration & Webhook Delivery

- [ ] 19. Implement webhook delivery system
  - [ ] 19.1 Create SQS queue for webhook events
  - [ ] 19.2 Create `apps/api/lambdas/webhooks/deliver_webhook.py` Lambda
  - [ ] 19.3 Implement HMAC-SHA256 signature generation
  - [ ] 19.4 Implement retry logic with exponential backoff
  - [ ] 19.5 Add CloudWatch metrics for webhook delivery

- [ ] 20. Wire up event sources to webhook queue
  - [ ] 20.1 Update user CRUD operations to publish webhook events
  - [ ] 20.2 Update group CRUD operations to publish webhook events
  - [ ] 20.3 Update role assignment operations to publish webhook events

---

## Phase 7: Testing & Documentation

- [ ] 21. Integration tests
  - [ ] 21.1 Test environment config CRUD flow end-to-end
  - [ ] 21.2 Test publishable key validation with origin checking
  - [ ] 21.3 Test secret key validation without origin checking
  - [ ] 21.4 Test rate limiting behavior
  - [ ] 21.5 Test webhook delivery with signature verification

- [ ] 22. Property-based tests
  - [ ] 22.1 Property: Origin validation accepts valid URLs and rejects invalid
  - [ ] 22.2 Property: Key prefix correctly identifies key type
  - [ ] 22.3 Property: Webhook signature is deterministic for same payload+secret
  - [ ] 22.4 Property: Rate limit headers are consistent with actual limits

- [ ] 23. Documentation updates
  - [ ] 23.1 Update API documentation with new GraphQL operations
  - [ ] 23.2 Add webhook integration guide for consumers
  - [ ] 23.3 Add dual key system documentation
  - [ ] 23.4 Update CHANGELOG.md with new features

---

## Phase 8: Finalization

- [ ] 24. Final verification
  - [ ] 24.1 Run all backend tests: `cd apps/api && pipenv run pytest`
  - [ ] 24.2 Run all frontend tests: `cd apps/web && npm test`
  - [ ] 24.3 Run CDK tests: `cd infrastructure && pipenv run pytest`
  - [ ] 24.4 Run linters: `pipenv run ruff check .` and `npm run lint`
  - [ ] 24.5 Deploy to dev environment and smoke test

- [ ] 25. Git commit and issue updates
  - [ ] 25.1 Commit with message referencing any related issues
  - [ ] 25.2 Update any blocked issues with implementation status
  - [ ] 25.3 Tag release if applicable
