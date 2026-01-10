# Add CDK pytest tests to deploy-infrastructure workflow

## Context

From: orb-integration-hub  
Related: Infrastructure modernization - CDK migration

## Issue

The current `deploy-infrastructure.yml` workflow uses `cdk synth` for validation, but doesn't run pytest CDK tests. This misses logic errors that synth won't catch.

## Current Behavior

```yaml
- name: CDK Synth
  if: (steps.action.outputs.action == 'synth' || steps.action.outputs.action == 'deploy') && !inputs.skip_tests
  working-directory: infrastructure
  run: |
    pipenv run cdk synth --context environment=${{ steps.action.outputs.environment }}
```

## Recommended Change

Add a pytest step before synth:

```yaml
- name: Run CDK Tests
  if: ${{ github.event.inputs.skip_tests != 'true' }}
  working-directory: infrastructure
  run: |
    echo "🧪 Running CDK infrastructure tests..."
    pipenv run pytest cdk/tests/ -v

- name: CDK Synth
  if: (steps.action.outputs.action == 'synth' || steps.action.outputs.action == 'deploy') && !inputs.skip_tests
  working-directory: infrastructure
  run: |
    pipenv run cdk synth --context environment=${{ steps.action.outputs.environment }}
```

## Benefits

- Catches CDK logic errors before synthesis
- Validates stack configurations match expectations
- Property tests can verify schema consistency
- Aligns with orb-integration-hub pattern

## Priority

Low - Enhancement for better test coverage
