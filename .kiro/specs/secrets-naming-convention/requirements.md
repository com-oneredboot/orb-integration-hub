# Requirements Document

## Introduction

This document specifies the requirements for migrating three AWS Secrets Manager secrets from dash-based naming to slash-based naming convention. The migration aligns Secrets Manager naming with the existing SSM Parameter Store convention used throughout the orb-integration-hub project, ensuring consistency across all AWS resource naming.

The migration addresses GitHub Issue #32 and follows the pattern established in orb-templates #39.

## Glossary

- **Secret**: An AWS Secrets Manager resource storing sensitive configuration values
- **CDK_Stack**: AWS CDK infrastructure code that defines and deploys AWS resources
- **Config**: The configuration module (`infrastructure/cdk/config.py`) that generates resource names
- **SSM_Parameter**: AWS Systems Manager Parameter Store resource for non-sensitive configuration
- **Naming_Convention**: The pattern `/{customer_id}/{project_id}/{environment}/secrets/{service}/{resource}` for secrets

## Requirements

### Requirement 1: Add Secret Naming Method to Config

**User Story:** As a developer, I want a dedicated method for generating secret names, so that all secrets follow the consistent slash-based naming convention.

#### Acceptance Criteria

1. THE Config SHALL provide a `secret_name` method that generates names following the pattern `/{customer_id}/{project_id}/{environment}/secrets/{service}/{resource}`
2. WHEN the `secret_name` method is called with service and resource parameters, THE Config SHALL return a properly formatted secret name
3. THE Config SHALL maintain backward compatibility with existing `resource_name` method for non-secret resources

### Requirement 2: Migrate GitHub Actions Secret Access Key

**User Story:** As a DevOps engineer, I want the GitHub Actions secret access key to use the new naming convention, so that it follows organizational standards.

#### Acceptance Criteria

1. WHEN the Bootstrap_Stack creates the GitHub Actions secret, THE CDK_Stack SHALL use the name `orb/integration-hub/dev/secrets/github/access-key`
2. THE CDK_Stack SHALL create the secret with the new name format using the Config `secret_name` method
3. WHEN the secret is created, THE CDK_Stack SHALL store the secret name in an SSM_Parameter for reference

### Requirement 3: Migrate GraphQL API Key Secret

**User Story:** As a frontend developer, I want the GraphQL API key secret to use the new naming convention, so that secret retrieval scripts work consistently.

#### Acceptance Criteria

1. WHEN the AppSync_Stack creates the API key secret, THE CDK_Stack SHALL use the name `orb/integration-hub/dev/secrets/appsync/api-key`
2. THE CDK_Stack SHALL update the SSM_Parameter that stores the secret name to reflect the new naming
3. WHEN frontend scripts retrieve the secret, THE scripts SHALL use the new slash-based naming pattern
4. THE frontend scripts SHALL use the Config-equivalent naming pattern `/{customerId}/{projectId}/{environment}/secrets/appsync/api-key`

### Requirement 4: Migrate SMS Verification Secret

**User Story:** As a backend developer, I want the SMS verification secret to use the new naming convention, so that Lambda functions can retrieve it consistently.

#### Acceptance Criteria

1. WHEN the Bootstrap_Stack creates the SMS verification secret, THE CDK_Stack SHALL use the name `orb/integration-hub/dev/secrets/sms/verification`
2. THE CDK_Stack SHALL update the Lambda environment variable `SMS_VERIFICATION_SECRET_NAME` to use the new secret name
3. WHEN the Lambda_Stack references the secret name, THE CDK_Stack SHALL use the Config `secret_name` method
4. THE CDK_Stack SHALL update the SSM_Parameter that stores the secret name to reflect the new naming

### Requirement 5: Update CDK Tests

**User Story:** As a developer, I want the CDK tests to verify the new naming convention, so that regressions are caught during development.

#### Acceptance Criteria

1. WHEN tests verify secret creation, THE tests SHALL assert the new slash-based naming pattern
2. THE tests SHALL verify that the Bootstrap_Stack creates secrets with names matching `{prefix}/secrets/{service}/{resource}` pattern
3. THE tests SHALL verify that the AppSync_Stack creates the API key secret with the new naming pattern
4. THE tests SHALL verify that Lambda environment variables reference the new secret names

### Requirement 6: Update Frontend Secret Retrieval Scripts

**User Story:** As a frontend developer, I want the secret retrieval scripts to use the new naming convention, so that local development setup works correctly.

#### Acceptance Criteria

1. WHEN the setup-dev-env.js script retrieves the GraphQL API key, THE script SHALL use the new slash-based secret name
2. WHEN the secrets-retrieval.js script retrieves secrets, THE script SHALL use the new slash-based naming pattern
3. THE scripts SHALL generate secret names using the pattern `/{customerId}/{projectId}/{environment}/secrets/{service}/{resource}`

### Requirement 7: Maintain Deployment Safety

**User Story:** As a DevOps engineer, I want the migration to be safe for existing deployments, so that no service disruption occurs.

#### Acceptance Criteria

1. WHEN new secrets are deployed, THE CDK_Stack SHALL create new secrets with the new names before removing old references
2. IF old secrets exist with dash-based names, THEN THE documentation SHALL provide manual cleanup instructions
3. THE migration SHALL NOT delete existing secrets automatically to prevent data loss

### Requirement 8: Update CHANGELOG and Version

**User Story:** As a developer, I want the CHANGELOG to reflect this migration, so that changes are properly tracked per orb-templates standards.

#### Acceptance Criteria

1. WHEN the migration is complete, THE CHANGELOG.md SHALL include a new version entry documenting the secret naming changes
2. THE CHANGELOG entry SHALL reference GitHub Issue #32
3. THE version bump SHALL follow semantic versioning conventions

### Requirement 9: Update GitHub Issue

**User Story:** As a project maintainer, I want GitHub Issue #32 to be updated with implementation details, so that the issue creator can verify and close.

#### Acceptance Criteria

1. WHEN the migration is complete, THE developer SHALL post a comment on GitHub Issue #32 summarizing the changes
2. THE comment SHALL list all files modified and the nature of changes
3. THE comment SHALL invite the issue creator to verify and close the issue
4. THE developer SHALL NOT close the issue directly per orb-templates guidance

### Requirement 10: Ensure Unit Test Coverage

**User Story:** As a developer, I want comprehensive unit test coverage for the naming convention changes, so that regressions are prevented.

#### Acceptance Criteria

1. THE tests SHALL achieve coverage for all new `secret_name` method code paths
2. THE tests SHALL verify correct secret name generation for all three migrated secrets
3. THE tests SHALL verify Lambda environment variables contain correct secret names
4. WHEN tests are run, THE test suite SHALL pass with no failures
