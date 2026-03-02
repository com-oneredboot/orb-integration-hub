"""Unit tests for schema loading."""

from pathlib import Path
import tempfile
import yaml

from ..schema_loader import SchemaLoader


class TestSchemaLoader:
    """Tests for SchemaLoader."""

    def test_load_schemas_with_e2e_metadata(self):
        """Test loading schemas with E2E metadata."""
        with tempfile.TemporaryDirectory() as tmpdir:
            schemas_dir = Path(tmpdir)

            # Create schema with E2E metadata
            schema_file = schemas_dir / "test_schema.yml"
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
                            "routes": {
                                "list": "/test-resources",
                                "detail": "/test-resources/:id",
                            },
                            "scenarios": ["create", "list"],
                            "auth_required": True,
                            "roles": ["OWNER"],
                        },
                    }
                )
            )

            loader = SchemaLoader(schemas_dir)
            schemas = loader.load_schemas_with_e2e()

            assert len(schemas) == 1
            assert schemas[0].name == "TestResource"
            assert schemas[0].schema_type == "dynamodb"
            assert "id" in schemas[0].attributes
            assert schemas[0].e2e.routes["list"] == "/test-resources"
            assert "create" in schemas[0].e2e.scenarios
            assert schemas[0].e2e.auth_required is True
            assert "OWNER" in schemas[0].e2e.roles

    def test_skip_schemas_without_e2e_metadata(self):
        """Test skipping schemas without E2E metadata."""
        with tempfile.TemporaryDirectory() as tmpdir:
            schemas_dir = Path(tmpdir)

            # Create schema without E2E metadata
            schema_file = schemas_dir / "test_schema.yml"
            schema_file.write_text(
                yaml.dump(
                    {
                        "name": "TestResource",
                        "type": "dynamodb",
                        "model": {"attributes": {}},
                    }
                )
            )

            loader = SchemaLoader(schemas_dir)
            schemas = loader.load_schemas_with_e2e()

            assert len(schemas) == 0

    def test_schema_filtering_by_name(self):
        """Test filtering schemas by name."""
        with tempfile.TemporaryDirectory() as tmpdir:
            schemas_dir = Path(tmpdir)

            # Create two schemas with E2E metadata
            for name in ["Resource1", "Resource2"]:
                schema_file = schemas_dir / f"{name}.yml"
                schema_file.write_text(
                    yaml.dump(
                        {
                            "name": name,
                            "type": "dynamodb",
                            "model": {"attributes": {}},
                            "e2e": {
                                "routes": {},
                                "scenarios": ["create"],
                            },
                        }
                    )
                )

            loader = SchemaLoader(schemas_dir)
            schemas = loader.load_schemas_with_e2e(schema_filter="Resource1")

            assert len(schemas) == 1
            assert schemas[0].name == "Resource1"

    def test_error_handling_invalid_yaml(self):
        """Test error handling for invalid YAML."""
        with tempfile.TemporaryDirectory() as tmpdir:
            schemas_dir = Path(tmpdir)

            # Create invalid YAML file
            schema_file = schemas_dir / "invalid.yml"
            schema_file.write_text("invalid: yaml: syntax:")

            loader = SchemaLoader(schemas_dir)
            schemas = loader.load_schemas_with_e2e()

            # Should skip invalid file and return empty list
            assert len(schemas) == 0

    def test_error_handling_missing_name_field(self):
        """Test error handling for missing name field."""
        with tempfile.TemporaryDirectory() as tmpdir:
            schemas_dir = Path(tmpdir)

            # Create schema without name field
            schema_file = schemas_dir / "no_name.yml"
            schema_file.write_text(
                yaml.dump(
                    {
                        "type": "dynamodb",
                        "e2e": {"routes": {}, "scenarios": []},
                    }
                )
            )

            loader = SchemaLoader(schemas_dir)
            schemas = loader.load_schemas_with_e2e()

            # Should skip schema without name
            assert len(schemas) == 0
