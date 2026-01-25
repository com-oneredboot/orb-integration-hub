# Requirements Document

## Introduction

This specification covers the upgrade from orb-schema-generator v0.18.x to v0.19.0, which introduces breaking changes to GraphQL response types. The upgrade standardizes all GraphQL responses with a consistent envelope format and clearer operation naming.

**Key Changes in v0.19.0:**
1. Response envelope with `code`, `success`, `message` fields
2. Mutations return `item` (singular) instead of `items` array
3. List queries return `items` (plural) with `nextToken`
4. Operation naming: `QueryBy*` → `ListBy*`
5. New `Get` operation for single-item retrieval by primary key

**Blockers:**
- Issue #79: TypeScript GraphQL query generator not updated for v0.19.0 format (must be fixed first)

## Glossary

- **Response_Envelope**: Standard fields (`code: Int!`, `success: Boolean!`, `message: String`) in all response types
- **Mutation_Response**: Response type for create/update/delete operations with `item` (singular)
- **List_Response**: Response type for list operations with `items` (plural) and `nextToken`
- **Get_Response**: Response type for single-item retrieval with `item` (singular)

## Requirements

### Requirement 1: Update GraphQL Query Imports

**User Story:** As a developer, I want GraphQL query imports updated to use the new operation names, so that queries match the generated schema.

#### Acceptance Criteria

1. WHEN importing query operations, THE Service SHALL use `ListBy*` instead of `QueryBy*`
2. WHEN importing get operations, THE Service SHALL use `{Schema}Get` for single-item retrieval
3. THE Service SHALL import from regenerated `*.graphql.ts` files after #79 is fixed
4. ALL services using GraphQL queries SHALL be updated with new import names

### Requirement 2: Update Mutation Response Handling

**User Story:** As a developer, I want mutation responses to use the new envelope format, so that error handling is consistent.

#### Acceptance Criteria

1. WHEN a mutation succeeds, THE Service SHALL extract `item` (singular) from response
2. WHEN a mutation fails, THE Service SHALL check `success: false` and use `message` for error
3. THE Service SHALL NOT use `items[0]` pattern for mutation responses
4. THE Service SHALL handle `code` field for HTTP-style status codes

### Requirement 3: Update List Query Response Handling

**User Story:** As a developer, I want list query responses to use the new envelope format, so that pagination is consistent.

#### Acceptance Criteria

1. WHEN a list query succeeds, THE Service SHALL extract `items` (plural) from response
2. WHEN a list query returns empty, THE Service SHALL handle `items: []` gracefully
3. THE Service SHALL use `nextToken` for pagination
4. THE Service SHALL check `success` field before processing items

### Requirement 4: Update Get Query Response Handling

**User Story:** As a developer, I want to use the new Get operation for single-item retrieval, so that I don't need to use list queries for single items.

#### Acceptance Criteria

1. WHEN retrieving a single item by primary key, THE Service SHALL use `{Schema}Get` operation
2. WHEN the item exists, THE Service SHALL extract `item` from response
3. WHEN the item doesn't exist, THE Service SHALL handle `item: null` gracefully
4. THE Service SHALL check `success` field before processing item

### Requirement 5: Remove Workaround Code

**User Story:** As a developer, I want all workaround code removed, so that the codebase is clean and maintainable.

#### Acceptance Criteria

1. THE Service SHALL NOT contain code that handles multiple response formats
2. THE Service SHALL NOT contain code that checks for both `item` and `items`
3. THE Service SHALL NOT contain custom wrapper types (`StatusCode`, `Message`, `Data`)
4. THE Service SHALL use generated response types directly

### Requirement 6: Update TypeScript Response Types

**User Story:** As a developer, I want TypeScript types to match the new GraphQL response format, so that type checking is accurate.

#### Acceptance Criteria

1. THE Response types SHALL include `code: number`, `success: boolean`, `message?: string`
2. THE Mutation response types SHALL include `item?: {Schema}` (singular)
3. THE List response types SHALL include `items: {Schema}[]` and `nextToken?: string`
4. THE Get response types SHALL include `item?: {Schema}` (singular)

### Requirement 7: Update Service Base Class

**User Story:** As a developer, I want the ApiService base class to handle the new response format, so that all services benefit from consistent handling.

#### Acceptance Criteria

1. THE ApiService SHALL provide `executeMutation<T>()` method that extracts `item` from response
2. THE ApiService SHALL provide `executeListQuery<T>()` method that extracts `items` from response
3. THE ApiService SHALL provide `executeGetQuery<T>()` method that extracts `item` from response
4. THE ApiService SHALL throw typed errors based on `success` and `message` fields

### Requirement 8: Update All Affected Services

**User Story:** As a developer, I want all services updated to use the new patterns, so that the codebase is consistent.

#### Acceptance Criteria

1. THE OrganizationService SHALL be updated to use new response format
2. THE UserService SHALL be updated to use new response format
3. ALL other services using GraphQL SHALL be updated to use new response format
4. THE Services SHALL use base class methods for consistent handling

### Requirement 9: Update Tests

**User Story:** As a developer, I want tests updated to use the new response format, so that tests accurately reflect the API.

#### Acceptance Criteria

1. THE Unit tests SHALL mock responses with new envelope format
2. THE Unit tests SHALL verify `success` field is checked
3. THE Unit tests SHALL verify `item`/`items` extraction is correct
4. THE Integration tests SHALL work with regenerated GraphQL schema

### Requirement 10: Documentation Updates

**User Story:** As a developer, I want documentation updated to reflect the new patterns, so that new code follows the correct approach.

#### Acceptance Criteria

1. THE graphql-service-cleanup spec SHALL be updated to reflect v0.19.0 changes
2. THE coding standards SHALL document the new response handling pattern
3. THE steering files SHALL include the new GraphQL service patterns
