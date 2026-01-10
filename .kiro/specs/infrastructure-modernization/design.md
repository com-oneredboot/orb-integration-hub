# Design Document: Infrastructure Modernization

## Overview

This design document describes the migration of orb-integration-hub's infrastructure from SAM/CloudFormation templates to AWS CDK, consolidation of GitHub Actions workflows, and restructuring of the infrastructure directory to align with orb-templates standards.

The migration preserves all existing AWS resources while providing:
- Type-safe infrastructure code in Python
- Better IDE support and refactoring capabilities
- Simplified deployment workflows
- Clear separation between infrastructure and website deployments

## Architecture

### Current State

```
infrastructure/
├── cdk/                          # Partial CDK (generated constructs)
│   ├── appsync/
│   └── tables/
├── cloudformation/               # SAM templates (8 files)
│   ├── bootstrap.yml
│   ├── cognito.yml
│   ├── dynamodb.yml
│   ├── lambdas.yml
│   ├── appsync.yml
│   ├── monitoring.yml
│   ├── lambda-layers.yml
│   └── frontend-resources.yml
├── lib/
│   └── backend_stack.py
├── app.py
└── cdk.json

.github/workflows/
├── comprehensive-testing.yml
├── deploy-backend.yml            # SAM-based deployment
├── deploy-frontend.yml           # Builds + deploys website
├── deploy-frontend-resources.yml # CloudFront infrastructure
├── deploy-lambda-layers.yml      # Lambda layers
└── deploy-packages.yml           # Incomplete
```

### Target State

```
infrastructure/
├── cdk/
│   ├── __init__.py
│   ├── app.py                    # CDK app entry point
│   ├── config.py                 # Environment configuration
│   ├── stacks/                   # Stack definitions
│   │   ├── __init__.py
│   │   ├── bootstrap_stack.py
│   │   ├── cognito_stack.py
│   │   ├── dynamodb_stack.py
│   │   ├── lambda_stack.py
│   │   ├── lambda_layers_stack.py
│   │   ├── appsync_stack.py
│   │   ├── monitoring_stack.py
│   │   └── frontend_stack.py
│   ├── constructs/               # Reusable constructs
│   │   ├── __init__.py
│   │   └── tagged_resource.py
│   └── generated/                # orb-schema-generator outputs
│       ├── appsync/
│       └── tables/
├── cdk.json
├── requirements.txt
└── README.md

.github/workflows/
├── comprehensive-testing.yml     # Unchanged
├── deploy-infrastructure.yml     # NEW: CDK-based deployment
├── deploy-website.yml            # NEW: Build + S3 sync + invalidate
└── deploy-lambda-layers.yml      # Keep for now (layer builds)
```

## Components and Interfaces

### CDK Application Structure

```python
# infrastructure/cdk/app.py
from aws_cdk import App, Environment
from stacks.bootstrap_stack import BootstrapStack
from stacks.cognito_stack import CognitoStack
from stacks.dynamodb_stack import DynamoDBStack
from stacks.lambda_layers_stack import LambdaLayersStack
from stacks.lambda_stack import LambdaStack
from stacks.appsync_stack import AppSyncStack
from stacks.monitoring_stack import MonitoringStack
from stacks.frontend_stack import FrontendStack
from config import get_config

app = App()
config = get_config(app)
env = Environment(account=config.account, region=config.region)

# Stack deployment order (dependencies)
bootstrap = BootstrapStack(app, f"{config.prefix}-bootstrap", env=env, config=config)
cognito = CognitoStack(app, f"{config.prefix}-cognito", env=env, config=config)
dynamodb = DynamoDBStack(app, f"{config.prefix}-dynamodb", env=env, config=config)
layers = LambdaLayersStack(app, f"{config.prefix}-layers", env=env, config=config)
lambdas = LambdaStack(app, f"{config.prefix}-lambdas", env=env, config=config,
                      cognito_stack=cognito, dynamodb_stack=dynamodb, layers_stack=layers)
appsync = AppSyncStack(app, f"{config.prefix}-appsync", env=env, config=config,
                       cognito_stack=cognito, dynamodb_stack=dynamodb, lambda_stack=lambdas)
monitoring = MonitoringStack(app, f"{config.prefix}-monitoring", env=env, config=config,
                             appsync_stack=appsync)
frontend = FrontendStack(app, f"{config.prefix}-frontend", env=env, config=config)

app.synth()
```

### Configuration Management

```python
# infrastructure/cdk/config.py
from dataclasses import dataclass
from aws_cdk import App

@dataclass
class Config:
    customer_id: str
    project_id: str
    environment: str
    region: str
    account: str
    sms_origination_number: str
    
    @property
    def prefix(self) -> str:
        return f"{self.customer_id}-{self.project_id}-{self.environment}"

def get_config(app: App) -> Config:
    return Config(
        customer_id=app.node.try_get_context("customer_id") or "orb",
        project_id=app.node.try_get_context("project_id") or "integration-hub",
        environment=app.node.try_get_context("environment") or "dev",
        region=app.node.try_get_context("region") or "us-east-1",
        account=app.node.try_get_context("account") or "",
        sms_origination_number=app.node.try_get_context("sms_origination_number") or "",
    )
```

