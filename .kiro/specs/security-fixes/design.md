# Design Document: Security Fixes

## Overview

This design document details the implementation approach for 7 security fixes identified during the auth-workflow-review audit. The fixes span frontend validators, backend logging, infrastructure IAM policies, and AWS service configurations.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Security Fix Locations                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Frontend (Angular)                    Infrastructure (CDK)                  │
│  ├── custom-validators.ts [Req 1]      ├── appsync_stack.py [Req 5, 7]      │
│  ├── cognito.service.ts [Req 2]        ├── lambda_stack.py [Req 4]          │
│  ├── user.service.ts [Req 2]           └── cognito_stack.py [Req 6]         │
│  ├── user.effects.ts [Req 2]                                                 │
│  └── app.routes.ts [Req 3]                                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Requirement 1: URL-Encoded XSS Protection

**File:** `apps/web/src/app/core/validators/custom-validators.ts`

**Current Implementation:**
```typescript
static noXSS(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;
  
  const xssPattern = /<script|javascript:|on\w+\s*=/i;
  if (xssPattern.test(value)) {
    return { xss: true };
  }
  return null;
}
```

**Fixed Implementation:**
```typescript
static noXSS(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;
  
  // Decode URL-encoded values to catch encoded XSS payloads
  let decodedValue = value;
  try {
    // Decode multiple times to handle double-encoding
    let previousValue = '';
    while (decodedValue !== previousValue) {
      previousValue = decodedValue;
      decodedValue = decodeURIComponent(decodedValue);
    }
  } catch {
    // If decoding fails, use original value
    decodedValue = value;
  }
  
  const xssPattern = /<script|javascript:|on\w+\s*=/i;
  if (xssPattern.test(decodedValue)) {
    return { xss: true };
  }
  return null;
}
```

### Requirement 2: PII Removal from Debug Logs

**Files to modify:**
- `apps/web/src/app/core/services/cognito.service.ts`
- `apps/web/src/app/core/services/user.service.ts`
- `apps/web/src/app/features/user/store/user.effects.ts`

**Pattern to find and remove/sanitize:**
```typescript
// REMOVE these patterns:
console.debug('...email...', email);
console.debug('...cognitoSub...', cognitoSub);

// REPLACE with sanitized versions:
console.debug('User operation completed', { userId: userId?.slice(0, 8) + '...' });
```

**Sanitization helper:**
```typescript
// Add to a shared utility
export function sanitizeForLog(value: string | undefined): string {
  if (!value) return '[empty]';
  if (value.length <= 4) return '****';
  return value.slice(0, 4) + '****';
}
```

### Requirement 3: Authenticate Route Protection

**File:** `apps/web/src/app/app.routes.ts`

**Current:** `/authenticate` route has no guard for authenticated users

**Fixed:** Add `canActivate` guard that redirects authenticated users:
```typescript
{
  path: 'authenticate',
  loadComponent: () => import('./features/user/components/auth-flow/auth-flow.component'),
  canActivate: [redirectIfAuthenticatedGuard],
}
```

### Requirement 4: IAM Permission Scoping

**File:** `infrastructure/cdk/stacks/lambda_stack.py`

**Current (overly permissive):**
```python
iam.PolicyStatement(
    actions=["sns:Publish"],
    resources=["*"],
)
```

**Fixed (scoped):**
```python
iam.PolicyStatement(
    actions=["sns:Publish"],
    resources=[f"arn:aws:sns:{self.region}:{self.account}:{config.resource_name('*')}"],
)
```

### Requirement 5: AppSync Security Hardening

**File:** `infrastructure/cdk/stacks/appsync_stack.py`

**Changes:**
1. Reduce API key expiration from 365 to 90 days
2. Disable introspection in production (if supported by generated construct)

```python
# API key expires in 90 days (reduced from 365)
api_key = appsync.CfnApiKey(
    self,
    "ApiKey",
    api_id=self.api.api_id,
    expires=Expiration.after(Duration.days(90)).to_epoch(),
)
```

### Requirement 6: Cognito Advanced Security

**File:** `infrastructure/cdk/stacks/cognito_stack.py`

**Add advanced security configuration:**
```python
user_pool = cognito.UserPool(
    self,
    "UserPool",
    # ... existing config ...
    advanced_security_mode=cognito.AdvancedSecurityMode.ENFORCED,
)
```

### Requirement 7: AWS WAF for AppSync

**File:** `infrastructure/cdk/stacks/appsync_stack.py` (or new `waf_stack.py`)

