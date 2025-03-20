#!/bin/bash

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Find the latest generated schema file
SCHEMA_FILE=$(find "$SCRIPT_DIR/../../infrastructure/graphql" -name "appsync_*.graphql" | sort -r | head -1)

if [ -z "$SCHEMA_FILE" ]; then
    echo "ERROR: No appsync_*.graphql file found. Schema generation may have failed."
    exit 1
fi

SCHEMA_FILENAME=$(basename "$SCHEMA_FILE")
echo "Using schema file: $SCHEMA_FILENAME"

# Upload the schema to S3
aws s3 cp "$SCHEMA_FILE" \
    "s3://${CUSTOMER_ID}-${PROJECT_ID}-build-templates/$SCHEMA_FILENAME"

# Update the AppSync schema directly
aws appsync start-schema-creation \
    --api-id "${API_ID}" \
    --definition "file://$SCHEMA_FILE"

# Wait for schema creation to complete
echo "Waiting for schema creation to complete..."
while true; do
    STATUS=$(aws appsync get-schema-creation-status --api-id "${API_ID}" --query "status" --output text)
    
    if [ "$STATUS" = "SUCCESS" ]; then
        echo "Schema creation completed successfully"
        break
    elif [ "$STATUS" = "FAILED" ]; then
        echo "Schema creation failed"
        exit 1
    fi
    
    echo "Schema creation in progress... ($STATUS)"
    sleep 5
done

echo "Schema deployment completed successfully" 