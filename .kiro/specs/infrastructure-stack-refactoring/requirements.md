# Requirements Document

## Introduction

This document specifies requirements for refactoring the CDK infrastructure stacks in orb-integration-hub. The current stack naming uses technology names (CognitoStack, DynamoDBStack, AppSyncStack, LambdaStack), which obscures their functional purpose. Additionally, the API Key Authorizer Lambda is misplaced in the Lambda stack when it conceptually belongs with authorization resources, and the SDK AppSync API needs to be added to the API stack.

The refactoring will rename stacks to use descriptive names based on their function, reorganize Lambda placement for better separation of concerns, and ensure both Main and SDK AppSync APIs are properly configured in a single API stack.

## Glossary

- **CDK**: AWS Cloud Development Kit - Infrastructure as Code framework
- **Stack**: A CloudFormation stack containing related AWS resources
- **SSM Parameter**: AWS Systems Manager Parameter Store - key-value storage for configuration
- **AppSync**: AWS AppSync - managed GraphQL service
- **Lambda Authorizer**: AWS Lambda function that validates requests for API authorization
- **API Key Authorizer**: Lambda function that validates API keys for SDK API access
- **Main API**: AppSync API using Cognito authentication for web/mobile clients
- **SDK API**: AppSync API using Lambda authorizer (API key) for programmatic access
- **Generated Construct**: CDK construct created by orb-schema-generator
- **Bootstrap Stack**: Foundation stack providing S3 buckets, SQS queues, IAM foundations
- **Data Stack**: Stack containing all DynamoDB tables
- **Authorization Stack**: Stack containing Cognito and API Key Authorizer Lambda
- **Compute Stack**: Stack containing business logic Lambda functions
- **API Stack**: Stack containing both Main and SDK AppSync APIs
- **Monitoring Stack**: Stack containing CloudWatch dashboards and alarms

## Requirements

### Requirement 1: Rename DynamoDB Stack to Data Stack

**User Story:** As a DevOps engineer, I want the DynamoDB stack to be named "Data Stack", so that the stack name reflects its functional purpose rather than the technology used.

#### Acceptance Criteria

1. THE System SHALL rename the file `dynamodb_stack.py` to `data_stack.py`
2. THE System SHALL rename the class `DynamoDBStack` to `DataStack`
3. THE System SHALL update all imports of `DynamoDBStack` to `DataStack` in `app.py`
4. THE System SHALL update the CloudFormation stack name from `{prefix}-dynamodb` to `{prefix}-data`
5. THE System SHALL maintain all existing DynamoDB table creation logic without modification
6. THE System SHALL maintain all existing SSM parameter writes for table names and ARNs

### Requirement 2: Rename Cognito Stack to Authorization Stack and Add API Key Authorizer

**User Story:** As a DevOps engineer, I want the Cognito stack to be renamed "Authorization Stack" and include the API Key Authorizer Lambda, so that all authorization resources are co-located.

#### Acceptance Criteria

1. THE System SHALL rename the file `cognito_stack.py` to `authorization_stack.py`
2. THE System SHALL rename the class `CognitoStack` to `AuthorizationStack`
3. THE System SHALL update all imports of `CognitoStack` to `AuthorizationStack` in `app.py` and `lambda_stack.py`
4. THE System SHALL update the CloudFormation stack name from `{prefix}-cognito` to `{prefix}-authorization`
5. WHEN the Authorization Stack is created, THE System SHALL include the API Key Authorizer Lambda function (moved from Lambda Stack)
6. THE System SHALL maintain all existing Cognito User Pool, Identity Pool, and Groups creation logic
7. THE System SHALL write the API Key Authorizer Lambda ARN to SSM Parameter Store
8. THE System SHALL add a dependency on Data Stack (needs ApplicationApiKeys table)

### Requirement 3: Rename Lambda Stack to Compute Stack and Remove API Key Authorizer

**User Story:** As a DevOps engineer, I want the Lambda stack to be renamed "Compute Stack" and have the API Key Authorizer Lambda removed, so that the stack name reflects its purpose and authorization resources are properly separated.

#### Acceptance Criteria

1. THE System SHALL rename the file `lambda_stack.py` to `compute_stack.py`
2. THE System SHALL rename the class `LambdaStack` to `ComputeStack`
3. THE System SHALL update all imports of `LambdaStack` to `ComputeStack` in `app.py`
4. THE System SHALL update the CloudFormation stack name from `{prefix}-lambda` to `{prefix}-compute`
5. THE System SHALL remove the `_create_api_key_authorizer_lambda` method from Compute Stack
6. THE System SHALL maintain all other Lambda function creation logic (CheckEmailExists, CreateUserFromCognito, GetCurrentUser, GetApplicationUsers, SmsVerification, CognitoGroupManager, UserStatusCalculator, Organizations)
7. THE System SHALL add a dependency on Authorization Stack (in addition to existing Data Stack dependency)

### Requirement 4: Rename AppSync Stack to API Stack and Add SDK API

