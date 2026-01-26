# Design Document

## Overview

This design standardizes GraphQL service implementations across the frontend application. The goal is to eliminate workarounds, ensure type-safe response handling, and establish DRY patterns that all services follow.

### Dependencies

- **orb-schema-generator #78**: ✅ FIXED in v0.19.0 - GraphQL schema now has correct response types
- **orb-schema-generator #79**: ✅ FIXED in v0.19.1 - TypeScript query generator updated for v0.19.1 format

### Status

The upstream fixes in orb-schema-generator v0.19.1 provide:
- Standard response envelope (`code`, `success`, `message`)
- Mutations return `item` (singular) instead of `items` array
- List queries return `items` (plural) with `nextToken`
- New `Get` operation for single-item retrieval
- Operation naming: `QueryBy*` → `ListBy*`
- TypeScript, Python, and Dart GraphQL query generators all updated

## Architecture

### Current State (Problems)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Component      │────▶│  Service         │────▶│  GraphQL API    │
│                 │     │  (workarounds)   │     │  (wrong schema) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │
                              ▼
                        Re-fetch after
                        every mutation
```

**Problems:**
1. ~~GraphQL schema says mutations return `{ items, nextToken }` but VTL returns item directly~~ ✅ Fixed in v0.19.0
2. Services have workaround code to handle both formats
3. Services ignore mutation responses and re-fetch data
4. Custom wrapper types (`StatusCode`, `Message`, `Data`) don't match GraphQL

### Target State

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Component      │────▶│  Service         │────▶│  GraphQL API    │
│                 │     │  (extends Base)  │     │  (v0.19.0)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │
                              ▼
                        Uses response
                        envelope directly
```

**Benefits:**
1. GraphQL schema matches VTL responses (v0.19.0)
2. Services use base class for common patterns
3. Mutation responses used directly (no re-fetch)
4. TypeScript types match GraphQL schema exactly
5. Standard response envelope for consistent error handling

## Components and Interfaces

### ApiService Base Class (Enhanced)

```typescript
// apps/web/src/app/core/services/api.service.ts

/**
 * Response envelope from v0.19.0 GraphQL schema
 */
interface GraphQLResponseEnvelope<T> {
  code: number;
  success: boolean;
  message?: string;
  item?: T;
  items?: T[];
  nextToken?: string;
}

@Injectable({ providedIn: 'root' })
export abstract class ApiService {
  
  /**
   * Execute a GraphQL mutation and return the item directly
   * v0.19.0 mutations return: { code, success, message, item }
   */
  protected async executeMutation<T>(
    mutation: string,
    variables: Record<string, unknown>,
    authMode: AuthMode = 'userPool'
  ): Promise<T> {
    const response = await this.mutate<GraphQLResponseEnvelope<T>>(mutation, variables, authMode);
    
    if (response.errors?.length) {
      throw this.handleGraphQLError(response.errors[0]);
    }
    
    if (!response.data) {
      throw new ApiError('No data in mutation response', 'NO_DATA');
    }
    
    // Extract the mutation result (first key in data object)
    const mutationName = Object.keys(response.data)[0];
    const envelope = response.data[mutationName] as GraphQLResponseEnvelope<T>;
    
    // Check envelope success field
    if (!envelope.success) {
      throw new ApiError(envelope.message || 'Mutation failed', `HTTP_${envelope.code}`);
    }
    
    if (!envelope.item) {
      throw new ApiError('No item in mutation response', 'NO_ITEM');
    }
    
    return envelope.item;
  }
  
  /**
   * Execute a GraphQL Get query for a single item
   * v0.19.0 Get queries return: { code, success, message, item }
   */
  protected async executeGetQuery<T>(
    query: string,
    variables: Record<string, unknown>,
    authMode: AuthMode = 'userPool'
  ): Promise<T | null> {
    const response = await this.query<GraphQLResponseEnvelope<T>>(query, variables, authMode);
    
    if (response.errors?.length) {
      throw this.handleGraphQLError(response.errors[0]);
    }
    
    if (!response.data) {
      return null;
    }
    
    const queryName = Object.keys(response.data)[0];
    const envelope = response.data[queryName] as GraphQLResponseEnvelope<T>;
    
    // Check envelope success field
    if (!envelope.success) {
      throw new ApiError(envelope.message || 'Query failed', `HTTP_${envelope.code}`);
    }
    
    return envelope.item ?? null;
  }
  
  /**
   * Execute a GraphQL List query (connection pattern)
   * v0.19.0 List queries return: { code, success, message, items, nextToken }
   */
  protected async executeListQuery<T>(
    query: string,
    variables: Record<string, unknown>,
    authMode: AuthMode = 'userPool'
  ): Promise<Connection<T>> {
    const response = await this.query<GraphQLResponseEnvelope<T>>(query, variables, authMode);
    
    if (response.errors?.length) {
      throw this.handleGraphQLError(response.errors[0]);
    }
    
    const queryName = Object.keys(response.data || {})[0];
    const envelope = response.data?.[queryName] as GraphQLResponseEnvelope<T>;
    
    // Check envelope success field
    if (envelope && !envelope.success) {
      throw new ApiError(envelope.message || 'Query failed', `HTTP_${envelope.code}`);
    }
    
    return {
      items: envelope?.items ?? [],
      nextToken: envelope?.nextToken ?? null
    };
  }
  
  /**
   * Convert GraphQL errors to typed ApiError
   */
  protected handleGraphQLError(error: GraphQLError): ApiError {
    const message = error.message || 'Unknown GraphQL error';
    const errorType = error.errorType || 'UNKNOWN';
    
    if (errorType.includes('Unauthorized') || message.includes('Not Authorized')) {
      return new AuthenticationError(message);
    }
    
    if (errorType.includes('Network') || errorType.includes('Connection')) {
      return new NetworkError(message);
    }
    
    return new ApiError(message, errorType);
  }
}
```

