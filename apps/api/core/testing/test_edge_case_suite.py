"""
Edge Case Testing Suite Tests

Pytest test file for executing and validating the edge case testing suite
for critical scenarios including owner succession and data integrity.

Author: Claude Code Assistant
Date: 2025-06-23
"""

import pytest
from unittest.mock import patch, AsyncMock

from .edge_case_testing_suite import (
    EdgeCaseTestSuite,
    EdgeCaseScenario,
    EdgeCaseCategory,
    EdgeCaseSeverity,
    EdgeCaseTestResult,
    DataIntegrityValidator,
)


@pytest.mark.edge_case
@pytest.mark.slow
class TestEdgeCaseTestingSuite:
    """Test suite for edge case testing infrastructure."""

    @pytest.fixture
    def edge_case_suite(self, isolated_organization_factory):
        """Edge case test suite fixture."""
        return EdgeCaseTestSuite(isolated_organization_factory)

    @pytest.fixture
    def sample_edge_case_scenario(self):
        """Sample edge case scenario for testing."""
        return EdgeCaseScenario(
            scenario_id="EDGE_TEST_001",
            category=EdgeCaseCategory.OWNER_SUCCESSION,
            severity=EdgeCaseSeverity.CRITICAL,
            title="Test Owner Succession Scenario",
            description="Test scenario for owner succession edge case",
            preconditions=["Organization exists", "Owner is active"],
            test_steps=["Create org", "Test succession", "Verify result"],
            expected_results=["Succession succeeds", "No data loss"],
            cleanup_steps=["Delete test org"],
            tags={"owner_succession", "test"},
            estimated_duration_minutes=5,
        )

    def test_edge_case_scenario_creation(self, sample_edge_case_scenario):
        """Test edge case scenario creation and validation."""

        assert sample_edge_case_scenario.scenario_id == "EDGE_TEST_001"
        assert sample_edge_case_scenario.category == EdgeCaseCategory.OWNER_SUCCESSION
        assert sample_edge_case_scenario.severity == EdgeCaseSeverity.CRITICAL
        assert len(sample_edge_case_scenario.preconditions) == 2
        assert len(sample_edge_case_scenario.test_steps) == 3
        assert len(sample_edge_case_scenario.expected_results) == 2
        assert "owner_succession" in sample_edge_case_scenario.tags

    def test_edge_case_scenario_serialization(self, sample_edge_case_scenario):
        """Test edge case scenario serialization to dictionary."""

        scenario_dict = sample_edge_case_scenario.to_dict()

        assert isinstance(scenario_dict, dict)
        assert scenario_dict["scenario_id"] == "EDGE_TEST_001"
        assert scenario_dict["category"] == "owner_succession"
        assert scenario_dict["severity"] == "critical"
        assert isinstance(scenario_dict["tags"], list)
        assert "owner_succession" in scenario_dict["tags"]

    def test_owner_succession_scenario_generation(self, edge_case_suite):
        """Test generation of owner succession scenarios."""

        scenarios = edge_case_suite._generate_owner_succession_scenarios(1)

        assert len(scenarios) >= 3  # At least 3 owner succession scenarios

        # Check scenario types
        scenario_titles = [s.title for s in scenarios]
        assert any("Owner Deletion Without Succession" in title for title in scenario_titles)
        assert any("Automatic Admin Promotion" in title for title in scenario_titles)
        assert any("Multiple Owners Conflict" in title for title in scenario_titles)

        # Verify all are owner succession category
        for scenario in scenarios:
            assert scenario.category == EdgeCaseCategory.OWNER_SUCCESSION
            assert "owner_succession" in scenario.tags

    def test_organization_deletion_scenario_generation(self, edge_case_suite):
        """Test generation of organization deletion scenarios."""

        scenarios = edge_case_suite._generate_organization_deletion_scenarios(100)

        assert len(scenarios) >= 2  # At least 2 deletion scenarios

        # Check for critical scenarios
        critical_scenarios = [s for s in scenarios if s.severity == EdgeCaseSeverity.CRITICAL]
        assert len(critical_scenarios) >= 1

        # Verify cascade deletion scenario exists
        cascade_scenarios = [s for s in scenarios if "Active Applications" in s.title]
        assert len(cascade_scenarios) >= 1

        # Verify rollback scenario exists
        rollback_scenarios = [s for s in scenarios if "Rollback" in s.title]
        assert len(rollback_scenarios) >= 1

    def test_data_orphaning_scenario_generation(self, edge_case_suite):
        """Test generation of data orphaning scenarios."""

        scenarios = edge_case_suite._generate_data_orphaning_scenarios(200)

        assert len(scenarios) >= 2  # At least 2 orphaning scenarios

        # Check for data ownership scenarios
        ownership_scenarios = [s for s in scenarios if "Owned Data" in s.title]
        assert len(ownership_scenarios) >= 1

        # Verify all have data_orphaning tags
        for scenario in scenarios:
            assert scenario.category == EdgeCaseCategory.DATA_ORPHANING
            assert "data_orphaning" in scenario.tags

    def test_referential_integrity_scenario_generation(self, edge_case_suite):
        """Test generation of referential integrity scenarios."""

        scenarios = edge_case_suite._generate_referential_integrity_scenarios(300)

        assert len(scenarios) >= 2  # At least 2 integrity scenarios

        # Check for cross-table reference scenario
        reference_scenarios = [s for s in scenarios if "Cross-Table Reference" in s.title]
        assert len(reference_scenarios) >= 1

        # Check for circular reference scenario
        circular_scenarios = [s for s in scenarios if "Circular Reference" in s.title]
        assert len(circular_scenarios) >= 1

    def test_concurrent_operations_scenario_generation(self, edge_case_suite):
        """Test generation of concurrent operations scenarios."""

        scenarios = edge_case_suite._generate_concurrent_operations_scenarios(400)

        assert len(scenarios) >= 2  # At least 2 concurrent scenarios

        # Check for concurrent invitation scenario
        invitation_scenarios = [s for s in scenarios if "Concurrent User Invitations" in s.title]
        assert len(invitation_scenarios) >= 1

        # Check for concurrent role change scenario
        role_scenarios = [s for s in scenarios if "Concurrent Role Changes" in s.title]
        assert len(role_scenarios) >= 1

    def test_comprehensive_scenario_generation(self, edge_case_suite):
        """Test generation of all edge case scenarios."""

        all_scenarios = edge_case_suite.generate_all_edge_case_scenarios()

        assert len(all_scenarios) >= 10  # At least 10 total scenarios

        # Verify all categories are represented
        categories = set(s.category for s in all_scenarios)
        expected_categories = {
            EdgeCaseCategory.OWNER_SUCCESSION,
            EdgeCaseCategory.ORGANIZATION_DELETION,
            EdgeCaseCategory.DATA_ORPHANING,
            EdgeCaseCategory.REFERENTIAL_INTEGRITY,
            EdgeCaseCategory.CONCURRENT_OPERATIONS,
            EdgeCaseCategory.STATE_TRANSITIONS,
            EdgeCaseCategory.BOUNDARY_CONDITIONS,
            EdgeCaseCategory.ERROR_RECOVERY,
        }

        assert categories.intersection(expected_categories) == expected_categories

        # Verify severity distribution
        severities = set(s.severity for s in all_scenarios)
        assert EdgeCaseSeverity.CRITICAL in severities
        assert EdgeCaseSeverity.HIGH in severities

    @pytest.mark.asyncio
    async def test_edge_case_execution_owner_succession(
        self, edge_case_suite, sample_edge_case_scenario
    ):
        """Test execution of owner succession edge case."""

        # Mock the owner succession test execution
        with patch.object(
            edge_case_suite, "_attempt_owner_deletion", new_callable=AsyncMock
        ) as mock_deletion:
            mock_deletion.return_value = {"allowed": False, "succession_required": True}

            result = await edge_case_suite.execute_edge_case_scenario(sample_edge_case_scenario)

            assert isinstance(result, EdgeCaseTestResult)
            assert result.scenario_id == sample_edge_case_scenario.scenario_id
            assert result.execution_time_seconds > 0

    @pytest.mark.asyncio
    async def test_edge_case_execution_with_failures(self, edge_case_suite):
        """Test edge case execution with simulated failures."""

        # Create a scenario that will fail - must include "Active Applications" in title
        # to trigger the _perform_cascade_deletion method
        failing_scenario = EdgeCaseScenario(
            scenario_id="EDGE_FAIL_001",
            category=EdgeCaseCategory.ORGANIZATION_DELETION,
            severity=EdgeCaseSeverity.HIGH,
            title="Cascade Deletion with Active Applications - Failing Test",
            description="Scenario designed to fail for testing",
            preconditions=["Test precondition"],
            test_steps=["Fail step"],
            expected_results=["Should fail"],
            cleanup_steps=["Clean up"],
        )

        # Mock methods to simulate failure - need to also mock the helper methods
        with (
            patch.object(
                edge_case_suite, "_perform_cascade_deletion", new_callable=AsyncMock
            ) as mock_deletion,
            patch.object(
                edge_case_suite, "_create_test_applications_with_data", new_callable=AsyncMock
            ) as mock_create_apps,
        ):
            mock_create_apps.return_value = ["app1", "app2"]
            mock_deletion.side_effect = Exception("Simulated failure")

            result = await edge_case_suite.execute_edge_case_scenario(failing_scenario)

            assert not result.success
            assert len(result.errors) > 0
            # The error should contain either "Simulated failure" or "Test execution failed"
            error_text = " ".join(str(e) for e in result.errors)
            assert "Simulated failure" in error_text or "Test execution failed" in error_text

    @pytest.mark.asyncio
    async def test_data_integrity_validation(self, edge_case_suite):
        """Test data integrity validation during edge case testing."""

        validator = DataIntegrityValidator()

        integrity_report = await validator.validate_system_integrity()

        assert isinstance(integrity_report, dict)
        assert "checks" in integrity_report
        assert "violations" in integrity_report
        assert "orphaned_data" in integrity_report

        # Verify integrity checks structure
        checks = integrity_report["checks"]
        expected_checks = [
            "foreign_key_integrity",
            "orphaned_data_check",
            "circular_reference_check",
            "constraint_validation",
        ]

        for check in expected_checks:
            assert check in checks

    @pytest.mark.asyncio
    async def test_concurrent_operations_edge_case(self, edge_case_suite):
        """Test concurrent operations edge case execution."""

        concurrent_scenario = EdgeCaseScenario(
            scenario_id="EDGE_CONC_001",
            category=EdgeCaseCategory.CONCURRENT_OPERATIONS,
            severity=EdgeCaseSeverity.MEDIUM,
            title="Concurrent User Invitations to Same Email",
            description="Test concurrent invitation handling",
            preconditions=["Multiple inviters", "Same target email"],
            test_steps=["Send concurrent invitations", "Verify handling"],
            expected_results=["Only one invitation succeeds"],
            cleanup_steps=["Clean up invitations"],
        )

        # Mock concurrent invitation execution
        with patch.object(
            edge_case_suite, "_send_invitation_async", new_callable=AsyncMock
        ) as mock_invite:
            mock_invite.return_value = {
                "success": True,
                "invitation_id": "test_inv_123",
            }

            result = await edge_case_suite.execute_edge_case_scenario(concurrent_scenario)

            assert isinstance(result, EdgeCaseTestResult)
            assert result.scenario_id == concurrent_scenario.scenario_id

    def test_edge_case_test_result_creation(self):
        """Test edge case test result creation and structure."""

        result = EdgeCaseTestResult(
            scenario_id="EDGE_TEST_001", success=True, execution_time_seconds=5.2
        )

        assert result.scenario_id == "EDGE_TEST_001"
        assert result.success is True
        assert result.execution_time_seconds == 5.2
        assert isinstance(result.errors, list)
        assert isinstance(result.warnings, list)
        assert isinstance(result.data_integrity_checks, dict)
        assert isinstance(result.orphaned_data_detected, list)
        assert isinstance(result.referential_integrity_violations, list)

    def test_edge_case_report_generation(self, edge_case_suite):
        """Test edge case testing report generation."""

        # Generate scenarios first
        scenarios = edge_case_suite.generate_all_edge_case_scenarios()

        # Create some mock test results
        edge_case_suite.test_results = [
            EdgeCaseTestResult(
                scenario_id=scenarios[0].scenario_id,
                success=True,
                execution_time_seconds=3.5,
            ),
            EdgeCaseTestResult(
                scenario_id=scenarios[1].scenario_id,
                success=False,
                execution_time_seconds=2.1,
                errors=["Test error"],
            ),
        ]

        report = edge_case_suite.generate_edge_case_report()

        assert isinstance(report, dict)
        assert "summary" in report
        assert "by_category" in report
        assert "by_severity" in report
        assert "test_results" in report
        assert "recommendations" in report

        # Verify summary statistics
        summary = report["summary"]
        assert summary["total_scenarios"] == len(scenarios)
        assert summary["executed_scenarios"] == 2
        assert summary["successful_tests"] == 1
        assert summary["success_rate"] == 50.0

    def test_edge_case_categories_coverage(self):
        """Test that all edge case categories are properly defined."""

        expected_categories = [
            EdgeCaseCategory.OWNER_SUCCESSION,
            EdgeCaseCategory.ORGANIZATION_DELETION,
            EdgeCaseCategory.DATA_ORPHANING,
            EdgeCaseCategory.REFERENTIAL_INTEGRITY,
            EdgeCaseCategory.CONCURRENT_OPERATIONS,
            EdgeCaseCategory.STATE_TRANSITIONS,
            EdgeCaseCategory.BOUNDARY_CONDITIONS,
            EdgeCaseCategory.ERROR_RECOVERY,
        ]

        for category in expected_categories:
            assert category in EdgeCaseCategory

    def test_edge_case_severities_coverage(self):
        """Test that all edge case severities are properly defined."""

        expected_severities = [
            EdgeCaseSeverity.CRITICAL,
            EdgeCaseSeverity.HIGH,
            EdgeCaseSeverity.MEDIUM,
            EdgeCaseSeverity.LOW,
        ]

        for severity in expected_severities:
            assert severity in EdgeCaseSeverity

    @pytest.mark.asyncio
    async def test_cleanup_execution(self, edge_case_suite, sample_edge_case_scenario):
        """Test cleanup execution for edge case scenarios."""

        # Mock cleanup methods
        with (
            patch.object(
                edge_case_suite, "_cleanup_test_organizations", new_callable=AsyncMock
            ) as mock_cleanup_orgs,
            patch.object(edge_case_suite, "_cleanup_orphaned_data", new_callable=AsyncMock),
        ):
            result = EdgeCaseTestResult(
                scenario_id=sample_edge_case_scenario.scenario_id,
                success=True,
                execution_time_seconds=1.0,
            )

            await edge_case_suite._execute_cleanup_steps(sample_edge_case_scenario, result)

            # Verify cleanup was called
            mock_cleanup_orgs.assert_called_once_with(sample_edge_case_scenario.scenario_id)
            assert result.cleanup_success is True

    @pytest.mark.asyncio
    async def test_cleanup_failure_handling(self, edge_case_suite, sample_edge_case_scenario):
        """Test handling of cleanup failures."""

        # Mock cleanup to fail
        with patch.object(
            edge_case_suite, "_cleanup_test_organizations", new_callable=AsyncMock
        ) as mock_cleanup:
            mock_cleanup.side_effect = Exception("Cleanup failed")

            result = EdgeCaseTestResult(
                scenario_id=sample_edge_case_scenario.scenario_id,
                success=True,
                execution_time_seconds=1.0,
            )

            await edge_case_suite._execute_cleanup_steps(sample_edge_case_scenario, result)

            assert result.cleanup_success is False
            assert any("Cleanup failed" in error for error in result.errors)

    def test_edge_case_scenario_validation(self):
        """Test edge case scenario validation and requirements."""

        # Test scenario with all required fields
        valid_scenario = EdgeCaseScenario(
            scenario_id="EDGE_VALID_001",
            category=EdgeCaseCategory.OWNER_SUCCESSION,
            severity=EdgeCaseSeverity.HIGH,
            title="Valid Test Scenario",
            description="A valid test scenario",
            preconditions=["Precondition 1"],
            test_steps=["Step 1"],
            expected_results=["Result 1"],
            cleanup_steps=["Cleanup 1"],
        )

        assert valid_scenario.scenario_id == "EDGE_VALID_001"
        assert valid_scenario.category == EdgeCaseCategory.OWNER_SUCCESSION
        assert valid_scenario.severity == EdgeCaseSeverity.HIGH
        assert len(valid_scenario.preconditions) == 1
        assert len(valid_scenario.test_steps) == 1
        assert len(valid_scenario.expected_results) == 1
        assert len(valid_scenario.cleanup_steps) == 1

    def test_recommendations_generation(self, edge_case_suite):
        """Test recommendation generation based on test results."""

        # Create scenarios and results with different failure types
        edge_case_suite.test_scenarios = [
            EdgeCaseScenario(
                scenario_id="EDGE_CRIT_001",
                category=EdgeCaseCategory.OWNER_SUCCESSION,
                severity=EdgeCaseSeverity.CRITICAL,
                title="Critical Test",
                description="Critical test scenario",
                preconditions=[],
                test_steps=[],
                expected_results=[],
                cleanup_steps=[],
            ),
            EdgeCaseScenario(
                scenario_id="EDGE_MANUAL_001",
                category=EdgeCaseCategory.ERROR_RECOVERY,
                severity=EdgeCaseSeverity.HIGH,
                title="Manual Test",
                description="Manual verification test",
                preconditions=[],
                test_steps=[],
                expected_results=[],
                cleanup_steps=[],
                requires_manual_verification=True,
            ),
        ]

        edge_case_suite.test_results = [
            EdgeCaseTestResult(
                scenario_id="EDGE_CRIT_001",
                success=False,
                execution_time_seconds=1.0,
                errors=["Critical failure"],
            ),
            EdgeCaseTestResult(
                scenario_id="EDGE_MANUAL_001",
                success=True,
                execution_time_seconds=1.0,
                orphaned_data_detected=["orphaned_item_1"],
            ),
        ]

        recommendations = edge_case_suite._generate_recommendations()

        assert isinstance(recommendations, list)
        assert len(recommendations) > 0

        # Check for specific recommendation types
        recommendation_text = " ".join(recommendations).lower()
        assert "critical" in recommendation_text or "manual" in recommendation_text


