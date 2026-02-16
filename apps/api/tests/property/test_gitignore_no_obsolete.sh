#!/bin/bash
# Property Test: No Obsolete Gitignore Entries
# Feature: repository-standards-phase-2, Property 1: No Obsolete Gitignore Entries
# Validates: Requirements 5.4
#
# For any entry in the .gitignore file, there shall be no references to the old
# directory paths (backend/, frontend/ as standalone paths that no longer exist).

set -e

echo "=== Property Test: No Obsolete Gitignore Entries ==="
echo ""

GITIGNORE_FILE=".gitignore"
FAILED=0

if [ ! -f "$GITIGNORE_FILE" ]; then
    echo "FAIL: .gitignore file not found"
    exit 1
fi

echo "Checking for obsolete 'backend/' entries..."
if grep -E "^backend/" "$GITIGNORE_FILE" 2>/dev/null; then
    echo "FAIL: Found obsolete 'backend/' entry in .gitignore"
    FAILED=1
else
    echo "✓ No obsolete 'backend/' entries found"
fi

echo ""
echo "Checking for obsolete 'frontend/' entries..."
if grep -E "^frontend/" "$GITIGNORE_FILE" 2>/dev/null; then
    echo "FAIL: Found obsolete 'frontend/' entry in .gitignore"
    FAILED=1
else
    echo "✓ No obsolete 'frontend/' entries found"
fi

echo ""
echo "Checking for obsolete 'backend/infrastructure/' entries..."
if grep -E "^backend/infrastructure/" "$GITIGNORE_FILE" 2>/dev/null; then
    echo "FAIL: Found obsolete 'backend/infrastructure/' entry in .gitignore"
    FAILED=1
else
    echo "✓ No obsolete 'backend/infrastructure/' entries found"
fi

echo ""
if [ $FAILED -eq 0 ]; then
    echo "=== PASS: No obsolete gitignore entries found ==="
    exit 0
else
    echo "=== FAIL: Obsolete gitignore entries detected ==="
    exit 1
fi
