"""Schema loading and E2E metadata extraction."""

from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Dict, Any
import yaml
import logging

logger = logging.getLogger(__name__)


@dataclass
class E2EMetadata:
    """E2E metadata from schema file."""

    routes: Dict[
        str, str
    ]  # e.g., {"list": "/organizations", "detail": "/organizations/:id"}
    scenarios: List[str]  # e.g., ["create", "read", "update", "delete", "list"]
    auth_required: bool = True
    roles: List[str] = field(
        default_factory=list
    )  # e.g., ["OWNER", "EMPLOYEE", "CUSTOMER"]
    page_object: Optional[str] = None  # Custom Page Object class name


@dataclass
class SchemaWithE2E:
    """Schema with E2E metadata."""

    name: str
    schema_type: str  # "dynamodb", "standard", etc.
    attributes: Dict[str, Any]
    e2e: E2EMetadata


class SchemaLoader:
    """Loads schemas and extracts E2E metadata."""

    def __init__(self, schemas_dir: Path):
        """Initialize schema loader.

        Args:
            schemas_dir: Path to schemas directory
        """
        self.schemas_dir = schemas_dir

    def load_schemas_with_e2e(
        self, schema_filter: Optional[str] = None
    ) -> List[SchemaWithE2E]:
        """Load all schemas that have E2E metadata.

        Args:
            schema_filter: Optional schema name to filter

        Returns:
            List of schemas with E2E metadata
        """
        schemas = []

        # Search all subdirectories for YAML files
        for yaml_file in self.schemas_dir.rglob("*.yml"):
            try:
                with open(yaml_file, "r") as f:
                    data = yaml.safe_load(f)

                # Check if schema has E2E metadata
                if "e2e" not in data:
                    continue

                schema_name = data.get("name")
                if not schema_name:
                    logger.warning(f"Schema {yaml_file} missing 'name' field")
                    continue

                # Apply filter if specified
                if schema_filter and schema_name != schema_filter:
                    continue

                # Extract E2E metadata
                e2e_data = data["e2e"]
                e2e = E2EMetadata(
                    routes=e2e_data.get("routes", {}),
                    scenarios=e2e_data.get("scenarios", []),
                    auth_required=e2e_data.get("auth_required", True),
                    roles=e2e_data.get("roles", []),
                    page_object=e2e_data.get("page_object"),
                )

                # Create schema object
                schema = SchemaWithE2E(
                    name=schema_name,
                    schema_type=data.get("type", "unknown"),
                    attributes=data.get("model", {}).get("attributes", {}),
                    e2e=e2e,
                )

                schemas.append(schema)
                logger.info(f"Loaded schema with E2E metadata: {schema_name}")

            except Exception as e:
                logger.error(f"Failed to load schema {yaml_file}: {e}")

        return schemas
