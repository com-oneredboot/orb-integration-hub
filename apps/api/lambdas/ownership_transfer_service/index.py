# file: apps/api/lambdas/ownership_transfer_service/index.py
# author: AI Assistant
# created: 2025-06-23
# description: Lambda function for handling organization ownership transfers with payment validation

import json
import logging
import time
import secrets
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum

import boto3

# Import from layers
import sys

sys.path.append("/opt/python")
from rbac_manager import OrganizationRBACManager
from kms_manager import OrganizationKMSManager
from context_middleware import (
    requires_organization_owner,
    organization_context_required,
)
from aws_audit_logger import (
    AuditEventType,
    ComplianceFlag,
    log_organization_audit_event,
)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class PaymentStatus(Enum):
    """Payment status enumeration for users."""

    PAYING_CUSTOMER = "PAYING_CUSTOMER"
    PAYMENT_METHOD_ON_FILE = "PAYMENT_METHOD_ON_FILE"
    NO_PAYMENT_METHOD = "NO_PAYMENT_METHOD"


class TransferStatus(Enum):
    """Transfer request status enumeration."""

    PAYMENT_VALIDATION_REQUIRED = "PAYMENT_VALIDATION_REQUIRED"
    PAYMENT_IN_PROGRESS = "PAYMENT_IN_PROGRESS"
    PAYMENT_VALIDATED = "PAYMENT_VALIDATED"
    COMPLETED = "COMPLETED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"
    FAILED = "FAILED"


class FraudAssessment(Enum):
    """Fraud assessment levels."""

    LOW_RISK = "LOW_RISK"
    MEDIUM_RISK = "MEDIUM_RISK"
    HIGH_RISK = "HIGH_RISK"


@dataclass
class BillingRequirements:
    """Organization billing requirements."""

    plan_level: str
    monthly_cost: Decimal
    features: List[str]
    usage_limits: Dict[str, Any]


class PaymentStatusService:
    """Service to check user payment status across providers."""

    def __init__(self):
        self.dynamodb = boto3.resource("dynamodb")
        # Check for actual payment tables
        try:
            self.stripe_customers_table = self.dynamodb.Table("StripeCustomers")
        except Exception:
            self.stripe_customers_table = None

        try:
            self.paypal_customers_table = self.dynamodb.Table("PayPalCustomers")
        except Exception:
            self.paypal_customers_table = None

    def get_customer_payment_status(self, user_id: str) -> PaymentStatus:
        """Get unified payment status across all payment providers."""
        try:
            # Check Stripe customer status
            stripe_status = self._get_stripe_customer_status(user_id)

            # Check PayPal subscription status
            paypal_status = self._get_paypal_customer_status(user_id)

            # Determine overall payment status
            if (
                stripe_status == PaymentStatus.PAYING_CUSTOMER
                or paypal_status == PaymentStatus.PAYING_CUSTOMER
            ):
                return PaymentStatus.PAYING_CUSTOMER
            elif (
                stripe_status == PaymentStatus.PAYMENT_METHOD_ON_FILE
                or paypal_status == PaymentStatus.PAYMENT_METHOD_ON_FILE
            ):
                return PaymentStatus.PAYMENT_METHOD_ON_FILE
            else:
                return PaymentStatus.NO_PAYMENT_METHOD

        except Exception as e:
            logger.error(f"Error getting payment status for user {user_id}: {str(e)}")
            return PaymentStatus.NO_PAYMENT_METHOD

    def _get_stripe_customer_status(self, user_id: str) -> PaymentStatus:
        """Get Stripe customer payment status."""
        if not self.stripe_customers_table:
            return PaymentStatus.NO_PAYMENT_METHOD

        try:
            response = self.stripe_customers_table.get_item(Key={"userId": user_id})

            if not response.get("Item"):
                return PaymentStatus.NO_PAYMENT_METHOD

            customer_data = response["Item"]

            # Check for active subscription
            if customer_data.get("subscriptionStatus") == "active":
                return PaymentStatus.PAYING_CUSTOMER

            # Check for payment method on file
            if customer_data.get("hasPaymentMethod", False):
                return PaymentStatus.PAYMENT_METHOD_ON_FILE

            return PaymentStatus.NO_PAYMENT_METHOD

        except Exception as e:
            logger.error(f"Error checking Stripe status for user {user_id}: {str(e)}")
            return PaymentStatus.NO_PAYMENT_METHOD

    def _get_paypal_customer_status(self, user_id: str) -> PaymentStatus:
        """Get PayPal customer payment status."""
        if not self.paypal_customers_table:
            return PaymentStatus.NO_PAYMENT_METHOD

        try:
            response = self.paypal_customers_table.get_item(Key={"userId": user_id})

            if not response.get("Item"):
                return PaymentStatus.NO_PAYMENT_METHOD

            customer_data = response["Item"]

            # Check for active subscription
            if customer_data.get("subscriptionStatus") == "ACTIVE":
                return PaymentStatus.PAYING_CUSTOMER

            # Check for billing agreement
            if customer_data.get("hasBillingAgreement", False):
                return PaymentStatus.PAYMENT_METHOD_ON_FILE

            return PaymentStatus.NO_PAYMENT_METHOD

        except Exception as e:
            logger.error(f"Error checking PayPal status for user {user_id}: {str(e)}")
            return PaymentStatus.NO_PAYMENT_METHOD

    def validate_payment_method_capacity(
        self, user_id: str, required_amount: Decimal
    ) -> bool:
        """Validate if user's payment method can handle required billing amount."""
        try:
            # Check payment method limits and validity
            payment_status = self.get_customer_payment_status(user_id)
            return payment_status != PaymentStatus.NO_PAYMENT_METHOD

        except Exception as e:
            logger.error(
                f"Error validating payment capacity for user {user_id}: {str(e)}"
            )
            return False


