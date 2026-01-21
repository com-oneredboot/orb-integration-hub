# Requirements Document

## Introduction

This specification covers the implementation of security fixes identified during the auth-workflow-review security audit. The fixes address 13 security findings ranging from CRITICAL to LOW severity, with 3 remaining release blockers that must be resolved before SDK release.

## Glossary

- **XSS**: Cross-Site Scripting - injection attack where malicious scripts are injected into trusted websites
- **PII**: Personally Identifiable Information - data that can identify an individual (email, phone, etc.)
- **Rate_Limiting**: Mechanism to control the number of requests a user can make in a time period
- **IAM**: Identity and Access Management - AWS service for managing permissions
- **AppSync**: AWS managed GraphQL service
- **Cognito**: AWS managed authentication service
- **Custom_Validators**: Angular validation functions in `custom-validators.ts`
- **Auth_Guard**: Angular route guard that protects routes requiring authentication

## Requirements

### Requirement 1: URL-Encoded XSS Protection

**User Story:** As a security engineer, I want XSS validation to catch URL-encoded payloads, so that attackers cannot bypass sanitization using encoded characters.

#### Acceptance Criteria

1. WHEN a user submits URL-encoded XSS payload (e.g., `%3Cscript%3E`), THE Custom_Validators SHALL decode and detect the malicious content
2. WHEN a user submits double-encoded XSS payload, THE Custom_Validators SHALL decode all layers and detect the malicious content
3. WHEN a user submits valid URL-encoded content (e.g., `%20` for space), THE Custom_Validators SHALL allow the input
4. THE Custom_Validators SHALL handle decoding errors gracefully without crashing

### Requirement 2: PII Removal from Debug Logs

**User Story:** As a compliance officer, I want PII removed from debug logs, so that we comply with GDPR and prevent data exposure.

#### Acceptance Criteria

1. THE Cognito_Service SHALL NOT log email addresses in plaintext
2. THE Cognito_Service SHALL NOT log cognitoSub identifiers in plaintext
3. THE User_Service SHALL NOT log email addresses in plaintext
4. THE User_Effects SHALL NOT log email addresses or cognitoSub in plaintext
5. WHEN logging user-related information, THE System SHALL use masked or anonymized identifiers
6. IF debug logging is required, THEN THE System SHALL log only non-PII metadata (timestamps, operation names)

### Requirement 3: Authenticate Route Protection

**User Story:** As a user, I want to be redirected to the dashboard if I'm already authenticated and visit /authenticate, so that I don't see the login page unnecessarily.

#### Acceptance Criteria

1. WHEN an authenticated user navigates to /authenticate, THE Auth_Guard SHALL redirect them to the dashboard
2. WHEN an unauthenticated user navigates to /authenticate, THE Auth_Guard SHALL allow access to the login page
3. THE redirect SHALL preserve any query parameters for post-login navigation

### Requirement 4: IAM Permission Scoping

**User Story:** As a security engineer, I want Lambda IAM permissions scoped to specific resources, so that we follow the principle of least privilege.

#### Acceptance Criteria

1. THE Lambda_Stack SHALL scope SNS permissions to project-specific topic ARNs
2. THE Lambda_Stack SHALL scope SES permissions to verified identity ARNs
3. THE Lambda_Stack SHALL scope KMS permissions to specific key ARNs
4. WHEN a Lambda requires cross-account access, THE Lambda_Stack SHALL document the exception

### Requirement 5: AppSync Security Hardening

**User Story:** As a security engineer, I want AppSync configured with security best practices, so that the API is protected against common attacks.

#### Acceptance Criteria

1. WHEN deployed to production, THE AppSync_Stack SHALL disable GraphQL introspection
2. WHEN deployed to non-production, THE AppSync_Stack MAY enable introspection for debugging
3. THE AppSync_Stack SHALL configure API key expiration to 90 days maximum
4. THE AppSync_Stack SHALL implement query depth limits to prevent DoS attacks
5. THE AppSync_Stack SHALL implement query complexity limits to prevent resource exhaustion

### Requirement 6: Cognito Advanced Security

**User Story:** As a security engineer, I want Cognito configured with advanced security features, so that compromised credentials are detected.

#### Acceptance Criteria

1. THE Cognito_Stack SHALL enable advanced security mode
2. THE Cognito_Stack SHALL configure compromised credentials detection
3. THE Cognito_Stack SHALL configure risk-based adaptive authentication
4. WHEN a compromised credential is detected, THE System SHALL block the authentication attempt

### Requirement 7: AWS WAF Protection for AppSync

**User Story:** As a security engineer, I want AWS WAF attached to AppSync, so that the API is protected against common attacks and abuse.

#### Acceptance Criteria

1. THE AppSync_Stack SHALL attach an AWS WAF WebACL to the GraphQL API in all environments
2. THE WAF SHALL include AWS managed rule groups:
   - AWSManagedRulesCommonRuleSet (common attack protection)
   - AWSManagedRulesKnownBadInputsRuleSet (known bad inputs)
3. THE WAF SHALL include a rate-based rule limiting to 2000 requests per 5 minutes per IP
4. THE WAF metrics SHALL be logged to CloudWatch

