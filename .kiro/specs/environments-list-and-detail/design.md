# Design Document: Environments List and Detail

## Overview

This design implements an environments list component and improves the environment detail page tab UI for the orb-integration-hub Angular frontend. The environments list displays all `ApplicationEnvironmentConfig` records for a single application using the shared `DataGridComponent`, following the NgRx store-first architecture pattern established by the Organizations feature. The environment detail page improvements add proper tab navigation using `orb-tabs` CSS classes.

## Architecture

### Component Structure

```
features/customers/applications/
├── store/
│   └── environments/
│       ├── environments.state.ts      # State interface and initial state
│       ├── environments.actions.ts    # Action definitions
│       ├── environments.reducer.ts    # Reducer with filter logic
│       ├── environments.selectors.ts  # Selectors (simple, from state)
│       └── environments.effects.ts    # Effects (API calls only)
└── components/
    ├── environments-list/
    │   ├── environments-list.component.ts
    │   ├── environments-list.component.html
    │   └── environments-list.component.scss
    └── environment-detail-page/
        ├── environment-detail-page.component.ts (updated)
        ├── environment-detail-page.component.html (updated)
        └── environment-detail-page.component.scss (updated)
```

### Data Flow

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│   NgRx Store        │────▶│ EnvironmentsListComp │────▶│  DataGridComponent  │
│  (environments)     │     │  (selectors only)    │     │  (display)          │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
         ▲                           │
         │                           ▼
┌─────────────────────┐     ┌──────────────────────┐
│   Effects           │◀────│  Actions             │
│  (API calls)        │     │  (load, filter)      │
└─────────────────────┘     └──────────────────────┘
```

## Components and Interfaces

### EnvironmentTableRow Interface

```typescript
interface EnvironmentTableRow {
  config: IApplicationEnvironmentConfig;
  apiKey: IApplicationApiKeys | null;
  status: EnvironmentStatus;
  statusLabel: string;
  keyPrefix: string;
  rateLimitDisplay: string;
  originsCount: number;
  webhookStatus: 'Enabled' | 'Disabled';
  lastActivity: string;
}
```

### EnvironmentStatus Type

```typescript
type EnvironmentStatus = 'Active' | 'Not Configured' | 'Revoked' | 'Expired';
```

### EnvironmentsState Interface

```typescript
interface EnvironmentsState {
  // Core data
  configs: IApplicationEnvironmentConfig[];
  apiKeys: IApplicationApiKeys[];
  environmentRows: EnvironmentTableRow[];
  filteredEnvironmentRows: EnvironmentTableRow[];

  // Context
  applicationId: string | null;
  organizationId: string | null;

  // Filter state
  searchTerm: string;
  statusFilter: string;

  // Loading states
  isLoading: boolean;
  error: string | null;
}
```

### Actions

```typescript
// Load actions
loadEnvironments({ applicationId: string })
loadEnvironmentsSuccess({ configs: IApplicationEnvironmentConfig[], apiKeys: IApplicationApiKeys[] })
loadEnvironmentsFailure({ error: string })

// Filter actions
setSearchTerm({ searchTerm: string })
setStatusFilter({ statusFilter: string })

// Context actions
setApplicationContext({ applicationId: string, organizationId: string })
```

### Selectors

```typescript
selectEnvironmentsState
selectEnvironmentRows
selectFilteredEnvironmentRows
selectIsLoading
selectError
selectApplicationId
```

## Data Models

### Column Definitions

| Column | Field | Header | Sortable | Template |
|--------|-------|--------|----------|----------|
| Environment | `config.environment` | Environment | Yes | `environmentCell` |
| Status | `status` | Status | Yes | `statusCell` |
| API Key | `keyPrefix` | API Key | No | `apiKeyCell` |
| Rate Limit | `rateLimitDisplay` | Rate Limit | Yes | Text |
| Origins | `originsCount` | Origins | Yes | `originsCell` |
| Webhooks | `webhookStatus` | Webhooks | Yes | `webhookCell` |
| Last Activity | `lastActivity` | Last Activity | Yes | Text |

### Environment Icons

| Environment | Icon | Color Class |
|-------------|------|-------------|
| Production | `server` | `production` |
| Staging | `code-branch` | `staging` |
| Development | `laptop-code` | `development` |
| Test | `flask` | `test` |
| Preview | `eye` | `preview` |

### Status Badge Mapping

| Status | Badge Type | Color |
|--------|------------|-------|
| Active | `success` | Green |
| Not Configured | `warning` | Yellow |
| Revoked | `danger` | Red |
| Expired | `danger` | Red |

## Tab UI Design

### Tab Configuration

```typescript
enum EnvironmentDetailTab {
  ApiKeys = 'api-keys',
  Origins = 'origins',
  RateLimits = 'rate-limits',
  Webhooks = 'webhooks',
  FeatureFlags = 'feature-flags',
}

