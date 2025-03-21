#!/bin/bash

# Exit on error
set -e

echo "Validating CloudFormation templates..."

# Check if cfn-lint is installed
if ! command -v cfn-lint &> /dev/null; then
    echo "cfn-lint is not installed. Installing..."
    pip install cfn-lint
fi

# Validate all templates
for template in bootstrap.yml cognito.yml dynamodb.yml lambdas.yml appsync.yml; do
    echo "Validating $template..."
    cfn-lint $template
done

echo "All templates validated successfully!" 