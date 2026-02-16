# Design Document: Application Users Management

## Overview

The Application Users Management feature provides a comprehensive interface for viewing and managing end users who have roles in customer applications. This design removes the redundant ApplicationUsers table, updates the ApplicationUserRoles schema to support Lambda-backed queries, implements a custom GetApplicationUsers Lambda function with filtering capabilities, and creates a frontend component for displaying application users with their environment-specific roles.

### Key Design Decisions

1. **Single Source of Truth**: ApplicationUserRoles table is the sole source for application user membership, eliminating redundancy with ApplicationUsers table
2. **Lambda-Backed Queries**: Custom Lambda function enables complex filtering logic that cannot be expressed through standard DynamoDB queries
3. **Denormalization**: Store organizationName and applicationName in ApplicationUserRoles to avoid additional lookups during queries
4. **PII Protection**: List view excludes email addresses and other PII, deferring detailed PII access controls to future work
5. **Filter Validation**: Environment filter requires organizationIds or applicationIds to prevent overly broad queries
6. **User Deduplication**: Lambda groups role assignments by userId to present a unified view of each user's access

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Angular)                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  ApplicationUsersListComponent                             │ │
│  │  - Filter controls (org, app, env)                         │ │
│  │  - User table (userId, name, roles, environments)          │ │
│  │  - Expandable rows for role details                        │ │
│  │  - Pagination controls                                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              │ GraphQL Query                     │
│                              ▼                                   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                      AWS AppSync API                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  GetApplicationUsers Query                                 │ │
│  │  - Auth: CUSTOMER, EMPLOYEE, OWNER                         │ │
│  │  - Input: organizationIds, applicationIds, environment     │ │
│  │  - Output: UserWithRoles[]                                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              │ Lambda Invoke                     │
│                              ▼                                   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│              GetApplicationUsers Lambda Function                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  1. Validate input filters                                 │ │
│  │  2. Apply authorization (filter by owned orgs for CUSTOMER)│ │
│  │  3. Query ApplicationUserRoles with appropriate GSI        │ │
│  │  4. Deduplicate by userId                                  │ │
│  │  5. Batch get from Users table for enrichment              │ │
│  │  6. Group role assignments by user                         │ │
│  │  7. Sort by user name                                      │ │
│  │  8. Apply pagination                                       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              │ DynamoDB Queries                  │
│                              ▼                                   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                         DynamoDB Tables                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  ApplicationUserRoles                                      │ │
│  │  - Primary: applicationUserRoleId                          │ │
│  │  - GSI: AppEnvUserIndex (applicationId, environment)       │ │
│  │  - GSI: UserAppIndex (userId, applicationId)               │ │
│  │  - GSI: UserEnvRoleIndex (userId, environment)             │ │
│  │  - GSI: UserStatusIndex (userId, status)                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Users                                                     │ │
│  │  - Primary: userId                                         │ │
│  │  - Attributes: firstName, lastName, status                 │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Interaction**: User selects filters (organization, application, environment) in the frontend
2. **GraphQL Query**: Frontend sends GetApplicationUsers query to AppSync with filter parameters
3. **Authentication**: AppSync validates Cognito token and checks user groups (CUSTOMER, EMPLOYEE, OWNER)
4. **Lambda Invocation**: AppSync invokes GetApplicationUsers Lambda with query parameters
5. **Authorization**: Lambda applies authorization rules (CUSTOMER sees only owned orgs, EMPLOYEE/OWNER see all)
6. **Query Strategy Selection**: Lambda selects appropriate GSI based on provided filters
7. **DynamoDB Query**: Lambda queries ApplicationUserRoles using selected GSI
8. **User Enrichment**: Lambda batch gets user details from Users table
9. **Deduplication**: Lambda groups role assignments by userId
10. **Response**: Lambda returns enriched user data with all role assignments
11. **Display**: Frontend renders user list with expandable role details

## Components and Interfaces

### Backend Components

