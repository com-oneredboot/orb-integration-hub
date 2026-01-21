#!/bin/bash
# Property Test: Schema Auth Directives Validation
# Feature: create-user-from-cognito, Property: Schema Auth Directives
# Validates: Requirements 3.1, 3.2, 8.4
#
# This test verifies that:
# 1. CreateUserFromCognito has @aws_api_key directive (API key auth only)
# 2. UsersCreate does NOT have @aws_api_key directive (Cognito auth only)
# 3. UsersCreate has @aws_auth directive with EMPLOYEE, OWNER groups

set -e

echo "Property Test: Schema Auth Directives Validation"
echo "=================================================="
echo ""

FAILED=0
SCHEMA_FILE="apps/api/graphql/schema.graphql"

# Check schema file exists
echo "Checking schema file exists..."
if [ -f "$SCHEMA_FILE" ]; then
    echo "PASS: $SCHEMA_FILE exists"
else
    echo "FAIL: $SCHEMA_FILE not found"
    exit 1
fi

# Test 1: CreateUserFromCognito mutation has @aws_api_key
echo ""
echo "Test 1: CreateUserFromCognito mutation has @aws_api_key..."
CREATE_USER_FROM_COGNITO_LINE=$(grep "CreateUserFromCognito(input:" "$SCHEMA_FILE" | head -1)
if echo "$CREATE_USER_FROM_COGNITO_LINE" | grep -q "@aws_api_key"; then
    echo "PASS: CreateUserFromCognito has @aws_api_key directive"
else
    echo "FAIL: CreateUserFromCognito should have @aws_api_key directive"
    echo "  Found: $CREATE_USER_FROM_COGNITO_LINE"
    FAILED=1
fi

# Test 2: CreateUserFromCognito mutation does NOT have @aws_auth
echo ""
echo "Test 2: CreateUserFromCognito mutation does NOT have @aws_auth..."
if echo "$CREATE_USER_FROM_COGNITO_LINE" | grep -q "@aws_auth"; then
    echo "FAIL: CreateUserFromCognito should NOT have @aws_auth directive"
    echo "  Found: $CREATE_USER_FROM_COGNITO_LINE"
    FAILED=1
else
    echo "PASS: CreateUserFromCognito does not have @aws_auth directive"
fi

# Test 3: UsersCreate mutation does NOT have @aws_api_key
echo ""
echo "Test 3: UsersCreate mutation does NOT have @aws_api_key..."
# Use word boundary to match exactly "UsersCreate" not "ApplicationUsersCreate"
USERS_CREATE_LINE=$(grep -E "^\s+UsersCreate\(input:" "$SCHEMA_FILE" | head -1)
if echo "$USERS_CREATE_LINE" | grep -q "@aws_api_key"; then
    echo "FAIL: UsersCreate should NOT have @aws_api_key directive"
    echo "  Found: $USERS_CREATE_LINE"
    FAILED=1
else
    echo "PASS: UsersCreate does not have @aws_api_key directive"
fi

# Test 4: UsersCreate mutation has @aws_auth with EMPLOYEE group
echo ""
echo "Test 4: UsersCreate mutation has @aws_auth with EMPLOYEE group..."
if echo "$USERS_CREATE_LINE" | grep -q '@aws_auth.*EMPLOYEE'; then
    echo "PASS: UsersCreate has @aws_auth with EMPLOYEE group"
else
    echo "FAIL: UsersCreate should have @aws_auth with EMPLOYEE group"
    echo "  Found: $USERS_CREATE_LINE"
    FAILED=1
fi

# Test 5: UsersCreate mutation has @aws_auth with OWNER group
echo ""
echo "Test 5: UsersCreate mutation has @aws_auth with OWNER group..."
if echo "$USERS_CREATE_LINE" | grep -q '@aws_auth.*OWNER'; then
    echo "PASS: UsersCreate has @aws_auth with OWNER group"
else
    echo "FAIL: UsersCreate should have @aws_auth with OWNER group"
    echo "  Found: $USERS_CREATE_LINE"
    FAILED=1
fi

# Test 6: CreateUserFromCognito type has @aws_api_key
echo ""
echo "Test 6: CreateUserFromCognito type has @aws_api_key..."
CREATE_USER_TYPE_LINE=$(grep "^type CreateUserFromCognito" "$SCHEMA_FILE" | head -1)
if echo "$CREATE_USER_TYPE_LINE" | grep -q "@aws_api_key"; then
    echo "PASS: CreateUserFromCognito type has @aws_api_key directive"
else
    echo "FAIL: CreateUserFromCognito type should have @aws_api_key directive"
    echo "  Found: $CREATE_USER_TYPE_LINE"
    FAILED=1
fi

# Test 7: CheckEmailExists also has @aws_api_key (consistency check)
echo ""
echo "Test 7: CheckEmailExists has @aws_api_key (consistency check)..."
CHECK_EMAIL_LINE=$(grep "CheckEmailExists(input:" "$SCHEMA_FILE" | head -1)
if echo "$CHECK_EMAIL_LINE" | grep -q "@aws_api_key"; then
    echo "PASS: CheckEmailExists has @aws_api_key directive (consistent pattern)"
else
    echo "FAIL: CheckEmailExists should have @aws_api_key directive"
    echo "  Found: $CHECK_EMAIL_LINE"
    FAILED=1
fi

echo ""
echo "=================================================="
if [ $FAILED -eq 0 ]; then
    echo "RESULT: ALL SCHEMA AUTH DIRECTIVE TESTS PASSED"
    exit 0
else
    echo "RESULT: SOME SCHEMA AUTH DIRECTIVE TESTS FAILED"
    exit 1
fi
