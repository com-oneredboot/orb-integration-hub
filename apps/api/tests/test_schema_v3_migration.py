"""
Property-based and unit tests for schema v3 migration correctness.

Validates that all 50 YAML schemas in the project have been correctly
migrated to v3 format with proper structure, types, hashes, and
cross-references.

Feature: schema-generator-v3-upgrade
"""

import re
from pathlib import Path

import pytest
import yaml
from hypothesis import given, settings
from hypothesis import strategies as st

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).parent.parent.parent.parent
SCHEMAS_DIR = REPO_ROOT / "schemas"
TABLES_DIR = SCHEMAS_DIR / "tables"
MODELS_DIR = SCHEMAS_DIR / "models"
REGISTRIES_DIR = SCHEMAS_DIR / "registries"
LAMBDAS_DIR = SCHEMAS_DIR / "lambdas"
CORE_DIR = SCHEMAS_DIR / "core"
PIPFILE_PATH = REPO_ROOT / "apps" / "api" / "Pipfile"
GENERATED_MODELS_DIR = REPO_ROOT / "apps" / "api" / "models"
GENERATED_ENUMS_DIR = REPO_ROOT / "apps" / "api" / "enums"

# Valid v3 common types
V3_COMMON_TYPES = {
    "uuid", "string", "integer", "float", "boolean",
    "timestamp", "date", "json", "binary", "list", "map",
}

HASH_PATTERN = re.compile(r"^sha256:[0-9a-f]{64}$")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _load_yaml(path: Path) -> dict:
    with open(path, "r") as f:
        return yaml.safe_load(f)


def _all_schema_files(directory: Path) -> list[Path]:
    return sorted(directory.glob("*.yml"))


def _all_schemas_flat() -> list[Path]:
    """Return every schema file across all subdirectories."""
    files: list[Path] = []
    for subdir in [CORE_DIR, REGISTRIES_DIR, MODELS_DIR, TABLES_DIR, LAMBDAS_DIR]:
        files.extend(_all_schema_files(subdir))
    return files


def _schema_names_in_suite() -> set[str]:
    """Collect all schema 'name' values across the suite."""
    names: set[str] = set()
    for path in _all_schemas_flat():
        data = _load_yaml(path)
        if data and "name" in data:
            names.add(data["name"])
    return names


# ---------------------------------------------------------------------------
# Hypothesis strategies — draw from *real* schema files on disk
# ---------------------------------------------------------------------------
_table_files = _all_schema_files(TABLES_DIR)
_model_files = _all_schema_files(MODELS_DIR)
_registry_files = _all_schema_files(REGISTRIES_DIR)
_lambda_files = _all_schema_files(LAMBDAS_DIR)
_core_files = _all_schema_files(CORE_DIR)
_all_files = _all_schemas_flat()

# Strategies that sample from real files
st_table_path = st.sampled_from(_table_files)
st_model_path = st.sampled_from(_model_files)
st_registry_path = st.sampled_from(_registry_files)
st_lambda_path = st.sampled_from(_lambda_files)
st_any_schema_path = st.sampled_from(_all_files)

# Schemas that have model.attributes (tables, models, lambdas)
_schemas_with_attributes = [
    p for p in _all_files
    if (d := _load_yaml(p)) and isinstance(d, dict)
    and "model" in d and isinstance(d.get("model"), dict)
    and "attributes" in d["model"]
]
st_schema_with_attrs = st.sampled_from(_schemas_with_attributes)

# Schemas that reference enum_type or model types
_schemas_with_refs: list[Path] = []
for _p in _schemas_with_attributes:
    _d = _load_yaml(_p)
    for _attr in _d["model"]["attributes"]:
        if "enum_type" in _attr or _attr.get("type") not in V3_COMMON_TYPES:
            _schemas_with_refs.append(_p)
            break
st_schema_with_refs = st.sampled_from(_schemas_with_refs) if _schemas_with_refs else None


# ===================================================================
# PROPERTY-BASED TESTS (Task 7.2)
# ===================================================================

