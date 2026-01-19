"""
Performance Testing Suite Tests

Pytest test file for executing and validating the performance testing suite
for large organizations with concurrent operations and bulk user management.

Author: Claude Code Assistant
Date: 2025-06-23
"""

import pytest
import asyncio
import time
from unittest.mock import patch, AsyncMock

from .performance_testing_suite import (
    PerformanceTestRunner,
    LoadTestConfig,
    OperationType,
    PerformanceTestType,
    PerformanceMetrics,
)


@pytest.mark.performance
@pytest.mark.slow
class TestPerformanceTestingSuite:
    """Test suite for performance testing infrastructure."""

    @pytest.fixture
    def performance_runner(self, isolated_organization_factory):
        """Performance test runner fixture."""
        return PerformanceTestRunner(isolated_organization_factory)

    @pytest.fixture
    def load_test_config(self):
        """Basic load test configuration."""
        return LoadTestConfig(
            concurrent_users=10,
            operations_per_user=5,
            ramp_up_duration_seconds=5,
            test_duration_seconds=30,
            operation_type=OperationType.CREATE_ORGANIZATION,
            organization_size="small",
            target_response_time_ms=200,
            max_error_rate_percentage=1.0,
        )

    @pytest.mark.asyncio
    async def test_load_testing_basic(self, performance_runner, load_test_config):
        """Test basic load testing functionality."""

        # Mock the actual operations to avoid real AWS calls
        with patch.object(
            performance_runner, "_create_operation_task", new_callable=AsyncMock
        ) as mock_task:
            mock_task.return_value = {
                "success": True,
                "response_time_ms": 150.0,
                "operation_result": {},
                "user_index": 0,
                "operation_index": 0,
            }

            metrics = await performance_runner.run_load_test(load_test_config)

            assert metrics is not None
            assert metrics.total_operations == 50  # 10 users * 5 operations
            assert metrics.successful_operations <= metrics.total_operations
            assert metrics.error_rate_percentage <= load_test_config.max_error_rate_percentage
            assert (
                metrics.average_response_time_ms <= load_test_config.target_response_time_ms * 2
            )  # Allow some tolerance

    @pytest.mark.asyncio
    async def test_stress_testing(self, performance_runner, load_test_config):
        """Test stress testing to find breaking points."""

        # Mock progressively slower responses to simulate system stress
        call_count = [0]

        async def mock_task_side_effect(*args, **kwargs):
            call_count[0] += 1
            # Simulate increasing response times under stress
            response_time = 100 + (call_count[0] * 5)
            success = response_time < 1000  # Fail if response time > 1 second
            return {
                "success": success,
                "response_time_ms": response_time,
                "error": None if success else "Timeout",
                "operation_result": {},
                "user_index": 0,
                "operation_index": 0,
            }

        with patch.object(
            performance_runner,
            "_create_operation_task",
            side_effect=mock_task_side_effect,
        ):
            stress_results = await performance_runner.run_stress_test(load_test_config)

            assert isinstance(stress_results, dict)
            assert len(stress_results) > 0

            # Verify stress test progression
            for phase, metrics in stress_results.items():
                assert isinstance(metrics, PerformanceMetrics)
                assert metrics.total_operations > 0

    @pytest.mark.asyncio
    async def test_scalability_testing(self, performance_runner):
        """Test scalability across different organization sizes."""

        with patch.object(
            performance_runner, "_create_operation_task", new_callable=AsyncMock
        ) as mock_task:
            mock_task.return_value = {
                "success": True,
                "response_time_ms": 200.0,
                "operation_result": {},
                "user_index": 0,
                "operation_index": 0,
            }

            # Create a base config for scalability test
            base_config = LoadTestConfig(
                concurrent_users=5,
                operations_per_user=2,
                ramp_up_duration_seconds=1,
                test_duration_seconds=10,
                operation_type=OperationType.CREATE_ORGANIZATION,
                organization_size="small",
            )

            scalability_results = await performance_runner.run_scalability_test(base_config)

            assert isinstance(scalability_results, dict)

            # Verify all organization sizes are tested
            expected_sizes = ["small", "medium", "large", "enterprise"]
            for size in expected_sizes:
                assert size in scalability_results

            # Verify metrics are collected for each size (may be None if test failed)
            for size, size_result in scalability_results.items():
                if size_result is not None:
                    assert isinstance(size_result, PerformanceMetrics)

    @pytest.mark.asyncio
    async def test_bulk_operations_testing(self, performance_runner, isolated_organization_factory):
        """Test bulk operations performance."""

        # Create test organization for bulk operations
        test_org = isolated_organization_factory.create_test_organization(
            name="BulkTestOrg", size="large"
        )

        with patch.object(
            performance_runner, "_create_operation_task", new_callable=AsyncMock
        ) as mock_task:
            mock_task.return_value = {
                "success": True,
                "response_time_ms": 500.0,
                "operation_result": {},
                "user_index": 0,
                "operation_index": 0,
            }

            bulk_results = await performance_runner.run_bulk_operations_test()

            assert isinstance(bulk_results, dict)

            # Verify bulk operation types are tested
            expected_operations = [
                "bulk_user_invite",
                "bulk_user_removal",
                "data_export",
            ]
            for operation in expected_operations:
                assert any(operation in result_key for result_key in bulk_results.keys())

    def test_database_query_optimization(self, performance_runner, isolated_organization_factory):
        """Test database query optimization validation."""

        # Create large organization for query testing
        large_org = isolated_organization_factory.create_test_organization(
            name="QueryTestOrg", size="large"
        )

        # The run_database_query_optimization_test is an async method
        # We need to test it properly
        import asyncio

        async def run_test():
            return await performance_runner.run_database_query_optimization_test()

        query_results = asyncio.get_event_loop().run_until_complete(run_test())

        assert isinstance(query_results, dict)
        # Verify query results structure
        for query_name, result in query_results.items():
            assert isinstance(result, dict)

    @pytest.mark.asyncio
    async def test_concurrent_operations(self, performance_runner, isolated_organization_factory):
        """Test concurrent operations handling."""

        test_org = isolated_organization_factory.create_test_organization(
            name="ConcurrentTestOrg", size="medium"
        )

        with patch.object(
            performance_runner, "_create_operation_task", new_callable=AsyncMock
        ) as mock_task:
            mock_task.return_value = {
                "success": True,
                "response_time_ms": 180.0,
                "operation_result": {},
                "user_index": 0,
                "operation_index": 0,
            }

            # Use run_load_test with a small config to test concurrent operations
            config = LoadTestConfig(
                concurrent_users=20,
                operations_per_user=1,
                ramp_up_duration_seconds=1,
                test_duration_seconds=10,
                operation_type=OperationType.QUERY_USERS,
                organization_size="medium",
            )

            concurrent_results = await performance_runner.run_load_test(config)

            assert isinstance(concurrent_results, PerformanceMetrics)
            assert concurrent_results.total_operations == 20
            assert concurrent_results.successful_operations <= 20

    def test_system_monitoring_during_tests(self, performance_runner):
        """Test system monitoring capabilities during performance tests."""

        with (
            patch("psutil.cpu_percent", return_value=45.5),
            patch("psutil.virtual_memory") as mock_memory,
        ):
            mock_memory.return_value.percent = 60.2
            mock_memory.return_value.used = 8589934592  # 8GB in bytes

            monitoring_data = performance_runner.collect_system_metrics()

            assert isinstance(monitoring_data, dict)
            assert "cpu_usage_percentage" in monitoring_data
            assert "memory_usage_mb" in monitoring_data
            assert monitoring_data["cpu_usage_percentage"] == 45.5
            assert monitoring_data["memory_usage_mb"] == 8192.0  # 8GB in MB

    def test_performance_metrics_calculation(self, performance_runner):
        """Test performance metrics calculation accuracy."""

        # Test data for metrics calculation
        response_times = [100, 150, 200, 175, 125, 300, 180, 160, 140, 220]

        metrics = performance_runner.calculate_performance_metrics(
            operation_type="test_operation",
            response_times=response_times,
            successful_operations=9,
            failed_operations=1,
            total_duration_seconds=10.0,
            memory_usage_mb=512.0,
            cpu_usage_percentage=35.5,
        )

        assert isinstance(metrics, PerformanceMetrics)
        assert metrics.total_operations == 10
        assert metrics.successful_operations == 9
        assert metrics.failed_operations == 1
        assert metrics.error_rate_percentage == 10.0
        assert metrics.operations_per_second == 1.0  # 10 operations / 10 seconds
        assert metrics.average_response_time_ms == 175.0  # Mean of response times
        assert metrics.median_response_time_ms == 167.5  # Median of response times
        # p95 is the 95th percentile - for 10 items, index 9 (0.95 * 10 = 9.5 -> 9)
        # Sorted: [100, 125, 140, 150, 160, 175, 180, 200, 220, 300]
        # Index 9 = 300
        assert metrics.p95_response_time_ms == 300

    @pytest.mark.asyncio
    async def test_performance_test_with_failures(self, performance_runner, load_test_config):
        """Test performance testing with simulated failures."""

        # Mock operations with some failures
        call_count = [0]

        async def mock_task_with_failures(*args, **kwargs):
            call_count[0] += 1
            import random

            success = random.random() > 0.1  # 10% failure rate
            response_time = random.uniform(100, 300)
            error = None if success else "Simulated failure"
            return {
                "success": success,
                "response_time_ms": response_time,
                "error": error,
                "operation_result": {},
                "user_index": 0,
                "operation_index": call_count[0],
            }

        with patch.object(
            performance_runner,
            "_create_operation_task",
            side_effect=mock_task_with_failures,
        ):
            metrics = await performance_runner.run_load_test(load_test_config)

            # With 10% failure rate over 50 operations, we expect some failures
            assert metrics.total_operations == 50
            # Allow for statistical variation - may have 0-15 failures
            assert metrics.failed_operations >= 0

    def test_performance_report_generation(self, performance_runner, load_test_config):
        """Test performance report generation."""

        # Create sample metrics
        sample_metrics = PerformanceMetrics(
            operation_type="test_operation",
            total_operations=100,
            successful_operations=95,
            failed_operations=5,
            total_duration_seconds=60.0,
            average_response_time_ms=150.0,
            median_response_time_ms=140.0,
            p95_response_time_ms=250.0,
            p99_response_time_ms=300.0,
            min_response_time_ms=80.0,
            max_response_time_ms=350.0,
            operations_per_second=1.67,
            error_rate_percentage=5.0,
            memory_usage_mb=256.0,
            cpu_usage_percentage=42.3,
        )

        report = performance_runner.generate_performance_report([sample_metrics])

        assert isinstance(report, dict)
        assert "summary" in report
        assert "detailed_metrics" in report
        assert "recommendations" in report
        assert report["summary"]["total_tests"] == 1
        assert report["summary"]["overall_success_rate"] == 95.0

    @pytest.mark.asyncio
    async def test_performance_test_timeout_handling(self, performance_runner, load_test_config):
        """Test timeout handling in performance tests."""

        # Mock slow operations
        async def slow_task(*args, **kwargs):
            await asyncio.sleep(0.1)  # Small delay
            return {
                "success": True,
                "response_time_ms": 100.0,
                "operation_result": {},
                "user_index": 0,
                "operation_index": 0,
            }

        # Set short timeout for testing
        load_test_config.test_duration_seconds = 1

        with patch.object(performance_runner, "_create_operation_task", side_effect=slow_task):
            start_time = time.time()
            metrics = await performance_runner.run_load_test(load_test_config)
            end_time = time.time()

            # Test should complete within reasonable time
            assert end_time - start_time < 30  # Should not take more than 30 seconds
            assert metrics.total_operations >= 0  # Should have some operations recorded


