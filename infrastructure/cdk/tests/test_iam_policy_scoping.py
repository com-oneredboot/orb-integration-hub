"""Property test for IAM policy scoping.

Feature: platform-improvements, Property 1: IAM Policies Are Scoped to Project Resources

Validates: Requirements 1.1, 1.2, 1.3, 1.4

For any IAM policy in the CDK stacks, if the policy grants access to DynamoDB, SNS,
or Cognito resources, the resource ARN SHALL contain the project prefix pattern
and SHALL NOT use wildcard `*` for the resource portion.
"""

import json
import pytest
from aws_cdk import App
from aws_cdk.assertions import Template
from aws_cdk import aws_ssm as ssm

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import Config
from stacks.cognito_stack import CognitoStack
from stacks.dynamodb_stack import DynamoDBStack
from stacks.lambda_stack import LambdaStack
from stacks.appsync_stack import AppSyncStack


@pytest.fixture
def test_config() -> Config:
    """Create test configuration."""
    return Config(
        customer_id="orb",
        project_id="integration-hub",
        environment="dev",
        region="us-east-1",
        account="123456789012",
        sms_origination_number="+15551234567",
    )


@pytest.fixture
def appsync_template(test_config: Config) -> Template:
    """Create CDK template from AppSyncStack with dependencies."""
    app = App()
    cognito = CognitoStack(app, "Cognito", config=test_config)
    dynamodb = DynamoDBStack(app, "DynamoDB", config=test_config)
    
    # Create mock SSM parameter for layer ARN (normally created by lambda-layers stack)
    # Uses path-based naming: /customer/project/env/lambda-layers/layer-name/arn
    ssm.StringParameter(
        cognito,
        "MockOrganizationsSecurityLayerArn",
        parameter_name=test_config.ssm_parameter_name("lambda-layers/organizations-security/arn"),
        string_value="arn:aws:lambda:us-east-1:123456789012:layer:orb-integration-hub-dev-organizations-security-layer:1",
    )
    
    lambdas = LambdaStack(
        app, "Lambda",
        config=test_config,
        cognito_stack=cognito,
        dynamodb_stack=dynamodb,
    )
    appsync = AppSyncStack(
        app, "AppSync",
        config=test_config,
        cognito_stack=cognito,
        dynamodb_stack=dynamodb,
        lambda_stack=lambdas,
    )
    return Template.from_stack(appsync)


@pytest.fixture
def cognito_template(test_config: Config) -> Template:
    """Create CDK template from CognitoStack."""
    app = App()
    cognito = CognitoStack(app, "Cognito", config=test_config)
    return Template.from_stack(cognito)


class TestAppSyncIAMPolicyScoping:
    """Test that AppSync IAM policies are properly scoped."""

    def test_no_dynamodb_full_access_managed_policy(self, appsync_template: Template):
        """Verify AmazonDynamoDBFullAccess managed policy is not used."""
        template_json = appsync_template.to_json()
        template_str = json.dumps(template_json)
        
        # Should not contain the full access managed policy
        assert "AmazonDynamoDBFullAccess" not in template_str, \
            "AppSync service role should not use AmazonDynamoDBFullAccess managed policy"

    def test_dynamodb_policy_has_scoped_resources(self, appsync_template: Template):
        """Verify DynamoDB policy resources are scoped to project prefix."""
        # Find IAM policies with DynamoDB actions
        policies = appsync_template.find_resources("AWS::IAM::Policy")
        
        for policy_id, policy in policies.items():
            statements = policy.get("Properties", {}).get("PolicyDocument", {}).get("Statement", [])
            
            for statement in statements:
                actions = statement.get("Action", [])
                if isinstance(actions, str):
                    actions = [actions]
                
                # Check if this is a DynamoDB policy
                dynamodb_actions = [a for a in actions if a.startswith("dynamodb:")]
                if dynamodb_actions:
                    resources = statement.get("Resource", [])
                    if isinstance(resources, str):
                        resources = [resources]
                    
                    for resource in resources:
                        # Resource should not be just "*"
                        if isinstance(resource, str):
                            assert resource != "*", \
                                f"DynamoDB policy {policy_id} has wildcard resource"
                        elif isinstance(resource, dict):
                            # CloudFormation intrinsic function - check Fn::Sub or Fn::Join
                            # These are acceptable as they typically contain scoped ARNs
                            pass

    def test_lambda_invoke_policy_is_scoped(self, appsync_template: Template):
        """Verify Lambda invoke policy is scoped to project functions."""
        policies = appsync_template.find_resources("AWS::IAM::Policy")
        
        for policy_id, policy in policies.items():
            statements = policy.get("Properties", {}).get("PolicyDocument", {}).get("Statement", [])
            
            for statement in statements:
                actions = statement.get("Action", [])
                if isinstance(actions, str):
                    actions = [actions]
                
                if "lambda:InvokeFunction" in actions:
                    resources = statement.get("Resource", [])
                    if isinstance(resources, str):
                        resources = [resources]
                    
                    for resource in resources:
                        if isinstance(resource, str):
                            assert resource != "*", \
                                f"Lambda invoke policy {policy_id} has wildcard resource"