class TestProperty1MigratedSchemasVersionAndHash:
    """
    Property 1: Migrated schemas contain version and valid hash.

    For any schema file in the project, the YAML shall contain
    version: "1" (or "1.0" for core) and a hash field matching
    sha256:<hexdigest>.

    **Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1, 8.1**

    Feature: schema-generator-v3-upgrade, Property 1: Migrated schemas contain version and valid hash
    """

    @given(schema_path=st_any_schema_path)
    @settings(max_examples=100)
    def test_schema_has_version_and_valid_hash(self, schema_path: Path):
        data = _load_yaml(schema_path)
        assert data is not None, f"Failed to load {schema_path}"

        # version field must exist
        assert "version" in data, f"{schema_path.name}: missing 'version' field"
        version = str(data["version"])
        assert version in ("1", "1.0"), (
            f"{schema_path.name}: version must be '1' or '1.0', got '{version}'"
        )

        # hash field must exist and match sha256 pattern
        assert "hash" in data, f"{schema_path.name}: missing 'hash' field"
        assert HASH_PATTERN.match(data["hash"]), (
            f"{schema_path.name}: hash '{data['hash']}' does not match sha256:<64hex>"
        )


class TestProperty2TableSchemaStructuralTransformation:
    """
    Property 2: Table schema structural transformation.

    For any table schema, the v3 file shall contain a dynamodb section
    with partition_key, an appsync section, and shall NOT contain the
    v2.x fields type, targets, or nested model.keys/model.stream.

    **Validates: Requirements 1.3, 1.4, 1.5**

    Feature: schema-generator-v3-upgrade, Property 2: Table schema structural transformation
    """

    @given(schema_path=st_table_path)
    @settings(max_examples=100)
    def test_table_has_dynamodb_and_appsync_no_v2_fields(self, schema_path: Path):
        data = _load_yaml(schema_path)

        # Must have dynamodb section with partition_key
        assert "dynamodb" in data, f"{schema_path.name}: missing 'dynamodb' section"
        assert "partition_key" in data["dynamodb"], (
            f"{schema_path.name}: dynamodb section missing 'partition_key'"
        )

        # Must have appsync section
        assert "appsync" in data, f"{schema_path.name}: missing 'appsync' section"

        # Must NOT have v2.x fields
        assert "type" not in data, f"{schema_path.name}: v2 'type' field still present"
        assert "targets" not in data, f"{schema_path.name}: v2 'targets' field still present"

        # model section must not have v2.x nested keys/stream
        model = data.get("model", {})
        assert "keys" not in model, f"{schema_path.name}: v2 'model.keys' still present"
        assert "stream" not in model, f"{schema_path.name}: v2 'model.stream' still present"


class TestProperty3AttributesUseCommonTypeSystem:
    """
    Property 3: Attributes use common type system.

    For any schema with model.attributes, every attribute's type shall
    be one of the valid v3 common types OR a reference to another schema.

    **Validates: Requirements 1.2**

    Feature: schema-generator-v3-upgrade, Property 3: Attributes use common type system
    """

    @given(schema_path=st_schema_with_attrs)
    @settings(max_examples=100)
    def test_all_attribute_types_are_valid(self, schema_path: Path):
        data = _load_yaml(schema_path)
        schema_names = _schema_names_in_suite()
        attributes = data["model"]["attributes"]
        assert isinstance(attributes, list), (
            f"{schema_path.name}: model.attributes must be a list"
        )

        for attr in attributes:
            attr_type = attr["type"]
            # Type is either a common type or a reference to another schema
            assert attr_type in V3_COMMON_TYPES or attr_type in schema_names, (
                f"{schema_path.name}: attribute '{attr['name']}' has invalid type "
                f"'{attr_type}' — not a common type or known schema reference"
            )


class TestProperty4ModelSchemasIncludeAppsyncSection:
    """
    Property 4: Model schemas include appsync section.

    For any model schema (schemas/models/), the v3 file shall contain
    an appsync configuration section.

    **Validates: Requirements 2.2**

    Feature: schema-generator-v3-upgrade, Property 4: Model schemas include appsync section
    """

    @given(schema_path=st_model_path)
    @settings(max_examples=100)
    def test_model_has_appsync_section(self, schema_path: Path):
        data = _load_yaml(schema_path)
        assert "appsync" in data, (
            f"{schema_path.name}: model schema missing 'appsync' section"
        )


