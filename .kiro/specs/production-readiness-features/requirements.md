# Requirements Document: Production Readiness Features

## Introduction

This specification defines six critical features required for production readiness of the orb-integration-hub platform. These features address authentication, authorization, user lifecycle management, and notification delivery - all essential for a production-grade multi-tenant SaaS application.

The features are:
1. JWT Token Claims Enhancement - Ensures proper authorization data in authentication tokens
2. Third-Party User Invitation System - Enables external systems to invite users programmatically
3. Third-Party OAuth Authentication Flow - Enables secure user authentication for third-party applications
4. Admin User Management - Provides user removal and role management capabilities
5. Notifications UI System - Displays and manages in-app notifications
6. Email/SMS Notification Delivery - Delivers notifications via email and SMS channels

## Standard Requirements

This spec follows the [orb-templates Spec Standards](../../repositories/orb-templates/docs/kiro-steering/templates/spec-standards.md).

Requirements 7-10 implement the standard requirements for:
- Documentation updates (Requirement 7)
- Version and changelog management (Requirement 8)
- Git commit standards (Requirement 9)
- Final verification (Requirement 10)

## Glossary

- **JWT (JSON Web Token)**: A compact, URL-safe token format used for authentication and authorization
- **Cognito**: AWS managed authentication service providing user pools and identity management
- **Pre_Token_Generation_Lambda**: AWS Lambda function triggered before Cognito issues JWT tokens, used to add custom claims
- **Custom_Claims**: Additional data fields added to JWT tokens beyond standard Cognito claims
- **Regular_Login_Flow**: Existing users authenticate with email/password via Cognito, receive JWT with custom claims
- **Invitation_Signup_Flow**: New users sign up using invitation token, creating Cognito account and role assignments
- **Invitation_Token**: A secure, time-limited token used to authorize user signup for specific applications
- **Application_User_Role**: A record linking a user to an application with a specific role in a specific environment
- **Notification_System**: The infrastructure for creating, storing, and delivering notifications to users
- **SES (Simple Email Service)**: AWS managed email sending service
- **SNS (Simple Notification Service)**: AWS managed messaging service for SMS and push notifications
- **SDK_API**: The GraphQL API endpoint for third-party integrations, secured with Lambda authorizer
- **orb_sdk**: The Python/TypeScript SDK that third-party applications use to interact with the integration hub and validate tokens
- **Main_AppSync_API**: The primary GraphQL API for the web application, secured with Cognito authentication
- **Lambda_Authorizer**: AWS Lambda function that validates API keys or tokens for SDK API access
- **NgRx_Store**: Redux-based state management library for Angular applications
- **Unread_Count**: The number of notifications marked as PENDING for a user
- **Notification_Channel**: The delivery method for a notification (IN_APP, EMAIL, SMS)
- **Delivery_Status**: The current state of a notification delivery attempt (SENT, DELIVERED, FAILED, BOUNCED)
- **Bulk_Operation**: An action performed on multiple records simultaneously
- **Audit_Log**: A record of administrative actions for compliance and troubleshooting
- **OAuth_Flow**: An authorization framework that enables third-party applications to obtain limited access to user accounts
- **Auth_Token**: A short-lived token (5 minutes) created during authentication initiation, linking the third-party app to the login session
- **Authorization_Code**: A single-use code (1 minute expiry) exchanged for access and refresh tokens after successful authentication
- **Access_Token**: A JWT token (1 hour expiry) used to authenticate API requests on behalf of a user
- **Refresh_Token**: An opaque token (30 days expiry) used to obtain new access tokens without re-authentication
- **Callback_URL**: A pre-registered URL where the user is redirected after authentication, with authorization code as query parameter
- **PKCE (Proof Key for Code Exchange)**: An OAuth extension that prevents authorization code interception attacks in public clients
- **Code_Challenge**: A SHA256 hash of the code_verifier, sent during authentication initiation
- **Code_Verifier**: A random string sent during token exchange to prove the client that initiated auth is the same one exchanging the code
- **Token_Blacklist**: A DynamoDB table storing revoked access tokens until their natural expiration
- **Rate_Limiter**: A system component that enforces request limits per client or token to prevent abuse
- **State_Parameter**: A random value used for CSRF protection, passed through the OAuth flow and validated on callback

## API Boundary Definitions

**CRITICAL:** This section defines strict API boundaries to prevent crosstalk between SDK API and Main AppSync API.

### SDK API (Third-Party Integrations)

**Purpose:** Programmatic access for third-party applications and systems

