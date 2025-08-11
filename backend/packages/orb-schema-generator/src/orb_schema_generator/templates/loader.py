"""Template loader for migrating existing templates.

This module provides functionality to load and migrate existing
Jinja2 templates into the new DRY-compliant template engine.
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
import re

from orb_schema_generator.templates.engine import (
    TemplateEngine, DRYTemplateEngine, TemplateFragment,
    TemplateContext, TemplateConfig
)
from orb_schema_generator.templates.registry import (
    TemplateRegistry, TemplateMetadata
)
from orb_schema_generator.core.exceptions import TemplateError


logger = logging.getLogger(__name__)


class TemplateMigrator:
    """Migrates existing templates to DRY-compliant versions."""
    
    def __init__(self, engine: DRYTemplateEngine):
        """Initialize the template migrator.
        
        Args:
            engine: DRY template engine to use
        """
        self.engine = engine
        self._migration_patterns = self._build_migration_patterns()
        
    def _build_migration_patterns(self) -> List[Tuple[re.Pattern, str]]:
        """Build regex patterns for template migration."""
        return [
            # Replace manual duplicate tracking
            (re.compile(r'{% set unique_operations = {} %}.*?{% endfor %}', re.DOTALL),
             '{% for op in operations|dedupe_operations %}'),
            
            # Replace exported_names tracking
            (re.compile(r'{% set exported_names = \[\] %}.*?{% set _ = exported_names\.append\([^)]+\) %}', re.DOTALL),
             '{% if _context.mark_operation_rendered(op.name) %}'),
             
            # Replace manual seen tracking
            (re.compile(r'{% set seen = \[\] %}.*?{% set _ = seen\.append\([^)]+\) %}', re.DOTALL),
             ''),
             
            # Update operation filtering
            (re.compile(r'{% if [^}]+ not in exported_names %}'),
             '{% if _context.mark_operation_rendered(op.name) %}'),
             
            # Update type filtering
            (re.compile(r'{% if [^}]+ not in unique_operations %}'),
             '{% if _context.mark_type_rendered(type_name) %}'),
        ]
        
    def migrate_template(self, template_path: Path) -> str:
        """Migrate a template to use DRY principles.
        
        Args:
            template_path: Path to template file
            
        Returns:
            Migrated template content
        """
        logger.info(f"Migrating template: {template_path}")
        
        with open(template_path) as f:
            content = f.read()
            
        # Apply migration patterns
        migrated = content
        for pattern, replacement in self._migration_patterns:
            if pattern.search(migrated):
                logger.debug(f"Applying migration pattern: {pattern.pattern[:50]}...")
                migrated = pattern.sub(replacement, migrated)
                
        # Extract reusable fragments
        fragments = self._extract_fragments(migrated)
        for fragment in fragments:
            self.engine.add_fragment(fragment)
            
        return migrated
        
    def _extract_fragments(self, template_content: str) -> List[TemplateFragment]:
        """Extract reusable fragments from template.
        
        Args:
            template_content: Template content
            
        Returns:
            List of extracted fragments
        """
        fragments = []
        
        # Look for repeated patterns that could be fragments
        # This is a simplified version - real implementation would be more sophisticated
        
        # Extract type generation patterns
        type_pattern = re.compile(
            r'export type (\w+) = \{[^}]+\};',
            re.DOTALL
        )
        
        type_matches = type_pattern.findall(template_content)
        if len(type_matches) > 2:
            # Multiple similar type definitions - candidate for fragment
            logger.debug(f"Found {len(type_matches)} type definitions - extracting fragment")
            
        return fragments


class TemplateLoader:
    """Loads templates from various sources."""
    
    def __init__(self, base_paths: Optional[List[Path]] = None):
        """Initialize the template loader.
        
        Args:
            base_paths: List of base paths to search for templates
        """
        self.base_paths = base_paths or []
        self.registry = TemplateRegistry()
        self.engine = DRYTemplateEngine()
        
    def add_search_path(self, path: Path) -> None:
        """Add a search path for templates.
        
        Args:
            path: Path to add
        """
        if path not in self.base_paths:
            self.base_paths.append(path)
            self.engine.add_template_dir(path)
            
    def load_existing_templates(self, templates_dir: Path) -> int:
        """Load existing templates from directory.
        
        Args:
            templates_dir: Directory containing templates
            
        Returns:
            Number of templates loaded
        """
        logger.info(f"Loading templates from: {templates_dir}")
        
        if not templates_dir.exists():
            raise TemplateError(f"Templates directory not found: {templates_dir}")
            
        # Discover templates
        loaded = self.registry.discover_templates(templates_dir)
        
        # Add to engine search paths
        self.engine.add_template_dir(templates_dir)
        
        return loaded
        
    def migrate_existing_templates(self, 
                                 source_dir: Path,
                                 target_dir: Path,
                                 dry_run: bool = False) -> Dict[str, Any]:
        """Migrate existing templates to DRY versions.
        
        Args:
            source_dir: Source directory with existing templates
            target_dir: Target directory for migrated templates
            dry_run: If True, don't write files
            
        Returns:
            Migration results
        """
        migrator = TemplateMigrator(self.engine)
        results = {
            'migrated': [],
            'failed': [],
            'skipped': []
        }
        
        logger.info(f"Migrating templates from {source_dir} to {target_dir}")
        
        for template_file in source_dir.rglob("*.jinja"):
            relative_path = template_file.relative_to(source_dir)
            target_path = target_dir / relative_path
            
            try:
                # Check if already migrated
                if target_path.exists() and not dry_run:
                    logger.debug(f"Skipping existing: {relative_path}")
                    results['skipped'].append(str(relative_path))
                    continue
                    
                # Migrate template
                migrated_content = migrator.migrate_template(template_file)
                
                if not dry_run:
                    # Create target directory
                    target_path.parent.mkdir(parents=True, exist_ok=True)
                    
                    # Write migrated template
                    with open(target_path, 'w') as f:
                        f.write(migrated_content)
                        
                results['migrated'].append(str(relative_path))
                logger.info(f"Migrated: {relative_path}")
                
            except Exception as e:
                logger.error(f"Failed to migrate {relative_path}: {e}")
                results['failed'].append({
                    'path': str(relative_path),
                    'error': str(e)
                })
                
        return results
        
    def create_template_context(self, 
                              schema_data: Dict[str, Any],
                              enable_deduplication: bool = True) -> TemplateContext:
        """Create a template context with schema data.
        
        Args:
            schema_data: Schema data for template
            enable_deduplication: Enable duplicate resolution
            
        Returns:
            Template context
        """
        context = TemplateContext(data=schema_data)
        
        if enable_deduplication:
            from orb_schema_generator.core.duplicate_resolver import (
                TypeScriptDuplicateResolver
            )
            context.duplicate_resolver = TypeScriptDuplicateResolver()
            
        return context
        
    def render_template(self,
                       template_name: str,
                       context: TemplateContext) -> str:
        """Render a template with context.
        
        Args:
            template_name: Name of template to render
            context: Template context
            
        Returns:
            Rendered template
        """
        return self.engine.render(template_name, context)
        
    def get_template_info(self, template_name: str) -> Optional[TemplateMetadata]:
        """Get information about a template.
        
        Args:
            template_name: Template name
            
        Returns:
            Template metadata or None
        """
        return self.registry.get_template(template_name)
        
    def list_available_templates(self,
                               category: Optional[str] = None,
                               tags: Optional[List[str]] = None) -> List[str]:
        """List available templates.
        
        Args:
            category: Filter by category
            tags: Filter by tags
            
        Returns:
            List of template names
        """
        templates = self.registry.list_templates(category=category, tags=tags)
        return [t.name for t in templates]


class LegacyTemplateAdapter:
    """Adapter for using legacy templates with new engine."""
    
    def __init__(self, legacy_env, engine: TemplateEngine):
        """Initialize the adapter.
        
        Args:
            legacy_env: Legacy Jinja2 environment
            engine: New template engine
        """
        self.legacy_env = legacy_env
        self.engine = engine
        
    def render_legacy(self, 
                     template_name: str,
                     context_data: Dict[str, Any]) -> str:
        """Render a legacy template.
        
        Args:
            template_name: Template name
            context_data: Context data
            
        Returns:
            Rendered template
        """
        # Create template context
        context = TemplateContext(data=context_data)
        
        # Add legacy filters to engine if needed
        for name, filter_func in self.legacy_env.filters.items():
            if name not in self.engine._env.filters:
                self.engine._env.filters[name] = filter_func
                
        # Render with new engine
        return self.engine.render(template_name, context)