# Add Guidance: Use `pipenv sync` for CI with CodeArtifact Dependencies

## Summary

When using `pipenv` in CI workflows with private packages from CodeArtifact, `pipenv install` can fail because it triggers `pipenv lock`, which attempts to resolve all dependencies. Even with `CODEARTIFACT_AUTH_TOKEN` set, the lock process may fail to authenticate properly.

## Problem

In `orb-integration-hub`, our comprehensive testing workflow failed with:

```
CRITICAL:pipenv.patched.pip._internal.resolution.resolvelib.factory:Could not
find a version that satisfies the requirement orb-schema-generator (from
versions: none)
ERROR: No matching distribution found for orb-schema-generator
```

This occurred despite correctly setting `CODEARTIFACT_AUTH_TOKEN` before running `pipenv install --dev`.

## Root Cause

`pipenv install` runs `pipenv lock` when the lock file is out of date, which re-resolves all dependencies. The lock process may not properly use the CodeArtifact authentication token.

## Solution

Use `pipenv sync --dev` instead of `pipenv install --dev` in CI workflows:

```yaml
# ❌ Don't use - triggers lock which may fail
- name: Install dependencies
  run: |
    pip install pipenv
    pipenv install --dev

# ✅ Use sync - installs from existing lock file
- name: Install dependencies
  run: |
    pip install pipenv
    pipenv sync --dev
```

## Recommendation

Add guidance to the CI/CD standards in orb-templates:

1. **Always commit `Pipfile.lock`** - Required for `pipenv sync` to work
2. **Use `pipenv sync` in CI** - Avoids re-locking during CI runs
3. **Run `pipenv lock` locally** - Developers should lock locally with proper CodeArtifact auth, then commit the lock file

### Example Workflow Pattern

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ vars.AWS_CI_ROLE_ARN }}
    aws-region: ${{ vars.AWS_REGION }}

- name: Get CodeArtifact token
  run: |
    TOKEN=$(aws codeartifact get-authorization-token \
      --domain orb-infrastructure-shared-codeartifact-domain \
      --domain-owner 432045270100 \
      --query authorizationToken \
      --output text)
    echo "CODEARTIFACT_AUTH_TOKEN=$TOKEN" >> $GITHUB_ENV

- name: Install dependencies
  run: |
    pip install pipenv
    pipenv sync --dev  # Use sync, not install
```

## Reference Implementation

See `orb-integration-hub/.github/workflows/comprehensive-testing.yml` for a working example.

## Impact

- **Affected**: Any project using pipenv with CodeArtifact private packages
- **Severity**: High - blocks CI pipelines
- **Fix complexity**: Low - simple command change
