#!/bin/bash
# file: frontend/scripts/inject-env.sh
# author: Corey Dale Peters
# date: 2025-06-20
# description: Script to inject environment variables into deployed application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔧 Injecting environment variables...${NC}"

# Define required environment variables
REQUIRED_VARS=(
  "COGNITO_USER_POOL_ID"
  "COGNITO_CLIENT_ID" 
  "GRAPHQL_API_URL"
  "GRAPHQL_API_KEY"
  "AWS_REGION"
)

# Optional environment variables with defaults
declare -A OPTIONAL_VARS=(
  ["COGNITO_QR_ISSUER"]="OneRedBoot.com"
  ["NODE_ENV"]="production"
  ["APP_VERSION"]="1.0.0"
  ["BUILD_NUMBER"]="unknown"
)

# Check if all required environment variables are set
echo -e "${YELLOW}📋 Checking required environment variables...${NC}"
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var}" ]]; then
    MISSING_VARS+=("$var")
    echo -e "${RED}❌ Missing required environment variable: $var${NC}"
  else
    echo -e "${GREEN}✅ Found: $var${NC}"
  fi
done

# Exit if any required variables are missing
if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
  echo -e "${RED}💥 Missing required environment variables: ${MISSING_VARS[*]}${NC}"
  echo -e "${YELLOW}💡 Please set these variables in your deployment environment${NC}"
  exit 1
fi

# Set optional variables to defaults if not provided
for var in "${!OPTIONAL_VARS[@]}"; do
  if [[ -z "${!var}" ]]; then
    declare "$var=${OPTIONAL_VARS[$var]}"
    echo -e "${YELLOW}⚠️  Using default for $var: ${OPTIONAL_VARS[$var]}${NC}"
  else
    echo -e "${GREEN}✅ Found: $var${NC}"
  fi
done

# Define paths
TEMPLATE_FILE="src/assets/env.template.js"
OUTPUT_FILE="dist/env.js"

# Check if template file exists
if [[ ! -f "$TEMPLATE_FILE" ]]; then
  echo -e "${RED}❌ Template file not found: $TEMPLATE_FILE${NC}"
  exit 1
fi

# Create dist directory if it doesn't exist
mkdir -p "$(dirname "$OUTPUT_FILE")"

echo -e "${YELLOW}🔄 Processing environment template...${NC}"

# Copy template and substitute variables
cp "$TEMPLATE_FILE" "$OUTPUT_FILE"

# Replace all environment variable placeholders
for var in "${REQUIRED_VARS[@]}" "${!OPTIONAL_VARS[@]}"; do
  if [[ -n "${!var}" ]]; then
    # Use different delimiters to avoid issues with URLs
    sed -i "s|\${$var}|${!var}|g" "$OUTPUT_FILE"
    echo -e "${GREEN}✅ Injected: $var${NC}"
  fi
done

# Verify the output file was created
if [[ -f "$OUTPUT_FILE" ]]; then
  echo -e "${GREEN}✅ Environment variables successfully injected into: $OUTPUT_FILE${NC}"
  
  # Show file size for verification
  FILE_SIZE=$(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE" 2>/dev/null || echo "unknown")
  echo -e "${GREEN}📏 Generated file size: $FILE_SIZE bytes${NC}"
  
  # Security check: ensure no template placeholders remain
  REMAINING_PLACEHOLDERS=$(grep -o '\${[^}]*}' "$OUTPUT_FILE" | wc -l)
  if [[ $REMAINING_PLACEHOLDERS -gt 0 ]]; then
    echo -e "${YELLOW}⚠️  Warning: $REMAINING_PLACEHOLDERS template placeholder(s) remain unsubstituted${NC}"
    grep '\${[^}]*}' "$OUTPUT_FILE" || true
  fi
else
  echo -e "${RED}❌ Failed to create output file: $OUTPUT_FILE${NC}"
  exit 1
fi

echo -e "${GREEN}🎉 Environment variable injection completed successfully!${NC}"
echo -e "${YELLOW}💡 Include this script in your deployment pipeline before serving the application${NC}"