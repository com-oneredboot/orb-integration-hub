# AWS CodeArtifact Implementation Plan

## Overview

AWS CodeArtifact will serve as our private Python package repository, enabling proper versioning and distribution of `orb-common` and `orb-models` packages across Lambda layers and functions.

## Benefits of CodeArtifact

1. **Native PyPI Integration**: Works seamlessly with pip and pipenv
2. **Version Management**: Proper semantic versioning for packages
3. **Access Control**: IAM-based permissions for package access
4. **Upstream Repositories**: Can proxy public PyPI for a single source of truth
5. **Cross-Account Access**: Easy sharing across AWS accounts if needed
6. **Audit Trail**: Track who published and consumed packages

## Implementation Steps

### 1. Create CodeArtifact Infrastructure

Create a new CloudFormation template: `infrastructure/cloudformation/codeartifact.yml`

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'AWS CodeArtifact repository for ORB packages'

Parameters:
  CustomerId:
    Type: String
    Default: orb
  ProjectId:
    Type: String
    Default: integration-hub
  Environment:
    Type: String
    AllowedValues: [dev, staging, prod]

Resources:
  CodeArtifactDomain:
    Type: AWS::CodeArtifact::Domain
    Properties:
      DomainName: !Sub '${CustomerId}-${ProjectId}-${Environment}'
      
  CodeArtifactRepository:
    Type: AWS::CodeArtifact::Repository
    Properties:
      DomainName: !GetAtt CodeArtifactDomain.Name
      RepositoryName: python-packages
      Description: 'Private Python packages for ORB Integration Hub'
      ExternalConnections:
        - public:pypi  # Allow fallback to public PyPI
      
  # IAM role for GitHub Actions to publish packages
  CodeArtifactPublisherRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub '${CustomerId}-${ProjectId}-codeartifact-publisher'
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Federated: !Sub 'arn:aws:iam::${AWS::AccountId}:oidc-provider/token.actions.githubusercontent.com'
            Action: 'sts:AssumeRoleWithWebIdentity'
            Condition:
              StringEquals:
                'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com'
              StringLike:
                'token.actions.githubusercontent.com:sub': 'repo:orb-integration-hub/*:*'
      Policies:
        - PolicyName: CodeArtifactPublishPolicy
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - 'codeartifact:PublishPackageVersion'
                  - 'codeartifact:PutPackageMetadata'
                  - 'codeartifact:GetAuthorizationToken'
                  - 'codeartifact:GetRepositoryEndpoint'
                  - 'codeartifact:ReadFromRepository'
                Resource: '*'
              - Effect: Allow
                Action:
                  - 'sts:GetServiceBearerToken'
                Resource: '*'
                Condition:
                  StringEquals:
                    'sts:AWSServiceName': 'codeartifact.amazonaws.com'

Outputs:
  DomainName:
    Value: !GetAtt CodeArtifactDomain.Name
    Export:
      Name: !Sub '${AWS::StackName}-DomainName'
  RepositoryName:
    Value: !GetAtt CodeArtifactRepository.Name
    Export:
      Name: !Sub '${AWS::StackName}-RepositoryName'
  RepositoryArn:
    Value: !GetAtt CodeArtifactRepository.Arn
    Export:
      Name: !Sub '${AWS::StackName}-RepositoryArn'
```

### 2. Update Package Configurations

Update `backend/packages/orb-common/setup.py` and `backend/packages/orb-models/setup.py` to use semantic versioning:

```python
# backend/packages/orb-common/setup.py
from setuptools import setup, find_packages
import os

# Read version from a VERSION file or environment variable
version = os.environ.get('PACKAGE_VERSION', '0.1.0')

setup(
    name='orb-common',
    version=version,
    # ... rest of setup
)
```

### 3. Update deploy-packages.yml Workflow

```yaml
name: deploy-packages

on:
  push:
    branches: [ main, develop, organizations-feature ]
    paths:
      - 'backend/packages/**'
      - '.github/workflows/deploy-packages.yml'
      - 'schemas/**'

env:
  AWS_REGION: us-east-1
  CODEARTIFACT_DOMAIN: orb-integration-hub-prod  # Or use environment-specific