#### GetApplicationUsers Lambda Function

**Purpose**: Query application users with filtering and enrichment

**Input Interface**:
```typescript
interface GetApplicationUsersInput {
  organizationIds?: string[];  // Optional: filter by organizations
  applicationIds?: string[];   // Optional: filter by applications
  environment?: Environment;   // Optional: filter by environment (requires org or app filter)
  limit?: number;              // Optional: pagination limit (default: 50, max: 100)
  nextToken?: string;          // Optional: pagination token
}
```

**Output Interface**:
```typescript
interface GetApplicationUsersOutput {
  users: UserWithRoles[];
  nextToken?: string;
}

interface UserWithRoles {
  userId: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  roleAssignments: RoleAssignment[];
}

interface RoleAssignment {
  applicationUserRoleId: string;
  applicationId: string;
  applicationName: string;
  organizationId: string;
  organizationName: string;
  environment: Environment;
  roleId: string;
  roleName: string;
  permissions: string[];
  status: ApplicationUserRoleStatus;
  createdAt: number;
  updatedAt: number;
}
```

**Query Strategy Logic**:
```python
def select_query_strategy(input: GetApplicationUsersInput) -> QueryStrategy:
    """
    Select the most efficient GSI based on provided filters.
    
    Priority:
    1. AppEnvUserIndex: When applicationIds provided (most selective)
    2. UserAppIndex: When only organizationIds provided (requires join with Applications)
    3. Scan: When no filters provided (least efficient, requires authorization filtering)
    """
    if input.applicationIds:
        # Use AppEnvUserIndex GSI
        # Query: applicationId IN applicationIds
        # Filter: environment = input.environment (if provided)
        return QueryStrategy.APP_ENV_USER_INDEX
    
    elif input.organizationIds:
        # First, get applicationIds for these organizations
        # Then use AppEnvUserIndex GSI
        return QueryStrategy.ORG_TO_APP_TO_ROLES
    
    else:
        # No filters - must scan with authorization filtering
        # For CUSTOMER: get owned organizationIds first
        # For EMPLOYEE/OWNER: scan all
        return QueryStrategy.SCAN_WITH_AUTH
```

**Authorization Logic**:
```python
def apply_authorization(caller_groups: List[str], caller_user_id: str, 
                       input: GetApplicationUsersInput) -> GetApplicationUsersInput:
    """
    Apply authorization rules based on caller's Cognito groups.
    
    - CUSTOMER: Can only see users in organizations they own
    - EMPLOYEE/OWNER: Can see all users
    """
    if "CUSTOMER" in caller_groups and "EMPLOYEE" not in caller_groups and "OWNER" not in caller_groups:
        # Get organizations owned by this customer
        owned_org_ids = get_owned_organization_ids(caller_user_id)
        
        # If organizationIds filter provided, intersect with owned orgs
        if input.organizationIds:
            input.organizationIds = list(set(input.organizationIds) & set(owned_org_ids))
        else:
            input.organizationIds = owned_org_ids
    
    return input
```

**Validation Logic**:
```python
def validate_input(input: GetApplicationUsersInput) -> None:
    """
    Validate input parameters.
    
    Rules:
    - environment filter requires organizationIds or applicationIds
    - limit must be between 1 and 100
    """
    if input.environment and not input.organizationIds and not input.applicationIds:
        raise ValidationError(
            "Environment filter requires organizationIds or applicationIds to be provided"
        )
    
    if input.limit and (input.limit < 1 or input.limit > 100):
        raise ValidationError("Limit must be between 1 and 100")
```

#### ApplicationUserRoles Schema Updates

