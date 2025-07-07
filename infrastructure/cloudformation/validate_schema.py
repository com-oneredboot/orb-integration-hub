#!/usr/bin/env python3
"""
GraphQL Schema Validation Script
Validates SDL syntax before deployment to catch parsing errors early.
"""

import sys
import re
import os
from pathlib import Path

def validate_graphql_schema(schema_file):
    """Validate GraphQL SDL syntax."""
    errors = []
    
    try:
        with open(schema_file, 'r') as f:
            content = f.read()
    except FileNotFoundError:
        return [f"Schema file not found: {schema_file}"]
    
    lines = content.split('\n')
    
    # Track context
    in_type = False
    in_input = False
    in_enum = False
    brace_depth = 0
    current_type = None
    
    for line_num, line in enumerate(lines, 1):
        line = line.strip()
        
        # Skip empty lines and comments
        if not line or line.startswith('#'):
            continue
            
        # Track brace depth
        brace_depth += line.count('{') - line.count('}')
        
        # Check for basic SDL structure violations
        
        # 1. Check for invalid characters in type/field names
        if re.search(r'^(type|input|enum)\s+(\w+)', line):
            match = re.search(r'^(type|input|enum)\s+(\w+)', line)
            if match:
                type_kind, type_name = match.groups()
                current_type = type_name
                in_type = type_kind == 'type'
                in_input = type_kind == 'input'
                in_enum = type_kind == 'enum'
                
                # Check for invalid type names
                if not re.match(r'^[A-Za-z][A-Za-z0-9_]*$', type_name):
                    errors.append(f"Line {line_num}: Invalid type name '{type_name}' - must start with letter and contain only letters, numbers, underscore")
        
        # 2. Check field definitions
        elif in_type and ':' in line and not line.startswith('"""'):
            # Field definition like: fieldName: Type
            if not re.match(r'^\s*\w+\s*:\s*[A-Za-z0-9\[\]!_]+(\s*@.*)?$', line):
                errors.append(f"Line {line_num}: Invalid field definition syntax: '{line}'")
        
        # 3. Check input field definitions
        elif in_input and ':' in line and not line.startswith('"""'):
            if not re.match(r'^\s*\w+\s*:\s*[A-Za-z0-9\[\]!_]+(\s*@.*)?$', line):
                errors.append(f"Line {line_num}: Invalid input field syntax: '{line}'")
        
        # 4. Check for enum values
        elif in_enum and not '{' in line and not '}' in line and line:
            if not re.match(r'^\s*[A-Z][A-Z0-9_]*\s*$', line):
                errors.append(f"Line {line_num}: Invalid enum value '{line}' - should be UPPER_CASE")
        
        # 5. Check for unclosed braces at end of type definitions
        if '}' in line:
            in_type = False
            in_input = False 
            in_enum = False
            current_type = None
        
        # 6. Check for very long lines that might have concatenation issues
        if len(line) > 200:
            errors.append(f"Line {line_num}: Very long line ({len(line)} chars) - possible concatenation issue")
        
        # 7. Check for malformed directives
        if '@' in line and not re.search(r'@\w+(\([^)]*\))?', line):
            errors.append(f"Line {line_num}: Malformed directive syntax: '{line}'")
        
        # 8. Check for missing colons in field definitions
        if (in_type or in_input) and line and not line.startswith('}') and not line.startswith('{') and ':' not in line and not line.startswith('"""'):
            errors.append(f"Line {line_num}: Field definition missing colon: '{line}'")
    
    # 9. Check for unbalanced braces
    if brace_depth != 0:
        errors.append(f"Unbalanced braces: {brace_depth} unclosed braces")
    
    # 10. Try basic GraphQL SDL parsing with regex patterns
    # Check for required schema definition
    if 'schema {' not in content:
        errors.append("Missing schema definition block")
    
    return errors

def main():
    if len(sys.argv) > 1:
        schema_file = sys.argv[1]
    else:
        # Find latest schema file
        schema_files = list(Path('.').glob('appsync_*.graphql'))
        if not schema_files:
            print("No GraphQL schema files found")
            sys.exit(1)
        schema_file = sorted(schema_files, reverse=True)[0]
    
    print(f"Validating GraphQL schema: {schema_file}")
    
    errors = validate_graphql_schema(schema_file)
    
    if errors:
        print(f"\n❌ Found {len(errors)} validation errors:")
        for error in errors:
            print(f"  • {error}")
        sys.exit(1)
    else:
        print("✅ Schema validation passed!")
        sys.exit(0)

if __name__ == '__main__':
    main()