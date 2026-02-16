"""
Unit tests for ApplicationUserRoles schema validation.

Tests verify that the schema file contains the correct type, attributes, and GSI indexes.
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


def test_schema_type_is_lambda_dynamodb(schema_data):
    """Verify schema type is lambda-dynamodb."""
    assert schema_data['type'] == 'lambda-dynamodb', \
        "Schema type must be 'lambda-dynamodb' to support Lambda-backed queries"


def test_schema_version_is_1_2(schema_data):
    """Verify schema version is 1.2."""
    assert schema_data['version'] == '1.2', \
        "Schema version must be '1.2' after removing permissions array"


def test_required_attributes_present(schema_data):
    """Verify all required attributes are present in schema."""
    attributes = schema_data['model']['attributes']
    
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
        'updatedAt'
    ]
    
    for attr in required_attrs:
        assert attr in attributes, f"Required attribute '{attr}' missing from schema"
        assert attributes[attr]['required'] is True, f"Attribute '{attr}' must be required"


def test_organization_id_attribute(schema_data):
    """Verify organizationId attribute configuration."""
    org_id = schema_data['model']['attributes']['organizationId']
    
    assert org_id['type'] == 'string'
    assert org_id['required'] is True
    assert 'Organization ID (denormalized for filtering)' in org_id['description']


def test_organization_name_attribute(schema_data):
    """Verify organizationName attribute configuration."""
    org_name = schema_data['model']['attributes']['organizationName']
    
    assert org_name['type'] == 'string'
    assert org_name['required'] is True
    assert 'Organization name (denormalized for display)' in org_name['description']


def test_application_name_attribute(schema_data):
    """Verify applicationName attribute configuration."""
    app_name = schema_data['model']['attributes']['applicationName']
    
    assert app_name['type'] == 'string'
    assert app_name['required'] is True
    assert 'Application name (denormalized for display)' in app_name['description']


def test_all_gsi_indexes_maintained(schema_data):
    """Verify all four GSI indexes are maintained."""
    indexes = schema_data['model']['keys']['secondary']
    index_names = [idx['name'] for idx in indexes]
    
    required_indexes = [
        'UserEnvRoleIndex',
        'AppEnvUserIndex',
        'UserAppIndex',
        'UserStatusIndex'
    ]
    
    for idx_name in required_indexes:
        assert idx_name in index_names, f"Required GSI '{idx_name}' missing from schema"


def test_user_env_role_index_configuration(schema_data):
    """Verify UserEnvRoleIndex GSI configuration."""
    indexes = schema_data['model']['keys']['secondary']
    user_env_idx = next(idx for idx in indexes if idx['name'] == 'UserEnvRoleIndex')
    
    assert user_env_idx['type'] == 'GSI'
    assert user_env_idx['partition'] == 'userId'
    assert user_env_idx['sort'] == 'environment'
    assert user_env_idx['projection_type'] == 'ALL'


def test_app_env_user_index_configuration(schema_data):
    """Verify AppEnvUserIndex GSI configuration."""
    indexes = schema_data['model']['keys']['secondary']
    app_env_idx = next(idx for idx in indexes if idx['name'] == 'AppEnvUserIndex')
    
    assert app_env_idx['type'] == 'GSI'
    assert app_env_idx['partition'] == 'applicationId'
    assert app_env_idx['sort'] == 'environment'
    assert app_env_idx['projection_type'] == 'ALL'


def test_user_app_index_configuration(schema_data):
    """Verify UserAppIndex GSI configuration."""
    indexes = schema_data['model']['keys']['secondary']
    user_app_idx = next(idx for idx in indexes if idx['name'] == 'UserAppIndex')
    
    assert user_app_idx['type'] == 'GSI'
    assert user_app_idx['partition'] == 'userId'
    assert user_app_idx['sort'] == 'applicationId'
    assert user_app_idx['projection_type'] == 'ALL'


def test_user_status_index_configuration(schema_data):
    """Verify UserStatusIndex GSI configuration."""
    indexes = schema_data['model']['keys']['secondary']
    user_status_idx = next(idx for idx in indexes if idx['name'] == 'UserStatusIndex')
    
    assert user_status_idx['type'] == 'GSI'
    assert user_status_idx['partition'] == 'userId'
    assert user_status_idx['sort'] == 'status'
    assert user_status_idx['projection_type'] == 'ALL'


def test_auth_config_maintained(schema_data):
    """Verify authentication configuration is maintained."""
    auth_config = schema_data['model']['authConfig']['cognitoAuthentication']['groups']
    
    assert 'OWNER' in auth_config
    assert 'EMPLOYEE' in auth_config
    assert 'CUSTOMER' in auth_config
    
    # All groups should have access to all operations
    assert auth_config['OWNER'] == ['*']
    assert auth_config['EMPLOYEE'] == ['*']
    assert auth_config['CUSTOMER'] == ['*']