### Error Types

```typescript
// apps/web/src/app/core/errors/api-errors.ts

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string) {
    super(message, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class NetworkError extends ApiError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}
```

### Connection Type

```typescript
// apps/web/src/app/core/types/graphql.types.ts

export interface Connection<T> {
  items: T[];
  nextToken: string | null;
}
```

### Example Service Implementation

```typescript
// apps/web/src/app/core/services/organization.service.ts

import { 
  OrganizationsCreate, 
  OrganizationsUpdate, 
  OrganizationsDelete,
  OrganizationsGet,              // New in v0.19.0
  OrganizationsListByOwnerId     // Renamed from QueryByOwnerId in v0.19.0
} from '../graphql/Organizations.graphql';

@Injectable({ providedIn: 'root' })
export class OrganizationService extends ApiService {
  
  /**
   * Create a new organization
   * @returns The created organization directly from envelope.item
   */
  async create(input: OrganizationsCreateInput): Promise<IOrganizations> {
    return this.executeMutation<IOrganizations>(
      OrganizationsCreate,
      { input },
      'userPool'
    );
  }
  
  /**
   * Update an organization
   * @returns The updated organization directly from envelope.item
   */
  async update(input: OrganizationsUpdateInput): Promise<IOrganizations> {
    return this.executeMutation<IOrganizations>(
      OrganizationsUpdate,
      { input },
      'userPool'
    );
  }
  
  /**
   * Delete an organization
   * @returns The deleted organization directly from envelope.item
   */
  async delete(organizationId: string): Promise<IOrganizations> {
    return this.executeMutation<IOrganizations>(
      OrganizationsDelete,
      { input: { organizationId } },
      'userPool'
    );
  }
  
  /**
   * Get organization by ID (new Get operation in v0.19.0)
   * @returns The organization or null from envelope.item
   */
  async getById(organizationId: string): Promise<IOrganizations | null> {
    return this.executeGetQuery<IOrganizations>(
      OrganizationsGet,  // New operation in v0.19.0
      { input: { organizationId } },
      'userPool'
    );
  }
  
  /**
   * Get organizations by owner (renamed from QueryByOwnerId in v0.19.0)
   * @returns Connection with items and pagination token from envelope
   */
  async getByOwnerId(
    ownerId: string,
    limit?: number,
    nextToken?: string
  ): Promise<Connection<IOrganizations>> {
    return this.executeListQuery<IOrganizations>(
      OrganizationsListByOwnerId,  // Renamed from QueryByOwnerId in v0.19.0
      { input: { ownerId, limit, nextToken } },
      'userPool'
    );
  }
}
```

