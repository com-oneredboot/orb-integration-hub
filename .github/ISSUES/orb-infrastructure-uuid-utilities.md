# Enhancement: Add UUID Utilities to orb-common

## Summary

Add cross-language UUID generation utilities to orb-common for consistent ID generation across all orb projects.

## Context

When implementing the create-on-click pattern for organizations in orb-integration-hub, we needed to generate UUIDs client-side since DynamoDB doesn't allow empty strings for key attributes. Currently there's no shared utility for this, leading to ad-hoc implementations.

## Requirements

### Supported Languages

UUID utilities should be provided for all languages supported by orb-common:

1. **Python** - For Lambda functions and backend services
2. **TypeScript** - For frontend applications
3. **CDK/Infrastructure** - For resource naming

### Functionality

Each implementation should provide:

- `generateUUID()` / `generate_uuid()` - Generate a UUID v4
- `isValidUUID()` / `is_valid_uuid()` - Validate UUID format
- Consistent output format across all languages (lowercase, with hyphens)

### Implementation Notes

**Python:**
```python
import uuid

def generate_uuid() -> str:
    """Generate a UUID v4 string."""
    return str(uuid.uuid4())

def is_valid_uuid(value: str) -> bool:
    """Validate UUID format."""
    try:
        uuid.UUID(value, version=4)
        return True
    except ValueError:
        return False
```

**TypeScript:**
```typescript
export function generateUUID(): string {
  return crypto.randomUUID();
}

export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}
```

## Use Cases

- Generating primary keys for DynamoDB tables
- Creating unique identifiers for resources
- Generating correlation IDs for logging/tracing
- Any scenario requiring unique identifiers

## Impact

- **Consistency**: Same UUID format across all orb projects
- **Maintainability**: Single source of truth for UUID generation
- **Testing**: Shared validation logic

## Related

- orb-integration-hub: Using ad-hoc UUID generation in `OrganizationService.createDraft()`