### Stack Interfaces

Each stack exposes outputs needed by dependent stacks:

| Stack | Exports |
|-------|---------|
| BootstrapStack | build_artifacts_bucket, build_templates_bucket, dead_letter_queue |
| CognitoStack | user_pool, user_pool_client, identity_pool |
| DynamoDBStack | tables (dict of table constructs) |
| LambdaLayersStack | organizations_security_layer, stripe_layer |
| LambdaStack | lambda_functions (dict of function constructs) |
| AppSyncStack | api, api_url, api_key |
| MonitoringStack | dashboard, alarms |
| FrontendStack | distribution, bucket, distribution_id |

### GitHub Workflows

#### deploy-infrastructure.yml

```yaml
name: Deploy Infrastructure

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        type: environment
      action:
        description: 'Action to perform'
        required: true
        type: choice
        options:
          - deploy
          - diff
        default: deploy
      customer_id:
        description: 'Customer ID'
        required: false
        default: 'orb'
      project_id:
        description: 'Project ID'
        required: false
        default: 'integration-hub'

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    environment: ${{ inputs.environment }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - name: Install CDK
        run: |
          npm install -g aws-cdk
          pip install -r infrastructure/cdk/requirements.txt
      - name: CDK Diff
        if: inputs.action == 'diff'
        run: |
          cd infrastructure/cdk
          cdk diff --all \
            -c environment=${{ inputs.environment }} \
            -c customer_id=${{ inputs.customer_id }} \
            -c project_id=${{ inputs.project_id }}
      - name: CDK Deploy
        if: inputs.action == 'deploy'
        run: |
          cd infrastructure/cdk
          cdk deploy --all --require-approval never \
            -c environment=${{ inputs.environment }} \
            -c customer_id=${{ inputs.customer_id }} \
            -c project_id=${{ inputs.project_id }}
```

#### deploy-website.yml

```yaml
name: Deploy Website

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        type: environment
      customer_id:
        description: 'Customer ID'
        required: false
        default: 'orb'
      project_id:
        description: 'Project ID'
        required: false
        default: 'integration-hub'

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    environment: ${{ inputs.environment }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: apps/web/package-lock.json
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - name: Install dependencies
        run: cd apps/web && npm ci
      - name: Build
        run: cd apps/web && npm run build -- --configuration production
      - name: Get CloudFront Distribution ID
        id: cloudfront
        run: |
          DIST_ID=$(aws cloudformation describe-stacks \
            --stack-name ${{ inputs.customer_id }}-${{ inputs.project_id }}-${{ inputs.environment }}-frontend \
            --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" \
            --output text)
          BUCKET=$(aws cloudformation describe-stacks \
            --stack-name ${{ inputs.customer_id }}-${{ inputs.project_id }}-${{ inputs.environment }}-frontend \
            --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" \
            --output text)
          echo "distribution_id=$DIST_ID" >> $GITHUB_OUTPUT
          echo "bucket=$BUCKET" >> $GITHUB_OUTPUT
      - name: Sync to S3
        run: |
          aws s3 sync apps/web/dist/browser \
            s3://${{ steps.cloudfront.outputs.bucket }} \
            --delete
      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ steps.cloudfront.outputs.distribution_id }} \
            --paths "/*"
```

## Data Models

### Stack Configuration

```python
@dataclass
class StackConfig:
    """Base configuration for all stacks"""
    customer_id: str
    project_id: str
    environment: str
    
    @property
    def prefix(self) -> str:
        return f"{self.customer_id}-{self.project_id}-{self.environment}"
    
    def resource_name(self, name: str) -> str:
        return f"{self.prefix}-{name}"
```

### Table Schema Integration

The DynamoDB stack will read table definitions from `schemas/tables/*.yml` to ensure consistency with orb-schema-generator:

