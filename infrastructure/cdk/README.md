# CDK Infrastructure for orb-integration-hub

This directory contains AWS CDK infrastructure code for the orb-integration-hub project.

## Stack Structure

The infrastructure is organized into 7 stacks with the following dependency graph:

```
┌─────────────┐
│  Bootstrap  │
└──────┬──────┘
       │
       ├──────────────┬──────────────┬──────────────┐
       │              │              │              │
┌──────▼──────┐  ┌───▼────┐  ┌──────▼──────┐  ┌───▼────┐
│    Data     │  │  Auth  │  │  Frontend   │  │ Layers │
└──────┬──────┘  └───┬────┘  └─────────────┘  └────────┘
       │             │                          (deployed
       │             │                           separately)
       └──────┬──────┘
              │
       ┌──────▼──────┐
       │   Compute   │
       └──────┬──────┘
              │
       ┌──────▼──────┐
       │     API     │
       └──────┬──────┘
              │
       ┌──────▼──────┐
       │ Monitoring  │
       └─────────────┘
```

### Stack Descriptions

The stacks use descriptive names that reflect their purpose rather than the underlying technology:

| Stack | Description | Dependencies | Technologies |
|-------|-------------|--------------|--------------|
| Bootstrap | S3 buckets, IAM users, SQS queues | None | S3, IAM, SQS |
| Data | All DynamoDB tables | Bootstrap | DynamoDB |
| Authorization | User Pool, Identity Pool, Groups, API Key Authorizer | Bootstrap, Data | Cognito, Lambda |
| Frontend | S3 bucket, CloudFront distribution | Bootstrap | S3, CloudFront |
| Compute | Lambda functions for business logic | Authorization, Data | Lambda |
| API | Main and SDK GraphQL APIs | Data, Compute, Authorization | AppSync |
| Monitoring | CloudWatch dashboards, alarms, GuardDuty | API | CloudWatch, GuardDuty |

**Note:** Lambda Layers stack is deployed separately via the `deploy-lambda-layers` workflow to avoid CloudFormation cross-stack export issues when layer versions change.

### Rationale for Descriptive Naming

The stacks are named based on their function rather than technology:
- **Data** instead of DynamoDB - describes what it provides (data storage)
- **Authorization** instead of Cognito - describes its purpose (authentication and authorization)
- **Compute** instead of Lambda - describes its role (business logic computation)
- **API** instead of AppSync - describes what it exposes (API layer)

This naming convention:
- Makes the architecture more understandable to new team members
- Allows technology changes without renaming stacks
- Aligns with domain-driven design principles
- Improves clarity in deployment logs and AWS Console

## Configuration

Configuration is managed through CDK context values. These can be set in:

1. `cdk.json` (default values)
2. Command line: `cdk deploy -c environment=prod`

### Context Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `customer_id` | Customer identifier | `orb` |
| `project_id` | Project identifier | `integration-hub` |
| `environment` | Deployment environment | `dev` |
| `region` | AWS region | `us-east-1` |
| `account` | AWS account ID | (from environment) |
| `sms_origination_number` | SMS origination number | (required) |
| `alert_email` | Email for security alerts | (optional) |

## Deployment Commands

### Prerequisites

1. Install AWS CDK CLI:
   ```bash
   npm install -g aws-cdk
   ```

2. Install Python dependencies:
   ```bash
   cd infrastructure
   pipenv install --dev
   ```

3. Configure AWS credentials:
   ```bash
   aws configure --profile sso-orb-dev
   ```

### Synthesize Templates

Generate CloudFormation templates without deploying:

```bash
cd infrastructure
pipenv run cdk synth --all
```

### View Changes (Diff)

Compare local changes with deployed stacks:

```bash
cd infrastructure
pipenv run cdk diff --all
```

### Deploy All Stacks

Deploy all stacks in dependency order:

```bash
cd infrastructure
pipenv run cdk deploy --all --require-approval never
```

### Deploy Specific Stack

Deploy a single stack:

```bash
cd infrastructure
pipenv run cdk deploy orb-integration-hub-dev-api
```

### Deploy with Custom Context

Override context values:

```bash
cd infrastructure
pipenv run cdk deploy --all \
  -c environment=prod \
  -c customer_id=acme \
  -c alert_email=alerts@acme.com
```

## Testing

Run unit tests for all stacks:

```bash
cd infrastructure
pipenv run pytest cdk/tests/ -v
```

Run tests for a specific stack:

```bash
cd infrastructure
pipenv run pytest cdk/tests/test_authorization_stack.py -v
```

## Directory Structure

```
infrastructure/cdk/
├── app.py              # CDK app entry point
├── config.py           # Configuration management
├── stacks/             # Stack definitions
│   ├── __init__.py
│   ├── api_stack.py           # Main and SDK GraphQL APIs
│   ├── authorization_stack.py # Cognito + API Key Authorizer
│   ├── bootstrap_stack.py     # S3, IAM, SQS
│   ├── compute_stack.py       # Lambda functions
│   ├── data_stack.py          # DynamoDB tables
│   ├── frontend_stack.py      # S3 + CloudFront
│   ├── lambda_layers_stack.py # Shared Lambda layers
│   └── monitoring_stack.py    # CloudWatch + GuardDuty
├── shared_constructs/  # Reusable constructs
│   └── tagged_resource.py
└── tests/              # Unit tests
    ├── test_api_stack.py
    ├── test_authorization_stack.py
    ├── test_bootstrap_stack.py
    ├── test_compute_stack.py
    ├── test_data_stack.py
    ├── test_frontend_stack.py
    ├── test_lambda_layers_stack.py
    └── test_monitoring_stack.py
```

## Resource Naming Convention

All resources follow the naming pattern:

```
{customer_id}-{project_id}-{environment}-{resource_name}
```

Example: `orb-integration-hub-dev-appsync`

## SSM Parameters

Each stack exports key values to SSM Parameter Store for cross-stack references using path-based naming.

### Naming Convention

SSM parameters follow the path-based naming pattern aligned with orb-schema-generator conventions:

```
/{customer_id}/{project_id}/{environment}/{resource-type}/{resource-name}/{attribute}
```

Example: `/orb/integration-hub/dev/cognito/user-pool-id`

### Parameter Reference by Stack

#### Authorization Stack (`/orb/integration-hub/{env}/cognito/` and `/orb/integration-hub/{env}/lambda/`)

| Parameter Path | Description |
|----------------|-------------|
| `/orb/integration-hub/{env}/cognito/user-pool-id` | Cognito User Pool ID |
| `/orb/integration-hub/{env}/cognito/client-id` | Cognito User Pool Client ID |
| `/orb/integration-hub/{env}/cognito/identity-pool-id` | Cognito Identity Pool ID |
| `/orb/integration-hub/{env}/cognito/user-pool-arn` | Cognito User Pool ARN |
| `/orb/integration-hub/{env}/cognito/qr-issuer` | MFA QR code issuer name |
| `/orb/integration-hub/{env}/cognito/phone-number-verification-topic/arn` | SNS topic for phone verification |
| `/orb/integration-hub/{env}/lambda/authorizer/arn` | API Key Authorizer Lambda ARN |

#### Data Stack (`/orb/integration-hub/{env}/dynamodb/`)

| Parameter Path | Description |
|----------------|-------------|
| `/orb/integration-hub/{env}/dynamodb/{table-name}/table-arn` | Table ARN |
| `/orb/integration-hub/{env}/dynamodb/{table-name}/table-name` | Table name |

Tables: `users`, `organizations`, `organizationusers`, `applications`, `applicationusers`, `applicationroles`, `applicationapikeys`, `applicationenvironmentconfig`, `applicationuserroles`, `notifications`, `privacyrequests`, `ownershiptransferrequests`, `smsratelimit`

#### Lambda Layers Stack (`/orb/integration-hub/{env}/lambda-layers/`)

| Parameter Path | Description |
|----------------|-------------|
| `/orb/integration-hub/{env}/lambda-layers/{layer-name}/arn` | Lambda layer ARN |

Layers: `common`, `authentication-dynamodb`, `organizations-security`, `stripe`

#### Compute Stack (`/orb/integration-hub/{env}/lambda/`)

