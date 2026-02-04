---
inclusion: fileMatch
fileMatchPattern: "apps/web/**/*.ts"
---

# Frontend Component Standards

Guidelines for creating Angular components in orb-integration-hub.

## CTA Card System

The dashboard uses a role-based CTA card system. See the full card matrix in:
#[[file:.kiro/specs/dashboard-cta-redesign/design.md]]

### CTA Card Component

Use `CtaCardComponent` for dashboard call-to-action cards. Located at `apps/web/src/app/features/user/components/dashboard/cta-card/cta-card.component.ts`.

**Card Layout:**
- Fixed dimensions: 400px × 220px
- Vertical layout: icon+title top, description middle, button bottom-right
- Severity-based colors on left border and button

**Severity Colors (muted):**
| Severity | Color | Hex | Use Case |
|----------|-------|-----|----------|
| low | Green | `#7bc47f` | Informational, resource creation |
| medium | Yellow | `#f5c872` | Attention needed, expiring items |
| high | Orange | `#f5a66b` | Urgent action, security issues |

**Usage:**

```typescript
import { CtaCardComponent } from '../cta-card/cta-card.component';
import { CtaCard } from '../dashboard.types';

@Component({
  imports: [CtaCardComponent],
})
export class DashboardComponent {
  cards: CtaCard[] = this.ctaService.getCtaCards(user);
}
```

**Template:**

```html
<app-cta-card
  [card]="card"
  (action)="onCardAction($event)">
</app-cta-card>
```

### DashboardCtaService

Use `DashboardCtaService` to generate CTA cards based on user state and role.

```typescript
import { DashboardCtaService } from '../../services/dashboard-cta.service';

// Get all cards for user (sorted by priority)
const cards = this.ctaService.getCtaCards(user);

// Get specific card types
const healthCards = this.ctaService.getHealthCards(user);
const benefitCards = this.ctaService.getUserBenefitCards();
const customerCards = this.ctaService.getCustomerActionCards(user);
```

### Card Categories by Account Type

| Account Type | Card Categories |
|--------------|-----------------|
| USER | Health cards + Benefit cards (upgrade promotions) |
| CUSTOMER | Health cards + Action cards (resource management) |
| EMPLOYEE | Health cards + Employee cards (internal tools) |
| OWNER | Health cards + Owner cards (platform admin) |

## Shared Components

### Progress Steps Component

Use `ProgressStepsComponent` for multi-step flow progress indicators. Located at `apps/web/src/app/shared/components/progress-steps/progress-steps.component.ts`.

**When to use:**
- Any multi-step wizard or flow (auth, profile setup, onboarding)
- Registration or checkout processes
- Any sequential step-based UI

**Usage:**

```typescript
import { ProgressStepsComponent, ProgressStep } from '../../shared/components/progress-steps/progress-steps.component';

@Component({
  imports: [ProgressStepsComponent],
  // ...
})
export class MyFlowComponent {
  steps: ProgressStep[] = [
    { number: 1, label: 'Step One' },
    { number: 2, label: 'Step Two' },
    { number: 3, label: 'Step Three' }
  ];
  
  currentStep = 1;
}
```

**Template:**

```html
<app-progress-steps
  [steps]="steps"
  [currentStep]="currentStep">
</app-progress-steps>
```

**Features:**
- Animated progress bar between steps
- Active step pulse animation
- Completed steps show checkmark
- Responsive (smaller on mobile, labels hidden on very small screens)
- Full accessibility support (ARIA progressbar, screen reader announcements)
- Reduced motion support

### Debug Panel Component

Use `DebugPanelComponent` for consistent debugging across pages. Located at `apps/web/src/app/shared/components/debug/debug-panel.component.ts`.

**When to use:**
- Any page with multi-step flows (auth, profile setup, onboarding)
- Pages with complex state management
- During development for troubleshooting

**Usage:**

```typescript
import { DebugPanelComponent, DebugContext } from '../../shared/components/debug/debug-panel.component';
import { DebugLogService } from '../../core/services/debug-log.service';

@Component({
  imports: [DebugPanelComponent],
  // ...
})
export class MyComponent {
  debugLogs$ = inject(DebugLogService).logs$;
  showDebug = !environment.production;

  get debugContext(): DebugContext {
    return {
      page: 'MyPage',
      step: this.currentStep,
      email: this.userEmail,
      formState: { /* form values */ },
      storeState: { /* store state */ },
      additionalSections: [
        { title: 'Custom Data', data: { /* ... */ } }
      ]
    };
  }
}
```

**Template:**

```html
<app-debug-panel
  [visible]="showDebug"
  [title]="'My Page Debug'"
  [logs$]="debugLogs$"
  [context]="debugContext">
</app-debug-panel>
```