**Schema Changes**:
```yaml
# schemas/tables/ApplicationUserRoles.yml
type: lambda-dynamodb  # Changed from: dynamodb
pitr_enabled: false
version: '1.1'  # Bumped version
name: ApplicationUserRoles
targets:
  - api
model:
  authConfig:
    cognitoAuthentication:
      groups:
        OWNER:
          - '*'
        EMPLOYEE:
          - '*'
        CUSTOMER:
          - '*'
  keys:
    primary:
      partition: applicationUserRoleId
      description: Primary key for user-role assignments
    secondary:
      - name: UserEnvRoleIndex
        type: GSI
        partition: userId
        sort: environment
        projection_type: ALL
      - name: AppEnvUserIndex
        type: GSI
        partition: applicationId
        sort: environment
        projection_type: ALL
      - name: UserAppIndex
        type: GSI
        partition: userId
        sort: applicationId
        projection_type: ALL
      - name: UserStatusIndex
        type: GSI
        partition: userId
        sort: status
        projection_type: ALL
  attributes:
    applicationUserRoleId:
      type: string
      required: true
    userId:
      type: string
      required: true
    applicationId:
      type: string
      required: true
    organizationId:
      type: string
      required: true
      description: Organization ID (denormalized for filtering)
    organizationName:
      type: string
      required: true
      description: Organization name (denormalized for display)
    applicationName:
      type: string
      required: true
      description: Application name (denormalized for display)
    environment:
      type: string
      required: true
      enum_type: Environment
      enum_values:
        - PRODUCTION
        - STAGING
        - DEVELOPMENT
        - TEST
        - PREVIEW
    roleId:
      type: string
      required: true
    roleName:
      type: string
      required: true
    permissions:
      type: array
      items:
        type: string
      required: true
    status:
      type: string
      required: true
      enum_type: ApplicationUserRoleStatus
      enum_values:
        - ACTIVE
        - DELETED
    createdAt:
      type: timestamp
      required: true
    updatedAt:
      type: timestamp
      required: true
```

### Frontend Components

#### ApplicationUsersListComponent

**Purpose**: Display application users with filtering and role details

**Component Structure**:
```typescript
@Component({
  selector: 'app-application-users-list',
  templateUrl: './application-users-list.component.html',
  styleUrls: ['./application-users-list.component.scss']
})
export class ApplicationUsersListComponent implements OnInit {
  // State
  users: UserWithRoles[] = [];
  loading = false;
  error: string | null = null;
  
  // Filters
  selectedOrganizationIds: string[] = [];
  selectedApplicationIds: string[] = [];
  selectedEnvironment: Environment | null = null;
  
  // Pagination
  currentPage = 1;
  pageSize = 50;
  nextToken: string | null = null;
  
  // Expansion state
  expandedUserIds = new Set<string>();
  
  constructor(
    private apollo: Apollo,
    private route: ActivatedRoute
  ) {}
  
  ngOnInit(): void {
    // Initialize filters from route params
    this.initializeFiltersFromRoute();
    
    // Load users
    this.loadUsers();
  }
  
  initializeFiltersFromRoute(): void {
    // /customers/users - no filters
    // /customers/applications/:appId/users - filter by appId
    // /customers/applications/:appId/environments/:env/users - filter by appId + env
    const appId = this.route.snapshot.paramMap.get('appId');
    const env = this.route.snapshot.paramMap.get('env');
    
    if (appId) {
      this.selectedApplicationIds = [appId];
    }
    if (env) {
      this.selectedEnvironment = env as Environment;
    }
  }
  
  loadUsers(): void {
    this.loading = true;
    this.error = null;
    
    this.apollo.query<GetApplicationUsersResponse>({
      query: GET_APPLICATION_USERS,
      variables: {
        input: {
          organizationIds: this.selectedOrganizationIds.length > 0 
            ? this.selectedOrganizationIds 
            : undefined,
          applicationIds: this.selectedApplicationIds.length > 0 
            ? this.selectedApplicationIds 
            : undefined,
          environment: this.selectedEnvironment || undefined,
          limit: this.pageSize,
          nextToken: this.nextToken || undefined
        }
      }
    }).subscribe({
      next: (result) => {
        this.users = result.data.GetApplicationUsers.users;
        this.nextToken = result.data.GetApplicationUsers.nextToken || null;
        this.loading = false;
      },
      error: (error) => {
        this.error = error.message;
        this.loading = false;
      }
    });
  }
  
  onFilterChange(): void {
    // Reset pagination
    this.currentPage = 1;
    this.nextToken = null;
    
    // Reload users
    this.loadUsers();
  }
  
  toggleUserExpansion(userId: string): void {
    if (this.expandedUserIds.has(userId)) {
      this.expandedUserIds.delete(userId);
    } else {
      this.expandedUserIds.add(userId);
    }
  }
  
  isUserExpanded(userId: string): boolean {
    return this.expandedUserIds.has(userId);
  }
  
  getEnvironmentsForUser(user: UserWithRoles): string[] {
    const envs = new Set(user.roleAssignments.map(ra => ra.environment));
    return Array.from(envs).sort();
  }
  
  getRoleCountForUser(user: UserWithRoles): number {
    return user.roleAssignments.length;
  }
  
  nextPage(): void {
    if (this.nextToken) {
      this.currentPage++;
      this.loadUsers();
    }
  }
  
  previousPage(): void {
    // Note: DynamoDB pagination doesn't support going backwards
    // This would require caching previous page tokens
    // For MVP, we'll disable previous button
  }
}
```

