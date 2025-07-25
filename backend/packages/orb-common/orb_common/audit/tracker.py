"""State tracking for audit purposes."""

from enum import Enum
from typing import Any, Dict, List, Optional, Tuple


class FieldClassification(Enum):
    """Classification of data fields for audit purposes."""

    PUBLIC = "PUBLIC"
    INTERNAL = "INTERNAL"
    CONFIDENTIAL = "CONFIDENTIAL"
    RESTRICTED = "RESTRICTED"
    PII = "PII"  # Personally Identifiable Information
    PHI = "PHI"  # Protected Health Information


class StateTracker:
    """Track state changes for audit logging."""

    def __init__(self) -> None:
        self.changes: List[Dict[str, Any]] = []

    def track_change(
        self, field: str, old_value: Any, new_value: Any, classification: FieldClassification
    ) -> None:
        """Track a field change."""
        self.changes.append(
            {
                "field": field,
                "old_value": old_value,
                "new_value": new_value,
                "classification": classification.value,
            }
        )

    def get_changes(self) -> List[Dict[str, Any]]:
        """Get all tracked changes."""
        return self.changes

    def clear(self) -> None:
        """Clear tracked changes."""
        self.changes.clear()


def track_state_change(
    old_state: Dict[str, Any],
    new_state: Dict[str, Any],
    field_classifications: Dict[str, FieldClassification],
) -> StateTracker:
    """Track all changes between old and new state."""
    tracker = StateTracker()

    all_fields = set(old_state.keys()) | set(new_state.keys())

    for field in all_fields:
        old_value = old_state.get(field)
        new_value = new_state.get(field)

        if old_value != new_value:
            classification = field_classifications.get(field, FieldClassification.INTERNAL)
            tracker.track_change(field, old_value, new_value, classification)

    return tracker


def get_field_changes(
    old_state: Dict[str, Any], new_state: Dict[str, Any]
) -> List[Tuple[str, Any, Any]]:
    """Get list of changed fields."""
    changes = []

    all_fields = set(old_state.keys()) | set(new_state.keys())

    for field in all_fields:
        old_value = old_state.get(field)
        new_value = new_state.get(field)

        if old_value != new_value:
            changes.append((field, old_value, new_value))

    return changes


def classify_field(field_name: str, field_value: Any = None) -> FieldClassification:
    """Classify a field based on name and value."""
    # Placeholder implementation
    sensitive_fields = {
        "password",
        "ssn",
        "social_security",
        "credit_card",
        "bank_account",
        "medical_record",
        "health_",
    }

    pii_fields = {"email", "phone", "address", "name", "birth_date", "driver_license"}

    field_lower = field_name.lower()

    for sensitive in sensitive_fields:
        if sensitive in field_lower:
            return FieldClassification.RESTRICTED

    for pii in pii_fields:
        if pii in field_lower:
            return FieldClassification.PII

    return FieldClassification.INTERNAL