**DebugContext interface:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| page | string | Yes | Page identifier |
| step | string | No | Current step in multi-step flow |
| email | string | No | User email if available |
| userExists | boolean | No | Whether user exists in system |
| emailVerified | boolean | No | Email verification status |
| phoneVerified | boolean | No | Phone verification status |
| mfaEnabled | boolean | No | MFA enabled status |
| status | string | No | Current status |
| formState | object | No | Current form values |
| storeState | object | No | Current store/state values |
| additionalSections | DebugSection[] | No | Custom debug sections |

## Component Patterns

### Create-on-Click Pattern (Draft Records)

Use the "create-on-click" pattern for all resource creation flows. This keeps URLs RESTful (noun-only) and provides a consistent UX.

**How it works:**
1. User clicks "Create [Resource]" button
2. API immediately creates a new record with `status: 'DRAFT'` and default values
3. Navigate to `/:resourceId` (the detail/edit page)
4. User fills in details and saves → status changes to `ACTIVE`

**URL Structure:**
```
/organizations          → List view (filters out DRAFT by default)
/organizations/:id      → Detail/Edit view (handles both DRAFT and ACTIVE)
```

**Benefits:**
- Clean REST URLs (no action words like `/new`, `/create`, `/edit`)
- Same detail component handles create and edit modes
- Auto-save/draft functionality comes naturally
- User can abandon and return later

**Implementation:**

```typescript
// List component - "Create" button handler
async onCreateOrganization(): Promise<void> {
  // Call API to create pending record (used as draft state)
  const newOrg = await this.organizationService.createDraft();
  // Navigate to detail page with new ID
  this.router.navigate(['/customers/organizations', newOrg.organizationId]);
}

// Detail component - detect pending vs active
ngOnInit(): void {
  const id = this.route.snapshot.paramMap.get('id');
  this.organization$ = this.organizationService.getById(id);
  
  // Component handles both modes based on status
  this.isPending$ = this.organization$.pipe(
    map(org => org?.status === 'PENDING')
  );
}
```

**Required Status Values:**
- `PENDING` - Newly created, incomplete record (used as draft state)
- `ACTIVE` - Complete, published record
- `INACTIVE` - Soft-deleted or disabled

**List View Filtering:**
- Default: Show only `ACTIVE` records
- Optional: "Show pending" toggle for users to see their incomplete items

**Cleanup Considerations:**
- Implement a cleanup job for abandoned pending records (e.g., pending older than 30 days)
- Or use soft-delete and let users manage their own pending items

### Multi-Step Flow Components

For components with multiple steps (auth, profile setup, wizards):

1. Use enum for step definitions
2. Track current step in component state
3. Include progress indicator
4. Add debug panel for development
5. Handle step transitions with proper validation

**Example structure:**

```typescript
enum FlowStep {
  STEP_ONE = 'STEP_ONE',
  STEP_TWO = 'STEP_TWO',
  COMPLETE = 'COMPLETE'
}

@Component({...})
export class MyFlowComponent {
  currentStep = FlowStep.STEP_ONE;
  
  // Include debug panel
  debugLogs$ = inject(DebugLogService).logs$;
  showDebug = !environment.production;
}
```

### Standalone Components

All new components should be standalone:

```typescript
@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, /* other imports */],
  templateUrl: './my-component.component.html',
  styleUrls: ['./my-component.component.scss']
})
```

### Form Components

Use reactive forms with proper validation:

```typescript
form = this.fb.group({
  email: ['', [Validators.required, Validators.email]],
  name: ['', [Validators.required, Validators.minLength(2)]]
});
```

### Async Observable Pattern for Store Selectors

When getting values from NgRx store selectors in async methods, **always use `take(1).toPromise()`** to ensure the Observable completes after the first emission.

**WRONG - Creates memory leaks and unpredictable behavior:**

```typescript
// ❌ DON'T DO THIS - subscription never completes
private async getCurrentUser(): Promise<IUsers | null> {
  return new Promise((resolve) => {
    this.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => resolve(user));
  });
}
```

**CORRECT - Completes after first emission:**

```typescript
// ✅ DO THIS - matches auth-flow pattern
import { take } from 'rxjs';

private async getCurrentUser(): Promise<IUsers | null> {
  return this.currentUser$.pipe(take(1)).toPromise() ?? null;
}
```

**Why this matters:**
- `takeUntil(this.destroy$)` only completes when the component is destroyed, not after getting the value
- The Promise resolves on first emission, but the subscription stays active
- This can cause memory leaks and unexpected behavior when the store updates
- `take(1)` ensures the Observable completes immediately after emitting one value

**Use this pattern for:**
- Getting current user state in async methods
- Reading any store selector value in async/await code
- Any place you need a single snapshot of Observable state

