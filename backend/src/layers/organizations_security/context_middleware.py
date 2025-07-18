# file: backend/src/layers/organizations_security/context_middleware.py
# author: AI Assistant  
# created: 2025-06-23
# description: Organization Context Middleware for automatic multi-tenant security

import json
import logging
import time
from functools import wraps
from typing import Dict, Any, Optional, Callable, Union, List
from dataclasses import dataclass
from enum import Enum

from rbac_manager import OrganizationRBACManager, OrganizationPermissions
from security_manager import OrganizationSecurityManager

logger = logging.getLogger(__name__)


class ContextExtractionError(Exception):
    """Raised when organization context cannot be extracted from request."""
    pass


class SecurityViolationError(Exception):
    """Raised when security validation fails."""
    pass


@dataclass
class OrganizationContext:
    """Complete organization context for request processing."""
    organization_id: str
    organization_data: Dict[str, Any]
    user_id: str
    user_role: str
    user_permissions: List[str]
    membership_status: str
    cognito_groups: List[str]
    is_platform_admin: bool
    cache_hit: bool = False
    performance_metrics: Dict[str, float] = None
    
    def __post_init__(self):
        if self.performance_metrics is None:
            self.performance_metrics = {}


class OrganizationContextExtractor:
    """Extracts and validates organization context from GraphQL requests."""
    
    def __init__(self):
        self.security_manager = OrganizationSecurityManager()
        self.rbac_manager = OrganizationRBACManager()
        self._context_cache = {}  # Request-level cache
    
    def extract_organization_id(self, event: Dict[str, Any]) -> str:
        """Extract organization ID from GraphQL request with smart detection."""
        start_time = time.time()
        
        try:
            # Try arguments first (most common)
            args = event.get('arguments', {})
            org_id = args.get('organizationId')
            
            if org_id:
                return org_id
            
            # Try nested in input object
            input_data = args.get('input', {})
            org_id = input_data.get('organizationId')
            
            if org_id:
                return org_id
            
            # Try variables (for GraphQL variables)
            variables = event.get('variables', {})
            org_id = variables.get('organizationId')
            
            if org_id:
                return org_id
            
            # Try extracting from operation context
            info = event.get('info', {})
            operation_name = info.get('operation', {}).get('name', {}).get('value', '')
            
            # Some operations don't require organization ID (like listOrganizations)
            if operation_name in ['listOrganizations', 'getOrganizationRoles']:
                return None
            
            # If we get here, organization ID is required but missing
            raise ContextExtractionError("Organization ID is required but not found in request")
            
        except Exception as e:
            logger.error(f"Error extracting organization ID: {str(e)}")
            raise ContextExtractionError(f"Failed to extract organization ID: {str(e)}")
        finally:
            extraction_time = (time.time() - start_time) * 1000
            logger.debug(f"Organization ID extraction took {extraction_time:.2f}ms")
    
    def get_organization_context(
        self, 
        user_id: str, 
        organization_id: str, 
        cognito_groups: List[str],
        cache_key: Optional[str] = None
    ) -> OrganizationContext:
        """Get complete organization context with caching."""
        start_time = time.time()
        
        # Check cache first
        if cache_key and cache_key in self._context_cache:
            cached_context = self._context_cache[cache_key]
            cached_context.cache_hit = True
            cache_time = (time.time() - start_time) * 1000
            cached_context.performance_metrics['cache_lookup_ms'] = cache_time
            logger.debug(f"Organization context cache hit for {cache_key}")
            return cached_context
        
        try:
            # Validate organization exists and is active
            organization_data = self._get_organization_data(organization_id)
            if not organization_data:
                raise SecurityViolationError(f"Organization {organization_id} not found or inactive")
            
            # Check if user is the organization owner first
            is_organization_owner = organization_data.get('ownerId') == user_id
            
            # Check user membership and get role
            membership_data = self._get_user_membership(user_id, organization_id)
            if not membership_data:
                # Check if user is organization owner
                if is_organization_owner:
                    # Owner has implicit membership
                    user_role = 'OWNER'
                    membership_status = 'ACTIVE'
                    is_platform_admin = False
                else:
                    # Check if user is platform admin
                    is_platform_admin = any(group in cognito_groups for group in ['OWNER', 'EMPLOYEE'])
                    if not is_platform_admin:
                        raise SecurityViolationError(f"User {user_id} is not a member of organization {organization_id}")
                    
                    # Platform admin gets viewer permissions
                    user_role = 'VIEWER'
                    membership_status = 'PLATFORM_ADMIN'
            else:
                user_role = membership_data.get('role', 'VIEWER')
                membership_status = membership_data.get('status', 'UNKNOWN')
                is_platform_admin = False
                
                # Validate membership is active
                if membership_status != 'ACTIVE' and not is_platform_admin:
                    raise SecurityViolationError(f"User membership in organization {organization_id} is {membership_status}")
            
            # Get user permissions for this organization
            permissions_data = self.rbac_manager.get_user_permissions(
                user_id, organization_id, cognito_groups
            )
            user_permissions = permissions_data.get('permissions', [])
            
            # Build complete context
            end_time = time.time()
            context = OrganizationContext(
                organization_id=organization_id,
                organization_data=organization_data,
                user_id=user_id,
                user_role=user_role,
                user_permissions=user_permissions,
                membership_status=membership_status,
                cognito_groups=cognito_groups,
                is_platform_admin=is_platform_admin,
                cache_hit=False,
                performance_metrics={
                    'total_lookup_ms': (end_time - start_time) * 1000,
                    'organization_lookup_ms': 0,  # Will be set by _get_organization_data
                    'membership_lookup_ms': 0,    # Will be set by _get_user_membership
                    'permissions_lookup_ms': 0    # Will be set by rbac_manager
                }
            )
            
            # Cache the context
            if cache_key:
                self._context_cache[cache_key] = context
                logger.debug(f"Cached organization context for {cache_key}")
            
            return context
            
        except SecurityViolationError:
            raise  # Re-raise security violations as-is
        except Exception as e:
            logger.error(f"Error building organization context: {str(e)}")
            raise ContextExtractionError(f"Failed to build organization context: {str(e)}")
    
    def _get_organization_data(self, organization_id: str) -> Optional[Dict[str, Any]]:
        """Get organization data from database."""
        start_time = time.time()
        try:
            import boto3
            import os
            dynamodb = boto3.resource('dynamodb')
            table_name = os.environ.get('ORGANIZATIONS_TABLE_NAME', 'Organizations')
            organizations_table = dynamodb.Table(table_name)
            
            response = organizations_table.get_item(
                Key={'organizationId': organization_id}
            )
            
            org_data = response.get('Item')
            if org_data and org_data.get('status') == 'ACTIVE':
                return org_data
            return None
            
        except Exception as e:
            logger.error(f"Error getting organization data: {str(e)}")
            return None
        finally:
            lookup_time = (time.time() - start_time) * 1000
            logger.debug(f"Organization data lookup took {lookup_time:.2f}ms")
    
    def _get_user_membership(self, user_id: str, organization_id: str) -> Optional[Dict[str, Any]]:
        """Get user membership data from database."""
        start_time = time.time()
        try:
            import boto3
            import os
            dynamodb = boto3.resource('dynamodb')
            table_name = os.environ.get('ORGANIZATION_USERS_TABLE_NAME', 'OrganizationUsers')
            org_users_table = dynamodb.Table(table_name)
            
            response = org_users_table.get_item(
                Key={
                    'userId': user_id,
                    'organizationId': organization_id
                }
            )
            
            return response.get('Item')
            
        except Exception as e:
            logger.error(f"Error getting user membership: {str(e)}")
            return None
        finally:
            lookup_time = (time.time() - start_time) * 1000
            logger.debug(f"User membership lookup took {lookup_time:.2f}ms")
    
    def clear_cache(self):
        """Clear request-level cache (call between requests)."""
        self._context_cache.clear()


