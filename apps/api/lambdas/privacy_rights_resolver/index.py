# file: apps/api/lambdas/privacy_rights_resolver/index.py
# author: AI Assistant
# created: 2025-06-23
# description: Lambda resolver for GDPR/CCPA privacy rights requests

import json
import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any

import boto3

# Import from organization security layer
import sys

sys.path.append("/opt/python")
from privacy_rights_manager import (
    PrivacyRequestType,
    PrivacyRequestStatus,
    LegalBasis,
    discover_personal_data,
    execute_privacy_data_deletion,
)
from context_middleware import organization_context_required
from aws_audit_logger import (
    AuditEventType,
    ComplianceFlag,
    log_organization_audit_event,
)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class PrivacyRightsResolver:
    """Lambda resolver for GDPR/CCPA privacy rights requests."""

    def __init__(self):
        self.dynamodb = boto3.resource("dynamodb")
        self.privacy_requests_table = self.dynamodb.Table("PrivacyRequests")
        self.ses_client = boto3.client("ses")

    def submit_privacy_request(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Submit a new privacy rights request."""
        try:
            # Extract user context
            user_id = event.get("identity", {}).get("sub")
            cognito_groups = event.get("identity", {}).get("groups", [])

            if not user_id:
                return self._error_response("User ID not found in request context")

            # Extract arguments
            args = event.get("arguments", {})
            request_type = args.get("requestType")
            data_subject_email = args.get("dataSubjectEmail")
            legal_basis = args.get("legalBasis")
            organization_id = args.get("organizationId")  # Optional

            # Validate required fields
            if not all([request_type, data_subject_email, legal_basis]):
                return self._error_response(
                    "Missing required fields: requestType, dataSubjectEmail, legalBasis"
                )

            # Validate request type
            try:
                request_type_enum = PrivacyRequestType(request_type)
                legal_basis_enum = LegalBasis(legal_basis)
            except ValueError as e:
                return self._error_response(
                    f"Invalid request type or legal basis: {str(e)}"
                )

            # Generate unique request ID
            request_id = str(uuid.uuid4())

            # Calculate response deadline based on legal framework
            deadline = self._calculate_response_deadline(legal_basis_enum)

            # Create privacy request record
            privacy_request_data = {
                "requestId": request_id,
                "requestType": request_type,
                "dataSubjectEmail": data_subject_email,
                "legalBasis": legal_basis,
                "organizationId": organization_id,
                "requesterId": user_id,
                "status": PrivacyRequestStatus.RECEIVED.value,
                "receivedAt": datetime.utcnow().isoformat(),
                "deadline": deadline.isoformat(),
                "automatedProcessing": True,
                "createdAt": datetime.utcnow().isoformat(),
                "updatedAt": datetime.utcnow().isoformat(),
            }

            # Store request in DynamoDB
            self.privacy_requests_table.put_item(Item=privacy_request_data)

            # Log audit event
            try:
                user_context = {
                    "user_id": user_id,
                    "session_id": event.get("requestContext", {}).get("requestId"),
                    "ip_address": event.get("requestContext", {})
                    .get("identity", {})
                    .get("sourceIp"),
                    "user_agent": event.get("requestContext", {})
                    .get("identity", {})
                    .get("userAgent"),
                    "cognito_groups": cognito_groups,
                }

                action_details = {
                    "operation": "PRIVACY_REQUEST_SUBMITTED",
                    "method": "POST",
                    "endpoint": "submitPrivacyRequest",
                    "success": True,
                    "request_id": event.get("requestContext", {}).get("requestId"),
                    "privacy_request_details": {
                        "request_id": request_id,
                        "request_type": request_type,
                        "legal_basis": legal_basis,
                        "data_subject_email": data_subject_email,
                    },
                }

                log_organization_audit_event(
                    event_type=AuditEventType.GDPR_REQUEST_RECEIVED,
                    user_context=user_context,
                    organization_id=organization_id or "platform",
                    action_details=action_details,
                    compliance_flags=[ComplianceFlag.GDPR, ComplianceFlag.SOC_2],
                )

            except Exception as audit_error:
                logger.critical(
                    f"AUDIT_LOGGING_FAILURE for privacy request {request_id}: {str(audit_error)}"
                )

            # Start automated processing based on request type
            if request_type_enum == PrivacyRequestType.DATA_ACCESS:
                self._process_data_access_request(request_id)
            elif request_type_enum == PrivacyRequestType.DATA_DELETION:
                self._process_data_deletion_request(request_id)
            elif request_type_enum == PrivacyRequestType.DATA_PORTABILITY:
                self._process_data_portability_request(request_id)

            # Send confirmation email
            self._send_request_confirmation(data_subject_email, request_id, deadline)

            return {
                "statusCode": 200,
                "body": {
                    "requestId": request_id,
                    "status": PrivacyRequestStatus.RECEIVED.value,
                    "estimatedCompletion": deadline.isoformat(),
                    "trackingUrl": f"https://privacy.platform.com/track/{request_id}",
                    "message": "Privacy request submitted successfully",
                },
            }

        except Exception as e:
            logger.error(f"Error submitting privacy request: {str(e)}")
            return self._error_response(f"Internal error: {str(e)}")

    def get_privacy_request_status(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Get status of a privacy rights request."""
        try:
            # Extract arguments
            args = event.get("arguments", {})
            request_id = args.get("requestId")

            if not request_id:
                return self._error_response("Request ID is required")

            # Get request from DynamoDB
            response = self.privacy_requests_table.get_item(
                Key={"requestId": request_id}
            )

            if "Item" not in response:
                return self._error_response("Privacy request not found")

            request_data = response["Item"]

            return {
                "statusCode": 200,
                "body": {
                    "requestId": request_data["requestId"],
                    "requestType": request_data["requestType"],
                    "status": request_data["status"],
                    "receivedAt": request_data["receivedAt"],
                    "deadline": request_data["deadline"],
                    "completedAt": request_data.get("completedAt"),
                    "estimatedCompletion": request_data.get(
                        "estimatedCompletion", request_data["deadline"]
                    ),
                    "message": self._get_status_message(request_data["status"]),
                },
            }

        except Exception as e:
            logger.error(f"Error getting privacy request status: {str(e)}")
            return self._error_response(f"Internal error: {str(e)}")

    @organization_context_required()
    def list_organization_privacy_requests(
        self, event: Dict[str, Any], org_context
    ) -> Dict[str, Any]:
        """List privacy requests for an organization."""
        try:
            organization_id = org_context.organization_id

            # Query privacy requests for organization
            response = self.privacy_requests_table.scan(
                FilterExpression=boto3.dynamodb.conditions.Attr("organizationId").eq(
                    organization_id
                )
            )

            requests = response.get("Items", [])

            # Sort by received date (newest first)
            requests.sort(key=lambda x: x.get("receivedAt", ""), reverse=True)

            return {
                "statusCode": 200,
                "body": {
                    "organizationId": organization_id,
                    "totalRequests": len(requests),
                    "requests": requests[:50],  # Limit to 50 most recent
                },
            }

        except Exception as e:
            logger.error(f"Error listing organization privacy requests: {str(e)}")
            return self._error_response(f"Internal error: {str(e)}")

    def _process_data_access_request(self, request_id: str):
        """Process data access request (GDPR Article 15)."""
        try:
            # Get request details
            response = self.privacy_requests_table.get_item(
                Key={"requestId": request_id}
            )
            if "Item" not in response:
                return

            request_data = response["Item"]

            # Update status to processing
            self.privacy_requests_table.update_item(
                Key={"requestId": request_id},
                UpdateExpression="SET #status = :processing, updatedAt = :updated",
                ExpressionAttributeNames={"#status": "status"},
                ExpressionAttributeValues={
                    ":processing": PrivacyRequestStatus.PROCESSING.value,
                    ":updated": datetime.utcnow().isoformat(),
                },
            )

            # Discover personal data
            discovery_result = discover_personal_data(
                request_data["dataSubjectEmail"], request_data.get("organizationId")
            )

            # Generate data access report
            access_report = self._generate_data_access_report(
                discovery_result, request_data
            )

            # Update request with completion
            self.privacy_requests_table.update_item(
                Key={"requestId": request_id},
                UpdateExpression="SET #status = :completed, completedAt = :completed_at, accessReport = :report, updatedAt = :updated",
                ExpressionAttributeNames={"#status": "status"},
                ExpressionAttributeValues={
                    ":completed": PrivacyRequestStatus.COMPLETED.value,
                    ":completed_at": datetime.utcnow().isoformat(),
                    ":report": access_report,
                    ":updated": datetime.utcnow().isoformat(),
                },
            )

            # Send completion email with report
            self._send_data_access_completion(
                request_data["dataSubjectEmail"], access_report
            )

            # Log completion audit event
            self._log_privacy_request_completion(request_id, "DATA_ACCESS")

        except Exception as e:
            logger.error(f"Error processing data access request {request_id}: {str(e)}")
            self._update_request_status(request_id, PrivacyRequestStatus.FAILED, str(e))

    def _process_data_deletion_request(self, request_id: str):
        """Process data deletion request (GDPR Article 17)."""
        try:
            # Get request details
            response = self.privacy_requests_table.get_item(
                Key={"requestId": request_id}
            )
            if "Item" not in response:
                return

            request_data = response["Item"]

            # Update status to processing
            self.privacy_requests_table.update_item(
                Key={"requestId": request_id},
                UpdateExpression="SET #status = :processing, updatedAt = :updated",
                ExpressionAttributeNames={"#status": "status"},
                ExpressionAttributeValues={
                    ":processing": PrivacyRequestStatus.PROCESSING.value,
                    ":updated": datetime.utcnow().isoformat(),
                },
            )

            # Execute data deletion
            deletion_result = execute_privacy_data_deletion(
                request_data["dataSubjectEmail"], request_data.get("organizationId")
            )

            # Update request with deletion results
            self.privacy_requests_table.update_item(
                Key={"requestId": request_id},
                UpdateExpression="SET #status = :completed, completedAt = :completed_at, deletionResult = :result, updatedAt = :updated",
                ExpressionAttributeNames={"#status": "status"},
                ExpressionAttributeValues={
                    ":completed": PrivacyRequestStatus.COMPLETED.value,
                    ":completed_at": datetime.utcnow().isoformat(),
                    ":result": deletion_result,
                    ":updated": datetime.utcnow().isoformat(),
                },
            )

            # Send deletion confirmation
            self._send_data_deletion_completion(
                request_data["dataSubjectEmail"], deletion_result
            )

            # Log completion audit event
            self._log_privacy_request_completion(request_id, "DATA_DELETION")

        except Exception as e:
            logger.error(
                f"Error processing data deletion request {request_id}: {str(e)}"
            )
            self._update_request_status(request_id, PrivacyRequestStatus.FAILED, str(e))

    def _process_data_portability_request(self, request_id: str):
        """Process data portability request (GDPR Article 20)."""
        try:
            # Get request details
            response = self.privacy_requests_table.get_item(
                Key={"requestId": request_id}
            )
            if "Item" not in response:
                return

            request_data = response["Item"]

            # Update status to processing
            self.privacy_requests_table.update_item(
                Key={"requestId": request_id},
                UpdateExpression="SET #status = :processing, updatedAt = :updated",
                ExpressionAttributeNames={"#status": "status"},
                ExpressionAttributeValues={
                    ":processing": PrivacyRequestStatus.PROCESSING.value,
                    ":updated": datetime.utcnow().isoformat(),
                },
            )

            # Discover personal data
            discovery_result = discover_personal_data(
                request_data["dataSubjectEmail"], request_data.get("organizationId")
            )

            # Generate portable data export
            portable_data = self._generate_portable_data_export(
                discovery_result, request_data
            )

            # Update request with completion
            self.privacy_requests_table.update_item(
                Key={"requestId": request_id},
                UpdateExpression="SET #status = :completed, completedAt = :completed_at, portableData = :data, updatedAt = :updated",
                ExpressionAttributeNames={"#status": "status"},
                ExpressionAttributeValues={
                    ":completed": PrivacyRequestStatus.COMPLETED.value,
                    ":completed_at": datetime.utcnow().isoformat(),
                    ":data": portable_data,
                    ":updated": datetime.utcnow().isoformat(),
                },
            )

            # Send completion email with download link
            self._send_data_portability_completion(
                request_data["dataSubjectEmail"], portable_data
            )

            # Log completion audit event
            self._log_privacy_request_completion(request_id, "DATA_PORTABILITY")

        except Exception as e:
            logger.error(
                f"Error processing data portability request {request_id}: {str(e)}"
            )
            self._update_request_status(request_id, PrivacyRequestStatus.FAILED, str(e))

    def _generate_data_access_report(
        self, discovery_result, request_data: Dict
    ) -> Dict[str, Any]:
        """Generate comprehensive data access report."""

        # Group records by data category
        records_by_category = {}
        for record in discovery_result.records_found:
            category = record.data_category.value
            if category not in records_by_category:
                records_by_category[category] = []
            records_by_category[category].append(
                {
                    "system": record.system_name,
                    "table": record.table_name,
                    "data_fields": record.data_fields,
                    "created_at": (
                        record.created_at.isoformat() if record.created_at else None
                    ),
                    "last_updated": (
                        record.last_updated.isoformat() if record.last_updated else None
                    ),
                    "retention_policy": record.retention_policy,
                    "legal_basis": record.legal_basis,
                }
            )

        return {
            "report_id": f"access_report_{request_data['requestId']}",
            "data_subject_email": request_data["dataSubjectEmail"],
            "report_generated_at": datetime.utcnow().isoformat(),
            "legal_basis": request_data["legalBasis"],
            "total_records_found": discovery_result.total_records,
            "systems_scanned": discovery_result.systems_scanned,
            "data_categories_found": [
                cat.value for cat in discovery_result.data_categories
            ],
            "records_by_category": records_by_category,
            "privacy_rights_available": {
                "right_to_rectification": "Contact support to update incorrect information",
                "right_to_erasure": "Submit deletion request via privacy portal",
                "right_to_restrict_processing": "Available via account settings",
                "right_to_object": "Available via marketing preferences",
                "right_to_data_portability": "Submit portability request via privacy portal",
            },
        }

    def _generate_portable_data_export(
        self, discovery_result, request_data: Dict
    ) -> Dict[str, Any]:
        """Generate machine-readable data export for portability."""

        portable_data = {
            "export_id": f"export_{request_data['requestId']}",
            "data_subject_email": request_data["dataSubjectEmail"],
            "export_generated_at": datetime.utcnow().isoformat(),
            "format": "JSON",
            "legal_basis": request_data["legalBasis"],
            "data_export": {},
        }

        # Organize data by system and table
        for record in discovery_result.records_found:
            system_key = f"{record.system_name}_{record.table_name}"
            if system_key not in portable_data["data_export"]:
                portable_data["data_export"][system_key] = []

            portable_data["data_export"][system_key].append(
                {
                    "record_id": record.record_id,
                    "data": record.data_fields,
                    "metadata": {
                        "created_at": (
                            record.created_at.isoformat() if record.created_at else None
                        ),
                        "last_updated": (
                            record.last_updated.isoformat()
                            if record.last_updated
                            else None
                        ),
                        "data_category": record.data_category.value,
                    },
                }
            )

        return portable_data

    def _calculate_response_deadline(self, legal_basis: LegalBasis) -> datetime:
        """Calculate response deadline based on legal framework."""

        if legal_basis in [
            LegalBasis.GDPR_ARTICLE_15,
            LegalBasis.GDPR_ARTICLE_17,
            LegalBasis.GDPR_ARTICLE_20,
        ]:
            # GDPR: 30 days (can be extended to 60 days in complex cases)
            return datetime.utcnow() + timedelta(days=30)
        elif legal_basis in [
            LegalBasis.CCPA_RIGHT_TO_KNOW,
            LegalBasis.CCPA_RIGHT_TO_DELETE,
        ]:
            # CCPA: 45 days
            return datetime.utcnow() + timedelta(days=45)
        else:
            # Default: 30 days
            return datetime.utcnow() + timedelta(days=30)

    def _send_request_confirmation(
        self, email: str, request_id: str, deadline: datetime
    ):
        """Send confirmation email for privacy request."""
        try:
            subject = "Privacy Request Confirmation"
            body = f"""
            Your privacy request has been received and is being processed.
            
            Request ID: {request_id}
            Expected completion: {deadline.strftime("%Y-%m-%d")}
            
            You can track the status of your request at:
            https://privacy.platform.com/track/{request_id}
            
            This is an automated message. Please do not reply.
            """

            self.ses_client.send_email(
                Source="privacy@platform.com",
                Destination={"ToAddresses": [email]},
                Message={
                    "Subject": {"Data": subject},
                    "Body": {"Text": {"Data": body}},
                },
            )

        except Exception as e:
            logger.error(f"Failed to send confirmation email: {str(e)}")

    def _send_data_access_completion(self, email: str, access_report: Dict):
        """Send data access report to data subject."""
        try:
            subject = "Your Data Access Report"
            body = f"""
            Your data access request has been completed.
            
            Report ID: {access_report["report_id"]}
            Total records found: {access_report["total_records_found"]}
            
            Please find your complete data access report attached.
            
            If you have questions about this report, please contact our privacy team.
            """

            # In production, this would attach the full report
            self.ses_client.send_email(
                Source="privacy@platform.com",
                Destination={"ToAddresses": [email]},
                Message={
                    "Subject": {"Data": subject},
                    "Body": {"Text": {"Data": body}},
                },
            )

        except Exception as e:
            logger.error(f"Failed to send data access completion email: {str(e)}")

    def _send_data_deletion_completion(self, email: str, deletion_result: Dict):
        """Send data deletion confirmation to data subject."""
        try:
            subject = "Data Deletion Completed"
            body = f"""
            Your data deletion request has been completed successfully.
            
            Deletion ID: {deletion_result["deletion_id"]}
            Records deleted: {deletion_result["records_deleted"]}
            
            Your personal data has been permanently removed from our systems.
            
            Verification hash: {deletion_result["deletion_proof"]["cryptographic_hash"]}
            
            This deletion cannot be undone. If you have any questions, please contact our privacy team.
            """

            self.ses_client.send_email(
                Source="privacy@platform.com",
                Destination={"ToAddresses": [email]},
                Message={
                    "Subject": {"Data": subject},
                    "Body": {"Text": {"Data": body}},
                },
            )

        except Exception as e:
            logger.error(f"Failed to send data deletion completion email: {str(e)}")

    def _send_data_portability_completion(self, email: str, portable_data: Dict):
        """Send data portability export to data subject."""
        try:
            subject = "Your Data Export is Ready"
            body = f"""
            Your data portability request has been completed.
            
            Export ID: {portable_data["export_id"]}
            
            Your data export is available for download at:
            https://privacy.platform.com/download/{portable_data["export_id"]}
            
            This download link will expire in 7 days for security purposes.
            """

            self.ses_client.send_email(
                Source="privacy@platform.com",
                Destination={"ToAddresses": [email]},
                Message={
                    "Subject": {"Data": subject},
                    "Body": {"Text": {"Data": body}},
                },
            )

        except Exception as e:
            logger.error(f"Failed to send data portability completion email: {str(e)}")

    def _log_privacy_request_completion(self, request_id: str, request_type: str):
        """Log audit event for privacy request completion."""
        try:
            # This would log detailed audit information for compliance
            logger.info(
                f"Privacy request {request_id} of type {request_type} completed successfully"
            )

        except Exception as e:
            logger.error(f"Failed to log privacy request completion: {str(e)}")

    def _update_request_status(
        self, request_id: str, status: PrivacyRequestStatus, error_message: str = None
    ):
        """Update privacy request status."""
        try:
            update_expression = "SET #status = :status, updatedAt = :updated"
            expression_values = {
                ":status": status.value,
                ":updated": datetime.utcnow().isoformat(),
            }

            if error_message:
                update_expression += ", errorDetails = :error"
                expression_values[":error"] = error_message

            self.privacy_requests_table.update_item(
                Key={"requestId": request_id},
                UpdateExpression=update_expression,
                ExpressionAttributeNames={"#status": "status"},
                ExpressionAttributeValues=expression_values,
            )

        except Exception as e:
            logger.error(f"Failed to update request status: {str(e)}")

    def _get_status_message(self, status: str) -> str:
        """Get human-readable status message."""
        status_messages = {
            "RECEIVED": "Your request has been received and will be processed within the legal deadline.",
            "PROCESSING": "Your request is currently being processed. You will be notified when complete.",
            "COMPLETED": "Your request has been completed successfully.",
            "REJECTED": "Your request was rejected. Please contact our privacy team for more information.",
            "FAILED": "There was an error processing your request. Please contact our privacy team.",
            "PARTIALLY_COMPLETED": "Your request was partially completed. Please contact our privacy team for details.",
        }
        return status_messages.get(status, "Unknown status")

    def _error_response(self, message: str) -> Dict[str, Any]:
        """Generate standardized error response."""
        return {"statusCode": 400, "body": {"error": message}}


# Lambda handler
def lambda_handler(event, context):
    """Main Lambda handler for Privacy Rights operations."""
    try:
        logger.info(f"Privacy rights resolver invoked with event: {json.dumps(event)}")

        resolver = PrivacyRightsResolver()

        # Extract operation type from event
        field_name = event.get("info", {}).get("fieldName")

        # Route to appropriate method based on GraphQL field
        if field_name == "submitPrivacyRequest":
            return resolver.submit_privacy_request(event)
        elif field_name == "getPrivacyRequestStatus":
            return resolver.get_privacy_request_status(event)
        elif field_name == "listOrganizationPrivacyRequests":
            return resolver.list_organization_privacy_requests(event)
        else:
            return {
                "statusCode": 400,
                "body": {"error": f"Unknown operation: {field_name}"},
            }

    except Exception as e:
        logger.error(f"Unhandled error in Privacy Rights resolver: {str(e)}")
        return {"statusCode": 500, "body": {"error": "Internal server error"}}
