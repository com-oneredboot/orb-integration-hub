# Deployment Instructions for Schema Updates

To deploy the updated GraphQL schema with the `phone_verified` field to AWS AppSync, follow these steps:

## 1. Upload the schema to S3 (Required for CloudFormation)

The AppSync CloudFormation template references the schema file from S3, not directly from your local files. You need to upload the schema to S3 first:

```bash
# Upload the schema to S3 (replace with your actual bucket name)
aws s3 cp schema.graphql s3://${CustomerId}-${ProjectId}-build-templates/appsync.graphql

# Example:
# aws s3 cp schema.graphql s3://orb-integration-hub-build-templates/appsync.graphql
```

## 2. Deploy the updated GraphQL schema directly (Alternative Approach)

If you want to update the schema immediately without redeploying the entire CloudFormation stack, you can use one of these methods:

### Option A: Using AWS Console
1. Log into the AWS Console
2. Navigate to AppSync
3. Select the AppSync API (name should be: `${CustomerId}-${ProjectId}-${Environment}-appsync`, e.g. `orb-integration-hub-dev-appsync`)
4. Go to "Schema" in the left sidebar
5. Replace the existing schema with the contents of `schema.graphql` from this directory
6. Click "Save Schema"

### Option B: Using AWS CLI
```bash
# Update the API ID in this command
aws appsync start-schema-creation \
    --api-id oyhrvyclkrdvllow64n6psyota \
    --definition file://schema.graphql
    
# Check status of schema update (optional)
aws appsync get-schema-creation-status --api-id oyhrvyclkrdvllow64n6psyota
```

**Important Note**: If you use either Option A or B to update the schema directly, the next time the CloudFormation stack is deployed, it will override your changes with the schema from S3. Always upload to S3 first.

## 3. Deploy the updated DynamoDB table (if needed)

If using CloudFormation for DynamoDB table management:

```bash
# Update the stack name in this command
aws cloudformation update-stack \
    --stack-name orb-integration-hub-dynamodb \
    --template-body file://dynamodb.yml \
    --capabilities CAPABILITY_IAM
```

## 4. Verify Deployment

After deployment, test the schema by:

1. Using the AppSync query editor to test a query including the `phone_verified` field
2. Check the DynamoDB table schema in the AWS Console to ensure the `phone_verified` field exists

## 5. Re-enable Frontend Features

Once deployment is confirmed, uncomment the `phone_verified` field in:
1. `frontend/src/app/core/models/user.model.ts` - userQueryById and userUpdateMutation
2. `frontend/src/app/core/services/user.service.ts` - verifySMSCode method
3. Update UserUpdateInput type to include phone_verified

## Implementation Note

The DynamoDB table doesn't strictly need to be updated since DynamoDB is schemaless, but updating the CloudFormation template ensures that your infrastructure-as-code stays in sync with your application code.