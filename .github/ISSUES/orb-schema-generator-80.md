## Bug: TypeScript Generator Creates Duplicate Query Input Types for GSIs with Same Partition Key

### Version
orb-schema-generator v0.19.3

### Environment
- Python 3.12
- TypeScript 5.x
- Angular 19

### Description

When a DynamoDB schema has multiple GSIs that share the same partition key (but different sort keys), the TypeScript generator creates duplicate type definitions, causing TypeScript compilation errors.

The Python generator correctly deduplicates these types, but the TypeScript generator does not.

### Schema Example

```yaml
# schemas/tables/ApplicationGroupRoles.yml
type: dynamodb
name: ApplicationGroupRoles
model:
  keys:
    primary:
      partition: applicationGroupRoleId
    secondary:
      - name: GroupEnvRoleIndex
        type: GSI
        partition: applicationGroupId  # Same partition key
        sort: environment
      - name: GroupStatusIndex
        type: GSI
        partition: applicationGroupId  # Same partition key (different sort)
        sort: status
```

### Generated TypeScript (Incorrect - Has Duplicates)

```typescript
// Line 41-43
export type ApplicationGroupRolesQueryByApplicationGroupIdInput = {
  applicationGroupId: string;
};

// Line 49-51 - DUPLICATE!
export type ApplicationGroupRolesQueryByApplicationGroupIdInput = {
  applicationGroupId: string;
};

// Line 117-119
export type ApplicationGroupRolesListByApplicationGroupIdResponse = {
  ApplicationGroupRolesListByApplicationGroupId: ApplicationGroupRolesListResponse;
};

// Line 123-125 - DUPLICATE!
export type ApplicationGroupRolesListByApplicationGroupIdResponse = {
  ApplicationGroupRolesListByApplicationGroupId: ApplicationGroupRolesListResponse;
};
```

### Generated Python (Correct - No Duplicates)

```python
# Only ONE definition exists
class ApplicationGroupRolesQueryByApplicationGroupIdInput(BaseModel):
    """ApplicationGroupRoles query by applicationGroupId."""
    application_group_id: str
```

### TypeScript Compilation Error

```
✘ [ERROR] TS2300: Duplicate identifier 'ApplicationGroupRolesQueryByApplicationGroupIdInput'. [plugin angular-compiler]
  src/app/core/models/ApplicationGroupRolesModel.ts:41:12
    41 │ export type ApplicationGroupRolesQueryByApplicationGroupIdInput = {
       ╵             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

✘ [ERROR] TS2300: Duplicate identifier 'ApplicationGroupRolesQueryByApplicationGroupIdInput'. [plugin angular-compiler]
  src/app/core/models/ApplicationGroupRolesModel.ts:49:12
    49 │ export type ApplicationGroupRolesQueryByApplicationGroupIdInput = {
       ╵             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
```

### Affected Schemas

Any schema with multiple GSIs sharing the same partition key:
- `ApplicationGroupRoles.yml` - `GroupEnvRoleIndex` and `GroupStatusIndex` both use `applicationGroupId`
- `ApplicationGroupUsers.yml` - `GroupUsersIndex` and `GroupStatusIndex` both use `applicationGroupId`
- `ApplicationGroups.yml` - `ApplicationGroupsIndex` and `ApplicationStatusIndex` both use `applicationId`

### Expected Behavior

The TypeScript generator should deduplicate query input types when multiple GSIs share the same partition key, matching the Python generator's behavior.

### Workaround

Currently none - manual edits are overwritten on regeneration.

### Impact

- **Severity**: High - Blocks all TypeScript compilation
- **Affected**: Any project using GSIs with shared partition keys
- **Blocking**: Cannot build Angular frontend until fixed

### Suggested Fix

The TypeScript generator should track generated query input type names and skip duplicates, similar to how the Python generator handles this case.

### Related

- Python generator correctly handles this case (no duplicates)
- GraphQL generator may also be affected (not verified)
