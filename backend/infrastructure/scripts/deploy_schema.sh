#!/bin/bash
# deploy_schema.sh
# Script to update AppSync GraphQL schema
# This script:
# 1. Generates the schema using the schema generator
# 2. Uploads the schema to S3
# 3. Updates the AppSync API directly

set -e  # Exit on any error

# Configuration
CUSTOMER_ID=${CUSTOMER_ID:-orb}
PROJECT_ID=${PROJECT_ID:-integration-hub}
ENVIRONMENT=${ENVIRONMENT:-dev}
SCHEMA_PATH="../cloudformation/schema.graphql"
S3_BUCKET="${CUSTOMER_ID}-${PROJECT_ID}-build-templates"
S3_KEY="appsync.graphql"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to display step information
step() {
  echo -e "${GREEN}==> $1${NC}"
}

# Function to display warnings
warn() {
  echo -e "${YELLOW}WARNING: $1${NC}"
}

# Function to display errors and exit
error() {
  echo -e "${RED}ERROR: $1${NC}"
  exit 1
}

# Check if schema.graphql exists
step "Checking if the schema file exists..."
if [ ! -f "$SCHEMA_PATH" ]; then
  warn "Schema file not found. You may need to run the schema generator first."
  read -p "Do you want to run the schema generator now? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    step "Running schema generator to create the latest schema..."
    cd ../../../schemas
    ./run-generator.sh
    
    # Change back to the scripts directory
    cd ../backend/infrastructure/scripts
    
    # Verify the schema.graphql file was created
    if [ ! -f "$SCHEMA_PATH" ]; then
      error "Schema file not found after generation. Check the generator script for errors."
    fi
  else
    error "Schema file not found. Cannot proceed with deployment."
  fi
fi

# Get the AppSync API ID
step "Retrieving AppSync API ID..."
API_ID=$(aws appsync list-graphql-apis --query "graphqlApis[?name=='${CUSTOMER_ID}-${PROJECT_ID}-${ENVIRONMENT}-appsync'].apiId" --output text)

if [ -z "$API_ID" ]; then
  error "Could not find AppSync API with name '${CUSTOMER_ID}-${PROJECT_ID}-${ENVIRONMENT}-appsync'"
fi

step "Found AppSync API with ID: $API_ID"

# Upload schema to S3
step "Uploading schema to S3..."
aws s3 cp $SCHEMA_PATH s3://${S3_BUCKET}/${S3_KEY}

if [ $? -ne 0 ]; then
  error "Failed to upload schema to S3. Check S3 bucket name and permissions."
fi

step "Schema uploaded to s3://${S3_BUCKET}/${S3_KEY}"

# Update the CloudFormation stack
step "Checking if appsync stack exists..."
if aws cloudformation describe-stacks --stack-name "${CUSTOMER_ID}-${PROJECT_ID}-${ENVIRONMENT}-appsync" &> /dev/null; then
  step "Updating the AppSync stack to reference the new schema..."
  
  # Update the stack to use the new schema
  aws cloudformation update-stack \
    --stack-name "${CUSTOMER_ID}-${PROJECT_ID}-${ENVIRONMENT}-appsync" \
    --template-body file://../cloudformation/appsync.yml \
    --parameters ParameterKey=Environment,ParameterValue=${ENVIRONMENT} \
                 ParameterKey=CustomerId,ParameterValue=${CUSTOMER_ID} \
                 ParameterKey=ProjectId,ParameterValue=${PROJECT_ID} \
    --capabilities CAPABILITY_IAM

  if [ $? -ne 0 ]; then
    warn "CloudFormation update-stack command failed. Trying direct schema update..."
  else
    step "CloudFormation stack update initiated. Check AWS console for status."
  fi
else
  warn "AppSync CloudFormation stack not found. Will try direct schema update."
fi

# Update the AppSync schema directly
step "Updating AppSync schema directly..."
aws appsync start-schema-creation \
  --api-id $API_ID \
  --definition file://$SCHEMA_PATH

if [ $? -ne 0 ]; then
  error "Failed to update AppSync schema directly."
fi

step "Schema update initiated. Checking status..."

# Wait for schema update to complete
SCHEMA_STATUS=""
while [ "$SCHEMA_STATUS" != "SUCCESS" ] && [ "$SCHEMA_STATUS" != "FAILED" ]; do
  sleep 2
  SCHEMA_STATUS=$(aws appsync get-schema-creation-status --api-id $API_ID --query "status" --output text)
  echo -n "."
done
echo ""

if [ "$SCHEMA_STATUS" == "SUCCESS" ]; then
  step "Schema updated successfully!"
else
  error "Schema update failed. Check AWS console for details."
fi

step "Deploy process completed successfully!"