**Reference implementation:** See `auth-flow.component.ts` for consistent usage of this pattern.

## Styling Conventions

### BEM Naming

Use BEM (Block Element Modifier) for CSS classes:

```scss
.my-component {
  &__header { /* element */ }
  &__title { /* element */ }
  &__button {
    &--primary { /* modifier */ }
    &--disabled { /* modifier */ }
  }
}
```

### Use Shared Mixins

Import from `styles/mixins.scss`:

```scss
@use '../../../../../styles/variables' as v;
@use '../../../../../styles/mixins' as m;

.my-component {
  @include m.page-container;
  
  &__card {
    @include m.card;
  }
  
  &__debug {
    @include m.debug-container;
  }
}
```

### Available Mixins

| Mixin | Purpose |
|-------|---------|
| `auth-container` | Auth flow page layout |
| `page-container` | Standard page layout |
| `form-container` | Form wrapper styling |
| `card` | Card component base |
| `card-header` | Card header styling |
| `card-content` | Card content area |
| `debug-container` | Debug panel styling |
| `professional-header` | Dashboard/profile header |
| `status-badge-*` | Status indicators |

## GraphQL Mutations with Timestamps

When sending data to GraphQL mutations that include `Date` fields (like `createdAt`, `updatedAt`), you MUST convert them to Unix timestamps using `toGraphQLInput()`.

AppSync uses `AWSTimestamp` which expects Unix epoch seconds (integer), not JavaScript Date objects.

**Always use `toGraphQLInput()` before mutations:**

```typescript
import { toGraphQLInput } from '../../graphql-utils';

// WRONG - Date objects will cause "invalid value" errors
const response = await this.mutate(UsersUpdate, { input: updateInput }, authMode);

// CORRECT - Convert Date fields to Unix timestamps
const graphqlInput = toGraphQLInput(updateInput as unknown as Record<string, unknown>);
const response = await this.mutate(UsersUpdate, { input: graphqlInput }, authMode);
```

**What `toGraphQLInput()` does:**
- Converts `Date` objects to Unix timestamps (seconds since epoch)
- Recursively handles nested objects and arrays
- Leaves non-Date fields unchanged

**When receiving timestamps from GraphQL:**

```typescript
import { fromGraphQLTimestamp } from '../../graphql-utils';

// Convert AWSTimestamp back to Date
const createdDate = fromGraphQLTimestamp(response.data.createdAt);
```

## Accessibility Requirements

All components must be accessible:

- Use semantic HTML elements
- Include ARIA labels where needed
- Ensure keyboard navigation works
- Maintain focus management in modals/dialogs
- Support reduced motion preferences
- Meet WCAG 2.1 AA contrast requirements

## NgRx Store-First Architecture

**MANDATORY**: All page components MUST use NgRx store as the single source of truth. Components dispatch actions and subscribe to selectors - they do NOT call services directly for data operations.

### Store-First Data Flow

```
Component → Dispatch Action → Effect → Service → API
                                         ↓
Component ← Selector ← Reducer ← Success/Failure Action
```

### Anti-Pattern (PROHIBITED)

```typescript
// ❌ WRONG - Direct service calls bypass the store
export class ResourceListComponent {
  resources: Resource[] = [];  // Local state duplicates store
  isLoading = false;           // Local loading state
  
  ngOnInit(): void {
    this.isLoading = true;
    this.resourceService.getResources().subscribe(data => {  // Direct call
      this.resources = data;
      this.isLoading = false;
    });
  }
}
```

### Correct Pattern (REQUIRED)

```typescript
// ✅ CORRECT - All data flows through store
export class ResourceListComponent {
  // Store selectors - ALL data comes from store
  resources$: Observable<Resource[]>;
  isLoading$: Observable<boolean>;
  
  constructor(private store: Store) {
    this.resources$ = this.store.select(selectResources);
    this.isLoading$ = this.store.select(selectIsLoading);
  }
  
  ngOnInit(): void {
    // Dispatch action - effects handle service call
    this.store.dispatch(ResourceActions.loadResources());
  }
  
  onSave(resource: Resource): void {
    // Dispatch action - effects handle service call
    this.store.dispatch(ResourceActions.updateResource({ input: resource }));
  }
}
```

### Required Store Elements

**For List Pages:**

| Element | Type | Purpose |
|---------|------|---------|
| `selectResources` | Selector | Raw resource array |
| `selectResourceRows` | Selector | Transformed table rows |
| `selectFilteredResourceRows` | Selector | Filtered/sorted rows |
| `selectIsLoading` | Selector | Loading state |
| `selectIsCreatingNew` | Selector | Create mode state |
| `loadResources` | Action | Trigger data load |
| `setSearchTerm` | Action | Update search filter |
| `setStatusFilter` | Action | Update status filter |
| `loadResources$` | Effect | Handle API call |

