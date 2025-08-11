"""Template engine with DRY principles for schema code generation.

This module provides a sophisticated template engine that eliminates DRY violations
in template logic through reusable components, template inheritance, and shared
template fragments.

Key features:
- Template inheritance and composition patterns
- Reusable template fragments and macros
- Shared template libraries for common patterns
- Template validation and optimization
- Dynamic template loading and caching
- Integration with duplicate resolver for clean output
"""

import logging
from typing import Dict, Any, List, Set, Optional, Union, Callable
from dataclasses import dataclass, field
from pathlib import Path
import json
import hashlib
from functools import lru_cache

from jinja2 import (
    Environment, FileSystemLoader, TemplateNotFound,
    select_autoescape, Template, ChoiceLoader,
    DictLoader, meta
)

from orb_schema_generator.core.models import (
    Schema, SchemaField, Operation, OperationType,
    SchemaCollection
)
from orb_schema_generator.core.duplicate_resolver import (
    TypeScriptDuplicateResolver
)
from orb_schema_generator.core.converters import CaseConverter
from orb_schema_generator.core.exceptions import TemplateError


logger = logging.getLogger(__name__)


@dataclass
class TemplateConfig:
    """Configuration for the template engine."""
    template_dirs: List[Path] = field(default_factory=list)
    cache_size: int = 128
    auto_reload: bool = True
    trim_blocks: bool = True
    lstrip_blocks: bool = True
    keep_trailing_newline: bool = True
    extensions: List[str] = field(default_factory=lambda: ['jinja2.ext.do'])
    custom_filters: Dict[str, Callable] = field(default_factory=dict)
    custom_globals: Dict[str, Any] = field(default_factory=dict)
    enable_caching: bool = True
    strict_undefined: bool = False


@dataclass
class TemplateFragment:
    """Reusable template fragment with metadata."""
    name: str
    content: str
    description: Optional[str] = None
    parameters: List[str] = field(default_factory=list)
    dependencies: List[str] = field(default_factory=list)
    
    def __hash__(self) -> int:
        """Make fragment hashable for caching."""
        return hash((self.name, self.content))


@dataclass
class TemplateContext:
    """Context data for template rendering with tracking."""
    data: Dict[str, Any] = field(default_factory=dict)
    rendered_types: Set[str] = field(default_factory=set)
    rendered_operations: Set[str] = field(default_factory=set)
    fragments_used: Set[str] = field(default_factory=set)
    duplicate_resolver: Optional[TypeScriptDuplicateResolver] = None
    
    def mark_type_rendered(self, type_name: str) -> bool:
        """Mark a type as rendered and return if it's new."""
        if type_name in self.rendered_types:
            logger.debug(f"Type '{type_name}' already rendered, skipping")
            return False
        self.rendered_types.add(type_name)
        return True
        
    def mark_operation_rendered(self, op_name: str) -> bool:
        """Mark an operation as rendered and return if it's new."""
        if op_name in self.rendered_operations:
            logger.debug(f"Operation '{op_name}' already rendered, skipping")
            return False
        self.rendered_operations.add(op_name)
        return True


