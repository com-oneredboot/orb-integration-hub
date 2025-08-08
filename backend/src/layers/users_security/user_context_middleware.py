# file: backend/src/layers/users_security/user_context_middleware.py
# author: AI Assistant
# created: 2025-07-17
# description: User Context Middleware using common security components

import json
import logging
import time
import os
from functools import wraps
from typing import Dict, Any, Optional, List
from dataclasses import dataclass

import boto3
from botocore.exceptions import ClientError

# Import from orb-common package
from orb_common.exceptions import (
    SecurityViolationError,
    ContextExtractionError,
    AuthenticationError,
    AuthorizationError,
    CrossAccessViolationError
)

# Import from users security layer
from users_audit_logger import (
    UserAuditEventType,
    log_user_audit_event,
    ComplianceFlag
)

logger = logging.getLogger(__name__)


@dataclass
class UserContext:
    """Complete user context for request processing."""
    user_id: str  # Internal userId from Users table
    cognito_sub: str  # Cognito subject identifier
    cognito_groups: List[str]
    is_admin: bool
    is_self_access: bool  # True if user is accessing their own data
    target_user_id: Optional[str] = None  # User being accessed (for admin operations)
    session_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None
    performance_metrics: Dict[str, float] = None
    
    def __post_init__(self):
        if self.performance_metrics is None:
            self.performance_metrics = {}
    
    def to_audit_context(self) -> Dict[str, Any]:
        """Convert to audit logging context."""
        return {
            'user_id': self.user_id,
            'cognito_sub': self.cognito_sub,
            'session_id': self.session_id,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'cognito_groups': self.cognito_groups,
            'is_admin': self.is_admin
        }


class UserContextExtractor:
    """Extracts and validates user context from GraphQL requests."""
    
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        self._user_cache = {}  # Cache for user lookups
        self._cache_ttl = 300  # 5 minutes
        
        # Get table name from environment
        self.users_table_name = os.environ.get('USERS_TABLE_NAME', 'Users')
        self.users_table = self.dynamodb.Table(self.users_table_name)
        logger.info(f"UserContextExtractor initialized with table: {self.users_table_name}")
    
    def extract_context(self, event: Dict[str, Any]) -> UserContext:
        """Extract user context from Lambda event."""
        start_time = time.time()
        
        try:
            # Extract Cognito information
            identity = event.get('identity', {})
            cognito_sub = identity.get('sub')
            cognito_groups = identity.get('groups', [])
            
            if not cognito_sub:
                raise AuthenticationError("Authentication required - no Cognito sub found")
            
            # Get request metadata
            request_context = event.get('requestContext', {})
            request_headers = event.get('request', {}).get('headers', {})
            
            session_id = request_context.get('requestId')
            ip_address = self._extract_ip_address(request_headers)
            user_agent = request_headers.get('user-agent', '')
            
            # Resolve userId from Cognito sub
            user_id = self._resolve_user_id(cognito_sub)
            if not user_id:
                raise SecurityViolationError(
                    f"User not found for Cognito sub: {cognito_sub}",
                    violation_type="USER_NOT_FOUND"
                )
            
            # Determine if user is admin
            is_admin = any(group in ['OWNER', 'EMPLOYEE'] for group in cognito_groups)
            
            # Extract target user ID from request (for operations on other users)
            target_user_id = self._extract_target_user_id(event)
            
            # Determine if this is self-access
            is_self_access = (target_user_id == user_id) if target_user_id else True
            
            # Build context
            context = UserContext(
                user_id=user_id,
                cognito_sub=cognito_sub,
                cognito_groups=cognito_groups,
                is_admin=is_admin,
                is_self_access=is_self_access,
                target_user_id=target_user_id,
                session_id=session_id,
                ip_address=ip_address,
                user_agent=user_agent,
                request_id=session_id,
                performance_metrics={
                    'context_extraction_ms': (time.time() - start_time) * 1000
                }
            )
            
            logger.info(f"User context extracted: user_id={user_id}, is_admin={is_admin}, is_self_access={is_self_access}")
            
            return context
            
        except (AuthenticationError, SecurityViolationError):
            raise
        except Exception as e:
            logger.error(f"Error extracting user context: {str(e)}")
            raise ContextExtractionError(f"Failed to extract user context: {str(e)}")
    
    def _extract_ip_address(self, headers: Dict[str, str]) -> str:
        """Extract client IP address from headers."""
        # Check various header fields where IP might be stored
        for header in ['x-forwarded-for', 'x-real-ip', 'x-client-ip']:
            if header in headers:
                # Take the first IP if there are multiple
                ip = headers[header].split(',')[0].strip()
                if ip:
                    return ip
        return 'unknown'
    
    def _resolve_user_id(self, cognito_sub: str) -> Optional[str]:
        """Resolve Cognito sub to internal userId."""
        # Check cache first
        cache_key = f"sub:{cognito_sub}"
        if cache_key in self._user_cache:
            cached = self._user_cache[cache_key]
            if time.time() - cached['timestamp'] < self._cache_ttl:
                logger.debug(f"Cache hit for sub: {cognito_sub}")
                return cached['user_id']
        
        try:
            # Query Users table by Cognito sub
            logger.debug(f"Querying Users table for sub: {cognito_sub}")
            response = self.users_table.query(
                IndexName='CognitoSubIndex',
                KeyConditionExpression='cognitoSub = :sub',
                ExpressionAttributeValues={':sub': cognito_sub},
                ProjectionExpression='userId'
            )
            
            if response.get('Items'):
                user_id = response['Items'][0]['userId']
                # Cache the result
                self._user_cache[cache_key] = {
                    'user_id': user_id,
                    'timestamp': time.time()
                }
                logger.debug(f"Resolved sub {cognito_sub} to userId {user_id}")
                return user_id
            
            logger.warning(f"No user found for Cognito sub: {cognito_sub}")
            return None
            
        except Exception as e:
            logger.error(f"Error resolving userId for sub {cognito_sub}: {str(e)}")
            return None
    
    def _extract_target_user_id(self, event: Dict[str, Any]) -> Optional[str]:
        """Extract target user ID from request arguments."""
        args = event.get('arguments', {})
        
        # Check various possible locations
        if 'userId' in args:
            return args['userId']
        
        input_data = args.get('input', {})
        if 'userId' in input_data:
            return input_data['userId']
        
        # For list operations, there might not be a specific target
        return None


