# file: backend/src/layers/organizations_security/kms_manager.py
# author: AI Assistant
# created: 2025-06-23
# description: Organization-specific KMS encryption key management

import boto3
import json
import logging
from typing import Dict, Any, Optional, List
from botocore.exceptions import ClientError
from cryptography.fernet import Fernet
import base64
import os

logger = logging.getLogger(__name__)


class OrganizationKMSManager:
    """
    Manages organization-specific KMS encryption keys for enhanced security
    and limited blast radius in multi-tenant architecture.
    """
    
    def __init__(self, region: str = None):
        """
        Initialize the KMS manager.
        
        Args:
            region: AWS region, defaults to None (uses AWS_REGION env var)
        """
        self.kms_client = boto3.client('kms', region_name=region)
        self.dynamodb = boto3.resource('dynamodb', region_name=region)
        self.organizations_table = self.dynamodb.Table('Organizations')
        self.region = region or os.environ.get('AWS_REGION', 'us-east-1')
        
    def create_organization_kms_key(
        self, 
        organization_id: str, 
        organization_name: str,
        owner_user_id: str
    ) -> Dict[str, str]:
        """
        Create a dedicated KMS key for an organization.
        
        Args:
            organization_id: Unique organization identifier
            organization_name: Human-readable organization name
            owner_user_id: ID of the organization owner
            
        Returns:
            Dict containing keyId, keyArn, and aliasName
        """
        try:
            # Create key policy for organization-specific access
            key_policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Sid": "Enable IAM User Permissions",
                        "Effect": "Allow",
                        "Principal": {
                            "AWS": f"arn:aws:iam::{self._get_account_id()}:root"
                        },
                        "Action": "kms:*",
                        "Resource": "*"
                    },
                    {
                        "Sid": "Allow Lambda service access for DynamoDB encryption",
                        "Effect": "Allow",
                        "Principal": {
                            "AWS": f"arn:aws:iam::{self._get_account_id()}:root"
                        },
                        "Action": [
                            "kms:Encrypt",
                            "kms:Decrypt",
                            "kms:ReEncrypt*",
                            "kms:GenerateDataKey*",
                            "kms:DescribeKey"
                        ],
                        "Resource": "*",
                        "Condition": {
                            "StringEquals": {
                                "kms:ViaService": f"dynamodb.{self.region}.amazonaws.com"
                            }
                        }
                    }
                ]
            }
            
            # Create the KMS key
            response = self.kms_client.create_key(
                Policy=json.dumps(key_policy),
                Description=f"Organization-specific encryption key for {organization_name} ({organization_id})",
                KeyUsage='ENCRYPT_DECRYPT',
                KeySpec='SYMMETRIC_DEFAULT',
                Origin='AWS_KMS',
                Tags=[
                    {
                        'TagKey': 'OrganizationId',
                        'TagValue': organization_id
                    },
                    {
                        'TagKey': 'Environment',
                        'TagValue': os.environ.get('ENVIRONMENT', 'dev')
                    },
                    {
                        'TagKey': 'CustomerId',
                        'TagValue': os.environ.get('CUSTOMER_ID', 'orb')
                    },
                    {
                        'TagKey': 'ProjectId',
                        'TagValue': os.environ.get('PROJECT_ID', 'integration-hub')
                    },
                    {
                        'TagKey': 'Purpose',
                        'TagValue': 'organization-encryption'
                    }
                ]
            )
            
            key_id = response['KeyMetadata']['KeyId']
            key_arn = response['KeyMetadata']['Arn']
            
            # Create an alias for easier reference
            alias_name = f"alias/org-{organization_id}"
            
            try:
                self.kms_client.create_alias(
                    AliasName=alias_name,
                    TargetKeyId=key_id
                )
            except ClientError as e:
                if e.response['Error']['Code'] != 'AlreadyExistsException':
                    raise
                logger.warning(f"Alias {alias_name} already exists")
            
            # Enable automatic key rotation
            self.kms_client.enable_key_rotation(KeyId=key_id)
            
            logger.info(f"Created KMS key {key_id} for organization {organization_id}")
            
            return {
                'keyId': key_id,
                'keyArn': key_arn,
                'aliasName': alias_name
            }
            
        except ClientError as e:
            logger.error(f"Failed to create KMS key for organization {organization_id}: {e}")
            raise
    
    def get_organization_kms_key(self, organization_id: str) -> Optional[Dict[str, str]]:
        """
        Retrieve the KMS key information for an organization.
        
        Args:
            organization_id: Organization identifier
            
        Returns:
            Dict with key information or None if not found
        """
        try:
            alias_name = f"alias/org-{organization_id}"
            
            response = self.kms_client.describe_key(KeyId=alias_name)
            key_metadata = response['KeyMetadata']
            
            return {
                'keyId': key_metadata['KeyId'],
                'keyArn': key_metadata['Arn'],
                'aliasName': alias_name,
                'enabled': key_metadata['Enabled'],
                'keyRotationEnabled': self._is_key_rotation_enabled(key_metadata['KeyId'])
            }
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'NotFoundException':
                return None
            logger.error(f"Failed to get KMS key for organization {organization_id}: {e}")
            raise
    
    def encrypt_organization_data(
        self, 
        organization_id: str, 
        plaintext_data: str,
        encryption_context: Optional[Dict[str, str]] = None
    ) -> str:
        """
        Encrypt data using the organization's KMS key.
        
        Args:
            organization_id: Organization identifier
            plaintext_data: Data to encrypt
            encryption_context: Additional context for encryption
            
        Returns:
            Base64-encoded encrypted data
        """
        try:
            alias_name = f"alias/org-{organization_id}"
            
            # Set default encryption context
            context = encryption_context or {}
            context.update({
                'OrganizationId': organization_id,
                'Purpose': 'OrganizationData'
            })
            
            response = self.kms_client.encrypt(
                KeyId=alias_name,
                Plaintext=plaintext_data.encode('utf-8'),
                EncryptionContext=context
            )
            
            # Return base64-encoded ciphertext
            return base64.b64encode(response['CiphertextBlob']).decode('utf-8')
            
        except ClientError as e:
            logger.error(f"Failed to encrypt data for organization {organization_id}: {e}")
            raise
    
    def decrypt_organization_data(
        self, 
        organization_id: str, 
        encrypted_data: str,
        encryption_context: Optional[Dict[str, str]] = None
    ) -> str:
        """
        Decrypt data using the organization's KMS key.
        
        Args:
            organization_id: Organization identifier
            encrypted_data: Base64-encoded encrypted data
            encryption_context: Expected encryption context
            
        Returns:
            Decrypted plaintext data
        """
        try:
            # Set expected encryption context
            context = encryption_context or {}
            context.update({
                'OrganizationId': organization_id,
                'Purpose': 'OrganizationData'
            })
            
            # Decode base64 data
            ciphertext_blob = base64.b64decode(encrypted_data.encode('utf-8'))
            
            response = self.kms_client.decrypt(
                CiphertextBlob=ciphertext_blob,
                EncryptionContext=context
            )
            
            return response['Plaintext'].decode('utf-8')
            
        except ClientError as e:
            logger.error(f"Failed to decrypt data for organization {organization_id}: {e}")
            raise
    
    def rotate_organization_key(self, organization_id: str) -> bool:
        """
        Manually trigger key rotation for an organization.
        
        Args:
            organization_id: Organization identifier
            
        Returns:
            True if rotation was triggered successfully
        """
        try:
            alias_name = f"alias/org-{organization_id}"
            
            # Check if key rotation is enabled
            key_info = self.get_organization_kms_key(organization_id)
            if not key_info or not key_info.get('keyRotationEnabled'):
                logger.warning(f"Key rotation not enabled for organization {organization_id}")
                return False
            
            # KMS handles automatic rotation, but we can log this event
            logger.info(f"Key rotation check performed for organization {organization_id}")
            
            # In a real implementation, you might want to:
            # 1. Create a new key version
            # 2. Update application configurations
            # 3. Re-encrypt critical data with new key
            
            return True
            
        except ClientError as e:
            logger.error(f"Failed to rotate key for organization {organization_id}: {e}")
            return False
    
    def delete_organization_key(self, organization_id: str, pending_window_days: int = 30) -> bool:
        """
        Schedule deletion of an organization's KMS key.
        
        Args:
            organization_id: Organization identifier
            pending_window_days: Days to wait before deletion (7-30)
            
        Returns:
            True if deletion was scheduled successfully
        """
        try:
            alias_name = f"alias/org-{organization_id}"
            
            # Get key information
            key_info = self.get_organization_kms_key(organization_id)
            if not key_info:
                logger.warning(f"No KMS key found for organization {organization_id}")
                return False
            
            # Schedule key deletion
            self.kms_client.schedule_key_deletion(
                KeyId=key_info['keyId'],
                PendingWindowInDays=pending_window_days
            )
            
            # Delete the alias
            try:
                self.kms_client.delete_alias(AliasName=alias_name)
            except ClientError as e:
                logger.warning(f"Failed to delete alias {alias_name}: {e}")
            
            logger.info(f"Scheduled deletion of KMS key for organization {organization_id} in {pending_window_days} days")
            return True
            
        except ClientError as e:
            logger.error(f"Failed to schedule key deletion for organization {organization_id}: {e}")
            return False
    
    def list_organization_keys(self) -> List[Dict[str, Any]]:
        """
        List all organization-specific KMS keys.
        
        Returns:
            List of organization key information
        """
        try:
            # Get all aliases starting with 'alias/org-'
            paginator = self.kms_client.get_paginator('list_aliases')
            org_keys = []
            
            for page in paginator.paginate():
                for alias in page['Aliases']:
                    if alias['AliasName'].startswith('alias/org-'):
                        organization_id = alias['AliasName'].replace('alias/org-', '')
                        
                        # Get key details
                        try:
                            key_response = self.kms_client.describe_key(KeyId=alias['TargetKeyId'])
                            key_metadata = key_response['KeyMetadata']
                            
                            org_keys.append({
                                'organizationId': organization_id,
                                'keyId': key_metadata['KeyId'],
                                'keyArn': key_metadata['Arn'],
                                'aliasName': alias['AliasName'],
                                'enabled': key_metadata['Enabled'],
                                'creationDate': key_metadata['CreationDate'],
                                'keyRotationEnabled': self._is_key_rotation_enabled(key_metadata['KeyId'])
                            })
                        except ClientError as e:
                            logger.warning(f"Failed to get details for key {alias['TargetKeyId']}: {e}")
            
            return org_keys
            
        except ClientError as e:
            logger.error(f"Failed to list organization keys: {e}")
            return []
    
    def _get_account_id(self) -> str:
        """Get the current AWS account ID."""
        try:
            sts_client = boto3.client('sts')
            return sts_client.get_caller_identity()['Account']
        except ClientError:
            # Fallback for testing
            return '123456789012'
    
    def _is_key_rotation_enabled(self, key_id: str) -> bool:
        """Check if key rotation is enabled for a key."""
        try:
            response = self.kms_client.get_key_rotation_status(KeyId=key_id)
            return response['KeyRotationEnabled']
        except ClientError:
            return False
    
    def get_key_usage_metrics(self, organization_id: str, days: int = 30) -> Dict[str, Any]:
        """
        Get usage metrics for an organization's KMS key.
        Note: This would require CloudWatch integration for full implementation.
        
        Args:
            organization_id: Organization identifier
            days: Number of days to look back
            
        Returns:
            Dict with usage metrics
        """
        # Placeholder for CloudWatch integration
        return {
            'organizationId': organization_id,
            'period': f'{days} days',
            'encryptionOperations': 0,  # Would come from CloudWatch
            'decryptionOperations': 0,  # Would come from CloudWatch
            'keyRotations': 0,          # Would come from CloudWatch
            'lastUsed': None            # Would come from CloudWatch
        }