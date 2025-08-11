"""Template registry for managing and organizing templates.

This module provides a registry system for templates, enabling:
- Template discovery and registration
- Template categorization and tagging
- Template versioning and updates
- Built-in template collections
"""

import logging
from typing import Dict, List, Optional, Set, Any
from dataclasses import dataclass, field
from pathlib import Path
import json
import yaml
from datetime import datetime

from orb_schema_generator.templates.engine import (
    TemplateEngine, TemplateConfig, TemplateFragment
)
from orb_schema_generator.core.exceptions import TemplateError


logger = logging.getLogger(__name__)


@dataclass
class TemplateMetadata:
    """Metadata for registered templates."""
    name: str
    path: str
    category: str
    version: str = "1.0.0"
    description: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    author: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    dependencies: List[str] = field(default_factory=list)
    parameters: Dict[str, Any] = field(default_factory=dict)
    
    def matches_tags(self, required_tags: List[str]) -> bool:
        """Check if template matches required tags."""
        return all(tag in self.tags for tag in required_tags)


class TemplateRegistry:
    """Registry for managing template collections."""
    
    def __init__(self, base_path: Optional[Path] = None):
        """Initialize the template registry.
        
        Args:
            base_path: Base path for template discovery
        """
        self.base_path = base_path or Path(__file__).parent / "templates"
        self._templates: Dict[str, TemplateMetadata] = {}
        self._categories: Dict[str, Set[str]] = {}
        self._tags: Dict[str, Set[str]] = {}
        
    def register_template(self, metadata: TemplateMetadata) -> None:
        """Register a template in the registry.
        
        Args:
            metadata: Template metadata
        """
        logger.debug(f"Registering template: {metadata.name}")
        
        self._templates[metadata.name] = metadata
        
        # Update category index
        if metadata.category not in self._categories:
            self._categories[metadata.category] = set()
        self._categories[metadata.category].add(metadata.name)
        
        # Update tag index
        for tag in metadata.tags:
            if tag not in self._tags:
                self._tags[tag] = set()
            self._tags[tag].add(metadata.name)
            
    def discover_templates(self, search_path: Optional[Path] = None) -> int:
        """Discover templates in the filesystem.
        
        Args:
            search_path: Path to search for templates
            
        Returns:
            Number of templates discovered
        """
        search_path = search_path or self.base_path
        discovered = 0
        
        logger.info(f"Discovering templates in: {search_path}")
        
        # Look for .jinja files
        for template_file in search_path.rglob("*.jinja"):
            # Look for accompanying metadata file
            metadata_file = template_file.with_suffix(".meta.yaml")
            
            if metadata_file.exists():
                # Load metadata from file
                with open(metadata_file) as f:
                    meta_data = yaml.safe_load(f)
                    
                metadata = TemplateMetadata(
                    name=meta_data.get('name', template_file.stem),
                    path=str(template_file.relative_to(search_path)),
                    category=meta_data.get('category', 'uncategorized'),
                    version=meta_data.get('version', '1.0.0'),
                    description=meta_data.get('description'),
                    tags=meta_data.get('tags', []),
                    author=meta_data.get('author'),
                    dependencies=meta_data.get('dependencies', []),
                    parameters=meta_data.get('parameters', {})
                )
            else:
                # Create basic metadata from filename
                category = template_file.parent.name
                if category == search_path.name:
                    category = 'uncategorized'
                    
                metadata = TemplateMetadata(
                    name=template_file.stem,
                    path=str(template_file.relative_to(search_path)),
                    category=category,
                    tags=self._infer_tags_from_name(template_file.stem)
                )
                
            self.register_template(metadata)
            discovered += 1
            
        logger.info(f"Discovered {discovered} templates")
        return discovered
        
    def _infer_tags_from_name(self, name: str) -> List[str]:
        """Infer tags from template name."""
        tags = []
        
        # Language tags
        if 'typescript' in name.lower() or 'ts' in name.lower():
            tags.append('typescript')
        if 'python' in name.lower() or 'py' in name.lower():
            tags.append('python')
        if 'graphql' in name.lower() or 'gql' in name.lower():
            tags.append('graphql')
            
        # Type tags
        if 'model' in name.lower():
            tags.append('model')
        if 'enum' in name.lower():
            tags.append('enum')
        if 'operation' in name.lower():
            tags.append('operation')
        if 'schema' in name.lower():
            tags.append('schema')
            
        # Target tags
        if 'dynamodb' in name.lower():
            tags.append('dynamodb')
        if 'lambda' in name.lower():
            tags.append('lambda')
        if 'appsync' in name.lower():
            tags.append('appsync')
            
        return tags
        
    def get_template(self, name: str) -> Optional[TemplateMetadata]:
        """Get template metadata by name.
        
        Args:
            name: Template name
            
        Returns:
            Template metadata or None
        """
        return self._templates.get(name)
        
    def list_templates(self, 
                      category: Optional[str] = None,
                      tags: Optional[List[str]] = None) -> List[TemplateMetadata]:
        """List templates matching criteria.
        
        Args:
            category: Filter by category
            tags: Filter by tags (all must match)
            
        Returns:
            List of matching templates
        """
        templates = list(self._templates.values())
        
        if category:
            templates = [t for t in templates if t.category == category]
            
        if tags:
            templates = [t for t in templates if t.matches_tags(tags)]
            
        return templates
        
    def get_categories(self) -> List[str]:
        """Get all registered categories."""
        return sorted(list(self._categories.keys()))
        
    def get_tags(self) -> List[str]:
        """Get all registered tags."""
        return sorted(list(self._tags.keys()))
        
    def export_registry(self, output_path: Path) -> None:
        """Export registry to JSON file.
        
        Args:
            output_path: Path to write registry
        """
        registry_data = {
            'templates': {
                name: {
                    'name': meta.name,
                    'path': meta.path,
                    'category': meta.category,
                    'version': meta.version,
                    'description': meta.description,
                    'tags': meta.tags,
                    'author': meta.author,
                    'dependencies': meta.dependencies,
                    'parameters': meta.parameters
                }
                for name, meta in self._templates.items()
            },
            'categories': {
                cat: list(templates)
                for cat, templates in self._categories.items()
            },
            'tags': {
                tag: list(templates)
                for tag, templates in self._tags.items()
            }
        }
        
        with open(output_path, 'w') as f:
            json.dump(registry_data, f, indent=2)
            
        logger.info(f"Exported registry to: {output_path}")
        
    def import_registry(self, input_path: Path) -> None:
        """Import registry from JSON file.
        
        Args:
            input_path: Path to registry file
        """
        with open(input_path) as f:
            registry_data = json.load(f)
            
        # Clear existing registry
        self._templates.clear()
        self._categories.clear()
        self._tags.clear()
        
        # Import templates
        for name, meta_dict in registry_data.get('templates', {}).items():
            metadata = TemplateMetadata(
                name=meta_dict['name'],
                path=meta_dict['path'],
                category=meta_dict['category'],
                version=meta_dict.get('version', '1.0.0'),
                description=meta_dict.get('description'),
                tags=meta_dict.get('tags', []),
                author=meta_dict.get('author'),
                dependencies=meta_dict.get('dependencies', []),
                parameters=meta_dict.get('parameters', {})
            )
            self.register_template(metadata)
            
        logger.info(f"Imported {len(self._templates)} templates from registry")


