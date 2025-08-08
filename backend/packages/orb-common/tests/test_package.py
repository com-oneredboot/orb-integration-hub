"""Test basic package functionality."""

import orb_common


def test_package_version():
    """Test that package version is accessible."""
    assert orb_common.__version__ == "0.1.1"


def test_package_metadata():
    """Test that package metadata is accessible."""
    assert orb_common.__author__ == "ORB Integration Hub Team"
    assert orb_common.__email__ == "team@orb-integration-hub.com"


def test_package_imports():
    """Test that package can be imported."""
    assert orb_common is not None
    assert hasattr(orb_common, "__version__")
