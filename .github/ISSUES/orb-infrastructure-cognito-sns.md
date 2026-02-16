# Cognito SMS Role Missing Permission for Direct SMS Publishing

## Summary

Cognito User Pool deployment fails with "Role does not have permission to publish with SNS" when SMS MFA is enabled. The IAM role for Cognito SMS is scoped to SNS topic ARNs but Cognito requires permission to publish directly to phone numbers, which don't have ARNs.

## Error Details

- **Error Code**: 400 InvalidRequest
- **Service**: CognitoIdentityProvider
- **Request ID**: 3b3c0e13-8dd6-474f-8946-00db770074b0
- **Error Message**: `Role does not have permission to publish with SNS`

## Environment Context

- **AWS Region**: us-east-1
- **Repository**: com-oneredboot/orb-integration-hub
- **Workflow**: deploy-infrastructure (GitHub Actions)
- **Stack**: Cognito Stack (CDK)

## Root Cause Analysis

The Cognito SMS role in `infrastructure/cdk/stacks/cognito_stack.py` has SNS permissions scoped to topic ARNs:

```python
role.add_to_policy(
    iam.PolicyStatement(
        effect=iam.Effect.ALLOW,
        actions=["sns:Publish"],
        resources=[
            f"arn:aws:sns:{self.region}:{self.account}:*",
        ],
    )
)
```

However, Cognito SMS MFA uses **direct SMS publishing** to phone numbers, not SNS topics. Phone numbers don't have ARNs - they use the format `+1234567890`. AWS documentation states that for direct SMS publishing, the resource must be `*` because there's no ARN for phone numbers.

## AWS Documentation Reference

From [AWS SNS SMS Permissions](https://docs.aws.amazon.com/sns/latest/dg/sms_publish-to-phone.html):
> To publish to a phone number, you must specify `*` as the resource because phone numbers don't have ARNs.

## Proposed Fix

Update the Cognito SMS role policy to allow direct SMS publishing:

```python
role.add_to_policy(
    iam.PolicyStatement(
        effect=iam.Effect.ALLOW,
        actions=["sns:Publish"],
        resources=["*"],  # Required for direct SMS to phone numbers
        conditions={
            "StringEquals": {
                "sns:Protocol": "sms"
            }
        }
    )
)
```

Or alternatively, use a condition to restrict to SMS protocol while allowing the wildcard resource.

## Impact

- **Severity**: High - Blocks all Cognito deployments with SMS MFA enabled
- **Affected Teams**: Any team using Cognito with SMS MFA
- **Workaround**: None - SMS MFA cannot be enabled without this fix

## Reproduction Steps

1. Deploy CDK stack with Cognito User Pool configured for SMS MFA
2. Cognito attempts to validate the SMS role permissions
3. Deployment fails with "Role does not have permission to publish with SNS"

## Reporting Team

- **Team**: orb-integration-hub
- **Contact**: @fishbeak