class BuiltInTemplates:
    """Collection of built-in templates for common use cases."""
    
    @staticmethod
    def get_typescript_model_template() -> str:
        """Get TypeScript model generation template."""
        return """
{%- extends "base/typescript.jinja" -%}
{%- import "fragments/typescript_type.jinja" as ts_type -%}
{%- import "fragments/input_types.jinja" as input_types -%}
{%- import "fragments/response_types.jinja" as response_types -%}
{%- import "fragments/query_input_types.jinja" as query_types -%}

{%- block imports -%}
// Import enums and models used in this model
{%- for attr in schema.attributes -%}
{%- if attr.enum_type %}
import { {{ attr.enum_type }} } from './{{ attr.enum_type }}Enum';
{%- endif -%}
{%- endfor -%}
{%- for model in model_imports %}
import { {{ model }}Model, I{{ model }}Model } from './{{ model }}Model';
{%- endfor -%}
{%- for enum in schema.enums %}
import { {{ enum }} } from './{{ enum }}Enum';
{%- endfor -%}
{%- endblock -%}

{%- block types -%}
// Input types
{{ input_types.render_input_types(schema) }}

// Query input types
{{ query_types.render_query_input_types(schema) }}

// Response types
{{ response_types.render_response_types(schema.name) }}

// Main model interface and class
{{ ts_type.render_typescript_type(schema, schema.name) }}
{%- endblock -%}
"""

    @staticmethod
    def get_graphql_operations_template() -> str:
        """Get GraphQL operations generation template."""
        return """
{%- import "fragments/graphql_operation.jinja" as gql_op -%}
// Auto-generated GraphQL operations for {{ schema.name }}
// Generated by orb-schema-generator

{%- for op in operations|dedupe_operations -%}
{{ gql_op.render_graphql_operation(op) }}
{%- endfor -%}
"""

    @staticmethod
    def get_python_model_template() -> str:
        """Get Python model generation template."""
        return """
{%- extends "base/python.jinja" -%}

{%- block imports -%}
from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field
{%- for enum in schema.enums %}
from .{{ enum|to_snake_case }}_enum import {{ enum }}
{%- endfor -%}
{%- endblock -%}

{%- block models -%}
class {{ schema.name }}(BaseModel):
    \"\"\"{{ schema.description or schema.name + ' model' }}\"\"\"
    {%- for attr in schema.attributes %}
    {{ attr.name|to_snake_case }}: {% if attr.required %}{{ attr.type|to_python_type }}{% else %}Optional[{{ attr.type|to_python_type }}]{% endif %} = Field(
        {%- if not attr.required %}None, {% endif -%}
        description="{{ attr.description or attr.name }}"
    )
    {%- endfor %}
    
    class Config:
        use_enum_values = True
        json_encoders = {
            datetime: lambda v: int(v.timestamp())
        }
{%- endblock -%}
"""

    @staticmethod
    def register_all(registry: TemplateRegistry) -> None:
        """Register all built-in templates.
        
        Args:
            registry: Template registry to register with
        """
        built_ins = [
            TemplateMetadata(
                name="typescript_model",
                path="built-in/typescript_model.jinja",
                category="typescript",
                description="TypeScript model with interfaces and classes",
                tags=["typescript", "model", "dynamodb"],
                parameters={
                    "schema": "Schema object",
                    "model_imports": "List of model imports"
                }
            ),
            TemplateMetadata(
                name="graphql_operations",
                path="built-in/graphql_operations.jinja",
                category="graphql",
                description="GraphQL operations with deduplication",
                tags=["graphql", "operations"],
                parameters={
                    "schema": "Schema object",
                    "operations": "List of operations"
                }
            ),
            TemplateMetadata(
                name="python_model",
                path="built-in/python_model.jinja",
                category="python",
                description="Python Pydantic model",
                tags=["python", "model", "pydantic"],
                parameters={
                    "schema": "Schema object"
                }
            ),
        ]
        
        for metadata in built_ins:
            registry.register_template(metadata)
            
        logger.info(f"Registered {len(built_ins)} built-in templates")