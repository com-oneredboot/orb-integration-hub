# CI Environment OIDC Role for CodeArtifact Access

## Summary

We need guidance on how to configure GitHub Actions OIDC authentication for CI workflows that need CodeArtifact access. Specifically, we need to decide whether to:
1. Reuse existing deployment roles for CI
2. Create a dedicated CI role with minimal permissions

## Context

In `orb-integration-hub`, our comprehensive testing workflow needs to install Python packages from CodeArtifact (`orb-common`, `orb-schema-generator`). The workflow runs on:
- Pull requests to main/develop
- Pushes to main/develop
- Manual triggers

Currently, deployment workflows use environment-specific roles via OIDC (`${{ vars.AWS_DEPLOYMENT_ROLE_ARN }}`), but CI tests don't have a dedicated environment/role configured.

## Current Failure

```
CRITICAL:pipenv.patched.pip._internal.resolution.resolvelib.factory:Could not
find a version that satisfies the requirement orb-common (from versions: none)
ERROR: No matching distribution found for orb-common
```

GitHub Actions run: https://github.com/com-oneredboot/orb-integration-hub/actions/runs/20993733372

## Proposed Solution

We've updated the workflow to use OIDC with a `ci` environment:

```yaml
permissions:
  id-token: write
  contents: read

jobs:
  unit-tests:
    environment: ci
    steps:
      - name: Configure AWS credentials (Backend)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_DEPLOYMENT_ROLE_ARN }}
          aws-region: us-east-1
```

## Questions for orb-infrastructure

1. **Role Strategy**: Should CI workflows reuse the `dev` environment role, or should we create a dedicated `ci` role with minimal permissions (just CodeArtifact read access)?

2. **Trust Policy**: If creating a new role, should the trust policy be scoped to specific branches, or allow all refs from the repo?

3. **Standardization**: Should this pattern be documented in orb-templates for other repos to follow?

## Required Permissions for CI Role

If creating a dedicated CI role, it only needs:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "codeartifact:GetAuthorizationToken",
        "codeartifact:GetRepositoryEndpoint",
        "codeartifact:ReadFromRepository"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "sts:GetServiceBearerToken",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "sts:AWSServiceName": "codeartifact.amazonaws.com"
        }
      }
    }
  ]
}
```

## Requested Actions

1. Decide on role strategy (reuse vs dedicated)
2. If dedicated: create the CI role in shared infrastructure
3. Update orb-templates with guidance on configuring CI environments for CodeArtifact access

## Impact

Blocking: CI tests cannot run for any repo that depends on CodeArtifact packages.
