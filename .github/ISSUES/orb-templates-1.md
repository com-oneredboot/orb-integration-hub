## Summary

Request to add guidance in workflow templates/standards about avoiding default fallbacks for critical inputs like `environment`.

## Problem

Workflows that use fallback defaults like:
```yaml
environment: ${{ github.event.inputs.environment || 'dev' }}
```

Can lead to accidental deployments if the input is not properly set.

## Requested Guidance

Add documentation/standards that recommend:

1. **No fallback defaults for environment selection** - Workflows should fail explicitly if environment is not provided
2. **Use `required: true`** - For critical inputs that must be explicitly set
3. **Project constants in `env:` block** - Values like `CUSTOMER_ID`, `PROJECT_ID` should be in the workflow `env:` block, not as inputs with defaults

## Example Pattern

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy to'
        required: true
        type: environment
        # NO default - must be explicitly selected

env:
  # Project constants go here
  CUSTOMER_ID: orb
  PROJECT_ID: my-project
  AWS_REGION: us-east-1

jobs:
  deploy:
    environment: ${{ github.event.inputs.environment }}  # NO fallback
```

## Context

This was identified during orb-integration-hub CDK migration. Multiple orb projects have this pattern and should be standardized.
