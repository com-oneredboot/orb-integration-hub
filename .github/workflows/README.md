# GitHub Actions Workflows

This directory contains CI/CD workflows for the ORB Integration Hub project.

## Package Distribution with AWS CodeArtifact

The project uses AWS CodeArtifact as a private PyPI repository for distributing `orb-common` and `orb-models` packages. This ensures:
- Proper version management across all deployments
- Consistent package versions in Lambda layers and functions
- Audit trail of package usage
- Secure, private package distribution

### CodeArtifact Setup

1. Deploy CodeArtifact infrastructure:
   ```bash
   # Use the deploy-full-stack workflow with CodeArtifact deployment enabled
   # Or deploy manually:
   sam deploy --template-file infrastructure/cloudformation/codeartifact.yml
   ```

2. Configure local development:
   ```bash
   ./scripts/configure-codeartifact.sh
   source .env.codeartifact
   ```

## Deployment Order

When using CodeArtifact, deploy components in this order:

1. **First Time Setup Only**:
   ```bash
   # Deploy CodeArtifact infrastructure (one-time setup)
   cd infrastructure/cloudformation
   sam deploy --template-file codeartifact.yml \
     --stack-name orb-integration-hub-codeartifact \
     --capabilities CAPABILITY_NAMED_IAM
   ```

2. **Regular Deployments**:
   - `deploy-packages.yml` runs automatically on code changes
   - Then manually trigger `deploy-lambda-layers.yml` if package versions changed
   - Finally run `deploy-backend.yml` to deploy Lambda functions

## Workflows Overview

### deploy-packages.yml
**Purpose**: Build and publish Python packages (orb-common and orb-models) to CodeArtifact.

**Triggers**:
- Push to `main`, `develop`, or `organizations-feature` branches
- Changes to `backend/packages/**`, `schemas/**`, or the workflow file itself

**Features**:
- Smart change detection for efficient builds
- Dependency-aware build order (orb-common → orb-models)
- Comprehensive code quality checks (black, isort, mypy, bandit)
- Automatic publishing to AWS CodeArtifact
- Version management for package releases

**Quality Checks**:
- **Black**: Code formatting (line-length: 100)
- **isort**: Import organization (profile: black)
- **mypy**: Type checking for Python 3.12
- **bandit**: Security vulnerability scanning
- **pytest**: Unit testing with coverage

### deploy-lambda-layers.yml
**Purpose**: Build and deploy Lambda layers when dependencies change.

**Triggers**:
- Push to main branches
- Changes to Lambda layer Pipfiles

### deploy-backend.yml
**Purpose**: Deploy backend Lambda functions and API Gateway resources.

**Triggers**:
- Push to main branches
- Changes to Lambda function code or CloudFormation templates

### deploy-frontend.yml
**Purpose**: Build and deploy the Angular frontend application.

**Triggers**:
- Push to main branches
- Changes to frontend source code

### deploy-frontend-resources.yml
**Purpose**: Deploy frontend infrastructure resources (CloudFront, S3).

**Triggers**:
- Push to main branches
- Changes to frontend CloudFormation templates

### comprehensive-testing.yml
**Purpose**: Run comprehensive test suites across the entire codebase.

**Triggers**:
- Pull requests
- Manual workflow dispatch

## Workflow Dependencies

The workflows are designed to respect dependencies:

1. **Python Packages**: `orb-common` must build before `orb-models`
2. **Lambda Layers**: Depend on Python packages being available
3. **Lambda Functions**: Depend on layers being deployed

## Best Practices

1. **Code Quality**: All Python code must pass quality checks before deployment
2. **Conditional Builds**: Workflows use change detection to avoid unnecessary builds
3. **Failed Builds**: If a dependency fails, dependent jobs are skipped
4. **Environment Variables**: Sensitive data is stored in GitHub Secrets

## Local Testing

Before pushing, run quality checks locally:

```bash
# Python packages
cd backend/packages/orb-common
black .
isort .
mypy orb_common --ignore-missing-imports
pytest

# Lambda functions
cd backend/src/lambdas/users
pipenv run black .
pipenv run isort .
pipenv run pytest
```

## Troubleshooting

### Package Build Failures
1. Check that all quality checks pass locally
2. Verify Pipfile dependencies are correct
3. Ensure pyproject.toml configurations match project standards

### Lambda Deployment Failures
1. Verify Lambda layers are deployed first
2. Check CloudFormation template syntax
3. Ensure IAM permissions are correct

### Frontend Build Failures
1. Run `npm install` and `npm run build` locally
2. Check for TypeScript errors
3. Verify environment variables are set