# file: backend/src/lambdas/kms_cleanup_orphaned/index.py
# author: AI Assistant
# created: 2025-06-23
# description: Simple scheduled cleanup for orphaned KMS keys

import json
import logging
import boto3
from datetime import datetime
from typing import Dict, Any, List
from botocore.exceptions import ClientError

# Import from organization security layer
import sys
import os
sys.path.append('/opt/python')
from kms_manager import OrganizationKMSManager

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    """
    Simple scheduled function to clean up KMS keys for deleted organizations.
    Triggered by CloudWatch Events (e.g., daily or weekly).
    """
    try:
        kms_manager = OrganizationKMSManager()
        dynamodb = boto3.resource('dynamodb')
        organizations_table = dynamodb.Table('Organizations')
        
        # Get all organization KMS keys
        org_keys = kms_manager.list_organization_keys()
        
        cleaned_up = 0
        errors = []
        
        logger.info(f"Checking {len(org_keys)} organization keys for cleanup")
        
        for key_info in org_keys:
            organization_id = key_info['organizationId']
            
            try:
                # Check if organization exists and is not deleted
                response = organizations_table.get_item(
                    Key={'organizationId': organization_id}
                )
                
                org_exists = 'Item' in response
                org_deleted = False
                
                if org_exists:
                    org_status = response['Item'].get('status', 'UNKNOWN')
                    org_deleted = org_status == 'DELETED'
                
                # If organization doesn't exist or is deleted, schedule key deletion
                if not org_exists or org_deleted:
                    success = kms_manager.delete_organization_key(
                        organization_id, 
                        pending_window_days=7  # Shorter window for orphaned keys
                    )
                    
                    if success:
                        cleaned_up += 1
                        status = "deleted" if org_deleted else "missing"
                        logger.info(f"Scheduled cleanup of key for {status} organization {organization_id}")
                    else:
                        errors.append({
                            'organizationId': organization_id,
                            'error': 'Key deletion scheduling failed'
                        })
                        
            except Exception as e:
                errors.append({
                    'organizationId': organization_id,
                    'error': str(e)
                })
                logger.error(f"Error processing organization {organization_id}: {str(e)}")
        
        # Log summary
        logger.info(f"Cleanup complete: {cleaned_up} keys scheduled for deletion, {len(errors)} errors")
        
        # Send CloudWatch metrics
        cloudwatch = boto3.client('cloudwatch')
        try:
            cloudwatch.put_metric_data(
                Namespace='OrganizationKMS/Cleanup',
                MetricData=[
                    {
                        'MetricName': 'OrphanedKeysFound',
                        'Value': cleaned_up,
                        'Unit': 'Count',
                        'Timestamp': datetime.now()
                    },
                    {
                        'MetricName': 'CleanupErrors',
                        'Value': len(errors),
                        'Unit': 'Count',
                        'Timestamp': datetime.now()
                    }
                ]
            )
        except Exception as e:
            logger.error(f"Failed to send CloudWatch metrics: {str(e)}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'KMS cleanup completed',
                'totalKeysChecked': len(org_keys),
                'keysScheduledForDeletion': cleaned_up,
                'errors': len(errors),
                'timestamp': datetime.now().isoformat()
            })
        }
        
    except Exception as e:
        logger.error(f"KMS cleanup function error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': f"Cleanup failed: {str(e)}",
                'timestamp': datetime.now().isoformat()
            })
        }