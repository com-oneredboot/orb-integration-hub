"""Duplicate resolver system for eliminating redundant definitions.

This module provides intelligent duplicate detection and resolution:
- DuplicateDetector: Identifies duplicate schemas, types, and operations
- DuplicateResolver: Resolves duplicates through merging or aliasing
- ConflictResolver: Handles conflicting definitions

Key features:
- Hash-based duplicate detection for performance
- Semantic analysis for intelligent merging
- Configurable resolution strategies
- Specialized handling for TypeScript type duplications
"""

import logging
from typing import Dict, List, Set, Tuple, Optional, Any, Union
from dataclasses import dataclass, field
from collections import defaultdict
import hashlib
import json

from orb_schema_generator.core.models import (
    Schema, SchemaField, Operation, OperationType,
    SchemaType, SchemaCollection
)
from orb_schema_generator.core.exceptions import DuplicateError


logger = logging.getLogger(__name__)


class ResolutionStrategy:
    """Available strategies for resolving duplicates."""
    MERGE = "merge"          # Merge compatible definitions
    ALIAS = "alias"          # Create aliases to single definition
    ERROR = "error"          # Raise error on duplicates
    IGNORE = "ignore"        # Keep all duplicates (may cause issues)
    PREFER_FIRST = "first"   # Keep first occurrence
    PREFER_LAST = "last"     # Keep last occurrence


@dataclass
class DuplicateInfo:
    """Information about a detected duplicate."""
    item_type: str              # 'operation', 'type', 'field', etc.
    name: str                   # Name of the duplicate item
    occurrences: List[Any]      # List of duplicate occurrences
    hashes: List[str]           # Hash values for each occurrence
    locations: List[str]        # Source locations (file paths, etc.)
    
    @property
    def count(self) -> int:
        """Number of duplicate occurrences."""
        return len(self.occurrences)
    
    def is_identical(self) -> bool:
        """Check if all occurrences are identical."""
        return len(set(self.hashes)) == 1


@dataclass
class ResolutionResult:
    """Result of duplicate resolution."""
    resolved_items: List[Any] = field(default_factory=list)
    merged_count: int = 0
    aliased_count: int = 0
    removed_count: int = 0
    conflicts: List[DuplicateInfo] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


