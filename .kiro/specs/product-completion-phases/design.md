# Design Document: Product Completion Phases

## Overview

This design addresses the final items needed to complete the orb-integration-hub product before SDK implementation. The work is organized into four sequential phases that build upon each other to deliver a production-ready platform.

### Phase Summary

1. **Application Users Management** - Add missing feature for managing user assignments to applications
2. **UI Standards Compliance** - Ensure all pages follow established patterns and conventions
3. **Quality Assurance & Polish** - Comprehensive accessibility, mobile, and error handling improvements
4. **SDK Implementation** - Create TypeScript and Python SDKs for programmatic platform access

### Design Principles

- **Store-First Architecture**: All data flows through NgRx stores
- **Component Reusability**: Use shared components (DataGridComponent, UserPageComponent)
- **Consistency**: Follow Organizations pattern as canonical reference
- **Accessibility**: WCAG 2.1 AA compliance throughout
- **Mobile-First**: Responsive design for all screen sizes

## Architecture

### System Context

The orb-integration-hub is a serverless integration platform built on AWS AppSync, DynamoDB, and Angular. This design focuses on frontend completeness and SDK creation.

```
┌─────────────────────────────────────────────────────────────┐
│                    orb-integration-hub                       │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Angular    │  │   AppSync    │  │  DynamoDB    │     │
│  │   Frontend   │──│   GraphQL    │──│   Tables     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                                                    │
│         │                                                    │
│  ┌──────▼──────────────────────────────────────────┐       │
│  │           New: SDK Layer                         │       │
│  │  ┌──────────────┐      ┌──────────────┐        │       │
│  │  │ TypeScript   │      │   Python     │        │       │
│  │  │    SDK       │      │     SDK      │        │       │
│  │  └──────────────┘      └──────────────┘        │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Frontend Architecture


```
Angular Application
├── Layouts
│   ├── UserLayoutComponent (shell with router-outlet)
│   └── UserPageComponent (page wrapper - enforces structure)
├── Features
│   ├── Organizations (canonical reference)
│   ├── Applications
│   │   └── NEW: ApplicationUsersListComponent
│   └── Users
└── Shared Components
    ├── DataGridComponent (all list pages)
    ├── HeroSplitComponent
    ├── BreadcrumbComponent
    └── TabNavigationComponent
```

### Store-First Data Flow

All components follow the Organizations pattern:

```
Component
    │
    ├─→ Dispatch Action ─→ Effect ─→ Service ─→ GraphQL API
    │                         │
    └─← Subscribe Selector ←─ Reducer ←─ Success/Failure Action
```

**Key Principles:**
- Components NEVER call services directly for data operations
- All data comes from store selectors
- All mutations dispatch actions
- Effects handle async operations
- Reducers compute derived state (filtering, sorting)



## Components and Interfaces

### Phase 1: Application Users Management

#### ApplicationUsersListComponent

**Purpose:** Display and manage users assigned to an application with their role assignments per environment.

**Location:** `apps/web/src/app/features/customers/applications/components/application-users-list/`

**Component Interface:**

```typescript
@Component({
  selector: 'app-application-users-list',
  standalone: true,
  imports: [DataGridComponent, CommonModule, FontAwesomeModule],
  templateUrl: './application-users-list.component.html',
  styleUrls: ['./application-users-list.component.scss']
})
export class ApplicationUsersListComponent implements OnInit, OnDestroy {
  // Store selectors
  applicationUsers$: Observable<ApplicationUserTableRow[]>;
  filteredUsers$: Observable<ApplicationUserTableRow[]>;
  isLoading$: Observable<boolean>;
  
  // Data grid configuration
  columns: ColumnDefinition<ApplicationUserTableRow>[];
  pageState: PageState;
  sortState: SortState | null;
  filterState: FilterState;
  
  // Actions
  onAssignUser(): void;
  onUnassignUser(userId: string): void;
  onEditRole(userId: string, environmentId: string): void;
}
```

**Table Row Interface:**

```typescript
interface ApplicationUserTableRow {
  user: IUsers;
  roleAssignments: EnvironmentRoleAssignment[];
  lastActivity: string;
}

interface EnvironmentRoleAssignment {
  environmentId: string;
  environmentName: string;
  roleId: string;
  roleName: string;
}
```



#### Application Users Store

**State Interface:**

```typescript
interface ApplicationUsersState {
  // Core data
  applicationUsers: IUsers[];
  userRows: ApplicationUserTableRow[];
  filteredUserRows: ApplicationUserTableRow[];
  
  // Filter state
  searchTerm: string;
  roleFilter: string;
  environmentFilter: string;
  
  // Loading states
  isLoading: boolean;
  isAssigning: boolean;
  isUnassigning: boolean;
  isUpdatingRole: boolean;
  
