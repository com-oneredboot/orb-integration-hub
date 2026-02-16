# Design Document: Application Roles Management

## Overview

This feature combines two related pieces of work:

1. **Remove Legacy Roles Table**: Delete the deprecated `Roles` table schema and all generated code, including renaming enums to follow the `Application*` naming convention.

2. **Add Roles Tab to Application Detail Page**: Add a new tab for managing ApplicationRoles (role definitions like "Admin", "Editor", "Viewer") for customer applications.

The implementation follows existing patterns in the codebase, particularly the Environments tab and NgRx store-first architecture.

## Architecture

### Component Architecture

```
Application Detail Page
├── Overview Tab (existing)
├── Environments Tab (existing)
├── Roles Tab (NEW)
│   └── ApplicationRolesListComponent
│       ├── DataGridComponent (shared)
│       └── Role Dialogs
│           ├── CreateRoleDialogComponent
│           └── EditRoleDialogComponent
└── Danger Zone Tab (existing)
```

### Store Architecture

```
applications/store/
├── applications.* (existing)
├── environments/ (existing)
├── environment-config/ (existing)
└── application-roles/ (NEW)
    ├── application-roles.state.ts
    ├── application-roles.actions.ts
    ├── application-roles.reducer.ts
    ├── application-roles.selectors.ts
    ├── application-roles.effects.ts
    └── index.ts
```

## Components and Interfaces

### ApplicationRolesListComponent

A standalone Angular component that displays ApplicationRoles in a DataGrid.

```typescript
@Component({
  selector: 'app-application-roles-list',
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule,
    DataGridComponent,
  ],
  templateUrl: './application-roles-list.component.html',
  styleUrls: ['./application-roles-list.component.scss'],
})
export class ApplicationRolesListComponent implements OnInit, OnDestroy {
  @Input() applicationId: string | null = null;
  @Input() organizationId: string | null = null;

  // Store selectors
  roleRows$: Observable<ApplicationRoleTableRow[]>;
  filteredRoleRows$: Observable<ApplicationRoleTableRow[]>;
  isLoading$: Observable<boolean>;
  error$: Observable<string | null>;

  // Grid configuration
  columns: ColumnDefinition<ApplicationRoleTableRow>[] = [];
  pageState: PageState;
  sortState: SortState | null = null;
  filterState: FilterState = {};
}
```

### CreateRoleDialogComponent

Dialog for creating new ApplicationRoles.

```typescript
@Component({
  selector: 'app-create-role-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FontAwesomeModule],
})
export class CreateRoleDialogComponent {
  @Input() applicationId!: string;
  @Output() created = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  form = this.fb.group({
    roleName: ['', [Validators.required, Validators.maxLength(100)]],
    roleType: ['USER', Validators.required],
    description: ['', Validators.maxLength(500)],
  });
}
```

### EditRoleDialogComponent

Dialog for editing existing ApplicationRoles.

```typescript
@Component({
  selector: 'app-edit-role-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FontAwesomeModule],
})
export class EditRoleDialogComponent {
  @Input() role!: IApplicationRoles;
  @Output() saved = new EventEmitter<void>();
  @Output() deactivated = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  form = this.fb.group({
    roleName: ['', [Validators.required, Validators.maxLength(100)]],
    roleType: ['', Validators.required],
    description: ['', Validators.maxLength(500)],
  });
}
```

## Data Models

### ApplicationRoleTableRow

Interface for DataGrid row display:

```typescript
interface ApplicationRoleTableRow {
  role: IApplicationRoles;
  roleTypeLabel: string;
  statusLabel: string;
  lastActivity: string;
}
```

### ApplicationRolesState

NgRx state interface:

```typescript
interface ApplicationRolesState {
  // Core data
  roles: IApplicationRoles[];
  roleRows: ApplicationRoleTableRow[];
  filteredRoleRows: ApplicationRoleTableRow[];
  selectedRole: IApplicationRoles | null;

  // Context
  applicationId: string | null;
  organizationId: string | null;

  // Filter state
  searchTerm: string;
  statusFilter: string;
  roleTypeFilter: string;

  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;

  // Error states
  error: string | null;
  createError: string | null;
  updateError: string | null;
  deleteError: string | null;

  // Dialog state
  showCreateDialog: boolean;
  showEditDialog: boolean;
}
```

### NgRx Actions

