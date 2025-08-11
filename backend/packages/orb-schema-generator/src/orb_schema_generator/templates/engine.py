"""Simple template engine wrapper around Jinja2.

This module provides a simple wrapper around Jinja2 for template rendering,
similar to how generate.py works.
"""

import logging
from typing import Dict, Any, Optional
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from orb_schema_generator.core.converters import CaseConverter


logger = logging.getLogger(__name__)


class TemplateEngine:
    """Simple Jinja2 template engine for code generation."""
    
    def __init__(self, template_dir: Path):
        """Initialize the template engine.
        
        Args:
            template_dir: Directory containing template files
        """
        self.template_dir = template_dir
        self.case_converter = CaseConverter()
        
        # Set up Jinja2 environment like generate.py
        self.env = Environment(
            loader=FileSystemLoader(str(template_dir)),
            autoescape=select_autoescape(['html', 'xml']),
            trim_blocks=False,
            lstrip_blocks=False,
            keep_trailing_newline=True,
            extensions=['jinja2.ext.do']
        )
        
        # Add filters
        self._setup_filters()
        
    def _setup_filters(self) -> None:
        """Set up template filters."""
        # Case conversion filters
        self.env.filters['to_camel_case'] = self.case_converter.to_camel_case
        self.env.filters['to_pascal_case'] = self.case_converter.to_pascal_case
        self.env.filters['to_snake_case'] = self.case_converter.to_snake_case
        self.env.filters['to_kebab_case'] = self.case_converter.to_kebab_case
        
        # Type conversion filters
        self.env.filters['to_typescript_type'] = self._to_typescript_type
        self.env.filters['to_python_type'] = self._to_python_type
        self.env.filters['to_graphql_type'] = self._to_graphql_type
        
    def render(self, template_name: str, context: Dict[str, Any]) -> str:
        """Render a template with the given context.
        
        Args:
            template_name: Name of the template file
            context: Context data for rendering
            
        Returns:
            Rendered content
        """
        template = self.env.get_template(template_name)
        return template.render(**context)
        
    def _to_typescript_type(self, attr_type: str) -> str:
        """Convert schema type to TypeScript type."""
        type_mapping = {
            'string': 'string',
            'number': 'number',
            'boolean': 'boolean',
            'array': 'string[]',
            'object': 'Record<string, any>',
            'timestamp': 'number',
            'date': 'number',
            'map': 'Record<string, any>',
            'set': 'Set<string>',
            'binary': 'Buffer',
            'null': 'null',
            'any': 'any'
        }
        
        # Check if it's already a TypeScript type (like IUser)
        if attr_type.startswith('I') and len(attr_type) > 1 and attr_type[1].isupper():
            return attr_type
            
        return type_mapping.get(attr_type.lower(), attr_type)
        
    def _to_python_type(self, attr_type: str) -> str:
        """Convert schema type to Python type."""
        type_mapping = {
            'string': 'str',
            'number': 'int',
            'boolean': 'bool',
            'array': 'List[str]',
            'object': 'Dict[str, Any]',
            'timestamp': 'int',
            'date': 'int',
            'map': 'Dict[str, Any]',
            'set': 'Set[str]',
            'binary': 'bytes',
            'null': 'None'
        }
        return type_mapping.get(attr_type.lower(), 'Any')
        
    def _to_graphql_type(self, attr_type: str) -> str:
        """Convert schema type to GraphQL type."""
        type_mapping = {
            'string': 'String',
            'number': 'Int',
            'boolean': 'Boolean',
            'object': 'String',
            'array': '[String]',
            'timestamp': 'Int',
            'ID': 'ID',
            'int': 'Int',
            'float': 'Float',
            'double': 'Float',
            'bigint': 'String',
            'any': 'String',
        }
        return type_mapping.get(attr_type, attr_type)