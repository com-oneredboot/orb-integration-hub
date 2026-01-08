# Secure Build Scripts

This directory contains scripts for implementing secure build-time secret injection for the frontend application.

## Overview

The secure build system replaces placeholder tokens in environment files with actual secret values during the build process, ensuring that sensitive credentials never exist in the source code.

## Scripts

### `secrets-retrieval.js`
Retrieves secrets from AWS Secrets Manager and SSM Parameter Store based on environment.

**Usage:**
```bash
node scripts/secrets-retrieval.js [environment]
```

**Features:**
- Supports dev, staging, and prod environments
- Uses AWS SDK v3 for Secrets Manager and SSM Parameter Store
- Validates AWS credentials and environment
- Creates temporary `.secrets-temp.json` file with restricted permissions (0o600)
- Automatic cleanup on process exit

### `replace-secrets.js`
Performs string replacement of placeholder tokens with actual secret values in built files.

**Usage:**
```bash
node scripts/replace-secrets.js [environment]
```

**Features:**
- Processes all JavaScript, JSON, HTML, and CSS files in dist/ directory
- Replaces `{{TOKEN_NAME}}` patterns with actual values
- Comprehensive logging and statistics
- Build validation to ensure no unreplaced tokens remain
- Automatic cleanup of temporary secrets file

### `test-replace-secrets.js`
Test script for the string replacement system using mock data.

**Usage:**
```bash
node scripts/test-replace-secrets.js
```

**Features:**
- Creates mock secrets and test files
- Validates replacement functionality
- Verifies no unreplaced tokens remain
- Automatic cleanup of test files

## NPM Scripts

### Secure Build Commands

```bash
# Development build with secrets
npm run build:secure:dev

# Staging build with secrets  
npm run build:secure:staging

# Production build with secrets
npm run build:secure:prod

# Default secure build (dev)
npm run build:secure
```

### Individual Components

```bash
# Retrieve secrets only
npm run secrets:retrieve:dev
npm run secrets:retrieve:staging  
npm run secrets:retrieve:prod

# Replace secrets only (requires existing .secrets-temp.json)
npm run secrets:replace:dev
npm run secrets:replace:staging
npm run secrets:replace:prod

# Test the replacement system
npm run test:secrets
```

## Build Process Flow

1. **Clean**: Remove existing dist/ directory
2. **Angular Build**: Standard Angular build with placeholder tokens
3. **Secrets Retrieval**: Fetch actual values from AWS
4. **String Replacement**: Replace placeholders with real values
5. **Validation**: Ensure no unreplaced tokens remain
6. **Cleanup**: Remove temporary secrets file

## Environment Variables

### Required AWS Credentials
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `AWS_REGION`: AWS region (defaults to us-east-1)

### Optional Configuration
- `ENVIRONMENT`: Target environment (dev/staging/prod)
- `CUSTOMER_ID`: Customer identifier (defaults to orb)
- `PROJECT_ID`: Project identifier (defaults to integration-hub)

## Token Format

Placeholder tokens in source files use the format:
```
{{TOKEN_NAME}}
```

### Supported Tokens
- `{{COGNITO_USER_POOL_ID}}`: Cognito User Pool ID
- `{{COGNITO_CLIENT_ID}}`: Cognito User Pool Client ID  
- `{{COGNITO_QR_ISSUER}}`: QR code issuer for TOTP MFA
- `{{GRAPHQL_API_URL}}`: GraphQL API endpoint URL
- `{{AWS_REGION}}`: AWS region
- `{{GRAPHQL_API_KEY}}`: GraphQL API key

## Security Features

- Temporary secrets file has restricted permissions (0o600)
- Automatic cleanup prevents credential persistence
- Build validation ensures no sensitive data remains unreplaced
- GitHub Actions compatible with existing AWS credential setup
- Clear separation between parameters (public) and secrets (private)

## Error Handling

- Validates AWS credentials before processing
- Fails fast on missing critical secrets
- Comprehensive error logging and statistics
- Non-zero exit codes on failures for CI/CD integration
- Graceful handling of missing or malformed files

## Infrastructure Requirements

The scripts expect the following AWS resources to exist:

### SSM Parameters
- `${CustomerId}-${ProjectId}-${Environment}-cognito-user-pool-id`
- `${CustomerId}-${ProjectId}-${Environment}-cognito-client-id`
- `${CustomerId}-${ProjectId}-${Environment}-cognito-qr-issuer`
- `${CustomerId}-${ProjectId}-${Environment}-graphql-api-url`

### Secrets Manager
- `${CustomerId}-${ProjectId}-${Environment}-graphql-api-key`

These resources are created by the CloudFormation stacks (cognito.yml, appsync.yml).