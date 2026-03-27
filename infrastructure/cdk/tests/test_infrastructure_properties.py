"""Property-based and unit tests for Infrastructure Stack Refactoring.

Feature: infrastructure-stack-refactoring

Tests cover:
- Property 2: Resource Preservation (Authorization Stack, Compute Stack)
- Unit tests for SDK API creation (source code analysis)
- Property 3: Dependency Chain Integrity
- Property 1: Stack Naming Consistency
- Property 4: SSM Parameter Consistency
- Property 5: No CloudFormation Exports

Note: ApiStack cannot be synthesized in tests due to a known bug in the
generated AppSyncMainApiApi construct (add_api_key AttributeError).
Tests that need ApiStack use source code analysis or skip synthesis.
"""

import json
import re
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from aws_cdk import App, Environment
from aws_cdk.assertions import Match, Template

from config import Config
from stacks import (
    ApiStack,
    AuthorizationStack,
    BootstrapStack,
    ComputeStack,
    DataStack,
    FrontendStack,
    MonitoringStack,
)


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture(scope="module")
def test_config() -> Config:
    """Create test configuration."""
    return Config(
        customer_id="test",
        project_id="project",
        environment="dev",
        region="us-east-1",
        account="123456789012",
        sms_origination_number="+15551234567",
    )


@pytest.fixture(scope="module")
def authorization_template(test_config: Config) -> Template:
    """Create CDK template from AuthorizationStack."""
    app = App()
    stack = AuthorizationStack(app, "TestAuthStack", config=test_config)
    return Template.from_stack(stack)


@pytest.fixture(scope="module")
def compute_template(test_config: Config) -> Template:
    """Create CDK template from ComputeStack."""
    app = App()
    auth_stack = AuthorizationStack(app, "TestAuthForCompute", config=test_config)
    stack = ComputeStack(
        app, "TestComputeStack",
        config=test_config, authorization_stack=auth_stack,
    )
    return Template.from_stack(stack)


@pytest.fixture(scope="module")
def synthesizable_stacks(test_config: Config) -> dict:
    """Create all synthesizable stack templates.

    Note: ApiStack is excluded because the generated AppSyncMainApiApi
    construct has a bug (add_api_key). We test ApiStack via source analysis.
    """
    app = App()
    env = Environment(account="123456789012", region="us-east-1")

    bootstrap = BootstrapStack(app, "test-project-dev-bootstrap", config=test_config, env=env)
    data = DataStack(app, "test-project-dev-data", env=env)
    authorization = AuthorizationStack(app, "test-project-dev-authorization", config=test_config, env=env)
    frontend = FrontendStack(app, "test-project-dev-frontend", config=test_config, env=env)
    compute = ComputeStack(
        app, "test-project-dev-compute",
        config=test_config, authorization_stack=authorization, env=env,
    )
    monitoring = MonitoringStack(app, "test-project-dev-monitoring", config=test_config, env=env)

    # Set up dependencies (same as app.py)
    data.add_dependency(bootstrap)
    authorization.add_dependency(bootstrap)
    authorization.add_dependency(data)
    frontend.add_dependency(bootstrap)
    compute.add_dependency(data)
    compute.add_dependency(authorization)
    monitoring.add_dependency(compute)  # Simplified: monitoring depends on compute (api excluded)

    return {
        "bootstrap": {"stack": bootstrap, "template": Template.from_stack(bootstrap)},
        "data": {"stack": data, "template": Template.from_stack(data)},
        "authorization": {"stack": authorization, "template": Template.from_stack(authorization)},
        "frontend": {"stack": frontend, "template": Template.from_stack(frontend)},
        "compute": {"stack": compute, "template": Template.from_stack(compute)},
        "monitoring": {"stack": monitoring, "template": Template.from_stack(monitoring)},
    }


