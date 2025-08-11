"""TypeScript code generator using Jinja2 templates.

This module generates TypeScript code from schemas using the same approach
as the original generate.py - loading and rendering Jinja2 templates.
"""

import logging
from typing import Dict, Any, List, Optional, Set
from pathlib import Path
from dataclasses import dataclass, field

from jinja2 import Environment, FileSystemLoader, select_autoescape

from orb_schema_generator.core.models import (
    Schema, SchemaCollection, Operation, OperationType,
    SchemaField
)
from orb_schema_generator.core.converters import CaseConverter
from orb_schema_generator.core.exceptions import GenerationError


logger = logging.getLogger(__name__)


@dataclass
class TypeScriptGeneratorConfig:
    """Configuration for TypeScript generation."""
    output_dir: Path
    template_dir: Optional[Path] = None
    template_name: str = "typescript_dynamodb.jinja"


class TypeScriptGenerator:
    """Generates TypeScript code from schemas using Jinja2 templates."""
    
    def __init__(self, config: TypeScriptGeneratorConfig):
        """Initialize the TypeScript generator.
        
        Args:
            config: Generator configuration
        """
        self.config = config
        self.case_converter = CaseConverter()
        
        # Set up Jinja2 environment
        template_dir = config.template_dir
        if not template_dir:
            # Default to templates directory in package root
            template_dir = Path(__file__).parent.parent.parent.parent / "templates"
            
        self.env = Environment(
            loader=FileSystemLoader(str(template_dir)),
            autoescape=select_autoescape(['html', 'xml']),
            trim_blocks=False,
            lstrip_blocks=False,
            keep_trailing_newline=True,
            extensions=['jinja2.ext.do']
        )
        
        # Add filters - matching those in generate.py
        self.env.filters['to_camel_case'] = self.case_converter.to_camel_case
        self.env.filters['to_pascal_case'] = self.case_converter.to_pascal_case
        self.env.filters['to_snake_case'] = self.case_converter.to_snake_case
        self.env.filters['to_kebab_case'] = self.case_converter.to_kebab_case
        self.env.filters['to_typescript_type'] = self._to_typescript_type
        
        # Track generated files
        self._generated_files: List[Path] = []
        
    def generate(self, collection: SchemaCollection) -> Dict[str, Any]:
        """Generate TypeScript code from schema collection.
        
        Args:
            collection: Collection of schemas to generate from
            
        Returns:
            Generation results including file paths and statistics
        """
        logger.info(f"Generating TypeScript code for {len(collection.schemas)} schemas")
        
        results = {
            'generated_files': [],
            'errors': []
        }
        
        # Ensure output directory exists
        self.config.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Get all model names for imports
        all_model_names = [schema.name for schema in collection.schemas]
        
        # Generate models for each schema
        for schema in collection.schemas:
            try:
                self._generate_schema_model(schema, all_model_names, results)
            except Exception as e:
                logger.error(f"Failed to generate model for {schema.name}: {e}")
                results['errors'].append({
                    'schema': schema.name,
                    'error': str(e)
                })
                
        # Generate GraphQL operations if present
        if collection.operations:
            try:
                self._generate_operations(collection.operations, results)
            except Exception as e:
                logger.error(f"Failed to generate operations: {e}")
                results['errors'].append({
                    'type': 'operations',
                    'error': str(e)
                })
                
        logger.info(
            f"TypeScript generation complete: "
            f"{len(results['generated_files'])} files, "
            f"{len(results['errors'])} errors"
        )
        
        return results
        
    def _generate_schema_model(self, schema: Schema, all_model_names: List[str], 
                              results: Dict[str, Any]) -> None:
        """Generate TypeScript model for a single schema.
        
        Args:
            schema: Schema to generate model for
            all_model_names: List of all model names for imports
            results: Results dictionary to update
        """
        logger.debug(f"Generating TypeScript model for {schema.name}")
        
        # Prepare model imports
        model_imports = []
        for attr in schema.attributes:
            if attr.type in all_model_names and attr.type != schema.name:
                model_imports.append(attr.type)
        
        # Remove duplicates and sort
        model_imports = sorted(list(set(model_imports)))
        
        # Load and render template
        template = self.env.get_template(self.config.template_name)
        content = template.render(
            schema=schema,
            all_model_names=all_model_names,
            model_imports=model_imports
        )
        
        # Write generated content
        model_file = self.config.output_dir / f"{schema.name}Model.ts"
        with open(model_file, 'w') as f:
            f.write(content)
            
        self._generated_files.append(model_file)
        results['generated_files'].append(str(model_file))
        logger.info(f"Generated TypeScript model for {schema.name}")
        
    def _generate_operations(self, operations: List[Operation], 
                           results: Dict[str, Any]) -> None:
        """Generate GraphQL operations file.
        
        Args:
            operations: List of operations to generate
            results: Results dictionary to update
        """
        logger.debug(f"Generating GraphQL operations file with {len(operations)} operations")
        
        # Deduplicate operations by name
        seen_names = set()
        unique_operations = []
        for op in operations:
            if op.name not in seen_names:
                seen_names.add(op.name)
                unique_operations.append(op)
            else:
                logger.debug(f"Filtering duplicate operation: {op.name}")
                
        logger.info(f"Deduplicated {len(operations)} operations to {len(unique_operations)} unique operations")
        
        # Filter operations that have GQL
        operations_with_gql = [op for op in unique_operations if hasattr(op, 'gql') and op.gql]
        
        if not operations_with_gql:
            logger.warning("No operations with GQL found, skipping operations file generation")
            return
            
        # Load and render template
        template = self.env.get_template("typescript_graphql_operations.jinja")
        content = template.render(operations=operations_with_gql)
        
        # Write file
        ops_file = self.config.output_dir / "operations.graphql.ts"
        with open(ops_file, 'w') as f:
            f.write(content)
            
        self._generated_files.append(ops_file)
        results['generated_files'].append(str(ops_file))
        logger.info("Generated GraphQL operations file")
        
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
        if attr_type.startswith('I') and attr_type[1].isupper():
            return attr_type
            
        return type_mapping.get(attr_type.lower(), attr_type)