  // Error states
  error: string | null;
  assignError: string | null;
  unassignError: string | null;
  roleUpdateError: string | null;
}
```

**Actions:**

```typescript
// Load users for application
loadApplicationUsers({ applicationId: string })
loadApplicationUsersSuccess({ users: IUsers[], roleAssignments: RoleAssignment[] })
loadApplicationUsersFailure({ error: string })

// Assign user to application
assignUserToApplication({ applicationId: string, userId: string, environmentRoles: EnvironmentRole[] })
assignUserSuccess({ user: IUsers, roleAssignments: RoleAssignment[] })
assignUserFailure({ error: string })

// Unassign user from application
unassignUserFromApplication({ applicationId: string, userId: string })
unassignUserSuccess({ userId: string })
unassignUserFailure({ error: string })

// Update user role for environment
updateUserRole({ applicationId: string, userId: string, environmentId: string, roleId: string })
updateUserRoleSuccess({ userId: string, environmentId: string, roleId: string })
updateUserRoleFailure({ error: string })

// Filters
setSearchTerm({ searchTerm: string })
setRoleFilter({ roleFilter: string })
setEnvironmentFilter({ environmentFilter: string })
```



#### AssignUserDialogComponent

**Purpose:** Dialog for assigning users to an application with initial role selections.

**Component Interface:**

```typescript
@Component({
  selector: 'app-assign-user-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FontAwesomeModule],
  templateUrl: './assign-user-dialog.component.html',
  styleUrls: ['./assign-user-dialog.component.scss']
})
export class AssignUserDialogComponent {
  @Input() applicationId!: string;
  @Input() environments!: IEnvironments[];
  @Input() availableUsers!: IUsers[];
  @Output() assign = new EventEmitter<UserAssignment>();
  @Output() cancel = new EventEmitter<void>();
  
  form: FormGroup;
  
  onSubmit(): void;
  onCancel(): void;
}

interface UserAssignment {
  userId: string;
  environmentRoles: Array<{
    environmentId: string;
    roleId: string;
  }>;
}
```

#### EditUserRoleDialogComponent

**Purpose:** Dialog for changing a user's role for a specific environment.

**Component Interface:**

```typescript
@Component({
  selector: 'app-edit-user-role-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FontAwesomeModule],
  templateUrl: './edit-user-role-dialog.component.html',
  styleUrls: './edit-user-role-dialog.component.scss'
})
export class EditUserRoleDialogComponent {
  @Input() userId!: string;
  @Input() userName!: string;
  @Input() environmentId!: string;
  @Input() environmentName!: string;
  @Input() currentRoleId!: string;
  @Input() availableRoles!: IRoles[];
  @Output() save = new EventEmitter<RoleUpdate>();
  @Output() cancel = new EventEmitter<void>();
  
  form: FormGroup;
  
  onSubmit(): void;
  onCancel(): void;
}

interface RoleUpdate {
  userId: string;
  environmentId: string;
  roleId: string;
}
```



### Phase 2: UI Standards Compliance

#### Last Activity Column Implementation

**Approach:** Add `lastActivity` computed field to all table row interfaces.

**Organizations Pattern (Reference):**

```typescript
// In reducer - loadOrganizationsSuccess
const organizationRows: OrganizationTableRow[] = organizations.map((org) => ({
  organization: org,
  userRole: 'OWNER',
  isOwner: true,
  memberCount: 1,
  applicationCount: org.applicationCount ?? 0,
  lastActivity: formatLastActivity(org.updatedAt)  // ← Computed here
}));

// Helper function in reducer
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

**Pages Requiring Updates:**
- ApplicationsListComponent
- UsersListComponent (if not already present)



#### Metadata Section Implementation

**Approach:** Add metadata section to all detail pages using consistent HTML structure.

**Standard Metadata Section:**

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

**Helper Function:**

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

**Pages Requiring Updates:**
- ApplicationDetailPageComponent
- EnvironmentDetailPageComponent
- OrganizationDetailPageComponent (verify present)



#### UserPageComponent Compliance Audit

**Approach:** Audit all feature pages and refactor non-compliant pages to use UserPageComponent wrapper.

**Audit Checklist:**
1. List all components in `features/` directories
2. Check each component template for UserPageComponent usage
3. Identify components with custom page wrappers
4. Refactor to use UserPageComponent with proper inputs

**Standard UserPageComponent Usage:**

```html
<app-user-page
  [heroTitle]="'Page Title'"
  [heroSubtitle]="'Page description'"
  [breadcrumbItems]="breadcrumbItems"
  [tabs]="tabs"
  [activeTabId]="activeTab"
  (tabChange)="onTabChange($event)">
  
  <!-- Page content projected here -->
  <div class="orb-card">
    <!-- Feature content -->
  </div>
  
</app-user-page>
```

