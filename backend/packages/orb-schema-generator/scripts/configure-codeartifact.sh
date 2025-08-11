#!/bin/bash
# Configure local development environment to use AWS CodeArtifact

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="orb-integration-hub"
ENVIRONMENT="${1:-dev}"
REPOSITORY="${ENVIRONMENT}-python-packages"
REGION="${AWS_REGION:-us-east-1}"

echo -e "${YELLOW}Configuring CodeArtifact for local development${NC}"
echo "Environment: $ENVIRONMENT"
echo "Domain: $DOMAIN"
echo "Repository: $REPOSITORY"
echo "Region: $REGION"

# Check AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

# Check if logged in to AWS
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)
if [ -z "$ACCOUNT_ID" ]; then
    echo -e "${RED}Error: Not logged in to AWS. Please run 'aws configure' or set AWS credentials${NC}"
    exit 1
fi

echo "AWS Account: $ACCOUNT_ID"

# Get auth token
echo -e "\n${YELLOW}Getting CodeArtifact auth token...${NC}"
export CODEARTIFACT_AUTH_TOKEN=$(aws codeartifact get-authorization-token \
    --domain $DOMAIN \
    --domain-owner $ACCOUNT_ID \
    --query authorizationToken \
    --output text \
    --region $REGION)

if [ -z "$CODEARTIFACT_AUTH_TOKEN" ]; then
    echo -e "${RED}Failed to get auth token${NC}"
    exit 1
fi

# Get repository endpoint
REPOSITORY_ENDPOINT=$(aws codeartifact get-repository-endpoint \
    --domain $DOMAIN \
    --domain-owner $ACCOUNT_ID \
    --repository $REPOSITORY \
    --format pypi \
    --query repositoryEndpoint \
    --output text \
    --region $REGION)

if [ -z "$REPOSITORY_ENDPOINT" ]; then
    echo -e "${RED}Failed to get repository endpoint${NC}"
    exit 1
fi

# Configure pip
echo -e "\n${YELLOW}Configuring pip...${NC}"
aws codeartifact login --tool pip \
    --domain $DOMAIN \
    --domain-owner $ACCOUNT_ID \
    --repository $REPOSITORY \
    --region $REGION

# Configure pipenv if available
if command -v pipenv &> /dev/null; then
    echo -e "\n${YELLOW}Configuring pipenv...${NC}"
    export PIP_INDEX_URL="https://aws:${CODEARTIFACT_AUTH_TOKEN}@${REPOSITORY_ENDPOINT#https://}simple/"
    echo "PIP_INDEX_URL configured for pipenv"
fi

# Create .env.codeartifact file
echo -e "\n${YELLOW}Creating .env.codeartifact file...${NC}"
cat > .env.codeartifact << EOF
# CodeArtifact configuration (auto-generated)
# Generated at: $(date)
# Valid for: 12 hours

export CODEARTIFACT_DOMAIN="$DOMAIN"
export CODEARTIFACT_REPOSITORY="$REPOSITORY"
export CODEARTIFACT_AUTH_TOKEN="$CODEARTIFACT_AUTH_TOKEN"
export PIP_INDEX_URL="https://aws:${CODEARTIFACT_AUTH_TOKEN}@${REPOSITORY_ENDPOINT#https://}simple/"
EOF

echo -e "${GREEN}✓ CodeArtifact configured successfully${NC}"
echo -e "${GREEN}✓ Auth token valid for 12 hours${NC}"
echo ""
echo "To use in current shell:"
echo -e "${YELLOW}source .env.codeartifact${NC}"
echo ""
echo "To install packages:"
echo -e "${YELLOW}pip install <package-name>${NC}"
echo -e "${YELLOW}pipenv install <package-name>${NC}"