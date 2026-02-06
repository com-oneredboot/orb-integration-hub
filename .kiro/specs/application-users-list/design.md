# Design Document: Application Users List

## Overview

The Application Users List feature provides a read-only view of users who are currently assigned to applications within an organization. This feature follows the established Organizations pattern for NgRx store management and uses the shared DataGridComponent for consistent list page presentation.

The feature displays users from the Users table who have at least one ApplicationUsers record with status ACTIVE, INACTIVE, or INVITED (excluding users with only REMOVED status). The list shows essential user information while minimizing PII exposure by excluding email, phone number, and Cognito ID fields.

Key capabilities:
- View users assigned to applications with name, status, application count, and last activity
- Sort by name, status, application count, or last updated date
- Filter by name and user status
- Navigate to Applications list filtered by user's applications
- Pagination support (25 items per page)
- Responsive design for desktop, tablet, and mobile

## Architecture

### Component Structure

```
features/customers/users/
├── store/
│   ├── users.state.ts           # State interface and initial state
│   ├── users.actions.ts         # Action definitions
│   ├── users.reducer.ts         # Reducer with filter logic
│   ├── users.selectors.ts       # Selectors (simple state accessors)
│   └── users.effects.ts         # Effects (API calls only)
└── components/
    └── users-list/
        ├── users-list.component.ts
        ├── users-list.component.html
        └── users-list.component.scss
```

### Data Flow

```
UsersListComponent
    ↓ dispatch loadUsers()
UsersEffects
    ↓ call UsersService.getApplicationUsers()
GraphQL API (AppSync)
    ↓ query Users + ApplicationUsers tables
UsersEffects
    ↓ dispatch loadUsersSuccess({ users, applicationUserRecords })
UsersReducer
    ↓ build UserTableRow[] with application counts
    ↓ compute filteredUserRows
UsersSelectors
    ↓ selectFilteredUserRows
UsersListComponent
    ↓ render DataGridComponent
```

### NgRx Store Pattern (Organizations Pattern)

Following the canonical Organizations pattern:

1. **State Management**: All data flows through NgRx store
2. **Reducer Filtering**: Filtering logic lives in reducer, not selectors
3. **Simple Selectors**: Selectors are simple state accessors
4. **Effects for API**: Effects handle all API calls
5. **Component Dispatch**: Components dispatch actions, never call services directly

## Components and Interfaces

### UsersListComponent

**Location**: `apps/web/src/app/features/customers/users/components/users-list/users-list.component.ts`

**Responsibilities**:
- Display users list using DataGridComponent
- Dispatch actions for loading, filtering, and sorting
- Handle navigation to Applications list with user filter
- Manage pagination state

**Key Properties**:
```typescript
// Store selectors
userRows$: Observable<UserTableRow[]>;
filteredUserRows$: Observable<UserTableRow[]>;
isLoading$: Observable<boolean>;
error$: Observable<string | null>;

// DataGrid configuration
columns: ColumnDefinition<UserTableRow>[];
pageState: PageState;
sortState: SortState | null;
filterState: FilterState;

// Breadcrumbs and tabs
breadcrumbItems: BreadcrumbItem[];
tabs: TabConfig[];
activeTab: string;
```

**Key Methods**:
```typescript
ngOnInit(): void;                              // Dispatch loadUsers()
onPageChange(event: PageChangeEvent): void;    // Handle pagination
onSortChange(event: SortChangeEvent): void;    // Dispatch sort action
onFilterChange(event: FilterChangeEvent): void; // Dispatch filter actions
onResetGrid(): void;                           // Reset filters and sort
onRowClick(row: UserTableRow): void;           // Store userId for future navigation
onApplicationCountClick(row: UserTableRow, event: Event): void; // Navigate to Applications
```

### UsersService

**Location**: `apps/web/src/app/core/services/users.service.ts`

**Responsibilities**:
- Execute GraphQL queries for users and application users
- Transform GraphQL responses to TypeScript models
- Handle authentication modes

**Key Methods**:
```typescript
getApplicationUsers(organizationId: string): Observable<{
  users: IUsers[];
  applicationUserRecords: IApplicationUsers[];
}>;
```

**GraphQL Query**:
```graphql
query GetApplicationUsers($organizationId: ID!) {
  # Query Users who have ApplicationUsers records
  UsersListByOrganizationId(organizationId: $organizationId) {
    items {
      userId
      firstName
      lastName
      status
      createdAt
      updatedAt
    }
  }
  
  # Query ApplicationUsers to get application counts and filter
  ApplicationUsersListByOrganizationId(organizationId: $organizationId) {
    items {
      userId
      applicationId
      status
      updatedAt
    }
  }
}
```