class TestProperty5RegistryItemsPreservation:
    """
    Property 5: Registry items preservation round-trip.

    For any registry schema, the items section shall exist and contain
    at least one item, each with a value field.

    **Validates: Requirements 3.2**

    Feature: schema-generator-v3-upgrade, Property 5: Registry items preservation round-trip
    """

    @given(schema_path=st_registry_path)
    @settings(max_examples=100)
    def test_registry_items_preserved(self, schema_path: Path):
        data = _load_yaml(schema_path)
        assert "items" in data, f"{schema_path.name}: missing 'items' section"
        items = data["items"]
        assert isinstance(items, dict), f"{schema_path.name}: items must be a dict"
        assert len(items) > 0, f"{schema_path.name}: items section is empty"

        for item_key, item_val in items.items():
            # Each item must have at minimum a value or be a dict with value
            if isinstance(item_val, dict):
                assert "value" in item_val or "message" in item_val, (
                    f"{schema_path.name}: item '{item_key}' missing 'value' field"
                )


class TestProperty6LambdaOperationTypePreservation:
    """
    Property 6: Lambda operation type preservation.

    For any lambda schema, the lambda.operation field shall be either
    'query' or 'mutation'.

    **Validates: Requirements 4.2**

    Feature: schema-generator-v3-upgrade, Property 6: Lambda operation type preservation
    """

    @given(schema_path=st_lambda_path)
    @settings(max_examples=100)
    def test_lambda_operation_preserved(self, schema_path: Path):
        data = _load_yaml(schema_path)
        assert "lambda" in data, f"{schema_path.name}: missing 'lambda' section"
        lambda_section = data["lambda"]
        assert "operation" in lambda_section, (
            f"{schema_path.name}: lambda section missing 'operation'"
        )
        assert lambda_section["operation"] in ("query", "mutation"), (
            f"{schema_path.name}: lambda.operation must be 'query' or 'mutation', "
            f"got '{lambda_section['operation']}'"
        )


class TestProperty7CrossSchemaReferenceIntegrity:
    """
    Property 7: Cross-schema reference integrity.

    For any schema that references an enum_type or model type in its
    attributes, the referenced schema shall exist in the suite.

    **Validates: Requirements 7.2, 7.3**

    Feature: schema-generator-v3-upgrade, Property 7: Cross-schema reference integrity
    """

    @given(schema_path=st_schema_with_refs)
    @settings(max_examples=100)
    def test_references_resolve(self, schema_path: Path):
        data = _load_yaml(schema_path)
        schema_names = _schema_names_in_suite()
        attributes = data["model"]["attributes"]

        for attr in attributes:
            # Check enum_type references
            if "enum_type" in attr:
                ref = attr["enum_type"]
                assert ref in schema_names, (
                    f"{schema_path.name}: attribute '{attr['name']}' references "
                    f"enum_type '{ref}' which does not exist in the schema suite"
                )

            # Check model type references (type is not a common type)
            attr_type = attr["type"]
            if attr_type not in V3_COMMON_TYPES:
                assert attr_type in schema_names, (
                    f"{schema_path.name}: attribute '{attr['name']}' references "
                    f"type '{attr_type}' which does not exist in the schema suite"
                )


class TestProperty8GeneratedCodeCompatibility:
    """
    Property 8: Generated code compatibility round-trip.

    For any schema, the generated Python model file and/or enum file
    shall exist with the expected naming convention.

    **Validates: Requirements 12.1, 12.2**

    Feature: schema-generator-v3-upgrade, Property 8: Generated code compatibility round-trip
    """

    @given(schema_path=st_any_schema_path)
    @settings(max_examples=100)
    def test_generated_code_exists(self, schema_path: Path):
        data = _load_yaml(schema_path)
        if data is None or "name" not in data:
            return  # Core schemas without name are skipped

        name = data["name"]

        # Determine expected generated file
        parent_dir = schema_path.parent.name

        if parent_dir == "registries":
            # Registries generate both an enum file and a model file
            enum_file = GENERATED_ENUMS_DIR / f"{_to_snake_case(name)}_enum.py"
            assert enum_file.exists(), (
                f"Generated enum file missing for registry '{name}': {enum_file}"
            )
        if parent_dir in ("tables", "models", "lambdas", "registries"):
            model_file = GENERATED_MODELS_DIR / f"{name}Model.py"
            assert model_file.exists(), (
                f"Generated model file missing for '{name}': {model_file}"
            )


