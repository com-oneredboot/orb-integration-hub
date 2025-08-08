"""Test basic package functionality."""

import orb_common


def test_package_version():
    """Test that package version is accessible."""
    # Just verify version exists and follows semantic versioning pattern
    assert hasattr(orb_common, "__version__")
    assert isinstance(orb_common.__version__, str)
    # Check it looks like a version (e.g., "0.1.3")
    parts = orb_common.__version__.split(".")
    assert len(parts) >= 2  # At least major.minor


def test_package_metadata():
    """Test that package metadata is accessible."""
    assert orb_common.__author__ == "ORB Integration Hub Team"
    assert orb_common.__email__ == "team@orb-integration-hub.com"


def test_package_imports():
    """Test that package can be imported."""
    assert orb_common is not None
    assert hasattr(orb_common, "__version__")
