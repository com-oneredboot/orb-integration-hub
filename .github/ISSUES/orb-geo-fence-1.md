## Summary

The `deploy-infrastructure.yml` workflow uses a default fallback for the environment:

```yaml
environment: ${{ github.event.inputs.environment || 'dev' }}
```

This default should be removed to prevent accidental deployments to dev when the environment input is not properly set.

## Current Behavior

If `environment` input is somehow empty or not provided, the workflow defaults to `dev`.

## Expected Behavior

The workflow should fail if `environment` is not explicitly provided, rather than silently defaulting to `dev`.

## Suggested Fix

Change:
```yaml
environment: ${{ github.event.inputs.environment || 'dev' }}
```

To:
```yaml
environment: ${{ github.event.inputs.environment }}
```

## Context

This was identified during orb-integration-hub CDK migration. We want explicit environment selection without fallbacks to prevent accidental deployments.