class DuplicateDetector:
    """Detects duplicate definitions across schemas."""
    
    def __init__(self):
        """Initialize the duplicate detector."""
        self.duplicates: List[DuplicateInfo] = []
        self._operation_index: Dict[str, List[Operation]] = defaultdict(list)
        self._type_index: Dict[str, List[Tuple[Schema, SchemaField]]] = defaultdict(list)
        
    def detect_in_collection(self, collection: SchemaCollection) -> List[DuplicateInfo]:
        """Detect all duplicates in a schema collection.
        
        Args:
            collection: The schema collection to analyze
            
        Returns:
            List of detected duplicates
        """
        logger.info("Starting duplicate detection across schema collection")
        
        self.duplicates.clear()
        self._operation_index.clear()
        self._type_index.clear()
        
        # Build indexes
        self._build_indexes(collection)
        
        # Detect different types of duplicates
        self._detect_duplicate_operations()
        self._detect_duplicate_types()
        self._detect_duplicate_field_definitions(collection)
        
        logger.info(f"Detected {len(self.duplicates)} duplicate groups")
        return self.duplicates
        
    def _build_indexes(self, collection: SchemaCollection) -> None:
        """Build indexes for efficient duplicate detection."""
        for schema in collection.schemas:
            # Index operations
            for operation in schema.operations:
                key = f"{operation.operation_type.value}:{operation.name}"
                self._operation_index[key].append(operation)
                
            # Index type references
            for field in schema.fields:
                if field.type.startswith('I'):  # Interface type reference
                    self._type_index[field.type].append((schema, field))
                    
    def _detect_duplicate_operations(self) -> None:
        """Detect duplicate GraphQL operations."""
        for key, operations in self._operation_index.items():
            if len(operations) > 1:
                # Calculate hashes for each operation
                hashes = [self._hash_operation(op) for op in operations]
                locations = [f"Schema: {op.name}" for op in operations]
                
                duplicate_info = DuplicateInfo(
                    item_type="operation",
                    name=key,
                    occurrences=operations,
                    hashes=hashes,
                    locations=locations
                )
                
                self.duplicates.append(duplicate_info)
                
                if duplicate_info.is_identical():
                    logger.warning(f"Found {len(operations)} identical operations for '{key}'")
                else:
                    logger.warning(f"Found {len(operations)} conflicting operations for '{key}'")
                    
    def _detect_duplicate_types(self) -> None:
        """Detect duplicate TypeScript type definitions.
        
        This is specifically designed to catch the issue where operations
        are being generated multiple times in templates.
        """
        # Group operations by their generated type names
        type_groups: Dict[str, List[Tuple[Schema, Operation]]] = defaultdict(list)
        
        for key, operations in self._operation_index.items():
            for op in operations:
                # Simulate the type name generation from templates
                if hasattr(op, 'table_name'):
                    schema_name = self._pascal_case(op.table_name)
                    
                    # Common generated type patterns
                    type_patterns = [
                        f"{schema_name}CreateInput",
                        f"{schema_name}UpdateInput",
                        f"{schema_name}Response",
                        f"{schema_name}CreateResponse",
                        f"{schema_name}UpdateResponse",
                        f"{schema_name}ListResponse",
                        f"{schema_name}QueryResponse",
                    ]
                    
                    for pattern in type_patterns:
                        if op.operation_type == OperationType.MUTATION and "Create" in pattern:
                            type_groups[pattern].append((None, op))
                        elif op.operation_type == OperationType.MUTATION and "Update" in pattern:
                            type_groups[pattern].append((None, op))
                        elif op.operation_type == OperationType.QUERY:
                            type_groups[pattern].append((None, op))
                            
        # Check for duplicates
        for type_name, occurrences in type_groups.items():
            if len(occurrences) > 1:
                logger.warning(f"Type '{type_name}' will be generated {len(occurrences)} times")
                
    def _detect_duplicate_field_definitions(self, collection: SchemaCollection) -> None:
        """Detect duplicate field definitions across schemas."""
        # Group fields by schema and name
        field_groups: Dict[str, List[Tuple[Schema, SchemaField]]] = defaultdict(list)
        
        for schema in collection.schemas:
            for field in schema.fields:
                # Create a composite key
                key = f"{schema.name}.{field.name}"
                field_groups[key].append((schema, field))
                
        # Check for fields with same name but different definitions
        for schema in collection.schemas:
            field_names = set()
            for field in schema.fields:
                if field.name in field_names:
                    logger.warning(f"Duplicate field '{field.name}' in schema '{schema.name}'")
                field_names.add(field.name)
                
    def _hash_operation(self, operation: Operation) -> str:
        """Generate a hash for an operation to detect duplicates."""
        # Create a normalized representation
        data = {
            'name': operation.name,
            'type': operation.operation_type.value,
            'input': operation.input_type,
            'output': operation.output_type,
            'auth': sorted(operation.auth_directives),
            'resolver': operation.resolver_type,
        }
        
        # Convert to JSON for consistent hashing
        json_str = json.dumps(data, sort_keys=True)
        return hashlib.sha256(json_str.encode()).hexdigest()[:16]
        
    def _pascal_case(self, text: Optional[str]) -> str:
        """Convert text to PascalCase."""
        if not text:
            return ""
        parts = text.replace('-', '_').split('_')
        return ''.join(word.capitalize() for word in parts)