**For Detail Pages:**

| Element | Type | Purpose |
|---------|------|---------|
| `selectSelectedResource` | Selector | Current resource |
| `selectIsLoading` | Selector | Loading state |
| `selectIsSaving` | Selector | Save in progress |
| `selectError` | Selector | Error message |
| `loadResource` | Action | Load single resource |
| `updateResource` | Action | Save changes |
| `deleteResource` | Action | Delete resource |
| `loadResource$` | Effect | Handle load API call |
| `updateResource$` | Effect | Handle save API call |

### Allowed Local State

Only UI-specific state that doesn't represent data may be local:

| Allowed | Not Allowed |
|---------|-------------|
| Grid pagination state | Resource data |
| Sort direction | Loading flags |
| Form dirty state | Error messages |
| Modal open/closed | Filter values |
| Dropdown expanded | Selected items |

### Reference Implementations

**Good (Store-First):**
- `OrganizationsListComponent` - 5 selectors, 8 dispatches, 1 service call (draft only)
- `AuthFlowComponent` - 12 selectors, 29 dispatches

**Bad (Hybrid - needs refactoring):**
- `ApplicationsListComponent` - 0 dispatches, direct service calls
- `ApplicationDetailPageComponent` - 7 direct service calls

### Checklist for New Components

Before submitting a PR, verify:

- [ ] All data comes from store selectors (no local data state)
- [ ] All CRUD operations dispatch actions (no direct service calls)
- [ ] Loading/saving states come from store selectors
- [ ] Errors come from store selectors
- [ ] Effects exist for all async operations
- [ ] Unit tests mock the store and verify dispatches

## List and Detail Page Standards

All resource list and detail pages MUST follow these patterns for consistency.

### List Page Requirements

Every list page MUST include these columns:

| Column | Description | Required |
|--------|-------------|----------|
| Resource Info | Name + ID in two-line format | Yes |
| Status | Status badge with icon | Yes |
| Role | User's role for this resource | Yes |
| Last Activity | Relative time (e.g., "2 hours ago") | Yes |
| Resource-specific counts | Members, Applications, etc. | As applicable |

**Last Activity Column:**
- Display relative time using `formatLastActivity()` helper
- Format: "Just now", "X min ago", "X hours ago", "X days ago", or "Mon DD" for older
- Source from `updatedAt` field

**Example Table Row Interface:**

```typescript
interface ResourceTableRow {
  resource: IResource;
  userRole: string;
  isOwner: boolean;
  // Resource-specific counts
  memberCount: number;
  applicationCount: number;
  // Required for all list pages
  lastActivity: string;
}
```

**formatLastActivity Helper:**

```typescript
function formatLastActivity(dateValue: string | Date | number | undefined): string {
  if (!dateValue) return 'Never';
  const date = typeof dateValue === 'number' ? new Date(dateValue * 1000)
    : dateValue instanceof Date ? dateValue : new Date(dateValue);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return diffMins + ' min ago';
  if (diffHours < 24) return diffHours + ' hour' + (diffHours > 1 ? 's' : '') + ' ago';
  if (diffDays < 7) return diffDays + ' day' + (diffDays > 1 ? 's' : '') + ' ago';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
```

### Detail Page Requirements

Every detail page MUST include a metadata section showing:

| Field | Description | Required |
|-------|-------------|----------|
| Resource ID | Full UUID | Yes |
| Created | Formatted date/time | Yes |
| Last Updated | Formatted date/time | Yes |

**Example Metadata Section:**

```html
<div class="resource-detail-metadata" *ngIf="!isDraft">
  <div class="resource-detail-metadata__item">
    <span class="resource-detail-metadata__label">Resource ID</span>
    <span class="resource-detail-metadata__value">{{ resource.resourceId }}</span>
  </div>
  <div class="resource-detail-metadata__item">
    <span class="resource-detail-metadata__label">Created</span>
    <span class="resource-detail-metadata__value">{{ formatDate(resource.createdAt) }}</span>
  </div>
  <div class="resource-detail-metadata__item">
    <span class="resource-detail-metadata__label">Last Updated</span>
    <span class="resource-detail-metadata__value">{{ formatDate(resource.updatedAt) }}</span>
  </div>
</div>
```

**formatDate Helper:**

```typescript
formatDate(dateValue: string | Date | number | undefined): string {
  if (!dateValue) return 'N/A';
  const date = typeof dateValue === 'number'
    ? new Date(dateValue * 1000)
    : dateValue instanceof Date
      ? dateValue
      : new Date(dateValue);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
```

### Reference Implementations