### UsersStore (NgRx)

**State Interface** (`users.state.ts`):
```typescript
export interface UserTableRow {
  user: IUsers;
  userStatus: UserStatus;
  applicationCount: number;
  applicationIds: string[];
  lastActivity: string;
}

export interface UsersState {
  // Core data
  users: IUsers[];
  userRows: UserTableRow[];
  filteredUserRows: UserTableRow[];  // Computed by reducer
  selectedUser: IUsers | null;
  selectedUserId: string | null;

  // Filter state
  searchTerm: string;
  statusFilter: string;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Operation states
  lastLoadedTimestamp: number | null;
}
```

**Actions** (`users.actions.ts`):
```typescript
export const UsersActions = createActionGroup({
  source: 'Users',
  events: {
    // Load Users
    'Load Users': emptyProps(),
    'Load Users Success': props<{ 
      users: IUsers[];
      applicationUserRecords: IApplicationUsers[];
    }>(),
    'Load Users Failure': props<{ error: string }>(),

    // Selection Management
    'Select User': props<{ user: IUsers | null }>(),
    'Set Selected User Id': props<{ userId: string | null }>(),

    // Filter Management
    'Set Search Term': props<{ searchTerm: string }>(),
    'Set Status Filter': props<{ statusFilter: string }>(),
    'Apply Filters': emptyProps(),

    // User Rows Management
    'Update User Rows': props<{ userRows: UserTableRow[] }>(),
    'Update Filtered User Rows': props<{ filteredRows: UserTableRow[] }>(),

    // Error Management
    'Clear Errors': emptyProps(),

    // Utility Actions
    'Reset State': emptyProps(),
    'Refresh Users': emptyProps(),
  }
});
```

**Reducer** (`users.reducer.ts`):
- Builds `userRows` from raw data in `loadUsersSuccess`
- Computes application counts by grouping ApplicationUsers by userId
- Filters out users with only REMOVED status
- Maintains `filteredUserRows` whenever rows or filters change
- Uses helper functions: `applyFilters()`, `formatLastActivity()`

**Selectors** (`users.selectors.ts`):
- Simple state accessors (no computation)
- `selectFilteredUserRows` returns pre-computed filtered rows
- `selectIsLoading`, `selectError`, etc.

**Effects** (`users.effects.ts`):
- `loadUsers$`: Calls UsersService.getApplicationUsers()
- Dispatches success/failure actions
- No business logic in effects

## Data Models

### UserTableRow

Represents a row in the users list table:

```typescript
interface UserTableRow {
  user: IUsers;                    // Full user object from Users table
  userStatus: UserStatus;          // User status (from Users.status)
  applicationCount: number;        // Count of applications (ACTIVE, INACTIVE, INVITED)
  applicationIds: string[];        // Array of applicationIds for navigation
  lastActivity: string;            // Formatted relative time from most recent ApplicationUsers.updatedAt
}
```

**Field Derivation**:
- `user`: Direct from Users table query
- `userStatus`: From `user.status`
- `applicationCount`: Count of ApplicationUsers records with status ACTIVE, INACTIVE, or INVITED
- `applicationIds`: Array of `applicationId` from ApplicationUsers records (excluding REMOVED)
- `lastActivity`: Formatted from `max(ApplicationUsers.updatedAt)` for this user

### IUsers (Generated Model)

From `apps/web/src/app/core/models/UsersModel.ts`:

```typescript
interface IUsers {
  userId: string;
  cognitoId: string;        // NOT displayed (PII)
  cognitoSub: string;       // NOT displayed (PII)
  email: string;            // NOT displayed (PII)
  firstName: string;        // Displayed
  lastName: string;         // Displayed
  status: UserStatus;       // Displayed
  createdAt: Date;
  updatedAt: Date;
  phoneNumber?: string;     // NOT displayed (PII)
  groups?: string[];
  emailVerified?: boolean;
  phoneVerified?: boolean;
  mfaEnabled?: boolean;
  mfaSetupComplete?: boolean;
}
```

### IApplicationUsers (Generated Model)

From `apps/web/src/app/core/models/ApplicationUsersModel.ts`:

```typescript
interface IApplicationUsers {
  applicationUserId: string;
  userId: string;
  applicationId: string;
  status: ApplicationUserStatus;  // ACTIVE, INACTIVE, INVITED, REMOVED
  createdAt: Date;
  updatedAt: Date;
}
```

### DataGrid Column Configuration

