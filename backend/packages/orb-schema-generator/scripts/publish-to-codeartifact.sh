#!/bin/bash
# Script to build and publish orb-schema-generator to AWS CodeArtifact

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="orb-integration-hub"
REPOSITORY="python-packages"
REGION="${AWS_REGION:-us-east-1}"

echo -e "${YELLOW}Building and publishing orb-schema-generator to CodeArtifact${NC}"

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ -z "$ACCOUNT_ID" ]; then
    echo -e "${RED}Failed to get AWS account ID. Are you logged in to AWS?${NC}"
    exit 1
fi

echo "AWS Account: $ACCOUNT_ID"
echo "Domain: $DOMAIN"
echo "Repository: $REPOSITORY"
echo "Region: $REGION"

# Login to CodeArtifact
echo -e "\n${YELLOW}Logging in to CodeArtifact...${NC}"
aws codeartifact login --tool twine \
    --domain $DOMAIN \
    --domain-owner $ACCOUNT_ID \
    --repository $REPOSITORY \
    --region $REGION

# Clean previous builds
echo -e "\n${YELLOW}Cleaning previous builds...${NC}"
rm -rf dist/ build/ *.egg-info/

# Build the package
echo -e "\n${YELLOW}Building package...${NC}"
python -m build

# Upload to CodeArtifact
echo -e "\n${YELLOW}Uploading to CodeArtifact...${NC}"
python -m twine upload --repository codeartifact dist/*

echo -e "\n${GREEN}✓ Successfully published orb-schema-generator to CodeArtifact${NC}"
echo -e "${GREEN}Install with: pip install orb-schema-generator${NC}"