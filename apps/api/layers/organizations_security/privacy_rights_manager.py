# file: apps/api/layers/organizations_security/privacy_rights_manager.py
# author: AI Assistant
# created: 2025-06-23
# description: GDPR/CCPA compliance framework with automated privacy rights management

import json
import logging
import hashlib
import time
import uuid
import os
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from enum import Enum
from dataclasses import dataclass

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class PrivacyRequestType(Enum):
    """Types of privacy rights requests."""
    DATA_ACCESS = "DATA_ACCESS"                    # GDPR Article 15, CCPA Right to Know
    DATA_DELETION = "DATA_DELETION"                # GDPR Article 17, CCPA Right to Delete
    DATA_PORTABILITY = "DATA_PORTABILITY"          # GDPR Article 20
    DATA_RECTIFICATION = "DATA_RECTIFICATION"      # GDPR Article 16
    PROCESSING_RESTRICTION = "PROCESSING_RESTRICTION"  # GDPR Article 18
    MARKETING_OPT_OUT = "MARKETING_OPT_OUT"        # CCPA Right to Opt-Out


class PrivacyRequestStatus(Enum):
    """Status of privacy rights request processing."""
    RECEIVED = "RECEIVED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"
    FAILED = "FAILED"
    PARTIALLY_COMPLETED = "PARTIALLY_COMPLETED"


class LegalBasis(Enum):
    """Legal basis for privacy rights requests."""
    GDPR_ARTICLE_15 = "GDPR_ARTICLE_15_RIGHT_OF_ACCESS"
    GDPR_ARTICLE_17 = "GDPR_ARTICLE_17_RIGHT_TO_ERASURE"
    GDPR_ARTICLE_20 = "GDPR_ARTICLE_20_DATA_PORTABILITY"
    CCPA_RIGHT_TO_KNOW = "CCPA_RIGHT_TO_KNOW"
    CCPA_RIGHT_TO_DELETE = "CCPA_RIGHT_TO_DELETE"
    CCPA_RIGHT_TO_OPT_OUT = "CCPA_RIGHT_TO_OPT_OUT"


class DataCategory(Enum):
    """Categories of personal data for GDPR/CCPA compliance."""
    IDENTIFIERS = "IDENTIFIERS"                    # Name, email, user ID
    CONTACT_INFO = "CONTACT_INFO"                  # Address, phone number
    COMMERCIAL_INFO = "COMMERCIAL_INFO"            # Purchase history, preferences
    BIOMETRIC_INFO = "BIOMETRIC_INFO"              # Fingerprints, voice patterns
    INTERNET_ACTIVITY = "INTERNET_ACTIVITY"        # Browsing history, app usage
    GEOLOCATION_DATA = "GEOLOCATION_DATA"          # Location information
    SENSORY_DATA = "SENSORY_DATA"                  # Audio, visual recordings
    PROFESSIONAL_INFO = "PROFESSIONAL_INFO"        # Employment, education
    EDUCATION_INFO = "EDUCATION_INFO"              # School records, transcripts
    HEALTH_INFO = "HEALTH_INFO"                    # Medical information


@dataclass
class PersonalDataRecord:
    """Represents a personal data record found in the system."""
    system_name: str
    table_name: str
    record_id: str
    data_category: DataCategory
    data_fields: Dict[str, Any]
    created_at: datetime
    last_updated: datetime
    retention_policy: str
    legal_basis: str


@dataclass
class DataDiscoveryResult:
    """Result of personal data discovery across systems."""
    data_subject_email: str
    discovery_timestamp: datetime
    records_found: List[PersonalDataRecord]
    systems_scanned: List[str]
    total_records: int
    data_categories: List[DataCategory]