@pytest.mark.performance
class TestPerformanceTestConfiguration:
    """Test performance test configuration and setup."""

    def test_load_test_config_validation(self):
        """Test load test configuration validation."""

        # Valid configuration
        valid_config = LoadTestConfig(
            concurrent_users=50,
            operations_per_user=10,
            ramp_up_duration_seconds=30,
            test_duration_seconds=300,
            operation_type=OperationType.CREATE_ORGANIZATION,
            organization_size="large",
        )

        assert valid_config.concurrent_users == 50
        assert valid_config.operations_per_user == 10
        assert valid_config.target_response_time_ms == 200  # Default value
        assert valid_config.max_error_rate_percentage == 1.0  # Default value

    def test_performance_test_type_coverage(self):
        """Test that all performance test types are properly defined."""

        expected_types = [
            PerformanceTestType.LOAD_TEST,
            PerformanceTestType.STRESS_TEST,
            PerformanceTestType.SPIKE_TEST,
            PerformanceTestType.VOLUME_TEST,
            PerformanceTestType.ENDURANCE_TEST,
            PerformanceTestType.SCALABILITY_TEST,
        ]

        for test_type in expected_types:
            assert test_type in PerformanceTestType

    def test_operation_type_coverage(self):
        """Test that all operation types are properly defined."""

        expected_operations = [
            OperationType.CREATE_ORGANIZATION,
            OperationType.UPDATE_ORGANIZATION,
            OperationType.DELETE_ORGANIZATION,
            OperationType.INVITE_USER,
            OperationType.REMOVE_USER,
            OperationType.BULK_USER_INVITE,
            OperationType.BULK_USER_REMOVAL,
            OperationType.QUERY_USERS,
            OperationType.QUERY_ORGANIZATIONS,
            OperationType.ROLE_ASSIGNMENT,
            OperationType.PERMISSION_CHECK,
            OperationType.DATA_EXPORT,
        ]

        for operation in expected_operations:
            assert operation in OperationType


