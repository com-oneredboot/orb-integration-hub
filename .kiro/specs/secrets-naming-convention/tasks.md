# Implementation Plan: Secrets Naming Convention Migration

## Overview

This implementation plan migrates three AWS Secrets Manager secrets from dash-based naming to slash-based naming convention. The migration follows a safe deployment pattern: create new secrets with new names, update all references, then document cleanup of old secrets.

## Tasks

- [x] 1. Add secret_name method to Config module
  - [x] 1.1 Implement Config.secret_name method in `infrastructure/cdk/config.py`
    - Add method that generates `{customer_id}/{project_id}/{environment}/secrets/{service}/{resource}` pattern
    - Include docstring with usage examples
    - _Requirements: 1.1, 1.2_
  
  - [x] 1.2 Write property test for Config.secret_name format
    - **Property 1: Secret Name Format Consistency**
    - **Validates: Requirements 1.1, 1.2**
  
  - [x] 1.3 Write property test for Config.resource_name backward compatibility
    - **Property 2: Resource Name Backward Compatibility**
    - **Validates: Requirements 1.3**

- [x] 2. Update Bootstrap Stack secrets
  - [x] 2.1 Update GitHub Actions secret to use new naming in `infrastructure/cdk/stacks/bootstrap_stack.py`
    - Change `resource_name("github-actions-secret-access-key")` to `secret_name("github", "access-key")`
    - _Requirements: 2.1, 2.2_
  
  - [x] 2.2 Update SMS verification secret to use new naming in `infrastructure/cdk/stacks/bootstrap_stack.py`
    - Change `resource_name("sms-verification-secret")` to `secret_name("sms", "verification")`
    - Update SSM parameter value to reflect new secret name
    - _Requirements: 4.1, 4.4_
  
  - [x] 2.3 Update Lambda execution role IAM policy for new secret path pattern
    - Change Secrets Manager resource pattern from `{prefix}-*` to `{customer_id}/{project_id}/{environment}/secrets/*`
    - _Requirements: 4.2_
  
  - [x] 2.4 Update Bootstrap Stack tests in `infrastructure/cdk/tests/test_bootstrap_stack.py`
    - Update `test_creates_sms_verification_secret` to assert new naming pattern
    - Add test for GitHub Actions secret naming
    - _Requirements: 5.1, 5.2_

- [x] 3. Checkpoint - Verify Bootstrap Stack changes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Update AppSync Stack secrets
  - [x] 4.1 Update GraphQL API key secret to use new naming in `infrastructure/cdk/stacks/appsync_stack.py`
    - Change `resource_name("graphql-api-key")` to `secret_name("appsync", "api-key")`
    - Update SSM parameter value to reflect new secret name
    - _Requirements: 3.1, 3.2_
  
  - [x] 4.2 Update AppSync Stack tests in `infrastructure/cdk/tests/test_appsync_stack.py`
    - Update `test_creates_api_key_secret` to assert new naming pattern
    - Update `test_exports_api_key_secret_name` to verify SSM parameter value
    - _Requirements: 5.3_

- [x] 5. Update Lambda Stack environment variables
  - [x] 5.1 Update SMS verification Lambda environment variable in `infrastructure/cdk/stacks/lambda_stack.py`
    - Change `SMS_VERIFICATION_SECRET_NAME` to use `secret_name("sms", "verification")`
    - _Requirements: 4.2, 4.3_
  
  - [x] 5.2 Update Lambda Stack tests in `infrastructure/cdk/tests/test_lambda_stack.py`
    - Add test to verify `SMS_VERIFICATION_SECRET_NAME` uses new naming pattern
    - _Requirements: 5.4_

- [x] 6. Checkpoint - Verify CDK changes
  - Ensure all CDK tests pass, ask the user if questions arise.

- [x] 7. Update frontend secret retrieval scripts
  - [x] 7.1 Add secretName helper function to `apps/web/scripts/setup-dev-env.js`
    - Add helper that generates `{customerId}/{projectId}/{environment}/secrets/{service}/{resource}` pattern
    - Update FRONTEND_SECRETS_MAP to use new helper for GRAPHQL_API_KEY
    - _Requirements: 6.1, 6.3_
  
  - [x] 7.2 Add secretName helper function to `apps/web/scripts/secrets-retrieval.js`
    - Add helper that generates `{customerId}/{projectId}/{environment}/secrets/{service}/{resource}` pattern
    - Update FRONTEND_SECRETS_MAP to use new helper for GRAPHQL_API_KEY
    - _Requirements: 6.2, 6.3_

- [x] 8. Update CHANGELOG and documentation
  - [x] 8.1 Add entry to CHANGELOG.md under [Unreleased] section
    - Document the secret naming convention migration
    - Reference GitHub Issue #32
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [x] 8.2 Add manual cleanup instructions to design document
    - Document steps to delete old secrets after verification
    - _Requirements: 7.2_

- [x] 9. Final checkpoint - Run all tests
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 10.4_

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Old secrets should be manually deleted after deployment verification (not automated)
- GitHub Issue #32 should be updated with a comment after implementation, but NOT closed directly