```typescript
columns: ColumnDefinition<UserTableRow>[] = [
  {
    field: 'user',
    header: 'User',
    sortable: true,
    filterable: true,
    filterType: 'text',
    cellTemplate: this.userInfoCell,
    width: '30%'
  },
  {
    field: 'userStatus',
    header: 'Status',
    sortable: true,
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { value: '', label: 'All Statuses' },
      { value: 'ACTIVE', label: 'Active' },
      { value: 'INACTIVE', label: 'Inactive' },
      { value: 'PENDING', label: 'Pending' }
    ],
    cellTemplate: this.statusCell,
    width: '15%'
  },
  {
    field: 'applicationCount',
    header: 'Applications',
    sortable: true,
    cellTemplate: this.applicationCountCell,
    width: '15%',
    align: 'center'
  },
  {
    field: 'lastActivity',
    header: 'Last Updated',
    sortable: true,
    width: '20%'
  }
];
```

### Cell Templates

**User Info Cell**:
```html
<ng-template #userInfoCell let-row>
  <div class="orb-info">
    <div class="orb-info__name">{{ row.user.firstName }} {{ row.user.lastName }}</div>
    <div class="orb-info__id">{{ row.user.userId }}</div>
  </div>
</ng-template>
```

**Status Cell**:
```html
<ng-template #statusCell let-row>
  <span class="status-badge status-badge--{{ getStatusClass(row.userStatus) }}">
    <fa-icon [icon]="getStatusIcon(row.userStatus)"></fa-icon>
    {{ row.userStatus }}
  </span>
</ng-template>
```

**Application Count Cell**:
```html
<ng-template #applicationCountCell let-row>
  <div class="orb-count orb-count--clickable" 
       (click)="onApplicationCountClick(row, $event)">
    <fa-icon icon="layer-group" class="orb-count__icon"></fa-icon>
    {{ row.applicationCount }}
  </div>
</ng-template>
```

### Navigation to Applications List

When user clicks application count:

1. Stop event propagation (prevent row click)
2. Navigate to `/customers/applications`
3. Pass query params: `{ filterByUser: userId, applicationIds: row.applicationIds.join(',') }`
4. Applications list reads params and filters to show only those applications
5. Applications list displays: "Filtered by user: [First Last]" with clear button

### Page Layout

Uses `UserPageComponent` wrapper:

```html
<app-user-page
  [heroTitle]="'Users'"
  [heroSubtitle]="'View users assigned to applications'"
  [breadcrumbItems]="breadcrumbItems"
  [tabs]="tabs"
  [activeTab]="activeTab"
  (tabChange)="onTabChange($event)">
  
  <div class="orb-card">
    <div class="orb-card__header">
      <h2 class="orb-card__title">
        <fa-icon icon="users" class="orb-card__icon"></fa-icon>
        Application Users
      </h2>
      <div class="orb-card__header-actions">
        <button class="orb-card-btn" (click)="onRefresh()">
          <fa-icon icon="refresh" class="orb-card-btn__icon"></fa-icon>
          Refresh
        </button>
      </div>
    </div>
    <div class="orb-card__content">
      <app-data-grid
        [columns]="columns"
        [data]="(filteredUserRows$ | async) || []"
        [pageState]="pageState"
        [sortState]="sortState"
        [filterState]="filterState"
        [loading]="(isLoading$ | async) || false"
        [showFilters]="true"
        [showPagination]="true"
        [showReset]="true"
        [selectable]="false"
        trackByField="user"
        emptyMessage="No users found"
        (pageChange)="onPageChange($event)"
        (sortChange)="onSortChange($event)"
        (filterChange)="onFilterChange($event)"
        (resetGrid)="onResetGrid()"
        (rowClick)="onRowClick($event)">
      </app-data-grid>
    </div>
  </div>
  
</app-user-page>
```

### Routing

Add to `apps/web/src/app/features/customers/customers.routes.ts`:

```typescript
{
  path: 'users',
  component: UsersListComponent,
  canActivate: [AuthGuard, RoleGuard],
  data: { 
    roles: ['CUSTOMER', 'EMPLOYEE', 'OWNER'],
    title: 'Users'
  }
}
```

The route `/customers/users` already has a Users icon in Quick Actions Nav, so no navigation changes are needed.


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: User Query Filtering

*For any* set of Users and ApplicationUsers records, the query SHALL return only users who have at least one ApplicationUsers record with status ACTIVE, INACTIVE, or INVITED, and SHALL exclude users who have only REMOVED status ApplicationUsers records.

**Validates: Requirements 2.1, 2.4**

**Test Strategy**: Generate random sets of users with various ApplicationUsers records (including users with only REMOVED, users with mixed statuses, users with no records). Verify that the filtering logic correctly includes/excludes users based on their ApplicationUsers statuses.

