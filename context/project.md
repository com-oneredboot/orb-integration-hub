# Project: org-integration-hub (Title: OneRedBoot.com Payment Gateway)

## Technology Stack
- Frontend: Angular 18
- Backend: AWS services (AppSync, Cognito, DynamoDB, Lambda, Step Functions)
- Monitoring and Logging: CloudWatch
- Infrastructure as Code: CloudFormation
- Payment processors: Stripe (primary), with plans to add PayPal, Apple Pay, Google Pay, and others
- Authentication: Cognito with Amplify (future plans to add Auth0 and others)
- Backend language: Python 3.12
- Version control: GitHub
- CI/CD: GitHub Actions

## Authentication and Authorization Structure

### Cognito Groups
Basic authentication groups in Cognito:
- User: Base group that all other groups extend from
- Customer: End-users making purchases through client websites
- Client: Customers using the integration hub service for transactions
- Employees: Internal staff (developers, administrators, support)
- Owner: Root-level system access

### DynamoDB Roles Table
The roles table in DynamoDB manages fine-grained permissions and role assignments:

#### Schema
```
{
  roleId: string (Primary Key),
  applicationId: string (Sort Key),
  roleName: string,
  roleType: string (Employee|Client|Customer|Owner),
  permissions: Array<string>,
  createdAt: timestamp,
  updatedAt: timestamp,
  active: boolean
}
```

#### Employee Role Types
For the Employee cognito group, roles are:
- Developer: System development and maintenance
- Administrator: System configuration and user management
- Support: Customer service and issue resolution
- Sales: Client account management

#### Role-Application Mapping
- Each role is associated with one or more applicationIds
- Applications represent different systems/websites using the integration hub
- Roles can have different permissions across applications

### JWT Claims Structure
Custom claims added to JWT tokens:
```json
{
  "applicationRoles": ["role1", "role2"],
  "cognitoGroup": "string",
  "permissions": ["permission1", "permission2"],
  "tenantId": "string",
  "applicationId": "string"
}
```

### Role Permissions

#### Customer Role
- Register for events
- Make payments
- View own transaction history
- Manage profile
- View event details

#### Client Role
- Create and manage events
- Process payments
- View transaction reports
- Manage customer accounts
- Configure payment methods
- Access analytics dashboard

#### Employee Roles Hierarchy and Permissions

##### Developer
- Access development environments
- View logs and metrics
- Debug customer issues
- Deploy updates
- Manage client configurations

##### Administrator (includes Developer permissions plus)
- Manage developer accounts
- Configure system settings
- Access all environments
- View audit logs
- Manage client organizations

##### Support
- View customer accounts
- Handle customer issues
- Access support tools
- View transaction logs
- Generate reports

##### Sales
- View client accounts
- Access pricing tools
- Generate client reports
- View usage analytics

#### Owner Role
- Full system access
- Manage administrator accounts
- Access all features and environments
- View system-wide analytics
- Configure global settings

### Multi-Application Support
The system supports multiple applications through:

#### Application Registration
```json
{
  "applicationId": "string",
  "name": "string",
  "domain": "string",
  "settings": {
    "paymentMethods": ["stripe", "paypal"],
    "features": ["events", "payments", "subscriptions"]
  },
  "apiKeys": {
    "public": "string",
    "private": "string"
  }
}
```

#### Application Isolation
- Each application has its own set of:
    - API keys
    - Configuration settings
    - User roles
    - Event types
    - Payment methods

## UI/UX Specifications

### Design Principles
- Simple and intuitive interface
- OneRedBoot brand colors
- Responsive layout
- Reusable components
- Role-based organization

### Component Structure
Role-based UI organization:
- User: Basic authentication and profile components
- Customer: Event and payment interfaces
- Client: Management and reporting dashboards
- Internal (Employees): Administrative interfaces

### Naming Conventions
- Angular Components: PascalCase (e.g., SignupComponent)
- TypeScript files: camelCase
- Python files and functions: snake_case

## Development Approach
- Step-by-step development
- Microservice architecture
- Regular testing and validation
- Continuous integration/deployment

## Deployment Strategy
- GitHub Actions for CI/CD
- Separate development and production pipelines
- Automated testing before deployment

## Project Description
A comprehensive integration hub providing:
- Payment processing with multiple providers
- Event management and registration
- User authentication and authorization
- Client and customer management
- Analytical reporting

## Completed Tasks
1. Set up Angular 18 project structure
2. Installed necessary dependencies including AWS Amplify
3. Created basic components for signup, signin, and confirm-signup
4. Implemented AuthService with Cognito integration
5. Set up basic routing
6. Configured testing environment with Karma and Jasmine
7. Implemented the auth service (AuthService) with:
    - User registration (registerUser)
    - Registration confirmation (confirmRegistration)
    - User authentication (authenticateUser)
    - User logout (logoutUser)
8. Integrated Amplify's GraphQL client for user profiles
9. Implemented error handling and logging
10. Created custom error types
11. Project scope expansion evaluation
12. Implement signin component logic
13. Create and implement signup component
14. Create and implement confirm-signup component
15. Set up protected routes using AuthGuard
16. Implemented context-generator
17. Configure MFA in Cognito User Pool:
    - Enable MFA settings
    - Configure TOTP options
    - Configure device tracking
18. Update AuthService for MFA:
    - Simplified implementation
    - Setup and verification methods
    - Device tracking
19. Create MFA Registration Flow:
    - Updated signup component
    - MFA setup interface
    - Verification flow
20. Update sign-in for MFA verification
21. Implement authentication error handling
22. Begin Lambda integration
23. Set up CI/CD pipelines

## Next Steps
24. Start Stripe payment processing
25. Update AppSync API for user profiles
26. Test authentication flow
27. Implement profile management
28. Add payment processors
29. Enhance MFA Security:
    - Rate limiting
    - Bypass protection
    - Device token storage
    - Audit logging
30. Test MFA Implementation:
    - Unit testing
    - Integration testing
    - Device remembrance
    - Documentation updates

## Current Issues
No current issues reported.