- **List Page:** `apps/web/src/app/features/customers/applications/components/applications-list/`
- **Detail Page:** `apps/web/src/app/features/customers/applications/components/application-detail-page/`

## NgRx Store Pattern Standard (Organizations Pattern)

The Organizations feature is the **canonical reference implementation** for NgRx store patterns. All new features MUST follow this pattern exactly.

### File Structure

```
features/customers/{resource}/
├── store/
│   ├── {resource}.state.ts      # State interface and initial state
│   ├── {resource}.actions.ts    # Action definitions
│   ├── {resource}.reducer.ts    # Reducer with filter logic
│   ├── {resource}.selectors.ts  # Selectors (simple, from state)
│   └── {resource}.effects.ts    # Effects (API calls only)
└── components/
    ├── {resource}-list/
    └── {resource}-detail-page/
```

### State Pattern

```typescript
// {resource}.state.ts
export interface ResourceTableRow {
  resource: IResource;
  userRole: string;
  isOwner: boolean;
  // Resource-specific fields
  lastActivity: string;
}

export interface ResourcesState {
  // Core data
  resources: IResource[];
  resourceRows: ResourceTableRow[];
  filteredResourceRows: ResourceTableRow[];  // REQUIRED: Computed by reducer
  selectedResource: IResource | null;

  // UI State
  isInCreateMode: boolean;
  isCreatingNew: boolean;

  // Filter state (stored in state, not computed)
  searchTerm: string;
  statusFilter: string;
  // Resource-specific filters...

  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  isDeleting: boolean;

  // Error states
  error: string | null;
  saveError: string | null;
  deleteError: string | null;

  // Operation states
  lastCreatedResource: IResource | null;
  lastUpdatedResource: IResource | null;
  lastDeletedResourceId: string | null;
}
```

### Reducer Pattern (CRITICAL)

The reducer MUST:
1. Build `resourceRows` from raw data in `loadResourcesSuccess`
2. Maintain `filteredResourceRows` whenever rows or filters change
3. Use helper functions for filtering and formatting

```typescript
// {resource}.reducer.ts
on(ResourceActions.loadResourcesSuccess, (state, { resources }): ResourcesState => {
  // Build table rows from raw data
  const resourceRows: ResourceTableRow[] = resources.map((resource) => ({
    resource,
    userRole: 'OWNER',
    isOwner: true,
    lastActivity: formatLastActivity(resource.updatedAt)
  }));

  return {
    ...state,
    isLoading: false,
    resources,
    resourceRows,
    filteredResourceRows: resourceRows,  // Initialize filtered = all
    error: null,
  };
}),

// Filter actions MUST update filteredResourceRows
on(ResourceActions.setSearchTerm, (state, { searchTerm }): ResourcesState => {
  const filteredRows = state.resourceRows.filter(row =>
    applyFilters(row, searchTerm, state.statusFilter)
  );

  return {
    ...state,
    searchTerm,
    filteredResourceRows: filteredRows,
  };
}),

// Helper functions at bottom of file
function applyFilters(row: ResourceTableRow, searchTerm: string, statusFilter: string): boolean {
  const matchesSearch = !searchTerm ||
    row.resource.name.toLowerCase().includes(searchTerm.toLowerCase());
  const matchesStatus = !statusFilter ||
    row.resource.status === statusFilter;
  return matchesSearch && matchesStatus;
}

function formatLastActivity(dateValue: string | Date | number | undefined): string {
  if (!dateValue) return 'Never';
  const date = typeof dateValue === 'number' ? new Date(dateValue * 1000)
    : dateValue instanceof Date ? dateValue : new Date(dateValue);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return diffMins + ' min ago';
  if (diffHours < 24) return diffHours + ' hour' + (diffHours > 1 ? 's' : '') + ' ago';
  if (diffDays < 7) return diffDays + ' day' + (diffDays > 1 ? 's' : '') + ' ago';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
```

### Selector Pattern

Selectors MUST be simple state accessors. Filtering is done in the reducer, NOT in selectors.

```typescript
// {resource}.selectors.ts
// ✅ CORRECT - Simple state accessor
export const selectFilteredResourceRows = createSelector(
  selectResourcesState,
  (state: ResourcesState) =>
    state?.filteredResourceRows ?? initialResourcesState.filteredResourceRows
);

// ❌ WRONG - Computing filters in selector
export const selectFilteredResourceRows = createSelector(
  selectResourceRows,
  selectSearchTerm,
  selectStatusFilter,
  (rows, searchTerm, statusFilter) => {
    // DON'T DO THIS - filtering belongs in reducer
    return rows.filter(row => ...);
  }
);
```

### Effect Pattern

Effects handle API calls ONLY. They dispatch success/failure actions - the reducer handles state transformation.

