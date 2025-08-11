"""Python code generator using Jinja2 templates.

This module generates Python code from schemas using the same approach
as the original generate.py - loading and rendering Jinja2 templates.
"""

import logging
from typing import Dict, Any, List, Optional
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from orb_schema_generator.core.models import (
    Schema, SchemaCollection, SchemaField
)
from orb_schema_generator.core.converters import CaseConverter
from orb_schema_generator.core.exceptions import GenerationError


logger = logging.getLogger(__name__)


class PythonGeneratorConfig:
    """Configuration for Python generation."""
    def __init__(
        self,
        output_dir: Path,
        template_dir: Optional[Path] = None,
        template_names: Optional[Dict[str, str]] = None
    ):
        """Initialize Python generator config.
        
        Args:
            output_dir: Output directory for generated files
            template_dir: Directory containing templates
            template_names: Mapping of schema types to template names
        """
        self.output_dir = output_dir
        self.template_dir = template_dir
        
        # Default template mappings
        self.template_names = template_names or {
            'dynamodb': 'python_model.jinja',
            'standard': 'python_standard.jinja',
            'lambda': 'python_lambda.jinja',
            'lambda-dynamodb': 'python_model.jinja',
            'registry': 'python_registry.jinja'
        }


class PythonGenerator:
    """Generates Python code from schemas using Jinja2 templates."""
    
    def __init__(self, config: PythonGeneratorConfig):
        """Initialize the Python generator.
        
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
        # Wrap case converters to handle undefined values
        def safe_snake_case(value):
            if value is None or (hasattr(value, '__class__') and 'Undefined' in value.__class__.__name__):
                return ""
            return self.case_converter.to_snake_case(str(value))
            
        def safe_camel_case(value):
            if value is None or (hasattr(value, '__class__') and 'Undefined' in value.__class__.__name__):
                return ""
            return self.case_converter.to_camel_case(str(value))
            
        def safe_pascal_case(value):
            if value is None or (hasattr(value, '__class__') and 'Undefined' in value.__class__.__name__):
                return ""
            return self.case_converter.to_pascal_case(str(value))
            
        def safe_kebab_case(value):
            if value is None or (hasattr(value, '__class__') and 'Undefined' in value.__class__.__name__):
                return ""
            return self.case_converter.to_kebab_case(str(value))
        
        self.env.filters['to_camel_case'] = safe_camel_case
        self.env.filters['to_pascal_case'] = safe_pascal_case
        self.env.filters['to_snake_case'] = safe_snake_case
        self.env.filters['to_kebab_case'] = safe_kebab_case
        self.env.filters['to_python_type'] = self._to_python_type
        
        # Set undefined to print warnings
        from jinja2 import DebugUndefined
        self.env.undefined = DebugUndefined
        
        # Track generated files
        self._generated_files: List[Path] = []
        
    def generate(self, collection: SchemaCollection) -> Dict[str, Any]:
        """Generate Python code from schema collection.
        
        Args:
            collection: Collection of schemas to generate from
            
        Returns:
            Generation results including file paths and statistics
        """
        logger.info(f"Generating Python code for {len(collection.schemas)} schemas")
        
        results = {
            'generated_files': [],
            'errors': []
        }
        
        # Ensure output directory exists
        self.config.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Create models subdirectory
        models_dir = self.config.output_dir / "models"
        models_dir.mkdir(exist_ok=True)
        
        # Generate models for each schema
        for schema in collection.schemas:
            try:
                self._generate_schema_model(schema, results)
            except Exception as e:
                logger.error(f"Failed to generate model for {schema.name}: {e}")
                results['errors'].append({
                    'schema': schema.name,
                    'error': str(e)
                })
                
        # Generate models __init__.py
        self._generate_models_init(collection.schemas, models_dir, results)
        
        # Generate enums
        self._generate_enums(collection, results)
        
        logger.info(
            f"Python generation complete: "
            f"{len(results['generated_files'])} files, "
            f"{len(results['errors'])} errors"
        )
        
        return results
        
    def _generate_schema_model(self, schema: Schema, results: Dict[str, Any]) -> None:
        """Generate Python model for a single schema.
        
        Args:
            schema: Schema to generate model for
            results: Results dictionary to update
        """
        logger.debug(f"Generating Python model for {schema.name}")
        
        # Select template based on schema type
        template_name = self.config.template_names.get(
            schema.type, 
            'python_model.jinja'
        )
        
        # Skip schemas that don't have Python models
        if schema.type == 'graphql':
            logger.debug(f"Skipping Python generation for GraphQL-only type {schema.name}")
            return
            
        # Load and render template
        try:
            template = self.env.get_template(template_name)
            
            # Add timestamp for consistency with original
            import datetime
            timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
            
            # Debug the schema object
            logger.debug(f"Schema attributes: {schema.attributes}")
            logger.debug(f"Schema partition_key: {schema.partition_key}")
            logger.debug(f"Schema sort_key: {schema.sort_key}")
            
            content = template.render(
                schema=schema,
                timestamp=timestamp
            )
            
            # Write generated content
            model_file = self.config.output_dir / "models" / f"{schema.name}Model.py"
            with open(model_file, 'w') as f:
                f.write(content)
                
            self._generated_files.append(model_file)
            results['generated_files'].append(str(model_file))
            logger.info(f"Generated Python model for {schema.name}")
            
        except Exception as e:
            raise GenerationError(f"Failed to generate Python model for {schema.name}: {e}")
            
    def _generate_enums(self, collection: SchemaCollection, results: Dict[str, Any]) -> None:
        """Generate Python enum files.
        
        Args:
            collection: Schema collection containing enum definitions
            results: Results dictionary to update
        """
        logger.debug("Generating Python enums")
        
        # Create enums subdirectory
        enums_dir = self.config.output_dir / "enums"
        enums_dir.mkdir(exist_ok=True)
        
        # Extract unique enums from all schemas
        enums = {}
        for schema in collection.schemas:
            for attr in schema.attributes:
                if attr.enum_type and attr.enum_values:
                    enums[attr.enum_type] = attr.enum_values
                    
        # Generate enum files
        template = self.env.get_template('python_enum.jinja')
        import datetime
        timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        for enum_name, enum_values in enums.items():
            try:
                content = template.render(
                    enum_name=enum_name,
                    enum_values=enum_values,
                    timestamp=timestamp
                )
                
                enum_file = enums_dir / f"{enum_name}Enum.py"
                with open(enum_file, 'w') as f:
                    f.write(content)
                    
                self._generated_files.append(enum_file)
                results['generated_files'].append(str(enum_file))
                logger.info(f"Generated Python enum for {enum_name}")
                
            except Exception as e:
                logger.error(f"Failed to generate enum {enum_name}: {e}")
                results['errors'].append({
                    'enum': enum_name,
                    'error': str(e)
                })
                
        # Generate enums __init__.py
        self._generate_enums_init(list(enums.keys()), enums_dir, results)
        
    def _generate_models_init(self, schemas: List[Schema], models_dir: Path, 
                             results: Dict[str, Any]) -> None:
        """Generate __init__.py for models directory.
        
        Args:
            schemas: List of schemas
            models_dir: Models directory path
            results: Results dictionary to update
        """
        # Generate imports for all models
        imports = []
        exports = []
        
        for schema in schemas:
            if schema.type != 'graphql':  # Skip GraphQL-only types
                model_name = f"{schema.name}Model"
                imports.append(f"from .{model_name} import {schema.name}")
                exports.append(schema.name)
                
                # Add response types
                for suffix in ['Response', 'ListResponse', 'CreateInput', 'UpdateInput']:
                    response_type = f"{schema.name}{suffix}"
                    imports.append(f"from .{model_name} import {response_type}")
                    exports.append(response_type)
                    
        content = "# Auto-generated by orb-schema-generator\n\n"
        content += "\n".join(imports) + "\n\n"
        content += f"__all__ = {exports}\n"
        
        init_file = models_dir / "__init__.py"
        with open(init_file, 'w') as f:
            f.write(content)
            
        results['generated_files'].append(str(init_file))
        
    def _generate_enums_init(self, enum_names: List[str], enums_dir: Path, 
                            results: Dict[str, Any]) -> None:
        """Generate __init__.py for enums directory.
        
        Args:
            enum_names: List of enum names
            enums_dir: Enums directory path
            results: Results dictionary to update
        """
        imports = []
        exports = []
        
        for enum_name in enum_names:
            imports.append(f"from .{enum_name}Enum import {enum_name}")
            exports.append(enum_name)
            
        content = "# Auto-generated by orb-schema-generator\n\n"
        content += "\n".join(imports) + "\n\n"
        content += f"__all__ = {exports}\n"
        
        init_file = enums_dir / "__init__.py"
        with open(init_file, 'w') as f:
            f.write(content)
            
        results['generated_files'].append(str(init_file))
        
    def _to_python_type(self, attr_type: str) -> str:
        """Convert schema type to Python type."""
        type_mapping = {
            'string': 'str',
            'number': 'float',
            'boolean': 'bool',
            'array': 'List[str]',
            'object': 'Dict[str, Any]',
            'timestamp': 'int',  # Epoch timestamp
            'date': 'int',
            'map': 'Dict[str, Any]',
            'set': 'Set[str]',
            'binary': 'bytes',
            'null': 'None',
            'any': 'Any'
        }
        
        # Handle DynamoDB types
        dynamodb_mapping = {
            'S': 'str',
            'N': 'float',
            'BOOL': 'bool',
            'L': 'List[str]',
            'M': 'Dict[str, Any]',
            'NULL': 'None',
            'B': 'bytes'
        }
        
        # Check DynamoDB types first
        if attr_type in dynamodb_mapping:
            return dynamodb_mapping[attr_type]
            
        return type_mapping.get(attr_type.lower(), 'str')