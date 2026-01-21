"""Cognito Stack - User authentication and authorization resources.

Creates:
- User Pool with password policies and MFA configuration
- User Pool Client for frontend authentication
- Identity Pool with role mappings
- User groups (USER, CUSTOMER, CLIENT, EMPLOYEE, OWNER)
- PostUserConfirmation Lambda trigger
- SMS role and verification topic
- SSM parameters for cross-stack references
"""

import sys
from pathlib import Path

# Add parent directory to path for imports when running via CDK CLI
sys.path.insert(0, str(Path(__file__).parent.parent))

from aws_cdk import (
    Duration,
    RemovalPolicy,
    Stack,
    Tags,
    aws_cognito as cognito,
    aws_iam as iam,
    aws_lambda as lambda_,
    aws_s3 as s3,
    aws_sns as sns,
    aws_ssm as ssm,
)
from constructs import Construct

from config import Config


class CognitoStack(Stack):
    """Cognito stack with user authentication resources."""

    # User groups to create
    USER_GROUPS = [
        ("USER", "Base group for all users"),
        ("CUSTOMER", "Group for end-users making purchases"),
        ("CLIENT", "Group for customers using the integration hub service"),
        ("EMPLOYEE", "Group for internal staff"),
        ("OWNER", "Group for root-level system access"),
    ]

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        config: Config,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)
        self.config = config
        self._apply_tags()

        # SMS Role (needed before User Pool)
        self.cognito_sms_role = self._create_cognito_sms_role()

        # Lambda Role and Trigger (needed before User Pool)
        self.lambda_role = self._create_lambda_role()
        self.post_confirmation_trigger = self._create_post_confirmation_trigger()

        # User Pool
        self.user_pool = self._create_user_pool()

        # User Pool Client
        self.user_pool_client = self._create_user_pool_client()

        # User Groups
        self._create_user_groups()

        # Identity Pool
        self.identity_pool = self._create_identity_pool()

        # Authorized Role and Role Attachment
        self.cognito_logs_bucket = self._create_cognito_logs_bucket()
        self.authorized_role = self._create_authorized_role()
        self._create_identity_pool_role_attachment()

        # SMS Verification Topic
        self.sms_verification_topic = self._create_sms_verification_topic()

        # SSM Parameters
        self._create_ssm_parameters()

    def _apply_tags(self) -> None:
        """Apply standard tags to all resources in this stack."""
        for key, value in self.config.standard_tags.items():
            Tags.of(self).add(key, value)

    def _create_cognito_sms_role(self) -> iam.Role:
        """Create IAM role for Cognito SMS sending.
        
        Note: Cognito requires sns:Publish permission for SMS MFA. Direct SMS
        publishing to phone numbers requires Resource: "*" because phone numbers
        don't have ARNs. See: https://docs.aws.amazon.com/sns/latest/dg/sms_publish-to-phone.html
        
        Security is maintained because:
        1. The role is only assumable by Cognito (via trust policy with external ID)
        2. Cognito only uses it for SMS MFA verification codes
        """
        external_id = f"{self.config.prefix}-cognito-sms"

        role = iam.Role(
            self,
            "CognitoSMSRole",
            role_name=self.config.resource_name("cognito-sms-role"),
            assumed_by=iam.ServicePrincipal(
                "cognito-idp.amazonaws.com",
                conditions={
                    "StringEquals": {"sts:ExternalId": external_id}
                },
            ),
        )

        # SNS permissions for SMS - Resource: "*" required for direct SMS to phone numbers
        # Phone numbers don't have ARNs, so wildcard is the AWS-documented pattern
        role.add_to_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=["sns:Publish"],
                resources=["*"],
            )
        )

        # X-Ray permissions - scoped to account
        role.add_to_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=[
                    "xray:PutTelemetryRecords",
                    "xray:PutTraceSegments",
                ],
                resources=[
                    f"arn:aws:xray:{self.region}:{self.account}:*",
                ],
            )
        )

        return role

    def _create_lambda_role(self) -> iam.Role:
        """Create IAM role for Cognito Lambda triggers.
        
        Permissions are scoped to project resources where possible.
        Note: Cognito permissions use prefix-based ARN pattern to avoid circular
        dependency with UserPool (which references this Lambda).
        """
        role = iam.Role(
            self,
            "CognitoLambdaRole",
            role_name=self.config.resource_name("cognito-lambda-role"),
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "service-role/AWSLambdaBasicExecutionRole"
                ),
            ],
        )

        # CloudFormation describe stacks - scoped to project stacks
        role.add_to_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=["cloudformation:DescribeStacks"],
                resources=[
                    f"arn:aws:cloudformation:{self.region}:{self.account}:stack/{self.config.prefix}-*/*",
                ],
            )
        )

        # SNS publish - scoped to project topics
        role.add_to_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=["sns:Publish"],
                resources=[
                    f"arn:aws:sns:{self.region}:{self.account}:{self.config.prefix}-*",
                ],
            )
        )

        # X-Ray tracing permissions - scoped to account
        role.add_to_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=[
                    "xray:PutTraceSegments",
                    "xray:PutTelemetryRecords",
                ],
                resources=[
                    f"arn:aws:xray:{self.region}:{self.account}:*",
                ],
            )
        )

        # Cognito admin permissions - scoped to project user pools
        # Note: We use a broad resource pattern because the user pool ID is not known
        # at role creation time (circular dependency). The Lambda only operates on
        # the user pool that triggers it.
        role.add_to_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=["cognito-idp:AdminAddUserToGroup"],
                resources=[
                    f"arn:aws:cognito-idp:{self.region}:{self.account}:userpool/*",
                ],
            )
        )

        return role

    def _create_post_confirmation_trigger(self) -> lambda_.Function:
        """Create Lambda function for post user confirmation trigger."""
        trigger_code = """
import json
import boto3

client = boto3.client('cognito-idp')

def lambda_handler(event, context):
    print("Event received:", json.dumps(event))

    if 'userName' not in event or event['userName'] is None:
        raise ValueError('userName is required')

    if 'userPoolId' not in event or event['userPoolId'] is None:
        raise ValueError('userPoolId is required')

    try:
        client.admin_add_user_to_group(
            UserPoolId=event['userPoolId'],
            Username=event['userName'],
            GroupName='USER'
        )
        print(f"User {event['userName']} added to USER group")
        return event
    except Exception as e:
        print(f"Error adding user to group: {str(e)}")
        raise
"""

        function = lambda_.Function(
            self,
            "PostUserConfirmationTrigger",
            function_name=self.config.resource_name("PostUserConfirmationTrigger"),
            description="Watches for new user created and assigns a default user group",
            runtime=lambda_.Runtime.PYTHON_3_13,
            handler="index.lambda_handler",
            code=lambda_.Code.from_inline(trigger_code.strip()),
            timeout=Duration.seconds(30),
            memory_size=256,
            role=self.lambda_role,
            tracing=lambda_.Tracing.ACTIVE,
        )

        # Note: Cognito permissions are added after user pool creation in _create_user_pool
        # to properly scope to the specific user pool ARN

        return function

    def _create_user_pool(self) -> cognito.UserPool:
        """Create Cognito User Pool with password policies and MFA."""
        user_pool = cognito.UserPool(
            self,
            "UserPool",
            user_pool_name=self.config.resource_name("user-pool"),
            self_sign_up_enabled=True,
            sign_in_aliases=cognito.SignInAliases(email=True),
            auto_verify=cognito.AutoVerifiedAttrs(email=True),
            standard_attributes=cognito.StandardAttributes(
                email=cognito.StandardAttribute(required=True, mutable=True),
                phone_number=cognito.StandardAttribute(required=False, mutable=True),
            ),
            password_policy=cognito.PasswordPolicy(
                min_length=8,
                require_lowercase=True,
                require_uppercase=True,
                require_digits=True,
                require_symbols=True,
                temp_password_validity=Duration.days(7),
            ),
            mfa=cognito.Mfa.REQUIRED,
            mfa_second_factor=cognito.MfaSecondFactor(
                sms=True,
                otp=True,
            ),
            # SEC-FINDING-009: Enable Plus tier for threat protection
            # Plus tier required for threat protection features
            # Cost: $0.02/MAU (no free tier) vs Essentials $0.015/MAU (10K free)
            feature_plan=cognito.FeaturePlan.PLUS,
            # Enable full threat protection - detects compromised credentials,
            # suspicious sign-ins, and takes automatic preventative actions
            standard_threat_protection_mode=cognito.StandardThreatProtectionMode.FULL_FUNCTION,
            device_tracking=cognito.DeviceTracking(
                challenge_required_on_new_device=True,
                device_only_remembered_on_user_prompt=True,
            ),
            user_invitation=cognito.UserInvitationConfig(
                email_subject=f"Welcome to Orb Integration Hub",
                email_body=f"""Your account for Orb Integration Hub has been created.
Your username is {{username}} and temporary password is {{####}}.
Please login at: https://orb-integration-hub.com/authenticate/""",
            ),
            sms_role=self.cognito_sms_role,
            sms_role_external_id=f"{self.config.prefix}-cognito-sms",
            lambda_triggers=cognito.UserPoolTriggers(
                post_confirmation=self.post_confirmation_trigger,
            ),
            removal_policy=RemovalPolicy.RETAIN,
        )

        # Grant the Lambda permission to be invoked by Cognito
        self.post_confirmation_trigger.add_permission(
            "CognitoInvoke",
            principal=iam.ServicePrincipal("cognito-idp.amazonaws.com"),
            source_arn=user_pool.user_pool_arn,
        )

        return user_pool

    def _create_user_pool_client(self) -> cognito.UserPoolClient:
        """Create User Pool Client for frontend authentication."""
        return cognito.UserPoolClient(
            self,
            "UserPoolClient",
            user_pool_client_name=self.config.resource_name("user-pool-client"),
            user_pool=self.user_pool,
            generate_secret=False,
            auth_flows=cognito.AuthFlow(
                user_password=True,
                user_srp=True,
            ),
            prevent_user_existence_errors=True,
        )

    def _create_user_groups(self) -> None:
        """Create user groups in the User Pool."""
        for group_name, description in self.USER_GROUPS:
            cognito.CfnUserPoolGroup(
                self,
                f"{group_name}Group",
                group_name=group_name,
                user_pool_id=self.user_pool.user_pool_id,
                description=description,
            )

    def _create_identity_pool(self) -> cognito.CfnIdentityPool:
        """Create Identity Pool for federated identities."""
        return cognito.CfnIdentityPool(
            self,
            "IdentityPool",
            identity_pool_name=self.config.resource_name("identity-pool"),
            allow_unauthenticated_identities=False,
            cognito_identity_providers=[
                cognito.CfnIdentityPool.CognitoIdentityProviderProperty(
                    client_id=self.user_pool_client.user_pool_client_id,
                    provider_name=self.user_pool.user_pool_provider_name,
                )
            ],
        )

    def _create_cognito_logs_bucket(self) -> s3.Bucket:
        """Create S3 bucket for Cognito logs."""
        return s3.Bucket(
            self,
            "CognitoLogsBucket",
            bucket_name=self.config.resource_name("cognito-logs"),
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            lifecycle_rules=[
                s3.LifecycleRule(
                    id=self.config.resource_name("lifecycle-rule"),
                    expiration=Duration.days(14),
                    enabled=True,
                )
            ],
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
        )

    def _create_authorized_role(self) -> iam.Role:
        """Create IAM role for authenticated Cognito users."""
        role = iam.Role(
            self,
            "AuthorizedRole",
            role_name=self.config.resource_name("authorized-role"),
            assumed_by=iam.FederatedPrincipal(
                "cognito-identity.amazonaws.com",
                conditions={
                    "StringEquals": {
                        "cognito-identity.amazonaws.com:aud": self.identity_pool.ref
                    },
                    "ForAnyValue:StringLike": {
                        "cognito-identity.amazonaws.com:amr": "authenticated"
                    },
                },
                assume_role_action="sts:AssumeRoleWithWebIdentity",
            ),
            path="/",
        )

        # Cognito sync and identity permissions
        role.add_to_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=[
                    "mobileanalytics:PutEvents",
                    "cognito-sync:*",
                    "cognito-identity:*",
                ],
                resources=["*"],
            )
        )

        # S3 bucket access for logs
        role.add_to_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=["s3:PutObject"],
                resources=[f"{self.cognito_logs_bucket.bucket_arn}/*"],
            )
        )

        return role

    def _create_identity_pool_role_attachment(self) -> cognito.CfnIdentityPoolRoleAttachment:
        """Attach roles to the Identity Pool."""
        return cognito.CfnIdentityPoolRoleAttachment(
            self,
            "IdentityPoolRoleAttachment",
            identity_pool_id=self.identity_pool.ref,
            roles={
                "authenticated": self.authorized_role.role_arn,
            },
            role_mappings={
                "UserPool": cognito.CfnIdentityPoolRoleAttachment.RoleMappingProperty(
                    identity_provider=f"cognito-idp.{self.region}.amazonaws.com/{self.user_pool.user_pool_id}:{self.user_pool_client.user_pool_client_id}",
                    ambiguous_role_resolution="AuthenticatedRole",
                    type="Token",
                )
            },
        )

    def _create_sms_verification_topic(self) -> sns.Topic:
        """Create SNS topic for SMS verification codes."""
        topic = sns.Topic(
            self,
            "SMSVerificationCodeTopic",
            topic_name=self.config.resource_name("phone-number-verification"),
            display_name=self.config.resource_name("phone-number-verification"),
        )

        # Export topic ARN to SSM
        ssm.StringParameter(
            self,
            "SMSVerificationCodeTopicArnParameter",
            parameter_name=self.config.ssm_parameter_name("cognito/phone-number-verification-topic/arn"),
            string_value=topic.topic_arn,
            description="SMS Verification Code Topic ARN",
        )

        return topic

    def _create_ssm_parameters(self) -> None:
        """Create SSM parameters for cross-stack references."""
        # User Pool ID
        ssm.StringParameter(
            self,
            "UserPoolIdParameter",
            parameter_name=self.config.ssm_parameter_name("cognito/user-pool-id"),
            string_value=self.user_pool.user_pool_id,
            description="Cognito User Pool ID",
        )

        # User Pool Client ID
        ssm.StringParameter(
            self,
            "UserPoolClientIdParameter",
            parameter_name=self.config.ssm_parameter_name("cognito/client-id"),
            string_value=self.user_pool_client.user_pool_client_id,
            description="Cognito User Pool Client ID for frontend authentication",
        )

        # QR Issuer for TOTP MFA
        ssm.StringParameter(
            self,
            "CognitoQrIssuerParameter",
            parameter_name=self.config.ssm_parameter_name("cognito/qr-issuer"),
            string_value=self.config.prefix,
            description="QR code issuer name for TOTP MFA setup",
        )

        # Identity Pool ID
        ssm.StringParameter(
            self,
            "IdentityPoolIdParameter",
            parameter_name=self.config.ssm_parameter_name("cognito/identity-pool-id"),
            string_value=self.identity_pool.ref,
            description="Cognito Identity Pool ID",
        )

        # User Pool ARN
        ssm.StringParameter(
            self,
            "UserPoolArnParameter",
            parameter_name=self.config.ssm_parameter_name("cognito/user-pool-arn"),
            string_value=self.user_pool.user_pool_arn,
            description="Cognito User Pool ARN",
        )
