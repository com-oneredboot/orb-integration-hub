"""Unit tests for template rendering."""

import pytest
from jinja2 import Environment, PackageLoader
from ..schema_loader import SchemaWithE2E, E2EMetadata


class TestTemplateRendering:
    """Tests for Jinja2 template rendering."""

    @pytest.fixture
    def jinja_env(self):
        """Create Jinja2 environment for testing."""
        env = Environment(
            loader=PackageLoader("tools.e2e_generator", "templates"),
            trim_blocks=True,
            lstrip_blocks=True,
        )
        # Add filters
        env.filters["camelCase"] = lambda text: self._to_camel_case(text)
        env.filters["pascalCase"] = lambda text: self._to_pascal_case(text)
        env.filters["lower"] = lambda text: text.lower()
        return env

    @pytest.fixture
    def sample_schema(self):
        """Create sample schema for testing."""
        return SchemaWithE2E(
            name="TestResource",
            schema_type="dynamodb",
            attributes={
                "testResourceId": {"type": "string", "required": True},
                "name": {"type": "string", "required": True},
                "description": {"type": "string", "required": False},
                "createdAt": {"type": "timestamp", "required": True},
                "updatedAt": {"type": "timestamp", "required": True},
            },
            e2e=E2EMetadata(
                routes={
                    "list": "/test-resources",
                    "detail": "/test-resources/:id",
                    "create": "/test-resources/create",
                },
                scenarios=["create", "list", "detail"],
                auth_required=True,
                roles=["OWNER", "EMPLOYEE"],
                page_object="TestResourcePage",
            ),
        )

    def test_test_spec_template_renders(self, jinja_env, sample_schema):
        """Test test.spec.ts.j2 template renders without errors."""
        template = jinja_env.get_template("test.spec.ts.j2")
        content = template.render(
            header="// AUTO-GENERATED\n", schema=sample_schema, version="0.1.0"
        )

        assert "TestResource E2E Tests" in content
        assert "import { test, expect }" in content
        assert "import { login, logout }" in content
        assert "should create a new testresource" in content
        assert "should display testresource list" in content

    def test_page_object_template_renders(self, jinja_env, sample_schema):
        """Test page_object.ts.j2 template renders without errors."""
        template = jinja_env.get_template("page_object.ts.j2")
        content = template.render(
            header="// AUTO-GENERATED\n",
            schema=sample_schema,
            page_object_name="TestResourcePage",
            version="0.1.0",
        )

        assert "export class TestResourcePage" in content
        assert "readonly page: Page" in content
        assert "readonly nameInput: Locator" in content
        assert "async goToList()" in content
        assert "async fillName(value: string)" in content

    def test_auth_helper_template_renders(self, jinja_env):
        """Test auth_helper.ts.j2 template renders without errors."""
        template = jinja_env.get_template("auth_helper.ts.j2")
        content = template.render(header="// AUTO-GENERATED\n", version="0.1.0")

        assert "export interface LoginCredentials" in content
        assert "export async function login" in content
        assert "export async function logout" in content
        assert "export async function signup" in content

    def test_fixtures_template_renders(self, jinja_env):
        """Test fixtures.ts.j2 template renders without errors."""
        template = jinja_env.get_template("fixtures.ts.j2")
        content = template.render(header="// AUTO-GENERATED\n", version="0.1.0")

        assert "export interface TestUser" in content
        assert "export async function createTestUser" in content
        assert "export async function cleanupTestData" in content

    def test_playwright_config_template_renders(self, jinja_env):
        """Test playwright_config.ts.j2 template renders without errors."""
        template = jinja_env.get_template("playwright_config.ts.j2")
        content = template.render(
            header="// AUTO-GENERATED\n",
            project_name="test-project",
            version="0.1.0",
        )

        assert "export default defineConfig" in content
        assert "testDir: './e2e/tests'" in content
        assert "baseURL: process.env.BASE_URL" in content

    def test_utils_template_renders(self, jinja_env):
        """Test utils.ts.j2 template renders without errors."""
        template = jinja_env.get_template("utils.ts.j2")
        content = template.render(header="// AUTO-GENERATED\n", version="0.1.0")

        assert "export async function waitForGraphQL" in content
        assert "export function generateTestData" in content
        assert "export async function takeTimestampedScreenshot" in content

    def test_conditional_blocks(self, jinja_env, sample_schema):
        """Test conditional blocks in templates."""
        template = jinja_env.get_template("test.spec.ts.j2")

        # Test with auth_required=True
        content = template.render(
            header="// AUTO-GENERATED\n", schema=sample_schema, version="0.1.0"
        )
        assert "import { login, logout }" in content
        assert "await login(" in content

        # Test with auth_required=False
        sample_schema.e2e.auth_required = False
        content = template.render(
            header="// AUTO-GENERATED\n", schema=sample_schema, version="0.1.0"
        )
        assert "import { login, logout }" not in content

    def test_loops_over_attributes(self, jinja_env, sample_schema):
        """Test loops over schema attributes."""
        template = jinja_env.get_template("page_object.ts.j2")
        content = template.render(
            header="// AUTO-GENERATED\n",
            schema=sample_schema,
            page_object_name="TestResourcePage",
            version="0.1.0",
        )

        # Should have locators for all attributes
        assert "readonly nameInput: Locator" in content
        assert "readonly descriptionInput: Locator" in content
        assert "readonly createdAtInput: Locator" in content

    def test_filters(self, jinja_env, sample_schema):
        """Test custom filters (camelCase, pascalCase)."""
        template = jinja_env.get_template("page_object.ts.j2")
        content = template.render(
            header="// AUTO-GENERATED\n",
            schema=sample_schema,
            page_object_name="TestResourcePage",
            version="0.1.0",
        )

        # camelCase filter
        assert "nameInput" in content
        assert "descriptionInput" in content

        # pascalCase filter (in method names)
        assert "fillName" in content
        assert "fillDescription" in content

    @staticmethod
    def _to_camel_case(text: str) -> str:
        """Convert text to camelCase."""
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
        """Convert text to PascalCase."""
        # Handle snake_case and kebab-case
        if "_" in text or "-" in text:
            words = text.replace("-", "_").split("_")
            return "".join(w.capitalize() for w in words)

        # Handle camelCase - just uppercase the first character
        if text and text[0].islower():
            return text[0].upper() + text[1:]

        # Already PascalCase or UPPERCASE
        return text