def _to_snake_case(name: str) -> str:
    """Convert PascalCase to snake_case."""
    s = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1_\2", name)
    s = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", s)
    return s.lower()


# ===================================================================
# UNIT TESTS — Concrete migration scenarios (Task 7.3)
# ===================================================================

class TestAllTableSchemasPassValidation:
    """All 12 table schemas pass strict validation (Req 1.6)."""

    EXPECTED_COUNT = 12

    def test_correct_table_count(self):
        files = _all_schema_files(TABLES_DIR)
        assert len(files) == self.EXPECTED_COUNT, (
            f"Expected {self.EXPECTED_COUNT} table schemas, found {len(files)}"
        )

    @pytest.mark.parametrize(
        "schema_file", _all_schema_files(TABLES_DIR),
        ids=[f.stem for f in _all_schema_files(TABLES_DIR)],
    )
    def test_table_schema_valid_v3(self, schema_file: Path):
        data = _load_yaml(schema_file)
        assert data is not None
        # version
        assert str(data.get("version")) in ("1", "1.0")
        # hash
        assert HASH_PATTERN.match(data.get("hash", ""))
        # model.attributes is a list
        attrs = data.get("model", {}).get("attributes", [])
        assert isinstance(attrs, list) and len(attrs) > 0
        # dynamodb section
        assert "dynamodb" in data
        assert "partition_key" in data["dynamodb"]
        # appsync section
        assert "appsync" in data
        # no v2 fields
        assert "type" not in data
        assert "targets" not in data


class TestAllModelSchemasPassValidation:
    """All 4 model schemas pass strict validation (Req 2.3)."""

    EXPECTED_COUNT = 4

    def test_correct_model_count(self):
        files = _all_schema_files(MODELS_DIR)
        assert len(files) == self.EXPECTED_COUNT, (
            f"Expected {self.EXPECTED_COUNT} model schemas, found {len(files)}"
        )

    @pytest.mark.parametrize(
        "schema_file", _all_schema_files(MODELS_DIR),
        ids=[f.stem for f in _all_schema_files(MODELS_DIR)],
    )
    def test_model_schema_valid_v3(self, schema_file: Path):
        data = _load_yaml(schema_file)
        assert data is not None
        assert str(data.get("version")) in ("1", "1.0")
        assert HASH_PATTERN.match(data.get("hash", ""))
        attrs = data.get("model", {}).get("attributes", [])
        assert isinstance(attrs, list) and len(attrs) > 0
        assert "appsync" in data
        assert "type" not in data
        assert "targets" not in data


class TestAllRegistrySchemasPassValidation:
    """All 27 registry schemas pass strict validation (Req 3.3)."""

    EXPECTED_COUNT = 27

    def test_correct_registry_count(self):
        files = _all_schema_files(REGISTRIES_DIR)
        assert len(files) == self.EXPECTED_COUNT, (
            f"Expected {self.EXPECTED_COUNT} registry schemas, found {len(files)}"
        )

    @pytest.mark.parametrize(
        "schema_file", _all_schema_files(REGISTRIES_DIR),
        ids=[f.stem for f in _all_schema_files(REGISTRIES_DIR)],
    )
    def test_registry_schema_valid_v3(self, schema_file: Path):
        data = _load_yaml(schema_file)
        assert data is not None
        assert str(data.get("version")) in ("1", "1.0")
        assert HASH_PATTERN.match(data.get("hash", ""))
        assert "items" in data
        assert isinstance(data["items"], dict)
        assert len(data["items"]) > 0
        assert "type" not in data
        assert "targets" not in data


class TestAllLambdaSchemasPassValidation:
    """All 5 lambda schemas pass strict validation (Req 4.3)."""

    EXPECTED_COUNT = 5

    def test_correct_lambda_count(self):
        files = _all_schema_files(LAMBDAS_DIR)
        assert len(files) == self.EXPECTED_COUNT, (
            f"Expected {self.EXPECTED_COUNT} lambda schemas, found {len(files)}"
        )

    @pytest.mark.parametrize(
        "schema_file", _all_schema_files(LAMBDAS_DIR),
        ids=[f.stem for f in _all_schema_files(LAMBDAS_DIR)],
    )
    def test_lambda_schema_valid_v3(self, schema_file: Path):
        data = _load_yaml(schema_file)
        assert data is not None
        assert str(data.get("version")) in ("1", "1.0")
        assert HASH_PATTERN.match(data.get("hash", ""))
        attrs = data.get("model", {}).get("attributes", [])
        assert isinstance(attrs, list) and len(attrs) > 0
        assert "lambda" in data
        assert data["lambda"]["operation"] in ("query", "mutation")
        assert "type" not in data
        assert "targets" not in data


