# Implementation Plan: Infrastructure Stack Refactoring

## Overview

This implementation plan refactors CDK infrastructure stacks from technology-based naming to function-based naming. The refactoring involves renaming files, classes, and stack IDs, relocating the API Key Authorizer Lambda from Compute Stack to Authorization Stack, and adding the SDK AppSync API to the API Stack. All changes maintain existing functionality while improving code organization and clarity.

## Tasks

- [x] 1. Rename DynamoDB Stack to Data Stack
  - Rename file `infrastructure/cdk/stacks/dynamodb_stack.py` to `data_stack.py`
  - Rename class `DynamoDBStack` to `DataStack`
  - Update stack ID from `{prefix}-dynamodb` to `{prefix}-data`
  - Update imports in `infrastructure/cdk/stacks/__init__.py`
  - Verify all table creation logic remains unchanged
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6_

- [x] 2. Rename Cognito Stack to Authorization Stack and Add API Key Authorizer
  - [x] 2.1 Rename Cognito Stack file and class
    - Rename file `infrastructure/cdk/stacks/cognito_stack.py` to `authorization_stack.py`
    - Rename class `CognitoStack` to `AuthorizationStack`
    - Update stack ID from `{prefix}-cognito` to `{prefix}-authorization`
    - Update imports in `infrastructure/cdk/stacks/__init__.py`
    - _Requirements: 2.1, 2.2, 2.4_
  
  - [x] 2.2 Move API Key Authorizer Lambda to Authorization Stack
    - Copy `_create_api_key_authorizer_lambda()` method from `lambda_stack.py` to `authorization_stack.py`
    - Update method to read ApplicationApiKeys table name from SSM
    - Add call to `_create_api_key_authorizer_lambda()` in `__init__` method
    - Export API Key Authorizer Lambda ARN to SSM parameter
    - _Requirements: 2.5, 2.7_
  
  - [x]* 2.3 Write property test for Authorization Stack resource preservation
    - **Property 2: Resource Preservation**
    - **Validates: Requirements 2.6**

- [x] 3. Rename Lambda Stack to Compute Stack and Remove API Key Authorizer
  - [x] 3.1 Rename Lambda Stack file and class
    - Rename file `infrastructure/cdk/stacks/lambda_stack.py` to `compute_stack.py`
    - Rename class `LambdaStack` to `ComputeStack`
    - Update stack ID from `{prefix}-lambda` to `{prefix}-compute`
    - Update constructor parameter from `cognito_stack: CognitoStack` to `authorization_stack: AuthorizationStack`
    - Update all references from `self.cognito_stack` to `self.authorization_stack`
    - Update imports in `infrastructure/cdk/stacks/__init__.py`
    - _Requirements: 3.1, 3.2, 3.4_
  
  - [x] 3.2 Remove API Key Authorizer Lambda from Compute Stack
    - Remove `_create_api_key_authorizer_lambda()` method
    - Remove `self.api_key_authorizer_lambda` attribute
    - Remove API Key Authorizer from `self.functions` dictionary
    - Remove API Key Authorizer Lambda ARN export to SSM
    - _Requirements: 3.5_
  
  - [x]* 3.3 Write property test for Compute Stack resource preservation
    - **Property 2: Resource Preservation**
    - **Validates: Requirements 3.6**

- [x] 4. Rename AppSync Stack to API Stack and Add SDK API
  - [x] 4.1 Rename AppSync Stack file and class
    - Rename file `infrastructure/cdk/stacks/appsync_stack.py` to `api_stack.py`
    - Rename class `AppSyncStack` to `ApiStack`
    - Update stack ID from `{prefix}-appsync` to `{prefix}-api`
    - Update imports in `infrastructure/cdk/stacks/__init__.py`
    - _Requirements: 4.1, 4.2, 4.4_
  
  - [x] 4.2 Add SDK AppSync API to API Stack
    - Import `AppSyncSdkApi` from `generated.appsync.sdk_api`
    - Add `_create_sdk_api()` method that reads API Key Authorizer Lambda ARN from SSM
    - Create SDK API using `AppSyncSdkApi` construct with tables and authorizer Lambda ARN
    - Export SDK API ID to SSM: `/orb/integration-hub/dev/appsync/sdk/api-id`
    - Export SDK API URL to SSM: `/orb/integration-hub/dev/appsync/sdk/api-url`
    - Add call to `_create_sdk_api()` in `__init__` method
    - _Requirements: 4.6, 4.7, 4.8_
  
  - [x]* 4.3 Write unit test for SDK API creation
    - Test that SDK API is created with correct configuration
    - Test that SDK API references API Key Authorizer Lambda ARN from SSM
    - Test that SDK API ID and URL are written to SSM
    - _Requirements: 4.6, 4.7, 4.8_