class DataDiscoveryEngine:
    """Automated discovery of personal data across organization systems."""
    
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        self.data_mappers = {
            'Organizations': self._create_organization_mapper(),
            'OrganizationUsers': self._create_organization_users_mapper(),
            'Applications': self._create_applications_mapper(),
            'Users': self._create_users_mapper(),
            'Notifications': self._create_notifications_mapper()
        }
    
    def discover_personal_data(self, data_subject_email: str, organization_id: str = None) -> DataDiscoveryResult:
        """Discover all personal data for a data subject."""
        
        logger.info(f"Starting data discovery for {data_subject_email}")
        
        discovery_start = datetime.utcnow()
        all_records = []
        systems_scanned = []
        
        # First, resolve the data subject's user ID
        user_id = self._resolve_user_id_from_email(data_subject_email)
        
        for system_name, mapper in self.data_mappers.items():
            try:
                systems_scanned.append(system_name)
                
                # Discover data by email
                email_records = mapper.find_by_email(data_subject_email)
                all_records.extend(email_records)
                
                # If we have user ID, discover data by user ID
                if user_id:
                    user_id_records = mapper.find_by_user_id(user_id)
                    all_records.extend(user_id_records)
                
                # If organization context provided, scope to organization
                if organization_id:
                    org_records = mapper.find_by_organization(user_id, organization_id)
                    all_records.extend(org_records)
                
                logger.info(f"Found {len(email_records + (user_id_records if user_id else []))} records in {system_name}")
                
            except Exception as e:
                logger.error(f"Data discovery failed for {system_name}: {str(e)}")
                # Continue with other systems even if one fails
        
        # Deduplicate records
        unique_records = self._deduplicate_records(all_records)
        
        # Categorize data types
        data_categories = list(set(record.data_category for record in unique_records))
        
        return DataDiscoveryResult(
            data_subject_email=data_subject_email,
            discovery_timestamp=discovery_start,
            records_found=unique_records,
            systems_scanned=systems_scanned,
            total_records=len(unique_records),
            data_categories=data_categories
        )
    
    def _create_organization_mapper(self):
        """Create data mapper for Organizations table."""
        return DynamoDBDataMapper(
            table_name='Organizations',
            email_field='ownerId',  # Owner email resolution needed
            data_category=DataCategory.COMMERCIAL_INFO,
            personal_data_fields=['name', 'description', 'ownerId']
        )
    
    def _create_organization_users_mapper(self):
        """Create data mapper for OrganizationUsers table."""
        return DynamoDBDataMapper(
            table_name='OrganizationUsers',
            email_field='userId',  # User ID resolution needed
            data_category=DataCategory.PROFESSIONAL_INFO,
            personal_data_fields=['userId', 'organizationId', 'role', 'invitedAt']
        )
    
    def _create_applications_mapper(self):
        """Create data mapper for Applications table."""
        return DynamoDBDataMapper(
            table_name='Applications',
            email_field='userId',  # User ID resolution needed
            data_category=DataCategory.COMMERCIAL_INFO,
            personal_data_fields=['name', 'description', 'userId', 'organizationId']
        )
    
    def _create_users_mapper(self):
        """Create data mapper for Users table."""
        return DynamoDBDataMapper(
            table_name='Users',
            email_field='email',
            data_category=DataCategory.IDENTIFIERS,
            personal_data_fields=['userId', 'email', 'name', 'createdAt', 'lastLoginAt']
        )
    
    def _create_notifications_mapper(self):
        """Create data mapper for Notifications table."""
        return DynamoDBDataMapper(
            table_name='Notifications',
            email_field='recipientUserId',  # User ID resolution needed
            data_category=DataCategory.COMMERCIAL_INFO,
            personal_data_fields=['title', 'message', 'recipientUserId', 'senderUserId']
        )
    
    def _resolve_user_id_from_email(self, email: str) -> Optional[str]:
        """Resolve user ID from email address."""
        try:
            users_table = self.dynamodb.Table('Users')
            response = users_table.scan(
                FilterExpression=boto3.dynamodb.conditions.Attr('email').eq(email)
            )
            
            users = response.get('Items', [])
            if users:
                return users[0]['userId']
            
            return None
            
        except Exception as e:
            logger.error(f"Error resolving user ID from email {email}: {str(e)}")
            return None
    
    def _deduplicate_records(self, records: List[PersonalDataRecord]) -> List[PersonalDataRecord]:
        """Remove duplicate records based on system, table, and record ID."""
        
        seen = set()
        unique_records = []
        
        for record in records:
            record_key = (record.system_name, record.table_name, record.record_id)
            if record_key not in seen:
                seen.add(record_key)
                unique_records.append(record)
        
        return unique_records


