# Generated TypeScript Models Have ESLint Violations

## Summary

The orb-schema-generator generates TypeScript model files with ESLint violations.

## Status

- **Unused imports issue**: Fixed in v0.13.6 (closed)
- **`any` type issue**: Comment added to #59 requesting `Record<string, unknown>` instead of `Record<string, any>`

## Environment

- orb-schema-generator version: v0.13.5 (current), v0.13.6 (fix available)
- Project: orb-integration-hub
- ESLint rules affected:
  - `@typescript-eslint/no-unused-vars` (fixed in v0.13.6)
  - `@typescript-eslint/no-explicit-any` (warnings, minor)

## Issue 1: Unused Imports (FIXED in v0.13.6)

In `apps/web/src/app/core/models/AuthModel.ts`:

```typescript
// Before (v0.13.5) - imports interface that's never used
import { MfaSetupDetails, IMfaSetupDetails } from './MfaSetupDetailsModel';
import { Users, IUsers } from './UsersModel';

// After (v0.13.6) - only imports what's used
import { MfaSetupDetails } from './MfaSetupDetailsModel';
import { Users } from './UsersModel';
```

## Issue 2: `any` Type Usage (Minor - Warnings Only)

Generated models use `Record<string, any>` which triggers `@typescript-eslint/no-explicit-any` warnings:

```typescript
// Current (warning)
details?: Record<string, any>;
metadata?: Record<string, any>;

// Suggested fix
details?: Record<string, unknown>;
metadata?: Record<string, unknown>;
```

Affected files:
- `AuthErrorModel.ts` (lines 37, 44)
- `NotificationsModel.ts` (lines 19, 33, 111, 125)

## Action Required

1. Update to orb-schema-generator v0.13.6 when available in CodeArtifact
2. Regenerate models with `orb-schema generate`
