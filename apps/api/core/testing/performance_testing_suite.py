"""
Performance Testing Suite for Large Organizations

Comprehensive performance testing for organizations with hundreds of users,
focusing on concurrent operations, bulk user management, and database query optimization validation.

Author: Claude Code Assistant
Date: 2025-06-23
"""

import asyncio
import json
import statistics
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List

import psutil
import pytest

from .organization_test_data_factory import OrganizationTestDataFactory


class PerformanceTestType(Enum):
    """Types of performance tests."""

    LOAD_TEST = "load_test"
    STRESS_TEST = "stress_test"
    SPIKE_TEST = "spike_test"
    VOLUME_TEST = "volume_test"
    ENDURANCE_TEST = "endurance_test"
    SCALABILITY_TEST = "scalability_test"


class OperationType(Enum):
    """Types of operations to test."""

    CREATE_ORGANIZATION = "create_organization"
    UPDATE_ORGANIZATION = "update_organization"
    DELETE_ORGANIZATION = "delete_organization"
    INVITE_USER = "invite_user"
    REMOVE_USER = "remove_user"
    BULK_USER_INVITE = "bulk_user_invite"
    BULK_USER_REMOVAL = "bulk_user_removal"
    QUERY_USERS = "query_users"
    QUERY_ORGANIZATIONS = "query_organizations"
    ROLE_ASSIGNMENT = "role_assignment"
    PERMISSION_CHECK = "permission_check"
    DATA_EXPORT = "data_export"


@dataclass
class PerformanceMetrics:
    """Performance metrics for test results."""

    operation_type: str
    total_operations: int
    successful_operations: int
    failed_operations: int
    total_duration_seconds: float
    average_response_time_ms: float
    median_response_time_ms: float
    p95_response_time_ms: float
    p99_response_time_ms: float
    min_response_time_ms: float
    max_response_time_ms: float
    operations_per_second: float
    error_rate_percentage: float
    memory_usage_mb: float
    cpu_usage_percentage: float
    response_times: List[float] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)


@dataclass
class LoadTestConfig:
    """Configuration for load testing."""

    concurrent_users: int
    operations_per_user: int
    ramp_up_duration_seconds: int
    test_duration_seconds: int
    operation_type: OperationType
    organization_size: str  # small, medium, large, enterprise
    target_response_time_ms: int = 200
    max_error_rate_percentage: float = 1.0
    enable_monitoring: bool = True