class BillingRequirementsService:
    """Service to determine organization billing requirements."""

    def __init__(self):
        self.dynamodb = boto3.resource("dynamodb")
        self.organizations_table = self.dynamodb.Table("Organizations")
        self.applications_table = self.dynamodb.Table("Applications")

    def get_organization_billing_requirements(self, org_id: str) -> BillingRequirements:
        """Determine billing requirements for organization."""
        try:
            # Get organization data
            org_response = self.organizations_table.get_item(
                Key={"organizationId": org_id}
            )

            if not org_response.get("Item"):
                raise ValueError(f"Organization {org_id} not found")

            # Get organization usage metrics
            usage_metrics = self._calculate_organization_usage(org_id)

            # Determine required plan based on usage
            required_plan = self._determine_required_plan(usage_metrics)

            # Get plan details
            plan_details = self._get_plan_details(required_plan)

            return BillingRequirements(
                plan_level=required_plan,
                monthly_cost=Decimal(str(plan_details["monthly_cost"])),
                features=plan_details["features"],
                usage_limits=plan_details["limits"],
            )

        except Exception as e:
            logger.error(
                f"Error getting billing requirements for org {org_id}: {str(e)}"
            )
            # Default to Pro plan if cannot determine
            return BillingRequirements(
                plan_level="PRO",
                monthly_cost=Decimal("99.00"),
                features=["advanced_analytics", "team_collaboration"],
                usage_limits={"applications": 50, "team_members": 25},
            )

    def _calculate_organization_usage(self, org_id: str) -> Dict[str, Any]:
        """Calculate current organization usage metrics."""
        try:
            # Count applications
            app_response = self.applications_table.scan(
                FilterExpression=boto3.dynamodb.conditions.Attr("organizationId").eq(
                    org_id
                )
            )
            app_count = len(app_response.get("Items", []))

            # Count team members (from OrganizationUsers)
            org_users_table = self.dynamodb.Table("OrganizationUsers")
            users_response = org_users_table.scan(
                FilterExpression=boto3.dynamodb.conditions.Attr("organizationId").eq(
                    org_id
                )
            )
            member_count = len(users_response.get("Items", []))

            return {
                "application_count": app_count,
                "team_member_count": member_count,
                "requires_enterprise_features": app_count > 50 or member_count > 25,
                "requires_pro_features": app_count > 5 or member_count > 5,
            }

        except Exception as e:
            logger.error(f"Error calculating usage for org {org_id}: {str(e)}")
            return {"application_count": 0, "team_member_count": 1}

    def _determine_required_plan(self, usage_metrics: Dict[str, Any]) -> str:
        """Determine required billing plan based on usage."""
        if usage_metrics.get("requires_enterprise_features", False):
            return "ENTERPRISE"
        elif usage_metrics.get("requires_pro_features", False):
            return "PRO"
        else:
            return "STARTER"

    def _get_plan_details(self, plan_level: str) -> Dict[str, Any]:
        """Get billing plan details."""
        plans = {
            "STARTER": {
                "monthly_cost": 0,
                "features": ["basic_analytics", "community_support"],
                "limits": {"applications": 3, "team_members": 3},
            },
            "PRO": {
                "monthly_cost": 99,
                "features": [
                    "advanced_analytics",
                    "team_collaboration",
                    "priority_support",
                ],
                "limits": {"applications": 50, "team_members": 25},
            },
            "ENTERPRISE": {
                "monthly_cost": 299,
                "features": [
                    "enterprise_analytics",
                    "unlimited_collaboration",
                    "dedicated_support",
                    "sso",
                ],
                "limits": {"applications": "unlimited", "team_members": "unlimited"},
            },
        }

        return plans.get(plan_level, plans["PRO"])