### Property 2: Authorization Access Control

*For any* user role, only users with role CUSTOMER, EMPLOYEE, or OWNER SHALL be able to access the Users List page, and all other roles SHALL be denied access.

**Validates: Requirements 1.3**

**Test Strategy**: Generate random user roles and verify that the route guard correctly allows/denies access based on the role.

### Property 3: Required Display Fields

*For any* user in the list, the rendered row SHALL display the user's full name (firstName + lastName), user status, application count, and last activity timestamp.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

**Test Strategy**: Generate random UserTableRow objects and verify that the rendered output contains all four required fields.

### Property 4: PII Field Exclusion

*For any* user in the list, the rendered row SHALL NOT display email, phoneNumber, or cognitoId fields.

**Validates: Requirements 3.5**

**Test Strategy**: Generate random users with PII fields populated and verify that the rendered output does not contain these field values.

### Property 5: Full Name Formatting

*For any* user with firstName and lastName, the displayed name SHALL be formatted as "FirstName LastName" (space-separated, firstName first).

**Validates: Requirements 3.6**

**Test Strategy**: Generate random first and last names and verify the formatting function produces the correct output.

### Property 6: Sorting Consistency

*For any* user list and any sortable field (name, status, applicationCount, lastActivity), sorting in ascending order then descending order SHALL produce the reverse of the original ascending order.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

**Test Strategy**: Generate random user lists, apply sorting on each field in both directions, and verify that desc = reverse(asc).

### Property 7: Combined Filter Application

*For any* user list, search term, and status filter, applying both filters simultaneously SHALL return only users that match both the search term (in firstName or lastName, case-insensitive) AND the status filter.

**Validates: Requirements 6.1, 6.3, 6.4**

**Test Strategy**: Generate random user lists with various names and statuses, apply random search terms and status filters, and verify that the filtered results match both criteria.

### Property 8: Row Selection State

*For any* user row clicked, the system SHALL store the userId of that user in the selected state.

**Validates: Requirements 7.2**

**Test Strategy**: Generate random users, simulate row clicks, and verify that the correct userId is stored in the state.

### Property 9: Application Count Navigation Parameters

*For any* user with applicationIds, clicking the application count SHALL navigate to `/customers/applications` with query parameters containing all of that user's applicationIds.

**Validates: Requirements 8.3**

**Test Strategy**: Generate random users with various applicationId arrays, simulate application count clicks, and verify that the navigation includes the correct applicationIds in query parameters.

### Property 10: Pagination Data Slicing

*For any* user list and page size, navigating to page N SHALL display items from index (N-1) * pageSize to (N * pageSize) - 1.

**Validates: Requirements 9.3**

**Test Strategy**: Generate random user lists with various sizes, apply different page sizes and page numbers, and verify that the correct subset of data is displayed.

### Property 11: Pagination Metadata Calculation

*For any* user list with totalItems and pageSize, the calculated totalPages SHALL equal ceil(totalItems / pageSize), and currentPage SHALL be between 1 and totalPages (inclusive).

**Validates: Requirements 9.4**

**Test Strategy**: Generate random user lists with various sizes and page sizes, and verify that the pagination metadata is calculated correctly.

### Property 12: Refresh State Preservation

*For any* user list with active filters and sort settings, refreshing the data SHALL maintain the same filter values and sort direction.

**Validates: Requirements 10.4**

**Test Strategy**: Generate random user lists with various filter and sort states, simulate refresh, and verify that the filter and sort state remains unchanged.

### Property 13: Total Count Display

*For any* user list, the displayed total count SHALL equal the length of the filtered user list.

**Validates: Requirements 4.5**

**Test Strategy**: Generate random user lists with various filters applied, and verify that the displayed count matches the filtered list length.

## Error Handling

### GraphQL Query Errors

**Error Scenarios**:
1. Network timeout or connection failure
2. GraphQL API returns error response
3. Invalid authentication token
4. Missing required fields in response

**Handling Strategy**:
- Catch errors in UsersEffects
- Dispatch `loadUsersFailure` action with error message
- Display user-friendly error message in UI
- Provide "Retry" button to re-attempt load
- Log detailed error to console for debugging

**Error Message Format**:
```
"Unable to load users. Please try again."
[Retry Button]
```

### Empty State Handling

**Scenarios**:
1. No users assigned to any applications
2. All users filtered out by search/status filters
3. Organization has no users

**Handling Strategy**:
- Display empty state message: "No users found"
- For filtered empty state, show "No users match your filters" with "Clear Filters" button
- Maintain consistent empty state styling with other list pages

