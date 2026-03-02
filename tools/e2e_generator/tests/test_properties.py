"""Property-based tests for E2E Test Generator.

These tests use Hypothesis to verify universal correctness properties
across many randomly generated inputs.
"""

from hypothesis import given, strategies as st, settings, HealthCheck
from pathlib import Path
import tempfile
import yaml

from ..playwright_generator import PlaywrightGenerator
from ..config import E2EConfig, E2ETestingConfig
from ..schema_loader import SchemaLoader, SchemaWithE2E, E2EMetadata


# Hypothesis strategies for generating test data
@st.composite
def e2e_metadata_strategy(draw):
    """Generate valid E2E metadata."""
    return E2EMetadata(
        routes={
            "list": draw(st.text(min_size=1, max_size=50)),
            "detail": draw(st.text(min_size=1, max_size=50)),
        },
        scenarios=draw(
            st.lists(
                st.sampled_from(
                    [
                        "create",
                        "read",
                        "update",
                        "delete",
                        "list",
                        "pagination",
                        "filter",
                        "detail",
                        "round_trip",
                    ]
                ),
                min_size=1,
                max_size=5,
            )
        ),
        auth_required=draw(st.booleans()),
        roles=draw(
            st.lists(st.sampled_from(["OWNER", "EMPLOYEE", "CUSTOMER"]), max_size=3)
        ),
    )


@st.composite
def schema_with_e2e_strategy(draw):
    """Generate valid schema with E2E metadata."""
    name = draw(
        st.text(
            min_size=1,
            max_size=20,
            alphabet=st.characters(whitelist_categories=("Lu", "Ll")),
        )
    )
    return SchemaWithE2E(
        name=name,
        schema_type="dynamodb",
        attributes={
            "id": {"type": "string", "required": True},
            "name": {"type": "string", "required": True},
            "description": {"type": "string", "required": False},
        },
        e2e=draw(e2e_metadata_strategy()),
    )


