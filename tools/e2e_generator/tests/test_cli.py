"""Unit tests for CLI."""

from pathlib import Path
import tempfile
import yaml
import subprocess
import sys


class TestCLI:
    """Tests for CLI entry point."""

    def test_cli_with_valid_config(self):
        """Test CLI with valid configuration."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)

            # Create config file
            config_file = tmpdir_path / "config.yml"
            config_file.write_text(
                yaml.dump(
                    {
                        "project": {"name": "test"},
                        "paths": {"schemas": str(tmpdir_path / "schemas")},
                        "output": {"testing": {"e2e": {"enabled": True}}},
                    }
                )
            )

            # Create schemas directory (empty is fine for this test)
            (tmpdir_path / "schemas").mkdir()

            # Run CLI
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

            # Should succeed (exit code 0)
            assert result.returncode == 0

    def test_cli_with_missing_config(self):
        """Test CLI with missing configuration file."""
        result = subprocess.run(
            [
                sys.executable,
                "-m",
                "tools.e2e_generator",
                "generate",
                "--config",
                "nonexistent.yml",
            ],
            capture_output=True,
            text=True,
        )

        # Should fail (non-zero exit code)
        assert result.returncode != 0
        assert "not found" in result.stderr.lower()

    def test_cli_with_schema_filter(self):
        """Test CLI with --schema flag."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)

            # Create config file
            config_file = tmpdir_path / "config.yml"
            config_file.write_text(
                yaml.dump(
                    {
                        "project": {"name": "test"},
                        "paths": {"schemas": str(tmpdir_path / "schemas")},
                        "output": {"testing": {"e2e": {"enabled": True}}},
                    }
                )
            )

            # Create schemas directory
            schemas_dir = tmpdir_path / "schemas"
            schemas_dir.mkdir()

            # Create schema with E2E metadata
            schema_file = schemas_dir / "test.yml"
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

            # Run CLI with schema filter
            result = subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "tools.e2e_generator",
                    "generate",
                    "--config",
                    str(config_file),
                    "--schema",
                    "TestResource",
                ],
                capture_output=True,
                text=True,
            )

            # Should succeed
            assert result.returncode == 0

    def test_cli_with_dry_run(self):
        """Test CLI with --dry-run flag."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)

            # Create config file
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

            # Create schemas directory
            (tmpdir_path / "schemas").mkdir()

            # Run CLI with dry-run
            result = subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "tools.e2e_generator",
                    "generate",
                    "--config",
                    str(config_file),
                    "--dry-run",
                ],
                capture_output=True,
                text=True,
            )

            # Should succeed
            assert result.returncode == 0

            # No files should be created
            assert not (tmpdir_path / "e2e").exists()

    def test_cli_with_verbose(self):
        """Test CLI with --verbose flag."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)

            # Create config file
            config_file = tmpdir_path / "config.yml"
            config_file.write_text(
                yaml.dump(
                    {
                        "project": {"name": "test"},
                        "paths": {"schemas": str(tmpdir_path / "schemas")},
                        "output": {"testing": {"e2e": {"enabled": True}}},
                    }
                )
            )

            # Create schemas directory
            (tmpdir_path / "schemas").mkdir()

            # Run CLI with verbose
            result = subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "tools.e2e_generator",
                    "generate",
                    "--config",
                    str(config_file),
                    "--verbose",
                ],
                capture_output=True,
                text=True,
            )

            # Should succeed and have debug output
            assert result.returncode == 0