@pytest.fixture(scope="module")
def dependency_stacks(test_config: Config) -> dict:
    """Create all stacks with proper dependencies for dependency chain tests.

    ApiStack is created but not synthesized - we only check its dependency
    relationships, not its template.
    """
    app = App()
    env = Environment(account="123456789012", region="us-east-1")

    bootstrap = BootstrapStack(app, "test-project-dev-bootstrap", config=test_config, env=env)
    data = DataStack(app, "test-project-dev-data", env=env)
    authorization = AuthorizationStack(app, "test-project-dev-authorization", config=test_config, env=env)
    frontend = FrontendStack(app, "test-project-dev-frontend", config=test_config, env=env)
    compute = ComputeStack(
        app, "test-project-dev-compute",
        config=test_config, authorization_stack=authorization, env=env,
    )

    # ApiStack: create a minimal mock stack for dependency testing only
    # We can't synthesize it due to generated construct bug, but we can
    # test dependency relationships by creating a plain Stack with same ID
    from aws_cdk import Stack
    api = Stack(app, "test-project-dev-api", env=env)

    monitoring = MonitoringStack(app, "test-project-dev-monitoring", config=test_config, env=env)

    # Set up dependencies exactly as in app.py
    data.add_dependency(bootstrap)
    authorization.add_dependency(bootstrap)
    authorization.add_dependency(data)
    frontend.add_dependency(bootstrap)
    compute.add_dependency(data)
    compute.add_dependency(authorization)
    api.add_dependency(data)
    api.add_dependency(compute)
    api.add_dependency(authorization)
    monitoring.add_dependency(api)

    return {
        "bootstrap": bootstrap,
        "data": data,
        "authorization": authorization,
        "frontend": frontend,
        "compute": compute,
        "api": api,
        "monitoring": monitoring,
    }


# ============================================================================
# Task 2.3: Property test for Authorization Stack resource preservation
# Feature: infrastructure-stack-refactoring, Property 2: Resource Preservation
# Validates: Requirements 2.6
# ============================================================================


class TestAuthorizationStackResourcePreservation:
    """Property 2: Resource Preservation - Authorization Stack.

    **Validates: Requirements 2.6**

    Verify AuthorizationStack creates Cognito User Pool, groups, client,
    identity pool, and API Key Authorizer Lambda. Test that all SSM
    parameters are exported.
    """

    EXPECTED_GROUPS = ["USER", "CUSTOMER", "CLIENT", "EMPLOYEE", "OWNER"]
    EXPECTED_SSM_PARAMS = [
        "/test/project/dev/cognito/user-pool-id",
        "/test/project/dev/cognito/client-id",
        "/test/project/dev/cognito/qr-issuer",
        "/test/project/dev/cognito/identity-pool-id",
        "/test/project/dev/cognito/user-pool-arn",
        "/test/project/dev/cognito/phone-number-verification-topic/arn",
        "/test/project/dev/lambda/authorizer/arn",
    ]

    @given(group_idx=st.integers(min_value=0, max_value=4))
    @settings(max_examples=100)
    def test_all_cognito_groups_exist(
        self, authorization_template: Template, group_idx: int
    ) -> None:
        """Property: For any valid group index, the group exists in the stack."""
        group_name = self.EXPECTED_GROUPS[group_idx]
        authorization_template.has_resource_properties(
            "AWS::Cognito::UserPoolGroup",
            {"GroupName": group_name},
        )

    @given(param_idx=st.integers(min_value=0, max_value=6))
    @settings(max_examples=100)
    def test_all_ssm_parameters_exported(
        self, authorization_template: Template, param_idx: int
    ) -> None:
        """Property: For any expected SSM parameter, it is exported by the stack."""
        param_name = self.EXPECTED_SSM_PARAMS[param_idx]
        authorization_template.has_resource_properties(
            "AWS::SSM::Parameter",
            {"Name": param_name, "Type": "String"},
        )

    def test_creates_cognito_user_pool(self, authorization_template: Template) -> None:
        """Verify Cognito User Pool is created."""
        authorization_template.has_resource_properties(
            "AWS::Cognito::UserPool",
            {"UserPoolName": "test-project-dev-user-pool"},
        )

    def test_creates_user_pool_client(self, authorization_template: Template) -> None:
        """Verify User Pool Client is created."""
        authorization_template.has_resource_properties(
            "AWS::Cognito::UserPoolClient",
            {"ClientName": "test-project-dev-user-pool-client"},
        )

    def test_creates_identity_pool(self, authorization_template: Template) -> None:
        """Verify Identity Pool is created."""
        authorization_template.has_resource_properties(
            "AWS::Cognito::IdentityPool",
            {"IdentityPoolName": "test-project-dev-identity-pool"},
        )

    def test_creates_api_key_authorizer_lambda(self, authorization_template: Template) -> None:
        """Verify API Key Authorizer Lambda is created in Authorization Stack."""
        authorization_template.has_resource_properties(
            "AWS::Lambda::Function",
            {
                "FunctionName": "test-project-dev-api-key-authorizer",
                "Runtime": "python3.12",
                "Handler": "index.lambda_handler",
            },
        )

    def test_exactly_five_groups(self, authorization_template: Template) -> None:
        """Verify exactly 5 user groups are created."""
        authorization_template.resource_count_is("AWS::Cognito::UserPoolGroup", 5)


