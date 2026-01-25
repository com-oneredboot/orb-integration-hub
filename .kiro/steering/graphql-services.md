---
inclusion: fileMatch
fileMatchPattern: "**/core/services/**,**/graphql/**,**/*.service.ts"
---
# GraphQL Service Standards

This file loads automatically when working with Angular services that use GraphQL.

## v0.19.0 Response Format

All GraphQL operations use the v0.19.0 response envelope format from orb-schema-generator:

```typescript
interface GraphQLResponseEnvelope<T> {
  code: number;      // HTTP-like status code (200, 400, 404, 500)
  success: boolean;  // Whether the operation succeeded
  message?: string;  // Error message on failure
  item?: T;          // Single item (mutations, Get queries)
  items?: T[];       // Array of items (List queries)
  nextToken?: string; // Pagination token (List queries)
}
```

## ApiService Base Class

All GraphQL services MUST extend `ApiService` and use these methods:

```typescript
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class MyService extends ApiService {
  // Use these methods for v0.19.0 format
}
```

### executeMutation<T>()

For create, update, delete operations. Returns the item directly.

```typescript
async createOrganization(input: OrganizationsCreateInput): Promise<IOrganizations> {
  return this.executeMutation<IOrganizations>(
    OrganizationsCreate,
    { input: toGraphQLInput(input) },
    'userPool'
  );
}
```

### executeGetQuery<T>()

For single-item retrieval. Returns item or null.

```typescript
async getOrganization(id: string): Promise<IOrganizations | null> {
  return this.executeGetQuery<IOrganizations>(
    OrganizationsGet,
    { input: { organizationId: id } },
    'userPool'
  );
}
```

### executeListQuery<T>()

For paginated lists. Returns Connection<T>.

```typescript
async getUserOrganizations(ownerId: string): Promise<Connection<IOrganizations>> {
  return this.executeListQuery<IOrganizations>(
    OrganizationsListByOwnerId,
    { input: { ownerId } },
    'userPool'
  );
}
```

## Connection Type

List queries return a Connection with items and pagination:

```typescript
interface Connection<T> {
  items: T[];
  nextToken: string | null;
}
```

## Error Handling

The base class automatically maps GraphQL errors to typed errors:

| Error Type | Condition | Class |
|------------|-----------|-------|
| Authentication | Unauthorized, Not Authorized | `AuthenticationError` |
| Network | Network, Connection, Timeout | `NetworkError` |
| Not Found | NotFound, "not found", "does not exist" | `NotFoundError` |
| Other | All other errors | `ApiError` |

### Using Error Type Guards

```typescript
import { isAuthenticationError, isNetFoundError } from '../errors/api-errors';

try {
  const org = await this.organizationService.getOrganization(id);
} catch (error) {
  if (isAuthenticationError(error)) {
    // Redirect to login
  } else if (isNotFoundError(error)) {
    // Show not found message
  } else {
    // Show generic error
  }
}
```

## Observable Pattern

Wrap async methods in Observables for Angular components:

```typescript
public getOrganization(id: string): Observable<IOrganizations | null> {
  return from(
    this.executeGetQuery<IOrganizations>(OrganizationsGet, { input: { organizationId: id } }, 'userPool')
  ).pipe(
    map(item => item ? new Organizations(item) : null),
    catchError(error => {
      console.error('[OrganizationService] Error:', error);
      if (isAuthenticationError(error)) {
        throw new Error('You are not authorized to view this organization.');
      }
      throw new Error('Failed to retrieve organization.');
    })
  );
}
```

## GraphQL Operation Naming (v0.19.0)

| Operation Type | Naming Pattern | Example |
|----------------|----------------|---------|
| Create | `{Entity}Create` | `OrganizationsCreate` |
| Update | `{Entity}Update` | `OrganizationsUpdate` |
| Delete | `{Entity}Delete` | `OrganizationsDelete` |
| Get (single) | `{Entity}Get` | `OrganizationsGet` |
| List (by key) | `{Entity}ListBy{Key}` | `OrganizationsListByOwnerId` |

**Note:** `QueryBy*` was renamed to `ListBy*` in v0.19.0.

## Timestamp Handling

