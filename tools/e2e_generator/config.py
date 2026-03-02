"""Configuration models for E2E test generation."""

from dataclasses import dataclass, field
from pathlib import Path
from typing import List
import yaml


@dataclass
class E2ETestingConfig:
    """E2E testing configuration from schema-generator.yml."""

    enabled: bool = True
    framework: str = "playwright"
    language: str = "typescript"
    base_dir: Path = Path("./apps/web/e2e")
    test_patterns: str = "{resource}.spec.ts"
    targets: List[str] = field(default_factory=lambda: ["ts-main"])

    @classmethod
    def from_dict(cls, data: dict) -> "E2ETestingConfig":
        """Create config from dictionary.

        Args:
            data: Dictionary with E2E configuration

        Returns:
            E2ETestingConfig instance
        """
        return cls(
            enabled=data.get("enabled", True),
            framework=data.get("framework", "playwright"),
            language=data.get("language", "typescript"),
            base_dir=Path(data.get("base_dir", "./apps/web/e2e")),
            test_patterns=data.get("test_patterns", "{resource}.spec.ts"),
            targets=data.get("targets", ["ts-main"]),
        )


@dataclass
class E2EConfig:
    """Complete E2E generator configuration."""

    testing: E2ETestingConfig
    schemas_dir: Path
    project_name: str

    @classmethod
    def from_file(cls, config_path: Path) -> "E2EConfig":
        """Load configuration from schema-generator.yml.

        Args:
            config_path: Path to configuration file

        Returns:
            E2EConfig instance

        Raises:
            FileNotFoundError: If configuration file doesn't exist
            yaml.YAMLError: If YAML syntax is invalid
        """
        if not config_path.exists():
            raise FileNotFoundError(f"Configuration file not found: {config_path}")

        with open(config_path, "r") as f:
            data = yaml.safe_load(f)

        # Extract E2E testing config
        testing_data = data.get("output", {}).get("testing", {}).get("e2e", {})
        testing = E2ETestingConfig.from_dict(testing_data)

        # Extract paths
        schemas_dir = Path(data.get("paths", {}).get("schemas", "./schemas"))

        # Extract project info
        project_name = data.get("project", {}).get("name", "project")

        return cls(testing=testing, schemas_dir=schemas_dir, project_name=project_name)
