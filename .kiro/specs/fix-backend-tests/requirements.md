# Requirements Document

## Introduction

This spec addresses fixing 53 failing backend tests in the `apps/api` directory. The tests were never run in CI before, causing issues to accumulate. The failures fall into several categories: incorrect module patching, missing methods, and outdated test assertions.

## Glossary

- **Test_Suite**: The collection of pytest tests in `apps/api/lambdas/` and `apps/api/core/testing/`
- **Mock_Patch**: Python's `unittest.mock.patch` decorator used to replace modules/functions during testing
- **Lambda_Module**: The `index.py` file in each lambda directory containing the handler function
- **Performance_Test_Runner**: The `PerformanceTestRunner` class in `core/testing/performance_testing_suite.py`

## Requirements

### Requirement 1: Fix SMS Verification Test Module Patching

**User Story:** As a developer, I want the SMS verification tests to correctly mock the local lambda module, so that tests pass reliably.

#### Acceptance Criteria

1. WHEN tests in `test_sms_verification.py` use `patch("index.get_secret")`, THE Test_Suite SHALL patch the correct `sms_verification/index.py` module, not `check_email_exists/index.py`
2. WHEN tests use `patch("index.lambda_handler")`, THE Test_Suite SHALL reference the dynamically loaded module
3. WHEN tests use `patch("index.sns_client")`, THE Test_Suite SHALL patch the correct module's SNS client
4. WHEN tests use `patch("index.check_rate_limit")`, THE Test_Suite SHALL patch the correct module's rate limit function

### Requirement 2: Fix Check Email Exists Test Assertions

**User Story:** As a developer, I want the check email exists tests to have correct assertions, so that they validate the actual API response format.

#### Acceptance Criteria

1. WHEN `test_response_only_contains_expected_fields` runs, THE Test_Suite SHALL expect the response to contain `email`, `exists`, `cognitoStatus`, and `cognitoSub` fields
2. THE Test_Suite SHALL update assertions to match the current API response schema

### Requirement 3: Fix Performance Test Suite Methods

**User Story:** As a developer, I want the performance test suite to have all required methods implemented, so that performance tests pass.

#### Acceptance Criteria

1. WHEN `test_system_monitoring_during_tests` runs, THE Performance_Test_Runner SHALL have a `collect_system_metrics` method
2. WHEN `test_performance_metrics_calculation` runs, THE Performance_Test_Runner SHALL have a `calculate_metrics` method
3. WHEN `test_performance_report_generation` runs, THE Performance_Test_Runner SHALL have a `generate_report` method
4. WHEN `test_performance_test_data_export` runs, THE Performance_Test_Runner SHALL have an `export_results` method
5. WHEN performance tests access user data, THE Test_Suite SHALL use the correct key `userId` instead of `user_id`

### Requirement 4: Fix Edge Case Test Suite

**User Story:** As a developer, I want the edge case tests to have correct assertions, so that they validate expected behavior.

#### Acceptance Criteria

1. WHEN `test_edge_case_execution_with_failures` runs, THE Test_Suite SHALL correctly assert the expected failure behavior

### Requirement 5: Update Deprecated datetime Usage

**User Story:** As a developer, I want the test factories to use non-deprecated datetime methods, so that tests don't produce warnings.

#### Acceptance Criteria

1. WHEN `organization_test_data_factory.py` creates timestamps, THE Test_Suite SHALL use `datetime.now(datetime.UTC)` instead of `datetime.utcnow()`