**Authentication:** Lambda Authorizer with API keys (client_id + client_secret)

**Endpoints:**
- `POST /sdk/auth/initiate` - Create auth token for OAuth flow
- `POST /sdk/auth/exchange` - Exchange authorization code for tokens
- `POST /sdk/auth/refresh` - Refresh access token
- `POST /sdk/auth/logout` - Revoke tokens

**GraphQL Mutations (SDK API ONLY):**
- `createInvitation` - Generate invitation token for user signup
- `revokeInvitation` - Revoke an invitation token
- `createBulkInvitations` - Generate multiple invitation tokens

**Access Pattern:** Third-party backend servers call SDK API with API keys

**Security:** Lambda authorizer validates API keys against Applications table

### Main AppSync API (Web Application)

**Purpose:** Frontend application access for authenticated users

**Authentication:** AWS Cognito User Pools (JWT tokens)

**GraphQL Mutations (Main API ONLY):**
- `removeUserFromApplication` - Admin removes user from application
- `unassignUserFromEnvironment` - Admin removes user from environment
- `revokeUserRole` - Admin revokes specific role
- `bulkRemoveUsers` - Admin removes multiple users
- `NotificationCreate` - Create notification
- `NotificationUpdate` - Update notification status
- `NotificationDelete` - Delete notification

**GraphQL Queries (Main API ONLY):**
- `UserNotifications` - Query user's notifications
- `ApplicationUsers` - Query application users
- `getCurrentUser` - Get current authenticated user

**Access Pattern:** Angular frontend calls Main AppSync API with Cognito JWT

**Security:** Cognito authentication + AppSync authorization rules (groups: OWNER, ADMIN, CUSTOMER, USER)

### Public Endpoints (No Authentication)

**Purpose:** User-facing pages accessible without authentication

**Endpoints:**
- `GET /login?token={auth_token}` - Login page with OAuth token
- `GET /signup?token={invitation_token}` - Signup page with invitation token
- `POST /auth/validate-token` - Validate auth token (called by frontend)

**Access Pattern:** User's browser accesses these pages directly

**Security:** Token validation against DynamoDB, no API key or Cognito required

### Strict Separation Rules

1. **SDK API mutations SHALL NOT be callable from Main AppSync API**
2. **Main AppSync API mutations SHALL NOT be callable from SDK API**
3. **Third-party applications SHALL NOT receive Cognito credentials**
4. **Web application SHALL NOT use API keys for authentication**
5. **Lambda authorizer SHALL ONLY validate SDK API requests**
6. **Cognito authentication SHALL ONLY validate Main AppSync API requests**
7. **Public endpoints SHALL NOT require authentication but SHALL validate tokens**

## Requirements

### Requirement 1: JWT Token Claims Enhancement

**User Story:** As a developer, I want JWT tokens to include all necessary authorization data, so that the frontend and backend can make proper authorization decisions without additional database queries.

**Context:** This requirement enhances the EXISTING regular login flow. When a user logs in with their Cognito credentials (email/password), the Pre-Token-Generation Lambda automatically looks up their existing ApplicationUserRoles records and adds that data to the JWT. This is NOT related to invitation signup - it's for users who already have accounts.

**Regular Login Flow:**
1. User enters email/password on login page
2. Frontend calls Cognito authentication API
3. Cognito validates credentials
4. Cognito triggers Pre-Token-Generation Lambda BEFORE issuing JWT
5. Lambda queries Users table by cognitoSub to get userId
6. Lambda queries ApplicationUserRoles table by userId to get all role assignments
7. Lambda adds custom claims to JWT: userId, email, cognitoSub, groups, organizations, applicationPermissions
8. Cognito issues JWT with custom claims
9. Frontend receives JWT and caches claims in NgRx store
10. User is logged in and can access authorized resources

**No third-party involvement** - this is the standard login flow for existing users.

#### Acceptance Criteria

