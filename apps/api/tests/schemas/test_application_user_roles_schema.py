"""
Unit tests for ApplicationUserRoles schema validation.

Tests verify that the v3 schema file contains the correct structure,
attributes, lambda configuration, and auth config.
"""

import yaml
import pytest
from pathlib import Path


@pytest.fixture
def schema_path():
    """Path to ApplicationUserRoles schema file."""
    return Path(__file__).parent.parent.parent.parent.parent / "schemas" / "tables" / "ApplicationUserRoles.yml"


@pytest.fixture
def schema_data(schema_path):
    """Load schema data from YAML file."""
    with open(schema_path, 'r') as f:
        return yaml.safe_load(f)


def _get_attr(schema_data, attr_name):
    """Helper to find an attribute by name in the v3 list-style attributes."""
    for attr in schema_data['model']['attributes']:
        if attr['name'] == attr_name:
            return attr
    return None


def test_schema_version_is_v3(schema_data):
    """Verify schema uses v3 format with version '1'."""
    assert schema_data['version'] == '1', \
        "Schema version must be '1' in v3 format"


def test_schema_has_hash(schema_data):
    """Verify schema has a valid hash field."""
    assert 'hash' in schema_data, "Schema must have a hash field"
    assert schema_data['hash'].startswith('sha256:'), "Hash must be sha256 format"


def test_schema_has_lambda_section(schema_data):
    """Verify schema has lambda configuration (was lambda-dynamodb type in v2)."""
    assert 'lambda' in schema_data, \
        "Schema must have 'lambda' section for lambda-backed operations"
    assert schema_data['lambda']['operation'] == 'mutation', \
        "Lambda operation must be 'mutation'"


def test_schema_has_no_type_field(schema_data):
    """Verify v2 'type' field has been removed in v3 format."""
    assert 'type' not in schema_data, \
        "v3 schemas must not have a 'type' field"


def test_attributes_are_list_format(schema_data):
    """Verify attributes use v3 list format (not v2 dict format)."""
    attributes = schema_data['model']['attributes']
    assert isinstance(attributes, list), \
        "v3 attributes must be a list of dicts, not a dict"
    for attr in attributes:
        assert 'name' in attr, "Each attribute must have a 'name' field"
        assert 'type' in attr, f"Attribute '{attr['name']}' must have a 'type' field"


def test_required_attributes_present(schema_data):
    """Verify all required attributes are present in schema."""
    required_attrs = [
        'applicationUserRoleId',
        'userId',
        'applicationId',
        'organizationId',
        'organizationName',
        'applicationName',
        'environment',
        'roleId',
        'roleName',
        'status',
        'createdAt',
        'updatedAt',
    ]

    attr_names = [a['name'] for a in schema_data['model']['attributes']]
    for attr in required_attrs:
        assert attr in attr_names, f"Required attribute '{attr}' missing from schema"

    for a in schema_data['model']['attributes']:
        if a['name'] in required_attrs:
            assert a['required'] is True, f"Attribute '{a['name']}' must be required"


def test_organization_id_attribute(schema_data):
    """Verify organizationId attribute configuration."""
    org_id = _get_attr(schema_data, 'organizationId')
    assert org_id is not None, "organizationId attribute must exist"
    assert org_id['type'] == 'string'
    assert org_id['required'] is True
    assert 'Organization ID (denormalized for filtering)' in org_id['description']


def test_organization_name_attribute(schema_data):
    """Verify organizationName attribute configuration."""
    org_name = _get_attr(schema_data, 'organizationName')
    assert org_name is not None, "organizationName attribute must exist"
    assert org_name['type'] == 'string'
    assert org_name['required'] is True
    assert 'Organization name (denormalized for display)' in org_name['description']


def test_application_name_attribute(schema_data):
    """Verify applicationName attribute configuration."""
    app_name = _get_attr(schema_data, 'applicationName')
    assert app_name is not None, "applicationName attribute must exist"
    assert app_name['type'] == 'string'
    assert app_name['required'] is True
    assert 'Application name (denormalized for display)' in app_name['description']


def test_auth_config_maintained(schema_data):
    """Verify authentication configuration is maintained in lambda section."""
    auth_config = schema_data['lambda']['auth_config']['cognitoAuthentication']['groups']

    assert 'OWNER' in auth_config
    assert 'EMPLOYEE' in auth_config
    assert 'CUSTOMER' in auth_config

    # All groups should have access to all operations
    assert auth_config['OWNER'] == ['*']
    assert auth_config['EMPLOYEE'] == ['*']
    assert auth_config['CUSTOMER'] == ['*']