## Data Models

### Response Types (v0.19.0 Format)

The v0.19.0 GraphQL schema generates these response types:

```typescript
// Mutation responses have envelope with singular item
export interface OrganizationsCreateResponse {
  code: number;
  success: boolean;
  message?: string;
  item?: IOrganizations;
}

export interface OrganizationsUpdateResponse {
  code: number;
  success: boolean;
  message?: string;
  item?: IOrganizations;
}

export interface OrganizationsDeleteResponse {
  code: number;
  success: boolean;
  message?: string;
  item?: IOrganizations;
}

// Get response has envelope with singular item
export interface OrganizationsGetResponse {
  code: number;
  success: boolean;
  message?: string;
  item?: IOrganizations;
}

// List response has envelope with plural items and pagination
export interface OrganizationsListResponse {
  code: number;
  success: boolean;
  message?: string;
  items: IOrganizations[];
  nextToken?: string;
}
```

### Removed Types

The following custom wrapper types will be removed:

```typescript
// REMOVE - these don't match GraphQL schema
export type OrganizationsResponse = {
  StatusCode: number;  // Not in GraphQL - use code instead
  Message: string;     // Not in GraphQL - use message instead
  Data: Organizations | null;  // Not in GraphQL - use item/items instead
};

export type OrganizationsCreateResponse = {
  StatusCode: number;
  Message: string;
  Data: Organizations | null;
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Mutation Response Direct Return

*For any* mutation type (create, update, delete) and any valid input, the service method SHALL return the mutated item directly without wrappers, and the returned item SHALL have the same ID as the input (for update/delete) or a valid new ID (for create).

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Error Response Handling

*For any* GraphQL error response, the service SHALL throw an ApiError subclass where:
- Authentication errors throw AuthenticationError
- Network errors throw NetworkError
- Other errors throw ApiError with the original message

**Validates: Requirements 1.4, 2.4, 6.1, 6.2, 6.3, 6.4**

### Property 3: Query Response Handling

*For any* query operation:
- Single-item queries return the item directly or null if not found
- List queries return a Connection with items array (possibly empty) and nextToken

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 4: No Re-fetch After Mutation

*For any* successful mutation, the service SHALL NOT make additional API calls to fetch the same data. The mutation response is the source of truth.

**Validates: Requirements 1.5, 7.2, 7.3**

### Property 5: Base Class Reusability

*For any* service extending ApiService, calling executeMutation/executeQuery/executeListQuery with valid parameters SHALL produce consistent results regardless of the specific entity type.

**Validates: Requirements 4.1, 4.2, 4.3**

## Error Handling

### Error Classification

| Error Type | Condition | Action |
|------------|-----------|--------|
| AuthenticationError | Token expired, unauthorized | Redirect to login |
| NetworkError | Connection failed | Show retry option |
| ApiError | Business logic error | Show error message |

### Error Logging

All errors are logged with:
- Error type and message
- Operation name (mutation/query)
- Input parameters (sanitized)
- Timestamp

## Testing Strategy

### Unit Tests

Each service method requires:
1. Success case with valid response
2. Error case with GraphQL error
3. Edge case with null/empty response

### Property-Based Tests

Using fast-check for TypeScript:

1. **Mutation round-trip**: Create → Read should return equivalent item
2. **Error type mapping**: All error types map to correct ApiError subclass
3. **Connection invariants**: items.length >= 0, nextToken is string or null

### Test Configuration

- Minimum 100 iterations per property test
- Mock GraphQL client for unit tests
- Use generated test data matching schema types