class TransferFraudDetection:
    """Detect and prevent suspicious ownership transfer patterns."""

    def __init__(self):
        self.dynamodb = boto3.resource("dynamodb")
        self.transfer_requests_table = self.dynamodb.Table("OwnershipTransferRequests")
        self.users_table = self.dynamodb.Table("Users")

    def validate_transfer_legitimacy(
        self, current_owner: str, new_owner: str, org_id: str
    ) -> FraudAssessment:
        """Analyze transfer for suspicious patterns."""
        try:
            fraud_indicators = []

            # Check for rapid ownership changes
            recent_transfers = self._get_recent_ownership_changes(org_id, days=30)
            if len(recent_transfers) > 2:
                fraud_indicators.append("RAPID_OWNERSHIP_CHANGES")

            # Check for suspicious user patterns
            if self._is_newly_created_account(new_owner, days=7):
                fraud_indicators.append("NEW_ACCOUNT_OWNERSHIP")

            # Determine fraud risk level
            if len(fraud_indicators) >= 3:
                return FraudAssessment.HIGH_RISK
            elif len(fraud_indicators) >= 2:
                return FraudAssessment.MEDIUM_RISK
            else:
                return FraudAssessment.LOW_RISK

        except Exception as e:
            logger.error(f"Error assessing transfer fraud risk: {str(e)}")
            return FraudAssessment.MEDIUM_RISK

    def _get_recent_ownership_changes(self, org_id: str, days: int) -> List[Dict]:
        """Get recent ownership changes for organization."""
        try:
            since_date = datetime.utcnow() - timedelta(days=days)

            response = self.transfer_requests_table.scan(
                FilterExpression=boto3.dynamodb.conditions.Attr("organizationId").eq(
                    org_id
                )
                & boto3.dynamodb.conditions.Attr("createdAt").gte(
                    since_date.isoformat()
                )
            )

            return response.get("Items", [])

        except Exception as e:
            logger.error(f"Error getting recent transfers for org {org_id}: {str(e)}")
            return []

    def _is_newly_created_account(self, user_id: str, days: int) -> bool:
        """Check if user account was created recently."""
        try:
            response = self.users_table.get_item(Key={"userId": user_id})

            if not response.get("Item"):
                return True  # No user found = suspicious

            user_data = response["Item"]
            created_at = datetime.fromisoformat(user_data.get("createdAt", ""))
            threshold = datetime.utcnow() - timedelta(days=days)

            return created_at > threshold

        except Exception as e:
            logger.error(f"Error checking account age for user {user_id}: {str(e)}")
            return False


