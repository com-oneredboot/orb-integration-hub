# Cross-Team Issue Tracking

## Current Blockers

| Issue | Team | Title | Status | Impact |
|-------|------|-------|--------|--------|
| #91 | orb-schema-generator | Feature Request: Custom Lambda Operations for lambda-dynamodb Tables | Open | High |
| #84 | orb-schema-generator | Bug: TypeScript Generator Creates Duplicate Query Input Types for GSIs with Same Partition Key | Open | High |
| #83 | orb-schema-generator | Enhancement: Multi-AppSync API Support with Lambda Authorizer | Open | High |
| #78 | orb-schema-generator | Bug: Mutation VTL Response Doesn't Match GraphQL Schema (items wrapper mismatch) | Open | High |
| #76 | orb-schema-generator | Bug: VTL Resolvers Use ISO8601 Instead of Epoch Seconds for AWSTimestamp Fields | Open | High |
| #17 | orb-infrastructure | feat: Add timestamp utilities to orb-common for AWSTimestamp handling | Open | Medium |
| #73 | orb-schema-generator | Enhancement: AppSyncApi Construct Missing Production Features (X-Ray, Secrets Manager, Scoped IAM) | Open | Medium |
| #70 | orb-schema-generator | Bug: Lambda schema generates all attributes in both Input and Output types | Open | Critical |
| #69 | orb-schema-generator | Bug: Generated Python files fail black and ruff linting | Open | High |
| #64 | orb-schema-generator | Enhancement: Generate SSM parameters for DynamoDB table ARNs and names | Open | Low |
| #65 | orb-schema-generator | Enhancement: Support PITR configuration in DynamoDB table schemas | Open | Low |
| #66 | orb-schema-generator | Documentation: Add schema type generation matrix and construct extension examples | Open | Low |
| #51 | orb-templates | Add Kiro Hooks Guidance and Recommended Hooks Library | Open | High |
| #50 | orb-templates | Update CodeArtifact Integration Guide for pipenv Package Source Specification | Open | High |
| #43 | orb-templates | Add Guidance: pipenv + CodeArtifact Package Installation Workaround | Open | High |
| #53 | orb-templates | Add Windows Support for MCP Installation Script | Open | Medium |
| #40 | orb-templates | orb-templates-mcp: uvx cannot authenticate with CodeArtifact | Open | High |
| #39 | orb-templates | Add AWS Resource Naming Conventions for Secrets Manager and CloudWatch Logs | Open | Medium |
| #37 | orb-templates | Add Guidance: Use pipenv sync for CI with CodeArtifact Dependencies | Open | Medium |
| #36 | orb-templates | Add 'No CloudFormation Outputs' Rule to Infrastructure Standards | Open | Medium |
| #1 | orb-geo-fence | Remove default fallback for environment in deploy-infrastructure.yml | Open | Low |
| #2 | orb-geo-fence | Add CDK pytest tests to deploy-infrastructure workflow | Open | Low |


## Resolved Issues

| Issue | Team | Title | Resolution Date |
|-------|------|-------|-----------------|
| #81 | orb-schema-generator | VTL Generator Creates Query Prefix for Disable Operations Instead of Mutation | 2026-01-27 |
| #80 | orb-schema-generator | CDK code generation missing Get and ListBy resolvers | 2026-01-27 |
| #79 | orb-schema-generator | Bug: TypeScript GraphQL Query Generator Not Updated for v0.19.0 Response Format | 2026-01-26 |
| #19 | orb-infrastructure | Enhancement: Add UUID Utilities to orb-common for All Supported Languages | 2026-01-24 |
| #77 | orb-schema-generator | VTL Generator includes sort key in partition-only GSI queries | 2026-01-24 |
| #75 | orb-schema-generator | Bug: Lambda Type Auth Directives Not Generated in GraphQL Schema | 2026-01-20 |
| #74 | orb-schema-generator | Bug: Lambda Data Source Uses from_function_arn Instead of from_function_attributes | 2026-01-20 |
| #72 | orb-schema-generator | Bug: Generated AppSyncApi Construct Has Hardcoded Values - Not Usable as Subcomponent | 2026-01-17 |
| #71 | orb-schema-generator | TypeScript Generator Missing Timestamp Conversion for AWSTimestamp | 2026-01-17 |
| #67 | orb-schema-generator | Bug: apiKeyAuthentication directive not rendered in GraphQL schema | 2026-01-17 |
| #68 | orb-schema-generator | Enhancement: Generate Lambda Data Sources and Resolvers for LambdaType Schemas | 2026-01-17 |
| #15 | orb-infrastructure | Cognito SMS Role Missing Permission for Direct SMS Publishing | 2026-01-16 |
| #63 | orb-schema-generator | Enhancement: Generate GraphQL operations for Lambda types | 2026-01-15 |
| #62 | orb-schema-generator | TypeScript model references wrong enum case (UNKNOWN vs Unknown) | 2026-01-15 |
| #61 | orb-schema-generator | Enhancement: Generate TypeScript GraphQL Query Definition Files | 2026-01-15 |
| #59 | orb-schema-generator | Generated TypeScript models have ESLint violations | 2026-01-14 |
| #13 | orb-infrastructure | CI Environment OIDC Role for CodeArtifact Access | 2026-01-14 |
| #34 | orb-templates | Add guidance on running CDK tests in deploy workflows | 2026-01-11 |
| #12 | orb-infrastructure | Add orb-integration-hub to GitHub Actions OIDC trust policy | 2026-01-10 |
| #33 | orb-templates | Add guidance on avoiding default fallbacks in workflows | 2026-01-10 |
| #58 | orb-schema-generator | GraphQL enum values generated with invalid hyphens | 2026-01-10 |
