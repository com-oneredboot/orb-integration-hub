---
inclusion: fileMatch
fileMatchPattern: "**/infrastructure/**,**/cloudformation/**"
---
# Infrastructure Standards

This file loads automatically when working with infrastructure/CloudFormation files.

## Infrastructure Structure

```
infrastructure/
└── cloudformation/
    ├── lambdas.yml              # Lambda function definitions
    ├── lambda-layers.yml        # Lambda layer definitions
    ├── dynamodb.yml             # DynamoDB tables
    ├── cognito.yml              # Cognito user pools
    ├── appsync.yml              # AppSync API
    └── ...
```

## Stack Naming Convention

```yaml
# Pattern: {customer_id}-{project_id}-{environment}-{purpose}
# Examples:
# orb-integration-hub-dev-lambdas
# orb-integration-hub-prod-dynamodb
```

## Parameter Naming

```yaml
# SSM Parameter pattern
!Sub '${CustomerId}-${ProjectId}-${Environment}-<resource>-<attribute>'

# Examples:
# orb-integration-hub-dev-users-table-arn
# orb-integration-hub-dev-cognito-user-pool-id
```

## Lambda Function Paths

Lambda CodeUri paths should reference `apps/api/`:

```yaml
CodeUri: ../../apps/api/lambdas/sms_verification/
CodeUri: ../../apps/api/lambdas/cognito_group_manager/
```

## Lambda Layer Paths

Layer ContentUri paths should reference `apps/api/layers/`:

```yaml
ContentUri: ../../apps/api/layers/organizations_security/
ContentUri: ../../apps/api/layers/stripe/
```

## SAM Commands

```bash
# Build
sam build --template infrastructure/cloudformation/lambdas.yml

# Package
sam package \
  --template-file infrastructure/cloudformation/lambdas.yml \
  --s3-bucket orb-integration-hub-build-artifacts \
  --output-template-file packaged.yml

# Deploy
sam deploy \
  --template-file packaged.yml \
  --stack-name orb-integration-hub-dev-lambdas \
  --capabilities CAPABILITY_NAMED_IAM \
  --profile sso-orb-dev
```

## Tagging Standards

All resources must include these tags:

```yaml
Tags:
  Billable: true
  CustomerId: !Ref CustomerId
  Environment: !Ref Environment
  ProjectId: !Ref ProjectId
```

## Security Best Practices

- Never hardcode secrets - use Secrets Manager or Parameter Store
- Use least-privilege IAM policies
- Enable encryption at rest for all data stores
- Reference secrets via SSM parameters: `!Sub '{{resolve:ssm:${CustomerId}-${ProjectId}-${Environment}-secret-name}}'`

## Output Conventions

Export important values for cross-stack references:

```yaml
Outputs:
  LambdaArn:
    Description: ARN of the Lambda function
    Value: !GetAtt MyLambda.Arn
    Export:
      Name: !Sub '${CustomerId}-${ProjectId}-${Environment}-my-lambda-arn'
```

## Common Parameters

Standard parameters used across stacks:

```yaml
Parameters:
  CustomerId:
    Default: orb
    Type: String
  ProjectId:
    Default: integration-hub
    Type: String
  Environment:
    Default: dev
    Type: String
  Runtime:
    Default: python3.12
    Type: String
```