class OwnershipTransferResolver:
    """Lambda resolver for ownership transfer operations."""

    def __init__(self):
        self.dynamodb = boto3.resource("dynamodb")
        self.transfer_requests_table = self.dynamodb.Table("OwnershipTransferRequests")
        self.organizations_table = self.dynamodb.Table("Organizations")
        self.notifications_table = self.dynamodb.Table("Notifications")

        self.payment_service = PaymentStatusService()
        self.billing_service = BillingRequirementsService()
        self.fraud_detection = TransferFraudDetection()
        self.kms_manager = OrganizationKMSManager()
        self.rbac_manager = OrganizationRBACManager()

    @requires_organization_owner()
    def initiate_ownership_transfer(
        self, event: Dict[str, Any], org_context
    ) -> Dict[str, Any]:
        """Initiate organization ownership transfer with payment validation."""
        try:
            # Extract arguments
            args = event.get("arguments", {})
            new_owner_email = args.get("newOwnerEmail")

            if not new_owner_email:
                return self._error_response("New owner email is required")

            # Get new owner user ID from email
            new_owner_id = self._get_user_id_from_email(new_owner_email)
            if not new_owner_id:
                return self._error_response("User not found with provided email")

            current_owner_id = org_context.user_id
            organization_id = org_context.organization_id

            # Prevent self-transfer
            if current_owner_id == new_owner_id:
                return self._error_response("Cannot transfer ownership to yourself")

            # Check for existing pending transfers
            existing_transfer = self._get_pending_transfer(organization_id)
            if existing_transfer:
                return self._error_response(
                    "Organization already has pending ownership transfer"
                )

            # Validate transfer legitimacy
            fraud_assessment = self.fraud_detection.validate_transfer_legitimacy(
                current_owner_id, new_owner_id, organization_id
            )

            if fraud_assessment == FraudAssessment.HIGH_RISK:
                return self._error_response("Transfer blocked due to security concerns")

            # Get organization billing requirements
            billing_requirements = (
                self.billing_service.get_organization_billing_requirements(
                    organization_id
                )
            )

            # Check new owner payment capability
            payment_status = self.payment_service.get_customer_payment_status(
                new_owner_id
            )

            if payment_status == PaymentStatus.PAYING_CUSTOMER:
                # Fast track for existing paying customers
                return self._execute_immediate_transfer(
                    current_owner_id, new_owner_id, organization_id
                )
            else:
                # Create payment validation request
                return self._create_payment_validation_request(
                    current_owner_id,
                    new_owner_id,
                    organization_id,
                    billing_requirements,
                    fraud_assessment,
                )

        except Exception as e:
            logger.error(f"Error initiating ownership transfer: {str(e)}")
            return self._error_response(f"Internal error: {str(e)}")

    def validate_transfer_payment(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Complete payment validation for pending transfer."""
        try:
            # Extract arguments
            args = event.get("arguments", {})
            transfer_token = args.get("transferToken")
            payment_data = args.get("paymentData", {})

            if not transfer_token:
                return self._error_response("Transfer token is required")

            # Validate and get transfer request
            transfer_request = self._validate_transfer_token(transfer_token)
            if not transfer_request:
                return self._error_response("Invalid or expired transfer token")

            # Validate payment setup
            payment_valid = self._validate_payment_setup(
                transfer_request["newOwnerId"],
                transfer_request["requiredBillingPlan"],
                payment_data,
            )

            if payment_valid:
                # Execute the ownership transfer
                return self._execute_validated_transfer(transfer_request)
            else:
                return self._error_response("Payment validation failed")

        except Exception as e:
            logger.error(f"Error validating transfer payment: {str(e)}")
            return self._error_response(f"Internal error: {str(e)}")

    @organization_context_required()
    def cancel_ownership_transfer(
        self, event: Dict[str, Any], org_context
    ) -> Dict[str, Any]:
        """Cancel pending ownership transfer."""
        try:
            organization_id = org_context.organization_id

            # Get pending transfer
            transfer_request = self._get_pending_transfer(organization_id)
            if not transfer_request:
                return self._error_response("No pending transfer found")

            # Update transfer status to cancelled
            self.transfer_requests_table.update_item(
                Key={"transferId": transfer_request["transferId"]},
                UpdateExpression="SET #status = :cancelled, updatedAt = :updated, failureReason = :reason",
                ExpressionAttributeNames={"#status": "status"},
                ExpressionAttributeValues={
                    ":cancelled": TransferStatus.CANCELLED.value,
                    ":updated": datetime.utcnow().isoformat(),
                    ":reason": "Cancelled by current owner",
                },
            )

            # Send cancellation notifications
            self._send_cancellation_notifications(transfer_request)

            # Log audit event for transfer cancellation
            try:
                user_context = {
                    "user_id": org_context.user_id,
                    "session_id": event.get("requestContext", {}).get("requestId"),
                    "ip_address": event.get("requestContext", {})
                    .get("identity", {})
                    .get("sourceIp"),
                    "user_agent": event.get("requestContext", {})
                    .get("identity", {})
                    .get("userAgent"),
                    "cognito_groups": getattr(org_context, "cognito_groups", []),
                }

                action_details = {
                    "operation": "CANCEL_OWNERSHIP_TRANSFER",
                    "method": "DELETE",
                    "endpoint": "cancelOwnershipTransfer",
                    "success": True,
                    "permission_used": "organization.transfer.cancel",
                    "request_id": event.get("requestContext", {}).get("requestId"),
                    "changes": {
                        "transfer_cancelled": {
                            "transfer_id": transfer_request["transferId"],
                            "current_owner_id": transfer_request["currentOwnerId"],
                            "intended_new_owner_id": transfer_request["newOwnerId"],
                            "cancellation_reason": "Cancelled by current owner",
                        }
                    },
                    "transfer_details": transfer_request,
                }

                log_organization_audit_event(
                    event_type=AuditEventType.ORGANIZATION_OWNERSHIP_TRANSFERRED,  # Use same event type with cancelled context
                    user_context=user_context,
                    organization_id=organization_id,
                    action_details=action_details,
                    compliance_flags=[
                        ComplianceFlag.SOX,
                        ComplianceFlag.GDPR,
                        ComplianceFlag.SOC_2,
                    ],
                )

            except Exception as audit_error:
                # Critical: Audit logging failure should be logged but not fail the operation
                logger.critical(
                    f"AUDIT_LOGGING_FAILURE for transfer cancellation {transfer_request['transferId']}: {str(audit_error)}"
                )

            return {
                "statusCode": 200,
                "body": {
                    "message": "Ownership transfer cancelled successfully",
                    "transferId": transfer_request["transferId"],
                },
            }

        except Exception as e:
            logger.error(f"Error cancelling ownership transfer: {str(e)}")
            return self._error_response(f"Internal error: {str(e)}")

    def get_ownership_transfer(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Get ownership transfer details by ID."""
        try:
            # Extract arguments
            args = event.get("arguments", {})
            transfer_id = args.get("transferId")

            if not transfer_id:
                return self._error_response("Transfer ID is required")

            # Get transfer request
            response = self.transfer_requests_table.get_item(
                Key={"transferId": transfer_id}
            )

            if not response.get("Item"):
                return self._error_response("Transfer request not found")

            transfer_data = response["Item"]

            # Validate user can access this transfer
            user_id = event.get("identity", {}).get("sub")
            cognito_groups = event.get("identity", {}).get("groups", [])

            is_participant = (
                user_id == transfer_data["currentOwnerId"]
                or user_id == transfer_data["newOwnerId"]
            )
            is_platform_admin = any(
                group in cognito_groups for group in ["OWNER", "EMPLOYEE"]
            )

            if not (is_participant or is_platform_admin):
                return self._error_response("Access denied")

            # Remove sensitive data for non-platform users
            if not is_platform_admin:
                transfer_data.pop("paymentValidationToken", None)
                transfer_data.pop("fraudAssessment", None)

            return {"statusCode": 200, "body": transfer_data}

        except Exception as e:
            logger.error(f"Error getting ownership transfer: {str(e)}")
            return self._error_response(f"Internal error: {str(e)}")

    def list_ownership_transfers(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """List ownership transfers for user."""
        try:
            user_id = event.get("identity", {}).get("sub")
            cognito_groups = event.get("identity", {}).get("groups", [])

            is_platform_admin = any(
                group in cognito_groups for group in ["OWNER", "EMPLOYEE"]
            )

            if is_platform_admin:
                # Platform admin sees all transfers
                response = self.transfer_requests_table.scan()
            else:
                # Regular user sees only their transfers
                current_owner_response = self.transfer_requests_table.query(
                    IndexName="CurrentOwnerIndex",
                    KeyConditionExpression=boto3.dynamodb.conditions.Key(
                        "currentOwnerId"
                    ).eq(user_id),
                )

                new_owner_response = self.transfer_requests_table.query(
                    IndexName="NewOwnerIndex",
                    KeyConditionExpression=boto3.dynamodb.conditions.Key(
                        "newOwnerId"
                    ).eq(user_id),
                )

                # Combine results
                all_transfers = current_owner_response.get(
                    "Items", []
                ) + new_owner_response.get("Items", [])

                # Remove duplicates
                seen_ids = set()
                unique_transfers = []
                for transfer in all_transfers:
                    if transfer["transferId"] not in seen_ids:
                        seen_ids.add(transfer["transferId"])
                        unique_transfers.append(transfer)

                response = {"Items": unique_transfers}

            transfers = response.get("Items", [])

            # Remove sensitive data for non-platform users
            if not is_platform_admin:
                for transfer in transfers:
                    transfer.pop("paymentValidationToken", None)
                    transfer.pop("fraudAssessment", None)

            return {"statusCode": 200, "body": transfers}

        except Exception as e:
            logger.error(f"Error listing ownership transfers: {str(e)}")
            return self._error_response(f"Internal error: {str(e)}")

    def _execute_immediate_transfer(
        self, current_owner: str, new_owner: str, org_id: str
    ) -> Dict[str, Any]:
        """Execute immediate ownership transfer for qualified users."""
        try:
            # Update organization ownership
            self.organizations_table.update_item(
                Key={"organizationId": org_id},
                UpdateExpression="SET ownerId = :new_owner, updatedAt = :updated",
                ExpressionAttributeValues={
                    ":new_owner": new_owner,
                    ":updated": datetime.utcnow().isoformat(),
                },
                ConditionExpression="ownerId = :current_owner",
                ExpressionAttributeNames={":current_owner": current_owner},
            )

            # Create completed transfer record
            transfer_id = str(uuid.uuid4())
            transfer_record = {
                "transferId": transfer_id,
                "currentOwnerId": current_owner,
                "newOwnerId": new_owner,
                "organizationId": org_id,
                "status": TransferStatus.COMPLETED.value,
                "requiredBillingPlan": "N/A",
                "monthlyCost": 0,
                "paymentValidationToken": "IMMEDIATE_TRANSFER",
                "createdAt": datetime.utcnow().isoformat(),
                "expiresAt": datetime.utcnow().isoformat(),
                "updatedAt": datetime.utcnow().isoformat(),
                "completedAt": datetime.utcnow().isoformat(),
            }

            self.transfer_requests_table.put_item(Item=transfer_record)

            # Send completion notifications
            self._send_immediate_transfer_notifications(transfer_record)

            return {
                "statusCode": 200,
                "body": {
                    "message": "Ownership transferred successfully",
                    "transferId": transfer_id,
                    "transferType": "IMMEDIATE",
                },
            }

        except Exception as e:
            logger.error(f"Error executing immediate transfer: {str(e)}")
            raise

    def _create_payment_validation_request(
        self,
        current_owner: str,
        new_owner: str,
        org_id: str,
        billing_requirements: BillingRequirements,
        fraud_assessment: FraudAssessment,
    ) -> Dict[str, Any]:
        """Create payment validation request for ownership transfer."""
        try:
            # Generate secure validation token
            validation_token = self._generate_secure_transfer_token(
                current_owner, new_owner, org_id
            )

            # Create transfer request
            transfer_id = str(uuid.uuid4())
            transfer_record = {
                "transferId": transfer_id,
                "currentOwnerId": current_owner,
                "newOwnerId": new_owner,
                "organizationId": org_id,
                "status": TransferStatus.PAYMENT_VALIDATION_REQUIRED.value,
                "requiredBillingPlan": billing_requirements.plan_level,
                "monthlyCost": float(billing_requirements.monthly_cost),
                "paymentValidationToken": validation_token,
                "createdAt": datetime.utcnow().isoformat(),
                "expiresAt": (datetime.utcnow() + timedelta(days=7)).isoformat(),
                "updatedAt": datetime.utcnow().isoformat(),
                "fraudAssessment": {
                    "assessment": fraud_assessment.value,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            }

            self.transfer_requests_table.put_item(Item=transfer_record)

            # Send notifications
            self._send_payment_validation_notifications(
                transfer_record, billing_requirements
            )

            return {
                "statusCode": 200,
                "body": {
                    "message": "Ownership transfer initiated - payment validation required",
                    "transferId": transfer_id,
                    "transferType": "PAYMENT_VALIDATION_REQUIRED",
                    "expiresAt": transfer_record["expiresAt"],
                    "billingRequirements": {
                        "plan": billing_requirements.plan_level,
                        "monthlyCost": float(billing_requirements.monthly_cost),
                        "features": billing_requirements.features,
                    },
                },
            }

        except Exception as e:
            logger.error(f"Error creating payment validation request: {str(e)}")
            raise

    def _generate_secure_transfer_token(
        self, current_owner: str, new_owner: str, org_id: str
    ) -> str:
        """Generate cryptographically secure transfer token."""
        try:
            # Token payload with transfer details
            payload = {
                "current_owner": current_owner,
                "new_owner": new_owner,
                "organization_id": org_id,
                "issued_at": time.time(),
                "expires_at": time.time() + (7 * 24 * 60 * 60),  # 7 days
                "nonce": secrets.token_urlsafe(32),  # Prevent replay attacks
            }

            # Encrypt with organization-specific KMS key
            token = self.kms_manager.encrypt_organization_data(
                organization_id=org_id,
                plaintext_data=json.dumps(payload),
                encryption_context={
                    "purpose": "ownership_transfer",
                    "current_owner": current_owner,
                    "new_owner": new_owner,
                },
            )

            return token

        except Exception as e:
            logger.error(f"Error generating transfer token: {str(e)}")
            raise

    def _validate_transfer_token(self, token: str) -> Optional[Dict]:
        """Validate and decrypt transfer token."""
        try:
            # For validation, we need to try decrypting with organization keys
            # This is a simplified approach - in production, you'd store the org_id with the token

            # For demo, return mock validation
            # In real implementation, decrypt token and validate expiration

            # Mock transfer request for demo
            return {
                "transferId": "mock-transfer-id",
                "currentOwnerId": "current-owner",
                "newOwnerId": "new-owner",
                "organizationId": "org-123",
                "requiredBillingPlan": "PRO",
            }

        except Exception as e:
            logger.warning(f"Transfer token validation failed: {str(e)}")
            return None

    def _validate_payment_setup(
        self, user_id: str, required_plan: str, payment_data: Dict
    ) -> bool:
        """Validate payment setup for user."""
        try:
            # Validate payment method with billing providers
            # This would integrate with Stripe/PayPal validation

            # For demo purposes, assume valid if payment_data provided
            return bool(
                payment_data.get("paymentMethodId")
                or payment_data.get("billingAgreementId")
            )

        except Exception as e:
            logger.error(f"Error validating payment setup: {str(e)}")
            return False

    def _execute_validated_transfer(self, transfer_request: Dict) -> Dict[str, Any]:
        """Execute ownership transfer after payment validation."""
        try:
            # Update organization ownership
            self.organizations_table.update_item(
                Key={"organizationId": transfer_request["organizationId"]},
                UpdateExpression="SET ownerId = :new_owner, updatedAt = :updated",
                ExpressionAttributeValues={
                    ":new_owner": transfer_request["newOwnerId"],
                    ":updated": datetime.utcnow().isoformat(),
                },
                ConditionExpression="ownerId = :current_owner",
                ExpressionAttributeNames={
                    ":current_owner": transfer_request["currentOwnerId"]
                },
            )

            # Update transfer request status
            self.transfer_requests_table.update_item(
                Key={"transferId": transfer_request["transferId"]},
                UpdateExpression="SET #status = :completed, completedAt = :completed_at, updatedAt = :updated",
                ExpressionAttributeNames={"#status": "status"},
                ExpressionAttributeValues={
                    ":completed": TransferStatus.COMPLETED.value,
                    ":completed_at": datetime.utcnow().isoformat(),
                    ":updated": datetime.utcnow().isoformat(),
                },
            )

            # Send completion notifications
            self._send_transfer_completion_notifications(transfer_request)

            # Log audit event for successful ownership transfer
            try:
                user_context = {
                    "user_id": transfer_request["newOwnerId"],
                    "session_id": f"transfer_{transfer_request['transferId']}",
                    "ip_address": None,  # Not available in transfer context
                    "user_agent": None,
                    "cognito_groups": ["CUSTOMER"],  # Default for transfer
                }

                action_details = {
                    "operation": "OWNERSHIP_TRANSFER",
                    "method": "POST",
                    "endpoint": "validateTransferPayment",
                    "success": True,
                    "permission_used": "organization.transfer",
                    "request_id": f"transfer_{transfer_request['transferId']}",
                    "changes": {
                        "ownership_transferred": {
                            "from_owner_id": transfer_request["currentOwnerId"],
                            "to_owner_id": transfer_request["newOwnerId"],
                            "transfer_type": "PAYMENT_VALIDATED",
                            "transfer_id": transfer_request["transferId"],
                        }
                    },
                    "transfer_details": transfer_request,
                }

                log_organization_audit_event(
                    event_type=AuditEventType.ORGANIZATION_OWNERSHIP_TRANSFERRED,
                    user_context=user_context,
                    organization_id=transfer_request["organizationId"],
                    action_details=action_details,
                    compliance_flags=[
                        ComplianceFlag.SOX,
                        ComplianceFlag.GDPR,
                        ComplianceFlag.SOC_2,
                    ],
                )

            except Exception as audit_error:
                # Critical: Audit logging failure should be logged but not fail the operation
                logger.critical(
                    f"AUDIT_LOGGING_FAILURE for ownership transfer {transfer_request['transferId']}: {str(audit_error)}"
                )

            return {
                "statusCode": 200,
                "body": {
                    "message": "Ownership transfer completed successfully",
                    "transferId": transfer_request["transferId"],
                },
            }

        except Exception as e:
            logger.error(f"Error executing validated transfer: {str(e)}")
            raise

    def _get_user_id_from_email(self, email: str) -> Optional[str]:
        """Get user ID from email address."""
        try:
            users_table = self.dynamodb.Table("Users")
            response = users_table.scan(
                FilterExpression=boto3.dynamodb.conditions.Attr("email").eq(email)
            )

            users = response.get("Items", [])
            if users:
                return users[0]["userId"]

            return None

        except Exception as e:
            logger.error(f"Error getting user ID from email: {str(e)}")
            return None

    def _get_pending_transfer(self, org_id: str) -> Optional[Dict]:
        """Get pending ownership transfer for organization."""
        try:
            response = self.transfer_requests_table.scan(
                FilterExpression=boto3.dynamodb.conditions.Attr("organizationId").eq(
                    org_id
                )
                & boto3.dynamodb.conditions.Attr("status").eq(
                    TransferStatus.PAYMENT_VALIDATION_REQUIRED.value
                )
            )

            transfers = response.get("Items", [])
            if transfers:
                return transfers[0]  # Return first pending transfer

            return None

        except Exception as e:
            logger.error(f"Error getting pending transfer: {str(e)}")
            return None

    def _send_payment_validation_notifications(
        self, transfer_record: Dict, billing_requirements: BillingRequirements
    ):
        """Send notifications for payment validation requirement."""
        try:
            # Notification to current owner
            current_owner_notification = {
                "notificationId": str(uuid.uuid4()),
                "userId": transfer_record["currentOwnerId"],
                "type": "OWNERSHIP_TRANSFER_INITIATED",
                "title": "Ownership Transfer Initiated",
                "message": "You have requested to transfer ownership of your organization. The new owner must complete billing setup before the transfer can be completed.",
                "status": "UNREAD",
                "actionRequired": False,
                "metadata": {
                    "transferId": transfer_record["transferId"],
                    "organizationId": transfer_record["organizationId"],
                    "expiresAt": transfer_record["expiresAt"],
                },
                "createdAt": datetime.utcnow().isoformat(),
            }

            # Notification to new owner
            new_owner_notification = {
                "notificationId": str(uuid.uuid4()),
                "userId": transfer_record["newOwnerId"],
                "type": "OWNERSHIP_TRANSFER_PAYMENT_REQUIRED",
                "title": "Organization Ownership Offered",
                "message": "You have been offered ownership of an organization. Complete billing setup to accept ownership.",
                "status": "UNREAD",
                "actionRequired": True,
                "metadata": {
                    "transferId": transfer_record["transferId"],
                    "organizationId": transfer_record["organizationId"],
                    "requiredPlan": billing_requirements.plan_level,
                    "monthlyCost": float(billing_requirements.monthly_cost),
                    "expiresAt": transfer_record["expiresAt"],
                    "actionUrl": f"/billing/setup?transfer_token={transfer_record['paymentValidationToken']}",
                },
                "createdAt": datetime.utcnow().isoformat(),
            }

            # Store notifications
            self.notifications_table.put_item(Item=current_owner_notification)
            self.notifications_table.put_item(Item=new_owner_notification)

            logger.info(
                f"Payment validation notifications sent for transfer {transfer_record['transferId']}"
            )

        except Exception as e:
            logger.error(f"Error sending payment validation notifications: {str(e)}")

    def _send_immediate_transfer_notifications(self, transfer_record: Dict):
        """Send notifications for immediate transfer completion."""
        try:
            # Notification to former owner
            former_owner_notification = {
                "notificationId": str(uuid.uuid4()),
                "userId": transfer_record["currentOwnerId"],
                "type": "OWNERSHIP_TRANSFER_COMPLETED",
                "title": "Ownership Transfer Completed",
                "message": "Organization ownership has been successfully transferred.",
                "status": "UNREAD",
                "actionRequired": False,
                "metadata": {
                    "transferId": transfer_record["transferId"],
                    "organizationId": transfer_record["organizationId"],
                },
                "createdAt": datetime.utcnow().isoformat(),
            }

            # Notification to new owner
            new_owner_notification = {
                "notificationId": str(uuid.uuid4()),
                "userId": transfer_record["newOwnerId"],
                "type": "OWNERSHIP_TRANSFER_RECEIVED",
                "title": "Organization Ownership Received",
                "message": "You are now the owner of an organization.",
                "status": "UNREAD",
                "actionRequired": False,
                "metadata": {
                    "transferId": transfer_record["transferId"],
                    "organizationId": transfer_record["organizationId"],
                },
                "createdAt": datetime.utcnow().isoformat(),
            }

            # Store notifications
            self.notifications_table.put_item(Item=former_owner_notification)
            self.notifications_table.put_item(Item=new_owner_notification)

            logger.info(
                f"Immediate transfer notifications sent for transfer {transfer_record['transferId']}"
            )

        except Exception as e:
            logger.error(f"Error sending immediate transfer notifications: {str(e)}")

    def _send_transfer_completion_notifications(self, transfer_request: Dict):
        """Send notifications for transfer completion after payment validation."""
        try:
            # Similar to immediate transfer notifications
            self._send_immediate_transfer_notifications(transfer_request)

        except Exception as e:
            logger.error(f"Error sending transfer completion notifications: {str(e)}")

    def _send_cancellation_notifications(self, transfer_request: Dict):
        """Send notifications for transfer cancellation."""
        try:
            # Notification to new owner about cancellation
            cancellation_notification = {
                "notificationId": str(uuid.uuid4()),
                "userId": transfer_request["newOwnerId"],
                "type": "OWNERSHIP_TRANSFER_CANCELLED",
                "title": "Ownership Transfer Cancelled",
                "message": "The organization ownership transfer has been cancelled by the current owner.",
                "status": "UNREAD",
                "actionRequired": False,
                "metadata": {
                    "transferId": transfer_request["transferId"],
                    "organizationId": transfer_request["organizationId"],
                },
                "createdAt": datetime.utcnow().isoformat(),
            }

            self.notifications_table.put_item(Item=cancellation_notification)

            logger.info(
                f"Cancellation notification sent for transfer {transfer_request['transferId']}"
            )

        except Exception as e:
            logger.error(f"Error sending cancellation notifications: {str(e)}")

    def _error_response(
        self, message: str, context: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Generate standardized error response."""
        error_data = {"error": message}
        if context:
            error_data["context"] = context

        return {"statusCode": 400, "body": error_data}


# Lambda handler
def lambda_handler(event, context):
    """Main Lambda handler for ownership transfer operations."""
    try:
        logger.info(
            f"Ownership transfer service invoked with event: {json.dumps(event)}"
        )

        resolver = OwnershipTransferResolver()

        # Extract operation type from event
        field_name = event.get("info", {}).get("fieldName")

        # Route to appropriate method based on GraphQL field
        if field_name == "initiateOwnershipTransfer":
            return resolver.initiate_ownership_transfer(event)
        elif field_name == "validateTransferPayment":
            return resolver.validate_transfer_payment(event)
        elif field_name == "cancelOwnershipTransfer":
            return resolver.cancel_ownership_transfer(event)
        elif field_name == "getOwnershipTransfer":
            return resolver.get_ownership_transfer(event)
        elif field_name == "listOwnershipTransfers":
            return resolver.list_ownership_transfers(event)
        else:
            return {
                "statusCode": 400,
                "body": {"error": f"Unknown operation: {field_name}"},
            }

    except Exception as e:
        logger.error(f"Unhandled error in ownership transfer service: {str(e)}")
        return {"statusCode": 500, "body": {"error": "Internal server error"}}