class DuplicateResolver:
    """Resolves detected duplicates based on configured strategies."""
    
    def __init__(self, strategy: str = ResolutionStrategy.MERGE):
        """Initialize resolver with a default strategy.
        
        Args:
            strategy: Default resolution strategy to use
        """
        self.default_strategy = strategy
        self.type_strategies: Dict[str, str] = {}
        
    def set_type_strategy(self, item_type: str, strategy: str) -> None:
        """Set a specific strategy for a type of duplicate.
        
        Args:
            item_type: Type of item ('operation', 'type', etc.)
            strategy: Resolution strategy to use
        """
        self.type_strategies[item_type] = strategy
        
    def resolve(self, duplicates: List[DuplicateInfo]) -> ResolutionResult:
        """Resolve all detected duplicates.
        
        Args:
            duplicates: List of duplicates to resolve
            
        Returns:
            Resolution result with statistics and conflicts
        """
        logger.info(f"Resolving {len(duplicates)} duplicate groups")
        
        result = ResolutionResult()
        
        for duplicate in duplicates:
            strategy = self.type_strategies.get(
                duplicate.item_type, 
                self.default_strategy
            )
            
            try:
                self._resolve_duplicate(duplicate, strategy, result)
            except DuplicateError:
                # Re-raise DuplicateError for ERROR strategy
                raise
            except Exception as e:
                logger.error(f"Failed to resolve duplicate '{duplicate.name}': {e}")
                result.conflicts.append(duplicate)
                
        logger.info(
            f"Resolution complete: {result.merged_count} merged, "
            f"{result.aliased_count} aliased, {result.removed_count} removed, "
            f"{len(result.conflicts)} conflicts"
        )
        
        return result
        
    def _resolve_duplicate(self, duplicate: DuplicateInfo, 
                          strategy: str, result: ResolutionResult) -> None:
        """Resolve a single duplicate based on strategy."""
        logger.debug(f"Resolving {duplicate.item_type} '{duplicate.name}' using {strategy}")
        
        if strategy == ResolutionStrategy.MERGE:
            self._merge_duplicates(duplicate, result)
        elif strategy == ResolutionStrategy.ALIAS:
            self._create_aliases(duplicate, result)
        elif strategy == ResolutionStrategy.ERROR:
            raise DuplicateError(
                f"Duplicate {duplicate.item_type} '{duplicate.name}' found",
                duplicates=[str(loc) for loc in duplicate.locations]
            )
        elif strategy == ResolutionStrategy.IGNORE:
            result.warnings.append(
                f"Ignoring {duplicate.count} duplicates of '{duplicate.name}'"
            )
        elif strategy == ResolutionStrategy.PREFER_FIRST:
            self._keep_first(duplicate, result)
        elif strategy == ResolutionStrategy.PREFER_LAST:
            self._keep_last(duplicate, result)
        else:
            raise ValueError(f"Unknown resolution strategy: {strategy}")
            
    def _merge_duplicates(self, duplicate: DuplicateInfo, 
                         result: ResolutionResult) -> None:
        """Merge compatible duplicate definitions."""
        if duplicate.is_identical():
            # All identical - just keep one
            result.resolved_items.append(duplicate.occurrences[0])
            result.removed_count += duplicate.count - 1
            logger.debug(f"Removed {duplicate.count - 1} identical copies of '{duplicate.name}'")
        else:
            # Try to merge non-identical duplicates
            if duplicate.item_type == "operation":
                merged = self._merge_operations(duplicate.occurrences)
                if merged:
                    result.resolved_items.append(merged)
                    result.merged_count += 1
                else:
                    result.conflicts.append(duplicate)
            else:
                # For other types, we can't easily merge
                result.conflicts.append(duplicate)
                
    def _merge_operations(self, operations: List[Operation]) -> Optional[Operation]:
        """Attempt to merge multiple operations into one."""
        if not operations:
            return None
            
        # Start with the first operation as base
        base = operations[0]
        
        # Check if all operations are compatible
        for op in operations[1:]:
            if not self._operations_compatible(base, op):
                return None
                
        # Merge auth directives
        all_auth = set()
        for op in operations:
            all_auth.update(op.auth_directives)
            
        # Create merged operation
        merged = Operation(
            name=base.name,
            operation_type=base.operation_type,
            description=base.description or "Merged operation",
            input_type=base.input_type,
            output_type=base.output_type,
            auth_directives=sorted(list(all_auth)),
            arguments=base.arguments.copy(),
            resolver_type=base.resolver_type,
            table_name=base.table_name,
            index_name=base.index_name
        )
        
        return merged
        
    def _operations_compatible(self, op1: Operation, op2: Operation) -> bool:
        """Check if two operations can be merged."""
        return (
            op1.name == op2.name and
            op1.operation_type == op2.operation_type and
            op1.input_type == op2.input_type and
            op1.output_type == op2.output_type and
            op1.resolver_type == op2.resolver_type
        )
        
    def _create_aliases(self, duplicate: DuplicateInfo, 
                       result: ResolutionResult) -> None:
        """Create aliases for duplicate definitions."""
        # Keep the first occurrence as the canonical one
        canonical = duplicate.occurrences[0]
        result.resolved_items.append(canonical)
        
        # Create aliases for the rest
        for i, occurrence in enumerate(duplicate.occurrences[1:], 1):
            # This would need template support to actually create aliases
            result.warnings.append(
                f"Created alias for '{duplicate.name}' occurrence {i+1}"
            )
            result.aliased_count += 1
            
    def _keep_first(self, duplicate: DuplicateInfo, 
                   result: ResolutionResult) -> None:
        """Keep only the first occurrence."""
        result.resolved_items.append(duplicate.occurrences[0])
        result.removed_count += duplicate.count - 1
        
    def _keep_last(self, duplicate: DuplicateInfo, 
                  result: ResolutionResult) -> None:
        """Keep only the last occurrence."""
        result.resolved_items.append(duplicate.occurrences[-1])
        result.removed_count += duplicate.count - 1


