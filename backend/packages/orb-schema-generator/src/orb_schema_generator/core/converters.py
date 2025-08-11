"""Type conversion utilities for different target languages.

This module provides utilities for converting between:
- Schema types and target language types (Python, TypeScript, GraphQL, DynamoDB)
- Different naming conventions (camelCase, PascalCase, snake_case, etc.)

Key components:
- TypeConverter: Maps schema types to language-specific types
- CaseConverter: Transforms strings between naming conventions
"""

import re
from typing import Optional, Dict, Any


class TypeConverter:
    """Converts schema types to target language types."""
    
    @staticmethod
    def to_python_type(schema_type: str, required: bool = True) -> str:
        """Convert schema type to Python type annotation."""
        # Handle array types
        if schema_type.lower().startswith('array<'):
            element_type = schema_type[6:-1]
            python_element = TypeConverter.to_python_type(element_type)
            return f"List[{python_element}]"
        
        if schema_type.lower() == 'array':
            return 'List[str]'  # Default to string list
            
        # Handle model references
        if schema_type.startswith('I'):
            # Convert IUser to User for Python
            return schema_type[1:]
            
        # Basic type mapping
        type_mapping = {
            # String types
            'string': 'str',
            's': 'str',
            
            # Numeric types
            'number': 'float',
            'n': 'float',
            'int': 'int',
            'integer': 'int',
            'float': 'float',
            'double': 'float',
            'bigint': 'int',
            
            # Boolean
            'boolean': 'bool',
            'bool': 'bool',
            
            # Complex types
            'object': 'Dict[str, Any]',
            'map': 'Dict[str, Any]',
            'm': 'Dict[str, Any]',
            'array': 'List[Any]',
            'list': 'List[Any]',
            'l': 'List[Any]',
            'set': 'Set[str]',
            
            # Date/Time
            'timestamp': 'int',
            'date': 'datetime',
            'datetime': 'datetime',
            
            # Binary
            'binary': 'bytes',
            'b': 'bytes',
            
            # Special
            'any': 'Any',
            'null': 'None',
            'void': 'None'
        }
        
        python_type = type_mapping.get(schema_type.lower(), schema_type)
        
        # Add Optional wrapper if not required
        if not required and python_type != 'None':
            python_type = f"Optional[{python_type}]"
            
        return python_type
        
    @staticmethod
    def to_typescript_type(schema_type: str, required: bool = True) -> str:
        """Convert schema type to TypeScript type."""
        # Handle array types
        if schema_type.lower().startswith('array<'):
            element_type = schema_type[6:-1]
            ts_element = TypeConverter.to_typescript_type(element_type)
            return f"{ts_element}[]"
            
        if schema_type.lower() == 'array':
            return 'string[]'  # Default to string array
            
        # Handle model references (keep as-is for TypeScript)
        if schema_type.startswith('I'):
            return schema_type
            
        # Basic type mapping
        type_mapping = {
            # String types
            'string': 'string',
            's': 'string',
            
            # Numeric types
            'number': 'number',
            'n': 'number',
            'int': 'number',
            'integer': 'number',
            'float': 'number',
            'double': 'number',
            'bigint': 'bigint',
            
            # Boolean
            'boolean': 'boolean',
            'bool': 'boolean',
            
            # Complex types
            'object': 'Record<string, any>',
            'map': 'Record<string, any>',
            'm': 'Record<string, any>',
            'array': 'any[]',
            'list': 'any[]',
            'l': 'any[]',
            'set': 'Set<string>',
            
            # Date/Time (using number for epoch timestamps)
            'timestamp': 'number',
            'date': 'number',
            'datetime': 'Date',
            
            # Binary
            'binary': 'Buffer',
            'b': 'Buffer',
            
            # Special
            'any': 'any',
            'null': 'null',
            'void': 'void'
        }
        
        ts_type = type_mapping.get(schema_type.lower(), schema_type)
        
        # Add optional modifier if not required
        if not required and ts_type != 'null':
            ts_type = f"{ts_type} | null"
            
        return ts_type
        
    @staticmethod
    def to_dynamodb_type(schema_type: str) -> str:
        """Convert schema type to DynamoDB attribute type."""
        # Handle complex types
        if schema_type.lower().startswith('array'):
            return 'L'  # List
            
        if schema_type.startswith('I'):
            return 'S'  # Model references stored as strings
            
        # Basic type mapping
        type_mapping = {
            # String types
            'string': 'S',
            's': 'S',
            
            # Numeric types
            'number': 'N',
            'n': 'N',
            'int': 'N',
            'integer': 'N',
            'float': 'N',
            'double': 'N',
            'bigint': 'N',
            
            # Boolean (stored as string in DynamoDB)
            'boolean': 'S',
            'bool': 'S',
            
            # Complex types
            'object': 'M',  # Map
            'map': 'M',
            'm': 'M',
            'array': 'L',  # List
            'list': 'L',
            'l': 'L',
            'set': 'SS',  # String Set
            
            # Date/Time (stored as number)
            'timestamp': 'N',
            'date': 'N',
            'datetime': 'N',
            
            # Binary
            'binary': 'B',
            'b': 'B',
            
            # Special
            'any': 'S',
            'null': 'NULL'
        }
        
        return type_mapping.get(schema_type.lower(), 'S')  # Default to string
        
    @staticmethod
    def to_graphql_type(schema_type: str, required: bool = True) -> str:
        """Convert schema type to GraphQL type."""
        # Handle array types
        if schema_type.lower().startswith('array<'):
            element_type = schema_type[6:-1]
            graphql_element = TypeConverter.to_graphql_type(element_type)
            return f"[{graphql_element}]"
            
        if schema_type.lower() == 'array':
            return '[String]'  # Default to string array
            
        # Handle model references
        if schema_type.startswith('I'):
            # Remove 'I' prefix for GraphQL types
            return schema_type[1:]
            
        # Basic type mapping
        type_mapping = {
            # String types
            'string': 'String',
            's': 'String',
            
            # Numeric types
            'number': 'Int',
            'n': 'Int',
            'int': 'Int',
            'integer': 'Int',
            'float': 'Float',
            'double': 'Float',
            'bigint': 'String',  # GraphQL doesn't have BigInt
            
            # Boolean
            'boolean': 'Boolean',
            'bool': 'Boolean',
            
            # Complex types
            'object': 'String',  # JSON string
            'map': 'String',     # JSON string
            'array': '[String]',
            'list': '[String]',
            'set': '[String]',
            
            # Date/Time
            'timestamp': 'Int',    # Epoch timestamp
            'date': 'String',      # ISO date string
            'datetime': 'String',  # ISO datetime string
            
            # Special
            'id': 'ID',
            'any': 'String',
            'void': 'String'
        }
        
        graphql_type = type_mapping.get(schema_type.lower(), schema_type)
        
        # Add required modifier
        if required:
            graphql_type = f"{graphql_type}!"
            
        return graphql_type


