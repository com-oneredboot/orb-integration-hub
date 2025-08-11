"""Pytest configuration and shared fixtures."""

import pytest
from pathlib import Path
from typing import Generator


@pytest.fixture
def fixtures_dir() -> Path:
    """Return the path to test fixtures directory."""
    return Path(__file__).parent / "fixtures"


@pytest.fixture
def sample_schema() -> dict:
    """Return a sample schema for testing."""
    return {
        "name": "User",
        "table": "users",
        "description": "User entity",
        "fields": [
            {
                "name": "id",
                "type": "string",
                "required": True,
                "key": True,
            },
            {
                "name": "email",
                "type": "string",
                "required": True,
                "unique": True,
            },
            {
                "name": "created_at",
                "type": "datetime",
                "required": True,
            },
        ],
        "indexes": [
            {
                "name": "email_index",
                "fields": ["email"],
                "unique": True,
            }
        ],
    }


@pytest.fixture
def temp_output_dir(tmp_path: Path) -> Generator[Path, None, None]:
    """Create a temporary output directory for generated files."""
    output_dir = tmp_path / "output"
    output_dir.mkdir()
    yield output_dir