class OrganizationContextMiddleware:
    """Middleware for automatic organization context validation and injection."""
    
    def __init__(self):
        self.extractor = OrganizationContextExtractor()
        self.rbac_manager = OrganizationRBACManager()
    
    def validate_and_inject_context(
        self, 
        event: Dict[str, Any], 
        required_permission: Optional[str] = None
    ) -> OrganizationContext:
        """Main middleware function to validate and inject organization context."""
        start_time = time.time()
        
        try:
            # Extract user information
            # Get the Cognito sub first
            cognito_sub = event.get('identity', {}).get('sub')
            cognito_groups = event.get('identity', {}).get('groups', [])
            
            if not user_id:
                raise SecurityViolationError("User ID not found in request context")
            
            # Extract organization ID
            organization_id = self.extractor.extract_organization_id(event)
            
            # Some operations don't require organization context
            if not organization_id and not required_permission:
                return None
            
            if not organization_id:
                raise SecurityViolationError("Organization ID is required for this operation")
            
            # Build cache key for this request
            cache_key = f"{user_id}:{organization_id}:{int(time.time() // 300)}"  # 5-minute cache
            
            # Get organization context
            org_context = self.extractor.get_organization_context(
                user_id, organization_id, cognito_groups, cache_key
            )
            
            # Validate required permission if specified
            if required_permission:
                has_permission, rbac_context = self.rbac_manager.check_permission(
                    user_id, organization_id, required_permission, cognito_groups
                )
                
                if not has_permission:
                    raise SecurityViolationError(
                        f"Access denied - insufficient permissions. Required: {required_permission}"
                    )
            
            # Log successful access
            total_time = (time.time() - start_time) * 1000
            org_context.performance_metrics['total_middleware_ms'] = total_time
            
            self._log_organization_access(
                user_id=user_id,
                organization_id=organization_id,
                operation=event.get('info', {}).get('fieldName', 'unknown'),
                permission=required_permission,
                result='granted',
                performance_metrics=org_context.performance_metrics
            )
            
            return org_context
            
        except SecurityViolationError as e:
            # Log security violation
            self._log_security_violation(
                user_id=event.get('identity', {}).get('sub'),
                organization_id=self.extractor.extract_organization_id(event) if hasattr(self, 'extractor') else 'unknown',
                operation=event.get('info', {}).get('fieldName', 'unknown'),
                violation_type='access_denied',
                details=str(e),
                event_context=event
            )
            raise
        except Exception as e:
            logger.error(f"Middleware error: {str(e)}")
            raise SecurityViolationError(f"Security validation failed: {str(e)}")
    
    def _log_organization_access(
        self, 
        user_id: str, 
        organization_id: str, 
        operation: str,
        permission: Optional[str],
        result: str,
        performance_metrics: Dict[str, float]
    ):
        """Log organization access for audit trail."""
        audit_entry = {
            'timestamp': time.time(),
            'user_id': user_id,
            'organization_id': organization_id,
            'operation': operation,
            'permission': permission,
            'result': result,
            'performance_metrics': performance_metrics
        }
        
        logger.info(f"Organization access: {json.dumps(audit_entry)}")
    
    def _log_security_violation(
        self, 
        user_id: Optional[str], 
        organization_id: str,
        operation: str,
        violation_type: str,
        details: str,
        event_context: Dict[str, Any]
    ):
        """Log security violations for monitoring and alerting."""
        violation_entry = {
            'timestamp': time.time(),
            'user_id': user_id,
            'organization_id': organization_id,
            'operation': operation,
            'violation_type': violation_type,
            'details': details,
            'source_ip': event_context.get('requestContext', {}).get('identity', {}).get('sourceIp'),
            'user_agent': event_context.get('requestContext', {}).get('identity', {}).get('userAgent')
        }
        
        logger.warning(f"Security violation: {json.dumps(violation_entry)}")