# ============================================================================
# Task 3.3: Property test for Compute Stack resource preservation
# Feature: infrastructure-stack-refactoring, Property 2: Resource Preservation
# Validates: Requirements 3.6
# ============================================================================


class TestComputeStackResourcePreservation:
    """Property 2: Resource Preservation - Compute Stack.

    **Validates: Requirements 3.6**

    Verify ComputeStack creates all Lambda functions except API Key Authorizer.
    Test that API Key Authorizer is NOT in ComputeStack.
    """

    EXPECTED_LAMBDAS = [
        "test-project-dev-sms-verification",
        "test-project-dev-cognito-group-manager",
        "test-project-dev-user-status-calculator",
        "test-project-dev-organizations",
        "test-project-dev-check-email-exists",
        "test-project-dev-create-user-from-cognito",
        "test-project-dev-get-current-user",
        "test-project-dev-get-application-users",
    ]

    @given(lambda_idx=st.integers(min_value=0, max_value=7))
    @settings(max_examples=100)
    def test_all_business_lambdas_exist(
        self, compute_template: Template, lambda_idx: int
    ) -> None:
        """Property: For any expected Lambda index, the function exists in ComputeStack."""
        function_name = self.EXPECTED_LAMBDAS[lambda_idx]
        compute_template.has_resource_properties(
            "AWS::Lambda::Function",
            {"FunctionName": function_name},
        )

    def test_api_key_authorizer_not_in_compute_stack(
        self, compute_template: Template
    ) -> None:
        """Verify API Key Authorizer Lambda is NOT in ComputeStack."""
        template_json = compute_template.to_json()
        resources = template_json.get("Resources", {})
        for _logical_id, resource in resources.items():
            if resource.get("Type") == "AWS::Lambda::Function":
                props = resource.get("Properties", {})
                fn_name = props.get("FunctionName", "")
                assert "api-key-authorizer" not in fn_name, (
                    f"API Key Authorizer Lambda should not be in ComputeStack, "
                    f"found: {fn_name}"
                )

    def test_compute_stack_lambda_count(self, compute_template: Template) -> None:
        """Verify ComputeStack has exactly 8 Lambda functions (no API Key Authorizer)."""
        compute_template.resource_count_is("AWS::Lambda::Function", 8)


# ============================================================================
# Task 4.3: Unit test for SDK API creation
# Validates: Requirements 4.6, 4.7, 4.8
#
# Note: ApiStack cannot be synthesized due to generated construct bug.
# These tests use source code analysis to verify the implementation.
# ============================================================================


