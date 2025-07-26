"""
Generated Python enum for OwnershipTransferStatus
Generated at
"""

from enum import Enum


class OwnershipTransferStatus(Enum):

    PAYMENT_VALIDATION_REQUIRED = "PAYMENT_VALIDATION_REQUIRED"

    PAYMENT_IN_PROGRESS = "PAYMENT_IN_PROGRESS"

    PAYMENT_VALIDATED = "PAYMENT_VALIDATED"

    COMPLETED = "COMPLETED"

    EXPIRED = "EXPIRED"

    CANCELLED = "CANCELLED"
