# Design Document: Organization Applications Tab

## Overview

This design document describes the addition of an "Applications" tab to the Organization Detail component. The enhancement provides a consistent tabbed interface for managing organization-related information, matching the pattern already established in the Application Detail component.

The implementation follows the existing orb-integration-hub patterns including store-first NgRx architecture and component styling conventions.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Organization Detail Component                     │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌──────────┐ ┌───────┐ ┌─────────────┐ ┌─────────┐    │
│  │Overview │ │ Security │ │ Stats │ │Applications │ │ Danger  │    │
│  │   Tab   │ │   Tab    │ │  Tab  │ │    Tab      │ │  Zone   │    │
│  └─────────┘ └──────────┘ └───────┘ └─────────────┘ └─────────┘    │
├─────────────────────────────────────────────────────────────────────┤
│                         Tab Content Area                             │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                   Applications Tab Content                     │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │ Header: "Applications" + Create Button                   │  │  │
│  │  ├─────────────────────────────────────────────────────────┤  │  │
│  │  │ Application Row: Name | Status | Env Count | Arrow      │  │  │
│  │  │ Application Row: Name | Status | Env Count | Arrow      │  │  │
│  │  │ Application Row: Name | Status | Env Count | Arrow      │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Modified Component: OrganizationDetailComponent

The existing `organization-detail.component.ts` will be modified to:

1. Add 'applications' to the `activeTab` type
2. Add applications-related observables from the store
3. Add methods for loading applications and handling interactions

```typescript
// organization-detail.component.ts modifications

// Tab type extension
activeTab: 'overview' | 'security' | 'stats' | 'members' | 'applications' | 'danger' = 'overview';

// New observables
applications$: Observable<IApplications[]>;
isLoadingApplications$: Observable<boolean>;
applicationsError$: Observable<string | null>;
applicationCount$: Observable<number>;

// New methods
setActiveTab(tab: string): void {
  this.activeTab = tab;
  if (tab === 'applications' && !this.applicationsLoaded) {
    this.loadApplications();
  }
}

loadApplications(): void {
  if (this.organization?.organizationId) {
    this.store.dispatch(OrganizationsActions.loadOrganizationApplications({
      organizationId: this.organization.organizationId
    }));
  }
}

onApplicationClick(application: IApplications): void {
  this.router.navigate(['/customers/applications', application.applicationId]);
}

onCreateApplication(): void {
  const tempId = 'new-' + Date.now();
  this.router.navigate(['/customers/applications', tempId], {
    queryParams: { organizationId: this.organization?.organizationId }
  });
}

getEnvironmentCount(application: IApplications): number {
  return application.environments?.length || 0;
}
```

### Template Changes

The template will add the Applications tab button and content panel:

```html
<!-- Tab Navigation - Add Applications tab -->
<button class="organization-detail__tab"
        [class.organization-detail__tab--active]="activeTab === 'applications'"
        (click)="setActiveTab('applications')">
  <fa-icon icon="rocket" class="organization-detail__tab-icon"></fa-icon>
  Applications
  <span class="organization-detail__tab-badge" *ngIf="applicationCount$ | async as count">
    {{ count }}
  </span>
</button>

<!-- Applications Tab Panel -->
<div class="organization-detail__tab-panel"
     [class.organization-detail__tab-panel--active]="activeTab === 'applications'">
  
  <!-- Header with Create Button -->
  <div class="organization-detail__section-header">
    <h4 class="organization-detail__section-title">Applications</h4>
    <button class="organization-detail__action organization-detail__action--primary"
            (click)="onCreateApplication()">
      <fa-icon icon="plus"></fa-icon>
      Create Application
    </button>
  </div>

  <!-- Loading State -->
  <div class="organization-detail__loading" *ngIf="isLoadingApplications$ | async">
    <fa-icon icon="spinner" class="fa-spin"></fa-icon>
    Loading applications...
  </div>

  <!-- Error State -->
  <div class="organization-detail__error" *ngIf="applicationsError$ | async as error">
    <fa-icon icon="exclamation-triangle"></fa-icon>
    {{ error }}
    <button (click)="loadApplications()">Retry</button>
  </div>

  <!-- Applications List -->
  <div class="organization-detail__applications-list" 
       *ngIf="!(isLoadingApplications$ | async) && !(applicationsError$ | async)">
    <ng-container *ngIf="applications$ | async as apps">
      <!-- Empty State -->
      <div class="organization-detail__empty" *ngIf="apps.length === 0">
        <fa-icon icon="rocket" class="organization-detail__empty-icon"></fa-icon>
        <p>No applications yet</p>
        <p class="organization-detail__empty-hint">
          Create your first application to get started.
        </p>
      </div>

      <!-- Application Rows -->
      <div class="organization-detail__app-row"
           *ngFor="let app of apps"
           (click)="onApplicationClick(app)"
           (keydown.enter)="onApplicationClick(app)"
           tabindex="0"
           role="button">
        <div class="organization-detail__app-info">
          <span class="organization-detail__app-name">{{ app.name }}</span>
          <span class="organization-detail__app-id">{{ app.applicationId }}</span>
        </div>
        <div class="organization-detail__app-meta">
          <app-status-badge [status]="app.status" type="application" size="small"></app-status-badge>
          <span class="organization-detail__app-env-count">
            <fa-icon icon="server"></fa-icon>
            {{ getEnvironmentCount(app) }}
          </span>
        </div>
        <fa-icon icon="chevron-right" class="organization-detail__app-arrow"></fa-icon>
      </div>
    </ng-container>
  </div>
</div>
```

### Store Changes

The organizations store will need actions and state for managing organization applications:

```typescript
// organizations.actions.ts additions
loadOrganizationApplications: createAction(
  '[Organizations] Load Organization Applications',
  props<{ organizationId: string }>()
),
loadOrganizationApplicationsSuccess: createAction(
  '[Organizations] Load Organization Applications Success',
  props<{ organizationId: string; applications: IApplications[] }>()
),
loadOrganizationApplicationsFailure: createAction(
  '[Organizations] Load Organization Applications Failure',
  props<{ organizationId: string; error: string }>()
),

// organizations.state.ts additions
interface OrganizationsState {
  // ... existing state
  organizationApplications: { [organizationId: string]: IApplications[] };
  loadingApplications: { [organizationId: string]: boolean };
  applicationsError: { [organizationId: string]: string | null };
}

// organizations.selectors.ts additions
selectOrganizationApplications = (organizationId: string) => createSelector(
  selectOrganizationsState,
  (state) => state.organizationApplications[organizationId] || []
);

selectIsLoadingApplications = (organizationId: string) => createSelector(
  selectOrganizationsState,
  (state) => state.loadingApplications[organizationId] || false
);

selectApplicationsError = (organizationId: string) => createSelector(
  selectOrganizationsState,
  (state) => state.applicationsError[organizationId] || null
);

selectApplicationCount = (organizationId: string) => createSelector(
  selectOrganizationApplications(organizationId),
  (applications) => applications.length
);
```

## Data Models

No new data models are required. The feature uses existing models:
- `IOrganizations` - Organization data
- `IApplications` - Application data

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Application Count Badge Accuracy
*For any* organization with N applications, the count badge displayed on the Applications tab SHALL equal N.
**Validates: Requirements 1.4**

### Property 2: Application Row Content Completeness
*For any* application displayed in the Applications tab, the rendered row SHALL contain the application name, status, and environment count.
**Validates: Requirements 2.1**

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Applications load failure | Display error message with retry button |
| Empty applications list | Display empty state with create prompt |
| Navigation failure | Log error, remain on current view |

## Testing Strategy

### Unit Tests
- Test tab switching behavior
- Test application count selector
- Test loading/error state rendering
- Test navigation on application click
- Test create application navigation with query params

### Property-Based Tests
- Use fast-check for property testing
- Minimum 100 iterations per property
- Tag format: **Feature: organization-applications-tab, Property {N}: {title}**

### Integration Tests
- Test full flow: select tab → load applications → click application → navigate
- Test create application flow with organization pre-selection