```typescript
// {resource}.effects.ts
loadResources$ = createEffect(() =>
  this.actions$.pipe(
    ofType(ResourceActions.loadResources, ResourceActions.refreshResources),
    withLatestFrom(this.store.select(selectCurrentUser)),
    filter(([, currentUser]) => !!currentUser?.userId),
    switchMap(([, currentUser]) =>
      this.resourceService.getResources(currentUser!.userId).pipe(
        map(connection =>
          ResourceActions.loadResourcesSuccess({ resources: connection.items })
        ),
        catchError(error =>
          of(ResourceActions.loadResourcesFailure({
            error: error.message || 'Failed to load resources'
          }))
        )
      )
    )
  )
);
```

### Component Pattern

Components use selectors and dispatch actions. NO direct service calls for data operations.

```typescript
// {resource}-list.component.ts
export class ResourceListComponent implements OnInit, OnDestroy {
  // Store selectors - ALL data comes from store
  resourceRows$: Observable<ResourceTableRow[]>;
  filteredResourceRows$: Observable<ResourceTableRow[]>;
  isLoading$: Observable<boolean>;

  constructor(private store: Store) {
    this.resourceRows$ = this.store.select(selectResourceRows);
    this.filteredResourceRows$ = this.store.select(selectFilteredResourceRows);
    this.isLoading$ = this.store.select(selectIsLoading);
  }

  ngOnInit(): void {
    this.store.dispatch(ResourceActions.loadResources());
  }

  onFilterChange(): void {
    this.store.dispatch(ResourceActions.setSearchTerm({ searchTerm: this.searchTerm }));
    this.store.dispatch(ResourceActions.setStatusFilter({ statusFilter: this.statusFilter }));
  }
}
```

### Canonical Reference

**Organizations** is the canonical implementation:
- `apps/web/src/app/features/customers/organizations/store/organizations.state.ts`
- `apps/web/src/app/features/customers/organizations/store/organizations.actions.ts`
- `apps/web/src/app/features/customers/organizations/store/organizations.reducer.ts`
- `apps/web/src/app/features/customers/organizations/store/organizations.selectors.ts`
- `apps/web/src/app/features/customers/organizations/store/organizations.effects.ts`

When creating a new feature, copy the Organizations store files and adapt them.

## DataGridComponent (REQUIRED for List Pages)

**MANDATORY**: All list pages MUST use the shared `DataGridComponent`. DO NOT create custom table implementations.

Located at: `apps/web/src/app/shared/components/data-grid/data-grid.component.ts`

### When to Use

- Any page displaying tabular data (organizations, applications, users, groups, etc.)
- Any list that needs pagination, sorting, or filtering
- Anywhere you would otherwise create a `<table>` element

### Usage

```typescript
import { DataGridComponent } from '../../../shared/components/data-grid/data-grid.component';
import { ColumnDefinition, PageState, SortState, FilterState } from '../../../shared/components/data-grid/data-grid.types';

@Component({
  imports: [DataGridComponent],
})
export class MyListComponent {
  columns: ColumnDefinition<MyTableRow>[] = [
    { field: 'name', header: 'Name', sortable: true, filterable: true },
    { field: 'status', header: 'Status', sortable: true },
    { field: 'role', header: 'Role', cellTemplate: this.roleCell },
  ];
  
  pageState: PageState = { currentPage: 1, pageSize: 10, totalItems: 0, totalPages: 0 };
  sortState: SortState | null = null;
  filterState: FilterState = {};
}
```

### Template

```html
<app-data-grid
  [columns]="columns"
  [data]="(filteredRows$ | async) || []"
  [pageState]="pageState"
  [sortState]="sortState"
  [filterState]="filterState"
  [loading]="(isLoading$ | async) || false"
  [showFilters]="true"
  [showPagination]="true"
  [showReset]="true"
  [selectable]="false"
  trackByField="resource"
  emptyMessage="No items found"
  (pageChange)="onPageChange($event)"
  (sortChange)="onSortChange($event)"
  (filterChange)="onFilterChange($event)"
  (resetGrid)="onResetGrid()"
  (rowClick)="onRowClick($event)">
</app-data-grid>
```

### Custom Cell Templates

Use `ng-template` with template references for custom cell rendering:

```html
<!-- Define templates after the data-grid -->
<ng-template #infoCell let-row>
  <div class="orb-info">
    <div class="orb-info__name">{{ row.resource.name }}</div>
    <div class="orb-info__id">{{ row.resource.id }}</div>
  </div>
</ng-template>

<ng-template #roleCell let-row>
  <span class="orb-role-badge orb-role-badge--{{ getRoleClass(row.userRole) }}">
    {{ row.userRole }}
  </span>
</ng-template>
```

Then reference in column definition:

```typescript
@ViewChild('infoCell') infoCell!: TemplateRef<unknown>;
@ViewChild('roleCell') roleCell!: TemplateRef<unknown>;

ngAfterViewInit(): void {
  this.columns = [
    { field: 'name', header: 'Resource', cellTemplate: this.infoCell },
    { field: 'role', header: 'Role', cellTemplate: this.roleCell },
  ];
}
```

### Canonical Reference

See `organizations-list.component.html` for the complete pattern:
`apps/web/src/app/features/customers/organizations/components/organizations-list/`

## Global CSS Classes (REQUIRED)

**CRITICAL**: Use global `orb-*` classes from `apps/web/src/styles/components.scss`. DO NOT duplicate these styles in component SCSS files.

### Card Layout Classes

| Class | Purpose |
|-------|---------|
| `orb-card` | Main card container with shadow and hover effects |
| `orb-card__header` | Black header bar with rounded top corners |
| `orb-card__title` | White title text with icon |
| `orb-card__icon` | Icon in card title |
| `orb-card__header-actions` | Container for header buttons |
| `orb-card__content` | Card body content area |
| `orb-card__content--padded` | Content with padding |
| `orb-card__content--table` | Content without padding (for tables) |

### Button Classes

| Class | Purpose |
|-------|---------|
| `orb-card-btn` | White-bordered button for card headers |
| `orb-card-btn__icon` | Icon inside card button |
| `orb-btn` | Base button class |
| `orb-btn--primary` | Red primary button |
| `orb-btn--secondary` | Gray secondary button |
| `orb-btn--outline` | Transparent with red border |
| `orb-btn--danger` | Red danger button |
| `orb-btn--sm` / `orb-btn--lg` | Size variants |

### Table Cell Classes

| Class | Purpose |
|-------|---------|
| `orb-info` | Two-line info display (name + ID) |
| `orb-info__name` | Primary name text (bold, dark blue) |
| `orb-info__id` | Secondary ID text (small, gray, monospace) |
| `orb-info--inline` | Inline variant for horizontal layout |
| `orb-info--muted` | Muted color variant |
| `orb-count` | Count display with icon |
| `orb-count__icon` | Icon in count display |
| `orb-count--clickable` | Clickable count button variant |
| `orb-role-badge` | Role badge base class |
| `orb-role-badge--owner` | Owner role (purple) |
| `orb-role-badge--administrator` | Admin role (blue) |
| `orb-role-badge--developer` | Developer role (green) |
| `orb-role-badge--viewer` | Viewer role (gray) |

### Status Badge Classes

| Class | Purpose |
|-------|---------|
| `status-badge` | Base status badge |
| `status-badge--small/medium/large` | Size variants |
| `status-badge--badge/chip/text` | Display variants |
| `orb-header-badge` | Bold header badge |
| `orb-header-badge--active` | Green active status |
| `orb-header-badge--pending` | Yellow pending status |
| `orb-header-badge--suspended` | Red suspended status |

### Filter Classes

| Class | Purpose |
|-------|---------|
| `orb-filters` | Filter section container |
| `orb-filters__group` | Individual filter group |
| `orb-filters__label` | Filter label |
| `orb-filters__input` | Text input with icon support |
| `orb-filters__select` | Dropdown select |
| `orb-filters__icon` | Icon inside input |

### Tab Navigation Classes

| Class | Purpose |
|-------|---------|
| `orb-tabs` | Tab container |
| `orb-tabs__tab` | Individual tab button |
| `orb-tabs__tab--active` | Active tab state |
| `orb-tabs__tab--danger` | Danger/delete tab variant |
| `orb-tabs__icon` | Icon in tab |
| `orb-tabs__badge` | Count badge in tab |

### Usage Example

```html
<!-- Card with header and data grid -->
<div class="orb-card">
  <div class="orb-card__header">
    <h2 class="orb-card__title">
      <fa-icon icon="building" class="orb-card__icon"></fa-icon>
      Organizations
    </h2>
    <div class="orb-card__header-actions">
      <button class="orb-card-btn" (click)="onCreate()">
        <fa-icon icon="plus" class="orb-card-btn__icon"></fa-icon>
        Create
      </button>
    </div>
  </div>
  <div class="orb-card__content">
    <app-data-grid ...></app-data-grid>
  </div>
</div>

<!-- Cell templates using global classes -->
<ng-template #infoCell let-row>
  <div class="orb-info">
    <div class="orb-info__name">{{ row.name }}</div>
    <div class="orb-info__id">{{ row.id }}</div>
  </div>
</ng-template>

<ng-template #roleCell let-row>
  <span class="orb-role-badge orb-role-badge--{{ row.role.toLowerCase() }}">
    {{ row.role }}
  </span>
</ng-template>

<ng-template #countCell let-row>
  <div class="orb-count">
    <fa-icon icon="users" class="orb-count__icon"></fa-icon>
    {{ row.memberCount }}
  </div>
</ng-template>
```