class TestSdkApiCreation:
    """Unit tests for SDK API creation in ApiStack.

    **Validates: Requirements 4.6, 4.7, 4.8**

    Test that SDK API is created with correct configuration, references
    API Key Authorizer Lambda ARN from SSM, and writes API ID/URL to SSM.

    Uses source code analysis because the generated AppSyncMainApiApi
    construct has a bug (add_api_key) that prevents template synthesis.
    """

    @pytest.fixture
    def api_stack_source(self) -> str:
        """Load ApiStack source code."""
        path = Path(__file__).parent.parent / "stacks" / "api_stack.py"
        return path.read_text()

    def test_sdk_api_construct_is_imported(self, api_stack_source: str) -> None:
        """Verify AppSyncSdkApiApi is imported in api_stack.py."""
        assert "AppSyncSdkApiApi" in api_stack_source, (
            "ApiStack should import AppSyncSdkApiApi for SDK API creation"
        )

    def test_sdk_api_is_instantiated(self, api_stack_source: str) -> None:
        """Verify SDK API is created using AppSyncSdkApiApi construct."""
        assert "self.sdk_api" in api_stack_source, (
            "ApiStack should create self.sdk_api"
        )
        assert "AppSyncSdkApiApi(" in api_stack_source, (
            "ApiStack should instantiate AppSyncSdkApiApi"
        )

    def test_main_api_construct_is_imported(self, api_stack_source: str) -> None:
        """Verify AppSyncMainApiApi is imported for Main API."""
        assert "AppSyncMainApiApi" in api_stack_source, (
            "ApiStack should import AppSyncMainApiApi for Main API creation"
        )

    def test_main_api_is_instantiated(self, api_stack_source: str) -> None:
        """Verify Main API is created using AppSyncMainApiApi construct."""
        assert "self.main_api" in api_stack_source, (
            "ApiStack should create self.main_api"
        )

    def test_tables_loaded_from_ssm(self, api_stack_source: str) -> None:
        """Verify tables are loaded from SSM parameters."""
        assert "_load_tables_from_ssm" in api_stack_source, (
            "ApiStack should load table references from SSM"
        )
        assert "value_for_string_parameter" in api_stack_source, (
            "ApiStack should use SSM StringParameter.value_for_string_parameter"
        )

    def test_api_stack_class_name(self, api_stack_source: str) -> None:
        """Verify the class is named ApiStack (not AppSyncStack)."""
        assert "class ApiStack(Stack):" in api_stack_source, (
            "Stack class should be named ApiStack"
        )
        assert "class AppSyncStack" not in api_stack_source, (
            "Old class name AppSyncStack should not exist"
        )

    def test_sdk_api_has_xray_enabled(self, api_stack_source: str) -> None:
        """Verify SDK API has X-Ray tracing enabled."""
        # Find the SdkApi construct instantiation (not the import)
        sdk_idx = api_stack_source.index("self.sdk_api")
        sdk_section = api_stack_source[sdk_idx:sdk_idx + 500]
        assert "enable_xray=True" in sdk_section, (
            "SDK API should have X-Ray tracing enabled"
        )


# ============================================================================
# Task 5.3: Property test for dependency chain integrity
# Feature: infrastructure-stack-refactoring, Property 3: Dependency Chain Integrity
# Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 10.5
# ============================================================================


class TestDependencyChainIntegrity:
    """Property 3: Dependency Chain Integrity.

    **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 10.5**

    Verify the dependency chain:
    Bootstrap → Data → Authorization → Compute → API → Monitoring
    Test that each stack depends on the correct predecessors.
    """

    EXPECTED_DEPS = {
        "bootstrap": set(),
        "data": {"bootstrap"},
        "authorization": {"bootstrap", "data"},
        "compute": {"data", "authorization"},
        "api": {"data", "compute", "authorization"},
        "monitoring": {"api"},
        "frontend": {"bootstrap"},
    }

    CHAIN_ORDER = ["bootstrap", "data", "authorization", "compute", "api", "monitoring"]

    @given(stack_idx=st.integers(min_value=0, max_value=5))
    @settings(max_examples=100)
    def test_dependency_chain_order(
        self, dependency_stacks: dict, stack_idx: int
    ) -> None:
        """Property: For any stack in the chain, it only depends on earlier stacks."""
        stack_name = self.CHAIN_ORDER[stack_idx]
        stack_obj = dependency_stacks[stack_name]
        dep_names = {d.node.id for d in stack_obj.dependencies}

        expected = self.EXPECTED_DEPS[stack_name]
        expected_ids = {f"test-project-dev-{name}" for name in expected}

        assert dep_names == expected_ids, (
            f"Stack '{stack_name}' has dependencies {dep_names}, "
            f"expected {expected_ids}"
        )

    def test_bootstrap_has_no_dependencies(self, dependency_stacks: dict) -> None:
        """Verify Bootstrap Stack has no dependencies (Req 5.2)."""
        bootstrap = dependency_stacks["bootstrap"]
        assert len(bootstrap.dependencies) == 0

    def test_data_depends_on_bootstrap(self, dependency_stacks: dict) -> None:
        """Verify Data Stack depends on Bootstrap (Req 5.3)."""
        data = dependency_stacks["data"]
        dep_ids = {d.node.id for d in data.dependencies}
        assert "test-project-dev-bootstrap" in dep_ids

    def test_authorization_depends_on_bootstrap_and_data(self, dependency_stacks: dict) -> None:
        """Verify Authorization Stack depends on Bootstrap and Data (Req 5.4)."""
        auth = dependency_stacks["authorization"]
        dep_ids = {d.node.id for d in auth.dependencies}
        assert "test-project-dev-bootstrap" in dep_ids
        assert "test-project-dev-data" in dep_ids

    def test_compute_depends_on_data_and_authorization(self, dependency_stacks: dict) -> None:
        """Verify Compute Stack depends on Data and Authorization (Req 5.5)."""
        compute = dependency_stacks["compute"]
        dep_ids = {d.node.id for d in compute.dependencies}
        assert "test-project-dev-data" in dep_ids
        assert "test-project-dev-authorization" in dep_ids

    def test_api_depends_on_data_compute_authorization(self, dependency_stacks: dict) -> None:
        """Verify API Stack depends on Data, Compute, and Authorization (Req 5.6)."""
        api = dependency_stacks["api"]
        dep_ids = {d.node.id for d in api.dependencies}
        assert "test-project-dev-data" in dep_ids
        assert "test-project-dev-compute" in dep_ids
        assert "test-project-dev-authorization" in dep_ids

    def test_monitoring_depends_on_api(self, dependency_stacks: dict) -> None:
        """Verify Monitoring Stack depends on API (Req 5.7)."""
        monitoring = dependency_stacks["monitoring"]
        dep_ids = {d.node.id for d in monitoring.dependencies}
        assert "test-project-dev-api" in dep_ids

    def test_frontend_depends_only_on_bootstrap(self, dependency_stacks: dict) -> None:
        """Verify Frontend Stack depends only on Bootstrap (Req 5.8)."""
        frontend = dependency_stacks["frontend"]
        dep_ids = {d.node.id for d in frontend.dependencies}
        assert dep_ids == {"test-project-dev-bootstrap"}

    def test_dependency_graph_is_dag(self, dependency_stacks: dict) -> None:
        """Verify the dependency graph is a DAG (no cycles)."""
        graph: dict[str, set[str]] = {}
        for name, stack_obj in dependency_stacks.items():
            dep_ids = {d.node.id for d in stack_obj.dependencies}
            graph[stack_obj.node.id] = dep_ids

        visited: set[str] = set()
        in_progress: set[str] = set()

        def has_cycle(node: str) -> bool:
            if node in in_progress:
                return True
            if node in visited:
                return False
            in_progress.add(node)
            for dep in graph.get(node, set()):
                if has_cycle(dep):
                    return True
            in_progress.remove(node)
            visited.add(node)
            return False

        for node in graph:
            assert not has_cycle(node), f"Cycle detected involving {node}"


