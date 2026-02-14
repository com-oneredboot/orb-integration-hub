# Application Users Management - Frontend Implementation Guide

## Status: Backend Complete, Frontend In Progress

### Completed
- ✅ Backend Lambda function (GetApplicationUsers)
- ✅ 27 tests passing (19 property + 8 unit)
- ✅ GraphQL query definition created
- ✅ State and Actions updated

### Remaining Work

## 1. Update Users Reducer

File: `apps/web/src/app/features/customers/users/store/users.reducer.ts`

Key changes needed:
```typescript
on(UsersActions.loadUsersSuccess, (state, { users, nextToken }): UsersState => {
  // Build table rows from UserWithRoles
  const userRows: UserTableRow[] = users.map((user) => ({
    user,
    roleCount: user.roleAssignments.length,
    environments: [...new Set(user.roleAssignments.map(ra => ra.environment))],
    organizationNames: [...new Set(user.roleAssignments.map(ra => ra.organizationName))],
    applicationNames: [...new Set(user.roleAssignments.map(ra => ra.applicationName))],
    lastActivity: formatLastActivity(user.roleAssignments)
  }));

  return {
    ...state,
    isLoading: false,
    users,
    userRows,
    filteredUserRows: applyClientSideFilters(userRows, state.searchTerm),
    nextToken,
    hasMore: !!nextToken,
    error: null,
    lastLoadedTimestamp: Date.now()
  };
}),

// Client-side search filter
on(UsersActions.setSearchTerm, (state, { searchTerm }): UsersState => {
  const filteredRows = applyClientSideFilters(state.userRows, searchTerm);
  return { ...state, searchTerm, filteredUserRows: filteredRows };
}),

// Server-side filters (trigger reload)
on(UsersActions.setOrganizationFilter, (state, { organizationIds }): UsersState => {
  return { ...state, organizationIds };
}),

on(UsersActions.setApplicationFilter, (state, { applicationIds }): UsersState => {
  return { ...state, applicationIds };
}),

on(UsersActions.setEnvironmentFilter, (state, { environment }): UsersState => {
  return { ...state, environment };
}),

// Helper functions
function applyClientSideFilters(rows: UserTableRow[], searchTerm: string): UserTableRow[] {
  if (!searchTerm) return rows;
  const term = searchTerm.toLowerCase();
  return rows.filter(row =>
    row.user.firstName.toLowerCase().includes(term) ||
    row.user.lastName.toLowerCase().includes(term) ||
    row.user.userId.toLowerCase().includes(term)
  );
}

function formatLastActivity(roleAssignments: RoleAssignment[]): string {
  if (!roleAssignments.length) return 'Never';
  const latestUpdate = Math.max(...roleAssignments.map(ra => ra.updatedAt));
  const date = new Date(latestUpdate * 1000);
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

## 2. Update Users Effects

File: `apps/web/src/app/features/customers/users/store/users.effects.ts`

Key changes needed:
```typescript
import { GetApplicationUsers, GetApplicationUsersInput } from '../../../../core/graphql/GetApplicationUsers.graphql';

loadUsers$ = createEffect(() =>
  this.actions$.pipe(
    ofType(UsersActions.loadUsers, UsersActions.refreshUsers),
    withLatestFrom(
      this.store.select(selectOrganizationIds),
      this.store.select(selectApplicationIds),
      this.store.select(selectEnvironment)
    ),
    switchMap(([, organizationIds, applicationIds, environment]) => {
      const input: GetApplicationUsersInput = {
        organizationIds: organizationIds.length > 0 ? organizationIds : undefined,
        applicationIds: applicationIds.length > 0 ? applicationIds : undefined,
        environment: environment || undefined,
        limit: 50
      };

      return this.graphqlService.query<GetApplicationUsersResponse>(
        GetApplicationUsers,
        { input },
        'AMAZON_COGNITO_USER_POOLS'
      ).pipe(
        map(response =>
          UsersActions.loadUsersSuccess({
            users: response.GetApplicationUsers.users,
            nextToken: response.GetApplicationUsers.nextToken || null
          })
        ),
        catchError(error =>
          of(UsersActions.loadUsersFailure({
            error: error.message || 'Failed to load application users'
          }))
        )
      );
    })
  )
);

