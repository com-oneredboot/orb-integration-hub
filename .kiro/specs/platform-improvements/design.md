# Design Document: Platform Improvements

## Overview

This design addresses security hardening, documentation updates, branding consistency, cross-team issue resolution, and landing page improvements for orb-integration-hub. The implementation prioritizes security fixes first, followed by documentation accuracy, then user-facing improvements.

## Architecture

### Security Hardening Architecture

The current IAM policies use overly broad permissions. This design scopes them to minimum required access:

```
┌─────────────────────────────────────────────────────────────────┐
│                    AppSync Service Role                          │
├─────────────────────────────────────────────────────────────────┤
│ BEFORE: AmazonDynamoDBFullAccess (all tables, all actions)      │
│                                                                  │
│ AFTER:  Scoped Policy                                           │
│   - Actions: GetItem, PutItem, UpdateItem, DeleteItem,          │
│              Query, Scan, BatchGetItem, BatchWriteItem          │
│   - Resources: arn:aws:dynamodb:*:*:table/orb-integration-hub-* │
│                arn:aws:dynamodb:*:*:table/orb-integration-hub-*/index/* │
└─────────────────────────────────────────────────────────────────┘
```

### Landing Page Architecture

Single-page marketing site with anchor navigation:

```
┌─────────────────────────────────────────────────────────────────┐
│                         HEADER                                   │
│  Logo | Navigation (Features | Pricing | Docs) | Get Started    │
├─────────────────────────────────────────────────────────────────┤
│                         HERO (#hero)                             │
│  Headline | Subheadline | Primary CTA | Secondary CTA           │
├─────────────────────────────────────────────────────────────────┤
│                       FEATURES (#features)                       │
│  4 feature cards with icons                                      │
├─────────────────────────────────────────────────────────────────┤
│                      INTEGRATION (#integration)                  │
│  Code example | Integration benefits                             │
├─────────────────────────────────────────────────────────────────┤
│                       PRICING (#pricing)                         │
│  3 pricing tiers (Starter | Business | Enterprise)              │
├─────────────────────────────────────────────────────────────────┤
│                         CTA (#cta)                               │
│  Final call-to-action                                            │
├─────────────────────────────────────────────────────────────────┤
│                        FOOTER                                    │
│  Links | Contact | Legal                                         │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Security Components

#### Scoped DynamoDB Policy
```python
# infrastructure/cdk/stacks/appsync_stack.py
def _create_service_role(self) -> iam.Role:
    role = iam.Role(...)
    
    # Replace AmazonDynamoDBFullAccess with scoped policy
    role.add_to_policy(
        iam.PolicyStatement(
            effect=iam.Effect.ALLOW,
            actions=[
                "dynamodb:GetItem",
                "dynamodb:PutItem", 
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
                "dynamodb:Query",
                "dynamodb:Scan",
                "dynamodb:BatchGetItem",
                "dynamodb:BatchWriteItem",
            ],
            resources=[
                f"arn:aws:dynamodb:{self.region}:{self.account}:table/{self.config.prefix}-*",
                f"arn:aws:dynamodb:{self.region}:{self.account}:table/{self.config.prefix}-*/index/*",
            ],
        )
    )
    return role
```

#### Point-in-Time Recovery
```python
# infrastructure/cdk/stacks/dynamodb_stack.py
table = dynamodb.Table(
    self,
    "UsersTable",
    ...
    point_in_time_recovery=True,  # Enable PITR
)
```

### Landing Page Components

#### JSON-LD Structured Data
```typescript
// apps/web/src/app/features/platform/platform.component.ts
const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Orb Integration Hub",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "description": "A comprehensive integration platform for payment processing, event management, and user authentication"
};
```

### Design System Components

#### Design Tokens (CSS Custom Properties)
```scss
// apps/web/src/styles/_tokens.scss
:root {
  // Colors
  --color-primary: #2563eb;
  --color-primary-dark: #1d4ed8;
  --color-secondary: #64748b;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  
  // Typography
  --font-family-base: 'Inter', system-ui, sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
  --font-size-4xl: 2.25rem;
  
  // Spacing
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-3: 0.75rem;
  --spacing-4: 1rem;
  --spacing-6: 1.5rem;
  --spacing-8: 2rem;
  --spacing-12: 3rem;
  --spacing-16: 4rem;
  
  // Border Radius
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-full: 9999px;
}
```

## Data Models

No new data models required. This spec focuses on infrastructure, documentation, and UI improvements.

## Correctness Properties


*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: IAM Policies Are Scoped to Project Resources

*For any* IAM policy in the CDK stacks, if the policy grants access to DynamoDB, SNS, or Cognito resources, the resource ARN SHALL contain the project prefix pattern and SHALL NOT use wildcard `*` for the resource portion.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: All DynamoDB Tables Have Point-in-Time Recovery

*For any* DynamoDB table created by the CDK stack, the table SHALL have Point-in-Time Recovery enabled.

**Validates: Requirements 1.5**

### Property 3: No OneRedBoot References in User-Visible Content

*For any* HTML template or TypeScript file in the frontend application, the file SHALL NOT contain the string "OneRedBoot" in user-visible content (excluding comments and variable names).

**Validates: Requirements 3.2**

### Property 4: Semantic HTML Heading Hierarchy

*For any* HTML template in the landing page, the heading elements SHALL follow proper hierarchy (h1 before h2, h2 before h3) without skipping levels.

**Validates: Requirements 6.8**

### Property 5: CSS Custom Properties for Design Tokens

*For any* SCSS file defining colors, typography, or spacing, the values SHALL be defined as CSS custom properties (--variable-name) rather than hardcoded values.

**Validates: Requirements 7.5**

## Error Handling

### Security Errors
- If IAM policy synthesis fails, CDK will report the error during `cdk synth`
- If PITR enablement fails, the stack deployment will fail with clear error message

### Documentation Errors
- Markdown linting will catch syntax errors
- Broken links will be caught by documentation review

### Frontend Errors
- TypeScript compilation will catch type errors
- Angular build will catch template errors
- ESLint will catch code quality issues

## Testing Strategy

### Unit Tests
- CDK assertion tests for IAM policy scoping
- CDK assertion tests for PITR configuration
- Angular component tests for landing page

### Property-Based Tests
- Property 1: Parse CDK synthesized templates and verify all IAM policies are scoped
- Property 2: Parse CDK synthesized templates and verify all DynamoDB tables have PITR
- Property 3: Grep frontend files for "OneRedBoot" references
- Property 4: Parse HTML templates and verify heading hierarchy
- Property 5: Parse SCSS files and verify CSS custom property usage

### Integration Tests
- Verify landing page renders correctly
- Verify navigation works
- Verify JSON-LD structured data is present

### Manual Verification
- Visual review of landing page on desktop and mobile
- Review of documentation accuracy
- Cross-team issue status verification
