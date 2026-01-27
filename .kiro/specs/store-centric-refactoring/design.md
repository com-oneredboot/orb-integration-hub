# Design: Store-Centric Refactoring

## Overview

This design establishes the store-first architecture pattern for all Angular components in orb-integration-hub. The NgRx store serves as the single source of truth, with components dispatching actions and subscribing to selectors rather than calling services directly.

## Architecture

### Store-First Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Component     │────▶│   Store Action   │────▶│    Effects      │
│  (dispatches)   │     │  (loadData, etc) │     │  (side effects) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        ▲                                                │
        │                                                ▼
        │                                        ┌─────────────────┐
        │                                        │    Service      │
        │                                        │  (API calls)    │
        │                                        └─────────────────┘
        │                                                │
        │                                                ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Component     │◀────│    Selectors     │◀────│    Reducer      │
│  (subscribes)   │     │  (derived state) │     │  (state update) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### Anti-Pattern (Current State)

```
┌─────────────────┐     ┌──────────────────┐
│   Component     │────▶│    Service       │  ❌ WRONG
│  (calls direct) │     │  (API calls)     │
└─────────────────┘     └──────────────────┘
        │                       │
        ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│  Local State    │     │   Response       │
│  (duplicated)   │     │   (not in store) │
└─────────────────┘     └──────────────────┘
```

## Component Patterns

### List Component Pattern

Reference: `OrganizationsListComponent`

```typescript
@Component({...})
export class ResourceListComponent implements OnInit, OnDestroy {
  // Store selectors - ALL data comes from store
  resourceRows$: Observable<ResourceTableRow[]>;
  filteredResourceRows$: Observable<ResourceTableRow[]>;
  isLoading$: Observable<boolean>;
  isCreatingNew$: Observable<boolean>;
  
  // Local state - ONLY for UI concerns (grid pagination, sort)
  pageState: PageState = { ...DEFAULT_PAGE_STATE };
  sortState: SortState | null = null;
  
  constructor(private store: Store) {
    // Initialize selectors
    this.resourceRows$ = this.store.select(selectResourceRows);
    this.filteredResourceRows$ = this.store.select(selectFilteredResourceRows);
    this.isLoading$ = this.store.select(selectIsLoading);
    this.isCreatingNew$ = this.store.select(selectIsCreatingNew);
  }
  
  ngOnInit(): void {
    // Dispatch load action - effects handle service call
    this.store.dispatch(ResourceActions.loadResources());
  }
  
  onFilterChange(event: FilterChangeEvent): void {
    // Dispatch filter actions - reducer updates state
    this.store.dispatch(ResourceActions.setSearchTerm({ searchTerm: event.search }));
    this.store.dispatch(ResourceActions.setStatusFilter({ statusFilter: event.status }));
  }
}
```

### Detail Page Component Pattern