@pytest.mark.edge_case
@pytest.mark.integration
class TestEdgeCaseIntegration:
    """Integration tests for edge case testing with other components."""

    @pytest.mark.asyncio
    async def test_end_to_end_edge_case_testing(self, isolated_organization_factory):
        """End-to-end edge case testing with mocked dependencies."""

        edge_case_suite = EdgeCaseTestSuite(isolated_organization_factory)

        # Generate a subset of scenarios for testing
        scenarios = edge_case_suite.generate_all_edge_case_scenarios()[:3]  # Test first 3 scenarios

        # Mock external dependencies
        with (
            patch.object(
                edge_case_suite, "_attempt_owner_deletion", new_callable=AsyncMock
            ) as mock_deletion,
            patch.object(
                edge_case_suite, "_perform_cascade_deletion", new_callable=AsyncMock
            ) as mock_cascade,
            patch.object(edge_case_suite, "data_integrity_validator") as mock_validator,
        ):
            mock_deletion.return_value = {"allowed": False, "succession_required": True}
            mock_cascade.return_value = {"success": True, "deleted_items": ["org"]}
            mock_validator.validate_system_integrity.return_value = {
                "checks": {"foreign_key_integrity": True},
                "violations": [],
                "orphaned_data": [],
            }

            # Execute scenarios
            results = []
            for scenario in scenarios:
                result = await edge_case_suite.execute_edge_case_scenario(scenario)
                results.append(result)

            # Verify execution
            assert len(results) == 3
            for result in results:
                assert isinstance(result, EdgeCaseTestResult)
                assert result.execution_time_seconds > 0

    def test_edge_case_data_export(self, isolated_organization_factory, temp_test_file):
        """Test exporting edge case test results."""

        edge_case_suite = EdgeCaseTestSuite(isolated_organization_factory)

        # Generate scenarios and mock results
        scenarios = edge_case_suite.generate_all_edge_case_scenarios()
        edge_case_suite.test_results = [
            EdgeCaseTestResult(
                scenario_id=scenarios[0].scenario_id,
                success=True,
                execution_time_seconds=2.5,
                data_integrity_checks={"test_check": True},
            )
        ]

        # Generate report
        report = edge_case_suite.generate_edge_case_report()

        # Export to file
        import json

        with open(temp_test_file, "w") as f:
            json.dump(report, f, indent=2)

        # Verify file was created and contains data
        with open(temp_test_file, "r") as f:
            exported_data = json.load(f)

        assert "summary" in exported_data
        assert "by_category" in exported_data
        assert "test_results" in exported_data
        assert exported_data["summary"]["total_scenarios"] == len(scenarios)