// Trigger reload when server-side filters change
filterChange$ = createEffect(() =>
  this.actions$.pipe(
    ofType(
      UsersActions.setOrganizationFilter,
      UsersActions.setApplicationFilter,
      UsersActions.setEnvironmentFilter
    ),
    map(() => UsersActions.loadUsers())
  )
);

loadMoreUsers$ = createEffect(() =>
  this.actions$.pipe(
    ofType(UsersActions.loadMoreUsers),
    withLatestFrom(
      this.store.select(selectOrganizationIds),
      this.store.select(selectApplicationIds),
      this.store.select(selectEnvironment),
      this.store.select(selectNextToken)
    ),
    filter(([, , , , nextToken]) => !!nextToken),
    switchMap(([, organizationIds, applicationIds, environment, nextToken]) => {
      const input: GetApplicationUsersInput = {
        organizationIds: organizationIds.length > 0 ? organizationIds : undefined,
        applicationIds: applicationIds.length > 0 ? applicationIds : undefined,
        environment: environment || undefined,
        limit: 50,
        nextToken: nextToken || undefined
      };

      return this.graphqlService.query<GetApplicationUsersResponse>(
        GetApplicationUsers,
        { input },
        'AMAZON_COGNITO_USER_POOLS'
      ).pipe(
        map(response =>
          UsersActions.loadMoreUsersSuccess({
            users: response.GetApplicationUsers.users,
            nextToken: response.GetApplicationUsers.nextToken || null
          })
        ),
        catchError(error =>
          of(UsersActions.loadMoreUsersFailure({
            error: error.message || 'Failed to load more users'
          }))
        )
      );
    })
  )
);
```

## 3. Update Users Selectors

File: `apps/web/src/app/features/customers/users/store/users.selectors.ts`

Add new selectors:
```typescript
export const selectOrganizationIds = createSelector(
  selectUsersState,
  (state: UsersState) => state?.organizationIds ?? []
);

export const selectApplicationIds = createSelector(
  selectUsersState,
  (state: UsersState) => state?.applicationIds ?? []
);

export const selectEnvironment = createSelector(
  selectUsersState,
  (state: UsersState) => state?.environment ?? null
);

export const selectNextToken = createSelector(
  selectUsersState,
  (state: UsersState) => state?.nextToken ?? null
);

export const selectHasMore = createSelector(
  selectUsersState,
  (state: UsersState) => state?.hasMore ?? false
);
```

## 4. Update Users List Component

File: `apps/web/src/app/features/customers/users/components/users-list/users-list.component.ts`

Key changes:
- Update columns to show: User Info, Role Count, Environments, Organizations, Applications, Last Activity
- Add filter dropdowns for Organization, Application, Environment
- Add expandable rows to show role assignments
- Update template references

## 5. Update Users List Template

File: `apps/web/src/app/features/customers/users/components/users-list/users-list.component.html`

Structure:
```html
<app-user-page
  [heroTitle]="'Application Users'"
  [heroSubtitle]="'Users with role assignments in applications'"
  [breadcrumbItems]="breadcrumbItems"
  [tabs]="tabs"
  [activeTab]="activeTab"
  (tabChange)="onTabChange($event)">

  <!-- Filters -->
  <div class="orb-filters">
    <div class="orb-filters__group">
      <label class="orb-filters__label">Organization</label>
      <select class="orb-filters__select" (change)="onOrganizationFilterChange($event)">
        <option value="">All Organizations</option>
        <!-- Populate from organizations store -->
      </select>
    </div>
    
    <div class="orb-filters__group">
      <label class="orb-filters__label">Application</label>
      <select class="orb-filters__select" (change)="onApplicationFilterChange($event)">
        <option value="">All Applications</option>
        <!-- Populate from applications store -->
      </select>
    </div>
    
    <div class="orb-filters__group">
      <label class="orb-filters__label">Environment</label>
      <select class="orb-filters__select" (change)="onEnvironmentFilterChange($event)">
        <option value="">All Environments</option>
        <option value="PRODUCTION">Production</option>
        <option value="STAGING">Staging</option>
        <option value="DEVELOPMENT">Development</option>
        <option value="TEST">Test</option>
        <option value="PREVIEW">Preview</option>
      </select>
    </div>
  </div>

  <!-- Data Grid -->
  <div class="orb-card">
    <div class="orb-card__header">
      <h2 class="orb-card__title">
        <fa-icon icon="users" class="orb-card__icon"></fa-icon>
        Application Users
      </h2>
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
        emptyMessage="No application users found"
        (pageChange)="onPageChange($event)"
        (sortChange)="onSortChange($event)"
        (filterChange)="onFilterChange($event)"
        (resetGrid)="onResetGrid()"
        (rowClick)="onRowClick($event)">
      </app-data-grid>
    </div>
  </div>

