# Requirements Document

## Introduction

This document specifies requirements for fixing 102 failing GraphQL service tests in the Angular frontend. The tests fail with `NoValidAuthTokens: No federated jwt` errors because services extend `ApiService` which uses AWS Amplify's `generateClient`. When tests verify Observable return types by checking `.subscribe` exists, the Observables are created but not subscribed to, which is correct. However, Amplify initialization warnings appear because Amplify is not configured in the test environment.

The root cause is that the service tests instantiate real services that call `generateClient()` during construction, triggering Amplify warnings. The tests themselves are well-designed and don't make real API calls, but the test environment needs proper mocking to prevent Amplify initialization issues.

## Glossary

- **ApiService**: Abstract base class that provides GraphQL query/mutation execution methods using AWS Amplify
- **GraphQL_Client**: The AWS Amplify client created by `generateClient()` for making GraphQL API calls
- **Observable**: RxJS Observable type returned by service methods for async data streams
- **Property_Test**: Test using fast-check library to verify properties hold across many generated inputs
- **Unit_Test**: Test verifying specific behavior with fixed inputs
- **Test_Double**: A mock, stub, or spy that replaces a real dependency in tests
- **Amplify_Configuration**: AWS Amplify setup required for authentication and API access

## Requirements

### Requirement 1: Mock ApiService GraphQL Client

**User Story:** As a developer, I want service tests to run without AWS Amplify configuration, so that tests execute quickly and reliably in CI/CD pipelines.

#### Acceptance Criteria

1. WHEN a service test instantiates a service extending ApiService, THE Test_Environment SHALL NOT trigger Amplify configuration warnings
2. WHEN a service method returns an Observable, THE Unit_Test SHALL verify the Observable type without triggering real GraphQL calls
3. WHEN property tests generate random inputs, THE Test_Environment SHALL execute all iterations without authentication errors
4. IF Amplify is not configured, THEN THE Test_Environment SHALL provide mock GraphQL client behavior

### Requirement 2: Preserve Existing Test Coverage

**User Story:** As a developer, I want existing test assertions to continue validating service behavior, so that code quality is maintained.

#### Acceptance Criteria

1. THE Unit_Tests SHALL continue to verify input validation throws appropriate errors
2. THE Unit_Tests SHALL continue to verify methods return Observable types
3. THE Property_Tests SHALL continue to verify properties hold across 100+ iterations
4. WHEN tests pass, THE Test_Results SHALL show 0 failures for service test files

### Requirement 3: Standardize Service Test Pattern

**User Story:** As a developer, I want a consistent test pattern for all GraphQL services, so that new services can be tested easily.

#### Acceptance Criteria

1. THE Test_Pattern SHALL work for OrganizationService tests
2. THE Test_Pattern SHALL work for ApplicationService tests
3. THE Test_Pattern SHALL work for ApiService tests
4. THE Test_Pattern SHALL work for UserService tests
5. WHEN a new service is created, THE Test_Pattern SHALL be reusable without modification

### Requirement 4: Test Isolation

**User Story:** As a developer, I want each test to run in isolation, so that test results are deterministic and reproducible.

#### Acceptance Criteria

1. WHEN a test completes, THE Test_Environment SHALL reset any mocked state
2. WHEN tests run in parallel, THE Test_Results SHALL be consistent
3. THE Test_Environment SHALL NOT require network access to AWS services
4. THE Test_Environment SHALL NOT require valid authentication tokens

### Requirement 5: Maintain Type Safety

**User Story:** As a developer, I want tests to verify TypeScript types are correct, so that type errors are caught at test time.

#### Acceptance Criteria

1. THE Unit_Tests SHALL verify service methods have correct return types
2. THE Property_Tests SHALL use typed arbitraries matching service input types
3. WHEN a service method signature changes, THE Unit_Tests SHALL fail if types don't match