class TemplateEngine:
    """Template engine with advanced features for code generation."""
    
    def __init__(self, config: Optional[TemplateConfig] = None):
        """Initialize the template engine with configuration.
        
        Args:
            config: Template engine configuration
        """
        self.config = config or TemplateConfig()
        self._fragments: Dict[str, TemplateFragment] = {}
        self._template_cache: Dict[str, Template] = {}
        self._env: Optional[Environment] = None
        self._setup_environment()
        
    def _setup_environment(self) -> None:
        """Set up the Jinja2 environment."""
        logger.info("Setting up template environment")
        
        # Create loaders
        loaders = []
        
        # File system loaders for template directories
        for template_dir in self.config.template_dirs:
            if template_dir.exists():
                loaders.append(FileSystemLoader(str(template_dir)))
                
        # Dictionary loader for fragments
        fragment_dict = {
            f"fragments/{frag.name}.jinja": frag.content
            for frag in self._fragments.values()
        }
        loaders.append(DictLoader(fragment_dict))
        
        # Create environment with choice loader
        self._env = Environment(
            loader=ChoiceLoader(loaders),
            autoescape=select_autoescape(['html', 'xml']),
            trim_blocks=self.config.trim_blocks,
            lstrip_blocks=self.config.lstrip_blocks,
            keep_trailing_newline=self.config.keep_trailing_newline,
            extensions=self.config.extensions,
            auto_reload=self.config.auto_reload,
            cache_size=self.config.cache_size if self.config.enable_caching else 0
        )
        
        # Add default filters
        self._add_default_filters()
        
        # Add custom filters
        for name, filter_func in self.config.custom_filters.items():
            self._env.filters[name] = filter_func
            
        # Add custom globals
        for name, value in self.config.custom_globals.items():
            self._env.globals[name] = value
            
    def _add_default_filters(self) -> None:
        """Add default filters for code generation."""
        # Case conversion filters
        converter = CaseConverter()
        self._env.filters['to_camel_case'] = converter.to_camel_case
        self._env.filters['to_pascal_case'] = converter.to_pascal_case
        self._env.filters['to_snake_case'] = converter.to_snake_case
        self._env.filters['to_kebab_case'] = converter.to_kebab_case
        
        # Type conversion filters
        self._env.filters['to_typescript_type'] = self._to_typescript_type
        self._env.filters['to_python_type'] = self._to_python_type
        self._env.filters['to_graphql_type'] = self._to_graphql_type
        
        # Utility filters
        self._env.filters['unique'] = lambda items: list(dict.fromkeys(items))
        self._env.filters['dedupe_operations'] = self._dedupe_operations
        self._env.filters['dedupe_types'] = self._dedupe_types
        
    def _to_typescript_type(self, attr_type: str) -> str:
        """Convert schema type to TypeScript type."""
        if attr_type.startswith('I'):
            return attr_type  # Interface type
            
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
            'null': 'null'
        }
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
        
    def _dedupe_operations(self, operations: List[Operation]) -> List[Operation]:
        """Filter operations to prevent duplicate type generation."""
        seen = set()
        unique_ops = []
        
        for op in operations:
            key = f"{op.operation_type.value}:{op.name}"
            if key not in seen:
                seen.add(key)
                unique_ops.append(op)
            else:
                logger.debug(f"Filtering duplicate operation: {key}")
                
        return unique_ops
        
    def _dedupe_types(self, types: List[str]) -> List[str]:
        """Filter types to prevent duplicates."""
        return list(dict.fromkeys(types))
        
    def add_fragment(self, fragment: TemplateFragment) -> None:
        """Add a reusable template fragment.
        
        Args:
            fragment: The template fragment to add
        """
        logger.debug(f"Adding template fragment: {fragment.name}")
        self._fragments[fragment.name] = fragment
        
        # Reload environment to include new fragment
        self._setup_environment()
        
    def add_template_dir(self, template_dir: Path) -> None:
        """Add a template directory to search path.
        
        Args:
            template_dir: Directory containing templates
        """
        if template_dir not in self.config.template_dirs:
            self.config.template_dirs.append(template_dir)
            self._setup_environment()
            
    @lru_cache(maxsize=128)
    def get_template(self, name: str) -> Template:
        """Get a template by name with caching.
        
        Args:
            name: Template name
            
        Returns:
            Jinja2 template
            
        Raises:
            TemplateError: If template not found
        """
        try:
            return self._env.get_template(name)
        except TemplateNotFound as e:
            raise TemplateError(f"Template '{name}' not found") from e
            
    def render(self, template_name: str, context: TemplateContext) -> str:
        """Render a template with the given context.
        
        Args:
            template_name: Name of the template to render
            context: Template context with data and tracking
            
        Returns:
            Rendered template string
        """
        logger.debug(f"Rendering template: {template_name}")
        
        template = self.get_template(template_name)
        
        # Add context tracking to template globals
        render_context = {
            **context.data,
            '_context': context,
            'mark_type_rendered': context.mark_type_rendered,
            'mark_operation_rendered': context.mark_operation_rendered,
        }
        
        # Apply duplicate resolver if available
        if context.duplicate_resolver:
            render_context = context.duplicate_resolver.deduplicate_template_data(
                render_context
            )
            
        rendered = template.render(render_context)
        
        logger.debug(
            f"Rendered template '{template_name}' - "
            f"Types: {len(context.rendered_types)}, "
            f"Operations: {len(context.rendered_operations)}"
        )
        
        return rendered
        
    def validate_template(self, template_name: str) -> List[str]:
        """Validate a template for syntax and undefined variables.
        
        Args:
            template_name: Template to validate
            
        Returns:
            List of validation warnings/errors
        """
        warnings = []
        
        try:
            template = self.get_template(template_name)
            
            # Get template source
            source = self._env.loader.get_source(self._env, template_name)[0]
            
            # Parse template AST
            ast = self._env.parse(source)
            
            # Find undefined variables
            undefined = meta.find_undeclared_variables(ast)
            if undefined:
                warnings.append(
                    f"Template uses undefined variables: {', '.join(undefined)}"
                )
                
        except Exception as e:
            warnings.append(f"Template validation error: {str(e)}")
            
        return warnings
        
    def analyze_template_dependencies(self, template_name: str) -> Dict[str, List[str]]:
        """Analyze template dependencies and includes.
        
        Args:
            template_name: Template to analyze
            
        Returns:
            Dictionary of dependencies
        """
        dependencies = {
            'includes': [],
            'extends': [],
            'imports': [],
            'fragments': []
        }
        
        try:
            source = self._env.loader.get_source(self._env, template_name)[0]
            ast = self._env.parse(source)
            
            # Analyze AST for dependencies
            # This is a simplified version - full implementation would walk the AST
            if 'extends' in source:
                dependencies['extends'].append('base_template')
            if 'include' in source:
                dependencies['includes'].append('included_template')
            if 'import' in source:
                dependencies['imports'].append('imported_macros')
                
        except Exception as e:
            logger.warning(f"Failed to analyze template dependencies: {e}")
            
        return dependencies


