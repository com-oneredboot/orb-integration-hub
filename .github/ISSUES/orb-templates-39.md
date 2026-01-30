# Add AWS Resource Naming Conventions for Secrets Manager and CloudWatch Logs

## Summary

The CDK coding standards document needs guidance on naming conventions for Secrets Manager and CloudWatch Logs. Currently, only SSM Parameter Store naming is documented.

## Current State

The `docs/coding-standards/cdk.md` and `docs/coding-standards/environment-designators.md` documents define SSM Parameter Store naming:

```
/{customer_id}/{project_id}/{environment}/{resource_type}/{resource}
```

Example: `/orb/integration-hub/dev/cognito/user-pool-id`

However, there's no guidance for:
1. **Secrets Manager** - Should follow the same slash-based pattern
2. **CloudWatch Logs** - Should document that AWS defaults are acceptable

## Proposed Additions

### Secrets Manager Naming Convention

Add to `docs/coding-standards/cdk.md`:

```markdown
### Secrets Manager Naming

Secrets Manager names should follow the same slash-based pattern as SSM Parameters:

```
/{customer_id}/{project_id}/{environment}/secrets/{service}/{resource}
```

Examples:
- `/orb/integration-hub/dev/secrets/github/access-key`
- `/orb/integration-hub/dev/secrets/appsync/api-key`
- `/orb/sdt-pipeline/dev/secrets/ai/claude-api-key`

**Benefits:**
- Consistent with SSM Parameter Store naming
- Creates logical hierarchy in AWS Console
- Enables cross-project tooling and IAM policies
```

### CloudWatch Log Group Naming Convention

Add to `docs/coding-standards/cdk.md`:

```markdown
### CloudWatch Log Group Naming

CloudWatch Log Groups should use AWS default naming conventions:

| Resource Type | Pattern | Example |
|---------------|---------|---------|
| Lambda | `/aws/lambda/{function-name}` | `/aws/lambda/orb-integration-hub-dev-users` |
| Step Functions | `/aws/stepfunctions/{state-machine-name}` | `/aws/stepfunctions/orb-sdt-pipeline-dev` |
| API Gateway | `/aws/apigateway/{api-id}/{stage}` | `/aws/apigateway/abc123/prod` |
| Custom/Audit | `/{category}/{customer_id}-{project_id}-{environment}-{purpose}` | `/audit/orb-integration-hub-dev-security` |

**Note:** Lambda, Step Functions, and API Gateway log groups are typically created automatically by AWS with default naming. Custom log groups (e.g., audit logs) should use a descriptive category prefix.
```

## Why This Matters

- **Consistency**: Developers only need to remember one pattern for hierarchical resources
- **Discoverability**: Slash-based paths create logical hierarchy in AWS Console
- **Tooling**: Enables IAM policies like `arn:aws:secretsmanager:*:*:secret:/orb/integration-hub/*`
- **Cross-project**: Other orb projects (sdt-pipeline, geo-fence) already use slash-based secrets

## Related

- Issue #32 in orb-integration-hub: Secrets Manager naming convention uses dashes instead of slashes