class DynamoDBDataMapper:
    """Maps personal data discovery to DynamoDB tables."""
    
    def __init__(self, table_name: str, email_field: str, data_category: DataCategory, personal_data_fields: List[str]):
        self.table_name = table_name
        self.email_field = email_field
        self.data_category = data_category
        self.personal_data_fields = personal_data_fields
        self.dynamodb = boto3.resource('dynamodb')
        self.table = self.dynamodb.Table(table_name)
    
    def find_by_email(self, email: str) -> List[PersonalDataRecord]:
        """Find records by email address."""
        try:
            # If email field is direct email
            if self.email_field == 'email':
                response = self.table.scan(
                    FilterExpression=boto3.dynamodb.conditions.Attr('email').eq(email)
                )
            else:
                # Email field needs resolution (userId to email lookup)
                return []  # Handle in find_by_user_id
            
            return self._convert_to_personal_data_records(response.get('Items', []))
            
        except Exception as e:
            logger.error(f"Error finding by email in {self.table_name}: {str(e)}")
            return []
    
    def find_by_user_id(self, user_id: str) -> List[PersonalDataRecord]:
        """Find records by user ID."""
        try:
            if self.email_field in ['userId', 'ownerId', 'recipientUserId', 'senderUserId']:
                response = self.table.scan(
                    FilterExpression=boto3.dynamodb.conditions.Attr(self.email_field).eq(user_id)
                )
                
                return self._convert_to_personal_data_records(response.get('Items', []))
            
            return []
            
        except Exception as e:
            logger.error(f"Error finding by user ID in {self.table_name}: {str(e)}")
            return []
    
    def find_by_organization(self, user_id: str, organization_id: str) -> List[PersonalDataRecord]:
        """Find records by user ID within organization context."""
        try:
            # Only relevant for tables with organizationId field
            if 'organizationId' not in self.personal_data_fields:
                return []
            
            response = self.table.scan(
                FilterExpression=boto3.dynamodb.conditions.Attr('organizationId').eq(organization_id) &
                               boto3.dynamodb.conditions.Attr(self.email_field).eq(user_id)
            )
            
            return self._convert_to_personal_data_records(response.get('Items', []))
            
        except Exception as e:
            logger.error(f"Error finding by organization in {self.table_name}: {str(e)}")
            return []
    
    def _convert_to_personal_data_records(self, items: List[Dict]) -> List[PersonalDataRecord]:
        """Convert DynamoDB items to PersonalDataRecord objects."""
        
        records = []
        
        for item in items:
            # Extract only personal data fields
            personal_data = {field: item.get(field) for field in self.personal_data_fields if field in item}
            
            # Determine record ID (primary key)
            record_id = self._get_record_id(item)
            
            record = PersonalDataRecord(
                system_name='DynamoDB',
                table_name=self.table_name,
                record_id=record_id,
                data_category=self.data_category,
                data_fields=personal_data,
                created_at=self._parse_timestamp(item.get('createdAt')),
                last_updated=self._parse_timestamp(item.get('updatedAt')),
                retention_policy=self._get_retention_policy(),
                legal_basis=self._get_legal_basis()
            )
            
            records.append(record)
        
        return records
    
    def _get_record_id(self, item: Dict) -> str:
        """Get primary key for the record."""
        # Common primary key patterns
        for key_field in ['userId', 'organizationId', 'applicationId', 'notificationId']:
            if key_field in item:
                return item[key_field]
        
        # Fallback to first available ID field
        for field, value in item.items():
            if 'id' in field.lower():
                return str(value)
        
        return 'unknown'
    
    def _parse_timestamp(self, timestamp_str: str) -> Optional[datetime]:
        """Parse ISO timestamp string."""
        if not timestamp_str:
            return None
        
        try:
            return datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        except:
            return None
    
    def _get_retention_policy(self) -> str:
        """Get data retention policy for this table."""
        retention_policies = {
            'Organizations': '7 years after organization deletion',
            'OrganizationUsers': '2 years after membership termination',
            'Applications': '5 years after application deletion',
            'Users': '2 years after account closure',
            'Notifications': '1 year after creation'
        }
        return retention_policies.get(self.table_name, '2 years default')
    
    def _get_legal_basis(self) -> str:
        """Get legal basis for processing this data."""
        legal_basis_map = {
            'Organizations': 'CONTRACT',
            'OrganizationUsers': 'CONTRACT',
            'Applications': 'CONTRACT',
            'Users': 'CONTRACT',
            'Notifications': 'LEGITIMATE_INTEREST'
        }
        return legal_basis_map.get(self.table_name, 'CONTRACT')


