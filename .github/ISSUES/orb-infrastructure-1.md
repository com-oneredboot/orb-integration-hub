## Summary

The `orb-infrastructure-dev-github-actions` IAM role needs to be updated to trust the `com-oneredboot/orb-integration-hub` repository for OIDC authentication.

## Error

```
Could not assume role with OIDC: Not authorized to perform sts:AssumeRoleWithWebIdentity
```

Role ARN: `arn:aws:iam::432045270100:role/orb-infrastructure-dev-github-actions`

## Request

Please update the IAM role's trust policy to allow OIDC authentication from:
- Repository: `com-oneredboot/orb-integration-hub`
- Environment: `dev` (and eventually `staging`, `prod`)

## Context

We are migrating orb-integration-hub from SAM/CloudFormation to AWS CDK and need GitHub Actions OIDC access to deploy infrastructure.

The workflow is using the same pattern as orb-geo-fence which works correctly.
