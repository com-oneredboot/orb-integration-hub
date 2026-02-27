# Enhance MCP Server with Kiro Powers Integration and Discovery Features

## Summary

The orb-templates MCP server and spec standards should be enhanced to include guidance on Kiro Powers installation and usage, update standard requirements to include observability/IAM/infrastructure/cost requirements, and implement discovery features to help LLMs find relevant updates and recommendations.

## Background

Kiro Powers provide powerful capabilities for production-ready AWS development:
- **aws-observability**: CloudWatch monitoring, alarms, distributed tracing, SLO tracking
- **iam-policy-autopilot-power**: Auto-generate least-privilege IAM policies from Lambda code
- **aws-infrastructure-as-code**: Validate CDK templates, check security compliance, troubleshoot deployments
- **aws-cost-optimization**: Analyze spending, get optimization recommendations

Currently, these powers are not mentioned in orb-templates documentation or spec standards, making them difficult to discover and underutilized.

## Proposed Enhancements

### 1. Add Kiro Powers Installation Guidance

**Location**: `docs/kiro-steering/kiro-powers.md` (new file)

**Content**:
- List of recommended Kiro Powers for orb projects
- Installation instructions for each power
- Use cases and examples for each power
- Integration with existing orb-templates workflows

**Example Structure**:
```markdown
# Kiro Powers for orb Projects

## Recommended Powers

### aws-observability
**Purpose**: Comprehensive AWS monitoring and alerting
**Installation**: Available in Kiro Powers marketplace
**Use Cases**:
- CloudWatch dashboards for Lambda/AppSync/DynamoDB
- Alarms for authentication failures, API errors
- Distributed tracing with X-Ray
- SLO tracking and compliance

### iam-policy-autopilot-power
**Purpose**: Auto-generate least-privilege IAM policies
**Installation**: Available in Kiro Powers marketplace
**Use Cases**:
- Analyze Lambda code for AWS SDK calls
- Generate minimal IAM policies
- Reduce permission troubleshooting time
...
```

### 2. Update Spec Standards to Include Power-Enabled Requirements

**Location**: `docs/kiro-steering/templates/spec-standards.md`

**Changes**:
- Add standard requirements for observability (CloudWatch dashboards, alarms, tracing)
- Add standard requirements for IAM policy automation
- Add standard requirements for infrastructure validation
- Add standard requirements for cost optimization

**Example Addition**:
```markdown
## Standard Requirements for Production Readiness

All production-ready specs MUST include these requirements:

### Observability and Monitoring
- CloudWatch dashboards for key metrics
- Alarms for error rates and performance degradation
- Distributed tracing for debugging
- SLO tracking and compliance reporting

### IAM Policy Automation
- Auto-generated policies from Lambda code analysis
- Least-privilege principle enforcement
- Policy validation against AWS best practices

### Infrastructure Validation
- CDK template validation with cfn-lint
- Security compliance checking with cfn-guard
- Well-Architected Framework compliance

### Cost Optimization
- Resource cost analysis and trending
- Optimization recommendations
- Cost anomaly detection and alerting
```

### 3. Implement "What's New" Discovery Feature

**Location**: MCP server enhancement

**New Tools**:

#### `get_whats_new_tool`
Returns recent updates, new templates, and recommended powers.

**Response Format**:
```json
{
  "last_updated": "2026-02-25",
  "recent_updates": [
    {
      "date": "2026-02-20",
      "category": "kiro-powers",
      "title": "New Kiro Powers Integration Guide",
      "description": "Added comprehensive guide for aws-observability, iam-policy-autopilot, and cost-optimization powers",
      "path": "docs/kiro-steering/kiro-powers.md"
    },
    {
      "date": "2026-02-15",
      "category": "spec-standards",
      "title": "Updated Spec Standards with Production Readiness Requirements",
      "description": "Added standard requirements for observability, IAM automation, infrastructure validation, and cost optimization",
      "path": "docs/kiro-steering/templates/spec-standards.md"
    }
  ],
  "recommended_powers": [
    {
      "name": "aws-observability",
      "reason": "Essential for production monitoring and alerting",
      "use_cases": ["CloudWatch dashboards", "Alarms", "Distributed tracing"]
    },
    {
      "name": "iam-policy-autopilot-power",
      "reason": "Automates IAM policy generation from code",
      "use_cases": ["Lambda policy generation", "Least-privilege enforcement"]
    }
  ]
}
```

