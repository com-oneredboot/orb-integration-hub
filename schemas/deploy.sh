#!/bin/bash
# deploy.sh
# Script to run the schema generator and deploy the schema to AppSync

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# First run the schema generator
"$SCRIPT_DIR/run-generator.sh"

# Then deploy the schema
echo "Deploying schema to AppSync..."
"$SCRIPT_DIR/../backend/infrastructure/scripts/deploy_schema.sh"