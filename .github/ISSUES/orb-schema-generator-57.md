# Publish orb-schema-generator to orb-infrastructure-shared-pypi-repo

## Summary

The `orb-schema-generator` package is currently published to `orb-infrastructure-shared-codeartifact-repo` but should be published to `orb-infrastructure-shared-pypi-repo` for consistency with other PyPI packages.

## Current State

- Package: `orb-schema-generator`
- Current repository: `orb-infrastructure-shared-codeartifact-repo`
- Expected repository: `orb-infrastructure-shared-pypi-repo`

## Problem

This causes confusion when configuring Pipfiles and pip index URLs:
- The CodeArtifact domain has two repositories with similar names
- `orb-infrastructure-shared-pypi-repo` is the standard PyPI repository
- `orb-infrastructure-shared-codeartifact-repo` is non-standard for PyPI packages

Consumers have to use a different repository URL than expected, leading to failed installs and wasted debugging time.

## Requested Change

Please update the CI/CD pipeline to publish `orb-schema-generator` to `orb-infrastructure-shared-pypi-repo` instead of `orb-infrastructure-shared-codeartifact-repo`.

## Impact

- All consumers of `orb-schema-generator` need to use non-standard repository configuration
- Inconsistent with other orb PyPI packages
- Causes confusion and installation failures

## Environment

- CodeArtifact Domain: `orb-infrastructure-shared-codeartifact-domain`
- Account: `432045270100`
- Region: `us-east-1`
