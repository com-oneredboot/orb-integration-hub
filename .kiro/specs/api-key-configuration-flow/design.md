# Design Document: API Key Configuration Flow

## Overview

This design ensures applications remain in PENDING status until fully configured with API keys for all environments. It adds dashboard CTAs to guide users through completing setup and provides inline key display after generation.

## Architecture

The feature touches three main areas:

1. **Application Activation Logic** - Validation before status transition
2. **Dashboard CTA Service** - New card type for missing API keys
3. **Security Tab UX** - Inline key display after generation

```
┌─────────────────────────────────────────────────────────────┐
│ Dashboard                                                    │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⚠️ "My App" needs API keys                    [Configure]│ │
│ │ 2 of 3 environments need keys                           │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Application Detail Page - Security Tab                       │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔴 PRODUCTION  │ No API key      │ [Generate Key]       │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🟡 STAGING     │ orb_sk_abc...   │ [Rotate] [Revoke]    │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔵 DEVELOPMENT │ ⚡ NEWLY GENERATED KEY                  │ │
│ │                │ orb_dk_xyz123456789...  [📋 Copy]      │ │
│ │                │ ⚠️ Copy now - won't be shown again     │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Application Validation Helper

```typescript
interface ApiKeyValidationResult {
  isValid: boolean;
  missingEnvironments: string[];
  configuredEnvironments: string[];
}

function validateApplicationApiKeys(
  application: IApplications,
  apiKeys: IApplicationApiKeys[]
): ApiKeyValidationResult {
  const environments = application.environments || [];
  const activeKeys = apiKeys.filter(k => 
    k.status === ApplicationApiKeyStatus.Active || 
    k.status === ApplicationApiKeyStatus.Rotating
  );
  
  const configuredEnvs = activeKeys.map(k => k.environment);
  const missingEnvs = environments.filter(env => !configuredEnvs.includes(env));
  
  return {
    isValid: missingEnvs.length === 0,
    missingEnvironments: missingEnvs,
    configuredEnvironments: configuredEnvs
  };
}
```

### Dashboard CTA Card Interface

```typescript
interface ApiKeyCtaCard extends CtaCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  severity: 'medium';  // Yellow
  actionLabel: string;
  actionRoute: string;
  applicationId: string;
  missingKeyCount: number;
  totalEnvironments: number;
}
```

### Generated Key Display State

```typescript
interface GeneratedKeyDisplay {
  environment: string;
  fullKey: string;
  generatedAt: Date;
}

// In component state
generatedKeyDisplay: GeneratedKeyDisplay | null = null;
```

## Data Models

### CTA Card Generation Logic

The DashboardCtaService will be extended to check for applications with missing API keys:

```typescript
getApiKeyCtaCards(applications: IApplications[], apiKeysByApp: Map<string, IApplicationApiKeys[]>): CtaCard[] {
  return applications
    .filter(app => app.status === ApplicationStatus.Pending || app.status === ApplicationStatus.Active)
    .map(app => {
      const keys = apiKeysByApp.get(app.applicationId) || [];
      const validation = validateApplicationApiKeys(app, keys);
      
      if (validation.isValid) return null;
      
      return {
        id: `api-keys-${app.applicationId}`,
        title: `"${app.name}" needs API keys`,
        description: `${validation.missingEnvironments.length} of ${app.environments.length} environments need API keys configured.`,
        icon: 'key',
        severity: 'medium',
        actionLabel: 'Configure Keys',
        actionRoute: `/customers/applications/${app.applicationId}`,
        actionParams: { tab: 'security' },
        applicationId: app.applicationId,
        missingKeyCount: validation.missingEnvironments.length,
        totalEnvironments: app.environments.length
      };
    })
    .filter(Boolean);
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Activation Validation Correctness

*For any* application with N environments and M active API keys where M < N, the validation function SHALL return `isValid: false` and list exactly (N - M) missing environments.

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: CTA Generation Correctness

*For any* set of applications, the Dashboard_CTA_Service SHALL generate exactly one CTA card for each application that has at least one environment without an active API key, and zero CTAs for fully configured applications.

**Validates: Requirements 2.1, 2.5**

### Property 3: CTA Content Correctness

*For any* application with missing API keys, the generated CTA card SHALL contain the application name and the correct count of missing environments.

**Validates: Requirements 2.3**

### Property 4: Activation Error Message Correctness

*For any* application with missing API keys, the activation error message SHALL list all and only the environments that lack active API keys.

**Validates: Requirements 1.4, 4.1**

## Error Handling

| Error Scenario | Handling |
|----------------|----------|
| API key generation fails | Display error toast, keep Generate button enabled |
| Failed to load API keys for CTA check | Skip CTA generation for that app, log warning |
| Clipboard copy fails | Show fallback "select all" UI, display error toast |

## Testing Strategy

### Unit Tests

1. **Validation function**: Test with various environment/key combinations
2. **CTA generation**: Test filtering logic for applications
3. **Inline key display**: Test state management on tab change

### Property-Based Tests

Using fast-check with minimum 100 iterations per property:

1. **Property 1**: Generate random environment lists and key lists, verify validation result
2. **Property 2**: Generate random application sets with random key configurations, verify CTA count
3. **Property 3**: Generate random applications with missing keys, verify CTA content
4. **Property 4**: Generate random configurations, verify error message content

Each property test must be tagged with:
- **Feature: api-key-configuration-flow, Property {N}: {title}**
- **Validates: Requirements X.Y**