| Parameter Path | Description |
|----------------|-------------|
| `/orb/integration-hub/{env}/lambda/{function-name}/arn` | Lambda function ARN |

Functions: `sms-verification`, `pre-cognito-claims`, `cognito-group-manager`, `user-status-calculator`, `contact-us`, `stripe`, `stripe-publishable-key`, `paypal`, `organizations`, `ownership-transfer-service`, `privacy-rights-resolver`, `kms-cleanup-orphaned`, `check-email-exists`, `create-user-from-cognito`, `get-current-user`, `get-application-users`

#### Bootstrap Stack (`/orb/integration-hub/{env}/`)

| Parameter Path | Description |
|----------------|-------------|
| `/orb/integration-hub/{env}/sqs/alerts-queue/arn` | Alerts SQS queue ARN |
| `/orb/integration-hub/{env}/sqs/alerts-queue/url` | Alerts SQS queue URL |
| `/orb/integration-hub/{env}/iam/ci-user/arn` | CI user ARN |
| `/orb/integration-hub/{env}/iam/ci-user/access-key-id` | CI user access key ID |
| `/orb/integration-hub/{env}/secrets/ci-user-secret-key/arn` | CI user secret key ARN |

#### API Stack (`/orb/integration-hub/{env}/appsync/`)

| Parameter Path | Description |
|----------------|-------------|
| `/orb/integration-hub/{env}/appsync/main/api-id` | Main AppSync API ID |
| `/orb/integration-hub/{env}/appsync/main/api-url` | Main AppSync GraphQL endpoint URL |
| `/orb/integration-hub/{env}/appsync/main/api-key` | Main AppSync API key |
| `/orb/integration-hub/{env}/appsync/sdk/api-id` | SDK AppSync API ID |
| `/orb/integration-hub/{env}/appsync/sdk/api-url` | SDK AppSync GraphQL endpoint URL |

**Note:** The API Stack contains both the Main API (Cognito authentication) and SDK API (Lambda authorizer with API keys).

#### Frontend Stack (`/orb/integration-hub/{env}/frontend/`)

| Parameter Path | Description |
|----------------|-------------|
| `/orb/integration-hub/{env}/frontend/bucket-name` | S3 bucket name |
| `/orb/integration-hub/{env}/frontend/bucket-arn` | S3 bucket ARN |
| `/orb/integration-hub/{env}/frontend/distribution-id` | CloudFront distribution ID |
| `/orb/integration-hub/{env}/frontend/distribution-domain` | CloudFront domain name |

#### Monitoring Stack (`/orb/integration-hub/{env}/monitoring/`)

| Parameter Path | Description |
|----------------|-------------|
| `/orb/integration-hub/{env}/monitoring/audit-log-group/name` | CloudWatch audit log group name |
| `/orb/integration-hub/{env}/monitoring/audit-log-group/arn` | CloudWatch audit log group ARN |
| `/orb/integration-hub/{env}/monitoring/dashboard/name` | CloudWatch dashboard name |

### Using SSM Parameters in Code

```python
from aws_cdk import aws_ssm as ssm

# Write a parameter
ssm.StringParameter(
    self, "UserPoolIdParam",
    parameter_name=config.ssm_parameter_name("cognito/user-pool-id"),
    string_value=user_pool.user_pool_id,
)

# Read a parameter
user_pool_id = ssm.StringParameter.value_for_string_parameter(
    self, config.ssm_parameter_name("cognito/user-pool-id")
)
```

## GitHub Actions Workflows

| Workflow | Description |
|----------|-------------|
| `deploy-infrastructure.yml` | Deploy CDK stacks (diff or deploy) |
| `deploy-website.yml` | Build and deploy Angular frontend |

## Troubleshooting

### CDK Bootstrap Required

If you see "This stack uses assets", run:

```bash
cdk bootstrap aws://ACCOUNT_ID/REGION
```

### Stack Dependency Errors

Ensure stacks are deployed in order. Use `--all` to let CDK handle dependencies.

### Permission Errors

Verify your AWS credentials have sufficient permissions for CloudFormation, IAM, and all services used by the stacks.