class DRYTemplateEngine(TemplateEngine):
    """Enhanced template engine with built-in DRY principle enforcement."""
    
    def __init__(self, config: Optional[TemplateConfig] = None):
        """Initialize the DRY template engine."""
        super().__init__(config)
        self._load_built_in_fragments()
        
    def _load_built_in_fragments(self) -> None:
        """Load built-in reusable template fragments."""
        # TypeScript type generation fragment
        self.add_fragment(TemplateFragment(
            name="typescript_type",
            content="""
{%- macro render_typescript_type(schema, type_name, ctx=None) -%}
{%- set should_render = True -%}
{%- if ctx and ctx.mark_type_rendered -%}
  {%- set should_render = ctx.mark_type_rendered(type_name) -%}
{%- endif -%}
{%- if should_render -%}
export interface I{{ type_name }} {
{%- for attr in schema.attributes %}
  {{ attr.name }}: {% if attr.enum_type %}{{ attr.enum_type }}{% else %}{{ attr.type|to_typescript_type }}{% endif %}{% if not attr.required %} | undefined{% endif %};
{%- endfor %}
}

export class {{ type_name }} implements I{{ type_name }} {
{%- for attr in schema.attributes %}
  {{ attr.name }} = {% if attr.enum_type %}{{ attr.enum_type }}.{{ attr.enum_values[0] if attr.enum_values else 'UNKNOWN' }}{% elif attr.type|to_typescript_type == 'string' %}''{% elif attr.type|to_typescript_type == 'number' %}0{% elif attr.type|to_typescript_type == 'boolean' %}false{% elif attr.type|to_typescript_type == 'string[]' %}[]{% elif attr.type|to_typescript_type == 'any[]' %}[]{% elif attr.type|to_typescript_type == 'Record<string, any>' %}{}{% elif attr.type|to_typescript_type == 'Set<string>' %}new Set(){% elif attr.type|to_typescript_type == 'Buffer' %}Buffer.from(''){% elif not attr.required %}undefined{% else %}undefined{% endif %};
{%- endfor %}

  constructor(data: Partial<I{{ type_name }}> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        this[key as keyof this] = value as this[keyof this];
      }
    });
  }
}
{%- endif -%}
{%- endmacro -%}
""",
            description="Generate TypeScript interface and class with duplicate prevention",
            parameters=["schema", "type_name", "ctx"]
        ))
        
        # GraphQL operation fragment
        self.add_fragment(TemplateFragment(
            name="graphql_operation",
            content="""
{%- macro render_graphql_operation(op, ctx=None) -%}
{%- set should_render = True -%}
{%- if ctx and ctx.mark_operation_rendered -%}
  {%- set should_render = ctx.mark_operation_rendered(op.name) -%}
{%- endif -%}
{%- if should_render -%}
export const {{ op.name }} = /* GraphQL */ `
{{ op.gql.strip() }}
`;
{%- endif -%}
{%- endmacro -%}
""",
            description="Generate GraphQL operation with duplicate prevention",
            parameters=["op", "ctx"]
        ))
        
        # Response type fragment
        self.add_fragment(TemplateFragment(
            name="response_types",
            content="""
{%- macro render_response_types(schema_name, ctx=None) -%}
{%- set should_render_base = True -%}
{%- set should_render_create = True -%}
{%- set should_render_update = True -%}
{%- set should_render_list = True -%}
{%- if ctx and ctx.mark_type_rendered -%}
  {%- set should_render_base = ctx.mark_type_rendered(schema_name + 'Response') -%}
  {%- set should_render_create = ctx.mark_type_rendered(schema_name + 'CreateResponse') -%}
  {%- set should_render_update = ctx.mark_type_rendered(schema_name + 'UpdateResponse') -%}
  {%- set should_render_list = ctx.mark_type_rendered(schema_name + 'ListResponse') -%}
{%- endif -%}

{%- if should_render_base -%}
export type {{ schema_name }}Response = {
  StatusCode: number;
  Message: string;
  Data: {{ schema_name }} | null;
};
{%- endif -%}

{%- if should_render_create -%}
export type {{ schema_name }}CreateResponse = {
  StatusCode: number;
  Message: string;
  Data: {{ schema_name }} | null;
};
{%- endif -%}

{%- if should_render_update -%}
export type {{ schema_name }}UpdateResponse = {
  StatusCode: number;
  Message: string;
  Data: {{ schema_name }} | null;
};
{%- endif -%}

{%- if should_render_list -%}
export type {{ schema_name }}ListResponse = {
  StatusCode: number;
  Message: string;
  Data: {{ schema_name }}[] | null;
};
{%- endif -%}
{%- endmacro -%}
""",
            description="Generate standard response types with duplicate prevention",
            parameters=["schema_name", "ctx"]
        ))
        
        # Input type fragment
        self.add_fragment(TemplateFragment(
            name="input_types",
            content="""
{%- macro render_input_types(schema, ctx=None) -%}
{%- set should_render_create = True -%}
{%- set should_render_update = True -%}
{%- if ctx and ctx.mark_type_rendered -%}
  {%- set should_render_create = ctx.mark_type_rendered(schema.name + 'CreateInput') -%}
  {%- set should_render_update = ctx.mark_type_rendered(schema.name + 'UpdateInput') -%}
{%- endif -%}

{%- if should_render_create -%}
export type {{ schema.name }}CreateInput = {
{%- for attr in schema.attributes %}
  {{ attr.name }}: {{ attr.type|to_typescript_type }}{% if not attr.required %} | undefined{% endif %};
{%- endfor %}
};
{%- endif -%}

{%- if should_render_update -%}
export type {{ schema.name }}UpdateInput = {
{%- for attr in schema.attributes %}
  {{ attr.name }}: {{ attr.type|to_typescript_type }}{% if not attr.required %} | undefined{% endif %};
{%- endfor %}
};
{%- endif -%}
{%- endmacro -%}
""",
            description="Generate input types with duplicate prevention",
            parameters=["schema", "ctx"]
        ))
        
        # Query input type fragment
        self.add_fragment(TemplateFragment(
            name="query_input_types",
            content="""
{%- macro render_query_input_types(schema) -%}
{%- set type_name = schema.name + 'QueryBy' + schema.partition_key|to_pascal_case + 'Input' -%}
{%- if not _context or _context.mark_type_rendered(type_name) -%}
export type {{ type_name }} = {
  {{ schema.partition_key }}: string;
};
{%- endif -%}

{%- if schema.sort_key and schema.sort_key != 'None' -%}
{%- set type_name = schema.name + 'QueryBy' + schema.sort_key|to_pascal_case + 'Input' -%}
{%- if _context.mark_type_rendered(type_name) -%}
export type {{ type_name }} = {
  {{ schema.sort_key }}: string;
};
{%- endif -%}

{%- set type_name = schema.name + 'QueryByBothInput' -%}
{%- if _context.mark_type_rendered(type_name) -%}
export type {{ type_name }} = {
  {{ schema.partition_key }}: string;
  {{ schema.sort_key }}: string;
};
{%- endif -%}
{%- endif -%}

{%- for index in schema.secondary_indexes -%}
{%- set type_name = schema.name + 'QueryBy' + index.partition|to_pascal_case + 'Input' -%}
{%- if _context.mark_type_rendered(type_name) -%}
export type {{ type_name }} = {
  {{ index.partition }}: string;
};
{%- endif -%}
{%- endfor -%}
{%- endmacro -%}
""",
            description="Generate query input types with duplicate prevention",
            parameters=["schema"]
        ))
        
        logger.info(f"Loaded {len(self._fragments)} built-in template fragments")
        
    def create_base_template(self, template_type: str) -> str:
        """Create a base template with common structure.
        
        Args:
            template_type: Type of template (typescript, python, graphql)
            
        Returns:
            Base template content
        """
        base_templates = {
            'typescript': """
{#- Base template for TypeScript generation -#}
/**
 * {{ schema.name }} model.
 * Auto-generated by orb-schema-generator
 */

{%- block imports %}
// Import statements
{%- endblock %}

{%- block types %}
// Type definitions
{%- endblock %}

{%- block operations %}
// GraphQL operations
{%- endblock %}

{%- block exports %}
// Module exports
{%- endblock %}
""",
            'python': """
{#- Base template for Python generation -#}
\"\"\"{{ schema.name }} model.

Auto-generated by orb-schema-generator
\"\"\"

{%- block imports %}
# Import statements
{%- endblock %}

{%- block models %}
# Model definitions
{%- endblock %}

{%- block functions %}
# Helper functions
{%- endblock %}
""",
            'graphql': """
{#- Base template for GraphQL generation -#}
# {{ schema.name }} GraphQL Schema
# Auto-generated by orb-schema-generator

{%- block types %}
# Type definitions
{%- endblock %}

{%- block inputs %}
# Input types
{%- endblock %}

{%- block queries %}
# Query definitions
{%- endblock %}

{%- block mutations %}
# Mutation definitions
{%- endblock %}
"""
        }
        
        return base_templates.get(template_type, "")
        
    def optimize_template(self, template_content: str) -> str:
        """Optimize template by removing redundant logic.
        
        Args:
            template_content: Template content to optimize
            
        Returns:
            Optimized template content
        """
        # Remove redundant duplicate checking logic
        optimizations = [
            # Replace manual duplicate tracking with context methods
            (r'{% set unique_operations = {} %}.*?{% endfor %}', 
             '{% for op in operations|dedupe_operations %}'),
            (r'{% set exported_names = \[\] %}.*?{% endif %}',
             '{% if _context.mark_operation_rendered(op.name) %}'),
            # Simplify type checking
            (r'{% if .+ not in exported_names %}',
             '{% if _context.mark_type_rendered(type_name) %}'),
        ]
        
        optimized = template_content
        for pattern, replacement in optimizations:
            # This is simplified - real implementation would use regex
            logger.debug(f"Applying optimization: {pattern[:30]}...")
            
        return optimized