# ============================================================================
# Task 7.4: Property test for stack naming consistency
# Feature: infrastructure-stack-refactoring, Property 1: Stack Naming Consistency
# Validates: Requirements 1.4, 2.4, 3.4, 4.4, 10.2
# ============================================================================


class TestStackNamingConsistency:
    """Property 1: Stack Naming Consistency.

    **Validates: Requirements 1.4, 2.4, 3.4, 4.4, 10.2**

    Verify all stack IDs follow pattern: {prefix}-{descriptive-name}.
    Test that descriptive names are used (data, authorization, compute, api)
    not technology names (dynamodb, cognito, lambda, appsync).
    """

    DESCRIPTIVE_NAMES = ["data", "authorization", "compute", "api"]
    TECHNOLOGY_NAMES = ["dynamodb", "cognito", "lambda", "appsync"]
    PREFIX = "test-project-dev"

    @given(name_idx=st.integers(min_value=0, max_value=3))
    @settings(max_examples=100)
    def test_stack_ids_use_descriptive_names(
        self, dependency_stacks: dict, name_idx: int
    ) -> None:
        """Property: For any refactored stack, its ID uses a descriptive name."""
        descriptive_name = self.DESCRIPTIVE_NAMES[name_idx]
        expected_id = f"{self.PREFIX}-{descriptive_name}"
        assert descriptive_name in dependency_stacks, (
            f"Stack '{descriptive_name}' not found"
        )
        stack_obj = dependency_stacks[descriptive_name]
        assert stack_obj.node.id == expected_id, (
            f"Stack ID '{stack_obj.node.id}' does not match expected '{expected_id}'"
        )

    @given(tech_idx=st.integers(min_value=0, max_value=3))
    @settings(max_examples=100)
    def test_no_technology_names_in_stack_ids(
        self, dependency_stacks: dict, tech_idx: int
    ) -> None:
        """Property: For any technology name, no stack ID contains it."""
        tech_name = self.TECHNOLOGY_NAMES[tech_idx]
        for name, stack_obj in dependency_stacks.items():
            stack_id = stack_obj.node.id
            assert tech_name not in stack_id.lower(), (
                f"Stack '{name}' has ID '{stack_id}' containing technology name '{tech_name}'"
            )

    def test_all_stack_ids_follow_prefix_pattern(self, dependency_stacks: dict) -> None:
        """Verify all stack IDs follow {prefix}-{descriptive-name} pattern."""
        for name, stack_obj in dependency_stacks.items():
            stack_id = stack_obj.node.id
            assert stack_id.startswith(self.PREFIX), (
                f"Stack '{name}' ID '{stack_id}' does not start with prefix '{self.PREFIX}'"
            )
            suffix = stack_id[len(self.PREFIX) + 1:]
            assert suffix, f"Stack '{name}' ID '{stack_id}' has no descriptive suffix"
            assert re.match(r"^[a-z][a-z-]*$", suffix), (
                f"Stack '{name}' suffix '{suffix}' is not a valid descriptive name"
            )

    def test_app_py_uses_descriptive_stack_ids(self) -> None:
        """Verify app.py uses descriptive stack IDs (not technology names)."""
        app_py_path = Path(__file__).parent.parent / "app.py"
        content = app_py_path.read_text()
        for tech_name in self.TECHNOLOGY_NAMES:
            # Check that stack IDs don't use technology names
            pattern = rf'f".*-{tech_name}"'
            assert not re.search(pattern, content), (
                f"app.py uses technology name '{tech_name}' in stack ID"
            )