```python
def load_table_schemas(schemas_dir: str) -> dict:
    """Load table schemas from YAML files"""
    tables = {}
    for file in Path(schemas_dir).glob("*.yml"):
        with open(file) as f:
            schema = yaml.safe_load(f)
            tables[schema['name']] = schema
    return tables
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: CDK Stack Resource Equivalence

*For any* SAM template resource, the corresponding CDK stack SHALL produce an equivalent CloudFormation resource with the same logical properties (type, configuration, dependencies).

**Validates: Requirements 2.1, 2.3**

### Property 2: Stack Deployment Order Preservation

*For any* set of CDK stacks with dependencies, deploying all stacks SHALL respect the dependency order such that no stack deploys before its dependencies are available.

**Validates: Requirements 2.1**

### Property 3: Configuration Consistency

*For any* environment configuration (dev, staging, prod), all resource names SHALL follow the pattern `{customer_id}-{project_id}-{environment}-{resource_name}`.

**Validates: Requirements 2.4, 3.3, 4.4, 5.5, 6.5, 7.4, 8.5, 9.4, 10.5**

### Property 4: CloudFormation Output Availability

*For any* stack that exports outputs, the deploy-website workflow SHALL be able to retrieve those outputs via CloudFormation describe-stacks API.

**Validates: Requirements 1.3, 12.4**

### Property 5: Workflow Input Ordering

*For any* workflow_dispatch workflow, inputs SHALL be ordered: required inputs first, optional context inputs second, optional flags last.

**Validates: Requirements 12.3**

## Error Handling

### CDK Deployment Errors

| Error Type | Handling Strategy |
|------------|-------------------|
| Stack dependency failure | CDK automatically handles; deployment stops at failed stack |
| Resource creation failure | CloudFormation rollback; CDK reports error |
| IAM permission denied | Fail fast with clear error message |
| Resource limit exceeded | Fail with guidance to request limit increase |

### Website Deployment Errors

| Error Type | Handling Strategy |
|------------|-------------------|
| Build failure | Workflow fails before S3 sync |
| S3 sync failure | Workflow fails; no CloudFront invalidation |
| CloudFront invalidation failure | Log warning; website still updated |
| Stack output not found | Fail with message to deploy infrastructure first |

### Migration Errors

| Error Type | Handling Strategy |
|------------|-------------------|
| Resource drift | Run `cdk diff` before deploy to detect |
| State mismatch | Import existing resources into CDK state |
| Naming conflicts | Use consistent naming convention |

## Testing Strategy

### Unit Tests

Unit tests verify individual CDK constructs produce correct CloudFormation:

```python
# tests/unit/test_bootstrap_stack.py
def test_bootstrap_creates_buckets():
    app = App()
    stack = BootstrapStack(app, "test", config=test_config)
    template = Template.from_stack(stack)
    
    template.resource_count_is("AWS::S3::Bucket", 2)
    template.has_resource_properties("AWS::S3::Bucket", {
        "BucketName": Match.string_like_regexp(".*-build-artifacts")
    })
```

### Property-Based Tests

Property tests verify universal properties across all configurations:

1. **Resource naming consistency** - All resources follow naming convention
2. **Tag propagation** - All resources have required tags
3. **IAM least privilege** - No wildcard permissions where avoidable
4. **Export/import consistency** - All cross-stack references resolve

### Integration Tests

Integration tests verify deployed infrastructure works correctly:

1. **Stack deployment** - All stacks deploy without errors
2. **Cross-stack references** - Outputs are accessible
3. **Website deployment** - S3 sync and CloudFront invalidation work
4. **API connectivity** - AppSync API responds to queries

### Migration Validation

Before removing SAM templates:

1. Run `cdk diff` to compare CDK output with existing resources
2. Deploy CDK stacks to a test environment
3. Verify all resources match expected configuration
4. Run integration tests against CDK-deployed infrastructure
5. Only then remove SAM templates

## Migration Strategy

### Phase 1: Setup CDK Structure

1. Create `infrastructure/cdk/` directory structure
2. Add `requirements.txt` with CDK dependencies
3. Create base configuration and constructs
4. Update `cdk.json` for new structure

### Phase 2: Convert Stacks (One at a Time)

Order of conversion (based on dependencies):

1. **BootstrapStack** - No dependencies, foundational
2. **CognitoStack** - Depends on bootstrap (DLQ)
3. **DynamoDBStack** - No stack dependencies
4. **LambdaLayersStack** - No stack dependencies
5. **LambdaStack** - Depends on cognito, dynamodb, layers
6. **AppSyncStack** - Depends on cognito, dynamodb, lambdas
7. **MonitoringStack** - Depends on appsync
8. **FrontendStack** - No stack dependencies

For each stack:
1. Create CDK stack file
2. Run `cdk synth` to generate CloudFormation
3. Compare with existing SAM template
4. Test deployment to dev environment
5. Verify resources match

### Phase 3: Update Workflows

1. Create `deploy-infrastructure.yml`
2. Create `deploy-website.yml`
3. Test both workflows
4. Delete old workflow files

### Phase 4: Cleanup

1. Remove `infrastructure/cloudformation/` directory
2. Update documentation
3. Update CHANGELOG.md
4. Commit with conventional commit message

## Directory Structure After Migration

```
infrastructure/
├── cdk/
│   ├── __init__.py
│   ├── app.py
│   ├── config.py
│   ├── requirements.txt
│   ├── stacks/
│   │   ├── __init__.py
│   │   ├── bootstrap_stack.py
│   │   ├── cognito_stack.py
│   │   ├── dynamodb_stack.py
│   │   ├── lambda_stack.py
│   │   ├── lambda_layers_stack.py
│   │   ├── appsync_stack.py
│   │   ├── monitoring_stack.py
│   │   └── frontend_stack.py
│   ├── constructs/
│   │   ├── __init__.py
│   │   └── tagged_resource.py
│   └── generated/
│       ├── appsync/
│       └── tables/
├── cdk.json
└── README.md
```
