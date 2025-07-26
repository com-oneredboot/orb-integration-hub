# Deployment Guide

## Overview

This guide explains how to deploy the ORB Integration Hub components individually, using AWS CodeArtifact for package management.

## One-Time Setup: Deploy CodeArtifact

Before using the package management system, deploy the CodeArtifact infrastructure:

```bash
cd infrastructure/cloudformation

# Deploy CodeArtifact stack
sam deploy \
  --template-file codeartifact.yml \
  --stack-name orb-integration-hub-codeartifact \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    CustomerId=orb \
    ProjectId=integration-hub \
    Environment=dev
```

This creates:
- A CodeArtifact domain for your organization
- A Python package repository
- IAM roles for access
- SSM parameters for configuration

## Regular Deployment Process

### 1. Python Packages (Manual)

The `deploy-packages.yml` workflow must be triggered manually:

```bash
# From GitHub Actions UI:
# 1. Go to Actions tab
# 2. Select "deploy-packages" workflow
# 3. Click "Run workflow"
# 4. Select environment (dev/staging/prod)
# 5. Run

# Or using GitHub CLI:
gh workflow run deploy-packages.yml \
  -f environment=dev \
  -f skip_tests=false
```

**What it does:**
- Detects which packages have changed
- For orb-common:
  - Runs quality checks → Builds → **Publishes to CodeArtifact**
- For orb-models:
  - Waits for orb-common to publish first
  - Installs latest orb-common from CodeArtifact
  - Runs quality checks → Builds → Publishes

**Important**: The workflow ensures orb-models always uses the latest orb-common from CodeArtifact, not local paths!

**Monitor the deployment:**
```bash
# Check GitHub Actions tab for workflow status
# Or use GitHub CLI:
gh run list --workflow=deploy-packages.yml
```

### 2. Lambda Layers (Manual)

After packages are updated, redeploy Lambda layers to use the new versions:

```bash
# From GitHub Actions UI, trigger deploy-lambda-layers.yml with:
# - environment: dev
# - region: us-east-1
# - Select which layers to deploy (or all)
```

**What it does:**
- Downloads latest packages from CodeArtifact
- Builds Lambda layers with updated dependencies
- Deploys layers to AWS

**Using GitHub CLI:**
```bash
gh workflow run deploy-lambda-layers.yml \
  -f environment=dev \
  -f region=us-east-1 \
  -f deploy_users_security=true \
  -f deploy_organizations_security=true
```

### 3. Backend Services (Manual)

Finally, deploy Lambda functions and other backend services:

```bash
# From GitHub Actions UI, trigger deploy-backend.yml
# Set force_lambda_layer_version_check=yes to ensure latest layers are used
```

**What it does:**
- Generates latest GraphQL schema
- Deploys all backend stacks (Lambda functions, AppSync, etc.)
- Uses the latest Lambda layer versions

## Local Development with CodeArtifact

### Configure Your Environment

```bash
# Run the configuration script
./scripts/configure-codeartifact.sh

# Source the environment file
source .env.codeartifact

# Now pip/pipenv will use CodeArtifact
pipenv install orb-common  # Installs from CodeArtifact
```

### Publishing Packages Locally (for testing)

```bash
cd backend/packages/orb-common

# Build the package
python -m build

# Upload to CodeArtifact (uses environment from configure script)
twine upload dist/*
```

## Troubleshooting

### Package Not Found in CodeArtifact

1. Check if the package was published:
   ```bash
   aws codeartifact list-package-versions \
     --domain orb-integration-hub \
     --repository dev-python-packages \
     --package orb-common \
     --format pypi
   ```

2. Verify your authentication:
   ```bash
   # Re-run configuration
   ./scripts/configure-codeartifact.sh
   source .env.codeartifact
   ```

### Lambda Layer Build Fails

1. Check CodeArtifact connectivity:
   ```bash
   # In the layer directory
   cd backend/src/layers/users_security
   pipenv install --verbose
   ```

2. Verify environment variables are set in the workflow

### Version Conflicts

1. Clear pipenv cache:
   ```bash
   pipenv --clear
   pipenv install
   ```

2. Force specific version:
   ```bash
   pipenv install orb-common==0.1.0
   ```

## Best Practices

1. **Always deploy in order**: Packages → Layers → Backend
2. **Wait for workflows to complete** before triggering the next
3. **Use version pinning** in production for stability
4. **Monitor package versions** in CodeArtifact console
5. **Test locally first** using the configure script

## Rollback Procedure

If issues occur after deployment:

1. **Identify the problematic version**:
   ```bash
   # Check recent package versions
   aws codeartifact list-package-versions \
     --domain orb-integration-hub \
     --repository dev-python-packages \
     --package orb-common \
     --format pypi \
     --max-results 10
   ```

2. **Pin to previous version** in affected Pipfiles:
   ```toml
   [packages]
   orb-common = {version = "==0.1.0", index = "codeartifact"}
   ```

3. **Redeploy** the affected components

## Cost Optimization

- CodeArtifact charges for storage and data transfer
- Delete old package versions periodically:
  ```bash
  # Keep only last 10 versions
  aws codeartifact delete-package-versions \
    --domain orb-integration-hub \
    --repository dev-python-packages \
    --package orb-common \
    --format pypi \
    --versions "0.0.1" "0.0.2"  # List old versions to delete
  ```