class CaseConverter:
    """Converts between different naming conventions."""
    
    @staticmethod
    def to_camel_case(text: str) -> str:
        """Convert to camelCase."""
        # If already camelCase or PascalCase, just lowercase the first character
        if '_' not in text and '-' not in text:
            return text[0].lower() + text[1:] if text else text
            
        # Split by separators
        parts = re.split(r'[_-]', text)
        if not parts:
            return text
            
        # First part lowercase, rest capitalized
        return parts[0].lower() + ''.join(word.capitalize() for word in parts[1:])
        
    @staticmethod
    def to_pascal_case(text: str) -> str:
        """Convert to PascalCase."""
        if not text:
            return text
            
        # Split by underscores, hyphens, and existing camelCase boundaries
        words = re.split(r'[_-]', text)
        result = []
        
        for word in words:
            if not word:
                continue
                
            # Split on camelCase boundaries
            parts = re.findall(
                r'[A-Z]?[a-z]+|[A-Z]{2,}(?=[A-Z][a-z]|\d|\W|\Z)|[A-Z]{2,}|[A-Z][a-z]+|\d+',
                word
            )
            
            # Handle case where word starts with lowercase
            if word[0].islower() and parts:
                parts[0] = parts[0].lower()
                
            result.extend(parts)
            
        # Capitalize each part and join
        return ''.join(word.capitalize() for word in result)
        
    @staticmethod
    def to_snake_case(text: str) -> str:
        """Convert to snake_case."""
        # Handle camelCase and PascalCase
        s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', text)
        s2 = re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1)
        
        # Replace spaces and hyphens with underscores
        s3 = re.sub(r'[-\s]', '_', s2)
        
        # Convert to lowercase and remove duplicate underscores
        return re.sub(r'_+', '_', s3.lower()).strip('_')
        
    @staticmethod
    def to_kebab_case(text: str) -> str:
        """Convert to kebab-case."""
        # First convert to snake_case
        snake = CaseConverter.to_snake_case(text)
        
        # Replace underscores with hyphens
        return snake.replace('_', '-')
        
    @staticmethod
    def to_constant_case(text: str) -> str:
        """Convert to CONSTANT_CASE."""
        # Convert to snake_case first
        snake = CaseConverter.to_snake_case(text)
        
        # Convert to uppercase
        return snake.upper()
        
    @staticmethod
    def pluralize(word: str) -> str:
        """Simple pluralization (can be enhanced with inflect library)."""
        if not word:
            return word
            
        # Handle some common cases
        if word.endswith('y') and len(word) > 1 and word[-2] not in 'aeiou':
            return word[:-1] + 'ies'
        elif word.endswith(('s', 'ss', 'sh', 'ch', 'x', 'z')):
            return word + 'es'
        elif word.endswith('fe'):
            return word[:-2] + 'ves'
        elif word.endswith('f'):
            return word[:-1] + 'ves'
        else:
            return word + 's'
            
    @staticmethod
    def singularize(word: str) -> str:
        """Simple singularization (can be enhanced with inflect library)."""
        if not word:
            return word
            
        # Handle some common cases
        if word.endswith('ies') and len(word) > 3:
            return word[:-3] + 'y'
        elif word.endswith('es'):
            if word.endswith(('sses', 'shes', 'ches', 'xes', 'zes')):
                return word[:-2]
            return word[:-2]
        elif word.endswith('ves'):
            if len(word) > 3 and word[-4] not in 'aeiou':
                return word[:-3] + 'f'
            return word[:-3] + 'fe'
        elif word.endswith('s') and not word.endswith('ss'):
            return word[:-1]
        else:
            return word