```typescript
export const ApplicationRolesActions = createActionGroup({
  source: 'ApplicationRoles',
  events: {
    // Context
    'Set Application Context': props<{ applicationId: string; organizationId: string }>(),

    // Load
    'Load Roles': props<{ applicationId: string }>(),
    'Load Roles Success': props<{ roles: IApplicationRoles[] }>(),
    'Load Roles Failure': props<{ error: string }>(),

    // Create
    'Create Role': props<{ input: CreateApplicationRoleInput }>(),
    'Create Role Success': props<{ role: IApplicationRoles }>(),
    'Create Role Failure': props<{ error: string }>(),

    // Update
    'Update Role': props<{ input: UpdateApplicationRoleInput }>(),
    'Update Role Success': props<{ role: IApplicationRoles }>(),
    'Update Role Failure': props<{ error: string }>(),

    // Deactivate
    'Deactivate Role': props<{ applicationRoleId: string }>(),
    'Deactivate Role Success': props<{ role: IApplicationRoles }>(),
    'Deactivate Role Failure': props<{ error: string }>(),

    // Delete
    'Delete Role': props<{ applicationRoleId: string }>(),
    'Delete Role Success': props<{ applicationRoleId: string }>(),
    'Delete Role Failure': props<{ error: string }>(),

    // Selection
    'Select Role': props<{ role: IApplicationRoles | null }>(),

    // Filters
    'Set Search Term': props<{ searchTerm: string }>(),
    'Set Status Filter': props<{ statusFilter: string }>(),
    'Set Role Type Filter': props<{ roleTypeFilter: string }>(),

    // Dialogs
    'Open Create Dialog': emptyProps(),
    'Close Create Dialog': emptyProps(),
    'Open Edit Dialog': props<{ role: IApplicationRoles }>(),
    'Close Edit Dialog': emptyProps(),

    // Errors
    'Clear Errors': emptyProps(),

    // Reset
    'Reset State': emptyProps(),
  },
});
```

## Schema Changes

### New Enum: ApplicationRoleType

Create `schemas/registries/ApplicationRoleType.yml`:

```yaml
type: registry
version: '1.0'
name: ApplicationRoleType
targets:
  - api
description: "Types of application roles"

items:
  UNKNOWN:
    value: "UNKNOWN"
    description: "Unknown role type"
  ADMIN:
    value: "ADMIN"
    description: "Administrator role"
  USER:
    value: "USER"
    description: "Standard user role"
  GUEST:
    value: "GUEST"
    description: "Guest role"
  CUSTOM:
    value: "CUSTOM"
    description: "Custom role"
```

### Updated ApplicationRoles Schema

Update `schemas/tables/ApplicationRoles.yml` to use new enums:

```yaml
# Changes:
# - enum_type: RoleType → enum_type: ApplicationRoleType
# - enum_type: RoleStatus → enum_type: ApplicationRoleStatus
```

### Files to Delete

1. `schemas/tables/Roles.yml`
2. `schemas/registries/RoleType.yml`
3. `schemas/registries/RoleStatus.yml`

### Generated Files to Remove (after schema regeneration)

1. `apps/api/models/RolesModel.py`
2. `apps/web/src/app/core/models/RolesModel.ts`
3. `infrastructure/cdk/generated/tables/roles_table.py`
4. `apps/api/enums/role_type_enum.py`
5. `apps/api/enums/role_status_enum.py`
6. `apps/web/src/app/core/enums/RoleTypeEnum.ts`
7. `apps/web/src/app/core/enums/RoleStatusEnum.ts`

### CDK Infrastructure Changes

Remove from `infrastructure/cdk/stacks/dynamodb_stack.py`:
- `_create_roles_table()` method
- Call to `_create_roles_table()` in constructor

Remove from `infrastructure/cdk/tests/test_dynamodb_stack.py`:
- `TestDynamoDBStackRolesTable` test class



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Tab Enabled Based on Application Status

*For any* application, the Roles tab should be enabled if and only if the application status is ACTIVE (not PENDING/draft). For draft applications, the tab should be disabled or hidden.

**Validates: Requirements 3.1, 3.2**

### Property 2: Role Count Badge Accuracy

*For any* application with roles, the Roles tab badge should display the count of roles with status ACTIVE for that application.

**Validates: Requirements 3.4**

### Property 3: Role Display Completeness

*For any* ApplicationRole displayed in the DataGrid, the row should contain:
- The role name in the primary column
- The role type with appropriate badge styling
- The description (if present, empty otherwise)
- The status with appropriate status badge
- The last updated time in relative format

**Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6**

### Property 4: Form Validation Enforcement

*For any* role creation or edit form submission:
- Role name is required and must be ≤100 characters
- Role type is required and must be a valid ApplicationRoleType
- Description is optional but must be ≤500 characters if provided

**Validates: Requirements 5.2, 5.3, 5.4**

### Property 5: Role Creation Status

*For any* valid role creation input, the created ApplicationRole should have status ACTIVE.

**Validates: Requirements 5.5**

### Property 6: Edit Dialog Pre-population