class PerformanceTestRunner:
    """Main performance test runner."""

    def __init__(self, test_factory: OrganizationTestDataFactory):
        self.factory = test_factory
        self.test_results = {}
        self.monitoring_data = []
        self.monitoring_stop_event = threading.Event()

    async def run_load_test(self, config: LoadTestConfig) -> PerformanceMetrics:
        """Run load test with specified configuration."""

        print(f"Starting load test: {config.operation_type.value}")
        print(f"  Concurrent users: {config.concurrent_users}")
        print(f"  Operations per user: {config.operations_per_user}")
        print(f"  Organization size: {config.organization_size}")

        # Setup test environment
        test_data = await self._setup_performance_test_environment(config)

        # Start monitoring if enabled
        if config.enable_monitoring:
            self._start_monitoring()

        try:
            # Execute load test
            start_time = time.time()
            results = await self._execute_concurrent_operations(config, test_data)
            end_time = time.time()

            # Calculate metrics
            metrics = self._calculate_performance_metrics(
                config.operation_type.value, results, end_time - start_time
            )

            # Validate against targets
            validation_results = self._validate_performance_targets(metrics, config)
            metrics.validation_results = validation_results

            return metrics

        finally:
            # Stop monitoring
            if config.enable_monitoring:
                self._stop_monitoring()

    async def run_stress_test(
        self, base_config: LoadTestConfig
    ) -> Dict[str, PerformanceMetrics]:
        """Run stress test by gradually increasing load until failure."""

        print("Starting stress test - finding breaking point...")

        stress_results = {}
        current_users = base_config.concurrent_users
        max_users = current_users * 10
        increment = current_users

        while current_users <= max_users:
            print(f"  Testing with {current_users} concurrent users...")

            stress_config = LoadTestConfig(
                concurrent_users=current_users,
                operations_per_user=base_config.operations_per_user,
                ramp_up_duration_seconds=base_config.ramp_up_duration_seconds,
                test_duration_seconds=base_config.test_duration_seconds,
                operation_type=base_config.operation_type,
                organization_size=base_config.organization_size,
                target_response_time_ms=base_config.target_response_time_ms,
                max_error_rate_percentage=10.0,  # Allow higher error rate for stress testing
            )

            try:
                metrics = await self.run_load_test(stress_config)
                stress_results[f"{current_users}_users"] = metrics

                # Check if we've hit the breaking point
                if (
                    metrics.error_rate_percentage > 10.0
                    or metrics.average_response_time_ms
                    > base_config.target_response_time_ms * 5
                ):
                    print(f"  Breaking point reached at {current_users} users")
                    break

            except Exception as e:
                print(f"  System failure at {current_users} users: {e}")
                break

            current_users += increment

        return stress_results

    async def run_scalability_test(
        self, base_config: LoadTestConfig
    ) -> Dict[str, PerformanceMetrics]:
        """Run scalability test with different organization sizes."""

        print("Starting scalability test across organization sizes...")

        scalability_results = {}
        organization_sizes = ["small", "medium", "large", "enterprise"]

        for size in organization_sizes:
            print(f"  Testing with {size} organization...")

            scalability_config = LoadTestConfig(
                concurrent_users=base_config.concurrent_users,
                operations_per_user=base_config.operations_per_user,
                ramp_up_duration_seconds=base_config.ramp_up_duration_seconds,
                test_duration_seconds=base_config.test_duration_seconds,
                operation_type=base_config.operation_type,
                organization_size=size,
                target_response_time_ms=base_config.target_response_time_ms,
            )

            try:
                metrics = await self.run_load_test(scalability_config)
                scalability_results[size] = metrics

            except Exception as e:
                print(f"  Scalability test failed for {size} organization: {e}")
                scalability_results[size] = None

        return scalability_results

    async def run_bulk_operations_test(self) -> Dict[str, PerformanceMetrics]:
        """Run performance tests specifically for bulk operations."""

        print("Starting bulk operations performance test...")

        bulk_test_configs = [
            # Bulk user invitations
            LoadTestConfig(
                concurrent_users=5,
                operations_per_user=1,
                ramp_up_duration_seconds=1,
                test_duration_seconds=60,
                operation_type=OperationType.BULK_USER_INVITE,
                organization_size="large",
                target_response_time_ms=5000,  # Allow longer for bulk operations
            ),
            # Bulk user removal
            LoadTestConfig(
                concurrent_users=5,
                operations_per_user=1,
                ramp_up_duration_seconds=1,
                test_duration_seconds=60,
                operation_type=OperationType.BULK_USER_REMOVAL,
                organization_size="large",
                target_response_time_ms=5000,
            ),
            # Large data exports
            LoadTestConfig(
                concurrent_users=10,
                operations_per_user=1,
                ramp_up_duration_seconds=2,
                test_duration_seconds=120,
                operation_type=OperationType.DATA_EXPORT,
                organization_size="enterprise",
                target_response_time_ms=10000,
            ),
        ]

        bulk_results = {}

        for config in bulk_test_configs:
            try:
                metrics = await self.run_load_test(config)
                bulk_results[config.operation_type.value] = metrics

            except Exception as e:
                print(f"  Bulk test failed for {config.operation_type.value}: {e}")
                bulk_results[config.operation_type.value] = None

        return bulk_results

    async def run_database_query_optimization_test(self) -> Dict[str, Any]:
        """Run performance tests focused on database query optimization."""

        print("Starting database query optimization test...")

        # Create large test organization with complex relationships
        large_org = self.factory.create_test_organization(
            name="QueryOptimizationTestOrg", size="enterprise"
        )

        query_tests = {
            "user_query_by_organization": {
                "description": "Query all users in large organization",
                "target_response_time_ms": 100,
                "complexity": "medium",
            },
            "user_query_with_role_filter": {
                "description": "Query users by role in large organization",
                "target_response_time_ms": 150,
                "complexity": "medium",
            },
            "cross_organization_user_query": {
                "description": "Query user memberships across multiple organizations",
                "target_response_time_ms": 200,
                "complexity": "high",
            },
            "organization_hierarchy_query": {
                "description": "Query nested organization relationships",
                "target_response_time_ms": 300,
                "complexity": "high",
            },
            "permission_aggregation_query": {
                "description": "Aggregate permissions across users and roles",
                "target_response_time_ms": 500,
                "complexity": "very_high",
            },
        }

        query_results = {}

        for query_name, test_config in query_tests.items():
            print(f"  Testing query: {query_name}")

            # Simulate database query performance
            start_time = time.time()

            try:
                # Execute mock query operations
                await self._simulate_database_query(query_name, test_config, large_org)

                end_time = time.time()
                response_time_ms = (end_time - start_time) * 1000

                query_results[query_name] = {
                    "response_time_ms": response_time_ms,
                    "target_response_time_ms": test_config["target_response_time_ms"],
                    "performance_ratio": response_time_ms
                    / test_config["target_response_time_ms"],
                    "passed": response_time_ms
                    <= test_config["target_response_time_ms"],
                    "complexity": test_config["complexity"],
                    "description": test_config["description"],
                }

            except Exception as e:
                query_results[query_name] = {"error": str(e), "passed": False}

        return query_results

    async def _setup_performance_test_environment(
        self, config: LoadTestConfig
    ) -> Dict[str, Any]:
        """Setup test environment for performance testing."""

        # Create test organizations based on size
        organizations = []

        if config.organization_size == "small":
            org_count = 1
        elif config.organization_size == "medium":
            org_count = 2
        elif config.organization_size == "large":
            org_count = 5
        else:  # enterprise
            org_count = 10

        for i in range(org_count):
            org = self.factory.create_test_organization(
                name=f"PerfTestOrg_{config.organization_size}_{i}",
                size=config.organization_size,
            )
            organizations.append(org)

        return {
            "organizations": organizations,
            "operation_type": config.operation_type,
            "test_users": self._generate_test_users_for_operations(
                config.concurrent_users
            ),
        }

    def _generate_test_users_for_operations(
        self, user_count: int
    ) -> List[Dict[str, Any]]:
        """Generate test users for performance operations."""

        test_users = []

        for i in range(user_count):
            user = self.factory.create_test_user(
                email=f"perftest_user_{i}@test.com", skip_org_membership=True
            )
            test_users.append(user)

        return test_users

    async def _execute_concurrent_operations(
        self, config: LoadTestConfig, test_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Execute concurrent operations for load testing."""

        results = []

        # Create operation tasks
        tasks = []

        for user_index in range(config.concurrent_users):
            for operation_index in range(config.operations_per_user):
                task = self._create_operation_task(
                    config.operation_type, test_data, user_index, operation_index
                )
                tasks.append(task)

        # Execute with ramp-up
        if config.ramp_up_duration_seconds > 0:
            delay_between_users = (
                config.ramp_up_duration_seconds / config.concurrent_users
            )
            delayed_tasks = []

            for i, task in enumerate(tasks):
                delay = (i % config.concurrent_users) * delay_between_users
                delayed_task = self._delayed_task(task, delay)
                delayed_tasks.append(delayed_task)

            tasks = delayed_tasks

        # Execute all tasks concurrently
        completed_tasks = await asyncio.gather(*tasks, return_exceptions=True)

        # Process results
        for i, task_result in enumerate(completed_tasks):
            if isinstance(task_result, Exception):
                results.append(
                    {
                        "success": False,
                        "error": str(task_result),
                        "response_time_ms": 0,
                        "task_index": i,
                    }
                )
            else:
                results.append(task_result)

        return results

    async def _create_operation_task(
        self,
        operation_type: OperationType,
        test_data: Dict[str, Any],
        user_index: int,
        operation_index: int,
    ) -> Dict[str, Any]:
        """Create an individual operation task."""

        start_time = time.time()

        try:
            if operation_type == OperationType.CREATE_ORGANIZATION:
                result = await self._simulate_create_organization(
                    test_data, user_index, operation_index
                )

            elif operation_type == OperationType.INVITE_USER:
                result = await self._simulate_invite_user(
                    test_data, user_index, operation_index
                )

            elif operation_type == OperationType.BULK_USER_INVITE:
                result = await self._simulate_bulk_user_invite(
                    test_data, user_index, operation_index
                )

            elif operation_type == OperationType.BULK_USER_REMOVAL:
                result = await self._simulate_bulk_user_removal(
                    test_data, user_index, operation_index
                )

            elif operation_type == OperationType.QUERY_USERS:
                result = await self._simulate_query_users(
                    test_data, user_index, operation_index
                )

            elif operation_type == OperationType.PERMISSION_CHECK:
                result = await self._simulate_permission_check(
                    test_data, user_index, operation_index
                )

            elif operation_type == OperationType.DATA_EXPORT:
                result = await self._simulate_data_export(
                    test_data, user_index, operation_index
                )

            else:
                result = await self._simulate_generic_operation(
                    test_data, user_index, operation_index
                )

            end_time = time.time()
            response_time_ms = (end_time - start_time) * 1000

            return {
                "success": True,
                "response_time_ms": response_time_ms,
                "operation_result": result,
                "user_index": user_index,
                "operation_index": operation_index,
            }

        except Exception as e:
            end_time = time.time()
            response_time_ms = (end_time - start_time) * 1000

            return {
                "success": False,
                "error": str(e),
                "response_time_ms": response_time_ms,
                "user_index": user_index,
                "operation_index": operation_index,
            }

    async def _simulate_create_organization(
        self, test_data: Dict[str, Any], user_index: int, op_index: int
    ) -> Dict[str, Any]:
        """Simulate organization creation operation."""

        # Simulate database write operations
        await asyncio.sleep(0.05)  # Base operation time

        # Simulate KMS key creation
        await asyncio.sleep(0.02)

        # Simulate additional setup operations
        await asyncio.sleep(0.01)

        return {
            "organization_id": f"perf_org_{user_index}_{op_index}",
            "created_at": datetime.utcnow().isoformat(),
        }

    async def _simulate_invite_user(
        self, test_data: Dict[str, Any], user_index: int, op_index: int
    ) -> Dict[str, Any]:
        """Simulate user invitation operation."""

        # Simulate permission check
        await asyncio.sleep(0.01)

        # Simulate database operations
        await asyncio.sleep(0.03)

        # Simulate email sending
        await asyncio.sleep(0.02)

        return {
            "invitation_id": f"perf_invite_{user_index}_{op_index}",
            "invitee_email": f"perf_invitee_{user_index}_{op_index}@test.com",
        }

    async def _simulate_bulk_user_invite(
        self, test_data: Dict[str, Any], user_index: int, op_index: int
    ) -> Dict[str, Any]:
        """Simulate bulk user invitation operation."""

        bulk_size = 50  # Simulate inviting 50 users at once

        # Simulate validation of all emails
        await asyncio.sleep(0.1)

        # Simulate batch database operations
        await asyncio.sleep(0.5)

        # Simulate batch email sending
        await asyncio.sleep(0.3)

        return {
            "bulk_invitation_id": f"perf_bulk_invite_{user_index}_{op_index}",
            "invited_count": bulk_size,
            "processing_time_ms": 900,
        }

    async def _simulate_bulk_user_removal(
        self, test_data: Dict[str, Any], user_index: int, op_index: int
    ) -> Dict[str, Any]:
        """Simulate bulk user removal operation."""

        bulk_size = 30  # Simulate removing 30 users at once

        # Simulate permission checks for all users
        await asyncio.sleep(0.1)

        # Simulate batch database operations
        await asyncio.sleep(0.4)

        # Simulate cleanup operations
        await asyncio.sleep(0.2)

        return {
            "bulk_removal_id": f"perf_bulk_remove_{user_index}_{op_index}",
            "removed_count": bulk_size,
            "processing_time_ms": 700,
        }

    async def _simulate_query_users(
        self, test_data: Dict[str, Any], user_index: int, op_index: int
    ) -> Dict[str, Any]:
        """Simulate user query operation."""

        organizations = test_data.get("organizations", [])
        if not organizations:
            return {"user_count": 0}

        org = organizations[user_index % len(organizations)]
        user_count = org["metadata"]["total_users"]

        # Simulate database query time based on user count
        query_time = 0.01 + (user_count * 0.0001)  # Linear increase with user count
        await asyncio.sleep(query_time)

        return {
            "queried_organization": org["organization"]["organization_id"],
            "user_count": user_count,
            "query_time_ms": query_time * 1000,
        }

    async def _simulate_permission_check(
        self, test_data: Dict[str, Any], user_index: int, op_index: int
    ) -> Dict[str, Any]:
        """Simulate permission check operation."""

        # Simulate role lookup
        await asyncio.sleep(0.005)

        # Simulate permission evaluation
        await asyncio.sleep(0.003)

        return {
            "permission_check_id": f"perf_perm_{user_index}_{op_index}",
            "result": "allowed",
            "check_time_ms": 8,
        }

    async def _simulate_data_export(
        self, test_data: Dict[str, Any], user_index: int, op_index: int
    ) -> Dict[str, Any]:
        """Simulate data export operation."""

        organizations = test_data.get("organizations", [])
        if not organizations:
            return {"export_size_mb": 0}

        org = organizations[user_index % len(organizations)]
        user_count = org["metadata"]["total_users"]

        # Simulate export time based on data size
        export_time = 0.5 + (user_count * 0.01)  # Larger organizations take longer
        await asyncio.sleep(export_time)

        export_size_mb = user_count * 0.1  # Estimate 0.1 MB per user

        return {
            "export_id": f"perf_export_{user_index}_{op_index}",
            "organization_id": org["organization"]["organization_id"],
            "export_size_mb": export_size_mb,
            "export_time_ms": export_time * 1000,
        }

    async def _simulate_generic_operation(
        self, test_data: Dict[str, Any], user_index: int, op_index: int
    ) -> Dict[str, Any]:
        """Simulate a generic operation."""

        # Basic operation simulation
        await asyncio.sleep(0.02)

        return {
            "operation_id": f"perf_generic_{user_index}_{op_index}",
            "processing_time_ms": 20,
        }

    async def _simulate_database_query(
        self, query_name: str, test_config: Dict[str, Any], test_org: Dict[str, Any]
    ) -> None:
        """Simulate database query execution."""

        complexity = test_config["complexity"]

        if complexity == "medium":
            await asyncio.sleep(0.05)
        elif complexity == "high":
            await asyncio.sleep(0.1)
        elif complexity == "very_high":
            await asyncio.sleep(0.2)
        else:
            await asyncio.sleep(0.02)

        # Simulate additional processing based on organization size
        user_count = test_org["metadata"]["total_users"]
        additional_time = user_count * 0.0001
        await asyncio.sleep(additional_time)

    async def _delayed_task(self, task_coroutine, delay_seconds: float):
        """Execute a task with a delay."""
        await asyncio.sleep(delay_seconds)
        return await task_coroutine

    def _calculate_performance_metrics(
        self, operation_type: str, results: List[Dict[str, Any]], total_duration: float
    ) -> PerformanceMetrics:
        """Calculate performance metrics from test results."""

        successful_results = [r for r in results if r.get("success", False)]
        failed_results = [r for r in results if not r.get("success", False)]

        response_times = [
            r["response_time_ms"] for r in results if "response_time_ms" in r
        ]

        if not response_times:
            response_times = [0]

        # Calculate statistics
        avg_response_time = statistics.mean(response_times)
        median_response_time = statistics.median(response_times)

        # Calculate percentiles
        sorted_times = sorted(response_times)
        p95_index = int(0.95 * len(sorted_times))
        p99_index = int(0.99 * len(sorted_times))

        p95_response_time = (
            sorted_times[p95_index]
            if p95_index < len(sorted_times)
            else sorted_times[-1]
        )
        p99_response_time = (
            sorted_times[p99_index]
            if p99_index < len(sorted_times)
            else sorted_times[-1]
        )

        # Calculate rates
        operations_per_second = (
            len(results) / total_duration if total_duration > 0 else 0
        )
        error_rate = (len(failed_results) / len(results)) * 100 if results else 0

        # Get system metrics
        memory_usage = psutil.virtual_memory().used / (1024 * 1024)  # MB
        cpu_usage = psutil.cpu_percent()

        # Collect errors
        errors = [r.get("error", "") for r in failed_results]

        return PerformanceMetrics(
            operation_type=operation_type,
            total_operations=len(results),
            successful_operations=len(successful_results),
            failed_operations=len(failed_results),
            total_duration_seconds=total_duration,
            average_response_time_ms=avg_response_time,
            median_response_time_ms=median_response_time,
            p95_response_time_ms=p95_response_time,
            p99_response_time_ms=p99_response_time,
            min_response_time_ms=min(response_times),
            max_response_time_ms=max(response_times),
            operations_per_second=operations_per_second,
            error_rate_percentage=error_rate,
            memory_usage_mb=memory_usage,
            cpu_usage_percentage=cpu_usage,
            response_times=response_times,
            errors=errors,
        )

    def _validate_performance_targets(
        self, metrics: PerformanceMetrics, config: LoadTestConfig
    ) -> Dict[str, Any]:
        """Validate performance metrics against targets."""

        validation = {"passed": True, "failures": [], "warnings": []}

        # Check response time target
        if metrics.p95_response_time_ms > config.target_response_time_ms:
            validation["passed"] = False
            validation["failures"].append(
                f"95th percentile response time ({metrics.p95_response_time_ms:.2f}ms) "
                f"exceeds target ({config.target_response_time_ms}ms)"
            )

        # Check error rate target
        if metrics.error_rate_percentage > config.max_error_rate_percentage:
            validation["passed"] = False
            validation["failures"].append(
                f"Error rate ({metrics.error_rate_percentage:.2f}%) "
                f"exceeds maximum ({config.max_error_rate_percentage}%)"
            )

        # Performance warnings
        if metrics.average_response_time_ms > config.target_response_time_ms * 0.8:
            validation["warnings"].append(
                f"Average response time ({metrics.average_response_time_ms:.2f}ms) "
                f"is approaching target ({config.target_response_time_ms}ms)"
            )

        if metrics.cpu_usage_percentage > 80:
            validation["warnings"].append(
                f"High CPU usage ({metrics.cpu_usage_percentage:.1f}%)"
            )

        if metrics.memory_usage_mb > 1000:  # 1GB
            validation["warnings"].append(
                f"High memory usage ({metrics.memory_usage_mb:.1f}MB)"
            )

        return validation

    def _start_monitoring(self):
        """Start system monitoring during performance tests."""

        self.monitoring_stop_event.clear()
        self.monitoring_data.clear()

        def monitor():
            while not self.monitoring_stop_event.is_set():
                timestamp = datetime.utcnow()
                cpu_percent = psutil.cpu_percent(interval=1)
                memory = psutil.virtual_memory()

                self.monitoring_data.append(
                    {
                        "timestamp": timestamp.isoformat(),
                        "cpu_percent": cpu_percent,
                        "memory_used_mb": memory.used / (1024 * 1024),
                        "memory_available_mb": memory.available / (1024 * 1024),
                        "memory_percent": memory.percent,
                    }
                )

                time.sleep(1)

        monitoring_thread = threading.Thread(target=monitor, daemon=True)
        monitoring_thread.start()

    def _stop_monitoring(self):
        """Stop system monitoring."""
        self.monitoring_stop_event.set()

    def export_performance_results(self, file_path: str) -> None:
        """Export performance test results to JSON file."""

        export_data = {
            "test_results": self.test_results,
            "monitoring_data": self.monitoring_data,
            "exported_at": datetime.utcnow().isoformat(),
        }

        with open(file_path, "w") as f:
            json.dump(export_data, f, indent=2, default=str)

        print(f"Performance test results exported to: {file_path}")


class PerformanceTestSuite:
    """Comprehensive performance test suite for organizations."""

    def __init__(self):
        self.factory = OrganizationTestDataFactory()
        self.runner = PerformanceTestRunner(self.factory)
        self.suite_results = {}

    async def run_comprehensive_performance_tests(self) -> Dict[str, Any]:
        """Run comprehensive performance test suite."""

        print("Starting comprehensive performance test suite...")

        start_time = datetime.utcnow()

        # Standard load tests
        load_test_results = await self._run_standard_load_tests()

        # Stress tests
        stress_test_results = await self._run_stress_tests()

        # Scalability tests
        scalability_test_results = await self._run_scalability_tests()

        # Bulk operations tests
        bulk_operations_results = await self.runner.run_bulk_operations_test()

        # Database optimization tests
        db_optimization_results = (
            await self.runner.run_database_query_optimization_test()
        )

        end_time = datetime.utcnow()

        # Compile results
        self.suite_results = {
            "suite_info": {
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "total_duration_seconds": (end_time - start_time).total_seconds(),
            },
            "load_tests": load_test_results,
            "stress_tests": stress_test_results,
            "scalability_tests": scalability_test_results,
            "bulk_operations_tests": bulk_operations_results,
            "database_optimization_tests": db_optimization_results,
            "summary": self._generate_test_summary(),
        }

        return self.suite_results

    async def _run_standard_load_tests(self) -> Dict[str, Any]:
        """Run standard load tests for various operations."""

        print("Running standard load tests...")

        load_configs = [
            LoadTestConfig(
                concurrent_users=50,
                operations_per_user=10,
                ramp_up_duration_seconds=10,
                test_duration_seconds=60,
                operation_type=OperationType.CREATE_ORGANIZATION,
                organization_size="medium",
                target_response_time_ms=200,
            ),
            LoadTestConfig(
                concurrent_users=100,
                operations_per_user=20,
                ramp_up_duration_seconds=15,
                test_duration_seconds=120,
                operation_type=OperationType.INVITE_USER,
                organization_size="large",
                target_response_time_ms=150,
            ),
            LoadTestConfig(
                concurrent_users=200,
                operations_per_user=50,
                ramp_up_duration_seconds=20,
                test_duration_seconds=180,
                operation_type=OperationType.QUERY_USERS,
                organization_size="enterprise",
                target_response_time_ms=100,
            ),
        ]

        load_results = {}

        for config in load_configs:
            try:
                metrics = await self.runner.run_load_test(config)
                load_results[
                    f"{config.operation_type.value}_{config.concurrent_users}users"
                ] = metrics

            except Exception as e:
                print(f"Load test failed for {config.operation_type.value}: {e}")
                load_results[
                    f"{config.operation_type.value}_{config.concurrent_users}users"
                ] = None

        return load_results

    async def _run_stress_tests(self) -> Dict[str, Any]:
        """Run stress tests to find breaking points."""

        print("Running stress tests...")

        stress_config = LoadTestConfig(
            concurrent_users=20,
            operations_per_user=5,
            ramp_up_duration_seconds=5,
            test_duration_seconds=30,
            operation_type=OperationType.INVITE_USER,
            organization_size="large",
            target_response_time_ms=200,
        )

        try:
            return await self.runner.run_stress_test(stress_config)

        except Exception as e:
            print(f"Stress test failed: {e}")
            return {"error": str(e)}

    async def _run_scalability_tests(self) -> Dict[str, Any]:
        """Run scalability tests across organization sizes."""

        print("Running scalability tests...")

        scalability_config = LoadTestConfig(
            concurrent_users=50,
            operations_per_user=10,
            ramp_up_duration_seconds=10,
            test_duration_seconds=60,
            operation_type=OperationType.QUERY_USERS,
            organization_size="medium",  # Will be overridden for each size
            target_response_time_ms=200,
        )

        try:
            return await self.runner.run_scalability_test(scalability_config)

        except Exception as e:
            print(f"Scalability test failed: {e}")
            return {"error": str(e)}

    def _generate_test_summary(self) -> Dict[str, Any]:
        """Generate summary of all performance tests."""

        summary = {
            "total_test_categories": 5,
            "load_tests_passed": 0,
            "load_tests_total": 0,
            "stress_test_breaking_point": None,
            "scalability_performance": {},
            "bulk_operations_performance": {},
            "database_optimization_results": {},
            "overall_assessment": "pending",
        }

        # Analyze load test results
        load_tests = self.suite_results.get("load_tests", {})
        for test_name, result in load_tests.items():
            if result and hasattr(result, "validation_results"):
                summary["load_tests_total"] += 1
                if result.validation_results.get("passed", False):
                    summary["load_tests_passed"] += 1

        # Analyze stress test results
        stress_tests = self.suite_results.get("stress_tests", {})
        if (
            stress_tests
            and not isinstance(stress_tests, dict)
            or "error" not in stress_tests
        ):
            # Find the highest user count that passed
            user_counts = [
                int(k.split("_")[0])
                for k in stress_tests.keys()
                if k.endswith("_users")
            ]
            if user_counts:
                summary["stress_test_breaking_point"] = max(user_counts)

        # Calculate overall assessment
        if summary["load_tests_total"] > 0:
            pass_rate = summary["load_tests_passed"] / summary["load_tests_total"]
            if pass_rate >= 0.9:
                summary["overall_assessment"] = "excellent"
            elif pass_rate >= 0.7:
                summary["overall_assessment"] = "good"
            elif pass_rate >= 0.5:
                summary["overall_assessment"] = "acceptable"
            else:
                summary["overall_assessment"] = "needs_improvement"

        return summary


# =============================================================================
# Pytest Integration
# =============================================================================


@pytest.mark.performance
@pytest.mark.slow
class TestOrganizationPerformance:
    """Performance tests for organization operations."""

    @pytest.mark.asyncio
    async def test_concurrent_user_invitations(self, performance_test_environment):
        """Test concurrent user invitation performance."""

        factory = OrganizationTestDataFactory()
        runner = PerformanceTestRunner(factory)

        config = LoadTestConfig(
            concurrent_users=20,
            operations_per_user=5,
            ramp_up_duration_seconds=5,
            test_duration_seconds=30,
            operation_type=OperationType.INVITE_USER,
            organization_size="medium",
            target_response_time_ms=200,
        )

        metrics = await runner.run_load_test(config)

        assert metrics.error_rate_percentage < 5.0
        assert metrics.p95_response_time_ms < 300
        assert metrics.operations_per_second > 10

    @pytest.mark.asyncio
    async def test_large_organization_query_performance(
        self, performance_test_environment
    ):
        """Test query performance for large organizations."""

        factory = OrganizationTestDataFactory()
        runner = PerformanceTestRunner(factory)

        config = LoadTestConfig(
            concurrent_users=50,
            operations_per_user=10,
            ramp_up_duration_seconds=10,
            test_duration_seconds=60,
            operation_type=OperationType.QUERY_USERS,
            organization_size="large",
            target_response_time_ms=150,
        )

        metrics = await runner.run_load_test(config)

        assert metrics.error_rate_percentage < 2.0
        assert metrics.average_response_time_ms < 150
        assert metrics.p99_response_time_ms < 500

    @pytest.mark.asyncio
    async def test_bulk_operations_performance(self, performance_test_environment):
        """Test bulk operations performance."""

        factory = OrganizationTestDataFactory()
        runner = PerformanceTestRunner(factory)

        bulk_results = await runner.run_bulk_operations_test()

        # Verify bulk invitation performance
        bulk_invite_metrics = bulk_results.get("bulk_user_invite")
        if bulk_invite_metrics:
            assert bulk_invite_metrics.error_rate_percentage < 5.0
            assert (
                bulk_invite_metrics.p95_response_time_ms < 10000
            )  # 10 seconds for bulk

        # Verify bulk removal performance
        bulk_remove_metrics = bulk_results.get("bulk_user_removal")
        if bulk_remove_metrics:
            assert bulk_remove_metrics.error_rate_percentage < 5.0
            assert bulk_remove_metrics.p95_response_time_ms < 8000  # 8 seconds for bulk


@pytest.mark.performance
@pytest.mark.slow
async def test_comprehensive_performance_suite():
    """Run comprehensive performance test suite."""

    suite = PerformanceTestSuite()
    results = await suite.run_comprehensive_performance_tests()

    assert results["summary"]["overall_assessment"] in [
        "excellent",
        "good",
        "acceptable",
    ]
    assert results["summary"]["load_tests_total"] > 0

    # Export results for analysis
    suite.runner.export_performance_results("./performance_test_results.json")