Reference: Should follow this pattern (currently doesn't)

```typescript
@Component({...})
export class ResourceDetailPageComponent implements OnInit, OnDestroy {
  // Store selectors - ALL data comes from store
  resource$: Observable<Resource | null>;
  isLoading$: Observable<boolean>;
  isSaving$: Observable<boolean>;
  error$: Observable<string | null>;
  
  // Route param
  private resourceId: string;
  
  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.resource$ = this.store.select(selectSelectedResource);
    this.isLoading$ = this.store.select(selectIsLoading);
    this.isSaving$ = this.store.select(selectIsSaving);
    this.error$ = this.store.select(selectError);
  }
  
  ngOnInit(): void {
    this.resourceId = this.route.snapshot.paramMap.get('id') || '';
    // Dispatch load action - effects handle service call
    this.store.dispatch(ResourceActions.loadResource({ resourceId: this.resourceId }));
  }
  
  onSave(resource: Resource): void {
    // Dispatch update action - effects handle service call
    this.store.dispatch(ResourceActions.updateResource({ input: resource }));
  }
  
  onDelete(): void {
    // Dispatch delete action - effects handle service call
    this.store.dispatch(ResourceActions.deleteResource({ resourceId: this.resourceId }));
  }
}
```

## Effects Pattern

### Load Effect (Missing from Applications)

```typescript
// Reference: OrganizationsEffects.loadOrganizations$
loadApplications$ = createEffect(() =>
  this.actions$.pipe(
    ofType(ApplicationsActions.loadApplications, ApplicationsActions.refreshApplications),
    withLatestFrom(this.store.select(selectCurrentUser)),
    filter(([, currentUser]) => !!currentUser?.userId),
    switchMap(([, currentUser]) =>
      this.applicationService.getUserApplications(currentUser!.userId).pipe(
        map(connection => 
          ApplicationsActions.loadApplicationsSuccess({ 
            applications: connection.items 
          })
        ),
        catchError(error => 
          of(ApplicationsActions.loadApplicationsFailure({ 
            error: error.message || 'Failed to load applications' 
          }))
        )
      )
    )
  )
);
```

### Load Single Resource Effect (New Pattern Needed)

```typescript
// For detail pages that need to load a single resource
loadApplication$ = createEffect(() =>
  this.actions$.pipe(
    ofType(ApplicationsActions.loadApplication),
    switchMap(action =>
      this.applicationService.getApplication(action.applicationId).pipe(
        map(application => 
          ApplicationsActions.loadApplicationSuccess({ application })
        ),
        catchError(error => 
          of(ApplicationsActions.loadApplicationFailure({ 
            error: error.message || 'Failed to load application' 
          }))
        )
      )
    )
  )
);
```

## State Shape

### Applications State (Enhanced)

```typescript
interface ApplicationsState {
  // Data
  applications: Applications[];
  selectedApplication: Applications | null;
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  isCreatingNew: boolean;
  
  // Errors
  error: string | null;
  saveError: string | null;
  
  // Filters
  searchTerm: string;
  organizationFilter: string;
  statusFilter: string;
  
  // Derived (via selectors)
  // - applicationRows: ApplicationTableRow[]
  // - filteredApplicationRows: ApplicationTableRow[]
}
```

## Selectors Pattern

### Required Selectors for List Pages

```typescript
// Base selectors
export const selectApplications = createSelector(selectApplicationsState, state => state.applications);
export const selectIsLoading = createSelector(selectApplicationsState, state => state.isLoading);
export const selectIsCreatingNew = createSelector(selectApplicationsState, state => state.isCreatingNew);
export const selectSearchTerm = createSelector(selectApplicationsState, state => state.searchTerm);

// Derived selectors
export const selectApplicationRows = createSelector(
  selectApplications,
  selectCurrentUser,
  (applications, currentUser) => applications.map(app => ({
    application: app,
    userRole: getUserRole(app, currentUser),
    isOwner: isOwner(app, currentUser),
    lastActivity: formatLastActivity(app.updatedAt)
  }))
);

export const selectFilteredApplicationRows = createSelector(
  selectApplicationRows,
  selectSearchTerm,
  selectOrganizationFilter,
  selectStatusFilter,
  (rows, search, orgFilter, statusFilter) => {
    return rows.filter(row => {
      // Apply filters
      if (search && !row.application.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (orgFilter && row.application.organizationId !== orgFilter) return false;
      if (statusFilter && row.application.status !== statusFilter) return false;
      return true;
    });
  }
);
```

### Required Selectors for Detail Pages

```typescript
export const selectSelectedApplication = createSelector(
  selectApplicationsState, 
  state => state.selectedApplication
);

export const selectIsSaving = createSelector(
  selectApplicationsState, 
  state => state.isSaving
);

export const selectSaveError = createSelector(
  selectApplicationsState, 
  state => state.saveError
);
```

## Actions Pattern

### Required Actions

```typescript
// Load actions
loadApplications: emptyProps(),
loadApplicationsSuccess: props<{ applications: Applications[] }>(),
loadApplicationsFailure: props<{ error: string }>(),

// Single resource load (for detail pages)
loadApplication: props<{ applicationId: string }>(),
loadApplicationSuccess: props<{ application: Applications }>(),
loadApplicationFailure: props<{ error: string }>(),

// Filter actions
setSearchTerm: props<{ searchTerm: string }>(),
setOrganizationFilter: props<{ organizationFilter: string }>(),
setStatusFilter: props<{ statusFilter: string }>(),

// CRUD actions (existing)
createApplication, updateApplication, deleteApplication
```

## Correctness Properties

### Property 1: Store as Single Source of Truth

*For any* component displaying resource data, the data SHALL come exclusively from store selectors, and *for any* CRUD operation, the component SHALL dispatch an action rather than call a service directly.

**Validates: Requirements 2.1, 2.3, 3.1, 3.3, 4.1, 4.3**

### Property 2: No Duplicate State

*For any* piece of data that exists in the store, there SHALL NOT be a corresponding local state variable in the component that duplicates it.

**Validates: Requirements 2.4, 3.4, 4.4**

### Property 3: Effects Handle Side Effects

*For any* action that requires an API call, there SHALL be a corresponding effect that handles the service call and dispatches success/failure actions.

**Validates: Requirements 1.1, 1.2**

### Property 4: Consistent Loading States

*For any* async operation (load, save, delete), the component SHALL use store selectors for loading/saving state rather than local boolean flags.

**Validates: Requirements 2.1, 3.1, 4.1**

## Error Handling

| Scenario | Handling |
|----------|----------|
| Load failure | Dispatch failure action, store error in state, display via selector |
| Save failure | Dispatch failure action, store saveError in state, display via selector |
| Delete failure | Dispatch failure action, store error in state, display via selector |
| Network error | Effects catch error, dispatch failure action with message |

## Testing Strategy

### Unit Tests for Components

```typescript
describe('ApplicationsListComponent', () => {
  let store: MockStore;
  
  beforeEach(() => {
    store = TestBed.inject(MockStore);
    spyOn(store, 'dispatch');
  });
  
  it('should dispatch loadApplications on init', () => {
    component.ngOnInit();
    expect(store.dispatch).toHaveBeenCalledWith(ApplicationsActions.loadApplications());
  });
  
  it('should dispatch setSearchTerm on filter change', () => {
    component.onFilterChange({ search: 'test' });
    expect(store.dispatch).toHaveBeenCalledWith(
      ApplicationsActions.setSearchTerm({ searchTerm: 'test' })
    );
  });
  
  it('should NOT call applicationService directly', () => {
    // Verify no direct service calls
    expect(applicationService.getApplications).not.toHaveBeenCalled();
  });
});
```

### Unit Tests for Effects

```typescript
describe('ApplicationsEffects', () => {
  it('should load applications on loadApplications action', () => {
    actions$ = hot('-a', { a: ApplicationsActions.loadApplications() });
    const expected = cold('-b', { 
      b: ApplicationsActions.loadApplicationsSuccess({ applications: mockApplications }) 
    });
    
    expect(effects.loadApplications$).toBeObservable(expected);
  });
});
```

## Migration Checklist

For each component being refactored:

- [ ] Identify all direct service calls
- [ ] Create/verify corresponding actions exist
- [ ] Create/verify corresponding effects exist
- [ ] Create/verify corresponding selectors exist
- [ ] Replace service calls with action dispatches
- [ ] Replace local state with selector subscriptions
- [ ] Update unit tests to verify store usage
- [ ] Remove unused service injections