1. WHEN a user logs in and Cognito generates a JWT token, THE Pre_Token_Generation_Lambda SHALL add userId as a custom claim
2. WHEN a user logs in and Cognito generates a JWT token, THE Pre_Token_Generation_Lambda SHALL add email as a custom claim
3. WHEN a user logs in and Cognito generates a JWT token, THE Pre_Token_Generation_Lambda SHALL add cognitoSub as a custom claim
4. WHEN a user logs in and Cognito generates a JWT token, THE Pre_Token_Generation_Lambda SHALL add user groups (USER, CUSTOMER, EMPLOYEE, OWNER) as a custom claim
5. WHEN a user logs in and Cognito generates a JWT token, THE Pre_Token_Generation_Lambda SHALL query ApplicationUserRoles table by userId and add organization memberships as a custom claim
6. WHEN a user logs in and Cognito generates a JWT token, THE Pre_Token_Generation_Lambda SHALL query ApplicationUserRoles table by userId and add application access permissions (applicationId, environment, roleName) as a custom claim
7. WHEN the Pre_Token_Generation_Lambda queries DynamoDB, THE Pre_Token_Generation_Lambda SHALL handle errors gracefully and return a valid token with available claims
8. WHEN the frontend receives a JWT token, THE Auth_Service SHALL extract and cache custom claims in NgRx store
9. WHEN the frontend needs to check authorization, THE Auth_Service SHALL use cached JWT claims without additional API calls
10. THE Pre_Token_Generation_Lambda SHALL complete token generation within 5 seconds to avoid Cognito timeout

### Requirement 2: Third-Party User Invitation and Login System

**User Story:** As an external system administrator, I want to generate invitation tokens programmatically and have users log in through my system, so that I can manage the complete user lifecycle without manual intervention.

**Context:** This requirement enables external systems to invite new users AND handle subsequent logins. There are two flows:

**A) Invitation Signup Flow (First Time):**
1. Third-party system authenticates to SDK API using their API key (validated by Lambda authorizer)
2. Third-party calls GraphQL createInvitation mutation on SDK API with applicationId, environmentId, roleId, recipientEmail
3. System generates invitation token and returns signup URL: `https://integration-hub.example.com/signup?token=abc123`
4. Third-party redirects user to signup URL (or sends via email)
5. User lands on our public signup page with token in URL query parameter
6. Our signup page validates token, extracts invitation details, shows signup form pre-filled with email
7. User completes signup (password, name, etc.)
8. System creates Cognito user, DynamoDB user record, and ApplicationUserRole assignment
9. User is logged in and redirected to the application

**B) Third-Party Login Flow (Subsequent Logins):**
1. User visits third-party application and clicks login/access integration
2. Third-party redirects user to our login page: `https://integration-hub.example.com/login?redirect_uri=https://thirdparty.com/callback`
3. User enters email/password on our login page
4. Cognito validates credentials and triggers Pre-Token-Generation Lambda
5. Lambda adds custom claims (userId, roles, permissions) to JWT
6. User is logged in and redirected back to third-party via redirect_uri with JWT token
7. Third-party uses orb-sdk to validate JWT token signature and extract claims
8. Third-party grants access to their application based on permissions in JWT claims

**What we receive:** 
- Signup: invitation token AND redirect_uri in URL query parameters (`?token=abc123&redirect_uri=https://thirdparty.com/callback`)
- Login: redirect_uri in URL query parameter (`?redirect_uri=https://thirdparty.com/callback`)

**Example GraphQL Mutation (called by third party on SDK API):**
```graphql
mutation CreateInvitation {
  createInvitation(input: {
    applicationId: "app-123"
    environmentId: "PRODUCTION"
    roleId: "role-456"
    recipientEmail: "user@example.com"
    redirectUri: "https://thirdparty.com/callback"  # Optional: where to redirect after signup
  }) {
    invitationToken
    signupUrl  # Returns: https://integration-hub.example.com/signup?token=abc123&redirect_uri=https://thirdparty.com/callback
    expiresAt
  }
}
```

#### Acceptance Criteria

