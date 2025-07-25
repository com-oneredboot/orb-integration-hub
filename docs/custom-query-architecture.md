# Custom Query Architecture for GraphQL

## Overview

The ORB Integration Hub supports a custom query architecture that allows developers to define complex GraphQL queries directly in YAML entity schemas. This system maintains the benefits of schema-driven development while providing flexibility for queries that require aggregation, cross-table joins, or custom business logic.

## Architecture Design

### Query Types

The system supports two types of queries:

1. **Auto-generated Queries**: Standard CRUD operations generated automatically for all entities
2. **Custom Queries**: Complex queries defined in YAML that require special handling

### Key Components

```
┌─────────────────────────────────────────────────────────────┐
│                    YAML Entity Schema                        │
│  ┌─────────────────┐       ┌────────────────────────────┐  │
│  │ Standard Fields │       │    customQueries:          │  │
│  │ - attributes    │       │    - name: CustomQuery     │  │
│  │ - keys          │       │    - type: aggregation     │  │
│  │ - authConfig    │       │    - input: {...}          │  │
│  └─────────────────┘       │    - returns: [...]         │  │
│                            └────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│                       generate.py                            │
│  ┌─────────────────┐       ┌────────────────────────────┐  │
│  │  YAML Parser    │       │  Custom Query Processor    │  │
│  │                 │ ───▶  │  - Validates definitions   │  │
│  │                 │       │  - Generates schema        │  │
│  └─────────────────┘       │  - Creates TypeScript      │  │
│                            └────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴────────────────┐
                    ▼                                ▼
┌─────────────────────────────┐    ┌─────────────────────────────┐
│    GraphQL Schema Output    │    │  Lambda Resolver Function   │
│  type Query {               │    │  - Custom business logic    │
│    CustomQuery(...): [...]  │    │  - Aggregation queries      │
│  }                          │    │  - Cross-table joins        │
└─────────────────────────────┘    └─────────────────────────────┘
```

## YAML Schema Definition

### Basic Structure

Custom queries are defined in the `customQueries` section of entity YAML files:

```yaml
# schemas/entities/Organizations.yml
customQueries:
  - name: OrganizationsWithDetailsQueryByOwnerId
    type: aggregation
    description: Get organizations with user role, member count, and application count
    input:
      ownerId:
        type: String!
        description: ID of the user to get organizations for
    returns: '[OrganizationWithDetails]'
    enrichments:
      - field: userRole
        type: lookup
        source: OrganizationUsers
      - field: memberCount
        type: count
        source: OrganizationUsers
      - field: applicationCount
        type: count
        source: Applications
```

### Field Definitions

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | GraphQL query name (must be unique) |
| `type` | Yes | Query type: `aggregation` or `custom` |
| `description` | Yes | Query description for documentation |
| `input` | Yes | Input arguments with types and descriptions |
| `returns` | Yes | Return type (can be array with `[Type]`) |
| `enrichments` | No | Data enrichment definitions for aggregation queries |

### Input Definition

Input fields support standard GraphQL types:

```yaml
input:
  userId:
    type: String!
    description: User identifier
  limit:
    type: Int
    description: Maximum results (optional)
  filter:
    type: FilterInput
    description: Custom filter object
```

### Return Types

Return types can be:
- Existing entity types: `Organizations`
- Arrays: `[Organizations]`
- Custom types: `OrganizationWithDetails`
- Complex types: `[OrganizationWithDetails]`

## Implementation Guide

### Step 1: Define the Query in YAML

Add a custom query to your entity's YAML file:

```yaml
customQueries:
  - name: MyCustomQuery
    type: aggregation
    description: Description of what this query does
    input:
      param1:
        type: String!
        description: Required parameter
      param2:
        type: Int
        description: Optional parameter
    returns: '[MyReturnType]'
```

### Step 2: Run Schema Generation

Execute the generation script to create GraphQL schema and TypeScript types:

```bash
cd schemas
pipenv run python generate.py
```

This generates:
- GraphQL schema with the custom query
- TypeScript types for inputs and outputs
- Resolver configuration in AppSync

### Step 3: Implement the Lambda Resolver

Create a Lambda function to handle the custom query logic:

```python
# backend/src/lambdas/organizations/custom_queries.py
import boto3
from typing import List, Dict, Any

def organizations_with_details_handler(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle OrganizationsWithDetailsQueryByOwnerId custom query
    """
    owner_id = event['arguments']['ownerId']
    
    # Query organizations
    organizations = query_organizations_by_owner(owner_id)
    
    # Enrich with additional data
    for org in organizations:
        org['userRole'] = get_user_role(owner_id, org['organizationId'])
        org['memberCount'] = count_organization_members(org['organizationId'])
        org['applicationCount'] = count_organization_applications(org['organizationId'])
    
    return {
        'statusCode': 200,
        'data': organizations
    }
```

### Step 4: Configure AppSync Resolver

The resolver configuration is automatically generated, linking the GraphQL query to your Lambda function:

```yaml
# Generated in infrastructure/cloudformation/appsync.yml
OrganizationsWithDetailsQueryByOwnerIdResolver:
  Type: AWS::AppSync::Resolver
  Properties:
    ApiId: !GetAtt GraphQLApi.ApiId
    TypeName: Query
    FieldName: OrganizationsWithDetailsQueryByOwnerId
    DataSourceName: OrganizationsLambdaDataSource
    RequestMappingTemplate: |
      {
        "version": "2017-02-28",
        "operation": "Invoke",
        "payload": {
          "field": "OrganizationsWithDetailsQueryByOwnerId",
          "arguments": $util.toJson($context.arguments)
        }
      }
```

## Example: OrganizationsWithDetails Query

### YAML Definition

```yaml
customQueries:
  - name: OrganizationsWithDetailsQueryByOwnerId
    type: aggregation
    description: Get organizations with user role, member count, and application count
    input:
      ownerId:
        type: String!
        description: ID of the user to get organizations for
    returns: '[OrganizationWithDetails]'
```

### Generated GraphQL Schema

```graphql
type Query {
  OrganizationsWithDetailsQueryByOwnerId(ownerId: String!): [OrganizationWithDetails]
}

type OrganizationWithDetails {
  organizationId: String!
  name: String!
  description: String
  ownerId: String!
  status: OrganizationStatus!
  createdAt: String!
  updatedAt: String!
  userRole: String!
  memberCount: Int!
  applicationCount: Int!
}
```

### Frontend Usage

```typescript
// Generated TypeScript query
import { API, graphqlOperation } from 'aws-amplify';
import { organizationsWithDetailsQueryByOwnerId } from './graphql/queries';

const fetchOrganizationsWithDetails = async (ownerId: string) => {
  const response = await API.graphql(
    graphqlOperation(organizationsWithDetailsQueryByOwnerId, { ownerId })
  );
  return response.data.OrganizationsWithDetailsQueryByOwnerId;
};
```

## Best Practices

### 1. Naming Conventions

- Use descriptive query names: `OrganizationsWithDetailsQueryByOwnerId`
- Include the primary filter in the name: `QueryByOwnerId`, `QueryByStatus`
- Use consistent suffixes: `Query` for queries, `Mutation` for mutations

### 2. Performance Optimization

- Design queries to minimize N+1 problems
- Use batch operations when querying related data
- Implement caching strategies in Lambda resolvers
- Consider pagination for large result sets

### 3. Error Handling

```python
def custom_query_handler(event):
    try:
        # Query logic
        return {
            'statusCode': 200,
            'data': results
        }
    except ValidationError as e:
        return {
            'statusCode': 400,
            'error': str(e)
        }
    except Exception as e:
        logger.error(f"Query failed: {str(e)}")
        return {
            'statusCode': 500,
            'error': 'Internal server error'
        }
```

### 4. Security Considerations

- Always validate input parameters
- Implement proper authorization checks
- Filter sensitive fields from responses
- Use field-level authorization when needed

### 5. Testing Strategy

```python
# tests/test_custom_queries.py
def test_organizations_with_details_query():
    # Test with valid owner ID
    result = handler({
        'arguments': {'ownerId': 'user123'}
    })
    assert result['statusCode'] == 200
    assert len(result['data']) > 0
    
    # Test enrichment fields
    org = result['data'][0]
    assert 'userRole' in org
    assert 'memberCount' in org
    assert 'applicationCount' in org
```

## Troubleshooting

### Common Issues

1. **Query Not Appearing in GraphQL Schema**
   - Verify YAML syntax is correct
   - Check that generate.py completed successfully
   - Ensure CloudFormation deployment succeeded

2. **Lambda Resolver Not Found**
   - Verify Lambda function name matches configuration
   - Check IAM permissions for AppSync to invoke Lambda
   - Review CloudWatch logs for errors

3. **Type Mismatch Errors**
   - Ensure return type matches YAML definition
   - Verify all required fields are present
   - Check nullable field handling

### Debug Checklist

- [ ] YAML syntax is valid
- [ ] Custom query name is unique
- [ ] Input/output types are properly defined
- [ ] Lambda function is deployed
- [ ] AppSync resolver is configured
- [ ] Frontend types are regenerated
- [ ] Authorization rules are applied

## Migration Guide

### Converting Existing Queries

To convert multiple separate queries into a custom aggregation query:

1. Identify queries that can be combined
2. Define the custom query in YAML
3. Implement aggregation logic in Lambda
4. Update frontend to use the new query
5. Remove old queries after verification

### Example Migration

Before (Multiple Queries):
```typescript
// Fetch organization
const org = await getOrganization(orgId);
// Fetch member count
const memberCount = await getOrganizationMemberCount(orgId);
// Fetch user role
const userRole = await getUserOrganizationRole(userId, orgId);
```

After (Single Custom Query):
```typescript
// Fetch everything in one query
const orgWithDetails = await organizationsWithDetailsQuery(userId);
// All data available immediately
console.log(orgWithDetails.memberCount, orgWithDetails.userRole);
```

## Future Enhancements

1. **Query Composition**: Support for query fragments and composition
2. **Caching Strategy**: Built-in caching configuration in YAML
3. **Monitoring**: Automatic performance metrics for custom queries
4. **Versioning**: Support for query versioning and deprecation
5. **Code Generation**: Generate Lambda handler stubs from YAML