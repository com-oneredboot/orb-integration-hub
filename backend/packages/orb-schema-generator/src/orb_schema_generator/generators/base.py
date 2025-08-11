"""Base generator class for all code generators.

Provides common functionality to reduce code duplication across generators.
"""

import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pathlib import Path
import datetime

from jinja2 import Environment, FileSystemLoader, select_autoescape

from orb_schema_generator.core.models import SchemaCollection
from orb_schema_generator.core.converters import CaseConverter


logger = logging.getLogger(__name__)


class GeneratorConfig:
    """Base configuration for all generators."""
    
    def __init__(
        self,
        output_dir: Path,
        template_dir: Optional[Path] = None
    ):
        """Initialize generator configuration.
        
        Args:
            output_dir: Output directory for generated files
            template_dir: Directory containing templates
        """
        self.output_dir = output_dir
        self.template_dir = template_dir


class BaseGenerator(ABC):
    """Base class for all code generators."""
    
    def __init__(self, config: GeneratorConfig):
        """Initialize the base generator.
        
        Args:
            config: Generator configuration
        """
        self.config = config
        self.case_converter = CaseConverter()
        self._setup_template_environment()
        
    def _setup_template_environment(self):
        """Set up Jinja2 environment with common filters."""
        template_dir = self.config.template_dir
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
        
        # Add common filters
        self._add_filters()
        
        # Add common globals
        self._add_globals()
        
    def _add_filters(self):
        """Add common filters to Jinja2 environment."""
        # Case conversion filters
        self.env.filters['to_camel_case'] = self._safe_case_wrapper(
            self.case_converter.to_camel_case
        )
        self.env.filters['to_pascal_case'] = self._safe_case_wrapper(
            self.case_converter.to_pascal_case
        )
        self.env.filters['to_snake_case'] = self._safe_case_wrapper(
            self.case_converter.to_snake_case
        )
        self.env.filters['to_kebab_case'] = self._safe_case_wrapper(
            self.case_converter.to_kebab_case
        )
        
        # Type conversion filters
        self.env.filters['graphql_type'] = self._graphql_type
        
    def _add_globals(self):
        """Add common globals to Jinja2 environment."""
        from datetime import datetime
        self.env.globals['now'] = lambda: datetime.now().isoformat()
        
    def _safe_case_wrapper(self, func):
        """Wrap case conversion functions to handle undefined values.
        
        Args:
            func: Case conversion function
            
        Returns:
            Wrapped function that handles undefined values
        """
        def wrapper(value):
            if value is None or (hasattr(value, '__class__') and 'Undefined' in value.__class__.__name__):
                return ""
            return func(str(value))
        return wrapper
        
    def _graphql_type(self, type_name: str) -> str:
        """Convert field type to GraphQL type.
        
        Args:
            type_name: Field type name
            
        Returns:
            GraphQL type representation
        """
        mapping = {
            'string': 'String',
            'number': 'Int',
            'boolean': 'Boolean',
            'object': 'String',
            'array': '[String]',
            'timestamp': 'Int',  # Numeric timestamps
            'ID': 'ID',
            'int': 'Int',
            'float': 'Float',
            'double': 'Float',
            'bigint': 'String',
            'IUsers': 'Users',
            'any': 'String',
            # Common variations
            'String': 'String',
            'Int': 'Int',
            'Float': 'Float',
            'Boolean': 'Boolean',
            'List': '[String]',  # Default list type
        }
        return mapping.get(type_name, type_name)
        
    def _get_timestamp(self) -> str:
        """Get current timestamp in ISO format."""
        return datetime.datetime.now(datetime.timezone.utc).isoformat()
        
    def _render_template_to_file(
        self,
        template_name: str,
        output_file: Path,
        context: Dict[str, Any],
        results: Dict[str, Any]
    ) -> None:
        """Render a template and write to file.
        
        Args:
            template_name: Name of the template to render
            output_file: Path to write the rendered content
            context: Context dictionary for template
            results: Results dictionary to update
        """
        try:
            template = self.env.get_template(template_name)
            content = template.render(**context)
            
            # Ensure parent directory exists
            output_file.parent.mkdir(parents=True, exist_ok=True)
            
            # Write file
            with open(output_file, 'w') as f:
                f.write(content)
                
            results['generated_files'].append(str(output_file))
            logger.info(f"Generated {output_file}")
            
        except Exception as e:
            error_msg = f"Failed to render {template_name}: {e}"
            logger.error(error_msg)
            results['errors'].append({
                'template': template_name,
                'output': str(output_file),
                'error': str(e)
            })
            raise
            
    @abstractmethod
    def generate(self, collection: SchemaCollection) -> Dict[str, Any]:
        """Generate code from schema collection.
        
        Args:
            collection: Collection of schemas to generate from
            
        Returns:
            Generation results including file paths and statistics
        """
        pass