**GraphQL Query**:
```typescript
const GET_APPLICATION_USERS = gql`
  query GetApplicationUsers($input: GetApplicationUsersInput!) {
    GetApplicationUsers(input: $input) {
      users {
        userId
        firstName
        lastName
        status
        roleAssignments {
          applicationUserRoleId
          applicationId
          applicationName
          organizationId
          organizationName
          environment
          roleId
          roleName
          permissions
          status
          createdAt
          updatedAt
        }
      }
      nextToken
    }
  }
`;
```

**Template Structure**:
```html
<div class="application-users-list">
  <!-- Filters -->
  <div class="filters">
    <mat-form-field>
      <mat-label>Organization</mat-label>
      <mat-select [(ngModel)]="selectedOrganizationIds" 
                  (selectionChange)="onFilterChange()" 
                  multiple>
        <mat-option *ngFor="let org of organizations" [value]="org.organizationId">
          {{ org.name }}
        </mat-option>
      </mat-select>
    </mat-form-field>
    
    <mat-form-field>
      <mat-label>Application</mat-label>
      <mat-select [(ngModel)]="selectedApplicationIds" 
                  (selectionChange)="onFilterChange()" 
                  multiple>
        <mat-option *ngFor="let app of applications" [value]="app.applicationId">
          {{ app.name }}
        </mat-option>
      </mat-select>
    </mat-form-field>
    
    <mat-form-field>
      <mat-label>Environment</mat-label>
      <mat-select [(ngModel)]="selectedEnvironment" 
                  (selectionChange)="onFilterChange()">
        <mat-option [value]="null">All</mat-option>
        <mat-option value="PRODUCTION">Production</mat-option>
        <mat-option value="STAGING">Staging</mat-option>
        <mat-option value="DEVELOPMENT">Development</mat-option>
        <mat-option value="TEST">Test</mat-option>
        <mat-option value="PREVIEW">Preview</mat-option>
      </mat-select>
    </mat-form-field>
  </div>
  
  <!-- Loading State -->
  <mat-spinner *ngIf="loading"></mat-spinner>
  
  <!-- Error State -->
  <mat-error *ngIf="error">{{ error }}</mat-error>
  
  <!-- Users Table -->
  <table mat-table [dataSource]="users" *ngIf="!loading && !error">
    <!-- User ID Column -->
    <ng-container matColumnDef="userId">
      <th mat-header-cell *matHeaderCellDef>User ID</th>
      <td mat-cell *matCellDef="let user">{{ user.userId }}</td>
    </ng-container>
    
    <!-- Name Column -->
    <ng-container matColumnDef="name">
      <th mat-header-cell *matHeaderCellDef>Name</th>
      <td mat-cell *matCellDef="let user">
        {{ user.firstName }} {{ user.lastName }}
      </td>
    </ng-container>
    
    <!-- Roles Count Column -->
    <ng-container matColumnDef="rolesCount">
      <th mat-header-cell *matHeaderCellDef>Roles</th>
      <td mat-cell *matCellDef="let user">
        {{ getRoleCountForUser(user) }}
      </td>
    </ng-container>
    
    <!-- Environments Column -->
    <ng-container matColumnDef="environments">
      <th mat-header-cell *matHeaderCellDef>Environments</th>
      <td mat-cell *matCellDef="let user">
        {{ getEnvironmentsForUser(user).join(', ') }}
      </td>
    </ng-container>
    
    <!-- Expand Column -->
    <ng-container matColumnDef="expand">
      <th mat-header-cell *matHeaderCellDef></th>
      <td mat-cell *matCellDef="let user">
        <button mat-icon-button (click)="toggleUserExpansion(user.userId)">
          <mat-icon>{{ isUserExpanded(user.userId) ? 'expand_less' : 'expand_more' }}</mat-icon>
        </button>
      </td>
    </ng-container>
    
    <!-- Expanded Row -->
    <ng-container matColumnDef="expandedDetail">
      <td mat-cell *matCellDef="let user" [attr.colspan]="5">
        <div class="user-detail" *ngIf="isUserExpanded(user.userId)">
          <h3>Role Assignments</h3>
          <div *ngFor="let assignment of user.roleAssignments" class="role-assignment">
            <div class="assignment-header">
              <strong>{{ assignment.roleName }}</strong> in 
              <strong>{{ assignment.applicationName }}</strong> 
              ({{ assignment.environment }})
            </div>
            <div class="assignment-details">
              <div>Organization: {{ assignment.organizationName }}</div>
              <div>Status: {{ assignment.status }}</div>
              <div>Permissions: {{ assignment.permissions.join(', ') }}</div>
              <div>Created: {{ assignment.createdAt | date }}</div>
            </div>
          </div>
        </div>
      </td>
    </ng-container>
    
    <tr mat-header-row *matHeaderRowDef="['userId', 'name', 'rolesCount', 'environments', 'expand']"></tr>
    <tr mat-row *matRowDef="let row; columns: ['userId', 'name', 'rolesCount', 'environments', 'expand']"></tr>
    <tr mat-row *matRowDef="let row; columns: ['expandedDetail']" class="detail-row"></tr>
  </table>
  
  <!-- Empty State -->
  <div class="empty-state" *ngIf="!loading && !error && users.length === 0">
    <p>No users found matching the selected filters.</p>
  </div>
  
  <!-- Pagination -->
  <div class="pagination" *ngIf="!loading && !error && users.length > 0">
    <button mat-button [disabled]="true">Previous</button>
    <span>Page {{ currentPage }}</span>
    <button mat-button [disabled]="!nextToken" (click)="nextPage()">Next</button>
  </div>
</div>
```