1. WHEN an authorized third-party calls createInvitation mutation on SDK API with valid API key, THE Lambda_Authorizer SHALL validate the API key
2. WHEN an authorized third-party calls createInvitation mutation with applicationId, environmentId, and roleId, THE Invitation_System SHALL generate a cryptographically secure invitation token
2. WHEN creating an invitation, THE Invitation_System SHALL store applicationId, environmentId, roleId, recipientEmail, and expirationTimestamp in DynamoDB
3. WHEN creating an invitation, THE Invitation_System SHALL encode applicationId, environmentId, roleId, and recipientEmail in the invitation token
4. WHEN creating an invitation, THE Invitation_System SHALL set expiration to 7 days from creation by default
5. WHEN an invitation is created, THE Invitation_System SHALL return the invitation token and a complete signup URL with token as query parameter
6. WHEN a user accesses the public signup page with token query parameter, THE Signup_Page SHALL extract the token from URL
7. WHEN a user accesses the public signup page with a valid invitation token, THE Signup_Handler SHALL decode the token and extract invitation details
8. WHEN a user accesses the public signup page with a valid invitation token, THE Signup_Handler SHALL validate the token has not expired
9. WHEN a user accesses the public signup page with a valid invitation token, THE Signup_Handler SHALL validate the token has not been revoked
10. WHEN a user accesses the public signup page with a valid invitation token, THE Signup_Page SHALL pre-fill the email field with recipientEmail from token
11. WHEN a user completes signup with a valid invitation token, THE Signup_Handler SHALL create the user in Cognito
12. WHEN a user completes signup with a valid invitation token, THE Signup_Handler SHALL create the user record in Users table
13. WHEN a user completes signup with a valid invitation token, THE Signup_Handler SHALL create ApplicationUserRole record with applicationId, environmentId, and roleId from the token
14. WHEN a user completes signup with a valid invitation token, THE Signup_Handler SHALL mark the invitation as ACCEPTED in DynamoDB
15. WHEN a user completes signup with a valid invitation token AND redirect_uri is present, THE Signup_Handler SHALL redirect the user back to the third-party application via redirect_uri with authentication token
16. WHEN an authorized user calls revokeInvitation mutation, THE Invitation_System SHALL mark the invitation as REVOKED
17. WHEN a user attempts to use a revoked invitation, THE Signup_Handler SHALL reject the signup with an error message
18. WHEN an authorized user calls createBulkInvitations mutation, THE Invitation_System SHALL generate multiple invitations and return all tokens
19. THE Invitation_System SHALL track invitation status (PENDING, ACCEPTED, EXPIRED, REVOKED)
20. WHEN a user accesses the login page with redirect_uri parameter, THE Login_Page SHALL store the redirect_uri for post-login redirect
21. WHEN a user successfully logs in with redirect_uri parameter, THE Login_Handler SHALL redirect the user back to the third-party application via redirect_uri
22. WHEN redirecting back to third-party, THE Login_Handler SHALL include authentication token or authorization code in the redirect URL
23. WHEN a third-party application receives the redirect with token, THE Third_Party SHALL use the orb-sdk to validate the token
24. WHEN the orb-sdk validates the token, THE SDK SHALL verify the token signature and extract user claims
25. WHEN token validation succeeds, THE Third_Party SHALL grant the user access to their application with permissions from JWT claims
26. WHEN a user accesses the signup page with redirect_uri parameter, THE Signup_Page SHALL store the redirect_uri through the multi-step signup process
27. WHEN redirect_uri is provided, THE Signup_Handler SHALL validate the redirect_uri against a whitelist of allowed domains
28. WHEN redirect_uri validation fails, THE Signup_Handler SHALL reject the redirect and show an error message

### Requirement 3: Third-Party OAuth Authentication Flow

**User Story:** As a third-party application developer, I want users to authenticate on the orb-integration-hub platform and receive secure tokens, so that my application can verify user identity and access permissions without handling credentials.

**Context:** This requirement implements an OAuth-style authentication flow where third-party applications redirect users to the orb-integration-hub login page, users authenticate with their credentials, and authentication tokens are returned to the third-party application via callback URL. This is documented in detail in `docs/authentication-flow.md`.

**Reference Documentation:** See `docs/authentication-flow.md` for complete flow diagrams, security analysis, and implementation details.

#### Acceptance Criteria

**3.1 Application Registration and Callback URLs**

1. WHEN an application is created, THE Applications_Table SHALL include a callbackUrls array field
2. WHEN an application is created, THE Application_Owner SHALL register one or more callback URLs
3. WHEN a callback URL is registered, THE System SHALL validate it is a valid HTTPS URL for production environments
4. WHEN a callback URL is registered, THE System SHALL store it in the Applications.callbackUrls array
5. WHEN an application has multiple callback URLs, THE System SHALL allow any registered URL to be used in auth flows

**3.2 Authentication Initiation**

6. WHEN a third-party calls /sdk/auth/initiate with client_id, client_secret, callback_url, and environment, THE Lambda_Authorizer SHALL validate the client credentials
7. WHEN validating initiate request, THE Lambda_Authorizer SHALL verify the application status is ACTIVE
8. WHEN validating initiate request, THE Lambda_Authorizer SHALL verify the application has access to the specified environment
9. WHEN validating initiate request, THE Lambda_Authorizer SHALL verify the callback_url matches one of the registered callbackUrls
10. WHEN callback_url validation fails, THE Lambda_Authorizer SHALL return error "Invalid callback URL"
11. WHEN initiate request is valid, THE Auth_Service SHALL generate a cryptographically secure auth token (32 bytes, base64url encoded)
12. WHEN auth token is generated, THE Auth_Service SHALL store it in auth_tokens DynamoDB table with status PENDING
13. WHEN storing auth token, THE Auth_Service SHALL set expires_at to 5 minutes from creation
14. WHEN storing auth token, THE Auth_Service SHALL set DynamoDB TTL to 10 minutes from creation
15. WHEN initiate succeeds, THE Auth_Service SHALL return auth_token and login_url