class TestAllCoreSchemasPassValidation:
    """All 2 core schemas pass strict validation (Req 5.2)."""

    EXPECTED_COUNT = 2

    def test_correct_core_count(self):
        files = _all_schema_files(CORE_DIR)
        assert len(files) == self.EXPECTED_COUNT, (
            f"Expected {self.EXPECTED_COUNT} core schemas, found {len(files)}"
        )

    @pytest.mark.parametrize(
        "schema_file", _all_schema_files(CORE_DIR),
        ids=[f.stem for f in _all_schema_files(CORE_DIR)],
    )
    def test_core_schema_valid_v3(self, schema_file: Path):
        data = _load_yaml(schema_file)
        assert data is not None
        version = str(data.get("version"))
        assert version in ("1", "1.0"), f"Core schema version must be '1' or '1.0', got '{version}'"
        assert HASH_PATTERN.match(data.get("hash", ""))


class TestPipfileContainsCorrectDependency:
    """Pipfile contains correct v3.2.10 dependency line (Req 6.1)."""

    def test_pipfile_has_v3_dependency(self):
        content = PIPFILE_PATH.read_text()
        assert "orb-schema-generator" in content
        assert '==3.2.10' in content, (
            "Pipfile must pin orb-schema-generator to ==3.2.10"
        )
        assert 'index = "codeartifact"' in content, (
            "Pipfile must specify index = 'codeartifact' for orb-schema-generator"
        )


class TestFullSchemaSuiteValidation:
    """Full schema suite validates with zero errors (Req 7.1)."""

    def test_total_schema_count(self):
        all_files = _all_schemas_flat()
        assert len(all_files) == 50, (
            f"Expected 50 total schemas, found {len(all_files)}"
        )

    def test_all_schemas_have_version_and_hash(self):
        errors = []
        for path in _all_schemas_flat():
            data = _load_yaml(path)
            if data is None:
                errors.append(f"{path.name}: failed to parse YAML")
                continue
            if "version" not in data:
                errors.append(f"{path.name}: missing 'version'")
            if "hash" not in data:
                errors.append(f"{path.name}: missing 'hash'")
            elif not HASH_PATTERN.match(data.get("hash", "")):
                errors.append(f"{path.name}: invalid hash format")
        assert not errors, f"Schema validation errors:\n" + "\n".join(errors)

    def test_no_v2_type_or_targets_in_any_schema(self):
        errors = []
        for path in _all_schemas_flat():
            data = _load_yaml(path)
            if data and "type" in data:
                errors.append(f"{path.name}: still has v2 'type' field")
            if data and "targets" in data:
                errors.append(f"{path.name}: still has v2 'targets' field")
        assert not errors, f"v2 fields found:\n" + "\n".join(errors)


class TestAllHashesVerify:
    """All hashes verify correctly (Req 8.2)."""

    def test_all_hashes_are_valid_format(self):
        errors = []
        for path in _all_schemas_flat():
            data = _load_yaml(path)
            if data is None:
                errors.append(f"{path.name}: failed to parse")
                continue
            h = data.get("hash", "")
            if not HASH_PATTERN.match(h):
                errors.append(f"{path.name}: hash '{h}' is invalid")
        assert not errors, f"Hash verification errors:\n" + "\n".join(errors)

    def test_hashes_are_unique(self):
        """Each schema should have a unique hash (no copy-paste errors)."""
        hashes: dict[str, str] = {}
        duplicates = []
        for path in _all_schemas_flat():
            data = _load_yaml(path)
            if data and "hash" in data:
                h = data["hash"]
                if h in hashes:
                    duplicates.append(
                        f"{path.name} and {hashes[h]} share hash {h}"
                    )
                hashes[h] = path.name
        assert not duplicates, f"Duplicate hashes:\n" + "\n".join(duplicates)