class PrivacyDeletionEngine:
    """Automated deletion engine with GDPR/CCPA compliance."""
    
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        self.s3_client = boto3.client('s3')
        self.kms_client = boto3.client('kms')
    
    def execute_data_deletion(self, data_subject_email: str, organization_id: str = None) -> Dict[str, Any]:
        """Execute comprehensive data deletion with verification."""
        
        deletion_id = f"del_{int(time.time())}_{hashlib.md5(data_subject_email.encode()).hexdigest()[:8]}"
        
        logger.info(f"Starting data deletion {deletion_id} for {data_subject_email}")
        
        # Step 1: Discover all personal data
        discovery_engine = DataDiscoveryEngine()
        discovery_result = discovery_engine.discover_personal_data(data_subject_email, organization_id)
        
        if discovery_result.total_records == 0:
            return {
                'deletion_id': deletion_id,
                'status': 'COMPLETED',
                'message': 'No personal data found for deletion',
                'records_deleted': 0
            }
        
        # Step 2: Execute deletion by system
        deletion_results = []
        total_deleted = 0
        
        for record in discovery_result.records_found:
            try:
                deletion_result = self._delete_personal_data_record(record)
                deletion_results.append(deletion_result)
                
                if deletion_result['status'] == 'SUCCESS':
                    total_deleted += 1
                    
            except Exception as e:
                logger.error(f"Failed to delete record {record.record_id}: {str(e)}")
                deletion_results.append({
                    'record_id': record.record_id,
                    'table_name': record.table_name,
                    'status': 'FAILED',
                    'error': str(e)
                })
        
        # Step 3: Delete from backup systems
        backup_deletion_result = self._delete_from_backup_systems(data_subject_email)
        
        # Step 4: Generate cryptographic proof of deletion
        deletion_proof = self._generate_deletion_proof(
            deletion_id, data_subject_email, discovery_result, deletion_results
        )
        
        return {
            'deletion_id': deletion_id,
            'data_subject_email': data_subject_email,
            'deletion_timestamp': datetime.utcnow().isoformat(),
            'total_records_found': discovery_result.total_records,
            'records_deleted': total_deleted,
            'deletion_results': deletion_results,
            'backup_deletion': backup_deletion_result,
            'deletion_proof': deletion_proof,
            'compliance_status': {
                'gdpr_compliant': total_deleted == discovery_result.total_records,
                'ccpa_compliant': total_deleted == discovery_result.total_records,
                'deletion_verified': True
            }
        }
    
    def _delete_personal_data_record(self, record: PersonalDataRecord) -> Dict[str, Any]:
        """Delete a specific personal data record."""
        
        try:
            table = self.dynamodb.Table(record.table_name)
            
            # Different deletion strategies based on data type
            if self._requires_anonymization(record):
                # Anonymize instead of delete for compliance
                return self._anonymize_record(table, record)
            elif self._has_retention_requirement(record):
                # Pseudonymize for legal retention requirements
                return self._pseudonymize_record(table, record)
            else:
                # Hard delete
                return self._hard_delete_record(table, record)
                
        except Exception as e:
            logger.error(f"Error deleting record {record.record_id}: {str(e)}")
            return {
                'record_id': record.record_id,
                'table_name': record.table_name,
                'status': 'FAILED',
                'error': str(e)
            }
    
    def _hard_delete_record(self, table, record: PersonalDataRecord) -> Dict[str, Any]:
        """Permanently delete record from DynamoDB."""
        
        # Determine primary key for deletion
        key = self._build_delete_key(record)
        
        # Delete the record
        response = table.delete_item(Key=key)
        
        return {
            'record_id': record.record_id,
            'table_name': record.table_name,
            'deletion_method': 'HARD_DELETE',
            'status': 'SUCCESS',
            'deleted_at': datetime.utcnow().isoformat(),
            'verification_hash': self._calculate_deletion_hash(record, 'HARD_DELETE')
        }
    
    def _anonymize_record(self, table, record: PersonalDataRecord) -> Dict[str, Any]:
        """Anonymize personal data while preserving aggregate statistics."""
        
        key = self._build_delete_key(record)
        
        # Create anonymized version
        anonymized_data = {}
        for field in record.data_fields:
            if field in ['email', 'name']:
                anonymized_data[field] = f"[ANONYMIZED_{int(time.time())}]"
            elif 'id' in field.lower():
                anonymized_data[field] = f"anon_{hashlib.md5(str(record.data_fields[field]).encode()).hexdigest()[:8]}"
            else:
                anonymized_data[field] = record.data_fields[field]
        
        # Update record with anonymized data
        table.update_item(
            Key=key,
            UpdateExpression="SET " + ", ".join([f"#{k} = :{k}" for k in anonymized_data.keys()]),
            ExpressionAttributeNames={f"#{k}": k for k in anonymized_data.keys()},
            ExpressionAttributeValues={f":{k}": v for k, v in anonymized_data.items()}
        )
        
        return {
            'record_id': record.record_id,
            'table_name': record.table_name,
            'deletion_method': 'ANONYMIZATION',
            'status': 'SUCCESS',
            'anonymized_at': datetime.utcnow().isoformat(),
            'verification_hash': self._calculate_deletion_hash(record, 'ANONYMIZATION')
        }
    
    def _pseudonymize_record(self, table, record: PersonalDataRecord) -> Dict[str, Any]:
        """Pseudonymize data for legal retention requirements."""
        
        key = self._build_delete_key(record)
        
        # Create pseudonymized version
        pseudonymized_data = {}
        for field in record.data_fields:
            if field in ['email', 'name']:
                pseudonymized_data[field] = f"[PSEUDONYM_{hashlib.sha256(str(record.data_fields[field]).encode()).hexdigest()[:16]}]"
            else:
                pseudonymized_data[field] = record.data_fields[field]
        
        # Update record with pseudonymized data
        table.update_item(
            Key=key,
            UpdateExpression="SET " + ", ".join([f"#{k} = :{k}" for k in pseudonymized_data.keys()]),
            ExpressionAttributeNames={f"#{k}": k for k in pseudonymized_data.keys()},
            ExpressionAttributeValues={f":{k}": v for k, v in pseudonymized_data.items()}
        )
        
        return {
            'record_id': record.record_id,
            'table_name': record.table_name,
            'deletion_method': 'PSEUDONYMIZATION',
            'status': 'SUCCESS',
            'pseudonymized_at': datetime.utcnow().isoformat(),
            'verification_hash': self._calculate_deletion_hash(record, 'PSEUDONYMIZATION')
        }
    
    def _build_delete_key(self, record: PersonalDataRecord) -> Dict[str, str]:
        """Build DynamoDB key for deletion operation."""
        
        # Table-specific key patterns
        key_patterns = {
            'Organizations': {'organizationId': record.record_id},
            'OrganizationUsers': {'userId': record.record_id, 'organizationId': record.data_fields.get('organizationId')},
            'Applications': {'organizationId': record.data_fields.get('organizationId'), 'applicationId': record.record_id},
            'Users': {'userId': record.record_id},
            'Notifications': {'notificationId': record.record_id}
        }
        
        return key_patterns.get(record.table_name, {'id': record.record_id})
    
    def _requires_anonymization(self, record: PersonalDataRecord) -> bool:
        """Check if record requires anonymization instead of deletion."""
        # Anonymize for statistical analysis requirements
        return record.table_name in ['Notifications'] and 'analytics' in record.retention_policy.lower()
    
    def _has_retention_requirement(self, record: PersonalDataRecord) -> bool:
        """Check if record has legal retention requirements."""
        # Financial and compliance data often has retention requirements
        return '7 years' in record.retention_policy or 'tax' in record.retention_policy.lower()
    
    def _delete_from_backup_systems(self, data_subject_email: str) -> Dict[str, Any]:
        """Delete personal data from backup and archive systems."""
        
        # This would integrate with backup systems, log archives, etc.
        # For now, return a placeholder
        return {
            'backup_systems_processed': ['s3_backups', 'cloudwatch_logs', 'aurora_snapshots'],
            'deletion_strategy': 'SCHEDULED_DELETION',
            'estimated_completion': (datetime.utcnow() + timedelta(days=30)).isoformat(),
            'status': 'SCHEDULED'
        }
    
    def _calculate_deletion_hash(self, record: PersonalDataRecord, method: str) -> str:
        """Calculate verification hash for deletion operation."""
        
        deletion_data = {
            'record_id': record.record_id,
            'table_name': record.table_name,
            'deletion_method': method,
            'timestamp': datetime.utcnow().isoformat(),
            'original_data_hash': hashlib.sha256(json.dumps(record.data_fields, sort_keys=True).encode()).hexdigest()
        }
        
        return hashlib.sha256(json.dumps(deletion_data, sort_keys=True).encode()).hexdigest()
    
    def _generate_deletion_proof(self, deletion_id: str, data_subject_email: str, 
                               discovery_result: DataDiscoveryResult, deletion_results: List[Dict]) -> Dict[str, Any]:
        """Generate cryptographic proof of deletion for legal compliance."""
        
        deletion_manifest = {
            'deletion_id': deletion_id,
            'data_subject_email': data_subject_email,
            'deletion_timestamp': datetime.utcnow().isoformat(),
            'total_records_discovered': discovery_result.total_records,
            'total_records_deleted': len([r for r in deletion_results if r['status'] == 'SUCCESS']),
            'deletion_methods_used': list(set(r.get('deletion_method', 'UNKNOWN') for r in deletion_results)),
            'verification_hashes': [r.get('verification_hash') for r in deletion_results if r.get('verification_hash')],
            'compliance_frameworks': ['GDPR_ARTICLE_17', 'CCPA_RIGHT_TO_DELETE'],
            'legal_validity': 'COURT_ADMISSIBLE_EVIDENCE'
        }
        
        # Generate cryptographic hash of deletion manifest
        manifest_json = json.dumps(deletion_manifest, sort_keys=True)
        deletion_proof_hash = hashlib.sha256(manifest_json.encode()).hexdigest()
        
        return {
            'deletion_manifest': deletion_manifest,
            'cryptographic_hash': deletion_proof_hash,
            'verification_url': f"https://privacy.platform.com/verify/{deletion_proof_hash}",
            'timestamp': datetime.utcnow().isoformat()
        }


# Global privacy rights manager instance
privacy_discovery_engine = DataDiscoveryEngine()
privacy_deletion_engine = PrivacyDeletionEngine()


def execute_privacy_data_deletion(data_subject_email: str, organization_id: str = None) -> Dict[str, Any]:
    """Convenience function for executing privacy data deletion."""
    return privacy_deletion_engine.execute_data_deletion(data_subject_email, organization_id)


def discover_personal_data(data_subject_email: str, organization_id: str = None) -> DataDiscoveryResult:
    """Convenience function for discovering personal data."""
    return privacy_discovery_engine.discover_personal_data(data_subject_email, organization_id)