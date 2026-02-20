# Multi-API AppSync Configuration with orb-schema-generator v2.0.3

## Overview

This document describes how we configured orb-schema-generator v2.0.3 to generate two separate AppSync GraphQL APIs:
1. **Main API** - Cognito authentication for web/mobile users (all tables)
2. **SDK API** - Lambda authorizer authentication for external developers (Users and Applications only)

## Problem Statement

The original architecture used CloudFormation cross-stack exports to pass DynamoDB table references between stacks, resulting in 36 exports. This violates our steering file requirement to avoid CloudFormation exports and use SSM parameters or single-stack architecture instead.

## Solution Architecture

### Target System Approach

orb-schema-generator v2.0.3 uses a **target system** where:
- Each schema file specifies which targets it should be generated for
- Targets are defined in `schema-generator.yml` under each output type (python, typescript, graphql)
- The generator creates separate outputs for each target

### Configuration Structure

```yaml
# schema-generator.yml
version: '2.0'

output:
  code:
    python:
      targets:
        python-main:
          base_dir: ./apps/api
          
    typescript:
      targets:
        ts-main:
          base_dir: ./apps/web/src/app
          
    graphql:
      targets:
        graphql-main:
          base_dir: ./apps/api/graphql
        graphql-sdk:
          base_dir: ./apps/api/graphql-sdk
```

**Key Points:**
- Target names must be unique across ALL generators (v2.0.2+ requirement)
- Python and TypeScript have single targets (models/enums are shared)
- GraphQL has two targets (separate schemas for each API)

### Schema Target Assignment

Each schema file specifies which targets it belongs to:

```yaml
# schemas/tables/Users.yml
type: dynamodb
name: Users
targets:
  - python-main      # Generate Python models
  - ts-main          # Generate TypeScript models
  - graphql-main     # Include in main API schema
  - graphql-sdk      # Include in SDK API schema
```

**Main API tables** (graphql-main only):
- Organizations
- ApplicationRoles
- ApplicationUserRoles
- ApplicationApiKeys
- ApplicationEnvironmentConfig
- Notifications
- OrganizationUsers
- OwnershipTransferRequests
- PrivacyRequests
- SmsRateLimit

**SDK API tables** (both graphql-main and graphql-sdk):
- Users
- Applications

## Generated Artifacts

### GraphQL Schemas

1. **Main API**: `apps/api/graphql/schema.graphql` (76KB)
   - All 12 DynamoDB tables
   - All operations (Create, Update, Delete, Get, List)
   
2. **SDK API**: `apps/api/graphql-sdk/schema.graphql` (7KB)
   - Only Users and Applications tables
   - Limited operations for external developers

### CDK Constructs

1. **AppSyncApi** (auto-generated): `infrastructure/cdk/generated/appsync/api.py`
   - Main API with Cognito authentication
   - References `apps/api/graphql/schema.graphql`
   - All table resolvers

2. **AppSyncSdkApi** (manually created): `infrastructure/cdk/generated/appsync/sdk_api.py`
   - SDK API with Lambda authorizer
   - References `apps/api/graphql-sdk/schema.graphql`
   - Only Users and Applications resolvers

### Shared Resources

These are generated once and shared by both APIs:
- **Python models**: `apps/api/models/`
- **Python enums**: `apps/api/enums/`
- **TypeScript models**: `apps/web/src/app/core/models/`
- **TypeScript enums**: `apps/web/src/app/core/enums/`
- **VTL resolvers**: `infrastructure/cdk/generated/appsync/resolvers/`
- **DynamoDB table constructs**: `infrastructure/cdk/generated/tables/`

## Implementation Steps

### 1. Update Pipfile

```toml
[packages]
orb-schema-generator = {version = "==2.0.3", index = "codeartifact"}
```

### 2. Update schema-generator.yml

- Set `version: '2.0'`
- Define unique target names for each generator
- Create two graphql targets: `graphql-main` and `graphql-sdk`

### 3. Update Schema Files

Update all schema files to use new target names:

```bash
# PowerShell command to update all schemas
Get-ChildItem -Path schemas -Recurse -Filter *.yml | ForEach-Object {
    (Get-Content $_.FullName -Raw) -replace 'targets:\s*\n\s*- api\s*\n', 
    "targets:`n  - python-main`n  - ts-main`n  - graphql-main`n" | 
    Set-Content $_.FullName -NoNewline
}
```

Then manually add `graphql-sdk` target to Users and Applications schemas.

### 4. Run Schema Generation

```bash
export CODEARTIFACT_AUTH_TOKEN=$(aws --profile sso-orb-dev codeartifact get-authorization-token --domain orb-infrastructure-shared-codeartifact-domain --query authorizationToken --output text)
pipenv lock
pipenv sync
pipenv run orb-schema generate
```

### 5. Create SDK API Construct

Create `infrastructure/cdk/generated/appsync/sdk_api.py` with:
- Lambda authorizer configuration
- References to SDK schema
- Only Users and Applications resolvers

### 6. Update AppSync __init__.py

```python
from .api import AppSyncApi as AppSyncApi
from .sdk_api import AppSyncSdkApi as AppSyncSdkApi
```

### 7. Update BackendStack

Instantiate both API constructs in the same stack (eliminates cross-stack exports).

## Benefits

1. **No CloudFormation Exports** - Both APIs in same stack, direct references
2. **Separation of Concerns** - Each API has only the schema it needs
3. **Shared Resources** - Models, enums, and resolvers are reused
4. **Maintainable** - Schema changes automatically propagate to correct APIs
5. **Type Safety** - Generated TypeScript/Python models ensure consistency

## Limitations

1. **Manual SDK Construct** - orb-schema-generator only generates one API construct, we manually created the second
2. **Target Name Uniqueness** - v2.0.2+ requires unique names across all generators
3. **No Separate Resolvers** - VTL resolvers are shared (both APIs use same resolver files)

## Future Improvements

1. Consider contributing SDK API generation to orb-schema-generator
2. Add configuration option to generate multiple API constructs
3. Explore separate resolver directories per API if needed

## References

- orb-schema-generator v2.0.3 documentation
- Example multi-target config: `repositories/orb-schema-generator/examples/schema-generator-v2-multi-target.yml`
- Issue tracking: `.github/ISSUES/orb-schema-generator-multi-api-config.md`