**3.3 Login Page and Token Validation**

16. WHEN a user accesses the login page with token query parameter, THE Login_Frontend SHALL extract the token from URL
17. WHEN login page receives a token, THE Login_Frontend SHALL call backend to validate the token
18. WHEN validating token, THE Auth_Service SHALL verify token exists in auth_tokens table
19. WHEN validating token, THE Auth_Service SHALL verify token status is PENDING
20. WHEN validating token, THE Auth_Service SHALL verify token has not expired
21. WHEN token is valid, THE Login_Frontend SHALL display the login form with application name and environment
22. WHEN token is invalid or expired, THE Login_Frontend SHALL display error message "Invalid or expired authentication request"

**3.4 User Authentication and Claims**

23. WHEN user enters credentials on login page, THE Login_Frontend SHALL call Cognito authentication
24. WHEN Cognito validates credentials, THE Cognito SHALL trigger Pre_Token_Generation_Lambda
25. WHEN Pre_Token_Generation_Lambda executes, THE Lambda SHALL add custom claims (userId, email, groups, permissions) to JWT
26. WHEN authentication succeeds, THE Auth_Service SHALL update auth_tokens record with status AUTHENTICATED
27. WHEN updating auth token, THE Auth_Service SHALL store user_claims from JWT in the record
28. WHEN authentication succeeds, THE Auth_Service SHALL generate a cryptographically secure authorization code (32 bytes, base64url encoded)
29. WHEN authorization code is generated, THE Auth_Service SHALL store it in authorization_codes table
30. WHEN storing authorization code, THE Auth_Service SHALL link it to the auth_token
31. WHEN storing authorization code, THE Auth_Service SHALL set expires_at to 1 minute from creation
32. WHEN storing authorization code, THE Auth_Service SHALL set used flag to false
33. WHEN storing authorization code, THE Auth_Service SHALL set DynamoDB TTL to 6 minutes from creation

**3.5 Callback Redirect**

34. WHEN authorization code is created, THE Auth_Service SHALL redirect user's browser to callback_url with code as query parameter
35. WHEN state parameter was provided in initiate, THE Auth_Service SHALL include state in callback redirect
36. WHEN redirecting to callback, THE System SHALL use HTTP 302 redirect

**3.6 Token Exchange**

37. WHEN third-party receives callback with code, THE Third_Party SHALL call /sdk/auth/exchange with code, client_id, and client_secret
38. WHEN validating exchange request, THE Lambda_Authorizer SHALL verify code exists in authorization_codes table
39. WHEN validating exchange request, THE Lambda_Authorizer SHALL verify code has not been used
40. WHEN validating exchange request, THE Lambda_Authorizer SHALL verify code has not expired
41. WHEN validating exchange request, THE Lambda_Authorizer SHALL verify client_id matches the code's client_id
42. WHEN validating exchange request, THE Lambda_Authorizer SHALL verify client_secret is valid
43. WHEN code is used, THE Auth_Service SHALL mark it as used in authorization_codes table
44. WHEN code is used, THE Auth_Service SHALL set used_at timestamp
45. WHEN code is already used, THE Auth_Service SHALL return error "Code already used"
46. WHEN exchange succeeds, THE Auth_Service SHALL retrieve user_claims from linked auth_token
47. WHEN exchange succeeds, THE Auth_Service SHALL generate JWT access token with user claims
48. WHEN generating access token, THE Auth_Service SHALL include appId, environment, and permissions in claims
49. WHEN generating access token, THE Auth_Service SHALL set expiration to 1 hour from issuance
50. WHEN exchange succeeds, THE Auth_Service SHALL generate refresh token (opaque token)
51. WHEN refresh token is generated, THE Auth_Service SHALL store it in refresh_tokens table
52. WHEN storing refresh token, THE Auth_Service SHALL set expires_at to 30 days from creation
53. WHEN exchange succeeds, THE Auth_Service SHALL return access_token, refresh_token, token_type, expires_in, and user object

**3.7 Token Refresh**

