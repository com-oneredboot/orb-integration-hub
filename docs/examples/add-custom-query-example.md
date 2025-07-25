# Example: Adding a New Custom Query

This example demonstrates how to add a new custom query to get all applications with their user counts and active status.

## Step 1: Define the Query in YAML

Add to `schemas/entities/Applications.yml`:

```yaml
customQueries:
  - name: ApplicationsWithUserCountsQuery
    type: aggregation
    description: Get applications with user counts and active user information
    input:
      organizationId:
        type: String!
        description: Organization ID to filter applications
      includeInactive:
        type: Boolean
        description: Include inactive applications (default false)
    returns: '[ApplicationWithUserCounts]'
    enrichments:
      - field: totalUsers
        type: count
        source: ApplicationUsers
      - field: activeUsers
        type: count
        source: ApplicationUsers
        filter: "status = 'ACTIVE'"
      - field: adminCount
        type: count
        source: ApplicationRoles
        filter: "roleId = 'ADMIN'"
```

## Step 2: Define the Return Type

Add to the same YAML file or a separate types file:

```yaml
types:
  ApplicationWithUserCounts:
    fields:
      applicationId: String!
      name: String!
      description: String
      organizationId: String!
      status: ApplicationStatus!
      totalUsers: Int!
      activeUsers: Int!
      adminCount: Int!
      createdAt: String!
      updatedAt: String!
```

## Step 3: Run Schema Generation

```bash
cd schemas
pipenv run python generate.py
```

This generates:
- GraphQL schema with the new query
- TypeScript types and query definitions
- CloudFormation resolver configuration

## Step 4: Implement the Lambda Handler

Create or update `backend/src/lambdas/applications/custom_queries.py`:

```python
import boto3
import json
from typing import Dict, Any, List
from boto3.dynamodb.conditions import Key, Attr
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')

def decimal_default(obj):
    """Helper to serialize Decimal objects"""
    if isinstance(obj, Decimal):
        return int(obj)
    raise TypeError

def applications_with_user_counts_handler(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle ApplicationsWithUserCountsQuery custom query
    
    Args:
        event: AppSync event with arguments
            - organizationId: Filter applications by organization
            - includeInactive: Whether to include inactive applications
    
    Returns:
        List of applications with user count information
    """
    try:
        # Extract arguments
        org_id = event['arguments']['organizationId']
        include_inactive = event['arguments'].get('includeInactive', False)
        
        # Query applications
        apps_table = dynamodb.Table('applications-table')
        
        # Build filter expression
        filter_expr = Key('organizationId').eq(org_id)
        if not include_inactive:
            filter_expr = filter_expr & Attr('status').eq('ACTIVE')
        
        response = apps_table.query(
            IndexName='OrganizationIndex',
            KeyConditionExpression=filter_expr
        )
        
        applications = response.get('Items', [])
        
        # Enrich each application with user counts
        enriched_apps = []
        app_users_table = dynamodb.Table('application-users-table')
        app_roles_table = dynamodb.Table('application-roles-table')
        
        for app in applications:
            app_id = app['applicationId']
            
            # Get total users
            users_response = app_users_table.query(
                IndexName='ApplicationIndex',
                KeyConditionExpression=Key('applicationId').eq(app_id)
            )
            total_users = users_response.get('Count', 0)
            
            # Get active users
            active_users = sum(
                1 for user in users_response.get('Items', [])
                if user.get('status') == 'ACTIVE'
            )
            
            # Get admin count
            roles_response = app_roles_table.query(
                IndexName='ApplicationIndex',
                KeyConditionExpression=Key('applicationId').eq(app_id),
                FilterExpression=Attr('roleId').eq('ADMIN')
            )
            admin_count = roles_response.get('Count', 0)
            
            # Build enriched application object
            enriched_app = {
                **app,
                'totalUsers': total_users,
                'activeUsers': active_users,
                'adminCount': admin_count
            }
            
            enriched_apps.append(enriched_app)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'data': enriched_apps
            }, default=decimal_default)
        }
        
    except KeyError as e:
        return {
            'statusCode': 400,
            'body': json.dumps({
                'error': f'Missing required parameter: {str(e)}'
            })
        }
    except Exception as e:
        print(f"Error in ApplicationsWithUserCountsQuery: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Internal server error'
            })
        }
```

## Step 5: Update Lambda Function Entry Point

Update `backend/src/lambdas/applications/index.py`:

```python
from .custom_queries import applications_with_user_counts_handler

def lambda_handler(event, context):
    """Main Lambda handler"""
    field = event.get('field')
    
    # Route to appropriate handler based on field
    if field == 'ApplicationsWithUserCountsQuery':
        return applications_with_user_counts_handler(event)
    
    # ... existing handlers ...
```

## Step 6: Deploy and Test

1. Deploy the updated Lambda function
2. Deploy the updated AppSync schema
3. Test the query in AppSync console:

```graphql
query GetApplicationsWithCounts {
  ApplicationsWithUserCountsQuery(
    organizationId: "org-123",
    includeInactive: false
  ) {
    applicationId
    name
    status
    totalUsers
    activeUsers
    adminCount
  }
}
```

## Step 7: Use in Frontend

The generated TypeScript code can be used immediately:

```typescript
import { API, graphqlOperation } from 'aws-amplify';
import { applicationsWithUserCountsQuery } from './graphql/queries';

const fetchApplicationsWithCounts = async (orgId: string) => {
  try {
    const response = await API.graphql(
      graphqlOperation(applicationsWithUserCountsQuery, {
        organizationId: orgId,
        includeInactive: false
      })
    );
    
    return response.data.ApplicationsWithUserCountsQuery;
  } catch (error) {
    console.error('Failed to fetch applications:', error);
    throw error;
  }
};

// Use in component
const ApplicationsList: React.FC<{ orgId: string }> = ({ orgId }) => {
  const [apps, setApps] = useState([]);
  
  useEffect(() => {
    fetchApplicationsWithCounts(orgId).then(setApps);
  }, [orgId]);
  
  return (
    <div>
      {apps.map(app => (
        <div key={app.applicationId}>
          <h3>{app.name}</h3>
          <p>Total Users: {app.totalUsers}</p>
          <p>Active Users: {app.activeUsers}</p>
          <p>Admins: {app.adminCount}</p>
        </div>
      ))}
    </div>
  );
};
```

## Common Patterns

### 1. Filtering Pattern

```yaml
enrichments:
  - field: activeCount
    type: count
    source: Users
    filter: "status = 'ACTIVE' AND lastLogin > :thirtyDaysAgo"
```

### 2. Lookup Pattern

```yaml
enrichments:
  - field: ownerDetails
    type: lookup
    source: Users
    key: ownerId
    fields: [name, email, avatar]
```

### 3. Aggregation Pattern

```yaml
enrichments:
  - field: revenue
    type: sum
    source: Transactions
    field: amount
    filter: "status = 'COMPLETED'"
```

## Testing the Custom Query

```python
# test_applications_custom_queries.py
import pytest
from ..custom_queries import applications_with_user_counts_handler

def test_applications_with_counts_success():
    event = {
        'arguments': {
            'organizationId': 'org-123',
            'includeInactive': False
        }
    }
    
    result = applications_with_user_counts_handler(event)
    
    assert result['statusCode'] == 200
    body = json.loads(result['body'])
    assert 'data' in body
    
    # Verify enrichment fields
    if body['data']:
        app = body['data'][0]
        assert 'totalUsers' in app
        assert 'activeUsers' in app
        assert 'adminCount' in app
```