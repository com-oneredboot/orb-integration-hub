# Add Guidance: pipenv + CodeArtifact Package Installation Workaround

## Problem

When using `pipenv` with packages from AWS CodeArtifact, the standard approaches often fail:

1. **Environment variable approach fails**: Setting `CODEARTIFACT_AUTH_TOKEN` and using `${CODEARTIFACT_AUTH_TOKEN}` in Pipfile doesn't work reliably with `pipenv install` or `pipenv update`

2. **pipenv lock fails**: Running `pipenv lock` with CodeArtifact dependencies frequently fails with authentication errors, even with valid tokens

3. **pipenv update fails**: Similar authentication issues when trying to update specific packages

## Working Solution

The reliable workaround is to use `aws codeartifact login --tool pip` before using `pipenv run pip install`:

```bash
# Step 1: Login to CodeArtifact (configures pip directly)
aws --profile sso-orb-dev codeartifact login \
    --tool pip \
    --domain orb-infrastructure-shared-codeartifact-domain \
    --repository orb-infrastructure-shared-pypi-repo

# Step 2: Install/upgrade package using pip through pipenv
pipenv run pip install --upgrade orb-schema-generator

# Step 3: (Optional) Sync lock file if needed
pipenv lock
```

## Why This Works

- `aws codeartifact login --tool pip` configures pip's global config with the auth token
- `pipenv run pip install` uses the pipenv's virtualenv but pip's auth config
- This bypasses pipenv's own CodeArtifact authentication handling which is problematic

## Suggested Documentation Location

Add this guidance to:
1. `docs/integration-guides/codeartifact.md` - Main CodeArtifact integration guide
2. `docs/coding-standards/python.md` - Python standards section on package management

## Impact

This affects all orb projects using pipenv with CodeArtifact packages (orb-schema-generator, orb-common, etc.). Teams waste significant time debugging authentication issues.

## Related

- Issue #37: Add Guidance: Use pipenv sync for CI with CodeArtifact Dependencies
- Issue #40: orb-templates-mcp: uvx cannot authenticate with CodeArtifact