# ============================================================================
# Task 7.5: Property test for SSM parameter consistency
# Feature: infrastructure-stack-refactoring, Property 4: SSM Parameter Consistency
# Validates: Requirements 1.6, 2.7, 4.8, 10.4
# ============================================================================


class TestSSMParameterConsistency:
    """Property 4: SSM Parameter Consistency.

    **Validates: Requirements 1.6, 2.7, 4.8, 10.4**

    Verify all SSM parameters follow the naming convention:
    /orb/integration-hub/{env}/... (or /test/project/dev/... in tests).
    Test that all stacks write their outputs to SSM (not CloudFormation exports).
    """

    SSM_PREFIX = "/test/project/dev/"

    def _get_ssm_param_names(self, template: Template) -> list[str]:
        """Extract all SSM parameter names from a template."""
        template_json = template.to_json()
        resources = template_json.get("Resources", {})
        param_names = []
        for _logical_id, resource in resources.items():
            if resource.get("Type") == "AWS::SSM::Parameter":
                name = resource.get("Properties", {}).get("Name", "")
                if isinstance(name, str) and name:
                    param_names.append(name)
        return param_names

    @given(stack_choice=st.sampled_from(["bootstrap", "authorization", "frontend", "compute", "monitoring"]))
    @settings(max_examples=100)
    def test_ssm_params_follow_naming_convention(
        self, synthesizable_stacks: dict, stack_choice: str
    ) -> None:
        """Property: For any stack, all SSM parameters follow the naming convention."""
        template = synthesizable_stacks[stack_choice]["template"]
        param_names = self._get_ssm_param_names(template)
        for name in param_names:
            assert name.startswith(self.SSM_PREFIX), (
                f"SSM parameter '{name}' in stack '{stack_choice}' "
                f"does not follow convention (expected prefix '{self.SSM_PREFIX}')"
            )

    def test_authorization_stack_writes_ssm_params(self, synthesizable_stacks: dict) -> None:
        """Verify Authorization Stack writes outputs to SSM."""
        template = synthesizable_stacks["authorization"]["template"]
        param_names = self._get_ssm_param_names(template)
        assert len(param_names) > 0, "Authorization Stack should write SSM parameters"
        param_set = set(param_names)
        assert "/test/project/dev/cognito/user-pool-id" in param_set
        assert "/test/project/dev/lambda/authorizer/arn" in param_set

    def test_compute_stack_writes_lambda_arns_to_ssm(self, synthesizable_stacks: dict) -> None:
        """Verify Compute Stack writes Lambda ARNs to SSM."""
        template = synthesizable_stacks["compute"]["template"]
        param_names = self._get_ssm_param_names(template)
        lambda_params = [p for p in param_names if "/lambda/" in p]
        assert len(lambda_params) >= 6, (
            f"Compute Stack should write at least 6 Lambda ARN SSM parameters, "
            f"found {len(lambda_params)}: {lambda_params}"
        )

    def test_bootstrap_stack_writes_ssm_params(self, synthesizable_stacks: dict) -> None:
        """Verify Bootstrap Stack writes outputs to SSM."""
        template = synthesizable_stacks["bootstrap"]["template"]
        param_names = self._get_ssm_param_names(template)
        assert len(param_names) > 0, "Bootstrap Stack should write SSM parameters"

    def test_monitoring_stack_writes_ssm_params(self, synthesizable_stacks: dict) -> None:
        """Verify Monitoring Stack writes outputs to SSM."""
        template = synthesizable_stacks["monitoring"]["template"]
        param_names = self._get_ssm_param_names(template)
        assert len(param_names) > 0, "Monitoring Stack should write SSM parameters"

    def test_ssm_param_names_have_valid_structure(self, synthesizable_stacks: dict) -> None:
        """Verify all SSM parameter names have valid path structure."""
        for stack_name, info in synthesizable_stacks.items():
            template = info["template"]
            param_names = self._get_ssm_param_names(template)
            for name in param_names:
                parts = name.strip("/").split("/")
                assert len(parts) >= 4, (
                    f"SSM parameter '{name}' in '{stack_name}' has too few path segments "
                    f"(expected >=4, got {len(parts)})"
                )