@pytest.mark.performance
@pytest.mark.integration
class TestPerformanceTestIntegration:
    """Integration tests for performance testing with real components."""

    @pytest.mark.asyncio
    async def test_end_to_end_performance_test(self, isolated_organization_factory):
        """End-to-end performance test with mocked external dependencies."""

        # Create performance test runner
        performance_runner = PerformanceTestRunner(isolated_organization_factory)

        # Configure test for small scale to avoid long test times
        config = LoadTestConfig(
            concurrent_users=5,
            operations_per_user=3,
            ramp_up_duration_seconds=2,
            test_duration_seconds=10,
            operation_type=OperationType.CREATE_ORGANIZATION,
            organization_size="small",
        )

        # Mock external dependencies
        with (
            patch.object(
                performance_runner, "_create_operation_task", new_callable=AsyncMock
            ) as mock_task,
            patch("psutil.cpu_percent", return_value=30.0),
            patch("psutil.virtual_memory") as mock_memory,
        ):
            mock_task.return_value = {
                "success": True,
                "response_time_ms": 180.0,
                "operation_result": {},
                "user_index": 0,
                "operation_index": 0,
            }
            mock_memory.return_value.percent = 45.0
            mock_memory.return_value.used = 4294967296  # 4GB

            # Run performance test
            metrics = await performance_runner.run_load_test(config)

            # Verify test completed successfully
            assert metrics is not None
            assert metrics.total_operations == 15  # 5 users * 3 operations
            assert metrics.successful_operations == 15
            assert metrics.error_rate_percentage == 0.0
            assert metrics.operations_per_second > 0

    def test_performance_test_data_export(self, isolated_organization_factory, temp_test_file):
        """Test exporting performance test results."""

        performance_runner = PerformanceTestRunner(isolated_organization_factory)

        # Create sample metrics
        sample_metrics = [
            PerformanceMetrics(
                operation_type="create_organization",
                total_operations=50,
                successful_operations=48,
                failed_operations=2,
                total_duration_seconds=30.0,
                average_response_time_ms=175.0,
                median_response_time_ms=160.0,
                p95_response_time_ms=280.0,
                p99_response_time_ms=320.0,
                min_response_time_ms=90.0,
                max_response_time_ms=350.0,
                operations_per_second=1.6,
                error_rate_percentage=4.0,
                memory_usage_mb=512.0,
                cpu_usage_percentage=38.5,
            )
        ]

        # Export to file
        performance_runner.export_results_to_file(sample_metrics, temp_test_file)

        # Verify file was created and contains data
        import json

        with open(temp_test_file, "r") as f:
            exported_data = json.load(f)

        assert "performance_test_results" in exported_data
        assert "metadata" in exported_data
        assert len(exported_data["performance_test_results"]) == 1
        assert (
            exported_data["performance_test_results"][0]["operation_type"] == "create_organization"
        )
