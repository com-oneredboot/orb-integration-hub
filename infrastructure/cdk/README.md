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

Each stack exports key values to SSM Parameter Store for cross-stack references:

| Parameter | Description |
|-----------|-------------|
| `{prefix}-user-pool-id` | Cognito User Pool ID |
| `{prefix}-user-pool-client-id` | Cognito User Pool Client ID |
| `{prefix}-identity-pool-id` | Cognito Identity Pool ID |
| `{prefix}-users-table-arn` | Users DynamoDB table ARN |
| `{prefix}-graphql-api-url` | AppSync GraphQL API URL |
| `{prefix}-website-bucket-name` | S3 bucket for website |
| `{prefix}-cloudfront-distribution-id` | CloudFront distribution ID |

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
