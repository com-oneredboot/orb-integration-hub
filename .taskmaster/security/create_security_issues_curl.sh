#!/bin/bash

# GitHub Issues Creation Script using curl
# Usage: ./create_security_issues_curl.sh <GITHUB_TOKEN>

GITHUB_TOKEN="$1"
REPO_OWNER="com-oneredboot"
REPO_NAME="orb-integration-hub"

if [ -z "$GITHUB_TOKEN" ]; then
    echo "Error: GitHub token required"
    echo "Usage: $0 <GITHUB_TOKEN>"
    echo ""
    echo "You can create a token at: https://github.com/settings/tokens"
    echo "Required scopes: repo (for creating issues)"
    exit 1
fi

# Check if security_issues.json exists
if [ ! -f ".taskmaster/security/security_issues.json" ]; then
    echo "Error: security_issues.json not found in .taskmaster/security/"
    exit 1
fi

echo "Creating GitHub issues for security vulnerabilities..."
echo "Repository: $REPO_OWNER/$REPO_NAME"
echo ""

# Function to create GitHub issue using curl
create_github_issue() {
    local title="$1"
    local body="$2"
    local labels="$3"
    
    # Convert comma-separated labels to JSON array
    local labels_json=$(echo "$labels" | jq -R 'split(",") | map(. | gsub("^\\s+|\\s+$"; ""))')
    
    # Create JSON payload
    local payload=$(jq -n \
        --arg title "$title" \
        --arg body "$body" \
        --argjson labels "$labels_json" \
        '{
            title: $title,
            body: $body,
            labels: $labels
        }')
    
    echo "Creating issue: $title"
    
    # Make API request
    response=$(curl -s -w "%{http_code}" \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        -H "Content-Type: application/json" \
        -X POST \
        -d "$payload" \
        "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/issues")
    
    # Extract HTTP status code (last 3 characters)
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" = "201" ]; then
        issue_number=$(echo "$response_body" | jq -r '.number')
        issue_url=$(echo "$response_body" | jq -r '.html_url')
        echo "✅ Created issue #$issue_number: $issue_url"
    else
        echo "❌ Failed to create issue (HTTP $http_code)"
        echo "Response: $response_body" | jq -r '.message // .'
    fi
    echo ""
}

# Read JSON file and create issues
echo "Reading security issues from JSON file..."
jq -c '.[]' ".taskmaster/security/security_issues.json" | while read -r issue; do
    title=$(echo "$issue" | jq -r '.title')
    body=$(echo "$issue" | jq -r '.body')
    labels=$(echo "$issue" | jq -r '.labels | join(",")')
    
    create_github_issue "$title" "$body" "$labels"
    
    # Add small delay to avoid rate limiting
    sleep 1
done

echo "✅ Security issues creation script completed!"
echo ""
echo "Next steps:"
echo "1. Review the created issues in GitHub"
echo "2. Assign appropriate team members"
echo "3. Set up projects/milestones for security fixes"
echo "4. Update dependencies to fix vulnerabilities (already done!)"