54. WHEN third-party calls /sdk/auth/refresh with refresh_token, client_id, and client_secret, THE Lambda_Authorizer SHALL validate the credentials
55. WHEN validating refresh request, THE Auth_Service SHALL verify refresh_token exists and is not revoked
56. WHEN validating refresh request, THE Auth_Service SHALL verify refresh_token has not expired
57. WHEN validating refresh request, THE Auth_Service SHALL verify client_id matches the token's application
58. WHEN refresh succeeds, THE Auth_Service SHALL generate new access token with same claims
59. WHEN refresh succeeds, THE Auth_Service SHALL return new access_token and expires_in
60. THE Refresh_Token SHALL remain unchanged after refresh

**3.8 Logout and Revocation**

61. WHEN third-party calls /sdk/auth/logout with access_token, THE Auth_Service SHALL add access token to blacklist
62. WHEN adding to blacklist, THE Auth_Service SHALL store token_jti (JWT ID) in token_blacklist table
63. WHEN adding to blacklist, THE Auth_Service SHALL set TTL to match original token expiry
64. WHEN logout includes refresh_token, THE Auth_Service SHALL mark refresh_token as revoked
65. WHEN marking refresh token as revoked, THE Auth_Service SHALL set revoked flag to true and revoked_at timestamp
66. WHEN logout succeeds, THE Auth_Service SHALL return success message

**3.9 Rate Limiting**

67. WHEN /sdk/auth/initiate is called, THE Rate_Limiter SHALL enforce limit of 10 requests per minute per client_id
68. WHEN /sdk/auth/exchange is called, THE Rate_Limiter SHALL enforce limit of 20 requests per minute per client_id
69. WHEN /sdk/auth/refresh is called, THE Rate_Limiter SHALL enforce limit of 30 requests per minute per refresh_token
70. WHEN rate limit is exceeded, THE Rate_Limiter SHALL return error "Rate limit exceeded" with 429 status code
71. WHEN rate limit is exceeded, THE Rate_Limiter SHALL include Retry-After header with seconds until reset

**3.10 PKCE Support (Optional Enhancement)**

72. WHEN third-party provides code_challenge in initiate request, THE Auth_Service SHALL store it with auth_token
73. WHEN code_challenge is provided, THE Auth_Service SHALL require code_verifier in exchange request
74. WHEN validating exchange with PKCE, THE Auth_Service SHALL verify SHA256(code_verifier) equals code_challenge
75. WHEN PKCE validation fails, THE Auth_Service SHALL return error "Invalid code verifier"

**3.11 Security and Monitoring**

76. WHEN any auth endpoint is called, THE System SHALL log the event with timestamp, client_id, and outcome
77. WHEN authentication fails, THE System SHALL log the failure reason
78. WHEN suspicious activity is detected (multiple failures, expired token usage), THE System SHALL log with high severity
79. WHEN tokens are issued or revoked, THE System SHALL create audit log entry
80. THE System SHALL emit CloudWatch metrics for authentication attempts, token generation, and error rates

### Requirement 4: Admin User Management

**User Story:** As an application administrator, I want to remove users from applications and modify their role assignments, so that I can manage user access throughout the user lifecycle.

#### Acceptance Criteria

1. WHEN an OWNER or ADMIN calls removeUserFromApplication mutation, THE User_Management_System SHALL delete all ApplicationUserRole records for that user and application
2. WHEN an OWNER or ADMIN calls unassignUserFromEnvironment mutation, THE User_Management_System SHALL delete ApplicationUserRole records for that user, application, and environment
3. WHEN an OWNER or ADMIN calls revokeUserRole mutation, THE User_Management_System SHALL delete the specific ApplicationUserRole record
4. WHEN a USER or CUSTOMER attempts to call user removal mutations, THE GraphQL_API SHALL reject the request with authorization error
5. WHEN an admin removes a user, THE User_Management_System SHALL create an audit log entry with admin userId, target userId, action, and timestamp
6. WHEN an admin calls bulkRemoveUsers mutation, THE User_Management_System SHALL remove multiple users and return success count and failure details
7. WHEN the frontend displays the user management UI, THE Application_Users_Component SHALL show "Remove User" button only for OWNER and ADMIN roles
8. WHEN an admin clicks "Remove User", THE Application_Users_Component SHALL display a confirmation dialog with user details
9. WHEN an admin confirms user removal, THE Application_Users_Component SHALL dispatch removeUser action to NgRx store
10. WHEN user removal succeeds, THE Application_Users_Component SHALL refresh the user list and display success message
11. WHEN user removal fails, THE Application_Users_Component SHALL display error message with failure reason

