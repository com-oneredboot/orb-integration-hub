# file: backend/src/layers/shared_security/audit/state_tracker.py
# author: AI Assistant
# created: 2025-07-17
# description: State tracking for audit logging with PII detection

import json
import hashlib
from datetime import datetime
from typing import Dict, Any, List, Optional, Set
from dataclasses import dataclass, asdict
from enum import Enum


class FieldClassification(Enum):
    """Classification of data fields for compliance."""
    STANDARD = "standard"
    SENSITIVE = "sensitive"  # Passwords, tokens, keys
    PII = "pii"  # Personally Identifiable Information
    PROTECTED = "protected"  # Roles, permissions, security settings
    FINANCIAL = "financial"  # Credit cards, bank accounts
    HEALTHCARE = "healthcare"  # Medical records, health data


@dataclass
class FieldChange:
    """Represents a single field change."""
    field: str
    old_value: Any
    new_value: Any
    classification: FieldClassification
    change_type: str  # added, modified, removed
    is_masked: bool = False


class StateTracker:
    """Tracks state changes for audit logging with PII protection."""
    
    # Default sensitive fields that should always be masked
    SENSITIVE_FIELDS = {
        'password', 'token', 'secret', 'key', 'apiKey', 'privateKey',
        'accessToken', 'refreshToken', 'sessionToken', 'authToken'
    }
    
    # PII fields that may need special handling
    PII_FIELDS = {
        'email', 'phoneNumber', 'address', 'ssn', 'socialSecurityNumber',
        'dateOfBirth', 'firstName', 'lastName', 'fullName', 'displayName',
        'maidenName', 'driverLicense', 'passportNumber', 'taxId'
    }
    
    # Financial fields
    FINANCIAL_FIELDS = {
        'creditCard', 'creditCardNumber', 'cvv', 'bankAccount', 
        'routingNumber', 'iban', 'swift'
    }
    
    # Protected fields that affect security
    PROTECTED_FIELDS = {
        'role', 'roles', 'permissions', 'groups', 'status', 'isActive',
        'isAdmin', 'isSuperUser', 'accessLevel'
    }
    
    def __init__(self, custom_sensitive_fields: Set[str] = None):
        """Initialize with optional custom sensitive fields."""
        self.custom_sensitive_fields = custom_sensitive_fields or set()
    
    def capture_state_change(
        self,
        resource_type: str,
        resource_id: str,
        old_state: Dict[str, Any],
        new_state: Dict[str, Any],
        sensitive_fields: List[str] = None,
        mask_pii: bool = True
    ) -> Dict[str, Any]:
        """Capture and analyze state changes between old and new states."""
        if sensitive_fields:
            # Add custom sensitive fields for this operation
            all_sensitive_fields = self.SENSITIVE_FIELDS | set(sensitive_fields) | self.custom_sensitive_fields
        else:
            all_sensitive_fields = self.SENSITIVE_FIELDS | self.custom_sensitive_fields
        
        changes = []
        
        # Get all fields from both states
        all_fields = set(old_state.keys()) | set(new_state.keys())
        
        # Track what type of operation this is
        is_create = not old_state and new_state
        is_delete = old_state and not new_state
        is_update = old_state and new_state
        
        for field in all_fields:
            old_value = old_state.get(field) if old_state else None
            new_value = new_state.get(field) if new_state else None
            
            # Skip if no change
            if old_value == new_value:
                continue
            
            # Determine change type
            if old_value is None and new_value is not None:
                change_type = "added"
            elif old_value is not None and new_value is None:
                change_type = "removed"
            else:
                change_type = "modified"
            
            # Classify the field
            classification = self._classify_field(field, all_sensitive_fields)
            
            # Mask values if needed
            is_masked = False
            if classification in [FieldClassification.SENSITIVE, FieldClassification.FINANCIAL]:
                # Always mask sensitive and financial data
                old_value = self._mask_value(old_value) if old_value is not None else None
                new_value = self._mask_value(new_value) if new_value is not None else None
                is_masked = True
            elif classification == FieldClassification.PII and mask_pii:
                # Optionally mask PII based on compliance requirements
                old_value = self._mask_pii_value(field, old_value) if old_value is not None else None
                new_value = self._mask_pii_value(field, new_value) if new_value is not None else None
                is_masked = True
            
            changes.append(FieldChange(
                field=field,
                old_value=old_value,
                new_value=new_value,
                classification=classification,
                change_type=change_type,
                is_masked=is_masked
            ))
        
        # Build summary
        operation_type = "CREATED" if is_create else "DELETED" if is_delete else "MODIFIED"
        
        summary = {
            'resourceType': resource_type,
            'resourceId': resource_id,
            'operationType': operation_type,
            'timestamp': datetime.utcnow().isoformat(),
            'changeCount': len(changes),
            'changes': [asdict(change) for change in changes],
            'fieldsSummary': self._summarize_changes(changes)
        }
        
        # Add data integrity check
        if old_state:
            summary['oldStateHash'] = self._calculate_state_hash(old_state)
        if new_state:
            summary['newStateHash'] = self._calculate_state_hash(new_state)
        
        return summary
    
    def _classify_field(self, field: str, sensitive_fields: Set[str]) -> FieldClassification:
        """Classify a field based on its name and type."""
        field_lower = field.lower()
        
        # Check in order of sensitivity
        if field in sensitive_fields or any(s in field_lower for s in self.SENSITIVE_FIELDS):
            return FieldClassification.SENSITIVE
        
        if field_lower in self.FINANCIAL_FIELDS or any(f in field_lower for f in self.FINANCIAL_FIELDS):
            return FieldClassification.FINANCIAL
        
        if field_lower in self.PROTECTED_FIELDS or any(p in field_lower for p in self.PROTECTED_FIELDS):
            return FieldClassification.PROTECTED
        
        if field_lower in self.PII_FIELDS or any(p in field_lower for p in self.PII_FIELDS):
            return FieldClassification.PII
        
        # Check for healthcare indicators
        if any(h in field_lower for h in ['medical', 'health', 'diagnosis', 'prescription']):
            return FieldClassification.HEALTHCARE
        
        return FieldClassification.STANDARD
    
    def _mask_value(self, value: Any) -> str:
        """Completely mask sensitive values."""
        if value is None:
            return None
        
        # For strings, show length indicator
        if isinstance(value, str):
            length = len(value)
            if length <= 4:
                return "****"
            elif length <= 8:
                return "********"
            else:
                return f"***[{length} chars]***"
        
        # For other types, just indicate the type
        return f"***[{type(value).__name__}]***"
    
    def _mask_pii_value(self, field: str, value: Any) -> str:
        """Partially mask PII values to maintain some utility."""
        if value is None or not isinstance(value, str):
            return self._mask_value(value)
        
        field_lower = field.lower()
        
        # Email: show domain
        if 'email' in field_lower and '@' in value:
            parts = value.split('@')
            username = parts[0]
            if len(username) > 2:
                masked_username = username[0] + '*' * (len(username) - 2) + username[-1]
            else:
                masked_username = '*' * len(username)
            return f"{masked_username}@{parts[1]}"
        
        # Phone: show area code
        elif 'phone' in field_lower and len(value) >= 10:
            # Assuming US phone format
            return f"{value[:3]}-***-****"
        
        # SSN: show last 4
        elif 'ssn' in field_lower or 'social' in field_lower:
            if len(value) >= 4:
                return f"***-**-{value[-4:]}"
            else:
                return "****"
        
        # Names: show first letter
        elif any(n in field_lower for n in ['name', 'firstname', 'lastname']):
            if len(value) > 0:
                return value[0] + '*' * (len(value) - 1)
            else:
                return ""
        
        # Default: show first and last character
        else:
            if len(value) > 2:
                return value[0] + '*' * (len(value) - 2) + value[-1]
            else:
                return '*' * len(value)
    
    def _summarize_changes(self, changes: List[FieldChange]) -> Dict[str, Any]:
        """Summarize changes by classification and type."""
        summary = {
            'byClassification': {},
            'byChangeType': {},
            'sensitiveFieldsModified': [],
            'piiFieldsModified': []
        }
        
        # Count by classification
        for change in changes:
            class_name = change.classification.value
            if class_name not in summary['byClassification']:
                summary['byClassification'][class_name] = 0
            summary['byClassification'][class_name] += 1
            
            # Count by change type
            if change.change_type not in summary['byChangeType']:
                summary['byChangeType'][change.change_type] = 0
            summary['byChangeType'][change.change_type] += 1
            
            # Track sensitive and PII fields
            if change.classification == FieldClassification.SENSITIVE:
                summary['sensitiveFieldsModified'].append(change.field)
            elif change.classification == FieldClassification.PII:
                summary['piiFieldsModified'].append(change.field)
        
        return summary
    
    def _calculate_state_hash(self, state: Dict[str, Any]) -> str:
        """Calculate a hash of the state for integrity verification."""
        # Sort keys for consistent hashing
        sorted_state = json.dumps(state, sort_keys=True, default=str)
        return hashlib.sha256(sorted_state.encode()).hexdigest()
    
    def compare_states(
        self,
        states: List[Dict[str, Any]],
        resource_type: str,
        resource_id: str
    ) -> List[Dict[str, Any]]:
        """Compare multiple states to track changes over time."""
        if len(states) < 2:
            return []
        
        comparisons = []
        for i in range(1, len(states)):
            comparison = self.capture_state_change(
                resource_type=resource_type,
                resource_id=resource_id,
                old_state=states[i-1],
                new_state=states[i]
            )
            comparison['stateIndex'] = i
            comparisons.append(comparison)
        
        return comparisons