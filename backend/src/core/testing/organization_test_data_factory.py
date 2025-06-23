"""
Organization Test Data Management Factory

Comprehensive test data factory for organizations feature testing
providing isolated test environments, automated data seeding, and cleanup mechanisms.

Author: Claude Code Assistant
Date: 2025-06-23
"""

import uuid
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from decimal import Decimal

from ..models.OrganizationsModel import Organizations, OrganizationsCreateInput
from ..models.OrganizationUsersModel import OrganizationUsers, OrganizationUsersCreateInput
from ..models.ApplicationsModel import Applications, ApplicationsCreateInput
from ..models.UsersModel import Users, UsersCreateInput
from ..models.OrganizationStatusEnum import OrganizationStatus
from ..models.OrganizationUserRoleEnum import OrganizationUserRole
from ..models.OrganizationUserStatusEnum import OrganizationUserStatus
from ..models.UserStatusEnum import UserStatus


class OrganizationTestDataFactory:
    """Factory for creating comprehensive test data for organizations feature."""
    
    # Test environment isolation prefix
    TEST_PREFIX = "TEST_"
    
    # Test organization size categories
    ORGANIZATION_SIZES = {
        "small": {"user_count": 5, "app_count": 2},
        "medium": {"user_count": 50, "app_count": 10},
        "large": {"user_count": 500, "app_count": 50},
        "enterprise": {"user_count": 1000, "app_count": 100}
    }
    
    def __init__(self, test_session_id: Optional[str] = None):
        """Initialize with optional test session ID for isolation."""
        self.test_session_id = test_session_id or str(uuid.uuid4())[:8]
        self.created_resources = {
            "organizations": [],
            "users": [],
            "organization_users": [],
            "applications": []
        }
    
    # =============================================================================
    # Organization Creation Methods
    # =============================================================================
    
    def create_test_organization(
        self,
        name: Optional[str] = None,
        size: str = "small",
        status: OrganizationStatus = OrganizationStatus.ACTIVE,
        owner_id: Optional[str] = None,
        **overrides
    ) -> Dict[str, Any]:
        """Create a complete test organization with users and applications."""
        
        # Generate unique test organization name
        org_name = name or f"{self.TEST_PREFIX}Org_{self.test_session_id}_{uuid.uuid4().hex[:8]}"
        org_id = f"org_{uuid.uuid4().hex}"
        
        # Create owner user if not provided
        if not owner_id:
            owner = self.create_test_user(
                email=f"owner_{org_id}@test.com",
                role_in_org="OWNER"
            )
            owner_id = owner["user_id"]
        
        # Create organization
        organization = self._create_organization_record(
            organization_id=org_id,
            name=org_name,
            owner_id=owner_id,
            status=status,
            **overrides
        )
        
        # Create additional users based on size
        size_config = self.ORGANIZATION_SIZES.get(size, self.ORGANIZATION_SIZES["small"])
        additional_users = []
        
        for i in range(size_config["user_count"] - 1):  # -1 for owner
            user = self.create_test_user(
                email=f"user_{i}_{org_id}@test.com",
                organization_id=org_id,
                role_in_org="MEMBER"
            )
            additional_users.append(user)
        
        # Create applications
        applications = []
        for i in range(size_config["app_count"]):
            app = self.create_test_application(
                organization_id=org_id,
                name=f"TestApp_{i}_{org_id}"
            )
            applications.append(app)
        
        # Track created resources
        self.created_resources["organizations"].append(org_id)
        
        return {
            "organization": organization,
            "owner": {"user_id": owner_id},
            "users": additional_users,
            "applications": applications,
            "metadata": {
                "total_users": size_config["user_count"],
                "total_applications": size_config["app_count"],
                "test_session_id": self.test_session_id,
                "size_category": size
            }
        }
    
    def create_multi_organization_user(
        self,
        organization_ids: List[str],
        base_email: Optional[str] = None,
        roles: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Create a user that belongs to multiple organizations."""
        
        user_id = f"user_{uuid.uuid4().hex}"
        email = base_email or f"multiorg_{user_id}@test.com"
        
        # Create base user
        user = self.create_test_user(
            user_id=user_id,
            email=email,
            skip_org_membership=True
        )
        
        # Create organization memberships
        memberships = []
        for org_id in organization_ids:
            role = (roles or {}).get(org_id, "MEMBER")
            membership = self._create_organization_user_record(
                user_id=user_id,
                organization_id=org_id,
                role=OrganizationUserRole[role],
                status=OrganizationUserStatus.ACTIVE
            )
            memberships.append(membership)
        
        return {
            "user": user,
            "memberships": memberships,
            "organization_count": len(organization_ids)
        }
    
    def create_organization_hierarchy(
        self,
        levels: int = 3,
        children_per_level: int = 3
    ) -> Dict[str, Any]:
        """Create a hierarchical organization structure for complex testing."""
        
        def create_level(parent_id: Optional[str], level: int, remaining_levels: int):
            organizations = []
            
            for i in range(children_per_level):
                org = self.create_test_organization(
                    name=f"Level{level}_Org{i}_{self.test_session_id}",
                    size="small"
                )
                organizations.append(org)
                
                if remaining_levels > 0:
                    children = create_level(
                        org["organization"]["organization_id"],
                        level + 1,
                        remaining_levels - 1
                    )
                    org["children"] = children
            
            return organizations
        
        hierarchy = create_level(None, 1, levels - 1)
        
        return {
            "hierarchy": hierarchy,
            "metadata": {
                "levels": levels,
                "children_per_level": children_per_level,
                "total_organizations": sum(children_per_level ** i for i in range(1, levels + 1))
            }
        }
    
    # =============================================================================
    # Edge Case and Security Test Data
    # =============================================================================
    
    def create_edge_case_organizations(self) -> Dict[str, Any]:
        """Create organizations with edge case scenarios for testing."""
        
        edge_cases = {}
        
        # Organization with maximum field lengths
        edge_cases["max_length"] = self.create_test_organization(
            name="A" * 255,  # Maximum name length
            description="D" * 1000,  # Maximum description length
            size="small"
        )
        
        # Organization with minimum valid data
        edge_cases["minimal"] = self.create_test_organization(
            name="A",  # Minimum name length
            description="",  # Empty description
            size="small"
        )
        
        # Organization with special characters
        edge_cases["special_chars"] = self.create_test_organization(
            name="Test-Org_123!@#$%^&*()",
            description="Description with special chars: <>?[]{}|\\~`",
            size="small"
        )
        
        # Organization with Unicode characters
        edge_cases["unicode"] = self.create_test_organization(
            name="测试组织_テスト_🏢",
            description="Unicode description: café, naïve, résumé",
            size="small"
        )
        
        # Organization in different statuses
        for status in OrganizationStatus:
            edge_cases[f"status_{status.value.lower()}"] = self.create_test_organization(
                name=f"Status_{status.value}_Org",
                status=status,
                size="small"
            )
        
        return edge_cases
    
    def create_security_test_organizations(self) -> Dict[str, Any]:
        """Create organizations with security-focused test scenarios."""
        
        security_tests = {}
        
        # XSS injection attempts
        security_tests["xss_injection"] = self.create_test_organization(
            name="<script>alert('xss')</script>",
            description="<img src=x onerror=alert('xss')>",
            size="small"
        )
        
        # SQL injection attempts
        security_tests["sql_injection"] = self.create_test_organization(
            name="'; DROP TABLE organizations; --",
            description="' OR '1'='1",
            size="small"
        )
        
        # Path traversal attempts
        security_tests["path_traversal"] = self.create_test_organization(
            name="../../etc/passwd",
            description="../../../windows/system32/config/sam",
            size="small"
        )
        
        # LDAP injection attempts
        security_tests["ldap_injection"] = self.create_test_organization(
            name="*)(uid=*))(|(uid=*",
            description="*)(objectClass=*",
            size="small"
        )
        
        # Command injection attempts
        security_tests["command_injection"] = self.create_test_organization(
            name="test; rm -rf /",
            description="test && cat /etc/passwd",
            size="small"
        )
        
        # XXE injection attempts
        security_tests["xxe_injection"] = self.create_test_organization(
            name="<!DOCTYPE foo [<!ENTITY xxe SYSTEM 'file:///etc/passwd'>]>",
            description="&xxe;",
            size="small"
        )
        
        return security_tests
    
    def create_performance_test_data(
        self,
        organization_count: int = 100,
        max_users_per_org: int = 1000
    ) -> List[Dict[str, Any]]:
        """Create large dataset for performance testing."""
        
        organizations = []
        
        for i in range(organization_count):
            # Vary organization sizes for realistic performance testing
            if i % 20 == 0:  # 5% enterprise
                size = "enterprise"
            elif i % 10 == 0:  # 10% large
                size = "large"
            elif i % 5 == 0:  # 20% medium
                size = "medium"
            else:  # 65% small
                size = "small"
            
            org = self.create_test_organization(
                name=f"PerfTest_Org_{i:04d}",
                size=size
            )
            organizations.append(org)
            
            # Add progress logging for large datasets
            if (i + 1) % 10 == 0:
                print(f"Created {i + 1}/{organization_count} performance test organizations")
        
        return organizations
    
    # =============================================================================
    # Helper Methods for Individual Entity Creation
    # =============================================================================
    
    def create_test_user(
        self,
        user_id: Optional[str] = None,
        email: Optional[str] = None,
        organization_id: Optional[str] = None,
        role_in_org: str = "MEMBER",
        skip_org_membership: bool = False,
        **overrides
    ) -> Dict[str, Any]:
        """Create a test user with optional organization membership."""
        
        user_id = user_id or f"user_{uuid.uuid4().hex}"
        email = email or f"testuser_{user_id}@test.com"
        
        # Create user record
        user_data = {
            "user_id": user_id,
            "cognito_id": f"cognito_{user_id}",
            "cognito_sub": f"sub_{user_id}",
            "email": email,
            "email_verified": True,
            "phone_number": f"+1555{user_id[-7:]}",
            "phone_verified": True,
            "first_name": f"Test",
            "last_name": f"User_{user_id[-4:]}",
            "groups": ["USER"],
            "status": UserStatus.ACTIVE,
            "mfa_enabled": False,
            "mfa_setup_complete": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            **overrides
        }
        
        # Track created user
        self.created_resources["users"].append(user_id)
        
        result = {"user_data": user_data}
        
        # Create organization membership if requested
        if organization_id and not skip_org_membership:
            org_membership = self._create_organization_user_record(
                user_id=user_id,
                organization_id=organization_id,
                role=OrganizationUserRole[role_in_org],
                status=OrganizationUserStatus.ACTIVE
            )
            result["organization_membership"] = org_membership
        
        return result
    
    def create_test_application(
        self,
        organization_id: str,
        name: Optional[str] = None,
        **overrides
    ) -> Dict[str, Any]:
        """Create a test application for an organization."""
        
        app_id = f"app_{uuid.uuid4().hex}"
        app_name = name or f"TestApp_{app_id}"
        
        app_data = {
            "application_id": app_id,
            "organization_id": organization_id,
            "name": app_name,
            "description": f"Test application {app_name}",
            "status": "ACTIVE",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            **overrides
        }
        
        # Track created application
        self.created_resources["applications"].append(app_id)
        
        return app_data
    
    # =============================================================================
    # Data Seeding and Management
    # =============================================================================
    
    def seed_comprehensive_test_environment(self) -> Dict[str, Any]:
        """Create a comprehensive test environment with multiple scenarios."""
        
        environment = {
            "session_id": self.test_session_id,
            "created_at": datetime.utcnow().isoformat(),
            "scenarios": {}
        }
        
        # Basic organization scenarios
        environment["scenarios"]["basic"] = {
            "small_org": self.create_test_organization(size="small"),
            "medium_org": self.create_test_organization(size="medium"),
            "large_org": self.create_test_organization(size="large")
        }
        
        # Multi-organization user scenarios
        org_ids = [
            environment["scenarios"]["basic"]["small_org"]["organization"]["organization_id"],
            environment["scenarios"]["basic"]["medium_org"]["organization"]["organization_id"]
        ]
        environment["scenarios"]["multi_org_user"] = self.create_multi_organization_user(
            organization_ids=org_ids,
            roles={org_ids[0]: "ADMIN", org_ids[1]: "MEMBER"}
        )
        
        # Edge case scenarios
        environment["scenarios"]["edge_cases"] = self.create_edge_case_organizations()
        
        # Security test scenarios
        environment["scenarios"]["security_tests"] = self.create_security_test_organizations()
        
        # Organization hierarchy
        environment["scenarios"]["hierarchy"] = self.create_organization_hierarchy(
            levels=2, children_per_level=2
        )
        
        # Role-based scenarios
        environment["scenarios"]["role_based"] = self._create_role_based_scenarios()
        
        return environment
    
    def cleanup_test_environment(self) -> Dict[str, int]:
        """Clean up all created test resources."""
        
        cleanup_count = {
            "organizations": 0,
            "users": 0,
            "organization_users": 0,
            "applications": 0
        }
        
        # In a real implementation, this would connect to DynamoDB and delete records
        # For now, we'll just return the count of resources that would be cleaned up
        for resource_type, resource_ids in self.created_resources.items():
            cleanup_count[resource_type] = len(resource_ids)
            print(f"Would clean up {len(resource_ids)} {resource_type}")
        
        # Reset tracking
        self.created_resources = {key: [] for key in self.created_resources.keys()}
        
        return cleanup_count
    
    def get_test_environment_summary(self) -> Dict[str, Any]:
        """Get summary of current test environment."""
        
        return {
            "session_id": self.test_session_id,
            "resource_counts": {
                resource_type: len(resource_ids)
                for resource_type, resource_ids in self.created_resources.items()
            },
            "total_resources": sum(len(ids) for ids in self.created_resources.values()),
            "environment_info": {
                "test_prefix": self.TEST_PREFIX,
                "organization_sizes": self.ORGANIZATION_SIZES
            }
        }
    
    # =============================================================================
    # Private Helper Methods
    # =============================================================================
    
    def _create_organization_record(
        self,
        organization_id: str,
        name: str,
        owner_id: str,
        status: OrganizationStatus = OrganizationStatus.ACTIVE,
        **overrides
    ) -> Dict[str, Any]:
        """Create organization record with proper structure."""
        
        org_data = {
            "organization_id": organization_id,
            "name": name,
            "description": f"Test organization {name}",
            "owner_id": owner_id,
            "status": status,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "kms_key_id": f"kms_key_{organization_id}",
            "kms_key_arn": f"arn:aws:kms:us-east-1:123456789012:key/kms_key_{organization_id}",
            "kms_alias": f"alias/org-{organization_id}",
            **overrides
        }
        
        return org_data
    
    def _create_organization_user_record(
        self,
        user_id: str,
        organization_id: str,
        role: OrganizationUserRole,
        status: OrganizationUserStatus,
        invited_by: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create organization user membership record."""
        
        membership_data = {
            "user_id": user_id,
            "organization_id": organization_id,
            "role": role,
            "status": status,
            "invited_by": invited_by or "system",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Track created membership
        membership_key = f"{user_id}#{organization_id}"
        self.created_resources["organization_users"].append(membership_key)
        
        return membership_data
    
    def _create_role_based_scenarios(self) -> Dict[str, Any]:
        """Create comprehensive role-based testing scenarios."""
        
        # Create organization for role testing
        org = self.create_test_organization(
            name=f"RoleBased_Org_{self.test_session_id}",
            size="medium"
        )
        org_id = org["organization"]["organization_id"]
        
        scenarios = {
            "organization": org,
            "role_combinations": {}
        }
        
        # Create users with different role combinations
        roles = ["OWNER", "ADMIN", "MEMBER", "GUEST"]
        statuses = ["ACTIVE", "PENDING", "INACTIVE"]
        
        for role in roles:
            for status in statuses:
                scenario_key = f"{role.lower()}_{status.lower()}"
                user = self.create_test_user(
                    email=f"{scenario_key}@test.com",
                    organization_id=org_id,
                    role_in_org=role
                )
                scenarios["role_combinations"][scenario_key] = user
        
        return scenarios
    
    # =============================================================================
    # Validation and Verification Methods
    # =============================================================================
    
    def validate_test_data_integrity(self, test_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate the integrity of created test data."""
        
        validation_results = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "statistics": {}
        }
        
        try:
            # Validate organization data
            if "organization" in test_data:
                org = test_data["organization"]
                if not org.get("organization_id"):
                    validation_results["errors"].append("Missing organization_id")
                if not org.get("name"):
                    validation_results["errors"].append("Missing organization name")
                if not org.get("owner_id"):
                    validation_results["errors"].append("Missing owner_id")
            
            # Validate user data
            if "users" in test_data:
                for i, user in enumerate(test_data["users"]):
                    user_data = user.get("user_data", {})
                    if not user_data.get("user_id"):
                        validation_results["errors"].append(f"User {i}: Missing user_id")
                    if not user_data.get("email"):
                        validation_results["errors"].append(f"User {i}: Missing email")
            
            # Collect statistics
            validation_results["statistics"] = {
                "organization_count": 1 if "organization" in test_data else 0,
                "user_count": len(test_data.get("users", [])),
                "application_count": len(test_data.get("applications", [])),
                "has_owner": bool(test_data.get("owner"))
            }
            
            # Set overall validity
            validation_results["valid"] = len(validation_results["errors"]) == 0
            
        except Exception as e:
            validation_results["valid"] = False
            validation_results["errors"].append(f"Validation exception: {str(e)}")
        
        return validation_results


# =============================================================================
# Utility Functions for Test Environment Management
# =============================================================================

def create_isolated_test_environment(test_name: str) -> OrganizationTestDataFactory:
    """Create an isolated test environment for a specific test."""
    return OrganizationTestDataFactory(test_session_id=f"{test_name}_{uuid.uuid4().hex[:8]}")


def create_standard_test_organizations() -> Dict[str, Any]:
    """Create standard set of test organizations for common testing scenarios."""
    factory = OrganizationTestDataFactory()
    return factory.seed_comprehensive_test_environment()


def cleanup_all_test_data(test_session_id: str) -> None:
    """Clean up all test data for a specific test session."""
    # In a real implementation, this would query DynamoDB for all resources
    # with the test session ID and delete them
    print(f"Would clean up all test data for session: {test_session_id}")


# =============================================================================
# Test Data Export/Import Functions
# =============================================================================

def export_test_environment(environment: Dict[str, Any], file_path: str) -> None:
    """Export test environment to JSON file for reuse."""
    
    # Convert datetime objects to ISO strings for JSON serialization
    def serialize_datetime(obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, dict):
            return {key: serialize_datetime(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [serialize_datetime(item) for item in obj]
        else:
            return obj
    
    serialized_environment = serialize_datetime(environment)
    
    with open(file_path, 'w') as f:
        json.dump(serialized_environment, f, indent=2, default=str)
    
    print(f"Test environment exported to: {file_path}")


def import_test_environment(file_path: str) -> Dict[str, Any]:
    """Import test environment from JSON file."""
    
    with open(file_path, 'r') as f:
        environment = json.load(f)
    
    print(f"Test environment imported from: {file_path}")
    return environment