#### DataGridComponent Compliance Audit

**Approach:** Audit all list pages and refactor to use DataGridComponent.

**Audit Checklist:**
1. Find all components with `<table>` elements
2. Check for custom table implementations
3. Refactor to use DataGridComponent with column definitions
4. Migrate custom cell rendering to ng-template

**Standard DataGridComponent Usage:**

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
  trackByField="resource"
  (pageChange)="onPageChange($event)"
  (sortChange)="onSortChange($event)"
  (filterChange)="onFilterChange($event)"
  (rowClick)="onRowClick($event)">
</app-data-grid>
```



#### Global CSS Classes Compliance Audit

**Approach:** Audit component stylesheets and replace custom styles with global orb-* classes.

**Audit Process:**
1. Review all component `.scss` files
2. Identify styles that duplicate global classes
3. Replace with appropriate orb-* classes
4. Document any custom styles that cannot be replaced

**Common Replacements:**

| Custom Style | Global Class |
|--------------|--------------|
| Custom card styles | `orb-card`, `orb-card__header`, `orb-card__content` |
| Custom button styles | `orb-btn`, `orb-btn--primary`, `orb-card-btn` |
| Custom info display | `orb-info`, `orb-info__name`, `orb-info__id` |
| Custom role badges | `orb-role-badge`, `orb-role-badge--owner` |
| Custom count display | `orb-count`, `orb-count__icon` |
| Custom status badges | `status-badge`, `orb-header-badge` |

#### Store-First Architecture Compliance Audit

**Approach:** Audit all components for direct service calls and refactor to use store.

**Audit Checklist:**
1. Search for service method calls in component files
2. Identify components with local data state
3. Identify components with local loading/error state
4. Refactor to dispatch actions and use selectors

**Anti-Pattern Detection:**

```typescript
// ❌ WRONG - Direct service call
this.resourceService.getResources().subscribe(data => {
  this.resources = data;
});

// ✅ CORRECT - Dispatch action and use selector
this.resources$ = this.store.select(selectResources);
this.store.dispatch(ResourceActions.loadResources());
```



### Phase 3: Quality Assurance & Polish

#### Accessibility Implementation

**WCAG 2.1 AA Requirements:**

1. **Keyboard Navigation**
   - All interactive elements accessible via Tab/Shift+Tab
   - Logical tab order
   - Visible focus indicators
   - No keyboard traps
   - Enter/Space activates buttons
   - Escape closes dialogs

2. **Screen Reader Support**
   - ARIA labels for icon-only buttons
   - ARIA live regions for dynamic updates
   - Semantic HTML (button, nav, main, header)
   - Alt text for informational images
   - Form error announcements

3. **Focus Management**
   - Focus moves to dialog on open
   - Focus returns to trigger on close
   - Focus moves to main content on page load
   - Page changes announced to screen readers

4. **Color Contrast**
   - Text: 4.5:1 minimum
   - Large text (18pt+): 3:1 minimum
   - Interactive elements: 3:1 minimum
   - Audit all color combinations

**Implementation Approach:**

```typescript
// Focus management in dialogs
export class MyDialogComponent implements AfterViewInit, OnDestroy {
  @ViewChild('firstInput') firstInput!: ElementRef;
  private previouslyFocusedElement: HTMLElement | null = null;
  
  ngAfterViewInit(): void {
    // Store previous focus
    this.previouslyFocusedElement = document.activeElement as HTMLElement;
    // Move focus to dialog
    this.firstInput.nativeElement.focus();
  }
  
  ngOnDestroy(): void {
    // Restore focus
    this.previouslyFocusedElement?.focus();
  }
}
```



#### Mobile Responsiveness Implementation

**Breakpoints:**
- Desktop: > 1024px
- Tablet: 768px - 1024px
- Mobile: < 768px

**Responsive Patterns:**

1. **Layout Stacking**
   ```scss
   .my-component {
     display: flex;
     gap: var(--spacing-lg);
     
     @media (max-width: 768px) {
       flex-direction: column;
     }
   }
   ```

2. **Touch-Friendly Targets**
   ```scss
   .orb-btn {
     min-height: 44px;
     min-width: 44px;
     padding: var(--spacing-sm) var(--spacing-md);
   }
   ```

3. **Mobile Navigation**
   ```html
   <nav class="nav-menu">
     <button class="nav-menu__toggle" (click)="toggleMenu()">
       <fa-icon [icon]="faBars"></fa-icon>
     </button>
     <div class="nav-menu__items" [class.nav-menu__items--open]="menuOpen">
       <!-- Navigation items -->
     </div>
   </nav>
   ```

4. **Dialog Optimization**
   ```scss
   .dialog {
     max-width: 600px;
     
     @media (max-width: 768px) {
       max-width: 100%;
       margin: var(--spacing-sm);
     }
   }
   ```



#### Error Handling Implementation

**Consistent Error Messages:**

```typescript
// Error message service
@Injectable({ providedIn: 'root' })
export class ErrorMessageService {
  getErrorMessage(error: unknown): string {
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    if (this.isGraphQLError(error)) return this.extractGraphQLError(error);
    return 'An unexpected error occurred';
  }
  
