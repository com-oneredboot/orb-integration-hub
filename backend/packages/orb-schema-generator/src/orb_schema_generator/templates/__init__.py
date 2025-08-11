"""Template engine for schema generation with DRY principles."""

from orb_schema_generator.templates.engine import (
    TemplateEngine,
    TemplateConfig,
    TemplateFragment,
    TemplateContext,
    DRYTemplateEngine,
)
from orb_schema_generator.templates.registry import (
    TemplateRegistry,
    TemplateMetadata,
    BuiltInTemplates,
)
from orb_schema_generator.templates.loader import (
    TemplateLoader,
    TemplateMigrator,
    LegacyTemplateAdapter,
)

__all__ = [
    # Engine
    "TemplateEngine",
    "TemplateConfig", 
    "TemplateFragment",
    "TemplateContext",
    "DRYTemplateEngine",
    # Registry
    "TemplateRegistry",
    "TemplateMetadata",
    "BuiltInTemplates",
    # Loader
    "TemplateLoader",
    "TemplateMigrator",
    "LegacyTemplateAdapter",
]