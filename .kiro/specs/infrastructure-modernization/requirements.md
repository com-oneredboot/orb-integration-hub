# Requirements Document

## Introduction

This specification covers the modernization of orb-integration-hub's infrastructure layer, including migration from SAM/CloudFormation templates to AWS CDK, consolidation of GitHub Actions workflows, and alignment with orb-templates standards. The goal is to create a maintainable, type-safe infrastructure codebase with clear separation between infrastructure deployment and website deployment.

## Glossary

- **CDK**: AWS Cloud Development Kit - infrastructure as code framework using programming languages
- **SAM**: AWS Serverless Application Model - CloudFormation extension for serverless applications
- **Stack**: A collection of AWS resources deployed as a single unit
- **Construct**: A CDK building block representing one or more AWS resources
- **Infrastructure_Workflow**: GitHub Actions workflow that deploys all AWS infrastructure stacks
- **Website_Workflow**: GitHub Actions workflow that builds and deploys the Angular frontend
- **CloudFront_Distribution**: AWS CDN service for serving the web application
- **AppSync_API**: AWS managed GraphQL service

## Requirements

### Requirement 1: Workflow Consolidation

**User Story:** As a developer, I want simplified deployment workflows, so that I can easily understand and maintain the CI/CD pipeline.

#### Acceptance Criteria

1. WHEN deploying infrastructure, THE Infrastructure_Workflow SHALL deploy all AWS stacks (bootstrap, cognito, dynamodb, lambdas, appsync, monitoring, cloudfront) in a single workflow
2. WHEN deploying the website, THE Website_Workflow SHALL build the Angular application, sync to S3, and invalidate CloudFront
3. THE Website_Workflow SHALL retrieve the CloudFront distribution ID dynamically from CloudFormation stack outputs
4. WHEN the deploy-packages workflow is removed, THE System SHALL not have any orphaned workflow references
5. THE Infrastructure_Workflow SHALL be named `deploy-infrastructure.yml`
6. THE Website_Workflow SHALL be named `deploy-website.yml`

### Requirement 2: SAM to CDK Migration

**User Story:** As a developer, I want infrastructure defined in CDK, so that I have type-safe, maintainable infrastructure code.

#### Acceptance Criteria

1. WHEN infrastructure is deployed, THE CDK_App SHALL define all stacks currently in SAM templates
2. THE CDK_App SHALL use Python as the implementation language to match the backend
3. WHEN a SAM template is converted, THE CDK_Stack SHALL produce equivalent AWS resources
4. THE CDK_App SHALL support environment-based configuration (dev, staging, prod)
5. THE CDK_App SHALL use constructs from aws-cdk-lib without custom L1 constructs where possible
6. WHEN orb-schema-generator outputs CDK constructs, THE CDK_App SHALL integrate them seamlessly

### Requirement 3: Bootstrap Stack Migration

**User Story:** As a developer, I want the bootstrap resources defined in CDK, so that foundational resources are version-controlled.

#### Acceptance Criteria

1. THE Bootstrap_Stack SHALL create S3 buckets for build artifacts and templates
2. THE Bootstrap_Stack SHALL configure appropriate bucket policies and lifecycle rules
3. THE Bootstrap_Stack SHALL export bucket names for use by other stacks

### Requirement 4: Cognito Stack Migration

**User Story:** As a developer, I want Cognito resources defined in CDK, so that authentication infrastructure is maintainable.

#### Acceptance Criteria

1. THE Cognito_Stack SHALL create a User Pool with configured password policies
2. THE Cognito_Stack SHALL create User Pool clients for web and API access
3. THE Cognito_Stack SHALL define user groups matching current configuration
4. THE Cognito_Stack SHALL export User Pool ID and Client IDs for use by other stacks

### Requirement 5: DynamoDB Stack Migration

**User Story:** As a developer, I want DynamoDB tables defined in CDK, so that database infrastructure matches schema definitions.

#### Acceptance Criteria

1. THE DynamoDB_Stack SHALL create all tables defined in schemas/tables/
2. THE DynamoDB_Stack SHALL configure GSIs matching schema definitions
3. THE DynamoDB_Stack SHALL use PAY_PER_REQUEST billing mode
4. THE DynamoDB_Stack SHALL enable point-in-time recovery for production environments
5. THE DynamoDB_Stack SHALL export table names and ARNs for use by other stacks

### Requirement 6: Lambda Stack Migration

**User Story:** As a developer, I want Lambda functions defined in CDK, so that serverless functions are consistently deployed.

#### Acceptance Criteria

