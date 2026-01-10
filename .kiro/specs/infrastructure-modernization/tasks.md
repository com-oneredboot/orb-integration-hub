# Implementation Plan: Infrastructure Modernization

## Overview

This implementation plan migrates orb-integration-hub from SAM/CloudFormation to AWS CDK, consolidates GitHub Actions workflows, and restructures the infrastructure directory. The migration is phased to minimize risk and allow incremental validation.

## Tasks

- [x] 1. Set up CDK project structure
  - [x] 1.1 Create infrastructure/cdk directory structure
    - Create stacks/, constructs/, generated/ directories
    - Create __init__.py files for Python packages
    - _Requirements: 11.1, 11.3, 11.4, 11.5_

  - [x] 1.2 Create infrastructure/cdk/requirements.txt
    - Add aws-cdk-lib, constructs, pyyaml dependencies
    - Pin versions for reproducibility
    - _Requirements: 2.2_

  - [x] 1.3 Create infrastructure/cdk/config.py
    - Implement Config dataclass with customer_id, project_id, environment
    - Implement get_config() function to read CDK context
    - Add prefix and resource_name helper methods
    - _Requirements: 2.4_

  - [x] 1.4 Create infrastructure/cdk/constructs/tagged_resource.py
    - Create base construct that applies standard tags
    - Tags: Billable, CustomerId, Environment, ProjectId
    - _Requirements: 2.5_

  - [x] 1.5 Update infrastructure/cdk.json
    - Configure app entry point to cdk/app.py
    - Add default context values
    - _Requirements: 2.1_

- [x] 2. Checkpoint - Verify CDK setup
  - Run `cd infrastructure/cdk && cdk synth` to verify setup
  - Ensure no errors in basic CDK configuration

