"""Playwright test generator implementation."""

from typing import Optional
import logging
from jinja2 import Environment, PackageLoader, select_autoescape

from .base import BaseE2EGenerator
from .config import E2EConfig
from .schema_loader import SchemaLoader, SchemaWithE2E

logger = logging.getLogger(__name__)


class PlaywrightGenerator(BaseE2EGenerator):
    """Generates Playwright E2E tests from schemas."""

    def __init__(self, config: E2EConfig, dry_run: bool = False):
        """Initialize Playwright generator.

        Args:
            config: E2E configuration
            dry_run: If True, print operations without writing files
        """
        super().__init__(config, dry_run)

        # Initialize Jinja2 environment
        self.jinja_env = Environment(
            loader=PackageLoader("tools.e2e_generator", "templates"),
            autoescape=select_autoescape(["html", "xml"]),
            trim_blocks=True,
            lstrip_blocks=True,
        )

        # Add custom filters
        self.jinja_env.filters["camelCase"] = self._to_camel_case
        self.jinja_env.filters["pascalCase"] = self._to_pascal_case

        # Initialize schema loader
        self.schema_loader = SchemaLoader(config.schemas_dir)

    def generate(self, schema_filter: Optional[str] = None) -> None:
        """Generate Playwright E2E tests from schemas.

        Args:
            schema_filter: Optional schema name to filter generation
        """
        if not self.config.testing.enabled:
            logger.info("E2E test generation is disabled")
            return

        logger.info(f"Generating Playwright E2E tests (v{self.version})...")

        # Load schemas with E2E metadata
        schemas = self.schema_loader.load_schemas_with_e2e(schema_filter)

        if not schemas:
            logger.warning("No schemas with E2E metadata found")
            return

        logger.info(f"Found {len(schemas)} schemas with E2E metadata")

        # Generate common files (once)
        self._generate_playwright_config()
        self._generate_auth_helper()
        self._generate_fixtures()
        self._generate_utils()

        # Generate per-schema files
        for schema in schemas:
            self._generate_test_file(schema)
            self._generate_page_object(schema)

        logger.info(f"Successfully generated E2E tests for {len(schemas)} schemas")

    def _generate_test_file(self, schema: SchemaWithE2E) -> None:
        """Generate test spec file for a schema.

        Args:
            schema: Schema with E2E metadata
        """
        template = self.jinja_env.get_template("test.spec.ts.j2")
        content = template.render(
            header=self._get_file_header(), schema=schema, version=self.version
        )

        filename = self.config.testing.test_patterns.format(
            resource=schema.name.lower()
        )
        output_path = self.config.testing.base_dir / "tests" / filename
        self._write_file(output_path, content)

    def _generate_page_object(self, schema: SchemaWithE2E) -> None:
        """Generate Page Object Model for a schema.

        Args:
            schema: Schema with E2E metadata
        """
        template = self.jinja_env.get_template("page_object.ts.j2")

        page_object_name = schema.e2e.page_object or f"{schema.name}Page"

        content = template.render(
            header=self._get_file_header(),
            schema=schema,
            page_object_name=page_object_name,
            version=self.version,
        )

        filename = f"{schema.name.lower()}.page.ts"
        output_path = self.config.testing.base_dir / "page-objects" / filename
        self._write_file(output_path, content)

    def _generate_playwright_config(self) -> None:
        """Generate playwright.config.ts if it doesn't exist."""
        output_path = self.config.testing.base_dir.parent / "playwright.config.ts"

        # Only generate if file doesn't exist (don't overwrite custom configs)
        if output_path.exists():
            logger.info(f"Skipping {output_path}: File already exists")
            return

        template = self.jinja_env.get_template("playwright_config.ts.j2")
        content = template.render(
            header=self._get_file_header(),
            project_name=self.config.project_name,
            version=self.version,
        )

        self._write_file(output_path, content)

    def _generate_auth_helper(self) -> None:
        """Generate Cognito authentication helper."""
        template = self.jinja_env.get_template("auth_helper.ts.j2")
        content = template.render(header=self._get_file_header(), version=self.version)

        output_path = self.config.testing.base_dir / "auth" / "cognito.ts"
        self._write_file(output_path, content)

    def _generate_fixtures(self) -> None:
        """Generate test fixtures."""
        template = self.jinja_env.get_template("fixtures.ts.j2")
        content = template.render(header=self._get_file_header(), version=self.version)

        output_path = self.config.testing.base_dir / "fixtures" / "index.ts"
        self._write_file(output_path, content)

    def _generate_utils(self) -> None:
        """Generate utility functions."""
        template = self.jinja_env.get_template("utils.ts.j2")
        content = template.render(header=self._get_file_header(), version=self.version)

        output_path = self.config.testing.base_dir / "utils" / "index.ts"
        self._write_file(output_path, content)

    @staticmethod
    def _to_camel_case(text: str) -> str:
        """Convert text to camelCase.

        Args:
            text: Text to convert

        Returns:
            camelCase version of text
        """
        # Handle snake_case and kebab-case
        if "_" in text or "-" in text:
            words = text.replace("-", "_").split("_")
            return words[0].lower() + "".join(w.capitalize() for w in words[1:])

        # Handle PascalCase - just lowercase the first character
        if text and text[0].isupper():
            return text[0].lower() + text[1:]

        # Already camelCase or lowercase
        return text

    @staticmethod
    def _to_pascal_case(text: str) -> str:
        """Convert text to PascalCase.

        Args:
            text: Text to convert

        Returns:
            PascalCase version of text
        """
        # Handle snake_case and kebab-case
        if "_" in text or "-" in text:
            words = text.replace("-", "_").split("_")
            return "".join(w.capitalize() for w in words)

        # Handle camelCase - just uppercase the first character
        if text and text[0].islower():
            return text[0].upper() + text[1:]

        # Already PascalCase or UPPERCASE
        return text
