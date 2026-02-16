# Error Code Registry

## Overview
This document provides a comprehensive list of all error codes used in the ORB Integration Hub system.

## Error Code Format
Format: `ORB-[Category]-[3-digit number]`

Example: `ORB-AUTH-001`

## Categories

### Authentication (AUTH)
| Code | Message | Description | Solution |
|------|---------|-------------|-----------|
| ORB-AUTH-001 | Invalid email format | The provided email address format is invalid | Please enter a valid email address |
| ORB-AUTH-002 | Invalid credentials | The provided email and password combination is invalid | Please check your email and password and try again |
| ORB-AUTH-003 | Email verification failed | Failed to verify email with provided code | Please check the verification code and try again |
| ORB-AUTH-004 | User already exists | A user with this email already exists | Please use a different email or try to sign in |
| ORB-AUTH-005 | User email check failed | Failed to check if user exists by email | Please try again later |

### API (API)
| Code | Message | Description | Solution |
|------|---------|-------------|-----------|
| ORB-API-001 | GraphQL query error | An error occurred while executing a GraphQL query | Please try again later |
| ORB-API-002 | GraphQL mutation error | An error occurred while executing a GraphQL mutation | Please try again later |
| ORB-API-003 | Invalid input for GraphQL operation | The input provided for a GraphQL operation was invalid | Please check the input parameters and try again |
| ORB-API-004 | Network error | A network error occurred while communicating with the API | Please check your internet connection and try again |

### Data (DATA)
| Code | Message | Description | Solution |
|------|---------|-------------|-----------|
| ORB-DATA-001 | Invalid data format | The data format provided is invalid | Please check the data format and try again |
| ORB-DATA-002 | Data not found | The requested data was not found | Please check if the data exists and try again |

### System (SYS)
| Code | Message | Description | Solution |
|------|---------|-------------|-----------|
| ORB-SYS-001 | Unexpected error | An unexpected error occurred | Please try again later |

## Best Practices

1. **Error Code Usage**
   - Always use predefined error codes from the registry
   - Do not create new error codes without updating this documentation
   - Use the most specific error code available

2. **Error Handling**
   - Log errors with appropriate context
   - Include error codes in user-facing messages
   - Provide clear, actionable solutions

3. **Error Recovery**
   - Implement retry logic for transient failures
   - Provide fallback behavior when possible
   - Maintain user state during error recovery

4. **Documentation**
   - Update this document when adding new error codes
   - Include examples of error handling in code comments
   - Document error recovery strategies

## Adding New Error Codes

When adding new error codes:
1. Choose the appropriate category
2. Use the next available number in that category
3. Update this documentation
4. Add the code to the `ErrorCode` type in `error-registry.model.ts`
5. Add the error definition to the `ERRORS` constant
6. Update any relevant tests 