  private isGraphQLError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'errors' in error;
  }
  
  private extractGraphQLError(error: any): string {
    if (error.errors?.[0]?.message) return error.errors[0].message;
    return 'GraphQL operation failed';
  }
}
```

**Loading States:**

```html
<!-- Button with loading state -->
<button 
  class="orb-btn orb-btn--primary"
  [disabled]="(isSaving$ | async) || false"
  (click)="onSave()">
  <fa-icon 
    *ngIf="(isSaving$ | async); else saveIcon" 
    [icon]="faSpinner" 
    [spin]="true">
  </fa-icon>
  <ng-template #saveIcon>
    <fa-icon [icon]="faSave"></fa-icon>
  </ng-template>
  Save
</button>

<!-- Page with loading state -->
<div *ngIf="(isLoading$ | async); else content" class="loading-container">
  <fa-icon [icon]="faSpinner" [spin]="true" size="2x"></fa-icon>
  <p>Loading...</p>
</div>
<ng-template #content>
  <!-- Page content -->
</ng-template>
```

**Notifications:**

```typescript
// Notification service
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private notificationSubject = new Subject<Notification>();
  notifications$ = this.notificationSubject.asObservable();
  
  success(message: string): void {
    this.show({ type: 'success', message, duration: 5000 });
  }
  
  error(message: string): void {
    this.show({ type: 'error', message, duration: 7000 });
  }
  
  private show(notification: Notification): void {
    this.notificationSubject.next(notification);
  }
}
```



#### Performance Optimization

**Lazy Loading Verification:**

```typescript
// Routes with lazy loading
const routes: Routes = [
  {
    path: 'customers',
    loadChildren: () => import('./features/customers/customers.routes')
      .then(m => m.CUSTOMERS_ROUTES)
  },
  {
    path: 'user',
    loadChildren: () => import('./features/user/user.routes')
      .then(m => m.USER_ROUTES)
  }
];
```

**Bundle Size Analysis:**

```bash
# Build with stats
npm run build -- --stats-json

# Analyze bundle
npx webpack-bundle-analyzer dist/apps/web/stats.json
```

**API Call Optimization:**

```typescript
// Cache frequently accessed data
@Injectable({ providedIn: 'root' })
export class CachedDataService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheDuration = 5 * 60 * 1000; // 5 minutes
  
  get<T>(key: string, fetcher: () => Observable<T>): Observable<T> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return of(cached.data);
    }
    
    return fetcher().pipe(
      tap(data => this.cache.set(key, { data, timestamp: Date.now() }))
    );
  }
}
```



### Phase 4: SDK Implementation

#### TypeScript SDK Architecture

**Package Structure:**

```
packages/orb-sdk-core/
├── src/
│   ├── auth/
│   │   ├── AuthClient.ts
│   │   └── TokenManager.ts
│   ├── authorization/
│   │   └── PermissionChecker.ts
│   ├── graphql/
│   │   ├── GraphQLClient.ts
│   │   └── operations/
│   ├── errors/
│   │   └── SDKError.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

**Core Interfaces:**

```typescript
// SDK Configuration
export interface SDKConfig {
  apiUrl: string;
  region: string;
  userPoolId: string;
  clientId: string;
}

// Authentication Client
export class AuthClient {
  constructor(private config: SDKConfig) {}
  
  async signIn(email: string, password: string): Promise<AuthResult>;
  async signOut(): Promise<void>;
  async refreshToken(): Promise<string>;
  async getCurrentUser(): Promise<User | null>;
}

// GraphQL Client
export class GraphQLClient {
  constructor(private config: SDKConfig, private authClient: AuthClient) {}
  
  async query<T>(operation: string, variables?: Record<string, any>): Promise<T>;
  async mutate<T>(operation: string, variables?: Record<string, any>): Promise<T>;
}

// Main SDK Class
export class OrbSDK {
  public auth: AuthClient;
  public graphql: GraphQLClient;
  public permissions: PermissionChecker;
  
  constructor(config: SDKConfig) {
    this.auth = new AuthClient(config);
    this.graphql = new GraphQLClient(config, this.auth);
    this.permissions = new PermissionChecker(this.graphql);
  }
}
```



#### Python SDK Architecture

**Package Structure:**