- [x] 3. Convert Bootstrap Stack
  - [x] 3.1 Create infrastructure/cdk/stacks/bootstrap_stack.py
    - Create S3 buckets for build-artifacts and build-templates
    - Create IAM user and policies for GitHub Actions
    - Create SQS queues (alerts, dead-letter)
    - Create SMS verification secret
    - Export bucket names and queue ARNs via SSM parameters
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 3.2 Write unit test for bootstrap_stack
    - Verify S3 buckets are created with correct names
    - Verify IAM policies are attached
    - Verify SSM parameters are exported
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. Convert Cognito Stack
  - [x] 4.1 Create infrastructure/cdk/stacks/cognito_stack.py
    - Create User Pool with password policies and MFA config
    - Create User Pool Client
    - Create Identity Pool with role mappings
    - Create user groups (USER, CUSTOMER, CLIENT, EMPLOYEE, OWNER)
    - Create PostUserConfirmation Lambda trigger
    - Create SMS role and verification topic
    - Export User Pool ID, Client ID via SSM parameters
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 4.2 Write unit test for cognito_stack
    - Verify User Pool has correct password policy
    - Verify all user groups are created
    - Verify exports exist
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 5. Convert DynamoDB Stack
  - [x] 5.1 Create infrastructure/cdk/stacks/dynamodb_stack.py
    - Load table definitions from schemas/tables/*.yml
    - Create tables with correct key schemas and GSIs
    - Configure PAY_PER_REQUEST billing
    - Enable streams where needed (Users table)
    - Export table names and ARNs via SSM parameters
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 5.2 Write property test for DynamoDB schema consistency
    - **Property 1: Schema-to-Table Consistency**
    - For any table schema file, verify CDK creates matching table
    - **Validates: Requirements 5.1, 5.2**

- [x] 6. Convert Lambda Layers Stack
  - [x] 6.1 Create infrastructure/cdk/stacks/lambda_layers_stack.py
    - Create organizations_security layer from apps/api/layers/organizations_security/
    - Create stripe layer from apps/api/layers/stripe/
    - Export layer ARNs via SSM parameters
    - _Requirements: 7.1, 7.2, 7.4_

  - [x] 6.2 Write unit test for lambda_layers_stack
    - Verify both layers are created
    - Verify exports exist
    - _Requirements: 7.1, 7.2, 7.4_

- [x] 7. Checkpoint - Verify foundational stacks
  - Run `cdk synth` for bootstrap, cognito, dynamodb, layers stacks
  - Compare synthesized templates with existing SAM templates
  - Ensure resource counts match

- [x] 8. Convert Lambda Stack
  - [x] 8.1 Create infrastructure/cdk/stacks/lambda_stack.py
    - Create LambdaExecutionRole with required policies
    - Create SmsVerificationLambda
    - Create CognitoGroupManagerLambda
    - Create UserStatusCalculatorLambda with DynamoDB stream trigger
    - Create OrganizationsLambda with layer reference
    - Export Lambda ARNs via SSM parameters
    - _Requirements: 6.1, 6.3, 6.4, 6.5_

  - [x] 8.2 Write unit test for lambda_stack
    - Verify all Lambda functions are created
    - Verify IAM role has required policies
    - Verify layer references are correct
    - _Requirements: 6.1, 6.3, 6.4, 6.5_

- [x] 9. Convert AppSync Stack
  - [x] 9.1 Create infrastructure/cdk/stacks/appsync_stack.py
    - Create GraphQL API with Cognito authentication
    - Create API Key for unauthenticated access
    - Create DynamoDB data sources for all tables
    - Create Lambda data source for SMS verification
    - Deploy resolvers from generated VTL templates
    - Reference schema from apps/api/graphql/schema.graphql
    - Export API URL and API Key via SSM parameters
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 9.2 Write property test for data source coverage
    - **Property 2: Data Source Coverage**
    - For any DynamoDB table, verify a data source exists
    - **Validates: Requirements 8.2**

- [x] 10. Convert Monitoring Stack
  - [x] 10.1 Create infrastructure/cdk/stacks/monitoring_stack.py
    - Create CloudWatch dashboard for AppSync metrics
    - Create alarms for 4XX/5XX errors and latency
    - Create anomaly detectors
    - Create GuardDuty detector
    - Create audit log group with KMS encryption
    - Create security alert SNS topic
    - Reference AppSync API ID from appsync_stack
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 10.2 Write unit test for monitoring_stack
    - Verify dashboard is created
    - Verify alarms are created
    - Verify SNS topic exists
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 11. Convert Frontend Stack
  - [x] 11.1 Create infrastructure/cdk/stacks/frontend_stack.py
    - Create S3 bucket for website hosting
    - Create CloudFront Origin Access Identity
    - Create CloudFront distribution with cache behaviors
    - Configure custom error responses for SPA routing (404 -> index.html)
    - Export distribution ID, bucket name, domain name
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 11.2 Write unit test for frontend_stack
    - Verify S3 bucket is created
    - Verify CloudFront distribution is created
    - Verify OAI is configured
    - Verify exports exist
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 12. Create CDK App Entry Point
  - [x] 12.1 Create infrastructure/cdk/app.py
    - Import all stack classes
    - Instantiate stacks with correct dependencies
    - Pass cross-stack references (cognito to lambdas, etc.)
    - _Requirements: 2.1_

  - [x] 12.2 Write property test for stack resource equivalence
    - **Property 3: CDK Stack Resource Equivalence**
    - For any SAM template, verify CDK produces equivalent resources
    - **Validates: Requirements 2.1, 2.3**

- [x] 13. Checkpoint - Full CDK synthesis
  - Run `cdk synth --all` to synthesize all stacks
  - Run `cdk diff --all` against existing deployed resources
  - Verify no unexpected changes

- [x] 14. Create deploy-infrastructure workflow
  - [x] 14.1 Create .github/workflows/deploy-infrastructure.yml
    - Add workflow_dispatch trigger with inputs (environment, action, customer_id, project_id)
    - Order inputs: required first, optional context, optional flags last
    - Add steps: checkout, setup-python, configure-aws, install-cdk
    - Add cdk diff step (when action=diff)
    - Add cdk deploy step (when action=deploy)
    - Set timeout-minutes: 60
    - _Requirements: 1.1, 1.5, 12.1, 12.2, 12.3_

  - [x] 14.2 Write property test for workflow input ordering
    - **Property 4: Workflow Input Ordering**
    - Verify required inputs come before optional inputs
    - **Validates: Requirements 12.3**

- [x] 15. Create deploy-website workflow
  - [x] 15.1 Create .github/workflows/deploy-website.yml
    - Add workflow_dispatch trigger with inputs (environment, customer_id, project_id)
    - Add steps: checkout, setup-node, configure-aws, install-deps, build
    - Add step to get CloudFront distribution ID from CloudFormation outputs
    - Add step to sync to S3
    - Add step to invalidate CloudFront
    - Set timeout-minutes: 30
    - _Requirements: 1.2, 1.3, 1.6, 12.4_

  - [x] 15.2 Write property test for CloudFormation output retrieval
    - **Property 5: CloudFormation Output Availability**
    - Verify workflow can retrieve distribution ID from stack outputs
    - **Validates: Requirements 1.3, 12.4_

- [x] 16. Checkpoint - Test workflows
  - Test deploy-infrastructure workflow with action=diff
  - Test deploy-website workflow in dev environment
  - Verify both workflows complete successfully

- [ ] 17. Clean up old files
  - [ ] 17.1 Delete old workflow files
    - Delete .github/workflows/deploy-backend.yml
    - Delete .github/workflows/deploy-frontend.yml
    - Delete .github/workflows/deploy-frontend-resources.yml
    - Delete .github/workflows/deploy-packages.yml
    - _Requirements: 1.4, 12.5_

  - [ ] 17.2 Delete SAM templates directory
    - Delete infrastructure/cloudformation/ directory
    - Keep infrastructure/cdk/ as the only IaC directory
    - _Requirements: 11.2_

  - [ ] 17.3 Move generated CDK constructs
    - Move infrastructure/cdk/appsync/ to infrastructure/cdk/generated/appsync/
    - Move infrastructure/cdk/tables/ to infrastructure/cdk/generated/tables/
    - Update imports in stack files
    - _Requirements: 11.5_

- [-] 18. Update documentation
  - [ ] 18.1 Update docs/architecture.md
    - Document CDK-based infrastructure approach
    - Update architecture diagrams if present
    - Reference new workflow names
    - _Requirements: 13.1_

  - [ ] 18.2 Update README.md
    - Add CDK deployment commands section
    - Update prerequisites (Node.js for CDK CLI)
    - Reference new workflows
    - _Requirements: 13.2_

  - [x] 18.3 Create infrastructure/cdk/README.md
    - Document stack structure and dependencies
    - Document configuration options
    - Document deployment commands
    - _Requirements: 13.3_

  - [ ] 18.4 Update CHANGELOG.md
    - Add new version section
    - Document: Added CDK infrastructure, new workflows
    - Document: Changed infrastructure directory structure
    - Document: Removed SAM templates, old workflows
    - _Requirements: 13.4, 14.1_

- [ ] 19. Version management
  - [ ] 19.1 Bump version
    - Update version in appropriate files
    - Use semantic versioning (minor bump for new feature)
    - _Requirements: 14.2_

- [ ] 20. Final checkpoint - Complete verification
  - Run `cdk synth --all` to verify all stacks synthesize
  - Run `cd apps/api && pipenv run pytest` to verify backend tests
  - Run `cd apps/web && npm test` to verify frontend tests
  - Verify documentation is accurate
  - Commit with message: `feat: migrate infrastructure from SAM to CDK`
  - _Requirements: 14.3, 14.4_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Follow orb-templates spec standards for commits and issue comments
- Migration is phased to allow rollback if issues arise
- Keep SAM templates until CDK deployment is verified in production