- [x] 5. Update app.py with New Stack Names and Dependencies
  - [x] 5.1 Update stack imports and instantiation
    - Update imports: `DataStack`, `AuthorizationStack`, `ComputeStack`, `ApiStack`
    - Update stack instantiation with new class names
    - Update stack IDs: `{prefix}-data`, `{prefix}-authorization`, `{prefix}-compute`, `{prefix}-api`
    - Update stack descriptions to reflect new names
    - Update `ComputeStack` constructor to pass `authorization_stack` instead of `cognito_stack`
    - _Requirements: 1.3, 2.3, 3.3, 4.3_
  
  - [x] 5.2 Update stack dependencies
    - Add `data_stack.add_dependency(bootstrap_stack)`
    - Add `authorization_stack.add_dependency(bootstrap_stack)`
    - Add `authorization_stack.add_dependency(data_stack)`
    - Add `compute_stack.add_dependency(data_stack)`
    - Add `compute_stack.add_dependency(authorization_stack)`
    - Add `api_stack.add_dependency(data_stack)`
    - Add `api_stack.add_dependency(compute_stack)`
    - Add `api_stack.add_dependency(authorization_stack)`
    - Add `monitoring_stack.add_dependency(api_stack)`
    - Maintain `frontend_stack.add_dependency(bootstrap_stack)`
    - _Requirements: 2.8, 3.7, 4.9, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_
  
  - [x]* 5.3 Write property test for dependency chain integrity
    - **Property 3: Dependency Chain Integrity**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 10.5**

- [x] 6. Checkpoint - Verify CDK Synthesis
  - Run `cd infrastructure/cdk && cdk synth --all` to verify all stacks synthesize correctly
  - Verify no errors or warnings in synthesis output
  - Verify CloudFormation stack names follow pattern: `{prefix}-{descriptive-name}`
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 10.1, 10.2_

- [x] 7. Update Stack Tests
  - [x] 7.1 Rename and update Authorization Stack tests
    - Rename `infrastructure/cdk/tests/test_cognito_stack.py` to `test_authorization_stack.py`
    - Update imports to use `AuthorizationStack` instead of `CognitoStack`
    - Update test assertions to use new stack name
    - Add test for API Key Authorizer Lambda creation
    - Add test for API Key Authorizer Lambda ARN SSM parameter
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [x] 7.2 Update Compute Stack tests (if they exist)
    - Update imports to use `ComputeStack` instead of `LambdaStack`
    - Update test assertions to use new stack name
    - Remove API Key Authorizer Lambda tests (if they exist)
    - Verify all other Lambda function tests remain
    - _Requirements: 6.2, 6.3, 6.5_
  
  - [x] 7.3 Update API Stack tests (if they exist)
    - Update imports to use `ApiStack` instead of `AppSyncStack`
    - Update test assertions to use new stack name
    - Add tests for SDK API creation
    - Add tests for SDK API SSM parameters
    - _Requirements: 6.2, 6.3, 6.6_
  
  - [x]* 7.4 Write property test for stack naming consistency
    - **Property 1: Stack Naming Consistency**
    - **Validates: Requirements 1.4, 2.4, 3.4, 4.4, 10.2**
  
  - [x]* 7.5 Write property test for SSM parameter consistency
    - **Property 4: SSM Parameter Consistency**
    - **Validates: Requirements 1.6, 2.7, 4.8, 10.4**
  
  - [x]* 7.6 Write property test for no CloudFormation exports
    - **Property 5: No CloudFormation Exports**
    - **Validates: Requirements 10.3**

- [x] 8. Update Documentation
  - [x] 8.1 Update infrastructure README
    - Update `infrastructure/cdk/README.md` with new stack names
    - Document dependency chain: Bootstrap → Data → Authorization → Compute → API → Monitoring
    - Document that API Key Authorizer Lambda is in Authorization Stack
    - Document that both Main and SDK APIs are in API Stack
    - Add rationale for descriptive naming over technology naming
    - _Requirements: 7.1, 7.4, 7.5, 7.6, 7.7_
  
  - [x] 8.2 Update CHANGELOG
    - Add entry to `CHANGELOG.md` with refactoring description
    - Include issue numbers in changelog entry
    - Follow format: `- Refactored CDK stacks to use descriptive names (#issue)`
    - _Requirements: 8.2, 8.3, 8.4_
  
  - [x] 8.3 Update deployment documentation
    - Update any deployment instructions with new stack names
    - Update troubleshooting guides with new stack names
    - _Requirements: 7.3_

- [x] 9. Final Verification
  - Run `cd infrastructure/cdk && cdk synth --all` to verify synthesis
  - Run `cd infrastructure && PIPENV_IGNORE_VIRTUALENVS=1 pipenv run pytest cdk/tests/ -v` to verify all tests pass
  - Verify all stack names follow pattern: `{prefix}-{descriptive-name}`
  - Verify no CloudFormation exports in synthesized templates
  - Verify all SSM parameter reads/writes are correct
  - Verify all stack dependencies are correctly configured
  - Verify documentation is updated and complete
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 6.7, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 10. Version Bump and Git Commit
  - Bump version in appropriate project files following semantic versioning
  - Commit changes with conventional commit format: `refactor: rename CDK stacks to use descriptive names #issue`
  - Reference all relevant issue numbers in commit message
  - _Requirements: 8.1, 9.1, 9.2, 9.3, 9.4_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- This is a refactoring task - all existing functionality must be preserved
- The refactoring does NOT rename deployed CloudFormation stacks (breaking change)
- Deploy to a new environment first to validate before applying to production
