#!/bin/bash

# Script to automatically update feature changelog with git diff information
# Usage: ./update-changelog.sh [feature-name]

# Check if feature name is provided
if [ -z "$1" ]; then
  echo "Error: Feature name is required"
  echo "Usage: ./update-changelog.sh [feature-name]"
  exit 1
fi

FEATURE_NAME=$1
FEATURE_DIR="/home/corey/Infrastructure/src/orb-integration-hub/context/features/$FEATURE_NAME"
CHANGELOG_FILE="$FEATURE_DIR/changelog.md"
CURRENT_DATE=$(date +"%Y-%m-%d")
BRANCH_NAME="$FEATURE_NAME-feature"

# Check if feature directory exists
if [ ! -d "$FEATURE_DIR" ]; then
  echo "Creating feature directory: $FEATURE_DIR"
  mkdir -p "$FEATURE_DIR"
fi

# Check if changelog exists
if [ ! -f "$CHANGELOG_FILE" ]; then
  echo "Creating new changelog file: $CHANGELOG_FILE"
  echo "# $FEATURE_NAME Changelog" > "$CHANGELOG_FILE"
fi

# Get last commit hash from changelog if it exists
LAST_HASH=$(grep -o "Last commit: [a-f0-9]\+" "$CHANGELOG_FILE" | tail -1 | cut -d' ' -f3)

# If no previous commit hash found, get the hash of the commit before the branch was created
if [ -z "$LAST_HASH" ]; then
  # Get the hash where the branch was created
  BRANCH_CREATION=$(git merge-base HEAD main)
  if [ -z "$BRANCH_CREATION" ]; then
    echo "Error: Could not determine branch creation point"
    exit 1
  fi
  LAST_HASH=$BRANCH_CREATION
fi

# Get the current commit hash
CURRENT_HASH=$(git rev-parse HEAD)

# If hashes are the same, no changes to record
if [ "$LAST_HASH" = "$CURRENT_HASH" ]; then
  echo "No new changes to record since last update"
  exit 0
fi

# Prepare changelog entry
CHANGELOG_ENTRY="\n## $CURRENT_DATE\n\n### Changes Since Last Update\n\n\`\`\`\n$(git log --pretty=format:"%h - %s (%an)" $LAST_HASH..$CURRENT_HASH)\n\`\`\`\n\n### Files Changed\n\n\`\`\`\n$(git diff --stat $LAST_HASH..$CURRENT_HASH)\n\`\`\`\n\n### Last commit: $CURRENT_HASH\n"

# Append to changelog
echo -e "$CHANGELOG_ENTRY" >> "$CHANGELOG_FILE"

echo "Changelog updated successfully!"
echo "Please review and edit $CHANGELOG_FILE to add detailed explanations for changes."