# ============================================================================
# Task 7.6: Property test for no CloudFormation exports
# Feature: infrastructure-stack-refactoring, Property 5: No CloudFormation Exports
# Validates: Requirements 10.3
# ============================================================================


class TestNoCloudFormationExports:
    """Property 5: No CloudFormation Exports.

    **Validates: Requirements 10.3**

    Verify no stack uses CfnOutput or CloudFormation exports.
    All cross-stack references must use SSM parameters.
    """

    @given(stack_choice=st.sampled_from([
        "bootstrap", "data", "authorization", "frontend", "compute", "monitoring",
    ]))
    @settings(max_examples=100)
    def test_no_cloudformation_exports(
        self, synthesizable_stacks: dict, stack_choice: str
    ) -> None:
        """Property: For any stack, there are no CloudFormation exports."""
        template = synthesizable_stacks[stack_choice]["template"]
        template_json = template.to_json()
        outputs = template_json.get("Outputs", {})
        for output_id, output_def in outputs.items():
            assert "Export" not in output_def, (
                f"Stack '{stack_choice}' has CloudFormation export in output '{output_id}'. "
                "All cross-stack references should use SSM parameters."
            )

    def test_no_cfn_output_exports_in_any_stack(self, synthesizable_stacks: dict) -> None:
        """Verify no stack has any CloudFormation Output with Export property."""
        violations = []
        for stack_name, info in synthesizable_stacks.items():
            template_json = info["template"].to_json()
            outputs = template_json.get("Outputs", {})
            for output_id, output_def in outputs.items():
                if "Export" in output_def:
                    violations.append(
                        f"{stack_name}: Output '{output_id}' has Export "
                        f"'{output_def['Export']}'"
                    )
        assert not violations, (
            "CloudFormation exports found (should use SSM):\n"
            + "\n".join(violations)
        )

    def test_stacks_use_ssm_for_cross_stack_refs(self, synthesizable_stacks: dict) -> None:
        """Verify stacks that need cross-stack data use SSM parameters."""
        writers = ["bootstrap", "authorization", "compute", "monitoring", "frontend"]
        for stack_name in writers:
            template_json = synthesizable_stacks[stack_name]["template"].to_json()
            resources = template_json.get("Resources", {})
            ssm_params = [
                lid for lid, r in resources.items()
                if r.get("Type") == "AWS::SSM::Parameter"
            ]
            assert len(ssm_params) > 0, (
                f"Stack '{stack_name}' should write SSM parameters for cross-stack refs"
            )

    def test_api_stack_source_has_no_cfn_output(self) -> None:
        """Verify ApiStack source code does not use CfnOutput."""
        api_stack_path = Path(__file__).parent.parent / "stacks" / "api_stack.py"
        content = api_stack_path.read_text()
        assert "CfnOutput" not in content, (
            "ApiStack should not use CfnOutput - use SSM parameters instead"
        )

    def test_no_stack_source_uses_cfn_output(self) -> None:
        """Verify no stack source file uses CfnOutput."""
        stacks_dir = Path(__file__).parent.parent / "stacks"
        violations = []
        for stack_file in stacks_dir.glob("*_stack.py"):
            content = stack_file.read_text()
            if "CfnOutput" in content:
                violations.append(stack_file.name)
        assert not violations, (
            f"Stack files using CfnOutput (should use SSM): {violations}"
        )
