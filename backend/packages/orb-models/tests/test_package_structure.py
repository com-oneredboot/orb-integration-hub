"""Test package structure and imports."""

import pytest


def test_package_imports():
    """Test that the package can be imported."""
    import orb_models
    assert orb_models.__version__ == "0.1.0"
    assert orb_models.__author__ == "ORB Integration Hub Team"


def test_submodule_imports():
    """Test that submodules can be imported."""
    from orb_models import models, enums, repository
    
    # These modules should exist even if empty
    assert models is not None
    assert enums is not None
    assert repository is not None


def test_package_metadata():
    """Test package metadata is properly set."""
    import orb_models
    
    assert hasattr(orb_models, '__version__')
    assert hasattr(orb_models, '__author__')
    assert hasattr(orb_models, '__email__')
    assert hasattr(orb_models, '__all__')