jobs:
  # ... existing detect-changes and test jobs ...

  publish-common:
    name: Publish ORB Common to CodeArtifact
    needs: [build-common]
    if: |
      github.event_name == 'push' && 
      (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop') &&
      needs.build-common.result == 'success'
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.CODEARTIFACT_PUBLISHER_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Get CodeArtifact token
        id: codeartifact
        run: |
          # Get repository endpoint
          REPOSITORY_ENDPOINT=$(aws codeartifact get-repository-endpoint \
            --domain ${{ env.CODEARTIFACT_DOMAIN }} \
            --repository python-packages \
            --format pypi \
            --query repositoryEndpoint \
            --output text)
          
          # Get authorization token
          AUTH_TOKEN=$(aws codeartifact get-authorization-token \
            --domain ${{ env.CODEARTIFACT_DOMAIN }} \
            --query authorizationToken \
            --output text)
          
          echo "::add-mask::$AUTH_TOKEN"
          echo "repository_endpoint=$REPOSITORY_ENDPOINT" >> $GITHUB_OUTPUT
          echo "auth_token=$AUTH_TOKEN" >> $GITHUB_OUTPUT
      
      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: orb-common-dist
          path: ./dist
      
      - name: Publish to CodeArtifact
        env:
          TWINE_USERNAME: aws
          TWINE_PASSWORD: ${{ steps.codeartifact.outputs.auth_token }}
          TWINE_REPOSITORY_URL: ${{ steps.codeartifact.outputs.repository_endpoint }}
        run: |
          pip install twine
          twine upload dist/*
      
      - name: Tag release
        if: github.ref == 'refs/heads/main'
        run: |
          VERSION=$(python -c "import re; content=open('backend/packages/orb-common/setup.py').read(); print(re.search(r'version=['\"]([^'\"]+)['\"]', content).group(1))")
          git tag "orb-common-v${VERSION}" || true
          git push origin "orb-common-v${VERSION}" || true

  publish-models:
    name: Publish ORB Models to CodeArtifact
    needs: [build-models, publish-common]
    # Similar structure to publish-common
    # ...
```

### 4. Update Lambda Layer Pipfiles

Update all Lambda layer Pipfiles to use CodeArtifact:

```toml
[[source]]
url = "https://orb-integration-hub-prod-012345678901.d.codeartifact.us-east-1.amazonaws.com/pypi/python-packages/simple/"
verify_ssl = true
name = "codeartifact"

[[source]]
url = "https://pypi.org/simple"
verify_ssl = true
name = "pypi"

[packages]
orb-common = {version = "*", index = "codeartifact"}
orb-models = {version = "*", index = "codeartifact"}
boto3 = "*"

[requires]
python_version = "3.12"
```

### 5. Update Lambda Build Process

Modify `build_layer.sh` to authenticate with CodeArtifact:

```bash
#!/bin/bash
set -e

# ... existing code ...

# Authenticate with CodeArtifact
echo "Authenticating with CodeArtifact..."
export CODEARTIFACT_AUTH_TOKEN=$(aws codeartifact get-authorization-token \
  --domain ${CODEARTIFACT_DOMAIN} \
  --query authorizationToken \
  --output text)

# Configure pip to use CodeArtifact
REPOSITORY_ENDPOINT=$(aws codeartifact get-repository-endpoint \
  --domain ${CODEARTIFACT_DOMAIN} \
  --repository python-packages \
  --format pypi \
  --query repositoryEndpoint \
  --output text)

# Set pip index URL with authentication
export PIP_INDEX_URL="https://aws:${CODEARTIFACT_AUTH_TOKEN}@${REPOSITORY_ENDPOINT#https://}simple/"

# Now pipenv install will use CodeArtifact
pipenv install
```

### 6. Update deploy-lambda-layers.yml

Add CodeArtifact authentication before building layers:

```yaml
- name: Setup CodeArtifact Authentication
  run: |
    # Get CodeArtifact configuration
    export CODEARTIFACT_DOMAIN="${{ vars.CODEARTIFACT_DOMAIN }}"
    export CODEARTIFACT_AUTH_TOKEN=$(aws codeartifact get-authorization-token \
      --domain $CODEARTIFACT_DOMAIN \
      --query authorizationToken \
      --output text)
    
    # Export for subsequent steps
    echo "CODEARTIFACT_DOMAIN=$CODEARTIFACT_DOMAIN" >> $GITHUB_ENV
    echo "CODEARTIFACT_AUTH_TOKEN=$CODEARTIFACT_AUTH_TOKEN" >> $GITHUB_ENV
    echo "::add-mask::$CODEARTIFACT_AUTH_TOKEN"
```

## Benefits of This Approach

1. **Version Control**: Each package build gets a unique version
2. **Dependency Resolution**: Pipenv/pip handle version constraints properly
3. **Rollback Capability**: Can pin to specific versions if issues arise
4. **Audit Trail**: Know exactly which package versions are in each deployment
5. **Development Flexibility**: Developers can test pre-release versions

## Migration Steps

1. **Week 1**: Deploy CodeArtifact infrastructure
2. **Week 2**: Update deploy-packages.yml to publish to CodeArtifact
3. **Week 3**: Update one Lambda layer as a pilot
4. **Week 4**: Roll out to all layers and functions

## Cost Considerations

- CodeArtifact costs ~$0.05 per GB stored + $0.09 per GB transferred
- For our use case (small packages, infrequent updates), expect < $5/month
- Much cheaper than managing our own package repository

## Security Benefits

- IAM-based access control
- Package signing and verification
- Audit logs for compliance
- No need to expose packages publicly