</app-user-page>

<!-- Cell Templates -->
<ng-template #userInfoCell let-row>
  <div class="orb-info">
    <div class="orb-info__name">{{ row.user.firstName }} {{ row.user.lastName }}</div>
    <div class="orb-info__id">{{ row.user.userId }}</div>
  </div>
</ng-template>

<ng-template #roleCountCell let-row>
  <div class="orb-count">
    <fa-icon icon="user-tag" class="orb-count__icon"></fa-icon>
    {{ row.roleCount }}
  </div>
</ng-template>

<ng-template #environmentsCell let-row>
  <div class="orb-badge-list">
    <span *ngFor="let env of row.environments" class="orb-badge">{{ env }}</span>
  </div>
</ng-template>
```

## 6. Routing Configuration

File: `apps/web/src/app/features/customers/users/users.routes.ts`

Ensure route is configured:
```typescript
export const USERS_ROUTES: Routes = [
  {
    path: '',
    component: UsersListComponent
  }
];
```

And in `apps/web/src/app/features/customers/customers.routes.ts`:
```typescript
{
  path: 'users',
  loadChildren: () => import('./users/users.routes').then(m => m.USERS_ROUTES)
}
```

## 7. Documentation Updates

### Update docs/user-management-views.md
- Remove ApplicationUsers table references
- Update query strategy to reflect Lambda implementation
- Mark as "✅ Implemented"

### Update docs/schema.md
- Document ApplicationUserRoles schema changes
- Add organizationId, organizationName, applicationName attributes
- Document lambda-dynamodb type
- Remove ApplicationUsers table documentation

### Update docs/api.md
- Document GetApplicationUsers query
- Add input/output interfaces
- Add error codes table
- Add usage examples

## 8. Version and Changelog

### Update package.json
Bump version: `0.x.y` → `0.(x+1).0` (minor version for new feature)

### Update CHANGELOG.md
```markdown
## [0.x.0] - 2026-02-09

### Added
- Application Users Management feature
  - GetApplicationUsers Lambda function with filtering by organization, application, and environment
  - Frontend component for viewing application users with role assignments
  - Property-based testing with 19 tests covering validation, authorization, and data integrity

### Changed
- Removed redundant ApplicationUsers table
- Updated ApplicationUserRoles schema to lambda-dynamodb type with denormalized fields

### Fixed
- N/A
```

## Testing Checklist

- [ ] Backend Lambda tests pass (27 tests)
- [ ] Frontend component renders without errors
- [ ] Filters work correctly (organization, application, environment)
- [ ] Client-side search works
- [ ] Pagination works
- [ ] Row expansion shows role details
- [ ] No console errors
- [ ] No linting errors
- [ ] TypeScript compiles without errors

## Integration Testing

1. Create test role assignments in DynamoDB
2. Navigate to `/customers/users`
3. Verify users display with correct role counts
4. Test organization filter
5. Test application filter
6. Test environment filter
7. Test search functionality
8. Test row expansion to see role details
9. Verify pagination works
10. Clean up test data