**User Story:** As a DevOps engineer, I want the AppSync stack to be renamed "API Stack" and include both Main and SDK AppSync APIs, so that all API resources are co-located with descriptive naming.

#### Acceptance Criteria

1. THE System SHALL rename the file `appsync_stack.py` to `api_stack.py`
2. THE System SHALL rename the class `AppSyncStack` to `ApiStack`
3. THE System SHALL update all imports of `AppSyncStack` to `ApiStack` in `app.py`
4. THE System SHALL update the CloudFormation stack name from `{prefix}-appsync` to `{prefix}-api`
5. WHEN the API Stack is created, THE System SHALL create the Main AppSync API using the generated `AppSyncApi` construct
6. WHEN the API Stack is created, THE System SHALL create the SDK AppSync API using the generated `AppSyncSdkApi` construct
7. THE System SHALL configure the SDK API to use the API Key Authorizer Lambda (ARN read from SSM)
8. THE System SHALL write both Main API and SDK API IDs and URLs to SSM Parameter Store
9. THE System SHALL add dependencies on Data Stack, Compute Stack, and Authorization Stack

### Requirement 5: Update Stack Dependencies in app.py

**User Story:** As a DevOps engineer, I want the stack dependencies to be correctly configured, so that stacks deploy in the proper order with all required resources available.

#### Acceptance Criteria

1. THE System SHALL define the dependency chain: Bootstrap → Data → Authorization → Compute → API → Monitoring
2. WHEN Bootstrap Stack is deployed, THE System SHALL ensure no dependencies
3. WHEN Data Stack is deployed, THE System SHALL depend on Bootstrap Stack
4. WHEN Authorization Stack is deployed, THE System SHALL depend on Bootstrap Stack and Data Stack
5. WHEN Compute Stack is deployed, THE System SHALL depend on Data Stack and Authorization Stack
6. WHEN API Stack is deployed, THE System SHALL depend on Data Stack, Compute Stack, and Authorization Stack
7. WHEN Monitoring Stack is deployed, THE System SHALL depend on API Stack
8. THE System SHALL maintain Frontend Stack as independent (depends only on Bootstrap)

### Requirement 6: Update Stack Tests

**User Story:** As a developer, I want all stack tests to be updated with new names, so that the test suite continues to validate infrastructure correctness.

#### Acceptance Criteria

1. THE System SHALL rename `test_cognito_stack.py` to `test_authorization_stack.py`
2. THE System SHALL update all test imports to use new stack class names
3. THE System SHALL update all test assertions to use new stack names
4. THE System SHALL add tests for API Key Authorizer Lambda in Authorization Stack tests
5. THE System SHALL remove API Key Authorizer Lambda tests from Lambda Stack tests (if they exist)
6. THE System SHALL add tests for SDK API in API Stack tests
7. WHEN all tests are run, THE System SHALL pass without errors

### Requirement 7: Update Documentation

**User Story:** As a team member, I want all documentation to reflect the new stack names and architecture, so that the documentation remains accurate and helpful.

#### Acceptance Criteria

1. THE System SHALL update `infrastructure/cdk/README.md` with new stack names and descriptions
2. THE System SHALL update architecture diagrams (if any) with new stack names
3. THE System SHALL update deployment instructions with new stack names
4. THE System SHALL document the rationale for descriptive naming over technology naming
5. THE System SHALL document the dependency chain: Bootstrap → Data → Authorization → Compute → API → Monitoring
6. THE System SHALL document that API Key Authorizer Lambda is in Authorization Stack
7. THE System SHALL document that both Main and SDK APIs are in API Stack

### Requirement 8: Version and Changelog Management

**User Story:** As a developer, I want version and changelog updates, so that changes are properly tracked and documented.

#### Acceptance Criteria

1. THE System SHALL bump the version following semantic versioning
2. THE System SHALL update CHANGELOG.md with a description of the stack refactoring
3. THE System SHALL include issue numbers in the changelog entry
4. THE System SHALL follow the format: `- Feature description (#issue)`

### Requirement 9: Git Commit Standards

**User Story:** As a developer, I want commits to follow conventional commit standards, so that the git history is clear and traceable.

#### Acceptance Criteria

1. THE System SHALL reference issue numbers in all commit messages
2. THE System SHALL follow conventional commits format: `refactor: description #issue`
3. THE System SHALL use descriptive commit messages for each logical change
4. WHEN multiple issues are addressed, THE System SHALL reference all issue numbers

### Requirement 10: Final Verification

**User Story:** As a developer, I want final verification before deployment, so that the refactored infrastructure is correct and complete.

#### Acceptance Criteria

1. THE System SHALL run `cdk synth --all` without errors
2. THE System SHALL verify all stack names follow the pattern: `{prefix}-{descriptive-name}`
3. THE System SHALL verify no CloudFormation exports are used (all references via SSM)
4. THE System SHALL verify all SSM parameter reads/writes are correct
5. THE System SHALL verify all stack dependencies are correctly configured
6. THE System SHALL verify all tests pass
7. THE System SHALL verify documentation is updated and renders correctly