### DO NOT Duplicate CSS

**PROHIBITED**: Creating component-specific styles that duplicate global classes.

```scss
// ❌ WRONG - Duplicating global styles in component SCSS
.my-component {
  &__info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  &__name {
    font-weight: 500;
    color: #1a365d;
  }
  &__id {
    font-size: 12px;
    color: #6b7280;
  }
}
```

```html
<!-- ✅ CORRECT - Use global orb-* classes -->
<div class="orb-info">
  <div class="orb-info__name">{{ name }}</div>
  <div class="orb-info__id">{{ id }}</div>
</div>
```

### Canonical Reference for CSS Patterns

**Organizations list** is the canonical reference for list page CSS:
`apps/web/src/app/features/customers/organizations/components/organizations-list/organizations-list.component.html`

When building any list page, copy the HTML structure and CSS classes from organizations-list exactly.


## Enum Standards

**CRITICAL**: All enums MUST be defined in schema registries and generated via orb-schema-generator. This follows the project principle: "Nothing is ever frontend only. EVER."

### Rules

1. **Never create TypeScript enums manually** - All enums must be defined in `schemas/registries/` as YAML files
2. **Use generated enums** - Import from `core/enums/*Enum.ts`
3. **Use PascalCase values** - Generated enums use PascalCase member names (e.g., `AuthStep.EmailEntry`)
4. **String values are SCREAMING_CASE** - The enum member is PascalCase but the string value is SCREAMING_CASE (e.g., `AuthStep.EmailEntry = "EMAIL_ENTRY"`)

### Correct Pattern

```typescript
// ✅ CORRECT - Import from generated enum file
import { AuthStep } from '../../../core/enums/AuthStepEnum';
import { UserStatus } from '../../../core/enums/UserStatusEnum';
import { RecoveryAction } from '../../../core/enums/RecoveryActionEnum';

// Use PascalCase enum values
if (currentStep === AuthStep.EmailEntry) { ... }
if (user.status === UserStatus.Active) { ... }
if (action === RecoveryAction.ResendVerification) { ... }
```

### Incorrect Patterns

```typescript
// ❌ WRONG - Manual enum definition
enum MyCustomEnum {
  VALUE_ONE = 'VALUE_ONE',
  VALUE_TWO = 'VALUE_TWO',
}

// ❌ WRONG - SCREAMING_CASE member names (old pattern)
if (currentStep === AuthSteps.EMAIL_ENTRY) { ... }

// ❌ WRONG - Importing from non-enum files
import { AuthSteps } from '../../store/user.state';

// ❌ WRONG - Creating backward-compatible aliases
export const AuthSteps = {
  EMAIL_ENTRY: AuthStep.EmailEntry,
  PASSWORD: AuthStep.Password,
} as const;
```

### Creating New Enums

1. Create a YAML file in `schemas/registries/YourEnum.yml`:
   ```yaml
   name: YourEnum
   description: Description of the enum
   values:
     - name: ValueOne
       description: First value
     - name: ValueTwo
       description: Second value
   ```
2. Run `pipenv run orb-schema generate`
3. Import from `core/enums/YourEnumEnum.ts`

### UI-Only Enums Exception

Component-local enums for UI-only state (e.g., tab selection) are acceptable when:
- The enum is only used within a single component
- The values are not persisted or sent to the backend
- The enum represents purely presentational state

Example: `EnvironmentDetailTab` in `environment-detail-page.component.ts`

```typescript
// ✅ ACCEPTABLE - UI-only, component-local enum
enum EnvironmentDetailTab {
  Overview = 'overview',
  Settings = 'settings',
  Logs = 'logs',
}
```

### Generated Enum Reference

| Enum | Import Path | Example Values |
|------|-------------|----------------|
| `AuthStep` | `core/enums/AuthStepEnum` | `EmailEntry`, `Password`, `MfaSetup`, `Complete` |
| `CognitoUserStatus` | `core/enums/CognitoUserStatusEnum` | `Unknown`, `Unconfirmed`, `Confirmed` |
| `RecoveryAction` | `core/enums/RecoveryActionEnum` | `NewSignup`, `ResendVerification`, `Login` |
| `ProfileSetupStep` | `core/enums/ProfileSetupStepEnum` | `Name`, `Phone`, `PhoneVerify`, `Complete` |
| `UserStatus` | `core/enums/UserStatusEnum` | `Active`, `Inactive`, `Pending` |
| `OrganizationStatus` | `core/enums/OrganizationStatusEnum` | `Active`, `Inactive`, `Pending` |