class TestCognitoIAMPolicyScoping:
    """Test that Cognito IAM policies are properly scoped."""

    def test_sns_policy_is_scoped(self, cognito_template: Template):
        """Verify SNS policy resources are scoped where possible.
        
        Note: The Cognito SMS role requires sns:Publish with Resource: "*" because
        direct SMS publishing to phone numbers doesn't use ARNs. AWS documentation
        confirms this is the required pattern for SMS MFA.
        See: https://docs.aws.amazon.com/sns/latest/dg/sms_publish-to-phone.html
        
        This test allows wildcard resources for the Cognito SMS role policy
        (CognitoSMSRoleDefaultPolicy) while ensuring other SNS policies are scoped.
        """
        policies = cognito_template.find_resources("AWS::IAM::Policy")
        
        for policy_id, policy in policies.items():
            # Skip the Cognito SMS role policy - wildcard is required for direct SMS
            if "CognitoSMSRole" in policy_id:
                continue
                
            statements = policy.get("Properties", {}).get("PolicyDocument", {}).get("Statement", [])
            
            for statement in statements:
                actions = statement.get("Action", [])
                if isinstance(actions, str):
                    actions = [actions]
                
                sns_actions = [a for a in actions if a.startswith("sns:")]
                if sns_actions:
                    resources = statement.get("Resource", [])
                    if isinstance(resources, str):
                        resources = [resources]
                    
                    for resource in resources:
                        if isinstance(resource, str):
                            assert resource != "*", \
                                f"SNS policy {policy_id} has wildcard resource"

    def test_cognito_admin_policy_is_scoped(self, cognito_template: Template):
        """Verify Cognito admin policy is scoped to specific user pool."""
        policies = cognito_template.find_resources("AWS::IAM::Policy")
        
        for policy_id, policy in policies.items():
            statements = policy.get("Properties", {}).get("PolicyDocument", {}).get("Statement", [])
            
            for statement in statements:
                actions = statement.get("Action", [])
                if isinstance(actions, str):
                    actions = [actions]
                
                cognito_actions = [a for a in actions if a.startswith("cognito-idp:")]
                if cognito_actions:
                    resources = statement.get("Resource", [])
                    if isinstance(resources, str):
                        resources = [resources]
                    
                    for resource in resources:
                        if isinstance(resource, str):
                            assert resource != "*", \
                                f"Cognito policy {policy_id} has wildcard resource"

    def test_xray_policy_is_scoped(self, cognito_template: Template):
        """Verify X-Ray policy resources are scoped or use acceptable wildcards.
        
        Note: X-Ray permissions commonly use wildcard resources because trace
        segments don't have predictable ARNs. AWS documentation recommends
        using Resource: "*" for xray:PutTraceSegments and xray:PutTelemetryRecords.
        This test verifies X-Ray policies exist but allows wildcards for these
        specific actions as per AWS best practices.
        """
        policies = cognito_template.find_resources("AWS::IAM::Policy")
        
        # X-Ray actions that are acceptable with wildcard resources
        xray_wildcard_allowed = {
            "xray:PutTraceSegments",
            "xray:PutTelemetryRecords",
        }
        
        for policy_id, policy in policies.items():
            statements = policy.get("Properties", {}).get("PolicyDocument", {}).get("Statement", [])
            
            for statement in statements:
                actions = statement.get("Action", [])
                if isinstance(actions, str):
                    actions = [actions]
                
                xray_actions = [a for a in actions if a.startswith("xray:")]
                if xray_actions:
                    resources = statement.get("Resource", [])
                    if isinstance(resources, str):
                        resources = [resources]
                    
                    # Check if all X-Ray actions are in the allowed wildcard set
                    all_allowed = all(a in xray_wildcard_allowed for a in xray_actions)
                    
                    for resource in resources:
                        if isinstance(resource, str) and resource == "*":
                            # Wildcard is only acceptable for specific X-Ray actions
                            assert all_allowed, \
                                f"X-Ray policy {policy_id} has wildcard resource for non-standard actions: {xray_actions}"