```
packages/orb-sdk-python/
├── orb_sdk/
│   ├── __init__.py
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── auth_client.py
│   │   └── token_manager.py
│   ├── authorization/
│   │   ├── __init__.py
│   │   └── permission_checker.py
│   ├── graphql/
│   │   ├── __init__.py
│   │   ├── client.py
│   │   └── operations/
│   ├── errors/
│   │   ├── __init__.py
│   │   └── sdk_error.py
│   └── sdk.py
├── tests/
├── setup.py
└── README.md
```

**Core Classes:**

```python
# SDK Configuration
@dataclass
class SDKConfig:
    api_url: str
    region: str
    user_pool_id: str
    client_id: str

# Authentication Client
class AuthClient:
    def __init__(self, config: SDKConfig):
        self.config = config
    
    async def sign_in(self, email: str, password: str) -> AuthResult:
        """Authenticate user and return tokens"""
        pass
    
    async def sign_out(self) -> None:
        """Sign out current user"""
        pass
    
    async def refresh_token(self) -> str:
        """Refresh access token"""
        pass
    
    async def get_current_user(self) -> Optional[User]:
        """Get currently authenticated user"""
        pass

# GraphQL Client
class GraphQLClient:
    def __init__(self, config: SDKConfig, auth_client: AuthClient):
        self.config = config
        self.auth_client = auth_client
    
    async def query(self, operation: str, variables: Optional[Dict] = None) -> Dict:
        """Execute GraphQL query"""
        pass
    
    async def mutate(self, operation: str, variables: Optional[Dict] = None) -> Dict:
        """Execute GraphQL mutation"""
        pass

# Main SDK Class
class OrbSDK:
    def __init__(self, config: SDKConfig):
        self.auth = AuthClient(config)
        self.graphql = GraphQLClient(config, self.auth)
        self.permissions = PermissionChecker(self.graphql)
```



## Data Models

### Application Users Management Models

**ApplicationUserTableRow:**

```typescript
interface ApplicationUserTableRow {
  user: IUsers;
  roleAssignments: EnvironmentRoleAssignment[];
  lastActivity: string;
}
```

**EnvironmentRoleAssignment:**

```typescript
interface EnvironmentRoleAssignment {
  environmentId: string;
  environmentName: string;
  roleId: string;
  roleName: string;
}
```

**UserAssignment (for dialog):**

```typescript
interface UserAssignment {
  userId: string;
  environmentRoles: Array<{
    environmentId: string;
    roleId: string;
  }>;
}
```

**RoleUpdate (for dialog):**

```typescript
interface RoleUpdate {
  userId: string;
  environmentId: string;
  roleId: string;
}
```

### SDK Models

**TypeScript SDK Models:**

```typescript
export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
}

export interface User {
  userId: string;
  email: string;
  name: string;
  status: string;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

export interface GraphQLError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: string[];
}
```

**Python SDK Models:**

```python
@dataclass
class AuthResult:
    access_token: str
    refresh_token: str
    id_token: str
    expires_in: int

@dataclass
class User:
    user_id: str
    email: str
    name: str
    status: str

@dataclass
class GraphQLError:
    message: str
    locations: Optional[List[Dict[str, int]]] = None
    path: Optional[List[str]] = None

@dataclass
class GraphQLResponse:
    data: Optional[Dict] = None
    errors: Optional[List[GraphQLError]] = None
```



## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Phase 1: Application Users Management Properties

**Property 1: User list displays all assigned users**
*For any* application with assigned users, selecting the Users tab should display all users assigned to that application with their name, email, and role assignments per environment.
**Validates: Requirements 1.2, 1.3**

**Property 2: User assignment adds user to application**
*For any* user and application, assigning the user should result in the user appearing in the application's user list.
**Validates: Requirements 2.2**

**Property 3: User unassignment removes user from application**
*For any* assigned user and application, unassigning the user should result in the user no longer appearing in the application's user list.
**Validates: Requirements 2.4**

**Property 4: Role update changes user's environment role**
*For any* user, environment, and valid role, updating the role should result in the user having the new role for that environment.
**Validates: Requirements 3.2**

**Property 5: Invalid role assignment is rejected**
*For any* role that doesn't exist for an application, attempting to assign it should be rejected with an error.
**Validates: Requirements 3.5**

**Property 6: Operation notifications are displayed**
*For any* successful or failed operation (assign, unassign, role update), an appropriate notification should be displayed.
**Validates: Requirements 2.5, 2.6, 3.3, 3.4**



### Phase 2: UI Standards Compliance Properties

**Property 7: Last Activity formatting is relative**
*For any* timestamp, the formatLastActivity function should return a human-readable relative time string (e.g., "2 hours ago", "3 days ago").
**Validates: Requirements 4.3**

**Property 8: Last Activity column is sortable**
*For any* list with Last Activity column, sorting by that column should correctly order items by their update timestamps.
**Validates: Requirements 4.5**