interface TabConfig {
  id: EnvironmentDetailTab;
  label: string;
  icon: string;
  getIssueCount: () => number;
}
```

### Tab HTML Structure

```html
<div class="orb-tabs">
  <button 
    *ngFor="let tab of tabs"
    class="orb-tabs__tab"
    [class.orb-tabs__tab--active]="activeTab === tab.id"
    (click)="setActiveTab(tab.id)"
    [attr.aria-selected]="activeTab === tab.id"
    role="tab">
    <fa-icon [icon]="tab.icon" class="orb-tabs__icon"></fa-icon>
    {{ tab.label }}
    <span *ngIf="tab.getIssueCount() > 0" class="orb-tabs__badge">
      {{ tab.getIssueCount() }}
    </span>
  </button>
</div>
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Environment List Data Integrity

*For any* application with environments, the environments list SHALL display exactly one row per environment, and each row SHALL contain the correct environment name, rate limit display (formatted as "X/min"), origins count matching the allowedOrigins array length, and webhook status matching the webhookEnabled boolean.

**Validates: Requirements 1.1, 1.2, 1.6, 1.7, 1.8, 1.9**

### Property 2: Environment Status Computation

*For any* environment configuration and its associated API key (or lack thereof), the computed status SHALL be:
- "Active" if API key exists and status is ACTIVE or ROTATING
- "Not Configured" if no API key exists
- "Revoked" if API key exists and status is REVOKED
- "Expired" if API key exists and status is EXPIRED

**Validates: Requirements 1.3, 4.1, 4.2, 4.3, 4.4**

### Property 3: API Key Display

*For any* environment with an API key, the key prefix SHALL be displayed. *For any* environment without an API key, "—" SHALL be displayed.

**Validates: Requirements 1.4, 1.5**

### Property 4: Filter State Updates Filtered Rows

*For any* set of environments and any filter criteria (search term, status filter), the filtered environment rows SHALL contain only rows that match all active filter criteria.

**Validates: Requirements 2.4, 2.5**

### Property 5: Tab Switching Updates Content and Styling

*For any* tab click, the active tab SHALL have the `orb-tabs__tab--active` class, and the corresponding content section SHALL be visible while other sections are hidden.

**Validates: Requirements 3.4, 3.6**

### Property 6: Tab Issue Count Accuracy

*For any* tab with configuration issues, the badge count SHALL equal the number of issues for that tab. Tabs without issues SHALL NOT display a badge.

**Validates: Requirements 3.5**

## Error Handling

| Scenario | Handling |
|----------|----------|
| Failed to load environments | Display error message, show retry button |
| No environments configured | Display empty state message |
| API key load failure | Show status as "Unknown", log error |
| Navigation failure | Show error toast, remain on current page |

## Testing Strategy

### Unit Tests

- EnvironmentsListComponent: Test rendering with mock data
- Environment status computation helper function
- Tab switching behavior
- Filter action dispatching

### Property-Based Tests

Using fast-check for TypeScript property-based testing:

- **Property 1**: Generate random environment configs, verify row data integrity
- **Property 2**: Generate random API key states, verify status computation
- **Property 3**: Generate environments with/without API keys, verify display
- **Property 4**: Generate random filters and environments, verify filtering
- **Property 5**: Generate random tab selections, verify active state
- **Property 6**: Generate random issue counts, verify badge display

Each property test MUST:
- Run minimum 100 iterations
- Tag with: **Feature: environments-list-and-detail, Property N: [property text]**
- Reference the design document property it validates

### Integration Tests

- Full environments list render with mock store
- Navigation from list to detail page
- Tab navigation in detail page
- Filter interactions
