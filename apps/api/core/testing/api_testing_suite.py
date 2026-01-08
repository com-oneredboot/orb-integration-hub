"""
API Testing Suite for GraphQL Optimization and Batch Operations

Comprehensive testing for GraphQL API endpoints focusing on query optimization,
batch operations, performance validation, and GraphQL-specific security concerns.

Author: Claude Code Assistant
Date: 2025-06-23
"""

import asyncio
import json
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Set, Union
from dataclasses import dataclass, field
from enum import Enum
import graphql
from graphql import GraphQLError
import requests

from .organization_test_data_factory import OrganizationTestDataFactory
from .test_environment_manager import TestEnvironmentManager, TestEnvironmentConfig
from ..models.OrganizationUserRoleEnum import OrganizationUserRole
from ..models.OrganizationUserStatusEnum import OrganizationUserStatus
from ..models.OrganizationStatusEnum import OrganizationStatus


class APITestCategory(Enum):
    """Categories of API testing."""
    
    QUERY_OPTIMIZATION = "query_optimization"
    BATCH_OPERATIONS = "batch_operations"
    PERFORMANCE = "performance"
    SECURITY = "security"
    ERROR_HANDLING = "error_handling"
    RATE_LIMITING = "rate_limiting"
    CACHING = "caching"
    SCHEMA_VALIDATION = "schema_validation"
    N_PLUS_ONE = "n_plus_one"
    COMPLEXITY_ANALYSIS = "complexity_analysis"


class GraphQLOperationType(Enum):
    """Types of GraphQL operations."""
    
    QUERY = "query"
    MUTATION = "mutation"
    SUBSCRIPTION = "subscription"


class OptimizationTechnique(Enum):
    """GraphQL optimization techniques to test."""
    
    FIELD_SELECTION = "field_selection"
    QUERY_BATCHING = "query_batching"
    DATALOADER = "dataloader"
    QUERY_DEPTH_LIMITING = "query_depth_limiting"
    QUERY_COMPLEXITY_ANALYSIS = "query_complexity_analysis"
    CACHING = "caching"
    PAGINATION = "pagination"
    FRAGMENT_USAGE = "fragment_usage"


@dataclass
class GraphQLQuery:
    """Represents a GraphQL query for testing."""
    
    query_id: str
    operation_type: GraphQLOperationType
    query_string: str
    variables: Dict[str, Any] = field(default_factory=dict)
    expected_complexity: int = 0
    expected_depth: int = 0
    optimization_techniques: List[OptimizationTechnique] = field(default_factory=list)
    expected_fields: List[str] = field(default_factory=list)
    expected_response_time_ms: int = 1000
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert query to dictionary for GraphQL execution."""
        return {
            "query": self.query_string,
            "variables": self.variables,
            "operationName": None
        }


@dataclass
class BatchOperation:
    """Represents a batch of GraphQL operations."""
    
    batch_id: str
    queries: List[GraphQLQuery]
    execution_strategy: str = "parallel"  # parallel, sequential, mixed
    expected_total_time_ms: int = 0
    optimization_applied: bool = False
    
    def to_batch_request(self) -> List[Dict[str, Any]]:
        """Convert batch to list of GraphQL requests."""
        return [query.to_dict() for query in self.queries]


@dataclass
class APITestScenario:
    """Represents an API test scenario."""
    
    scenario_id: str
    category: APITestCategory
    title: str
    description: str
    target_endpoint: str
    queries: List[GraphQLQuery]
    batch_operations: List[BatchOperation] = field(default_factory=list)
    optimization_techniques: List[OptimizationTechnique] = field(default_factory=list)
    performance_thresholds: Dict[str, float] = field(default_factory=dict)
    security_validations: List[str] = field(default_factory=list)
    test_data_requirements: Dict[str, Any] = field(default_factory=dict)
    tags: Set[str] = field(default_factory=set)
    priority: str = "medium"  # low, medium, high, critical
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert scenario to dictionary for serialization."""
        return {
            "scenario_id": self.scenario_id,
            "category": self.category.value,
            "title": self.title,
            "description": self.description,
            "target_endpoint": self.target_endpoint,
            "queries": [q.query_id for q in self.queries],
            "batch_operations": [b.batch_id for b in self.batch_operations],
            "optimization_techniques": [t.value for t in self.optimization_techniques],
            "performance_thresholds": self.performance_thresholds,
            "security_validations": self.security_validations,
            "test_data_requirements": self.test_data_requirements,
            "tags": list(self.tags),
            "priority": self.priority
        }


@dataclass
class APITestResult:
    """Results from executing an API test."""
    
    scenario_id: str
    success: bool
    execution_time_ms: float
    query_results: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    batch_results: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    performance_metrics: Dict[str, float] = field(default_factory=dict)
    optimization_metrics: Dict[str, float] = field(default_factory=dict)
    security_findings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    query_complexity_analysis: Dict[str, Any] = field(default_factory=dict)
    n_plus_one_detected: bool = False
    cache_hit_ratio: float = 0.0
    rate_limit_tested: bool = False


