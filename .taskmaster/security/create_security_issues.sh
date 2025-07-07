#!/bin/bash

# Security Issues Creation Script
# Generated from Dependabot security report
# Location: .taskmaster/security/create_security_issues.sh

echo "Creating GitHub issues for security vulnerabilities..."
echo "Reading from: .taskmaster/security/security_issues.json"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "GitHub CLI (gh) is not installed. Please install it first:"
    echo "https://github.com/cli/cli#installation"
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --is-inside-work-tree &> /dev/null; then
    echo "Not in a git repository. Please run from the project root."
    exit 1
fi

# Check if security_issues.json exists
if [ ! -f ".taskmaster/security/security_issues.json" ]; then
    echo "security_issues.json not found in .taskmaster/security/"
    exit 1
fi

# Function to create GitHub issue from JSON
create_issue_from_json() {
    local issue_data="$1"
    local title=$(echo "$issue_data" | jq -r '.title')
    local body=$(echo "$issue_data" | jq -r '.body')
    local labels=$(echo "$issue_data" | jq -r '.labels | join(",")')
    
    echo "Creating issue: $title"
    gh issue create \
        --title "$title" \
        --body "$body" \
        --label "$labels"
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully created issue: $title"
    else
        echo "❌ Failed to create issue: $title"
    fi
    echo "---"
}

# Read JSON file and create issues
echo "Reading security issues from JSON file..."
jq -c '.[]' ".taskmaster/security/security_issues.json" | while read -r issue; do
    create_issue_from_json "$issue"
    # Add small delay to avoid rate limiting
    sleep 1
done

echo "✅ Security issues creation script completed!"
echo ""
echo "Next steps:"
echo "1. Review the created issues in GitHub"
echo "2. Assign appropriate team members"
echo "3. Set up projects/milestones for security fixes"
echo "4. Update dependencies to fix vulnerabilities"