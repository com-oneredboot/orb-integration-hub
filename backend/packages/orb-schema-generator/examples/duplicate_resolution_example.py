"""Example of using the duplicate resolver system.

This example demonstrates how to detect and resolve duplicate
TypeScript types in schema generation.
"""

from orb_schema_generator.core import (
    Schema, SchemaType, Operation, OperationType,
    SchemaCollection, DuplicateDetector, DuplicateResolver,
    TypeScriptDuplicateResolver, ResolutionStrategy
)


def main():
    """Demonstrate duplicate detection and resolution."""
    
    # Create a collection with duplicate operations
    collection = SchemaCollection()
    
    # First schema with user operations
    users_schema = Schema(name="Users", schema_type=SchemaType.GRAPHQL)
    users_schema.operations = [
        Operation(
            name="getUser",
            operation_type=OperationType.QUERY,
            input_type="GetUserInput",
            output_type="User"
        ),
        Operation(
            name="createUser",
            operation_type=OperationType.MUTATION,
            input_type="CreateUserInput",
            output_type="User"
        ),
    ]
    collection.add_schema(users_schema)
    
    # Second schema with overlapping operations (duplicate)
    admin_schema = Schema(name="AdminUsers", schema_type=SchemaType.GRAPHQL)
    admin_schema.operations = [
        Operation(
            name="getUser",  # Duplicate!
            operation_type=OperationType.QUERY,
            input_type="GetUserInput",
            output_type="User"
        ),
        Operation(
            name="deleteUser",
            operation_type=OperationType.MUTATION,
            input_type="DeleteUserInput",
            output_type="DeleteResult"
        ),
    ]
    collection.add_schema(admin_schema)
    
    print("=== Duplicate Detection ===")
    
    # Detect duplicates
    detector = DuplicateDetector()
    duplicates = detector.detect_in_collection(collection)
    
    print(f"Found {len(duplicates)} duplicate groups:")
    for dup in duplicates:
        print(f"  - {dup.name}: {dup.count} occurrences")
        print(f"    Identical: {dup.is_identical()}")
        print(f"    Locations: {dup.locations}")
    
    print("\n=== Duplicate Resolution ===")
    
    # Resolve duplicates using merge strategy
    resolver = DuplicateResolver(strategy=ResolutionStrategy.MERGE)
    result = resolver.resolve(duplicates)
    
    print(f"Resolution results:")
    print(f"  - Merged: {result.merged_count}")
    print(f"  - Removed: {result.removed_count}")
    print(f"  - Conflicts: {len(result.conflicts)}")
    
    print("\n=== TypeScript Duplicate Prevention ===")
    
    # Use TypeScript resolver to prevent duplicate type generation
    ts_resolver = TypeScriptDuplicateResolver()
    
    # Simulate template data with duplicate operations
    template_operations = [
        Operation(name="getUser", operation_type=OperationType.QUERY),
        Operation(name="getUser", operation_type=OperationType.QUERY),  # Duplicate
        Operation(name="createUser", operation_type=OperationType.MUTATION),
        Operation(name="createUser", operation_type=OperationType.MUTATION),  # Duplicate
        Operation(name="updateUser", operation_type=OperationType.MUTATION),
    ]
    
    # Clean the operations
    unique_ops = ts_resolver.get_unique_operations(template_operations)
    
    print(f"Original operations: {len(template_operations)}")
    print(f"Unique operations: {len(unique_ops)}")
    print("Unique operation names:", [op.name for op in unique_ops])
    
    # Demonstrate type registration
    print("\n=== Type Registration ===")
    
    types_to_generate = [
        "UserCreateInput",
        "UserUpdateInput", 
        "UserCreateInput",  # Duplicate!
        "UserResponse",
    ]
    
    for type_name in types_to_generate:
        if ts_resolver.register_type(type_name, {}):
            print(f"✓ Registered type: {type_name}")
        else:
            print(f"✗ Duplicate type blocked: {type_name}")
    
    print("\n=== Different Resolution Strategies ===")
    
    # Demonstrate different strategies
    strategies = [
        ResolutionStrategy.MERGE,
        ResolutionStrategy.PREFER_FIRST,
        ResolutionStrategy.PREFER_LAST,
        ResolutionStrategy.IGNORE,
    ]
    
    for strategy in strategies:
        print(f"\nUsing {strategy} strategy:")
        resolver = DuplicateResolver(strategy=strategy)
        try:
            result = resolver.resolve(duplicates)
            print(f"  Success - Removed: {result.removed_count}, Warnings: {len(result.warnings)}")
        except Exception as e:
            print(f"  Failed: {e}")


if __name__ == "__main__":
    main()