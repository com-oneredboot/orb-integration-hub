## Bug Description

The generated TypeScript models reference enum values using SCREAMING_CASE (e.g., `UserStatus.UNKNOWN`) but the generated enums use PascalCase (e.g., `UserStatus.Unknown`).

## Example

**Generated enum (UserStatusEnum.ts):**
```typescript
export enum UserStatus {
  Unknown = "UNKNOWN",
  Active = "ACTIVE",
  // ...
}
```

**Generated model (UsersModel.ts):**
```typescript
this.status = data.status ?? UserStatus.UNKNOWN;  // ERROR: Should be UserStatus.Unknown
```

## Expected Behavior

The model should reference `UserStatus.Unknown` (PascalCase) to match the enum definition.

## Actual Behavior

The model references `UserStatus.UNKNOWN` (SCREAMING_CASE) which causes TypeScript compilation errors.

## Version

orb-schema-generator v0.14.0

## Impact

This causes TypeScript compilation errors in the frontend application when using the generated models.

## Suggested Fix

Update the TypeScript model generator to use PascalCase enum references instead of SCREAMING_CASE.
