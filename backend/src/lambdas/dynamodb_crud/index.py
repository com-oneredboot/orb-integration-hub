# file: backend/src/lambdas/dynamodb_crud/index.py
# author: Corey Dale Peters
# date: 2025-05-24
# description: AWS Lambda function for handling DynamoDB CRUD operations

import os
import json
import logging
import boto3
from botocore.exceptions import ClientError
from typing import Any, Dict

# Import the generated entity-to-table mapping
from core.models.dynamodb.repository import ENTITY_TABLE_ENV

# Setup logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Setup Clients
dynamodb = boto3.resource('dynamodb')

# CRUD operation routing
SUPPORTED_OPERATIONS = ['Create', 'Read', 'Update', 'Delete', 'Disable']


def get_table(table_env_var: str) -> Any:
    """
    Get a DynamoDB Table resource by environment variable name.
    """
    table_name = os.environ.get(table_env_var)
    if not table_name:
        raise Exception(f"Missing environment variable for table: {table_env_var}")
    return dynamodb.Table(table_name)


def parse_field(field: str) -> (str, str):
    """
    Parse the AppSync field name into (entity, operation).
    E.g., 'UsersCreate' -> ('Users', 'Create')
    """
    for op in SUPPORTED_OPERATIONS:
        if field.endswith(op):
            return field[:-len(op)], op
    raise Exception(f"Unsupported operation in field: {field}")


def create_item(table, item: Dict) -> Dict:
    """
    Create a new item in the table.
    """
    table.put_item(Item=item)
    return item


def read_item(table, key: Dict) -> Dict:
    """
    Read an item from the table by key.
    """
    resp = table.get_item(Key=key)
    return resp.get('Item')


def update_item(table, item: Dict) -> Dict:
    """
    Update an item in the table. Assumes full item is provided.
    """
    table.put_item(Item=item)
    return item


def delete_item(table, key: Dict) -> Dict:
    """
    Delete an item from the table by key.
    """
    table.delete_item(Key=key)
    return key


def disable_item(table, key: Dict) -> Dict:
    """
    Soft delete (disable) an item by setting status to 'DISABLED' and adding a disabledAt timestamp.
    """
    import datetime
    now = datetime.datetime.utcnow().isoformat()
    update = {
        'status': 'DISABLED',
        'disabledAt': now
    }
    # Merge key and update fields
    expr_attr_names = {f"#{k}": k for k in update.keys()}
    expr_attr_values = {f":{k}": v for k, v in update.items()}
    update_expr = "SET " + ", ".join([f"#{k} = :{k}" for k in update.keys()])
    table.update_item(
        Key=key,
        UpdateExpression=update_expr,
        ExpressionAttributeNames=expr_attr_names,
        ExpressionAttributeValues=expr_attr_values
    )
    return {**key, **update}


def handler(event, context):
    """
    Universal DynamoDB CRUD Lambda for AppSync.
    Routes requests based on 'field' and performs the appropriate operation.
    Returns a consistent response object.
    """
    logger.info(f"Received event: {json.dumps(event)}")
    try:
        field = event.get('field')
        args = event.get('arguments', {})
        if not field:
            raise Exception("Missing 'field' in event payload")
        entity, operation = parse_field(field)
        table_env = ENTITY_TABLE_ENV.get(entity)
        if not table_env:
            raise Exception(f"Unknown entity: {entity}")
        table = get_table(table_env)

        # Route operation
        if operation == 'Create':
            result = create_item(table, args.get('input', {}))
        elif operation == 'Read':
            result = read_item(table, args.get('input', {}))
        elif operation == 'Update':
            result = update_item(table, args.get('input', {}))
        elif operation == 'Delete':
            result = delete_item(table, args.get('input', {}))
        elif operation == 'Disable':
            result = disable_item(table, args.get('input', {}))
        else:
            raise Exception(f"Unsupported operation: {operation}")

        logger.info(f"Operation {operation} on {entity} succeeded: {result}")
        return {
            "StatusCode": 200,
            "Message": f"{operation} succeeded",
            "Data": result
        }
    except Exception as e:
        logger.error(f"Error handling request: {str(e)}", exc_info=True)
        return {
            "StatusCode": 500,
            "Message": str(e),
            "Data": None
        }