## Data Models

### ApplicationUserRoles Table (Updated)

**Changes from Current Schema**:
1. Added `type: lambda-dynamodb` to enable Lambda-backed queries
2. Added `organizationId` attribute for filtering
3. Added `organizationName` attribute for display (denormalized)
4. Added `applicationName` attribute for display (denormalized)
5. Bumped version to 1.1

**Denormalization Rationale**:
- Storing organizationId, organizationName, and applicationName in ApplicationUserRoles avoids additional lookups during queries
- Trade-off: Slight increase in storage and update complexity for significant query performance improvement
- Update strategy: When organization or application name changes, update all related ApplicationUserRoles records (can be done asynchronously)

### Users Table (No Changes)

The Users table remains unchanged. It is queried via batch get to enrich user details after querying ApplicationUserRoles.

### ApplicationUsers Table (Removed)

The ApplicationUsers table is completely removed from the schema. All references in code, documentation, and infrastructure are deleted.

**Migration Strategy**:
- No data migration needed (ApplicationUserRoles already contains all necessary data)
- Remove schema file: `schemas/tables/ApplicationUsers.yml`
- Regenerate code: `pipenv run orb-schema generate`
- Remove generated files for ApplicationUsers
- Update documentation to remove ApplicationUsers references


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following testable properties. During reflection, I consolidated related properties to avoid redundancy:

**Consolidated Properties:**
- Properties 3.2 and 3.3 (organizationIds and applicationIds filtering) can be combined into a single property about filter application
- Properties 3.8, 3.10, and 3.12 (deduplication, grouping, sorting) are all output invariants that can be tested together
- Properties 6.3 and 6.4 (CUSTOMER vs EMPLOYEE/OWNER authorization) can be combined into a single authorization property

### Lambda Function Properties

**Property 1: Input Validation**

*For any* GetApplicationUsers input, if environment filter is provided without organizationIds or applicationIds, then the Lambda SHALL return a validation error

**Validates: Requirements 3.1, 3.4**

**Property 2: Filter Application**

*For any* set of filters (organizationIds, applicationIds, environment), all returned users SHALL have at least one role assignment matching ALL provided filters (AND logic)

**Validates: Requirements 3.2, 3.3, 3.5, 3.6**

**Property 3: Authorization Filtering**

*For any* CUSTOMER caller, all returned users SHALL only have role assignments in organizations owned by that customer. *For any* EMPLOYEE or OWNER caller, users from all organizations MAY be returned.

**Validates: Requirements 6.3, 6.4**

**Property 4: User Deduplication and Grouping**

*For any* query result, each userId SHALL appear exactly once, with all role assignments for that user grouped together under that single user record

**Validates: Requirements 3.8, 3.10**

**Property 5: User Enrichment**

*For any* returned user, the user record SHALL contain firstName and lastName fields populated from the Users table

**Validates: Requirements 3.9**

**Property 6: Result Sorting**

*For any* query result with multiple users, the users SHALL be sorted by lastName then firstName in ascending order

**Validates: Requirements 3.12**

**Property 7: Pagination Limit**

*For any* query with a limit parameter, the number of returned users SHALL be less than or equal to the specified limit

**Validates: Requirements 3.11**

**Property 8: Error Handling**

*For any* query that encounters an error (validation, authorization, database), the Lambda SHALL return a structured error response with an appropriate error code and descriptive message

**Validates: Requirements 3.13**

**Property 9: No Filters Returns All Accessible**

*For any* query with no filters provided, the Lambda SHALL return all users with role assignments in organizations accessible to the caller (based on authorization rules)

**Validates: Requirements 3.7**

### Frontend Properties

**Property 10: PII Exclusion**

*For any* rendered user list, the displayed content SHALL NOT contain email addresses or other personally identifiable information

**Validates: Requirements 4.2**

**Property 11: Route-Based Filter Application**

*For any* route with parameters (appId, env), the component SHALL automatically apply filters matching those route parameters to the query

**Validates: Requirements 5.4**

### Schema Properties

**Property 12: Lambda-DynamoDB Type**

The ApplicationUserRoles schema SHALL specify type as "lambda-dynamodb"

**Validates: Requirements 2.1**

**Property 13: Required Denormalized Fields**

The ApplicationUserRoles schema SHALL include organizationId, organizationName, and applicationName as required attributes

**Validates: Requirements 2.3, 2.4, 2.5**

**Property 14: GSI Preservation**

The ApplicationUserRoles schema SHALL maintain all four GSI indexes: UserEnvRoleIndex, AppEnvUserIndex, UserAppIndex, UserStatusIndex

**Validates: Requirements 2.2**

## Error Handling

### Validation Errors