**Property 9: Metadata timestamps are formatted**
*For any* timestamp in metadata sections, the formatDate function should return a human-readable absolute date/time string.
**Validates: Requirements 5.4**

**Property 10: UserPageComponent accepts required configurations**
*For any* valid page configuration (title, breadcrumbs, tabs), UserPageComponent should render correctly with that configuration.
**Validates: Requirements 6.5**

**Property 11: DataGridComponent supports core features**
*For any* data set, DataGridComponent should support sorting, filtering, and pagination operations.
**Validates: Requirements 7.4**

**Property 12: DataGridComponent renders custom templates**
*For any* custom column template, DataGridComponent should render it correctly for each row.
**Validates: Requirements 7.5**



### Phase 3: Quality Assurance & Polish Properties

**Property 13: Keyboard navigation moves focus correctly**
*For any* page, pressing Tab should move focus forward and Shift+Tab should move focus backward through interactive elements in logical order.
**Validates: Requirements 10.1, 10.2**

**Property 14: Keyboard activates buttons**
*For any* button, pressing Enter or Space should activate the button action.
**Validates: Requirements 10.3**

**Property 15: Escape closes dialogs**
*For any* open dialog, pressing Escape should close the dialog.
**Validates: Requirements 10.4**

**Property 16: Focus indicators are visible**
*For any* interactive element, when focused, a visible focus indicator should be present.
**Validates: Requirements 10.5**

**Property 17: No keyboard traps exist**
*For any* page or component, users should be able to navigate to and away from all elements using keyboard alone.
**Validates: Requirements 10.6**

**Property 18: ARIA labels exist for icon-only elements**
*For any* interactive element without visible text, an ARIA label should be present.
**Validates: Requirements 11.1**

**Property 19: Dynamic content updates are announced**
*For any* dynamic content update, ARIA live regions should announce the change to screen readers.
**Validates: Requirements 11.2**

**Property 20: Form errors are announced**
*For any* form validation error, the error should be announced to screen readers.
**Validates: Requirements 11.3**

**Property 21: Loading states are announced**
*For any* loading operation, the loading status should be announced to screen readers.
**Validates: Requirements 11.4**

**Property 22: Images have alt text**
*For any* informational image, descriptive alt text should be present.
**Validates: Requirements 11.5**

**Property 23: Semantic HTML is used**
*For any* page, proper semantic HTML elements (button, nav, main, etc.) should be used for structure.
**Validates: Requirements 11.6**

**Property 24: Dialog focus is managed**
*For any* dialog, focus should move to the first interactive element on open and return to the trigger element on close.
**Validates: Requirements 12.1, 12.2**

**Property 25: Page load sets initial focus**
*For any* page load, focus should be set to the main content area or first heading.
**Validates: Requirements 12.3**

**Property 26: Navigation changes are announced**
*For any* route navigation, the page change should be announced to screen readers.
**Validates: Requirements 12.4**

**Property 27: Modal focus is trapped**
*For any* modal dialog, focus should remain within the dialog until it is closed.
**Validates: Requirements 12.5**

**Property 28: Text contrast meets requirements**
*For any* text, the contrast ratio against its background should be at least 4.5:1 (or 3:1 for large text).
**Validates: Requirements 13.1, 13.2**

**Property 29: Interactive element contrast meets requirements**
*For any* interactive element, the contrast ratio against adjacent colors should be at least 3:1.
**Validates: Requirements 13.3**

**Property 30: Mobile layout is optimized**
*For any* page on screens smaller than 768px, the layout should be mobile-optimized with stacked columns and touch-friendly targets.
**Validates: Requirements 14.1, 14.2, 14.3**

**Property 31: Mobile navigation is collapsed**
*For any* page on mobile, secondary navigation should be hidden or collapsed into a menu.
**Validates: Requirements 14.4**

**Property 32: No horizontal scrolling on mobile**
*For any* page on mobile viewport, content should fit without horizontal scrolling.
**Validates: Requirements 14.5**

**Property 33: Mobile dialogs are appropriately sized**
*For any* dialog on mobile, it should be displayed full-screen or with appropriate margins, with all content visible without horizontal scrolling.
**Validates: Requirements 15.1, 15.2**

**Property 34: Mobile keyboard doesn't obscure content**
*For any* form field in a dialog on mobile, when the keyboard appears, the content should remain visible.
**Validates: Requirements 15.3**

**Property 35: Mobile close buttons are touch-friendly**
*For any* dialog on mobile, the close button should be easy to tap (minimum 44x44px).
**Validates: Requirements 15.4**

**Property 36: Mobile hamburger menu works**
*For any* mobile view, tapping the hamburger menu should display navigation options in a mobile-friendly format.
**Validates: Requirements 16.2**

