# CDK Infrastructure for orb-integration-hub

This directory contains AWS CDK infrastructure code for the orb-integration-hub project.

## Stack Structure

The infrastructure is organized into 8 stacks with the following dependency graph:

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Bootstrap  │  │   Cognito   │  │  DynamoDB   │  │Lambda Layers│  │  Frontend   │
└─────────────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────────────┘
                       │                │                │
                       └────────┬───────┴────────────────┘
                                │
                         ┌──────▼──────┐
                         │   Lambda    │
                         └──────┬──────┘
                                │
                         ┌──────▼──────┐
                         │   AppSync   │
                         └──────┬──────┘
                                │
                         ┌──────▼──────┐
                         │  Monitoring │
                         └─────────────┘
```

### Stack Descriptions

| Stack | Description | Dependencies |
|-------|-------------|--------------|
| Bootstrap | S3 buckets, IAM users, SQS queues | None |
| Cognito | User Pool, Identity Pool, Groups | None |
| DynamoDB | All DynamoDB tables | None |
| Lambda Layers | Shared Lambda layers | None |
| Frontend | S3 bucket, CloudFront distribution | None |
| Lambda | Lambda functions | Cognito, DynamoDB, Lambda Layers |
| AppSync | GraphQL API | Cognito, DynamoDB, Lambda |
| Monitoring | CloudWatch dashboards, alarms, GuardDuty | AppSync |

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
pipenv run cdk deploy orb-integration-hub-dev-appsync
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
pipenv run pytest cdk/tests/test_appsync_stack.py -v
```

## Directory Structure

```
infrastructure/cdk/
├── app.py              # CDK app entry point
├── config.py           # Configuration management
├── stacks/             # Stack definitions
│   ├── __init__.py
│   ├── appsync_stack.py
│   ├── bootstrap_stack.py
│   ├── cognito_stack.py
│   ├── dynamodb_stack.py
│   ├── frontend_stack.py
│   ├── lambda_layers_stack.py
│   ├── lambda_stack.py
│   └── monitoring_stack.py
├── shared_constructs/  # Reusable constructs
│   └── tagged_resource.py
└── tests/              # Unit tests
    ├── test_appsync_stack.py
    ├── test_bootstrap_stack.py
    ├── test_cognito_stack.py
    ├── test_dynamodb_stack.py
    ├── test_frontend_stack.py
    ├── test_lambda_layers_stack.py
    ├── test_lambda_stack.py
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

#### Cognito Stack (`/orb/integration-hub/{env}/cognito/`)

| Parameter Path | Description |
|----------------|-------------|
| `/orb/integration-hub/{env}/cognito/user-pool-id` | Cognito User Pool ID |
| `/orb/integration-hub/{env}/cognito/client-id` | Cognito User Pool Client ID |
| `/orb/integration-hub/{env}/cognito/identity-pool-id` | Cognito Identity Pool ID |
| `/orb/integration-hub/{env}/cognito/user-pool-arn` | Cognito User Pool ARN |
| `/orb/integration-hub/{env}/cognito/qr-issuer` | MFA QR code issuer name |
| `/orb/integration-hub/{env}/cognito/phone-number-verification-topic-arn` | SNS topic for phone verification |

#### DynamoDB Stack (`/orb/integration-hub/{env}/dynamodb/`)

| Parameter Path | Description |
|----------------|-------------|
| `/orb/integration-hub/{env}/dynamodb/{table-name}/arn` | Table ARN |
| `/orb/integration-hub/{env}/dynamodb/{table-name}/name` | Table name |

Tables: `users`, `organizations`, `organization-users`, `applications`, `application-users`, `application-roles`, `roles`, `notifications`, `privacy-requests`, `ownership-transfer-requests`, `sms-rate-limit`

#### Lambda Layers Stack (`/orb/integration-hub/{env}/lambda-layers/`)

| Parameter Path | Description |
|----------------|-------------|
| `/orb/integration-hub/{env}/lambda-layers/{layer-name}/arn` | Lambda layer ARN |

Layers: `common`, `authentication-dynamodb`, `organizations-security`, `stripe`

#### Lambda Stack (`/orb/integration-hub/{env}/lambda/`)

| Parameter Path | Description |
|----------------|-------------|
| `/orb/integration-hub/{env}/lambda/{function-name}/arn` | Lambda function ARN |

Functions: `sms-verification`, `pre-cognito-claims`, `cognito-group-manager`, `user-status-calculator`, `contact-us`, `stripe`, `stripe-publishable-key`, `paypal`, `organizations`, `ownership-transfer-service`, `privacy-rights-resolver`, `kms-cleanup-orphaned`

#### Bootstrap Stack (`/orb/integration-hub/{env}/`)

| Parameter Path | Description |
|----------------|-------------|
| `/orb/integration-hub/{env}/sqs/alerts-queue/arn` | Alerts SQS queue ARN |
| `/orb/integration-hub/{env}/sqs/alerts-queue/url` | Alerts SQS queue URL |
| `/orb/integration-hub/{env}/iam/ci-user/arn` | CI user ARN |
| `/orb/integration-hub/{env}/iam/ci-user/access-key-id` | CI user access key ID |
| `/orb/integration-hub/{env}/secrets/ci-user-secret-key/arn` | CI user secret key ARN |

#### AppSync Stack (`/orb/integration-hub/{env}/appsync/`)

| Parameter Path | Description |
|----------------|-------------|
| `/orb/integration-hub/{env}/appsync/api-id` | AppSync API ID |
| `/orb/integration-hub/{env}/appsync/api-url` | AppSync GraphQL endpoint URL |
| `/orb/integration-hub/{env}/appsync/api-key` | AppSync API key |

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