1. THE Lambda_Stack SHALL create all Lambda functions currently in SAM templates
2. THE Lambda_Stack SHALL configure appropriate IAM roles with least-privilege permissions
3. THE Lambda_Stack SHALL reference Lambda layers from the Layers_Stack
4. THE Lambda_Stack SHALL configure environment variables from stack parameters
5. THE Lambda_Stack SHALL set appropriate memory and timeout configurations

### Requirement 7: Lambda Layers Stack Migration

**User Story:** As a developer, I want Lambda layers defined in CDK, so that shared dependencies are versioned and deployed consistently.

#### Acceptance Criteria

1. THE Layers_Stack SHALL create the organizations_security layer
2. THE Layers_Stack SHALL create the stripe layer
3. THE Layers_Stack SHALL use content hashing to detect changes and avoid unnecessary deployments
4. THE Layers_Stack SHALL export layer ARNs for use by Lambda_Stack

### Requirement 8: AppSync Stack Migration

**User Story:** As a developer, I want AppSync API defined in CDK, so that the GraphQL API infrastructure is maintainable.

#### Acceptance Criteria

1. THE AppSync_Stack SHALL create the GraphQL API with Cognito authentication
2. THE AppSync_Stack SHALL configure data sources for DynamoDB tables and Lambda functions
3. THE AppSync_Stack SHALL deploy resolvers from generated VTL templates
4. THE AppSync_Stack SHALL use the schema from apps/api/graphql/schema.graphql
5. THE AppSync_Stack SHALL export API URL and API Key for use by frontend

### Requirement 9: Monitoring Stack Migration

**User Story:** As a developer, I want monitoring resources defined in CDK, so that observability is consistently configured.

#### Acceptance Criteria

1. THE Monitoring_Stack SHALL create CloudWatch dashboards for key metrics
2. THE Monitoring_Stack SHALL create alarms for error rates and latency
3. THE Monitoring_Stack SHALL configure SNS topics for alarm notifications
4. THE Monitoring_Stack SHALL reference AppSync API ID from AppSync_Stack

### Requirement 10: Frontend Resources Stack Migration

**User Story:** As a developer, I want CloudFront and S3 resources defined in CDK, so that frontend hosting is maintainable.

#### Acceptance Criteria

1. THE Frontend_Stack SHALL create an S3 bucket for static website hosting
2. THE Frontend_Stack SHALL create a CloudFront distribution with appropriate cache behaviors
3. THE Frontend_Stack SHALL configure Origin Access Identity for secure S3 access
4. THE Frontend_Stack SHALL export distribution ID and domain name for use by Website_Workflow
5. THE Frontend_Stack SHALL configure custom error responses for SPA routing

### Requirement 11: Infrastructure Directory Restructure

**User Story:** As a developer, I want a clean infrastructure directory structure, so that I can easily navigate and maintain infrastructure code.

#### Acceptance Criteria

1. THE Infrastructure_Directory SHALL follow orb-templates project structure standards
2. WHEN SAM templates are migrated, THE cloudformation_directory SHALL be removed
3. THE CDK_Directory SHALL contain all stack definitions under infrastructure/cdk/stacks/
4. THE CDK_Directory SHALL contain shared constructs under infrastructure/cdk/constructs/
5. THE Generated_Directory SHALL contain orb-schema-generator outputs under infrastructure/cdk/generated/

### Requirement 12: GitHub Actions Workflow Updates

**User Story:** As a developer, I want workflows that use CDK commands, so that deployments use the new infrastructure code.

#### Acceptance Criteria

1. THE Infrastructure_Workflow SHALL use `cdk deploy` instead of `sam deploy`
2. THE Infrastructure_Workflow SHALL support diff mode via `cdk diff`
3. THE Infrastructure_Workflow SHALL follow orb-templates workflow input ordering standards
4. THE Website_Workflow SHALL query CloudFormation outputs using AWS CLI
5. WHEN workflows are renamed, THE old workflow files SHALL be deleted

### Requirement 13: Documentation Updates

**User Story:** As a developer, I want updated documentation, so that I can understand the new infrastructure approach.

#### Acceptance Criteria

1. THE docs/architecture.md SHALL be updated to reflect CDK-based infrastructure
2. THE README.md SHALL be updated with new deployment commands
3. THE infrastructure/README.md SHALL document the CDK stack structure
4. THE CHANGELOG.md SHALL document all changes in this migration

### Requirement 14: Version Management

**User Story:** As a developer, I want proper version tracking, so that releases are traceable.

#### Acceptance Criteria

1. THE CHANGELOG.md SHALL follow Keep a Changelog format
2. THE version SHALL be bumped appropriately for this feature release
3. THE git commits SHALL follow conventional commits format
4. THE git commits SHALL reference this spec where appropriate