**Implementation:**
```python
from aws_cdk import aws_wafv2 as wafv2

# Create WAF WebACL
web_acl = wafv2.CfnWebACL(
    self,
    "AppSyncWebACL",
    default_action=wafv2.CfnWebACL.DefaultActionProperty(allow={}),
    scope="REGIONAL",
    visibility_config=wafv2.CfnWebACL.VisibilityConfigProperty(
        cloud_watch_metrics_enabled=True,
        metric_name=config.resource_name("appsync-waf"),
        sampled_requests_enabled=True,
    ),
    rules=[
        # AWS Managed Common Rule Set
        wafv2.CfnWebACL.RuleProperty(
            name="AWSManagedRulesCommonRuleSet",
            priority=1,
            override_action=wafv2.CfnWebACL.OverrideActionProperty(none={}),
            statement=wafv2.CfnWebACL.StatementProperty(
                managed_rule_group_statement=wafv2.CfnWebACL.ManagedRuleGroupStatementProperty(
                    vendor_name="AWS",
                    name="AWSManagedRulesCommonRuleSet",
                )
            ),
            visibility_config=...,
        ),
        # Rate-based rule
        wafv2.CfnWebACL.RuleProperty(
            name="RateLimitRule",
            priority=2,
            action=wafv2.CfnWebACL.RuleActionProperty(block={}),
            statement=wafv2.CfnWebACL.StatementProperty(
                rate_based_statement=wafv2.CfnWebACL.RateBasedStatementProperty(
                    limit=2000,  # 2000 requests per 5 minutes
                    aggregate_key_type="IP",
                )
            ),
            visibility_config=...,
        ),
    ],
)

# Associate WAF with AppSync
wafv2.CfnWebACLAssociation(
    self,
    "AppSyncWAFAssociation",
    resource_arn=self.api.arn,
    web_acl_arn=web_acl.attr_arn,
)
```

## Data Models

No new data models required. All fixes modify existing code or infrastructure.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do.*



### Property 1: URL-Encoded XSS Detection

*For any* XSS payload that would be detected in plaintext form, if that payload is URL-encoded (single or multiple times), the Custom_Validators.noXSS function SHALL still detect and reject it.

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: No PII in Log Statements

*For any* TypeScript file in the auth-related services (cognito.service.ts, user.service.ts, user.effects.ts), there SHALL be no console.log/debug/info statements containing email addresses, cognitoSub, or phone numbers in plaintext.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 3: IAM Permission Scoping

*For any* IAM policy statement in the Lambda stack that grants SNS, SES, or KMS permissions, the Resource field SHALL NOT be "*" but SHALL be scoped to specific ARN patterns.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 4: WAF Configuration Completeness

*For any* environment deployment, the synthesized CloudFormation template SHALL contain:
- A WAF WebACL associated with the AppSync API
- AWSManagedRulesCommonRuleSet managed rule group
- AWSManagedRulesKnownBadInputsRuleSet managed rule group  
- A rate-based rule with limit of 2000 requests per 5 minutes

**Validates: Requirements 7.1, 7.2, 7.3**

## Error Handling

| Error Scenario | Handling |
|----------------|----------|
| URL decoding fails (malformed %) | Use original value for XSS check |
| WAF blocks legitimate request | User sees 403, can retry after rate limit window |
| Cognito blocks compromised credential | User prompted to reset password |

## Testing Strategy

### Unit Tests

1. **XSS Validator Tests**
   - Test URL-encoded payloads are detected
   - Test double-encoded payloads are detected
   - Test valid encoded content is allowed
   - Test malformed encoding is handled gracefully

2. **Route Guard Tests**
   - Test authenticated user is redirected from /authenticate
   - Test unauthenticated user can access /authenticate

3. **CDK Snapshot Tests**
   - Verify IAM policies are scoped
   - Verify WAF configuration is correct
   - Verify API key expiration is 90 days
   - Verify Cognito advanced security is enabled

### Property-Based Tests

Property-based testing will be used for:
- **Property 1**: Generate random XSS payloads, encode them, verify detection
- **Property 3**: Parse synthesized IAM policies, verify no wildcards for SNS/SES/KMS
- **Property 4**: Parse synthesized WAF config, verify all required rules present

### Static Analysis Tests

- **Property 2**: Grep-based test to verify no PII patterns in log statements

## Dependencies

- AWS CDK v2 (aws_wafv2 module)
- No new npm/pip dependencies required

## Rollback Plan

All changes are infrastructure-as-code and can be rolled back via git revert:
1. WAF can be detached without affecting AppSync functionality
2. IAM policy changes are backwards compatible (more restrictive)
3. Cognito advanced security can be disabled if issues arise
4. Frontend validator changes are backwards compatible
