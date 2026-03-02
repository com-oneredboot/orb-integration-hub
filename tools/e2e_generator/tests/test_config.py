"""Unit tests for configuration loading."""

import pytest
from pathlib import Path
import tempfile
import yaml

from ..config import E2ETestingConfig, E2EConfig


class TestE2ETestingConfig:
    """Tests for E2ETestingConfig."""

    def test_from_dict_with_valid_data(self):
        """Test loading config from valid dictionary."""
        data = {
            "enabled": True,
            "framework": "playwright",
            "language": "typescript",
            "base_dir": "./apps/web/e2e",
            "test_patterns": "{resource}.spec.ts",
            "targets": ["ts-main"],
        }
        config = E2ETestingConfig.from_dict(data)

        assert config.enabled is True
        assert config.framework == "playwright"
        assert config.language == "typescript"
        assert config.base_dir == Path("./apps/web/e2e")
        assert config.test_patterns == "{resource}.spec.ts"
        assert config.targets == ["ts-main"]

    def test_from_dict_with_defaults(self):
        """Test default values when fields are missing."""
        config = E2ETestingConfig.from_dict({})

        assert config.enabled is True
        assert config.framework == "playwright"
        assert config.language == "typescript"
        assert config.base_dir == Path("./apps/web/e2e")
        assert config.test_patterns == "{resource}.spec.ts"
        assert config.targets == ["ts-main"]


class TestE2EConfig:
    """Tests for E2EConfig."""

    def test_from_file_with_valid_yaml(self):
        """Test loading config from valid YAML file."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".yml", delete=False) as f:
            yaml.dump(
                {
                    "project": {"name": "test-project"},
                    "paths": {"schemas": "./test-schemas"},
                    "output": {
                        "testing": {
                            "e2e": {
                                "enabled": True,
                                "framework": "playwright",
                            }
                        }
                    },
                },
                f,
            )
            config_path = Path(f.name)

        try:
            config = E2EConfig.from_file(config_path)

            assert config.project_name == "test-project"
            assert config.schemas_dir == Path("./test-schemas")
            assert config.testing.enabled is True
            assert config.testing.framework == "playwright"
        finally:
            config_path.unlink()

    def test_from_file_missing_file(self):
        """Test error handling for missing configuration file."""
        with pytest.raises(FileNotFoundError):
            E2EConfig.from_file(Path("nonexistent.yml"))

    def test_from_file_invalid_yaml(self):
        """Test error handling for invalid YAML syntax."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".yml", delete=False) as f:
            f.write("invalid: yaml: syntax:")
            config_path = Path(f.name)

        try:
            with pytest.raises(yaml.YAMLError):
                E2EConfig.from_file(config_path)
        finally:
            config_path.unlink()
