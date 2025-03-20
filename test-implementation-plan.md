# Unit Test Implementation Plan

## Checkpoint Management

A checkpoint has been created at the start of test implementation to allow for safe rollback if needed:

- Tag name: `checkpoint-pre-testing`
- Purpose: Safe point to return to if test improvements cause issues
- Location: Available in both local and remote repositories

### Checkpoint Usage

1. View the checkpoint:
```bash
git checkout checkpoint-pre-testing
```

2. Revert to checkpoint:
```bash
git reset --hard checkpoint-pre-testing
```

3. Create new branch from checkpoint:
```bash
git checkout -b new-branch checkpoint-pre-testing
```

## 1. Fix the User Model Issues

The current user.model.ts has issues with groups type compatibility. The GraphQL schema uses [String] but TypeScript is using UserGroups[].

- Update all test files to import UserGroups and UserStatus from the enum file, not the model
- Fix all created_at fields in tests to use number (timestamp) instead of string format
- Update the typescript_model.jinja template to properly handle enum types

## 2. Backend Unit Tests 

Create unit tests for:
- Python model classes (using pytest)
- DynamoDB interactions
- GraphQL resolver functions

## 3. Frontend Unit Tests

Enhance existing tests:
- UserService tests to ensure proper GraphQL API calls
- Auth-flow component tests 
- Profile component tests
- Add tests for model serialization/deserialization
- Add tests for Cognito interactions

## 4. Unit Test Runner Configuration

- Set up consistent test runners for both frontend and backend
- Implement code coverage reporting
- Add test scripts to package.json and Python setup

## 5. CI/CD Pipeline Integration

- Add GitHub workflow for running tests
- Implement test coverage thresholds
- Add test reports to PR pipeline

## Implementation Priority

1. Fix current model issues - **HIGH**
2. Update frontend tests - **HIGH**
3. Add backend tests - **MEDIUM** 
4. Configure test runners - **MEDIUM**
5. CI/CD integration - **LOW**