*For any* ApplicationRole, when the edit dialog is opened, the form fields should be pre-populated with the current role values (roleName, roleType, description).

**Validates: Requirements 6.1**

### Property 7: Role Update Timestamp

*For any* successful role update, the updatedAt timestamp should be set to the current time (greater than the previous updatedAt).

**Validates: Requirements 6.5**

### Property 8: Action Button Enabled State

*For any* ApplicationRole in the edit dialog:
- The "Deactivate" button should be enabled if and only if status is ACTIVE
- The "Delete" button should always be enabled

**Validates: Requirements 7.1, 7.2**

### Property 9: Status Change Correctness

*For any* status change operation:
- Deactivate should change status from ACTIVE to INACTIVE
- Delete should change status to DELETED

**Validates: Requirements 7.3, 7.5**

### Property 10: Filter Action Dispatch

*For any* filter change in the ApplicationRoles list, the component should dispatch the corresponding filter action to the store.

**Validates: Requirements 8.4**

### Property 11: Reducer Filter Computation

*For any* combination of search term, status filter, and role type filter, the reducer should correctly compute filteredRoleRows by applying all active filters to roleRows.

**Validates: Requirements 8.5**

### Property 12: Unique ID Generation

*For any* role creation, the generated applicationRoleId and roleId should be unique (not matching any existing role in the application).

**Validates: Requirements 9.3**

### Property 13: Default Roles on Activation

*For any* application activation (status change from PENDING to ACTIVE), the system should create 4 default roles (Owner, Administrator, User, Guest) all with status ACTIVE.

**Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6**

## Error Handling

### Schema Removal Errors

| Error Scenario | Handling |
|----------------|----------|
| Schema file not found | Log warning, continue with other deletions |
| Generated file deletion fails | Log error, manual cleanup required |
| Schema generator fails | Stop process, report error to user |

### Frontend Errors

| Error Scenario | Handling |
|----------------|----------|
| Load roles fails | Display error message in component, allow retry |
| Create role fails | Display error in dialog, keep dialog open |
| Update role fails | Display error in dialog, keep dialog open |
| Delete role fails | Display error in dialog, keep dialog open |
| Duplicate role name | Display validation error in create/edit dialog |
| Network timeout | Display generic error, allow retry |

### Default Role Creation Errors

| Error Scenario | Handling |
|----------------|----------|
| Default role creation fails | Log error, continue with application activation |
| Partial default role creation | Log which roles failed, continue with activation |

## Testing Strategy

### Unit Tests

Unit tests should cover:
- Component initialization and input handling
- Form validation logic
- Dialog open/close behavior
- Store action dispatching
- Reducer state transitions
- Selector computations

### Property-Based Tests

Property tests should be implemented using fast-check (TypeScript) with minimum 100 iterations per test.

Each property test should be tagged with:
```typescript
// Feature: application-roles-management, Property N: [property description]
```

**Property Test Coverage:**

| Property | Test File | Description |
|----------|-----------|-------------|
| P1 | `application-detail-page.component.property.spec.ts` | Tab enabled based on status |
| P2 | `application-detail-page.component.property.spec.ts` | Role count badge accuracy |
| P3 | `application-roles-list.component.property.spec.ts` | Role display completeness |
| P4 | `create-role-dialog.component.property.spec.ts` | Form validation |
| P5 | `application-roles.reducer.property.spec.ts` | Creation status |
| P6 | `edit-role-dialog.component.property.spec.ts` | Dialog pre-population |
| P7 | `application-roles.reducer.property.spec.ts` | Update timestamp |
| P8 | `edit-role-dialog.component.property.spec.ts` | Button enabled state |
| P9 | `application-roles.reducer.property.spec.ts` | Status changes |
| P10 | `application-roles-list.component.property.spec.ts` | Filter dispatch |
| P11 | `application-roles.reducer.property.spec.ts` | Filter computation |
| P12 | `application-roles.effects.property.spec.ts` | Unique ID generation |
| P13 | `application-roles.effects.property.spec.ts` | Default roles |

### Integration Tests

Integration tests should verify:
- End-to-end role CRUD operations
- Tab navigation and component rendering
- Store integration with components
- GraphQL API integration

### Manual Testing Checklist

- [ ] Verify Roles tab appears for active applications
- [ ] Verify Roles tab hidden for draft applications
- [ ] Create a new role and verify it appears in list
- [ ] Edit an existing role and verify changes persist
- [ ] Deactivate a role and verify status changes
- [ ] Delete a role and verify it's marked as deleted
- [ ] Verify default roles created on application activation
- [ ] Verify schema generator runs without Roles.yml
- [ ] Verify CDK synth succeeds without Roles table
