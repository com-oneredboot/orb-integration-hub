"""E2E Test Generator for orb-integration-hub.

This module generates Playwright E2E tests from YAML schemas.
It follows orb-schema-generator architecture patterns for easy future integration.

Usage:
    python -m tools.e2e_generator generate
    python -m tools.e2e_generator generate --schema Organizations
    python -m tools.e2e_generator generate --dry-run
"""

__version__ = "0.1.0"

from .playwright_generator import PlaywrightGenerator
from .config import E2EConfig, E2ETestingConfig
from .schema_loader import SchemaLoader, E2EMetadata, SchemaWithE2E
from .base import BaseE2EGenerator

__all__ = [
    "PlaywrightGenerator",
    "E2EConfig",
    "E2ETestingConfig",
    "SchemaLoader",
    "E2EMetadata",
    "SchemaWithE2E",
    "BaseE2EGenerator",
    "__version__",
]