# Decorator functions for easy integration
def organization_context_required(permission: Optional[str] = None):
    """Decorator to require organization context validation."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(self, event: Dict[str, Any], *args, **kwargs):
            middleware = OrganizationContextMiddleware()
            
            try:
                # Validate and inject organization context
                org_context = middleware.validate_and_inject_context(event, permission)
                
                # Call original function with organization context
                return func(self, event, org_context, *args, **kwargs)
                
            except SecurityViolationError as e:
                return self._error_response(str(e), {
                    'violation_type': 'organization_access_denied',
                    'required_permission': permission
                })
            except Exception as e:
                logger.error(f"Middleware wrapper error: {str(e)}")
                return self._error_response(f"Security validation failed: {str(e)}")
        
        return wrapper
    return decorator


def requires_permission(permission: str):
    """Decorator to require specific permission."""
    return organization_context_required(permission)


def requires_any_permission(permissions: List[str]):
    """Decorator to require any of the specified permissions."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(self, event: Dict[str, Any], *args, **kwargs):
            middleware = OrganizationContextMiddleware()
            
            try:
                # Get organization context without permission check
                org_context = middleware.validate_and_inject_context(event)
                
                if not org_context:
                    return self._error_response("Organization context required")
                
                # Check if user has any of the required permissions
                user_permissions = org_context.user_permissions
                has_any_permission = any(perm in user_permissions for perm in permissions)
                
                if not has_any_permission:
                    raise SecurityViolationError(
                        f"Access denied - requires any of: {', '.join(permissions)}"
                    )
                
                # Call original function with organization context
                return func(self, event, org_context, *args, **kwargs)
                
            except SecurityViolationError as e:
                return self._error_response(str(e), {
                    'violation_type': 'insufficient_permissions',
                    'required_permissions': permissions,
                    'user_permissions': org_context.user_permissions if 'org_context' in locals() else []
                })
            except Exception as e:
                logger.error(f"Permission wrapper error: {str(e)}")
                return self._error_response(f"Permission validation failed: {str(e)}")
        
        return wrapper
    return decorator


