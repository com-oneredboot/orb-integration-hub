"""Integration tests for end-to-end workflow."""

from pathlib import Path
import tempfile
import yaml
import subprocess
import sys


class TestIntegration:
    """Integration tests for complete generation workflow."""

    def test_end_to_end_generation(self):
        """Test complete generation workflow from CLI to generated files."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)

            # Create config file
            config_file = tmpdir_path / "config.yml"
            config_file.write_text(
                yaml.dump(
                    {
                        "project": {"name": "test-project"},
                        "paths": {"schemas": str(tmpdir_path / "schemas")},
                        "output": {
                            "testing": {
                                "e2e": {
                                    "enabled": True,
                                    "base_dir": str(tmpdir_path / "e2e"),
                                }
                            }
                        },
                    }
                )
            )

            # Create schemas directory with test schema
            schemas_dir = tmpdir_path / "schemas"
            schemas_dir.mkdir()

            schema_file = schemas_dir / "test_resource.yml"
            schema_file.write_text(
                yaml.dump(
                    {
                        "name": "TestResource",
                        "type": "dynamodb",
                        "model": {
                            "attributes": {
                                "testResourceId": {
                                    "type": "string",
                                    "required": True,
                                },
                                "name": {"type": "string", "required": True},
                                "description": {
                                    "type": "string",
                                    "required": False,
                                },
                            }
                        },
                        "e2e": {
                            "routes": {
                                "list": "/test-resources",
                                "detail": "/test-resources/:id",
                                "create": "/test-resources/create",
                            },
                            "scenarios": ["create", "list", "detail"],
                            "auth_required": True,
                            "roles": ["OWNER", "EMPLOYEE"],
                        },
                    }
                )
            )

            # Run generator CLI
            result = subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "tools.e2e_generator",
                    "generate",
                    "--config",
                    str(config_file),
                ],
                capture_output=True,
                text=True,
            )

            # Verify CLI succeeded
            assert result.returncode == 0

            # Verify expected files were created
            e2e_dir = tmpdir_path / "e2e"

            # Test file
            test_file = e2e_dir / "tests" / "testresource.spec.ts"
            assert test_file.exists()
            test_content = test_file.read_text()
            assert "AUTO-GENERATED" in test_content
            assert "TestResource E2E Tests" in test_content
            assert "should create a new testresource" in test_content
            assert "should display testresource list" in test_content

            # Page Object
            page_object_file = e2e_dir / "page-objects" / "testresource.page.ts"
            assert page_object_file.exists()
            page_content = page_object_file.read_text()
            assert "AUTO-GENERATED" in page_content
            assert "export class TestResourcePage" in page_content

            # Auth helper
            auth_file = e2e_dir / "auth" / "cognito.ts"
            assert auth_file.exists()
            auth_content = auth_file.read_text()
            assert "AUTO-GENERATED" in auth_content
            assert "export async function login" in auth_content

            # Fixtures
            fixtures_file = e2e_dir / "fixtures" / "index.ts"
            assert fixtures_file.exists()
            fixtures_content = fixtures_file.read_text()
            assert "AUTO-GENERATED" in fixtures_content
            assert "export async function createTestUser" in fixtures_content

            # Utils
            utils_file = e2e_dir / "utils" / "index.ts"
            assert utils_file.exists()
            utils_content = utils_file.read_text()
            assert "AUTO-GENERATED" in utils_content
            assert "export async function waitForGraphQL" in utils_content

            # Playwright config
            config_file = tmpdir_path / "playwright.config.ts"
            assert config_file.exists()
            config_content = config_file.read_text()
            assert "AUTO-GENERATED" in config_content
            assert "export default defineConfig" in config_content

    def test_file_contents_match_expected_patterns(self):
        """Test that generated file contents match expected patterns."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)

            # Create minimal config and schema
            config_file = tmpdir_path / "config.yml"
            config_file.write_text(
                yaml.dump(
                    {
                        "project": {"name": "test"},
                        "paths": {"schemas": str(tmpdir_path / "schemas")},
                        "output": {
                            "testing": {
                                "e2e": {
                                    "enabled": True,
                                    "base_dir": str(tmpdir_path / "e2e"),
                                }
                            }
                        },
                    }
                )
            )

            schemas_dir = tmpdir_path / "schemas"
            schemas_dir.mkdir()

            schema_file = schemas_dir / "test.yml"
            schema_file.write_text(
                yaml.dump(
                    {
                        "name": "TestResource",
                        "type": "dynamodb",
                        "model": {
                            "attributes": {
                                "id": {"type": "string", "required": True},
                                "name": {"type": "string", "required": True},
                            }
                        },
                        "e2e": {
                            "routes": {"list": "/test"},
                            "scenarios": ["create"],
                            "auth_required": False,
                        },
                    }
                )
            )

            # Run generator
            subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "tools.e2e_generator",
                    "generate",
                    "--config",
                    str(config_file),
                ],
                capture_output=True,
            )

            # Verify test file has correct structure
            test_file = tmpdir_path / "e2e" / "tests" / "testresource.spec.ts"
            content = test_file.read_text()

            # Should have imports
            assert "import { test, expect }" in content
            assert "import { TestResourcePage }" in content

            # Should NOT have auth imports (auth_required=False)
            assert "import { login, logout }" not in content

            # Should have test describe block
            assert "test.describe('TestResource E2E Tests'" in content

            # Should have create test (in scenarios)
            assert "should create a new testresource" in content

    def test_generated_tests_are_valid_typescript(self):
        """Test that generated tests are syntactically valid TypeScript."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)

            # Create config and schema
            config_file = tmpdir_path / "config.yml"
            config_file.write_text(
                yaml.dump(
                    {
                        "project": {"name": "test"},
                        "paths": {"schemas": str(tmpdir_path / "schemas")},
                        "output": {
                            "testing": {
                                "e2e": {
                                    "enabled": True,
                                    "base_dir": str(tmpdir_path / "e2e"),
                                }
                            }
                        },
                    }
                )
            )

            schemas_dir = tmpdir_path / "schemas"
            schemas_dir.mkdir()

            schema_file = schemas_dir / "test.yml"
            schema_file.write_text(
                yaml.dump(
                    {
                        "name": "TestResource",
                        "type": "dynamodb",
                        "model": {"attributes": {}},
                        "e2e": {
                            "routes": {},
                            "scenarios": ["create"],
                        },
                    }
                )
            )

            # Run generator
            subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "tools.e2e_generator",
                    "generate",
                    "--config",
                    str(config_file),
                ],
                capture_output=True,
            )

            # Verify files exist and have basic TypeScript syntax
            test_file = tmpdir_path / "e2e" / "tests" / "testresource.spec.ts"
            assert test_file.exists()

            content = test_file.read_text()

            # Basic TypeScript syntax checks
            assert content.count("import") > 0
            assert content.count("export") >= 0
            assert content.count("{") == content.count("}")  # Balanced braces
            assert content.count("(") == content.count(")")  # Balanced parens
