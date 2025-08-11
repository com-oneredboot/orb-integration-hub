"""GraphQL schema generator using Jinja2 templates.

Simple and maintainable generator that creates GraphQL schemas from
internal schema representations.
"""

import logging
from typing import Dict, Any, List, Optional
from pathlib import Path

from orb_schema_generator.core.models import Schema, SchemaCollection
from orb_schema_generator.generators.base import BaseGenerator, GeneratorConfig


logger = logging.getLogger(__name__)


class GraphQLGeneratorConfig(GeneratorConfig):
    """Configuration specific to GraphQL generation."""
    pass


class GraphQLGenerator(BaseGenerator):
    """Generates GraphQL schema files from schema definitions."""
    
    def __init__(self, config: GraphQLGeneratorConfig):
        """Initialize the GraphQL generator."""
        super().__init__(config)
        self.default_template = "graphql_schema.jinja"
        
    def generate(self, collection: SchemaCollection) -> Dict[str, Any]:
        """Generate GraphQL schema from schema collection.
        
        Args:
            collection: Collection of schemas to generate from
            
        Returns:
            Generation results including file paths and statistics
        """
        logger.info(f"Generating GraphQL schema for {len(collection.schemas)} schemas")
        
        results = {
            'generated_files': [],
            'errors': []
        }
        
        # Ensure output directory exists
        self.config.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Prepare data for template
        context = self._prepare_context(collection)
        
        # Generate the main schema file
        try:
            self._render_template_to_file(
                template_name=self.default_template,
                output_file=self.config.output_dir / "schema.graphql",
                context=context,
                results=results
            )
        except Exception as e:
            logger.error(f"Failed to generate GraphQL schema: {e}")
            results['errors'].append({
                'type': 'schema',
                'error': str(e)
            })
            # Re-raise after logging and recording error
            raise
            
        logger.info(
            f"GraphQL generation complete: "
            f"{len(results['generated_files'])} files, "
            f"{len(results['errors'])} errors"
        )
        
        return results
        
    def _prepare_context(self, collection: SchemaCollection) -> Dict[str, Any]:
        """Prepare template context from schema collection.
        
        Args:
            collection: Schema collection
            
        Returns:
            Context dictionary for template rendering
        """
        # Separate schemas by type for easier template processing
        # Use dictionaries to match what templates expect
        table_schemas = {}
        graphql_types = {}
        lambda_types = {}
        
        for schema in collection.schemas:
            # Always prepare schema to convert auth_config
            self._prepare_schema_for_template(schema)
            
            if schema.type == "dynamodb":
                table_schemas[schema.name] = schema
            elif schema.type == "graphql":
                graphql_types[schema.name] = schema
            elif schema.type == "lambda":
                # Lambda types go in graphql_types and might have operations
                if schema.operations:
                    # Lambda types with operations should be in table_schemas
                    # so their operations appear in Query/Mutation sections
                    table_schemas[schema.name] = schema
                graphql_types[schema.name] = schema
                
        # Extract all enums
        enums = self._extract_enums(collection.schemas)
        
        # Debug logging
        logger.debug(f"Prepared context - table_schemas: {len(table_schemas)}, "
                    f"graphql_types: {len(graphql_types)}, lambda_types: {len(lambda_types)}, "
                    f"enums: {enums}")
        
        return {
            'table_schemas': table_schemas,
            'graphql_types': graphql_types,
            'lambda_types': lambda_types,
            'enums': enums,
            'timestamp': self._get_timestamp()
        }
        
    def _extract_enums(self, schemas: List[Schema]) -> Dict[str, List[str]]:
        """Extract unique enum definitions from schemas.
        
        Args:
            schemas: List of schemas
            
        Returns:
            Dictionary of enum name to values
        """
        enums = {}
        
        for schema in schemas:
            for field in schema.fields:
                if field.enum_type and field.enum_values:
                    # Only add if not already present or if values match
                    if field.enum_type not in enums:
                        enums[field.enum_type] = field.enum_values
                    elif enums[field.enum_type] != field.enum_values:
                        logger.warning(
                            f"Enum {field.enum_type} has conflicting values: "
                            f"{enums[field.enum_type]} vs {field.enum_values}"
                        )
                        
        return enums
        
    def _prepare_schema_for_template(self, schema: Schema) -> None:
        """Prepare schema for template rendering by converting to expected format.
        
        Args:
            schema: Schema to prepare
        """
        # Convert auth_config to dict if present
        if schema.auth_config:
            if hasattr(schema.auth_config, 'model_dump'):
                schema.auth_config = schema.auth_config.model_dump()
            elif hasattr(schema.auth_config, '__dict__'):
                schema.auth_config = schema.auth_config.__dict__
                
        # Convert operations to dictionary format expected by templates
        converted_operations = []
        for op in schema.operations:
            converted_op = {
                'name': op.name,
                'type': op.operation_type.value.capitalize(),  # 'query' -> 'Query'
                'field': op.name,
                'description': op.description,
                'response_auth_directives': op.auth_directives or [],
            }
            converted_operations.append(converted_op)
        
        # Replace operations list with converted format
        schema.operations = converted_operations