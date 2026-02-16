# Add guidance on running CDK tests in deploy workflows

## Context

From: orb-integration-hub  
Related: Infrastructure modernization - CDK migration

## Issue

The current GitHub Actions standards document covers workflow structure and OIDC authentication, but doesn't provide guidance on when/how to run CDK infrastructure tests in deploy workflows.

## Recommendation

Add a section to `docs/github-standards/actions.md` covering:

1. **CDK Test Strategy** - Run pytest CDK tests before `cdk synth` to catch issues early
2. **Skip Tests Flag** - Include `skip_tests` input for emergency deployments
3. **Test vs Synth** - pytest validates logic, synth validates CloudFormation generation

## Suggested Pattern

```yaml
- name: Run CDK Tests
  if: ${{ github.event.inputs.skip_tests != 'true' }}
  working-directory: infrastructure
  run: |
    echo "🧪 Running CDK infrastructure tests..."
    pipenv run pytest cdk/tests/ -v

- name: CDK Synth
  if: ${{ github.event.inputs.action == 'synth' || github.event.inputs.action == 'deploy' }}
  working-directory: infrastructure
  run: |
    pipenv run cdk synth --all --context environment=${{ github.event.inputs.environment }}
```

## Benefits

- Catches CDK logic errors before synthesis
- Property tests validate schema consistency
- Unit tests verify stack configurations
- Emergency bypass available via `skip_tests`

## References

- orb-integration-hub deploy-infrastructure.yml implementation
- orb-geo-fence deploy-infrastructure.yml (currently missing pytest step)