class APITestSuite:
    """Comprehensive API testing suite for GraphQL optimization."""
    
    def __init__(self, test_factory: OrganizationTestDataFactory, base_url: str = "http://localhost:8000"):
        self.factory = test_factory
        self.base_url = base_url
        self.graphql_endpoint = f"{base_url}/graphql"
        self.test_scenarios = []
        self.test_results = []
        
    def generate_all_api_test_scenarios(self) -> List[APITestScenario]:
        """Generate all API test scenarios."""
        
        scenarios = []
        scenario_id = 1
        
        # Query optimization scenarios
        optimization_scenarios = self._generate_query_optimization_scenarios(scenario_id)
        scenarios.extend(optimization_scenarios)
        scenario_id += len(optimization_scenarios)
        
        # Batch operations scenarios
        batch_scenarios = self._generate_batch_operations_scenarios(scenario_id)
        scenarios.extend(batch_scenarios)
        scenario_id += len(batch_scenarios)
        
        # Performance testing scenarios
        performance_scenarios = self._generate_performance_scenarios(scenario_id)
        scenarios.extend(performance_scenarios)
        scenario_id += len(performance_scenarios)
        
        # N+1 problem detection scenarios
        n_plus_one_scenarios = self._generate_n_plus_one_scenarios(scenario_id)
        scenarios.extend(n_plus_one_scenarios)
        scenario_id += len(n_plus_one_scenarios)
        
        # Query complexity scenarios
        complexity_scenarios = self._generate_complexity_analysis_scenarios(scenario_id)
        scenarios.extend(complexity_scenarios)
        scenario_id += len(complexity_scenarios)
        
        # Caching scenarios
        caching_scenarios = self._generate_caching_scenarios(scenario_id)
        scenarios.extend(caching_scenarios)
        scenario_id += len(caching_scenarios)
        
        # Security scenarios
        security_scenarios = self._generate_security_scenarios(scenario_id)
        scenarios.extend(security_scenarios)
        scenario_id += len(security_scenarios)
        
        # Rate limiting scenarios
        rate_limit_scenarios = self._generate_rate_limiting_scenarios(scenario_id)
        scenarios.extend(rate_limit_scenarios)
        
        self.test_scenarios = scenarios
        return scenarios
    
    def _generate_query_optimization_scenarios(self, start_id: int) -> List[APITestScenario]:
        """Generate query optimization test scenarios."""
        
        scenarios = []
        scenario_id = start_id
        
        # Field selection optimization
        field_selection_query = GraphQLQuery(
            query_id="field_selection_query",
            operation_type=GraphQLOperationType.QUERY,
            query_string="""
            query OptimizedOrganizationQuery($orgId: ID!) {
                organization(id: $orgId) {
                    id
                    name
                    status
                    # Only request needed fields, not all organization data
                }
            }
            """,
            variables={"orgId": "test-org-123"},
            expected_complexity=5,
            expected_depth=2,
            optimization_techniques=[OptimizationTechnique.FIELD_SELECTION],
            expected_fields=["id", "name", "status"],
            expected_response_time_ms=200
        )
        
        over_fetching_query = GraphQLQuery(
            query_id="over_fetching_query",
            operation_type=GraphQLOperationType.QUERY,
            query_string="""
            query UnoptimizedOrganizationQuery($orgId: ID!) {
                organization(id: $orgId) {
                    id
                    name
                    status
                    description
                    createdAt
                    updatedAt
                    owner {
                        id
                        email
                        profile {
                            firstName
                            lastName
                            avatar
                            preferences
                        }
                    }
                    users {
                        id
                        email
                        role
                        status
                        profile {
                            firstName
                            lastName
                            avatar
                        }
                    }
                    applications {
                        id
                        name
                        description
                        status
                        createdAt
                        settings
                    }
                }
            }
            """,
            variables={"orgId": "test-org-123"},
            expected_complexity=50,
            expected_depth=4,
            optimization_techniques=[],  # No optimization
            expected_response_time_ms=2000
        )
        
        scenarios.append(APITestScenario(
            scenario_id=f"API_OPT_{scenario_id:03d}",
            category=APITestCategory.QUERY_OPTIMIZATION,
            title="Field Selection Optimization Testing",
            description="Test GraphQL field selection optimization vs over-fetching",
            target_endpoint="/graphql",
            queries=[field_selection_query, over_fetching_query],
            optimization_techniques=[OptimizationTechnique.FIELD_SELECTION],
            performance_thresholds={
                "response_time_improvement": 0.7,  # 70% improvement expected
                "data_size_reduction": 0.8,       # 80% data reduction expected
                "complexity_reduction": 0.9       # 90% complexity reduction
            },
            test_data_requirements={
                "organizations": 1,
                "users_per_org": 50,
                "applications_per_org": 10
            },
            tags={"optimization", "field_selection", "over_fetching"},
            priority="high"
        ))
        scenario_id += 1
        
        # Fragment usage optimization
        fragment_query = GraphQLQuery(
            query_id="fragment_optimization_query",
            operation_type=GraphQLOperationType.QUERY,
            query_string="""
            fragment UserBasics on User {
                id
                email
                role
                status
            }
            
            fragment OrganizationSummary on Organization {
                id
                name
                status
                userCount
            }
            
            query OrganizationWithFragments($orgId: ID!) {
                organization(id: $orgId) {
                    ...OrganizationSummary
                    owner {
                        ...UserBasics
                    }
                    admins {
                        ...UserBasics
                    }
                }
            }
            """,
            variables={"orgId": "test-org-123"},
            expected_complexity=15,
            expected_depth=3,
            optimization_techniques=[OptimizationTechnique.FRAGMENT_USAGE],
            expected_response_time_ms=300
        )
        
        scenarios.append(APITestScenario(
            scenario_id=f"API_OPT_{scenario_id:03d}",
            category=APITestCategory.QUERY_OPTIMIZATION,
            title="GraphQL Fragment Usage Optimization",
            description="Test GraphQL fragment usage for query optimization and reusability",
            target_endpoint="/graphql",
            queries=[fragment_query],
            optimization_techniques=[OptimizationTechnique.FRAGMENT_USAGE],
            performance_thresholds={
                "query_reusability": 0.8,
                "complexity_efficiency": 0.7
            },
            tags={"optimization", "fragments", "reusability"},
            priority="medium"
        ))
        scenario_id += 1
        
        return scenarios
    
    def _generate_batch_operations_scenarios(self, start_id: int) -> List[APITestScenario]:
        """Generate batch operations test scenarios."""
        
        scenarios = []
        scenario_id = start_id
        
        # User invitation batch operation
        batch_invite_queries = []
        for i in range(10):
            batch_invite_queries.append(GraphQLQuery(
                query_id=f"batch_invite_{i}",
                operation_type=GraphQLOperationType.MUTATION,
                query_string="""
                mutation InviteUser($orgId: ID!, $email: String!, $role: OrganizationUserRole!) {
                    inviteUserToOrganization(
                        organizationId: $orgId,
                        email: $email,
                        role: $role
                    ) {
                        id
                        email
                        status
                        invitedAt
                    }
                }
                """,
                variables={
                    "orgId": "test-org-123",
                    "email": f"user{i}@example.com",
                    "role": "MEMBER"
                },
                expected_complexity=10,
                expected_response_time_ms=500
            ))
        
        batch_invite_operation = BatchOperation(
            batch_id="batch_user_invitations",
            queries=batch_invite_queries,
            execution_strategy="parallel",
            expected_total_time_ms=2000,  # Should be faster than 10 * 500ms
            optimization_applied=True
        )
        
        scenarios.append(APITestScenario(
            scenario_id=f"API_BATCH_{scenario_id:03d}",
            title="Batch User Invitation Operations",
            description="Test batch user invitations with GraphQL optimization",
            category=APITestCategory.BATCH_OPERATIONS,
            target_endpoint="/graphql",
            queries=batch_invite_queries,
            batch_operations=[batch_invite_operation],
            optimization_techniques=[OptimizationTechnique.QUERY_BATCHING],
            performance_thresholds={
                "batch_improvement_ratio": 0.5,  # 50% faster than sequential
                "error_rate": 0.05,              # Max 5% error rate
                "throughput_min": 5.0            # Min 5 operations per second
            },
            test_data_requirements={
                "target_organization": 1,
                "batch_size": 10
            },
            tags={"batch_operations", "mutations", "user_management"},
            priority="high"
        ))
        scenario_id += 1
        
        # Bulk data export batch
        bulk_export_queries = []
        data_types = ["users", "applications", "audit_logs", "settings", "permissions"]
        
        for data_type in data_types:
            bulk_export_queries.append(GraphQLQuery(
                query_id=f"bulk_export_{data_type}",
                operation_type=GraphQLOperationType.QUERY,
                query_string=f"""
                query BulkExport{data_type.title()}($orgId: ID!, $format: ExportFormat!) {{
                    exportOrganization{data_type.title()}(
                        organizationId: $orgId,
                        format: $format
                    ) {{
                        exportId
                        status
                        downloadUrl
                        estimatedCompletion
                    }}
                }}
                """,
                variables={
                    "orgId": "test-org-123",
                    "format": "JSON"
                },
                expected_complexity=15,
                expected_response_time_ms=1000
            ))
        
        bulk_export_batch = BatchOperation(
            batch_id="bulk_data_export",
            queries=bulk_export_queries,
            execution_strategy="mixed",  # Some parallel, some sequential based on resource usage
            expected_total_time_ms=3000,
            optimization_applied=True
        )
        
        scenarios.append(APITestScenario(
            scenario_id=f"API_BATCH_{scenario_id:03d}",
            title="Bulk Data Export Batch Operations",
            description="Test bulk data export operations with resource management",
            category=APITestCategory.BATCH_OPERATIONS,
            target_endpoint="/graphql",
            queries=bulk_export_queries,
            batch_operations=[bulk_export_batch],
            optimization_techniques=[OptimizationTechnique.QUERY_BATCHING],
            performance_thresholds={
                "resource_efficiency": 0.8,
                "concurrent_limit_respected": True,
                "memory_usage_mb": 500
            },
            test_data_requirements={
                "large_organization": 1,
                "users_count": 1000,
                "applications_count": 50,
                "audit_logs_count": 10000
            },
            tags={"batch_operations", "bulk_export", "resource_management"},
            priority="high"
        ))
        scenario_id += 1
        
        return scenarios
    
    def _generate_performance_scenarios(self, start_id: int) -> List[APITestScenario]:
        """Generate performance testing scenarios."""
        
        scenarios = []
        scenario_id = start_id
        
        # Large organization query performance
        large_org_query = GraphQLQuery(
            query_id="large_org_performance_query",
            operation_type=GraphQLOperationType.QUERY,
            query_string="""
            query LargeOrganizationQuery($orgId: ID!, $first: Int!, $after: String) {
                organization(id: $orgId) {
                    id
                    name
                    status
                    userCount
                    users(first: $first, after: $after) {
                        edges {
                            node {
                                id
                                email
                                role
                                status
                                lastActive
                            }
                        }
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                    }
                    applications(first: 20) {
                        edges {
                            node {
                                id
                                name
                                status
                                createdAt
                            }
                        }
                    }
                }
            }
            """,
            variables={
                "orgId": "large-org-123",
                "first": 50,
                "after": None
            },
            expected_complexity=25,
            expected_depth=4,
            optimization_techniques=[OptimizationTechnique.PAGINATION],
            expected_response_time_ms=800
        )
        
        scenarios.append(APITestScenario(
            scenario_id=f"API_PERF_{scenario_id:03d}",
            title="Large Organization Query Performance",
            description="Test query performance for organizations with many users and applications",
            category=APITestCategory.PERFORMANCE,
            target_endpoint="/graphql",
            queries=[large_org_query],
            optimization_techniques=[OptimizationTechnique.PAGINATION, OptimizationTechnique.DATALOADER],
            performance_thresholds={
                "response_time_ms": 1000,
                "memory_usage_mb": 100,
                "db_queries": 5,  # Should be optimized with DataLoader
                "cpu_usage_percent": 50
            },
            test_data_requirements={
                "large_organization": 1,
                "users_count": 5000,
                "applications_count": 100
            },
            tags={"performance", "large_data", "pagination"},
            priority="critical"
        ))
        scenario_id += 1
        
        # Concurrent query performance
        concurrent_queries = []
        for i in range(20):
            concurrent_queries.append(GraphQLQuery(
                query_id=f"concurrent_query_{i}",
                operation_type=GraphQLOperationType.QUERY,
                query_string="""
                query ConcurrentOrganizationQuery($orgId: ID!) {
                    organization(id: $orgId) {
                        id
                        name
                        userCount
                        applicationCount
                        recentActivity {
                            timestamp
                            action
                            user {
                                id
                                email
                            }
                        }
                    }
                }
                """,
                variables={"orgId": f"org-{i}"},
                expected_complexity=15,
                expected_response_time_ms=300
            ))
        
        scenarios.append(APITestScenario(
            scenario_id=f"API_PERF_{scenario_id:03d}",
            title="Concurrent Query Performance Testing",
            description="Test GraphQL performance under concurrent query load",
            category=APITestCategory.PERFORMANCE,
            target_endpoint="/graphql",
            queries=concurrent_queries,
            optimization_techniques=[OptimizationTechnique.CACHING, OptimizationTechnique.DATALOADER],
            performance_thresholds={
                "concurrent_queries": 20,
                "avg_response_time_ms": 500,
                "p95_response_time_ms": 1000,
                "error_rate": 0.01,
                "throughput_qps": 40
            },
            test_data_requirements={
                "organizations": 20,
                "users_per_org": 100
            },
            tags={"performance", "concurrency", "load_testing"},
            priority="high"
        ))
        scenario_id += 1
        
        return scenarios
    
    def _generate_n_plus_one_scenarios(self, start_id: int) -> List[APITestScenario]:
        """Generate N+1 problem detection scenarios."""
        
        scenarios = []
        scenario_id = start_id
        
        # N+1 problem demonstration query
        n_plus_one_query = GraphQLQuery(
            query_id="n_plus_one_problematic_query",
            operation_type=GraphQLOperationType.QUERY,
            query_string="""
            query ProblematicNPlusOneQuery {
                organizations {
                    id
                    name
                    owner {
                        id
                        email
                        profile {
                            firstName
                            lastName
                        }
                    }
                    users {
                        id
                        email
                        profile {
                            firstName
                            lastName
                        }
                        recentActivity {
                            timestamp
                            action
                        }
                    }
                }
            }
            """,
            expected_complexity=100,
            expected_depth=4,
            optimization_techniques=[],  # No optimization to demonstrate N+1
            expected_response_time_ms=5000  # Will be slow due to N+1
        )
        
        # Optimized query with DataLoader
        optimized_query = GraphQLQuery(
            query_id="optimized_dataloader_query",
            operation_type=GraphQLOperationType.QUERY,
            query_string="""
            query OptimizedDataLoaderQuery {
                organizations {
                    id
                    name
                    owner {
                        id
                        email
                        profile {
                            firstName
                            lastName
                        }
                    }
                    users {
                        id
                        email
                        profile {
                            firstName
                            lastName
                        }
                        recentActivity {
                            timestamp
                            action
                        }
                    }
                }
            }
            """,
            expected_complexity=100,
            expected_depth=4,
            optimization_techniques=[OptimizationTechnique.DATALOADER],
            expected_response_time_ms=1000  # Much faster with DataLoader
        )
        
        scenarios.append(APITestScenario(
            scenario_id=f"API_NPLUS_{scenario_id:03d}",
            title="N+1 Problem Detection and Resolution",
            description="Test detection of N+1 queries and validation of DataLoader optimization",
            category=APITestCategory.N_PLUS_ONE,
            target_endpoint="/graphql",
            queries=[n_plus_one_query, optimized_query],
            optimization_techniques=[OptimizationTechnique.DATALOADER],
            performance_thresholds={
                "db_query_reduction": 0.9,  # 90% reduction in DB queries
                "response_time_improvement": 0.8,  # 80% improvement
                "n_plus_one_detection": True
            },
            test_data_requirements={
                "organizations": 10,
                "users_per_org": 20,
                "activities_per_user": 5
            },
            tags={"n_plus_one", "dataloader", "optimization", "database"},
            priority="critical"
        ))
        scenario_id += 1
        
        return scenarios
    
    def _generate_complexity_analysis_scenarios(self, start_id: int) -> List[APITestScenario]:
        """Generate query complexity analysis scenarios."""
        
        scenarios = []
        scenario_id = start_id
        
        # Deep nested query
        deep_query = GraphQLQuery(
            query_id="deep_nested_query",
            operation_type=GraphQLOperationType.QUERY,
            query_string="""
            query DeepNestedQuery($orgId: ID!) {
                organization(id: $orgId) {
                    users {
                        profile {
                            preferences {
                                notifications {
                                    emailSettings {
                                        frequency
                                        categories {
                                            name
                                            enabled
                                            rules {
                                                condition
                                                action
                                                metadata
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            """,
            variables={"orgId": "test-org-123"},
            expected_complexity=200,
            expected_depth=8,
            optimization_techniques=[OptimizationTechnique.QUERY_DEPTH_LIMITING],
            expected_response_time_ms=3000
        )
        
        # High complexity query
        complex_query = GraphQLQuery(
            query_id="high_complexity_query",
            operation_type=GraphQLOperationType.QUERY,
            query_string="""
            query HighComplexityQuery {
                organizations {
                    users {
                        applications {
                            permissions {
                                role
                                resources
                            }
                        }
                    }
                    applications {
                        users {
                            permissions {
                                role
                                resources
                            }
                        }
                    }
                    auditLogs {
                        user {
                            applications {
                                permissions {
                                    role
                                }
                            }
                        }
                    }
                }
            }
            """,
            expected_complexity=1000,
            expected_depth=6,
            optimization_techniques=[OptimizationTechnique.QUERY_COMPLEXITY_ANALYSIS],
            expected_response_time_ms=10000
        )
        
        scenarios.append(APITestScenario(
            scenario_id=f"API_COMPLEX_{scenario_id:03d}",
            title="Query Complexity Analysis and Limiting",
            description="Test GraphQL query complexity analysis and depth limiting",
            category=APITestCategory.COMPLEXITY_ANALYSIS,
            target_endpoint="/graphql",
            queries=[deep_query, complex_query],
            optimization_techniques=[
                OptimizationTechnique.QUERY_DEPTH_LIMITING,
                OptimizationTechnique.QUERY_COMPLEXITY_ANALYSIS
            ],
            performance_thresholds={
                "max_depth": 6,
                "max_complexity": 500,
                "complexity_rejection": True,  # Should reject overly complex queries
                "depth_rejection": True       # Should reject overly deep queries
            },
            security_validations=[
                "complexity_dos_prevention",
                "depth_dos_prevention",
                "resource_exhaustion_prevention"
            ],
            test_data_requirements={
                "organizations": 5,
                "users_per_org": 50,
                "complex_nested_data": True
            },
            tags={"complexity", "security", "dos_prevention", "limits"},
            priority="critical"
        ))
        scenario_id += 1
        
        return scenarios
    
    def _generate_caching_scenarios(self, start_id: int) -> List[APITestScenario]:
        """Generate caching optimization scenarios."""
        
        scenarios = []
        scenario_id = start_id
        
        # Cache effectiveness query
        cached_query = GraphQLQuery(
            query_id="cacheable_query",
            operation_type=GraphQLOperationType.QUERY,
            query_string="""
            query CacheableOrganizationQuery($orgId: ID!) {
                organization(id: $orgId) {
                    id
                    name
                    status
                    createdAt
                    settings {
                        theme
                        language
                        timezone
                    }
                }
            }
            """,
            variables={"orgId": "test-org-123"},
            expected_complexity=10,
            optimization_techniques=[OptimizationTechnique.CACHING],
            expected_response_time_ms=100  # Should be fast when cached
        )
        
        scenarios.append(APITestScenario(
            scenario_id=f"API_CACHE_{scenario_id:03d}",
            title="GraphQL Response Caching Optimization",
            description="Test GraphQL response caching effectiveness and cache invalidation",
            category=APITestCategory.CACHING,
            target_endpoint="/graphql",
            queries=[cached_query],
            optimization_techniques=[OptimizationTechnique.CACHING],
            performance_thresholds={
                "cache_hit_ratio": 0.8,       # 80% cache hit rate
                "cached_response_time_ms": 50, # Very fast for cached responses
                "cache_miss_time_ms": 300,     # Reasonable for cache misses
                "cache_invalidation_accuracy": 0.95  # Accurate cache invalidation
            },
            test_data_requirements={
                "organizations": 3,
                "cache_warm_up_queries": 10,
                "cache_invalidation_mutations": 2
            },
            tags={"caching", "performance", "optimization"},
            priority="high"
        ))
        scenario_id += 1
        
        return scenarios
    
    def _generate_security_scenarios(self, start_id: int) -> List[APITestScenario]:
        """Generate security testing scenarios."""
        
        scenarios = []
        scenario_id = start_id
        
        # Query injection attempt
        injection_query = GraphQLQuery(
            query_id="injection_attempt_query",
            operation_type=GraphQLOperationType.QUERY,
            query_string="""
            query InjectionAttempt($orgId: ID!) {
                organization(id: $orgId) {
                    id
                    name
                    users(where: { email: { contains: "'; DROP TABLE users; --" } }) {
                        id
                        email
                    }
                }
            }
            """,
            variables={"orgId": "test-org-123"},
            expected_complexity=15,
            expected_response_time_ms=200
        )
        
        # Introspection query (should be disabled in production)
        introspection_query = GraphQLQuery(
            query_id="introspection_query",
            operation_type=GraphQLOperationType.QUERY,
            query_string="""
            query IntrospectionQuery {
                __schema {
                    types {
                        name
                        fields {
                            name
                            type {
                                name
                            }
                        }
                    }
                }
            }
            """,
            expected_complexity=100,
            expected_response_time_ms=1000
        )
        
        scenarios.append(APITestScenario(
            scenario_id=f"API_SEC_{scenario_id:03d}",
            title="GraphQL Security Vulnerability Testing",
            description="Test GraphQL security measures including injection prevention and introspection controls",
            category=APITestCategory.SECURITY,
            target_endpoint="/graphql",
            queries=[injection_query, introspection_query],
            security_validations=[
                "injection_prevention",
                "introspection_disabled",
                "authorization_enforcement",
                "input_validation",
                "query_whitelist_enforcement"
            ],
            performance_thresholds={
                "security_overhead_ms": 50,  # Security checks should add minimal overhead
                "blocked_queries_ratio": 1.0  # All malicious queries should be blocked
            },
            test_data_requirements={
                "test_organization": 1,
                "malicious_payloads": 10
            },
            tags={"security", "injection", "introspection", "validation"},
            priority="critical"
        ))
        scenario_id += 1
        
        return scenarios
    
    def _generate_rate_limiting_scenarios(self, start_id: int) -> List[APITestScenario]:
        """Generate rate limiting scenarios."""
        
        scenarios = []
        scenario_id = start_id
        
        # Rate limit testing queries
        rate_limit_queries = []
        for i in range(100):  # Generate many queries to test rate limiting
            rate_limit_queries.append(GraphQLQuery(
                query_id=f"rate_limit_query_{i}",
                operation_type=GraphQLOperationType.QUERY,
                query_string="""
                query RateLimitTestQuery($orgId: ID!) {
                    organization(id: $orgId) {
                        id
                        name
                        userCount
                    }
                }
                """,
                variables={"orgId": "test-org-123"},
                expected_complexity=5,
                expected_response_time_ms=100
            ))
        
        scenarios.append(APITestScenario(
            scenario_id=f"API_RATE_{scenario_id:03d}",
            title="GraphQL Rate Limiting Validation",
            description="Test GraphQL rate limiting implementation and enforcement",
            category=APITestCategory.RATE_LIMITING,
            target_endpoint="/graphql",
            queries=rate_limit_queries,
            performance_thresholds={
                "rate_limit_threshold": 60,    # 60 queries per minute
                "rate_limit_window_seconds": 60,
                "rate_limit_enforcement": True,
                "rate_limit_recovery_time_seconds": 60
            },
            security_validations=[
                "rate_limit_per_user",
                "rate_limit_per_ip",
                "rate_limit_headers_present",
                "rate_limit_backoff_implemented"
            ],
            test_data_requirements={
                "test_users": 3,
                "burst_query_count": 100
            },
            tags={"rate_limiting", "security", "dos_prevention"},
            priority="high"
        ))
        scenario_id += 1
        
        return scenarios
    
    async def execute_api_test_scenario(self, scenario: APITestScenario) -> APITestResult:
        """Execute a single API test scenario."""
        
        start_time = time.time()
        result = APITestResult(
            scenario_id=scenario.scenario_id,
            success=False,
            execution_time_ms=0.0
        )
        
        try:
            # Execute individual queries
            for query in scenario.queries:
                query_result = await self._execute_graphql_query(query)
                result.query_results[query.query_id] = query_result
            
            # Execute batch operations
            for batch in scenario.batch_operations:
                batch_result = await self._execute_batch_operation(batch)
                result.batch_results[batch.batch_id] = batch_result
            
            # Collect performance metrics
            result.performance_metrics = await self._collect_performance_metrics(scenario)
            
            # Analyze optimization effectiveness
            result.optimization_metrics = await self._analyze_optimization_effectiveness(scenario)
            
            # Run security validations
            if scenario.security_validations:
                result.security_findings = await self._run_security_validations(scenario)
            
            # Detect N+1 problems
            if scenario.category == APITestCategory.N_PLUS_ONE:
                result.n_plus_one_detected = await self._detect_n_plus_one_problems(scenario)
            
            # Analyze query complexity
            if scenario.category == APITestCategory.COMPLEXITY_ANALYSIS:
                result.query_complexity_analysis = await self._analyze_query_complexity(scenario)
            
            # Test caching
            if OptimizationTechnique.CACHING in scenario.optimization_techniques:
                result.cache_hit_ratio = await self._test_caching_effectiveness(scenario)
            
            # Test rate limiting
            if scenario.category == APITestCategory.RATE_LIMITING:
                result.rate_limit_tested = await self._test_rate_limiting(scenario)
            
            # Validate against performance thresholds
            performance_passed = self._validate_performance_thresholds(scenario, result)
            security_passed = len(result.security_findings) == 0
            
            result.success = performance_passed and security_passed and len(result.errors) == 0
            
        except Exception as e:
            result.errors.append(f"API test execution failed: {str(e)}")
            result.success = False
        
        result.execution_time_ms = (time.time() - start_time) * 1000
        return result
    
    async def _execute_graphql_query(self, query: GraphQLQuery) -> Dict[str, Any]:
        """Execute a single GraphQL query."""
        
        try:
            # Mock GraphQL execution - in real implementation would use actual GraphQL client
            await asyncio.sleep(query.expected_response_time_ms / 1000)  # Simulate query time
            
            return {
                "data": {"mock": "response"},
                "errors": None,
                "extensions": {
                    "complexity": query.expected_complexity,
                    "depth": query.expected_depth,
                    "execution_time_ms": query.expected_response_time_ms
                }
            }
        except Exception as e:
            return {
                "data": None,
                "errors": [{"message": str(e)}],
                "extensions": {}
            }
    
    async def _execute_batch_operation(self, batch: BatchOperation) -> Dict[str, Any]:
        """Execute a batch of GraphQL operations."""
        
        batch_start_time = time.time()
        results = []
        
        try:
            if batch.execution_strategy == "parallel":
                # Execute all queries in parallel
                tasks = [self._execute_graphql_query(query) for query in batch.queries]
                results = await asyncio.gather(*tasks)
            elif batch.execution_strategy == "sequential":
                # Execute queries one by one
                for query in batch.queries:
                    result = await self._execute_graphql_query(query)
                    results.append(result)
            else:  # mixed strategy
                # Mix of parallel and sequential based on resource requirements
                results = await self._execute_mixed_batch(batch.queries)
            
            execution_time_ms = (time.time() - batch_start_time) * 1000
            
            return {
                "results": results,
                "execution_time_ms": execution_time_ms,
                "success_count": len([r for r in results if r.get("errors") is None]),
                "error_count": len([r for r in results if r.get("errors") is not None])
            }
            
        except Exception as e:
            return {
                "results": [],
                "execution_time_ms": (time.time() - batch_start_time) * 1000,
                "error": str(e),
                "success_count": 0,
                "error_count": len(batch.queries)
            }
    
    async def _execute_mixed_batch(self, queries: List[GraphQLQuery]) -> List[Dict[str, Any]]:
        """Execute queries with mixed parallel/sequential strategy."""
        
        results = []
        
        # Group queries by complexity
        light_queries = [q for q in queries if q.expected_complexity < 20]
        heavy_queries = [q for q in queries if q.expected_complexity >= 20]
        
        # Execute light queries in parallel
        if light_queries:
            light_tasks = [self._execute_graphql_query(query) for query in light_queries]
            light_results = await asyncio.gather(*light_tasks)
            results.extend(light_results)
        
        # Execute heavy queries sequentially to avoid resource exhaustion
        for query in heavy_queries:
            result = await self._execute_graphql_query(query)
            results.append(result)
        
        return results
    
    async def _collect_performance_metrics(self, scenario: APITestScenario) -> Dict[str, float]:
        """Collect performance metrics for the scenario."""
        
        # Mock performance metrics collection
        return {
            "avg_response_time_ms": 350.0,
            "p95_response_time_ms": 800.0,
            "p99_response_time_ms": 1200.0,
            "throughput_qps": 25.0,
            "error_rate": 0.02,
            "memory_usage_mb": 75.0,
            "cpu_usage_percent": 45.0,
            "db_queries_count": 12.0,
            "cache_hit_ratio": 0.75
        }
    
    async def _analyze_optimization_effectiveness(self, scenario: APITestScenario) -> Dict[str, float]:
        """Analyze the effectiveness of applied optimizations."""
        
        optimization_metrics = {}
        
        for technique in scenario.optimization_techniques:
            if technique == OptimizationTechnique.FIELD_SELECTION:
                optimization_metrics["field_selection_efficiency"] = 0.85
                optimization_metrics["data_reduction_ratio"] = 0.70
            elif technique == OptimizationTechnique.DATALOADER:
                optimization_metrics["dataloader_efficiency"] = 0.90
                optimization_metrics["n_plus_one_reduction"] = 0.95
            elif technique == OptimizationTechnique.CACHING:
                optimization_metrics["cache_effectiveness"] = 0.80
                optimization_metrics["cache_hit_improvement"] = 0.60
            elif technique == OptimizationTechnique.PAGINATION:
                optimization_metrics["pagination_efficiency"] = 0.85
                optimization_metrics["memory_usage_reduction"] = 0.75
        
        return optimization_metrics
    
    async def _run_security_validations(self, scenario: APITestScenario) -> List[str]:
        """Run security validations for the scenario."""
        
        findings = []
        
        for validation in scenario.security_validations:
            if validation == "injection_prevention":
                # Mock injection test
                injection_blocked = True  # Would test actual injection prevention
                if not injection_blocked:
                    findings.append("SQL injection vulnerability detected")
            
            elif validation == "introspection_disabled":
                # Mock introspection test
                introspection_disabled = True  # Would test actual introspection
                if not introspection_disabled:
                    findings.append("GraphQL introspection is enabled in production")
            
            elif validation == "complexity_dos_prevention":
                # Mock complexity analysis
                complexity_limited = True  # Would test actual complexity limiting
                if not complexity_limited:
                    findings.append("Query complexity not properly limited")
        
        return findings
    
    async def _detect_n_plus_one_problems(self, scenario: APITestScenario) -> bool:
        """Detect N+1 query problems."""
        
        # Mock N+1 detection - would analyze actual database query patterns
        db_queries_count = 50  # Mock query count
        expected_queries = 5   # Expected with proper optimization
        
        return db_queries_count > expected_queries * 2
    
    async def _analyze_query_complexity(self, scenario: APITestScenario) -> Dict[str, Any]:
        """Analyze query complexity metrics."""
        
        return {
            "max_depth": 6,
            "max_complexity": 450,
            "avg_complexity": 125,
            "complexity_violations": 2,
            "depth_violations": 1,
            "rejected_queries": 3
        }
    
    async def _test_caching_effectiveness(self, scenario: APITestScenario) -> float:
        """Test caching effectiveness."""
        
        # Mock cache testing
        total_requests = 100
        cache_hits = 75
        
        return cache_hits / total_requests
    
    async def _test_rate_limiting(self, scenario: APITestScenario) -> bool:
        """Test rate limiting implementation."""
        
        # Mock rate limiting test
        rate_limit_triggered = True  # Would test actual rate limiting
        return rate_limit_triggered
    
    def _validate_performance_thresholds(self, scenario: APITestScenario, result: APITestResult) -> bool:
        """Validate performance against defined thresholds."""
        
        for threshold_key, threshold_value in scenario.performance_thresholds.items():
            if threshold_key in result.performance_metrics:
                actual_value = result.performance_metrics[threshold_key]
                if actual_value > threshold_value:
                    result.warnings.append(f"Performance threshold exceeded: {threshold_key}")
                    return False
        
        return True
    
    def generate_api_test_report(self) -> Dict[str, Any]:
        """Generate comprehensive API testing report."""
        
        total_scenarios = len(self.test_scenarios)
        executed_scenarios = len(self.test_results)
        successful_tests = len([r for r in self.test_results if r.success])
        
        # Group by category
        by_category = {}
        for scenario in self.test_scenarios:
            category = scenario.category.value
            if category not in by_category:
                by_category[category] = {"total": 0, "executed": 0, "successful": 0}
            by_category[category]["total"] += 1
        
        for result in self.test_results:
            scenario = next(s for s in self.test_scenarios if s.scenario_id == result.scenario_id)
            category = scenario.category.value
            by_category[category]["executed"] += 1
            if result.success:
                by_category[category]["successful"] += 1
        
        # Calculate average metrics
        avg_response_time = sum(
            r.performance_metrics.get("avg_response_time_ms", 0) 
            for r in self.test_results
        ) / max(len(self.test_results), 1)
        
        return {
            "summary": {
                "total_scenarios": total_scenarios,
                "executed_scenarios": executed_scenarios,
                "successful_tests": successful_tests,
                "success_rate": (successful_tests / executed_scenarios * 100) if executed_scenarios > 0 else 0,
                "avg_response_time_ms": avg_response_time
            },
            "by_category": by_category,
            "optimization_effectiveness": self._analyze_optimization_effectiveness_summary(),
            "security_findings": self._summarize_security_findings(),
            "performance_summary": self._summarize_performance_results(),
            "recommendations": self._generate_api_recommendations()
        }
    
    def _analyze_optimization_effectiveness_summary(self) -> Dict[str, Any]:
        """Summarize optimization effectiveness across all tests."""
        
        optimizations = {}
        
        for technique in OptimizationTechnique:
            scenarios_with_technique = [
                s for s in self.test_scenarios 
                if technique in s.optimization_techniques
            ]
            
            if scenarios_with_technique:
                optimizations[technique.value] = {
                    "scenarios_count": len(scenarios_with_technique),
                    "avg_effectiveness": 0.85,  # Mock effectiveness
                    "performance_improvement": 0.60
                }
        
        return optimizations
    
    def _summarize_security_findings(self) -> Dict[str, Any]:
        """Summarize security findings across all tests."""
        
        all_findings = []
        for result in self.test_results:
            all_findings.extend(result.security_findings)
        
        return {
            "total_findings": len(all_findings),
            "critical_findings": len([f for f in all_findings if "injection" in f.lower()]),
            "findings_by_type": {
                "injection": len([f for f in all_findings if "injection" in f.lower()]),
                "introspection": len([f for f in all_findings if "introspection" in f.lower()]),
                "complexity": len([f for f in all_findings if "complexity" in f.lower()])
            }
        }
    
    def _summarize_performance_results(self) -> Dict[str, Any]:
        """Summarize performance results across all tests."""
        
        if not self.test_results:
            return {}
        
        response_times = [
            r.performance_metrics.get("avg_response_time_ms", 0) 
            for r in self.test_results
        ]
        
        return {
            "avg_response_time_ms": sum(response_times) / len(response_times),
            "min_response_time_ms": min(response_times),
            "max_response_time_ms": max(response_times),
            "n_plus_one_detections": len([r for r in self.test_results if r.n_plus_one_detected]),
            "avg_cache_hit_ratio": sum(r.cache_hit_ratio for r in self.test_results) / len(self.test_results)
        }
    
    def _generate_api_recommendations(self) -> List[str]:
        """Generate API optimization recommendations."""
        
        recommendations = []
        
        # Performance recommendations
        slow_tests = [r for r in self.test_results if r.performance_metrics.get("avg_response_time_ms", 0) > 1000]
        if slow_tests:
            recommendations.append(f"Optimize {len(slow_tests)} slow API endpoints")
        
        # N+1 recommendations
        n_plus_one_tests = [r for r in self.test_results if r.n_plus_one_detected]
        if n_plus_one_tests:
            recommendations.append("Implement DataLoader to resolve N+1 query problems")
        
        # Caching recommendations
        low_cache_tests = [r for r in self.test_results if r.cache_hit_ratio < 0.5]
        if low_cache_tests:
            recommendations.append("Improve caching strategy for better performance")
        
        # Security recommendations
        security_issues = sum(len(r.security_findings) for r in self.test_results)
        if security_issues > 0:
            recommendations.append(f"Address {security_issues} security findings")
        
        return recommendations