### Requirement 5: Notifications UI System

**User Story:** As a user, I want to see and manage my notifications in the application interface, so that I stay informed about important events and can take action when needed.

#### Acceptance Criteria

1. WHEN the application header loads, THE Notification_Bell_Component SHALL display a bell icon
2. WHEN there are unread notifications, THE Notification_Bell_Component SHALL display a badge with the unread count
3. WHEN a user clicks the notification bell, THE Notification_Panel_Component SHALL open and display recent notifications
4. WHEN the notification panel opens, THE Notification_Panel_Component SHALL query notifications using UserNotificationsIndex sorted by createdAt descending
5. WHEN displaying notifications, THE Notification_Item_Component SHALL show title, message, timestamp, and notification type icon
6. WHEN a user clicks a notification, THE Notification_Item_Component SHALL mark it as READ and navigate to the related resource
7. WHEN a user clicks "Dismiss" on a notification, THE Notification_Item_Component SHALL mark it as DISMISSED
8. WHEN a user opens the notification panel, THE Notification_Panel_Component SHALL provide filter options by notification type
9. WHEN a user scrolls to the bottom of the notification list, THE Notification_Panel_Component SHALL load more notifications (pagination)
10. WHEN a new notification is created, THE Notification_System SHALL poll for updates every 30 seconds and update the unread count
11. WHEN a notification has an expiresAt timestamp in the past, THE Notification_Item_Component SHALL display it as expired and disable actions
12. THE Notification_Panel_Component SHALL display a maximum of 50 notifications per page

### Requirement 6: Email/SMS Notification Delivery

**User Story:** As a user, I want to receive important notifications via email and SMS, so that I am informed even when not actively using the application.

#### Acceptance Criteria

1. WHEN a notification is created with EMAIL channel, THE Notification_Delivery_Lambda SHALL send an email via SES
2. WHEN a notification is created with SMS channel, THE Notification_Delivery_Lambda SHALL send an SMS via SNS
3. WHEN sending an email, THE Email_Template_Service SHALL select the appropriate template based on notification type
4. WHEN sending an SMS, THE SMS_Template_Service SHALL format the message using the SMS template for that notification type
5. WHEN an email is sent, THE Notification_Delivery_Lambda SHALL record delivery status (SENT, DELIVERED, FAILED, BOUNCED)
6. WHEN an SMS is sent, THE Notification_Delivery_Lambda SHALL record delivery status (SENT, DELIVERED, FAILED)
7. WHEN email delivery fails, THE Notification_Delivery_Lambda SHALL retry up to 3 times with exponential backoff
8. WHEN SMS delivery fails, THE Notification_Delivery_Lambda SHALL retry up to 2 times with exponential backoff
9. WHEN a user updates notification preferences, THE User_Preferences_System SHALL store channel preferences (IN_APP, EMAIL, SMS) per notification type
10. WHEN creating a notification, THE Notification_System SHALL check user preferences and only deliver via enabled channels
11. WHEN an email includes an unsubscribe link, THE Unsubscribe_Handler SHALL update user preferences to disable email for that notification type
12. WHEN a notification type is marked as CRITICAL, THE Notification_System SHALL deliver via all available channels regardless of user preferences
13. THE Email_Template_Service SHALL support templates for APPLICATION_TRANSFER_REQUEST, APPLICATION_TRANSFER_COMPLETED, ORGANIZATION_INVITATION_RECEIVED, ORGANIZATION_INVITATION_ACCEPTED, and ORGANIZATION_INVITATION_REJECTED
14. THE SMS_Template_Service SHALL support SMS templates for CRITICAL notification types only

### Requirement 7: Documentation Updates

**User Story:** As a developer, I want comprehensive documentation for all production readiness features, so that I can understand, maintain, and extend the system.

#### Acceptance Criteria

