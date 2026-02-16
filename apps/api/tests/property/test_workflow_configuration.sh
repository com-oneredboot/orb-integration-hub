#!/bin/bash
# Property Test: Workflow Configuration Standards
# Validates: Requirements 6.2 (timeout-minutes), 6.3 (trigger specificity)

set -e

WORKFLOW_DIR=".github/workflows"
ERRORS=0

echo "=== Property Test: Workflow Configuration Standards ==="
echo ""

# Property 1: All jobs must have timeout-minutes
echo "Checking Property 1: All jobs have timeout-minutes..."
for workflow in "$WORKFLOW_DIR"/*.yml; do
    if [ -f "$workflow" ]; then
        # Extract job names and check for timeout-minutes
        # Use awk to find jobs without timeout-minutes
        in_jobs=false
        job_name=""
        has_timeout=false
        
        while IFS= read -r line; do
            # Detect jobs section
            if [[ "$line" =~ ^jobs: ]]; then
                in_jobs=true
                continue
            fi
            
            # Detect job definition (2-space indent, ends with :)
            if $in_jobs && [[ "$line" =~ ^[[:space:]]{2}[a-zA-Z_-]+:$ ]]; then
                # Check previous job for timeout
                if [ -n "$job_name" ] && ! $has_timeout; then
                    echo "  ERROR: Job '$job_name' in $(basename "$workflow") missing timeout-minutes"
                    ERRORS=$((ERRORS + 1))
                fi
                job_name=$(echo "$line" | sed 's/^[[:space:]]*//' | sed 's/:$//')
                has_timeout=false
            fi
            
            # Check for timeout-minutes
            if [[ "$line" =~ timeout-minutes ]]; then
                has_timeout=true
            fi
            
            # Reset on new top-level section
            if [[ "$line" =~ ^[a-z] ]] && [[ ! "$line" =~ ^jobs: ]]; then
                if [ -n "$job_name" ] && ! $has_timeout; then
                    echo "  ERROR: Job '$job_name' in $(basename "$workflow") missing timeout-minutes"
                    ERRORS=$((ERRORS + 1))
                fi
                in_jobs=false
                job_name=""
            fi
        done < "$workflow"
        
        # Check last job
        if [ -n "$job_name" ] && ! $has_timeout; then
            echo "  ERROR: Job '$job_name' in $(basename "$workflow") missing timeout-minutes"
            ERRORS=$((ERRORS + 1))
        fi
    fi
done

if [ $ERRORS -eq 0 ]; then
    echo "  PASS: All jobs have timeout-minutes"
fi
echo ""

# Property 2: No overly broad triggers (on: [push, pull_request])
echo "Checking Property 2: No overly broad triggers..."
BROAD_TRIGGER_ERRORS=0
for workflow in "$WORKFLOW_DIR"/*.yml; do
    if [ -f "$workflow" ]; then
        # Check for broad trigger pattern
        if grep -qE "^on:\s*\[" "$workflow"; then
            echo "  WARNING: $(basename "$workflow") uses array-style triggers (consider being more specific)"
            BROAD_TRIGGER_ERRORS=$((BROAD_TRIGGER_ERRORS + 1))
        fi
    fi
done

if [ $BROAD_TRIGGER_ERRORS -eq 0 ]; then
    echo "  PASS: No overly broad triggers found"
fi
echo ""

# Summary
echo "=== Summary ==="
if [ $ERRORS -eq 0 ]; then
    echo "All workflow configuration properties validated successfully!"
    exit 0
else
    echo "Found $ERRORS error(s) in workflow configuration"
    exit 1
fi