# Decorator for user context validation
def user_context_required(log_access: bool = True):
    """Decorator to automatically extract and validate user context."""
    def decorator(func):
        @wraps(func)
        def wrapper(self, event: Dict[str, Any], *args, **kwargs):
            try:
                # Extract user context
                extractor = UserContextExtractor()
                user_context = extractor.extract_context(event)
                
                # Log the access attempt if requested
                if log_access:
                    field_name = event.get('info', {}).get('fieldName', 'Unknown')
                    
                    # Determine event type based on operation
                    if 'Get' in field_name or 'Query' in field_name:
                        event_type = UserAuditEventType.USER_PROFILE_VIEWED
                    elif 'List' in field_name:
                        event_type = UserAuditEventType.USER_DATA_EXPORTED
                    else:
                        event_type = UserAuditEventType.USER_ACCESS_DENIED
                    
                    log_user_audit_event(
                        event_type=event_type,
                        acting_user_context=user_context.to_audit_context(),
                        target_user_id=user_context.target_user_id or user_context.user_id,
                        action_details={
                            'operation': field_name,
                            'method': event.get('info', {}).get('parentTypeName', 'Unknown'),
                            'self_access': user_context.is_self_access,
                            'admin_override': user_context.is_admin and not user_context.is_self_access
                        }
                    )
                
                # Call the decorated function with user context
                return func(self, event, user_context, *args, **kwargs)
                
            except (AuthenticationError, AuthorizationError, SecurityViolationError) as e:
                # Log security violation
                logger.warning(f"Security error in {func.__name__}: {str(e)}")
                
                log_user_audit_event(
                    event_type=UserAuditEventType.USER_ACCESS_DENIED,
                    acting_user_context={
                        'user_id': event.get('identity', {}).get('sub', 'unknown'),
                        'session_id': event.get('requestContext', {}).get('requestId'),
                        'ip_address': event.get('request', {}).get('headers', {}).get('x-forwarded-for', ''),
                        'user_agent': event.get('request', {}).get('headers', {}).get('user-agent', '')
                    },
                    target_user_id='unknown',
                    action_details={
                        'operation': event.get('info', {}).get('fieldName', 'Unknown'),
                        'error_type': e.__class__.__name__,
                        'error_message': str(e)
                    },
                    compliance_flags=[ComplianceFlag.SOC_2]
                )
                
                return {
                    'StatusCode': e.status_code,
                    'Message': str(e),
                    'Data': None
                }
                
            except Exception as e:
                logger.error(f"Unexpected error in user context middleware: {str(e)}")
                return {
                    'StatusCode': 500,
                    'Message': 'Internal server error',
                    'Data': None
                }
        
        return wrapper
    return decorator


# Decorator for self-access validation
def requires_self_or_admin():
    """Decorator to ensure users can only access their own data unless admin."""
    def decorator(func):
        @wraps(func)
        def wrapper(self, event: Dict[str, Any], user_context: UserContext, *args, **kwargs):
            # Check if user is accessing their own data or is admin
            if not user_context.is_self_access and not user_context.is_admin:
                # Log the cross-access attempt
                log_user_audit_event(
                    event_type=UserAuditEventType.USER_CROSS_ACCESS_ATTEMPTED,
                    acting_user_context=user_context.to_audit_context(),
                    target_user_id=user_context.target_user_id,
                    action_details={
                        'operation': event.get('info', {}).get('fieldName', 'Unknown'),
                        'violation_type': 'cross_user_access',
                        'attempted_user_id': user_context.target_user_id
                    },
                    compliance_flags=[ComplianceFlag.SOC_2, ComplianceFlag.GDPR]
                )
                
                raise CrossAccessViolationError(
                    message="Access denied - you can only access your own data",
                    source_entity=user_context.user_id,
                    target_entity=user_context.target_user_id,
                    entity_type="USER"
                )
            
            # Allow the operation
            return func(self, event, user_context, *args, **kwargs)
        
        return wrapper
    return decorator


# Decorator for admin-only operations
def admin_required():
    """Decorator to ensure only admins can perform the operation."""
    def decorator(func):
        @wraps(func)
        def wrapper(self, event: Dict[str, Any], user_context: UserContext, *args, **kwargs):
            if not user_context.is_admin:
                # Log the unauthorized attempt
                log_user_audit_event(
                    event_type=UserAuditEventType.USER_ACCESS_DENIED,
                    acting_user_context=user_context.to_audit_context(),
                    target_user_id=user_context.target_user_id or user_context.user_id,
                    action_details={
                        'operation': event.get('info', {}).get('fieldName', 'Unknown'),
                        'violation_type': 'admin_required',
                        'required_groups': ['OWNER', 'EMPLOYEE']
                    },
                    compliance_flags=[ComplianceFlag.SOX]
                )
                
                raise AuthorizationError(
                    message="Access denied - admin privileges required",
                    details={'required_groups': ['OWNER', 'EMPLOYEE']}
                )
            
            return func(self, event, user_context, *args, **kwargs)
        
        return wrapper
    return decorator