def requires_organization_owner():
    """Decorator to require organization owner role."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(self, event: Dict[str, Any], *args, **kwargs):
            middleware = OrganizationContextMiddleware()
            
            try:
                # Get organization context
                org_context = middleware.validate_and_inject_context(event)
                
                if not org_context:
                    return self._error_response("Organization context required")
                
                # Check if user is organization owner
                is_owner = (
                    org_context.user_role == 'OWNER' or
                    org_context.organization_data.get('ownerId') == org_context.user_id or
                    org_context.is_platform_admin
                )
                
                if not is_owner:
                    raise SecurityViolationError("Access denied - organization owner required")
                
                # Call original function with organization context
                return func(self, event, org_context, *args, **kwargs)
                
            except SecurityViolationError as e:
                return self._error_response(str(e), {
                    'violation_type': 'owner_required',
                    'user_role': org_context.user_role if 'org_context' in locals() else 'unknown'
                })
            except Exception as e:
                logger.error(f"Owner wrapper error: {str(e)}")
                return self._error_response(f"Owner validation failed: {str(e)}")
        
        return wrapper
    return decorator


def allows_platform_override(func: Callable) -> Callable:
    """Decorator to allow platform admin override of organization requirements."""
    @wraps(func)
    def wrapper(self, event: Dict[str, Any], *args, **kwargs):
        # Check if user is platform admin
        cognito_groups = event.get('identity', {}).get('groups', [])
        is_platform_admin = any(group in cognito_groups for group in ['OWNER', 'EMPLOYEE'])
        
        if is_platform_admin:
            # Platform admin can bypass organization requirements
            logger.info(f"Platform admin override for operation {event.get('info', {}).get('fieldName')}")
            return func(self, event, None, *args, **kwargs)
        
        # Regular user - apply normal organization validation
        return func(self, event, *args, **kwargs)
    
    return wrapper