#### `get_recommended_powers_tool`
Returns context-aware power recommendations based on project type or keywords.

**Parameters**:
- `context` (optional): Project context (e.g., "serverless", "cdk", "appsync")
- `keywords` (optional): Keywords to match (e.g., "monitoring", "iam", "cost")

**Response Format**:
```json
{
  "recommendations": [
    {
      "power_name": "aws-observability",
      "relevance_score": 0.95,
      "reason": "Your project uses Lambda and AppSync - observability is critical",
      "documentation": "docs/kiro-steering/kiro-powers.md#aws-observability"
    }
  ]
}
```

### 4. Update MCP Server Search to Include Power Documentation

**Enhancement**: Update `search_standards_tool` to include Kiro Powers documentation in search results.

**Example**:
- Query: "monitoring lambda"
- Results should include: aws-observability power documentation, CloudWatch standards, Lambda best practices

### 5. Add Power-Specific Templates

**Location**: `docs/kiro-steering/templates/` (new files)

**New Templates**:
- `observability-requirements-template.md` - Template for observability requirements
- `iam-policy-automation-template.md` - Template for IAM automation requirements
- `infrastructure-validation-template.md` - Template for infrastructure validation requirements
- `cost-optimization-template.md` - Template for cost optimization requirements

## Benefits

1. **Improved Discoverability**: LLMs can easily find and recommend relevant Kiro Powers
2. **Standardization**: All orb projects follow consistent patterns for production readiness
3. **Reduced Manual Work**: Auto-generated IAM policies, infrastructure validation, cost analysis
4. **Better Production Readiness**: Comprehensive monitoring, security, and cost optimization
5. **Faster Development**: Templates and guidance reduce time to implement production features

## Implementation Priority

1. **High Priority**: Add Kiro Powers installation guidance (immediate value)
2. **High Priority**: Update spec standards with power-enabled requirements (standardization)
3. **Medium Priority**: Implement `get_whats_new_tool` (discovery enhancement)
4. **Medium Priority**: Add power-specific templates (developer productivity)
5. **Low Priority**: Implement `get_recommended_powers_tool` (nice-to-have)

## Related Issues

- This enhancement supports production readiness across all orb projects
- Complements existing spec standards and MCP server capabilities
- Aligns with AWS Well-Architected Framework principles

## Acceptance Criteria

1. Kiro Powers installation guide exists in `docs/kiro-steering/kiro-powers.md`
2. Spec standards updated to include observability, IAM, infrastructure, and cost requirements
3. MCP server implements `get_whats_new_tool` with recent updates
4. Search tool includes Kiro Powers documentation in results
5. Power-specific requirement templates available in `docs/kiro-steering/templates/`
6. Documentation includes examples from real orb projects (e.g., orb-integration-hub)

## Example Usage

**Before** (LLM creating a spec):
```
LLM: "I'll create requirements for authentication, user management, and notifications."
```

**After** (LLM with enhanced MCP):
```
LLM: "I'll create requirements for authentication, user management, notifications, 
     plus standard production requirements:
     - Observability (using aws-observability power)
     - IAM automation (using iam-policy-autopilot-power)
     - Infrastructure validation (using aws-infrastructure-as-code power)
     - Cost optimization (using aws-cost-optimization power)"
```

## Notes

- This enhancement was identified while working on orb-integration-hub production readiness
- The production-readiness-features spec demonstrates the value of these requirements
- Implementation should be incremental - start with documentation, then MCP enhancements
