# Project: org-integration-hub (Title: OneRedBoot.com Payment Gateway)

## Technology Stack
- Frontend: Angular 19 (upgraded from 18)
- Backend: AWS services (AppSync, Cognito, DynamoDB, Lambda, Step Functions)
- Monitoring and Logging: CloudWatch
- Infrastructure as Code: CloudFormation
- Payment processors: Stripe (primary), with plans to add PayPal, Apple Pay, Google Pay, and others
- Authentication: Cognito with Amplify (future plans to add Auth0 and others)
- Backend language: Python 3.12
- Version control: GitHub
- CI/CD: GitHub Actions
- State Management: NgRx

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
```json
{
  "roleId": "string (Primary Key)",
  "applicationId": "string (Sort Key)",
  "roleName": "string",
  "roleType": "string (Employee|Client|Customer|Owner)",
  "permissions": "Array<string>",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "active": "boolean"
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

### Frontend Services

#### CognitoService - Implementation-specific service that:
- Handles all Cognito-specific operations
- Manages Cognito user pools
- Handles Cognito tokens and sessions
- Contains all AWS Amplify/Cognito SDK calls

#### UserService - Domain-specific service that:
- Manages user data and profiles
- Handles user-related business logic
- Interacts with your user database/API
- Provider-agnostic user operations

## Development Approach
- Step-by-step development
- Microservice architecture
- Regular testing and validation
- Continuous integration/deployment

## Deployment Strategy
- GitHub Actions for CI/CD
- Separate development and production pipelines
- Automated testing before deployment

## Completed Tasks
1. Set up Angular project structure
2. Installed necessary dependencies including AWS Amplify
3. Created basic components for signup, signin
4. Implemented CognitoService with Cognito integration
5. Set up basic routing
6. Configured testing environment with Karma and Jasmine
7. Implemented the auth service with:
    - User registration
    - Registration confirmation
    - User authentication
    - User logout
8. Integrated Amplify's GraphQL client for user profiles
9. Implemented error handling and logging
10. Created custom error types
11. Project scope expansion evaluation
12. Implement signin component logic
13. Set up protected routes using AuthGuard
14. Implemented context-generator
15. Configure MFA in Cognito User Pool
16. Update CognitoService for MFA
17. Create MFA Registration Flow
18. Update sign-in for MFA verification
19. Implement authentication error handling
20. Begin Lambda integration
21. Set up CI/CD pipelines
22. Split confirmation into separate email and phone components
23. Initialize auth feature module structure
24. Angular 19 upgraded
25. Added Debugging information to page

## Next Steps
26. Implement Wizard-Style Auth Flow
    - [x] Set up NgRx store
    - [x] Create auth state management
    - [x] Implement auth effects
    - [x] Step 1: enter email and check if User exists
    - [ ] Step 2: User Doesn't Exist - present password form, ensure meets complexity requirements, on submit create cognito user
    - [ ] Step 3: User Doesn't Exist - verify email, update cognito user, create entity in users table
    - [ ] Step 4: User Doesn't Exist - setup MFA, update cognito user
    - [ ] Step 5: User Doesn't Exist - send to signin page
    - [ ] Step 6: User Exists - after signin, if phone, or first name, or last name not in users table send to profile page, profile page will require certain entity attributes before navigation to the dashboard
    - [ ] Step 7: User Exists - after signin, is user is valid (ie all required attributes) send to dashboard
27. Set up Auth Feature State Management
    - Create auth actions
    - Implement auth reducer
    - Set up auth effects
    - Create auth selectors
    - Add unit tests
28. Update Component Architecture
    - [x] Move components to feature module
    - [ ] Implement smart/dumb component pattern
    - [ ] Add component documentation
    - [ ] Create shared components
    - [ ] Update routing structure
29. Begin Payment Processing Implementation
    - Integrate Stripe SDK
    - Create payment components
    - Implement payment flow
    - Add error handling
    - Create success/failure pages
30. Enhance MFA Security
    - Rate limiting
    - Bypass protection
    - Device token storage
    - Audit logging
31. Testing and Documentation
    - Unit testing
    - Integration testing
    - E2E testing
    - API documentation
    - User guide
32. Centralize CSS Architecture
    - Create shared styles directory
    - Set up variables and mixins
    - Create component-specific stylesheets
    - Implement BEM methodology
    - Create style guide documentation

## Current Issues
1. Need to manage state during Angular upgrade
2. CSS organization needs improvement and centralization
3. Auth flow needs to be refactored for better UX
4. State management needs to be implemented with NgRx
5. Need to maintain backward compatibility during auth flow transition

## Project Structure
```
orb-integration-hub/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── features/
│   │   │   │   └── auth/
│   │   │   │       ├── components/
│   │   │   │       ├── store/
│   │   │   │       ├── auth.module.ts
│   │   │   │       └── auth.routes.ts
│   │   │   ├── shared/
│   │   │   ├── core/
│   │   │   │   ├── models/
│   │   │   │   └── services/
│   │   │   ├── app.module.ts
│   │   │   └── app.routes.ts
│   │   ├── assets/
│   │   ├── environments/
│   │   └── styles/
├── backend/
│   ├── src/
│   │   └── lambdas/
│   └── infrastructure/
└── docs/
```