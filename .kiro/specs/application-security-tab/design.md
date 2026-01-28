# Design Document: Application Security Tab

## Overview

This design restructures the Application Detail Page's "API Keys" tab into a more comprehensive "Security" tab. The Security tab displays API keys organized by environment, with clear CTAs for key generation and management actions. The design uses a card-based layout to support future security features.

## Architecture

The Security tab integrates with the existing Application Detail Page component and reuses the existing API Keys store for state management. The main changes are:

1. **Tab Rename**: Update `ApplicationDetailTab.ApiKeys` → `ApplicationDetailTab.Security`
2. **New Component**: Create `EnvironmentKeyRowComponent` for displaying environment-key pairs
3. **Template Restructure**: Replace `ApiKeysListComponent` with environment-based card layout

```
┌─────────────────────────────────────────────────────────────┐
│ Application Detail Page                                      │
├─────────────────────────────────────────────────────────────┤
│ [Details] [Groups] [Security]                                │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔑 API Keys                                              │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ 🔴 PRODUCTION  │ orb_pk_abc... │ Active │ [Rotate] │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ 🟡 STAGING     │ orb_sk_xyz... │ Active │ [Rotate] │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ 🔵 DEVELOPMENT │ No key        │ [Generate Key]     │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔒 Future Security Feature (placeholder)                 │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Updated ApplicationDetailTab Enum

```typescript
export enum ApplicationDetailTab {
  Details = 'details',
  Groups = 'groups',
  Security = 'security',  // Renamed from ApiKeys
}
```

### EnvironmentKeyRow Interface

```typescript
interface EnvironmentKeyRow {
  environment: Environment;
  environmentLabel: string;
  apiKey: IApplicationApiKeys | null;
  hasKey: boolean;
  canRotate: boolean;
  canRevoke: boolean;
  canGenerate: boolean;
}
```

### Environment Styling Map

```typescript
const environmentStyles: Record<Environment, { color: string; bgColor: string; icon: string }> = {
  [Environment.Production]: { color: '#dc2626', bgColor: '#fef2f2', icon: 'circle' },
  [Environment.Staging]: { color: '#d97706', bgColor: '#fffbeb', icon: 'circle' },
  [Environment.Development]: { color: '#2563eb', bgColor: '#eff6ff', icon: 'circle' },
  [Environment.Test]: { color: '#7c3aed', bgColor: '#f5f3ff', icon: 'circle' },
  [Environment.Preview]: { color: '#6b7280', bgColor: '#f9fafb', icon: 'circle' },
};
```

### Security Tab Template Structure

```html
<!-- Security Tab Panel -->
<div class="app-detail-tab-panel" *ngIf="activeTab === ApplicationDetailTab.Security">
  
  <!-- API Keys Card -->
  <div class="orb-card">
    <div class="orb-card__header">
      <h2 class="orb-card__title">
        <fa-icon icon="key" class="orb-card__icon"></fa-icon>
        API Keys
      </h2>
    </div>
    <div class="orb-card__content">
      <!-- Empty State -->
      <div class="security-empty" *ngIf="environmentKeyRows.length === 0">
        <fa-icon icon="info-circle"></fa-icon>
        <p>No environments configured.</p>
        <a (click)="setActiveTab(ApplicationDetailTab.Details)">
          Configure environments in the Details tab
        </a>
      </div>
      
      <!-- Environment Key Rows -->
      <div class="security-key-list" *ngIf="environmentKeyRows.length > 0">
        <div class="security-key-row" *ngFor="let row of environmentKeyRows">
          <!-- Environment Badge -->
          <div class="security-key-row__env" [ngClass]="'env--' + row.environment.toLowerCase()">
            <fa-icon icon="circle" class="security-key-row__env-icon"></fa-icon>
            {{ row.environmentLabel }}
          </div>
          
          <!-- Key Info (when key exists) -->
          <div class="security-key-row__info" *ngIf="row.hasKey">
            <span class="security-key-row__prefix">{{ row.apiKey.keyPrefix }}...</span>
            <app-status-badge [status]="row.apiKey.status" type="apiKey"></app-status-badge>
            <span class="security-key-row__last-used" *ngIf="row.apiKey.lastUsedAt">
              Last used: {{ formatRelativeTime(row.apiKey.lastUsedAt) }}
            </span>
          </div>
          
          <!-- No Key State -->
          <div class="security-key-row__no-key" *ngIf="!row.hasKey">
            <span>No API key</span>
          </div>
          
          <!-- Actions -->
          <div class="security-key-row__actions">
            <button *ngIf="row.canGenerate" class="orb-btn orb-btn--primary orb-btn--sm"
                    (click)="onGenerateKey(row.environment)">
              <fa-icon icon="plus"></fa-icon> Generate Key
            </button>
            <button *ngIf="row.canRotate" class="orb-btn orb-btn--secondary orb-btn--sm"
                    (click)="onRotateKey(row)">
              <fa-icon icon="sync-alt"></fa-icon> Rotate
            </button>
            <button *ngIf="row.canRevoke" class="orb-btn orb-btn--outline orb-btn--sm"
                    (click)="onRevokeKey(row)">
              <fa-icon icon="ban"></fa-icon> Revoke
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Future: Additional security cards can be added here -->
</div>
```

## Data Models

### Computed Environment Key Rows

The component computes `environmentKeyRows` by combining:
1. Application's selected environments (from `application.environments`)
2. API keys for this application (from API Keys store)

```typescript
private computeEnvironmentKeyRows(): EnvironmentKeyRow[] {
  const environments = this.application?.environments || [];
  const apiKeys = this.apiKeys || [];
  
  return environments.map(env => {
    const apiKey = apiKeys.find(k => k.environment === env && k.status !== 'REVOKED');
    const hasKey = !!apiKey;
    
    return {
      environment: env as Environment,
      environmentLabel: this.getEnvironmentLabel(env),
      apiKey: apiKey || null,
      hasKey,
      canRotate: hasKey && (apiKey.status === 'ACTIVE' || apiKey.status === 'ROTATING'),
      canRevoke: hasKey && (apiKey.status === 'ACTIVE' || apiKey.status === 'ROTATING'),
      canGenerate: !hasKey,
    };
  });
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Environment Row Count Matches Selected Environments

*For any* application with N selected environments, the Security tab SHALL display exactly N environment key rows.

**Validates: Requirements 2.2**

### Property 2: Environment Row Content Correctness

*For any* environment key row:
- If the environment has an active API key, the row SHALL display the key prefix, status badge, and action buttons (Rotate, Revoke)
- If the environment has no API key (or only revoked keys), the row SHALL display "No API key" and a "Generate Key" CTA

**Validates: Requirements 2.3, 2.4, 4.1, 4.2**

### Property 3: Action Button Visibility Based on Key Status

*For any* API key with a given status:
- ACTIVE status → Rotate and Revoke buttons visible, Generate hidden
- ROTATING status → Rotate and Revoke buttons visible, Generate hidden
- REVOKED status → Generate button visible, Rotate and Revoke hidden
- No key → Generate button visible, Rotate and Revoke hidden

**Validates: Requirements 4.1, 4.2, 4.5**

## Error Handling

| Error Scenario | Handling |
|----------------|----------|
| API key generation fails | Display error toast, keep Generate button enabled for retry |
| API key rotation fails | Display error toast, revert status display |
| API key revocation fails | Display error toast, keep current status |
| Failed to load API keys | Display error message in card with retry button |

## Testing Strategy

### Unit Tests

1. **Tab Rename**: Verify `ApplicationDetailTab.Security` enum value exists
2. **Tab Icon**: Verify Security tab displays shield icon
3. **Empty State**: Verify empty state renders when no environments selected
4. **Environment Row Rendering**: Verify correct number of rows for given environments

### Property-Based Tests

Using fast-check with minimum 100 iterations per property:

1. **Property 1**: Generate random environment selections, verify row count matches
2. **Property 2**: Generate random API key states per environment, verify row content
3. **Property 3**: Generate random key statuses, verify correct buttons displayed

Each property test must be tagged with:
- **Feature: application-security-tab, Property {N}: {title}**
- **Validates: Requirements X.Y**
