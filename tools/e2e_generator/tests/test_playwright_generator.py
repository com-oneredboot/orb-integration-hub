"""Unit tests for Playwright generator."""

import pytest
from pathlib import Path
import tempfile
import yaml

from ..playwright_generator import PlaywrightGenerator
from ..config import E2EConfig, E2ETestingConfig
from ..schema_loader import SchemaWithE2E, E2EMetadata


class TestPlaywrightGenerator:
    """Tests for PlaywrightGenerator."""

    @pytest.fixture
    def sample_config(self):
        """Create sample configuration."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)
            schemas_dir = tmpdir_path / "schemas"
            schemas_dir.mkdir()

            config = E2EConfig(
                testing=E2ETestingConfig(
                    enabled=True,
                    framework="playwright",
                    language="typescript",
                    base_dir=tmpdir_path / "e2e",
                    test_patterns="{resource}.spec.ts",
                    targets=["ts-main"],
                ),
                schemas_dir=schemas_dir,
                project_name="test-project",
            )
            yield config

    @pytest.fixture
    def sample_schema(self):
        """Create sample schema."""
        return SchemaWithE2E(
            name="TestResource",
            schema_type="dynamodb",
            attributes={
                "testResourceId": {"type": "string", "required": True},
                "name": {"type": "string", "required": True},
                "description": {"type": "string", "required": False},
            },
            e2e=E2EMetadata(
                routes={
                    "list": "/test-resources",
                    "detail": "/test-resources/:id",
                    "create": "/test-resources/create",
                },
                scenarios=["create", "list"],
                auth_required=True,
                roles=["OWNER"],
            ),
        )

    def test_generator_initialization(self, sample_config):
        """Test generator initialization."""
        generator = PlaywrightGenerator(sample_config, dry_run=False)

        assert generator.config == sample_config
        assert generator.dry_run is False
        assert generator.version == "0.1.0"
        assert generator.jinja_env is not None
        assert generator.schema_loader is not None

    def test_case_conversion_filters(self):
        """Test case conversion filters."""
        # Test camelCase
        assert PlaywrightGenerator._to_camel_case("test_name") == "testName"
        assert PlaywrightGenerator._to_camel_case("test-name") == "testName"
        assert PlaywrightGenerator._to_camel_case("TestName") == "testName"

        # Test PascalCase
        assert PlaywrightGenerator._to_pascal_case("test_name") == "TestName"
        assert PlaywrightGenerator._to_pascal_case("test-name") == "TestName"
        assert PlaywrightGenerator._to_pascal_case("testName") == "TestName"

    def test_generate_with_disabled_config(self, sample_config):
        """Test generation when E2E is disabled."""
        sample_config.testing.enabled = False
        generator = PlaywrightGenerator(sample_config, dry_run=False)

        # Should return early without generating
        generator.generate()

    def test_generate_with_no_schemas(self, sample_config):
        """Test generation when no schemas have E2E metadata."""
        generator = PlaywrightGenerator(sample_config, dry_run=False)

        # Should log warning and return
        generator.generate()

    def test_generate_with_schema_filter(self, sample_config, sample_schema):
        """Test generation with schema filter."""
        # Create schema file
        schema_file = sample_config.schemas_dir / "test.yml"
        schema_file.write_text(
            yaml.dump(
                {
                    "name": "TestResource",
                    "type": "dynamodb",
                    "model": {"attributes": {}},
                    "e2e": {"routes": {}, "scenarios": ["create"]},
                }
            )
        )

        generator = PlaywrightGenerator(sample_config, dry_run=True)
        generator.generate(schema_filter="TestResource")

    def test_test_file_generation(self, sample_config, sample_schema):
        """Test test file generation."""
        generator = PlaywrightGenerator(sample_config, dry_run=False)
        generator._generate_test_file(sample_schema)

        expected_path = (
            sample_config.testing.base_dir / "tests" / "testresource.spec.ts"
        )
        assert expected_path.exists()

        content = expected_path.read_text()
        assert "AUTO-GENERATED" in content
        assert "TestResource E2E Tests" in content
        assert "should create a new testresource" in content

    def test_page_object_generation(self, sample_config, sample_schema):
        """Test Page Object generation."""
        generator = PlaywrightGenerator(sample_config, dry_run=False)
        generator._generate_page_object(sample_schema)

        expected_path = (
            sample_config.testing.base_dir / "page-objects" / "testresource.page.ts"
        )
        assert expected_path.exists()

        content = expected_path.read_text()
        assert "AUTO-GENERATED" in content
        assert "export class TestResourcePage" in content
        assert "readonly nameInput: Locator" in content

    def test_common_file_generation(self, sample_config):
        """Test common file generation."""
        generator = PlaywrightGenerator(sample_config, dry_run=False)

        generator._generate_auth_helper()
        generator._generate_fixtures()
        generator._generate_utils()

        assert (sample_config.testing.base_dir / "auth" / "cognito.ts").exists()
        assert (sample_config.testing.base_dir / "fixtures" / "index.ts").exists()
        assert (sample_config.testing.base_dir / "utils" / "index.ts").exists()

    def test_playwright_config_generation(self, sample_config):
        """Test Playwright config generation."""
        generator = PlaywrightGenerator(sample_config, dry_run=False)
        generator._generate_playwright_config()

        expected_path = sample_config.testing.base_dir.parent / "playwright.config.ts"
        assert expected_path.exists()

        content = expected_path.read_text()
        assert "AUTO-GENERATED" in content
        assert "export default defineConfig" in content

    def test_playwright_config_skips_existing(self, sample_config):
        """Test Playwright config skips existing files."""
        config_path = sample_config.testing.base_dir.parent / "playwright.config.ts"
        config_path.parent.mkdir(parents=True, exist_ok=True)
        config_path.write_text("// Existing config")

        generator = PlaywrightGenerator(sample_config, dry_run=False)
        generator._generate_playwright_config()

        # Should not overwrite
        assert config_path.read_text() == "// Existing config"
