#!/bin/bash
set -e

# Script to update layer hashes after successful deployment
# Usage: ./update_layer_hashes.sh <customer_id> <project_id> '<json_array_of_deployed_layers>'

# Check arguments
if [ $# -ne 3 ]; then
    echo "Error: Missing required arguments"
    echo "Usage: $0 <customer_id> <project_id> '<json_array_of_deployed_layers>'"
    echo "Example: $0 orb integration-hub '[\"organizations_security\",\"stripe\"]'"
    exit 1
fi

CUSTOMER_ID=$1
PROJECT_ID=$2
DEPLOYED_LAYERS=$3

echo "=========================================="
echo "Updating Lambda Layer Hashes"
echo "=========================================="

# Download current hashes
echo "Downloading current layer hashes..."
aws s3 cp "s3://${CUSTOMER_ID}-${PROJECT_ID}-build-artifacts/layers/hashes.json" ./layer-hashes.json 2>/dev/null || echo '{}' > ./layer-hashes.json

echo ""
echo "Updating hashes for deployed layers..."

# Parse the JSON array and update hashes
echo "$DEPLOYED_LAYERS" | jq -r '.[]' | while read -r LAYER; do
    echo "Processing layer: $LAYER"
    
    if [ -d "$LAYER" ]; then
        # Generate new hash
        NEW_HASH=$(find "$LAYER" -type f \( -name "*.py" -o -name "Pipfile*" \) -exec sha256sum {} + | sha256sum | cut -d' ' -f1)
        echo "  New hash: $NEW_HASH"
        
        # Update the hash in the JSON file
        jq --arg layer "$LAYER" --arg hash "$NEW_HASH" '.[$layer] = $hash' layer-hashes.json > tmp.json && mv tmp.json layer-hashes.json
        echo "  Status: Updated ✓"
    else
        echo "  Warning: Layer directory $LAYER not found"
    fi
done

echo ""
echo "Uploading updated hashes to S3..."
aws s3 cp layer-hashes.json "s3://${CUSTOMER_ID}-${PROJECT_ID}-build-artifacts/layers/hashes.json"

echo ""
echo "Final layer hashes:"
echo "-----------------------------------------"
cat layer-hashes.json | jq .

echo ""
echo "=========================================="
echo "Layer hashes updated successfully!"
echo "=========================================="