1. WHEN production readiness features are implemented, THE Documentation SHALL include architecture diagrams for JWT token flow
2. WHEN production readiness features are implemented, THE Documentation SHALL include sequence diagrams for invitation signup flow
3. WHEN production readiness features are implemented, THE Documentation SHALL include a complete integration guide for third-party invitation system in docs/integration-guides/user-invitations.md
4. WHEN production readiness features are implemented, THE Integration_Guide SHALL document that createInvitation is called on SDK API (not main AppSync API)
5. WHEN production readiness features are implemented, THE Integration_Guide SHALL document Lambda authorizer authentication requirements
6. WHEN production readiness features are implemented, THE Integration_Guide SHALL document the GraphQL mutation signature with all parameters
7. WHEN production readiness features are implemented, THE Integration_Guide SHALL document the invitation token format and security model
8. WHEN production readiness features are implemented, THE Integration_Guide SHALL document the complete user flow from invitation creation to signup completion
9. WHEN production readiness features are implemented, THE Integration_Guide SHALL include code examples for calling the createInvitation mutation with API key authentication
10. WHEN production readiness features are implemented, THE Integration_Guide SHALL document error handling and edge cases
11. WHEN production readiness features are implemented, THE Documentation SHALL include API documentation for all new GraphQL mutations and queries
12. WHEN production readiness features are implemented, THE Documentation SHALL include configuration guide for SES and SNS setup
13. WHEN production readiness features are implemented, THE Documentation SHALL include OAuth authentication flow documentation (already completed in docs/authentication-flow.md)
14. WHEN updating documentation, THE Documentation_System SHALL ensure content remains relevant and concise
15. THE Documentation_System SHALL remove outdated information
16. THE Documentation SHALL use consistent terminology with the Glossary
17. THE Documentation SHALL avoid duplication by referencing existing orb-templates standards
18. THE Documentation SHALL include "Related Documentation" links where appropriate

### Requirement 8: Version and Changelog Management

**User Story:** As a developer, I want version numbers and changelogs updated, so that I can track changes and understand release history.

#### Acceptance Criteria

1. WHEN production readiness features are implemented, THE Version SHALL be bumped following semantic versioning
2. WHEN the version is bumped, THE CHANGELOG.md SHALL include feature descriptions
3. WHEN updating CHANGELOG.md, THE Changelog_Entry SHALL reference all related issue numbers
4. THE CHANGELOG.md SHALL follow the format: "- Feature description (#issue)"

### Requirement 9: Git Commit Standards

**User Story:** As a developer, I want git commits to follow conventions, so that I can track changes and understand commit history.

#### Acceptance Criteria

1. WHEN committing code, THE Commit_Message SHALL reference issue numbers
2. WHEN committing code, THE Commit_Message SHALL follow conventional commits format: "feat: description #issue"
3. WHEN multiple issues are addressed, THE Commit_Message SHALL reference all issue numbers
4. THE Commit_Message SHALL use descriptive text explaining the change

### Requirement 10: Property-Based Testing

**User Story:** As a developer, I want property-based tests for critical correctness properties, so that I can validate the system behaves correctly across many generated inputs.

#### Acceptance Criteria

1. WHEN the design document includes correctness properties, THE Testing_System SHALL implement property-based tests
2. THE property tests SHALL run minimum 100 iterations per property
3. EACH property test SHALL reference its design document property number
4. THE property test SHALL include a tag with format: "Feature: {feature_name}, Property {N}: {title}"
5. WHEN testing OAuth token generation, THE Property_Test SHALL verify token uniqueness across 100 generations
6. WHEN testing authorization code usage, THE Property_Test SHALL verify single-use enforcement
7. WHEN testing token expiration, THE Property_Test SHALL verify expired tokens are rejected
8. WHEN testing callback URL validation, THE Property_Test SHALL verify only registered URLs are accepted
9. THE property tests SHALL use hypothesis (Python) or fast-check (TypeScript) libraries
10. THE property tests SHALL be annotated with "Validates: Requirements X.Y" comments

### Requirement 11: Final Verification

**User Story:** As a developer, I want all tests and checks to pass, so that I can be confident the code is production-ready.

#### Acceptance Criteria

1. WHEN implementation is complete, THE Test_Suite SHALL pass all unit tests
2. WHEN implementation is complete, THE Test_Suite SHALL pass all property-based tests
3. WHEN implementation is complete, THE Linter SHALL report no errors
4. WHEN implementation is complete, THE Type_Checker SHALL report no errors
5. WHEN implementation is complete, THE Documentation SHALL render correctly
6. THE CHANGELOG.md SHALL be updated with all changes
7. THE Version SHALL be bumped appropriately
8. THE Commits SHALL reference all related issues
9. WHEN all checks pass, THE Final_Verification SHALL confirm no markdown syntax errors
10. WHEN all checks pass, THE Final_Verification SHALL confirm documentation renders correctly in GitHub
6. THE CHANGELOG.md SHALL be updated with all changes
7. THE Version SHALL be bumped appropriately
8. THE Commits SHALL reference all related issues