| Error Code | Condition | Message | HTTP Status |
|------------|-----------|---------|-------------|
| ORB-VAL-001 | Environment filter without org/app filter | "Environment filter requires organizationIds or applicationIds to be provided" | 400 |
| ORB-VAL-002 | Invalid limit value | "Limit must be between 1 and 100" | 400 |
| ORB-VAL-003 | Invalid environment value | "Invalid environment value. Must be one of: PRODUCTION, STAGING, DEVELOPMENT, TEST, PREVIEW" | 400 |

### Authorization Errors

| Error Code | Condition | Message | HTTP Status |
|------------|-----------|---------|-------------|
| ORB-AUTH-001 | No authentication token | "Authentication required" | 401 |
| ORB-AUTH-002 | Invalid token | "Invalid authentication token" | 401 |
| ORB-AUTH-003 | Insufficient permissions | "Insufficient permissions to access this resource" | 403 |

### Database Errors

| Error Code | Condition | Message | HTTP Status |
|------------|-----------|---------|-------------|
| ORB-DB-001 | DynamoDB query failure | "Database query failed. Please try again." | 500 |
| ORB-DB-002 | DynamoDB batch get failure | "Failed to retrieve user details. Please try again." | 500 |

### Error Response Format

```typescript
interface ErrorResponse {
  errorCode: string;
  message: string;
  details?: Record<string, any>;
  timestamp: number;
}
```

### Error Handling Strategy

1. **Validation Errors**: Caught early in Lambda execution, return 400 with specific error code
2. **Authorization Errors**: Caught after authentication check, return 401/403 with error code
3. **Database Errors**: Caught during query execution, return 500 with generic message (don't expose internal details)
4. **Logging**: All errors logged to CloudWatch with full context for debugging
5. **Retry Logic**: Frontend implements exponential backoff for 500 errors

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs
- Both are complementary and necessary

### Property-Based Testing

**Library**: Use `hypothesis` for Python Lambda tests, `fast-check` for TypeScript frontend tests

**Configuration**: Each property test MUST run minimum 100 iterations

**Test Tagging**: Each property test MUST reference its design document property:
```python
# Feature: application-users-management, Property 2: Filter Application
def test_filter_application_property():
    ...
```

### Unit Testing Balance

Unit tests should focus on:
- Specific examples that demonstrate correct behavior (e.g., querying with specific organizationIds)
- Integration points between Lambda and DynamoDB
- Edge cases (empty results, single user, maximum pagination)
- Error conditions (invalid input, database failures)

Avoid writing too many unit tests for scenarios covered by property tests. Property tests handle comprehensive input coverage through randomization.

### Test Coverage Requirements

**Lambda Function Tests**:
- Property tests for all 9 Lambda properties (Properties 1-9)
- Unit tests for:
  - Query strategy selection logic
  - Authorization logic with different Cognito groups
  - User enrichment with missing Users table records
  - Pagination edge cases (first page, last page, single item)
  - Error handling for each error code

**Frontend Component Tests**:
- Property test for PII exclusion (Property 10)
- Property test for route-based filtering (Property 11)
- Unit tests for:
  - Filter change triggers query refresh
  - User row expansion/collapse
  - Empty state display
  - Loading state display
  - Pagination controls

**Schema Tests**:
- Unit tests for Properties 12-14 (schema validation)
- Verify generated GraphQL schema includes GetApplicationUsers query
- Verify generated Lambda resolver configuration

### Integration Tests

- End-to-end test: Create role assignments → Query via GraphQL → Verify results in frontend
- Authorization test: Query as CUSTOMER → Verify only owned orgs returned
- Multi-filter test: Apply org + app + env filters → Verify correct results
- Pagination test: Query large dataset → Verify pagination works across pages

### Test Data Generation

For property-based tests, generate:
- Random userIds, applicationIds, organizationIds
- Random role assignments with varying environments
- Random filter combinations
- Random Cognito groups for authorization testing
- Random pagination limits and tokens

### Performance Testing

While not part of unit/property tests, consider:
- Query performance with large datasets (10k+ role assignments)
- Frontend rendering performance with 100+ users
- Pagination performance with deep pages