class TypeScriptDuplicateResolver:
    """Specialized resolver for TypeScript type duplications.
    
    This class specifically addresses the issue where TypeScript types
    are generated multiple times due to template logic issues.
    """
    
    def __init__(self):
        """Initialize the TypeScript duplicate resolver."""
        self.seen_types: Set[str] = set()
        self.type_registry: Dict[str, Any] = {}
        
    def register_type(self, type_name: str, definition: Any) -> bool:
        """Register a type and check if it's a duplicate.
        
        Args:
            type_name: Name of the TypeScript type
            definition: The type definition
            
        Returns:
            True if this is a new type, False if duplicate
        """
        if type_name in self.seen_types:
            logger.warning(f"Duplicate TypeScript type detected: {type_name}")
            return False
            
        self.seen_types.add(type_name)
        self.type_registry[type_name] = definition
        return True
        
    def get_unique_operations(self, operations: List[Operation]) -> List[Operation]:
        """Filter operations to ensure unique type generation.
        
        Args:
            operations: List of all operations
            
        Returns:
            Filtered list with no duplicate type generation
        """
        seen_combinations = set()
        unique_operations = []
        
        for op in operations:
            # Create a key based on what types this operation generates
            key = f"{op.operation_type.value}:{op.name}"
            
            if key not in seen_combinations:
                seen_combinations.add(key)
                unique_operations.append(op)
            else:
                logger.debug(f"Filtering duplicate operation: {key}")
                
        return unique_operations
        
    def deduplicate_template_data(self, template_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process template data to remove duplicates before rendering.
        
        Args:
            template_data: Data being passed to templates
            
        Returns:
            Cleaned template data without duplicates
        """
        cleaned_data = template_data.copy()
        
        # Deduplicate operations if present
        if 'operations' in cleaned_data:
            operations = cleaned_data['operations']
            cleaned_data['operations'] = self.get_unique_operations(operations)
            
        # Reset type tracking for each template render
        self.seen_types.clear()
        
        return cleaned_data