#!/bin/bash
set -e

# Script to check which lambda layers have changed since last deployment
# Usage: ./check_layer_changes.sh <customer_id> <project_id>

# Check arguments
if [ $# -ne 2 ]; then
    echo "Error: Missing required arguments"
    echo "Usage: $0 <customer_id> <project_id>"
    exit 1
fi

CUSTOMER_ID=$1
PROJECT_ID=$2

# Define all available layers
LAYERS=("organizations_security" "stripe" "users_security")
LAYERS_TO_BUILD=()

echo "=========================================="
echo "Checking Lambda Layer Changes"
echo "=========================================="

# Download previous hashes if they exist
echo "Downloading previous layer hashes..."
aws s3 cp "s3://${CUSTOMER_ID}-${PROJECT_ID}-build-artifacts/lambda-layer-hashes.json" ./previous-hashes.json 2>/dev/null || echo '{}' > ./previous-hashes.json

# Check each layer for changes
for LAYER in "${LAYERS[@]}"; do
    echo ""
    echo "Checking layer: $LAYER"
    echo "-----------------------------------------"
    
    # Check if layer directory exists
    if [ -d "$LAYER" ]; then
        # Generate hash for current layer
        CURRENT_HASH=$(find "$LAYER" -type f \( -name "*.py" -o -name "Pipfile*" \) -exec sha256sum {} + | sha256sum | cut -d' ' -f1)
        echo "Current hash: $CURRENT_HASH"
        
        # Get previous hash
        PREV_HASH=$(jq -r ".${LAYER} // \"\"" previous-hashes.json)
        echo "Previous hash: ${PREV_HASH:-"(none)"}"
        
        # Compare hashes
        if [[ "$CURRENT_HASH" != "$PREV_HASH" ]]; then
            echo "Status: CHANGED ✓"
            LAYERS_TO_BUILD+=("$LAYER")
        else
            echo "Status: No changes"
        fi
    else
        echo "Warning: Layer directory $LAYER not found"
    fi
done

echo ""
echo "=========================================="

# Output results for GitHub Actions
if [ ${#LAYERS_TO_BUILD[@]} -eq 0 ]; then
    echo "Summary: No layer changes detected"
    echo "any_changes=false" >> $GITHUB_OUTPUT
    echo "layers_to_build=[]" >> $GITHUB_OUTPUT
else
    echo "Summary: ${#LAYERS_TO_BUILD[@]} layer(s) with changes:"
    for layer in "${LAYERS_TO_BUILD[@]}"; do
        echo "  - $layer"
    done
    
    echo "any_changes=true" >> $GITHUB_OUTPUT
    
    # Convert array to JSON array string
    LAYERS_JSON=$(printf '%s\n' "${LAYERS_TO_BUILD[@]}" | jq -R . | jq -s .)
    echo "layers_to_build=$LAYERS_JSON" >> $GITHUB_OUTPUT
fi

echo "=========================================="