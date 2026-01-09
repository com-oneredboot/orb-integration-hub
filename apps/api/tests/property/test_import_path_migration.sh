#!/bin/bash
# Property Test: Import Path Migration Completeness
# Feature: repository-standardization, Property 1: Import Path Migration Completeness
# Validates: Requirements 1.7, 7.3
#
# This test verifies that no source files contain references to the old
# directory paths (backend/, frontend/ as top-level directories).

set -e

echo "Property Test: Import Path Migration Completeness"
echo "=================================================="
echo ""

FAILED=0

# Check for old backend/ references in Python files
echo "Checking Python files for 'backend/' references..."
if grep -r "backend/" apps/ --include="*.py" 2>/dev/null; then
    echo "FAIL: Found 'backend/' references in Python files"
    FAILED=1
else
    echo "PASS: No 'backend/' references in Python files"
fi

# Check for old frontend/ references in TypeScript files
echo ""
echo "Checking TypeScript files for 'frontend/' references..."
if grep -r "frontend/" apps/ --include="*.ts" 2>/dev/null; then
    echo "FAIL: Found 'frontend/' references in TypeScript files"
    FAILED=1
else
    echo "PASS: No 'frontend/' references in TypeScript files"
fi

# Check for old backend/ references in any config files
# Excludes: repositories (read-only), node_modules, .git, .kiro/specs (design docs), .taskmaster (historical records)
echo ""
echo "Checking config files for 'backend/' references..."
if grep -r "backend/" . --include="*.json" --include="*.yml" --include="*.yaml" --exclude-dir=repositories --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.taskmaster 2>/dev/null | grep -v ".kiro/specs"; then
    echo "FAIL: Found 'backend/' references in config files"
    FAILED=1
else
    echo "PASS: No 'backend/' references in config files"
fi

# Check for old frontend/ references in any config files
# Excludes: repositories (read-only), node_modules, .git, .kiro/specs (design docs), .taskmaster (historical records)
echo ""
echo "Checking config files for 'frontend/' references..."
if grep -r "frontend/" . --include="*.json" --include="*.yml" --include="*.yaml" --exclude-dir=repositories --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.taskmaster 2>/dev/null | grep -v ".kiro/specs"; then
    echo "FAIL: Found 'frontend/' references in config files"
    FAILED=1
else
    echo "PASS: No 'frontend/' references in config files"
fi

echo ""
echo "=================================================="
if [ $FAILED -eq 0 ]; then
    echo "RESULT: ALL PROPERTY TESTS PASSED"
    exit 0
else
    echo "RESULT: SOME PROPERTY TESTS FAILED"
    exit 1
fi
