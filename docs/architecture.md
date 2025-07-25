# ORB Integration Hub Architecture

## Overview

The ORB Integration Hub is a modern, serverless application built on AWS that provides centralized identity and access management, enabling rapid prototyping and deployment of business applications. The platform eliminates authentication complexity while providing enterprise-grade security and scalability.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend (Angular)                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │   PrimeNG   │  │     NgRx     │  │    AWS Amplify         │ │
│  │ Components  │  │ State Mgmt   │  │  (Auth & API Client)   │ │
│  └─────────────┘  └──────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ HTTPS
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer (AWS AppSync)                   │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │   GraphQL   │  │   Resolvers  │  │   Authentication       │ │
│  │   Schema    │  │  (VTL/JS)    │  │  (Cognito/API Key)     │ │
│  └─────────────┘  └──────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
┌─────────────────────────────┐  ┌─────────────────────────────┐
│   Lambda Functions Layer     │  │    Data Layer (DynamoDB)    │
│  ┌────────────────────────┐ │  │  ┌───────────────────────┐ │
│  │ Business Logic         │ │  │  │ Users Table           │ │
│  │ (Python)               │ │  │  │ Applications Table    │ │
│  │ ├── orb-common pkg    │ │  │  │ Roles Table           │ │
│  │ └── orb-models pkg    │ │  │  │ ApplicationRoles Table│ │
│  └────────────────────────┘ │  │  │ ApplicationUsers Table│ │
└─────────────────────────────┘  │  └───────────────────────┘ │
                                  └─────────────────────────────┘
```

## Core Components

### 1. Frontend Layer
- **Framework**: Angular 18 with TypeScript
- **UI Components**: PrimeNG component library
- **State Management**: NgRx for predictable state management
- **Authentication**: AWS Amplify for Cognito integration
- **API Client**: AWS Amplify GraphQL client with code generation

### 2. API Gateway (AWS AppSync)
- **Protocol**: GraphQL with real-time subscriptions
- **Authentication**: 
  - Primary: AWS Cognito User Pools (admin operations)
  - Secondary: API Key (limited public operations)
- **Authorization**: Field-level authorization with @aws_auth directives
- **Resolvers**: VTL templates for direct DynamoDB integration
- **Monitoring**: CloudWatch dashboards and X-Ray tracing

### 3. Compute Layer (AWS Lambda)
- **Runtime**: Python 3.12
- **Architecture**: Event-driven, serverless functions
- **Package Management**: 
  - `orb-common`: Shared utilities, exceptions, and security modules
  - `orb-models`: Auto-generated data models from schemas
- **Deployment**: Individual functions with shared Python packages

### 4. Data Layer (DynamoDB)
- **Database Type**: NoSQL, serverless
- **Tables**:
  - Users: User profiles and Cognito mapping
  - Applications: Customer applications
  - Roles: Role definitions
  - ApplicationRoles: User-role-application mappings
  - ApplicationUsers: User-application memberships
- **Indexes**: GSIs for query flexibility
- **Backup**: Point-in-time recovery enabled

### 5. Authentication & Authorization (AWS Cognito)
- **User Pools**: Centralized user management
- **Groups**: Admin group for privileged operations
- **MFA**: Multi-factor authentication support
- **Password Policies**: Configurable security requirements
- **Token Management**: JWT tokens with refresh capabilities

## Data Flow

### 1. User Authentication Flow
```
User → Angular App → AWS Amplify → Cognito → JWT Token
                                              ↓
                                    AppSync (Authorized)
```

### 2. API Request Flow
```
Angular App → GraphQL Request → AppSync → Resolver → DynamoDB
                                    ↓
                              Lambda (if needed)
                                    ↓
                              Python Business Logic
```

### 3. Real-time Updates
```
DynamoDB Stream → Lambda → AppSync Subscription → Angular App
```

## Security Architecture

### 1. Network Security
- All communication over HTTPS/TLS
- CloudFront distribution for frontend
- VPC endpoints for AWS services

### 2. Authentication & Authorization
- JWT tokens with short expiration
- Role-based access control (RBAC)
- Fine-grained GraphQL field permissions
- API key rotation for public endpoints

### 3. Data Security
- Encryption at rest (DynamoDB)
- Encryption in transit (TLS)
- AWS Secrets Manager for sensitive data
- CloudTrail for audit logging

### 4. Application Security
- Input validation at all layers
- Parameterized queries
- Security headers (CSP, HSTS)
- Regular dependency updates

## Deployment Architecture

### 1. Infrastructure as Code
- **CloudFormation**: All AWS resources
- **Schema-driven**: Auto-generated from YAML definitions
- **Environment Management**: Dev, Staging, Production

### 2. CI/CD Pipeline
```
GitHub → GitHub Actions → Build & Test → Deploy to AWS
   ↓                                           ↓
Code Push                              CloudFormation
                                              ↓
                                      S3 (Frontend)
                                      Lambda (Backend)
                                      AppSync (API)
```

### 3. Monitoring & Observability
- **CloudWatch**: Logs, metrics, and alarms
- **X-Ray**: Distributed tracing
- **Custom Dashboards**: Business metrics
- **Error Tracking**: Centralized error handling

## Package Architecture

### Python Packages (Internal)
```
backend/packages/
├── orb-common/          # Shared utilities
│   ├── security/        # Security modules
│   ├── exceptions.py    # Custom exceptions
│   └── utils.py         # Common utilities
└── orb-models/          # Generated models
    ├── models/          # Data models
    └── enums/           # Enumerations
```

### Frontend Structure
```
frontend/src/
├── app/                 # Application modules
├── models/              # TypeScript interfaces
├── services/            # API services
└── store/               # NgRx state management
```

## Scalability Considerations

### 1. Horizontal Scaling
- Lambda auto-scaling
- DynamoDB on-demand capacity
- CloudFront edge caching

### 2. Performance Optimization
- GraphQL query optimization
- DynamoDB query patterns
- Frontend lazy loading
- CDN asset delivery

### 3. Cost Optimization
- Serverless pay-per-use model
- Reserved capacity for predictable workloads
- Efficient query design

## Future Architecture Considerations

### 1. Multi-Region Support
- DynamoDB global tables
- CloudFront global distribution
- Regional Cognito user pools

### 2. Advanced Features
- Event-driven architecture (EventBridge)
- Async processing (SQS/SNS)
- Data analytics (Kinesis)
- ML integration (SageMaker)

### 3. Integration Capabilities
- Webhook support
- Third-party API connectors
- Custom protocol adapters
- Plugin architecture

## Development & Testing

### 1. Local Development
- Docker containers for services
- LocalStack for AWS emulation
- Hot reloading for frontend
- Python virtual environments

### 2. Testing Strategy
- Unit tests (Jest, Pytest)
- Integration tests
- E2E tests (Cypress)
- Performance testing

### 3. Environment Management
- Environment variables
- AWS Systems Manager
- Secrets rotation
- Feature flags

## Compliance & Governance

### 1. Data Residency
- Configurable AWS regions
- Data sovereignty compliance
- Backup locations

### 2. Audit & Compliance
- CloudTrail logging
- Access logs
- Compliance reporting
- GDPR/HIPAA ready

### 3. Disaster Recovery
- Multi-AZ deployment
- Automated backups
- RTO/RPO targets
- Runbook documentation