**Property 37: Mobile navigation links are touch-friendly**
*For any* navigation link on mobile, the tap target should be at least 44x44px.
**Validates: Requirements 16.3**

**Property 38: Mobile navigation provides context**
*For any* page on mobile, breadcrumbs or back navigation should be provided for context.
**Validates: Requirements 16.4**

**Property 39: Mobile navigation doesn't obscure content**
*For any* page on mobile, navigation should not overlap or obscure important content.
**Validates: Requirements 16.5**

**Property 40: Error messages are displayed**
*For any* error (general, validation, network, authorization), an appropriate user-friendly error message should be displayed.
**Validates: Requirements 17.1, 17.2, 17.3, 17.4**

**Property 41: Loading states are displayed**
*For any* async operation (data fetch, form submission, page load), a loading indicator should be displayed.
**Validates: Requirements 18.1, 18.2, 18.3**

**Property 42: Duplicate submissions are prevented**
*For any* action in progress, duplicate submissions should be blocked.
**Validates: Requirements 18.4**

**Property 43: Notifications are displayed and dismissed**
*For any* action result (success or failure), a notification should be displayed and automatically dismissed after 5 seconds, or immediately when the close button is clicked.
**Validates: Requirements 19.1, 19.2, 19.3, 19.4**

**Property 44: Notifications don't obscure content**
*For any* notification, it should not block important content or actions.
**Validates: Requirements 19.5**

**Property 45: Lazy-loaded modules load on route access**
*For any* lazy-loaded route, the feature module should only be loaded when that route is accessed.
**Validates: Requirements 20.2**

**Property 46: Data caching works correctly**
*For any* cached data, subsequent requests within the cache duration should use the cached value instead of making new API calls.
**Validates: Requirements 22.2**

**Property 47: API calls are batched**
*For any* set of related API calls that can be batched, they should be combined into a single request.
**Validates: Requirements 22.3**

**Property 48: Pagination is used for large data sets**
*For any* data set exceeding the page size limit, pagination should be used to reduce payload size.
**Validates: Requirements 22.4**



### Phase 4: SDK Implementation Properties

**Property 49: SDK authentication returns tokens**
*For any* valid credentials, the SDK authentication module should return access, refresh, and ID tokens.
**Validates: Requirements 23.1, 24.1**

**Property 50: SDK authorization checks permissions correctly**
*For any* user and permission combination, the SDK authorization module should return the correct permission check result.
**Validates: Requirements 23.2, 24.2**

**Property 51: SDK executes GraphQL operations**
*For any* valid GraphQL query or mutation, the SDK GraphQL client should execute it and return the result.
**Validates: Requirements 23.3, 24.3**

**Property 52: SDK provides typed errors**
*For any* error during SDK operations, a typed error response (TypeScript) or exception (Python) should be returned.
**Validates: Requirements 23.4, 24.4**



## Error Handling

### Frontend Error Handling

**Error Categories:**

1. **GraphQL Errors**
   - Mutation failures
   - Query failures
   - Network errors
   - Authorization errors

2. **Validation Errors**
   - Form validation failures
   - Business rule violations
   - Data integrity errors

3. **UI Errors**
   - Component rendering errors
   - State management errors
   - Navigation errors

**Error Handling Strategy:**

```typescript
// Centralized error handling service
@Injectable({ providedIn: 'root' })
export class ErrorHandlingService {
  handleError(error: unknown, context: string): void {
    const message = this.getErrorMessage(error);
    console.error(`[${context}]`, error);
    this.notificationService.error(message);
  }
  
  getErrorMessage(error: unknown): string {
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    if (this.isGraphQLError(error)) return this.extractGraphQLError(error);
    return 'An unexpected error occurred';
  }
}
```

**Store Error Handling:**

```typescript
// Effects handle errors and dispatch failure actions
loadApplicationUsers$ = createEffect(() =>
  this.actions$.pipe(
    ofType(ApplicationUsersActions.loadApplicationUsers),
    switchMap(({ applicationId }) =>
      this.service.getApplicationUsers(applicationId).pipe(
        map(users => ApplicationUsersActions.loadApplicationUsersSuccess({ users })),
        catchError(error => {
          const message = this.errorService.getErrorMessage(error);
          return of(ApplicationUsersActions.loadApplicationUsersFailure({ error: message }));
        })
      )
    )
  )
);
```



### SDK Error Handling

**TypeScript SDK Errors:**

```typescript
export class SDKError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'SDKError';
  }
}

export class AuthenticationError extends SDKError {
  constructor(message: string, details?: unknown) {
    super(message, 'AUTHENTICATION_ERROR', details);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends SDKError {
  constructor(message: string, details?: unknown) {
    super(message, 'AUTHORIZATION_ERROR', details);
    this.name = 'AuthorizationError';
  }
}

export class GraphQLError extends SDKError {
  constructor(message: string, public errors: any[]) {
    super(message, 'GRAPHQL_ERROR', errors);
    this.name = 'GraphQLError';
  }
}
```

