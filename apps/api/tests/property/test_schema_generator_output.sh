#!/bin/bash
# Property Test: Schema Generator Output Correctness
# Feature: repository-standardization, Property 2: Schema Generator Output Correctness
# Validates: Requirements 2.5
#
# This test verifies that the schema-generator.yml configuration is valid
# and that output paths are correctly configured for the Nx-style structure.

set -e

echo "Property Test: Schema Generator Output Correctness"
echo "=================================================="
echo ""

FAILED=0

# Check schema-generator.yml exists
echo "Checking schema-generator.yml exists..."
if [ -f "schema-generator.yml" ]; then
    echo "PASS: schema-generator.yml exists"
else
    echo "FAIL: schema-generator.yml not found"
    FAILED=1
fi

# Check schema-generator.yml is valid YAML
echo ""
echo "Checking schema-generator.yml is valid YAML..."
if python3 -c "import yaml; yaml.safe_load(open('schema-generator.yml'))" 2>/dev/null; then
    echo "PASS: schema-generator.yml is valid YAML"
else
    echo "FAIL: schema-generator.yml is not valid YAML"
    FAILED=1
fi

# Check output paths use Nx-style structure (apps/api, apps/web)
echo ""
echo "Checking output paths use Nx-style structure..."
if grep -q "apps/api" schema-generator.yml && grep -q "apps/web" schema-generator.yml; then
    echo "PASS: Output paths use Nx-style structure (apps/api, apps/web)"
else
    echo "FAIL: Output paths should use apps/api and apps/web"
    FAILED=1
fi

# Check output paths do NOT use old structure (backend/, frontend/)
echo ""
echo "Checking output paths do NOT use old structure..."
if grep -q "backend/" schema-generator.yml || grep -q "frontend/" schema-generator.yml; then
    echo "FAIL: Output paths should not use backend/ or frontend/"
    FAILED=1
else
    echo "PASS: Output paths do not use old structure"
fi

# Check schemas directory exists
echo ""
echo "Checking schemas directory exists..."
if [ -d "schemas" ]; then
    echo "PASS: schemas directory exists"
else
    echo "FAIL: schemas directory not found"
    FAILED=1
fi

# Check required schema subdirectories exist
echo ""
echo "Checking required schema subdirectories..."
REQUIRED_DIRS=("schemas/models" "schemas/tables" "schemas/core")
for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "PASS: $dir exists"
    else
        echo "FAIL: $dir not found"
        FAILED=1
    fi
done

# Check project configuration
echo ""
echo "Checking project configuration..."
if grep -q "customerId: orb" schema-generator.yml && grep -q "projectId: integration-hub" schema-generator.yml; then
    echo "PASS: Project configuration is correct (customerId: orb, projectId: integration-hub)"
else
    echo "FAIL: Project configuration should have customerId: orb and projectId: integration-hub"
    FAILED=1
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