class TestProperties:
    """Property-based tests for correctness properties."""

    @given(
        schemas=st.lists(schema_with_e2e_strategy(), min_size=1, max_size=5),
        filter_name=st.text(min_size=1, max_size=20),
    )
    @settings(max_examples=50, suppress_health_check=[HealthCheck.too_slow])
    def test_property_1_schema_filtering(self, schemas, filter_name):
        """Property 1: Schema Filtering.

        For any list of schemas and filter name, only matching schemas are processed.
        Validates: Requirements 3.6, 4.4
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            schemas_dir = Path(tmpdir)

            # Create schema files
            for schema in schemas:
                schema_file = schemas_dir / f"{schema.name}.yml"
                schema_file.write_text(
                    yaml.dump(
                        {
                            "name": schema.name,
                            "type": "dynamodb",
                            "model": {"attributes": {}},
                            "e2e": {
                                "routes": schema.e2e.routes,
                                "scenarios": schema.e2e.scenarios,
                            },
                        }
                    )
                )

            loader = SchemaLoader(schemas_dir)
            filtered = loader.load_schemas_with_e2e(schema_filter=filter_name)

            # All filtered schemas must match the filter name
            assert all(s.name == filter_name for s in filtered)

    @given(schema=schema_with_e2e_strategy())
    @settings(max_examples=50)
    def test_property_2_scenario_generation(self, schema):
        """Property 2: Scenario-Driven Test Generation.

        For any schema with scenarios, each scenario generates a test case.
        Validates: Requirements 5.1, 5.2, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4, 8.1, 14.1
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            config = E2EConfig(
                testing=E2ETestingConfig(base_dir=Path(tmpdir) / "e2e"),
                schemas_dir=Path(tmpdir),
                project_name="test",
            )

            generator = PlaywrightGenerator(config, dry_run=False)
            generator._generate_test_file(schema)

            test_file = (
                Path(tmpdir) / "e2e" / "tests" / f"{schema.name.lower()}.spec.ts"
            )
            content = test_file.read_text(encoding="utf-8")

            # Each scenario should generate a test
            for scenario in schema.e2e.scenarios:
                # Check for test case related to scenario (more lenient matching)
                if scenario == "round_trip":
                    assert (
                        "round trip" in content.lower()
                        or "roundtrip" in content.lower()
                    )
                else:
                    assert (
                        f"should {scenario}" in content.lower()
                        or scenario in content.lower()
                    )

    @given(schema=schema_with_e2e_strategy())
    @settings(max_examples=50)
    def test_property_3_attribute_form_fields(self, schema):
        """Property 3: Attribute-Based Form Fields.

        For any schema, required attributes generate form field interactions.
        Validates: Requirements 5.5
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            config = E2EConfig(
                testing=E2ETestingConfig(base_dir=Path(tmpdir) / "e2e"),
                schemas_dir=Path(tmpdir),
                project_name="test",
            )

            generator = PlaywrightGenerator(config, dry_run=False)
            generator._generate_test_file(schema)

            test_file = (
                Path(tmpdir) / "e2e" / "tests" / f"{schema.name.lower()}.spec.ts"
            )
            content = test_file.read_text(encoding="utf-8")

            # Required attributes (except timestamps and IDs) should have fill methods
            # Only check if create scenario is present
            if "create" in schema.e2e.scenarios:
                for attr_name, attr_def in schema.attributes.items():
                    if (
                        attr_def.get("required")
                        and attr_name not in ["createdAt", "updatedAt"]
                        and not attr_name.endswith("Id")
                    ):
                        pascal_case = "".join(
                            w.capitalize() for w in attr_name.split("_")
                        )
                        assert f"fill{pascal_case}" in content

    @given(schema=schema_with_e2e_strategy())
    @settings(max_examples=50)
    def test_property_4_page_object_completeness(self, schema):
        """Property 4: Page Object Generation.

        For any schema, Page Object includes locators for all attributes.
        Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.7
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            config = E2EConfig(
                testing=E2ETestingConfig(base_dir=Path(tmpdir) / "e2e"),
                schemas_dir=Path(tmpdir),
                project_name="test",
            )

            generator = PlaywrightGenerator(config, dry_run=False)
            generator._generate_page_object(schema)

            page_file = (
                Path(tmpdir) / "e2e" / "page-objects" / f"{schema.name.lower()}.page.ts"
            )
            content = page_file.read_text(encoding="utf-8")

            # Should have locators for all attributes
            for attr_name in schema.attributes.keys():
                camel_case = attr_name[0].lower() + attr_name[1:]
                assert f"{camel_case}Input" in content
                assert f"{camel_case}Display" in content

    @given(schema=schema_with_e2e_strategy())
    @settings(max_examples=50)
    def test_property_5_authentication_integration(self, schema):
        """Property 5: Authentication Integration.

        For any schema with auth_required=true, tests include login/logout.
        Validates: Requirements 6.5
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            config = E2EConfig(
                testing=E2ETestingConfig(base_dir=Path(tmpdir) / "e2e"),
                schemas_dir=Path(tmpdir),
                project_name="test",
            )

            generator = PlaywrightGenerator(config, dry_run=False)
            generator._generate_test_file(schema)

            test_file = (
                Path(tmpdir) / "e2e" / "tests" / f"{schema.name.lower()}.spec.ts"
            )
            content = test_file.read_text(encoding="utf-8")

            if schema.e2e.auth_required:
                assert "await login(" in content
                assert "await logout(" in content
            else:
                assert "await login(" not in content

    @given(schema=schema_with_e2e_strategy())
    @settings(max_examples=50)
    def test_property_6_auto_generated_header(self, schema):
        """Property 6: AUTO-GENERATED Header Presence.

        For any generated file, AUTO-GENERATED header is present.
        Validates: Requirements 12.7, 16.6
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            config = E2EConfig(
                testing=E2ETestingConfig(base_dir=Path(tmpdir) / "e2e"),
                schemas_dir=Path(tmpdir),
                project_name="test",
            )

            generator = PlaywrightGenerator(config, dry_run=False)
            generator._generate_test_file(schema)
            generator._generate_page_object(schema)

            test_file = (
                Path(tmpdir) / "e2e" / "tests" / f"{schema.name.lower()}.spec.ts"
            )
            page_file = (
                Path(tmpdir) / "e2e" / "page-objects" / f"{schema.name.lower()}.page.ts"
            )

            # Both files should have AUTO-GENERATED header in first 500 chars
            assert "AUTO-GENERATED" in test_file.read_text(encoding="utf-8")[:500]
            assert "AUTO-GENERATED" in page_file.read_text(encoding="utf-8")[:500]

    @given(
        config_data=st.fixed_dictionaries(
            {
                "enabled": st.booleans(),
                "framework": st.just("playwright"),
                "language": st.just("typescript"),
                "base_dir": st.just("./e2e"),
            }
        )
    )
    @settings(max_examples=50)
    def test_property_7_configuration_parsing(self, config_data):
        """Property 7: Configuration Field Parsing.

        For any valid config dict, parsing succeeds without errors.
        Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
        """
        config = E2ETestingConfig.from_dict(config_data)

        assert config.enabled is not None
        assert config.framework is not None
        assert config.base_dir is not None

    @given(
        e2e_data=st.fixed_dictionaries(  # type: ignore[misc]
            {
                "routes": st.dictionaries(st.text(min_size=1), st.text(min_size=1)),
                "scenarios": st.lists(st.text(min_size=1), min_size=1),
            },
            optional={
                "auth_required": st.booleans(),
                "roles": st.lists(st.text(min_size=1)),
            },
        )
    )
    @settings(max_examples=50)
    def test_property_8_schema_metadata_parsing(self, e2e_data):
        """Property 8: Schema Metadata Parsing.

        For any valid e2e metadata dict, parsing succeeds without errors.
        Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.7
        """
        e2e = E2EMetadata(
            routes=e2e_data["routes"],
            scenarios=e2e_data["scenarios"],
            auth_required=e2e_data.get("auth_required", True),
            roles=e2e_data.get("roles", []),
        )

        assert e2e.routes is not None
        assert len(e2e.scenarios) > 0

    @given(schemas=st.lists(schema_with_e2e_strategy(), min_size=1, max_size=3))
    @settings(max_examples=30)
    def test_property_11_dry_run_mode(self, schemas):
        """Property 11: Dry-Run Mode.

        For any schemas with dry_run=True, no files are written.
        Validates: Requirements 4.5
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)
            schemas_dir = tmpdir_path / "schemas"
            schemas_dir.mkdir()

            # Create schema files
            for schema in schemas:
                schema_file = schemas_dir / f"{schema.name}.yml"
                schema_file.write_text(
                    yaml.dump(
                        {
                            "name": schema.name,
                            "type": "dynamodb",
                            "model": {"attributes": {}},
                            "e2e": {
                                "routes": schema.e2e.routes,
                                "scenarios": schema.e2e.scenarios,
                            },
                        }
                    )
                )

            config = E2EConfig(
                testing=E2ETestingConfig(base_dir=tmpdir_path / "e2e"),
                schemas_dir=schemas_dir,
                project_name="test",
            )

            generator = PlaywrightGenerator(config, dry_run=True)
            generator.generate()

            # Verify no files were created
            assert len(list(tmpdir_path.rglob("*.ts"))) == 0