**Python SDK Errors:**

```python
class SDKError(Exception):
    """Base exception for SDK errors"""
    def __init__(self, message: str, code: str, details: Optional[Any] = None):
        super().__init__(message)
        self.code = code
        self.details = details

class AuthenticationError(SDKError):
    """Raised when authentication fails"""
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message, 'AUTHENTICATION_ERROR', details)

class AuthorizationError(SDKError):
    """Raised when authorization fails"""
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message, 'AUTHORIZATION_ERROR', details)

class GraphQLError(SDKError):
    """Raised when GraphQL operation fails"""
    def __init__(self, message: str, errors: List[Dict]):
        super().__init__(message, 'GRAPHQL_ERROR', errors)
        self.errors = errors
```



## Testing Strategy

### Dual Testing Approach

This project uses both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs
- Both are complementary and necessary for complete validation

### Unit Testing

**Focus Areas:**
- Specific examples demonstrating correct behavior
- Integration points between components
- Edge cases (empty states, boundary conditions)
- Error conditions (network failures, validation errors)

**Example Unit Tests:**

```typescript
describe('ApplicationUsersListComponent', () => {
  it('should display empty state when no users assigned', () => {
    // Specific example test
    component.users = [];
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state')).toBeTruthy();
  });
  
  it('should handle assignment error gracefully', () => {
    // Error condition test
    const error = 'User already assigned';
    component.onAssignError(error);
    expect(component.errorMessage).toBe(error);
  });
});
```

### Property-Based Testing

**Configuration:**
- Minimum 100 iterations per property test
- Each test references its design document property
- Tag format: **Feature: product-completion-phases, Property {number}: {property_text}**

**Property Test Examples:**

```typescript
describe('Property Tests: Application Users Management', () => {
  it('Property 2: User assignment adds user to application', () => {
    // Feature: product-completion-phases, Property 2: User assignment adds user to application
    fc.assert(
      fc.asyncProperty(
        fc.record({
          applicationId: fc.uuid(),
          userId: fc.uuid(),
          userName: fc.string(),
          userEmail: fc.emailAddress()
        }),
        async ({ applicationId, userId, userName, userEmail }) => {
          // Arrange: Create application and user
          const app = await createTestApplication(applicationId);
          const user = await createTestUser(userId, userName, userEmail);
          
          // Act: Assign user to application
          await assignUserToApplication(applicationId, userId);
          
          // Assert: User appears in application's user list
          const users = await getApplicationUsers(applicationId);
          expect(users.some(u => u.userId === userId)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```



### Accessibility Testing

**Automated Testing:**
- Use axe-core for automated accessibility audits
- Run on all pages and components
- Integrate into CI/CD pipeline

**Manual Testing:**
- Keyboard navigation testing
- Screen reader testing (NVDA, JAWS, VoiceOver)
- Color contrast verification
- Focus management verification

**Testing Tools:**
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<ApplicationUsersListComponent />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### Mobile Testing

**Responsive Testing:**
- Test on actual devices (iOS, Android)
- Test on browser device emulators
- Test at breakpoints: 320px, 768px, 1024px, 1440px

**Touch Testing:**
- Verify tap target sizes (minimum 44x44px)
- Test gesture interactions
- Verify keyboard behavior on mobile

### SDK Testing

**Unit Tests:**
- Test each SDK method with valid inputs
- Test error handling with invalid inputs
- Test token refresh logic
- Test GraphQL operation execution

**Integration Tests:**
- Test against live development environment
- Test authentication flow end-to-end
- Test GraphQL operations against real API
- Test error scenarios (network failures, auth failures)

**Example SDK Tests:**

```typescript
describe('OrbSDK', () => {
  let sdk: OrbSDK;
  
  beforeEach(() => {
    sdk = new OrbSDK({
      apiUrl: 'https://api-dev.orb.com',
      region: 'us-east-1',
      userPoolId: 'us-east-1_test',
      clientId: 'test-client-id'
    });
  });
  
  it('should authenticate with valid credentials', async () => {
    const result = await sdk.auth.signIn('test@example.com', 'password');
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });
  
  it('should execute GraphQL query', async () => {
    const query = `query { users { userId email } }`;
    const result = await sdk.graphql.query(query);
    expect(result.data).toBeDefined();
  });
});
```

### Performance Testing

**Metrics to Track:**
- Initial bundle size (target: < 500KB)
- Time to interactive (target: < 3s)
- First contentful paint (target: < 1.5s)
- API response times (target: < 500ms)

**Tools:**
- Lighthouse for performance audits
- webpack-bundle-analyzer for bundle analysis
- Chrome DevTools for performance profiling