### Authorization Errors

**Scenarios**:
1. User role changes while on page
2. User loses CUSTOMER/EMPLOYEE/OWNER role
3. Session expires

**Handling Strategy**:
- Route guard prevents initial access
- If role changes during session, redirect to unauthorized page
- Display message: "You don't have permission to view this page"

### Navigation Errors

**Scenarios**:
1. Applications list page doesn't exist
2. Invalid applicationIds in navigation params
3. User clicks application count with empty applicationIds array

**Handling Strategy**:
- Validate applicationIds array is non-empty before navigation
- If empty, display tooltip: "No applications assigned"
- Applications list handles invalid IDs gracefully (shows empty state)

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests** (specific examples and edge cases):
- Navigation to Users list from Quick Actions Nav (example)
- Active icon highlighting when on Users page (example)
- Loading indicator display during data fetch (example)
- Error message display on fetch failure (example)
- Default sort order is name ascending (example)
- Status filter dropdown contains all UserStatus values (example)
- Application count is rendered as clickable element (example)
- Application count click stops event propagation (example)
- Row click displays "not yet implemented" message (example)
- Default page size is 25 (example)
- Pagination controls are present (example)
- Refresh button is present (example)
- Empty state with no users (edge case)
- Empty state with filters applied (edge case)
- Previous button disabled on first page (edge case)
- Next button disabled on last page (edge case)

**Property-Based Tests** (universal properties):
- Property 1: User Query Filtering (100+ iterations)
- Property 2: Authorization Access Control (100+ iterations)
- Property 3: Required Display Fields (100+ iterations)
- Property 4: PII Field Exclusion (100+ iterations)
- Property 5: Full Name Formatting (100+ iterations)
- Property 6: Sorting Consistency (100+ iterations)
- Property 7: Combined Filter Application (100+ iterations)
- Property 8: Row Selection State (100+ iterations)
- Property 9: Application Count Navigation Parameters (100+ iterations)
- Property 10: Pagination Data Slicing (100+ iterations)
- Property 11: Pagination Metadata Calculation (100+ iterations)
- Property 12: Refresh State Preservation (100+ iterations)
- Property 13: Total Count Display (100+ iterations)

### Property-Based Testing Configuration

**Library**: Use `fast-check` for TypeScript property-based testing

**Configuration**:
```typescript
import * as fc from 'fast-check';

// Minimum 100 iterations per property test
fc.assert(
  fc.property(
    // arbitraries here
    (data) => {
      // property assertion
    }
  ),
  { numRuns: 100 }
);
```

**Test Tagging**:
Each property test MUST include a comment tag referencing the design document property:

```typescript
/**
 * Feature: application-users-list, Property 1: User Query Filtering
 * 
 * For any set of Users and ApplicationUsers records, the query SHALL return
 * only users who have at least one ApplicationUsers record with status ACTIVE,
 * INACTIVE, or INVITED, and SHALL exclude users who have only REMOVED status
 * ApplicationUsers records.
 */
it('should filter users correctly based on ApplicationUsers status', () => {
  fc.assert(
    fc.property(
      // test implementation
    ),
    { numRuns: 100 }
  );
});
```

### Test File Organization

```
features/customers/users/
├── store/
│   ├── users.reducer.spec.ts           # Unit tests for reducer
│   ├── users.reducer.property.spec.ts  # Property tests for reducer
│   ├── users.selectors.spec.ts         # Unit tests for selectors
│   ├── users.selectors.property.spec.ts # Property tests for selectors
│   └── users.effects.spec.ts           # Unit tests for effects
└── components/
    └── users-list/
        ├── users-list.component.spec.ts          # Unit tests
        └── users-list.component.property.spec.ts # Property tests
```

### Integration Testing

**Scenarios to Test**:
1. Full user journey: Load page → Filter → Sort → Navigate to applications
2. Refresh preserves state: Apply filters → Refresh → Verify filters maintained
3. Pagination with filters: Apply filters → Navigate pages → Verify correct data
4. Error recovery: Trigger error → Retry → Verify success

**Testing Approach**:
- Use TestBed to configure NgRx store with mock data
- Use MockStore to control state for different scenarios
- Verify component dispatches correct actions
- Verify component renders correct data from selectors

### Accessibility Testing

**Requirements**:
- All interactive elements have proper ARIA labels
- Keyboard navigation works for all actions
- Screen reader announces filter changes
- Focus management for modals/dialogs
- Color contrast meets WCAG 2.1 AA standards

**Testing Tools**:
- axe-core for automated accessibility testing
- Manual keyboard navigation testing
- Screen reader testing (NVDA/JAWS)
