# Implementation Plan: CDK Refactoring

## Overview

This implementation plan refactors CDK infrastructure to use path-based SSM parameter naming and maximize use of orb-schema-generator generated constructs.

## Tasks

- [x] 1. Update Config class for path-based SSM naming
  - [x] 1.1 Modify `ssm_parameter_name()` method in `infrastructure/cdk/config.py`
    - Change from `{prefix}-{name}` to `/{customer_id}/{project_id}/{environment}/{name}`
    - Update docstring with examples
    - _Requirements: 1.1_
  - [x] 1.2 Write unit test for new `ssm_parameter_name()` format
    - Test returns path starting with `/`
    - Test contains correct path segments
    - _Requirements: 1.1_

- [x] 2. Update Cognito Stack SSM parameters
  - [x] 2.1 Update `infrastructure/cdk/stacks/cognito_stack.py`
    - Change parameter paths to `/orb/integration-hub/{env}/cognito/*`
    - Update: user-pool-id, client-id, identity-pool-id, qr-issuer, user-pool-arn, phone-number-verification-topic-arn
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 2.2 Update cognito_stack tests
    - Update expected parameter names in `test_cognito_stack.py`
    - _Requirements: 9.1, 9.2_

- [x] 3. Update Lambda Layers Stack SSM parameters
  - [x] 3.1 Update `infrastructure/cdk/stacks/lambda_layers_stack.py`
    - Change parameter paths to `/orb/integration-hub/{env}/lambda-layers/{layer-name}/arn`
    - _Requirements: 5.2_
  - [x] 3.2 Update lambda_layers_stack tests
    - Update expected parameter names in `test_lambda_layers_stack.py`
    - _Requirements: 9.1, 9.2_

- [x] 4. Update Lambda Stack SSM parameters
  - [x] 4.1 Update `infrastructure/cdk/stacks/lambda_stack.py`
    - Change layer ARN lookup to use new path format
    - Change Lambda ARN exports to `/orb/integration-hub/{env}/lambda/{function-name}/arn`
    - _Requirements: 5.1, 5.3_
  - [x] 4.2 Update lambda_stack tests
    - Update mock SSM parameter names
    - Update expected parameter names
    - _Requirements: 9.1, 9.2_

- [x] 5. Update Bootstrap Stack SSM parameters
  - [x] 5.1 Update `infrastructure/cdk/stacks/bootstrap_stack.py`
    - Change parameter paths to `/orb/integration-hub/{env}/sqs/*`, `/orb/integration-hub/{env}/iam/*`, etc.
    - _Requirements: 7.1, 7.2_
  - [x] 5.2 Update bootstrap_stack tests
    - Update expected parameter names in `test_bootstrap_stack.py`
    - _Requirements: 9.1, 9.2_

- [x] 6. Update DynamoDB Stack
  - [x] 6.1 Refactor `infrastructure/cdk/stacks/dynamodb_stack.py` to use generated constructs
    - Import generated table constructs from `infrastructure/cdk/generated/`
    - Wrap constructs to add PITR, removal policies, tags
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 6.2 Update DynamoDB SSM parameter paths
    - Change to `/orb/integration-hub/{env}/dynamodb/{table-name}/arn` and `/name`
    - _Requirements: 2.3_
  - [x] 6.3 Update dynamodb_stack tests
    - Update expected parameter names
    - Verify PITR and removal policies
    - _Requirements: 9.1, 9.2_

- [x] 7. Update Frontend Stack SSM parameters
  - [x] 7.1 Update `infrastructure/cdk/stacks/frontend_stack.py`
    - Change parameter paths to `/orb/integration-hub/{env}/frontend/*`
    - _Requirements: 8.1_
  - [x] 7.2 Update frontend_stack tests
    - Update expected parameter names in `test_frontend_stack.py`
    - _Requirements: 9.1, 9.2_

- [x] 8. Update Monitoring Stack SSM parameters
  - [x] 8.1 Update `infrastructure/cdk/stacks/monitoring_stack.py`
    - Change parameter paths to `/orb/integration-hub/{env}/monitoring/*`
    - _Requirements: 8.2_
  - [x] 8.2 Update monitoring_stack tests
    - Update expected parameter names in `test_monitoring_stack.py`
    - _Requirements: 9.1, 9.2_

- [x] 9. Update AppSync Stack SSM parameters
  - [x] 9.1 Update `infrastructure/cdk/stacks/appsync_stack.py`
    - Change parameter paths to `/orb/integration-hub/{env}/appsync/*`
    - Evaluate using generated AppSync construct
    - _Requirements: 4.1, 4.2_
  - [x] 9.2 Update appsync_stack tests
    - Update expected parameter names in `test_appsync_stack.py`
    - _Requirements: 9.1, 9.2_

- [x] 10. Update remaining test files
  - [x] 10.1 Update `test_iam_policy_scoping.py`
    - Update mock SSM parameter names
    - _Requirements: 9.1_
  - [x] 10.2 Update `test_pitr_enablement.py` if needed
    - Verify tests still pass
    - _Requirements: 9.3_

- [x] 11. Checkpoint - Verify all tests pass
  - Run `PIPENV_IGNORE_VIRTUALENVS=1 pipenv run pytest cdk/tests/ -v`
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Documentation updates
  - [x] 12.1 Update `infrastructure/cdk/README.md`
    - Document new SSM parameter naming convention
    - Add examples of parameter paths
    - _Requirements: 13.1, 13.2, 13.3_
  - [x] 12.2 Update `.kiro/steering/infrastructure.md`
    - Add SSM parameter naming convention rule
    - Reference orb-schema-generator conventions
    - _Requirements: 13.1, 13.4_

- [x] 13. Version and changelog updates
  - [x] 13.1 Update `CHANGELOG.md`
    - Add entry for CDK refactoring
    - List SSM parameter naming changes
    - Note alignment with orb-schema-generator
    - _Requirements: 14.1, 14.2, 14.3_

- [x] 14. Open issues with orb-schema-generator team
  - [x] 14.1 Create enhancement request for table SSM parameter generation
    - Request SSM parameters for table ARNs and names
    - _Requirements: 10.1_
  - [x] 14.2 Create enhancement request for table PITR configuration
    - Request PITR option in schema definition
    - _Requirements: 10.2_
  - [x] 14.3 Create documentation feedback issue
    - Request schema type generation matrix
    - Request construct extension examples
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 15. Final checkpoint
  - Run all tests
  - Verify CDK synth succeeds
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Tests validate correctness of parameter naming changes
