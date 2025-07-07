#!/usr/bin/env python3
"""
Quick test script to verify the Jinja template fix for Field definitions.
This generates just one model to test the line break fix.
"""

import os
import sys
from datetime import datetime
from jinja2 import Environment, FileSystemLoader
from dataclasses import dataclass
from typing import List, Optional

# Get the directory where this script is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

@dataclass
class Attribute:
    name: str
    type: str
    description: str = ""
    required: bool = True
    enum_type: Optional[str] = None
    enum_values: Optional[List[str]] = None

@dataclass
class TableSchema:
    name: str
    attributes: List[Attribute]
    partition_key: str
    sort_key: str = 'None'
    secondary_indexes: Optional[List] = None
    auth_config: Optional[dict] = None
    type: str = 'dynamodb'

def to_snake_case(s: str) -> str:
    """Convert string to snake_case."""
    import re
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', s)
    s2 = re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1)
    return re.sub(r'[-\s]', '_', s2).lower()

def to_pascal_case(s: str) -> str:
    """Convert string to PascalCase."""
    import re
    if not s:
        return s
    
    # First split by underscores and hyphens
    words = re.split(r'[_-]', s)
    result = []
    
    for word in words:
        # Handle empty strings
        if not word:
            continue
            
        # Split on camelCase boundaries
        parts = re.findall(r'[A-Z]?[a-z]+|[A-Z]{2,}(?=[A-Z][a-z]|\d|\W|\Z)|[A-Z]{2,}|[A-Z][a-z]+|\d+', word)
        
        # Handle case where the word starts with a lowercase letter
        if word[0].islower() and parts:
            parts[0] = parts[0].lower()
            
        result.extend(parts)
    
    # Capitalize each word and join them
    return ''.join(word.capitalize() for word in result)

def setup_jinja_env() -> Environment:
    """Set up the Jinja environment."""
    env = Environment(
        loader=FileSystemLoader(os.path.join(SCRIPT_DIR, 'templates')),
        trim_blocks=True,
        lstrip_blocks=True,
        keep_trailing_newline=True
    )
    
    # Add custom filters
    env.filters['to_snake_case'] = to_snake_case
    env.filters['to_pascal_case'] = to_pascal_case
    
    return env

def test_template_fix():
    """Test the template fix with a sample schema."""
    
    # Create a test schema with multiple attributes
    test_attributes = [
        Attribute(name="organizationId", type="string", description="Unique identifier for the organization", required=True),
        Attribute(name="name", type="string", description="Name of the organization", required=True),
        Attribute(name="description", type="string", description="Optional description", required=False),
        Attribute(name="ownerId", type="string", description="ID of the owner", required=True),
        Attribute(name="status", type="string", description="Current status", required=True, enum_type="OrganizationStatus"),
        Attribute(name="createdAt", type="timestamp", description="When created", required=True),
        Attribute(name="updatedAt", type="timestamp", description="When updated", required=True),
    ]
    
    test_schema = TableSchema(
        name="Organizations",
        attributes=test_attributes,
        partition_key="organizationId",
        sort_key="None",
        secondary_indexes=[]
    )
    
    # Set up Jinja environment and render template
    jinja_env = setup_jinja_env()
    template = jinja_env.get_template('python_model.jinja')
    content = template.render(schema=test_schema, timestamp=datetime.utcnow().isoformat())
    
    # Write to a test file
    output_path = os.path.join(SCRIPT_DIR, 'test_output.py')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Generated test model at: {output_path}")
    
    # Show the class definition part to verify the fix
    lines = content.split('\n')
    in_class_def = False
    field_lines = []
    
    for line in lines:
        if 'class Organizations(BaseModel):' in line:
            in_class_def = True
        elif in_class_def and line.strip().startswith('@validator'):
            break
        elif in_class_def and '= Field(' in line:
            field_lines.append(line)
    
    print("\nField definitions found:")
    for i, line in enumerate(field_lines, 1):
        print(f"{i}: {line.strip()}")
    
    # Check if each field is on its own line
    if len(field_lines) == len(test_attributes):
        print(f"\n✅ SUCCESS: Found {len(field_lines)} separate field definition lines (expected {len(test_attributes)})")
        return True
    else:
        print(f"\n❌ FAILED: Found {len(field_lines)} field lines, expected {len(test_attributes)}")
        return False

if __name__ == '__main__':
    success = test_template_fix()
    sys.exit(0 if success else 1)