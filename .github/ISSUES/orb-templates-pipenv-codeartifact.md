# Update CodeArtifact Integration Guide for pipenv Package Source Specification

## Problem

The current CodeArtifact integration guide doesn't document that packages from CodeArtifact **must** specify the `index` parameter in the Pipfile. Without this, `pipenv lock` fails to find packages even when `CODEARTIFACT_AUTH_TOKEN` is correctly set.

## Current Behavior

When following the existing guidance:

```toml
[[source]]
url = "https://aws:${CODEARTIFACT_AUTH_TOKEN}@orb-infrastructure-shared-codeartifact-domain-432045270100.d.codeartifact.us-east-1.amazonaws.com/pypi/orb-infrastructure-shared-pypi-repo/simple/"
verify_ssl = true
name = "codeartifact"

[packages]
orb-schema-generator = "==1.1.0"  # ❌ Missing index specification
```

Running `pipenv lock` fails with:
```
CRITICAL:pipenv.patched.pip._internal.resolution.resolvelib.factory:
Could not find a version that satisfies the requirement orb-schema-generator==1.1.0 (from versions: none)
ERROR: No matching distribution found for orb-schema-generator==1.1.0
```

## Root Cause

Pipenv defaults to searching PyPI first when no index is specified. Even though the CodeArtifact source is defined, pipenv doesn't know to use it for specific packages unless explicitly told.

## Solution

Packages from CodeArtifact **must** specify `index = "codeartifact"` in the Pipfile:

```toml
[[source]]
url = "https://aws:${CODEARTIFACT_AUTH_TOKEN}@orb-infrastructure-shared-codeartifact-domain-432045270100.d.codeartifact.us-east-1.amazonaws.com/pypi/orb-infrastructure-shared-pypi-repo/simple/"
verify_ssl = true
name = "codeartifact"

[packages]
orb-schema-generator = {version = "==1.1.0", index = "codeartifact"}  # ✅ Correct
```

With this change, `pipenv lock` works correctly:
```bash
export CODEARTIFACT_AUTH_TOKEN=$(aws --profile sso-orb-dev codeartifact get-authorization-token --domain orb-infrastructure-shared-codeartifact-domain --query authorizationToken --output text)
pipenv lock  # ✅ Now works!
```

## Requested Changes

### 1. Update CodeArtifact Integration Guide

File: `docs/integration-guides/codeartifact.md`

Add a new section under "Python (pip/pipenv)" → "Pipenv Configuration":

```markdown
### Pipenv Configuration

When using pipenv with CodeArtifact packages, you must specify the source index for each private package.

#### Pipfile Setup

```toml
[[source]]
url = "https://pypi.org/simple"
verify_ssl = true
name = "pypi"

[[source]]
url = "https://aws:${CODEARTIFACT_AUTH_TOKEN}@orb-infrastructure-shared-codeartifact-domain-432045270100.d.codeartifact.us-east-1.amazonaws.com/pypi/orb-infrastructure-shared-pypi-repo/simple/"
verify_ssl = true
name = "codeartifact"

[packages]
# ✅ Correct: Specify index for CodeArtifact packages
orb-schema-generator = {version = "==1.1.0", index = "codeartifact"}
orb-common = {version = ">=2.0.0", index = "codeartifact"}

# ❌ Wrong: Without index, pipenv only searches PyPI
# orb-schema-generator = "==1.1.0"

# Public packages don't need index specification
requests = "*"
```

#### Running pipenv lock

```bash
# Export token before running lock
export CODEARTIFACT_AUTH_TOKEN=$(aws --profile sso-orb-dev codeartifact get-authorization-token \
  --domain orb-infrastructure-shared-codeartifact-domain \
  --query authorizationToken \
  --output text)

# Now pipenv lock works correctly
pipenv lock
```

**Why this works:**
- Pipenv expands `${CODEARTIFACT_AUTH_TOKEN}` at runtime when resolving dependencies
- The `index = "codeartifact"` tells pipenv to use the CodeArtifact source for this package
- The token is never stored in Pipfile.lock (only hashes are stored)
```

### 2. Update Project Standards Template

File: `docs/kiro-steering/templates/project-standards.md`

Add a section on "Updating CodeArtifact Packages" with the correct workflow.

### 3. Update MCP Server Responses

The MCP server should include this guidance when responding to queries about CodeArtifact + pipenv.

## Impact

This issue affects all orb projects using pipenv with CodeArtifact packages:
- orb-integration-hub ✅ (fixed)
- orb-schema-generator (if it uses pipenv)
- Any future projects using pipenv + CodeArtifact

## References

- [Pipenv Credentials Documentation](https://pipenv.pypa.io/en/stable/credentials.html)
- Confirmed working in orb-integration-hub (commit: 5198cd6f)

## Verification

After updating the documentation, verify by:
1. Following the new guidance in a fresh project
2. Confirming `pipenv lock` works without errors
3. Confirming `pipenv sync` works in CI

---

**Discovered by**: orb-integration-hub team while upgrading orb-schema-generator from 1.0.1 to 1.1.0
**Date**: 2026-02-06