GraphQL uses `AWSTimestamp` (Unix epoch seconds). Always convert:

```typescript
import { toGraphQLInput, fromGraphQLTimestamp } from '../../graphql-utils';

// Before mutation - convert Date to timestamp
const graphqlInput = toGraphQLInput(input as Record<string, unknown>);

// After query - convert timestamp to Date
const createdDate = fromGraphQLTimestamp(response.createdAt);
```

## Service Method Patterns

### Create Method

```typescript
public createOrganization(input: Partial<OrganizationsCreateInput>): Observable<IOrganizations> {
  const createInput: OrganizationsCreateInput = {
    organizationId: input.organizationId || crypto.randomUUID(),
    name: input.name || '',
    status: input.status || OrganizationStatus.Pending,
    createdAt: new Date(),
    updatedAt: new Date(),
    // ... other fields
  };

  const graphqlInput = toGraphQLInput(createInput as unknown as Record<string, unknown>);

  return from(
    this.executeMutation<IOrganizations>(OrganizationsCreate, { input: graphqlInput }, 'userPool')
  ).pipe(
    map(item => new Organizations(item)),
    catchError(this.handleServiceError('create organization'))
  );
}
```

### Update Method

```typescript
public updateOrganization(input: Partial<OrganizationsUpdateInput>): Observable<IOrganizations> {
  if (!input.organizationId) {
    throw new Error('Organization ID is required for updates');
  }

  const updateInput: OrganizationsUpdateInput = {
    ...input,
    updatedAt: new Date(),
  };

  const graphqlInput = toGraphQLInput(updateInput as unknown as Record<string, unknown>);

  return from(
    this.executeMutation<IOrganizations>(OrganizationsUpdate, { input: graphqlInput }, 'userPool')
  ).pipe(
    map(item => new Organizations(item)),
    catchError(this.handleServiceError('update organization'))
  );
}
```

### Delete Method

```typescript
public deleteOrganization(organizationId: string): Observable<IOrganizations> {
  if (!organizationId) {
    throw new Error('Organization ID is required for deletion');
  }

  return from(
    this.executeMutation<IOrganizations>(
      OrganizationsDelete,
      { input: { organizationId } },
      'userPool'
    )
  ).pipe(
    map(item => new Organizations(item)),
    catchError(this.handleServiceError('delete organization'))
  );
}
```

## NgRx Effects Pattern

Effects should handle the new response format directly:

```typescript
loadOrganizations$ = createEffect(() =>
  this.actions$.pipe(
    ofType(OrganizationsActions.loadOrganizations),
    withLatestFrom(this.store.select(selectCurrentUser)),
    filter(([, user]) => !!user?.userId),
    switchMap(([, user]) =>
      this.organizationService.getUserOrganizations(user!.userId).pipe(
        map(connection => 
          OrganizationsActions.loadOrganizationsSuccess({ 
            organizations: connection.items  // Direct access to items
          })
        ),
        catchError(error => 
          of(OrganizationsActions.loadOrganizationsFailure({ 
            error: error.message 
          }))
        )
      )
    )
  )
);
```

## DO NOT

- ❌ Use legacy wrapper types (`StatusCode`, `Message`, `Data`)
- ❌ Re-fetch data after mutations (use the returned item)
- ❌ Create custom response types that don't match GraphQL schema
- ❌ Use `QueryBy*` operations (renamed to `ListBy*` in v0.19.0)
- ❌ Skip error handling in service methods

## DO

- ✅ Extend `ApiService` for all GraphQL services
- ✅ Use `executeMutation`, `executeGetQuery`, `executeListQuery`
- ✅ Return items directly (not wrapped in custom types)
- ✅ Use typed error classes for error handling
- ✅ Convert timestamps with `toGraphQLInput`/`fromGraphQLTimestamp`
- ✅ Wrap async methods in Observables for Angular

## Reference Implementation

See `apps/web/src/app/core/services/organization.service.ts` for a complete example.

## Related Documentation

- Design: `.kiro/specs/graphql-service-cleanup/design.md`
- Error Types: `apps/web/src/app/core/errors/api-errors.ts`
- GraphQL Types: `apps/web/src/app/core/types/graphql.types.ts`
