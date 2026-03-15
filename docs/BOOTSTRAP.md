# Environment Bootstrap Guide

This document describes the bootstrap process for setting up a new environment (dev/staging/prod) for the Orb Integration Hub.

## Overview

When deploying to a new environment, certain foundational data must be created before the application can function properly. This includes:

1. Root OWNER user in Cognito and DynamoDB
2. Platform organization
3. Platform application
4. Frontend API key with proper context

## Prerequisites

- AWS CLI configured with appropriate profile
- Access to Cognito User Pool
- Access to DynamoDB tables
- Python 3.x for UUID generation

## Bootstrap Process

### Step 1: Create Root OWNER User in Cognito

```bash
# Generate a strong password
python -c "import secrets, string; chars = string.ascii_letters + string.digits + '!@#$%^&*'; print(''.join(secrets.choice(chars) for _ in range(20)))"
# Record this password securely!

# Create the user
aws --profile sso-orb-{env} cognito-idp admin-create-user \
  --user-pool-id {USER_POOL_ID} \
  --username {OWNER_EMAIL} \
  --user-attributes \
    Name=email,Value={OWNER_EMAIL} \
    Name=email_verified,Value=true \
    Name=given_name,Value={FIRST_NAME} \
    Name=family_name,Value={LAST_NAME} \
  --message-action SUPPRESS \
  --region us-east-1

# Set permanent password
aws --profile sso-orb-{env} cognito-idp admin-set-user-password \
  --user-pool-id {USER_POOL_ID} \
  --username {OWNER_EMAIL} \
  --password "{GENERATED_PASSWORD}" \
  --permanent \
  --region us-east-1

# Add to OWNER group
aws --profile sso-orb-{env} cognito-idp admin-add-user-to-group \
  --user-pool-id {USER_POOL_ID} \
  --username {OWNER_EMAIL} \
  --group-name OWNER \
  --region us-east-1
```

**Note the Cognito response:**
- `Username` (UUID) → This is the `cognitoId`
- `sub` attribute → This is the `cognitoSub`

### Step 2: Create User Record in DynamoDB

```bash
# Generate userId
python -c "import uuid; print(str(uuid.uuid4()))"
# Record this as USER_ID

# Get current timestamp
python -c "import time; print(int(time.time()))"
# Record this as TIMESTAMP

# Create user record
aws --profile sso-orb-{env} dynamodb put-item \
  --table-name orb-integration-hub-{env}-table-users \
  --item '{
    "userId": {"S": "{USER_ID}"},
    "cognitoId": {"S": "{COGNITO_USERNAME}"},
    "cognitoSub": {"S": "{COGNITO_SUB}"},
    "email": {"S": "{OWNER_EMAIL}"},
    "firstName": {"S": "{FIRST_NAME}"},
    "lastName": {"S": "{LAST_NAME}"},
    "status": {"S": "ACTIVE"},
    "groups": {"SS": ["OWNER"]},
    "emailVerified": {"BOOL": true},
    "mfaEnabled": {"BOOL": false},
    "mfaSetupComplete": {"BOOL": false},
    "createdAt": {"N": "{TIMESTAMP}"},
    "updatedAt": {"N": "{TIMESTAMP}"}
  }' \
  --region us-east-1
```

### Step 3: Create Platform Organization

```bash
# Generate organizationId
python -c "import uuid; print(str(uuid.uuid4()))"
# Record this as ORG_ID

# Create organization (use file for complex JSON)
cat > temp-org.json << EOF
{
  "organizationId": {"S": "{ORG_ID}"},
  "name": {"S": "OneRedBoot.com"},
  "description": {"S": "Platform organization"},
  "ownerId": {"S": "{USER_ID}"},
  "status": {"S": "ACTIVE"},
  "applicationCount": {"N": "0"},
  "createdAt": {"S": "{TIMESTAMP}"},
  "updatedAt": {"S": "{TIMESTAMP}"}
}
EOF

aws --profile sso-orb-{env} dynamodb put-item \
  --table-name orb-integration-hub-{env}-table-organizations \
  --item file://temp-org.json \
  --region us-east-1

rm temp-org.json
```

**Note:** The `createdAt` and `updatedAt` fields must be strings (type "S"), not numbers, because the `StatusCreatedIndex` GSI uses `createdAt` as a sort key with string type.

### Step 4: Create Platform Application

```bash
# Generate applicationId
python -c "import uuid; print(str(uuid.uuid4()))"
# Record this as APP_ID

# Create application
cat > temp-app.json << EOF
{
  "applicationId": {"S": "{APP_ID}"},
  "name": {"S": "Integration Hub"},
  "description": {"S": "Platform application for frontend and system operations"},
  "organizationId": {"S": "{ORG_ID}"},
  "ownerId": {"S": "{USER_ID}"},
  "status": {"S": "ACTIVE"},
  "apiKey": {"S": "{FRONTEND_API_KEY}"},
  "environments": {"SS": ["DEVELOPMENT", "STAGING", "PRODUCTION"]},
  "groupCount": {"N": "0"},
  "userCount": {"N": "0"},
  "roleCount": {"N": "0"},
  "createdAt": {"S": "{TIMESTAMP}"},
  "updatedAt": {"S": "{TIMESTAMP}"}
}
EOF

aws --profile sso-orb-{env} dynamodb put-item \
  --table-name orb-integration-hub-{env}-table-applications \
  --item file://temp-app.json \
  --region us-east-1

rm temp-app.json
```

### Step 5: Update Frontend API Key

The frontend API key must have `applicationId`, `organizationId`, and `environment` fields for the Lambda authorizer to work correctly.

```bash
aws --profile sso-orb-{env} dynamodb update-item \
  --table-name orb-integration-hub-{env}-table-applicationapikeys \
  --key '{"applicationApiKeyId":{"S":"frontend-web-app"}}' \
  --update-expression "SET applicationId = :appId, organizationId = :orgId, environment = :env" \
  --expression-attribute-values '{
    ":appId": {"S": "{APP_ID}"},
    ":orgId": {"S": "{ORG_ID}"},
    ":env": {"S": "{env}"}
  }' \
  --region us-east-1
```

### Step 6: Verify Bootstrap

```bash
# Verify user exists
aws --profile sso-orb-{env} dynamodb get-item \
  --table-name orb-integration-hub-{env}-table-users \
  --key '{"userId":{"S":"{USER_ID}"}}' \
  --region us-east-1

# Verify organization exists
aws --profile sso-orb-{env} dynamodb get-item \
  --table-name orb-integration-hub-{env}-table-organizations \
  --key '{"organizationId":{"S":"{ORG_ID}"}}' \
  --region us-east-1

# Verify application exists
aws --profile sso-orb-{env} dynamodb get-item \
  --table-name orb-integration-hub-{env}-table-applications \
  --key '{"applicationId":{"S":"{APP_ID}"}}' \
  --region us-east-1

# Verify API key has context
aws --profile sso-orb-{env} dynamodb get-item \
  --table-name orb-integration-hub-{env}-table-applicationapikeys \
  --key '{"applicationApiKeyId":{"S":"frontend-web-app"}}' \
  --region us-east-1
```

## Dev Environment Bootstrap (Completed)

**Date:** 2026-03-06

**Root User:**
- Email: corey@oneredboot.com
- Name: Corey Peters
- Password: `8GR4*7CjoFDbwPufdJmX` (recorded securely)
- Cognito Username: `74b8d428-d021-708e-986f-8a5fc6f23db5`
- Cognito Sub: `74b8d428-d021-708e-986f-8a5fc6f23db5`
- User ID: `858523d2-2e3c-4856-b569-f172fbc9ec66`

**Platform Organization:**
- Name: OneRedBoot.com
- Organization ID: `227d2fad-bef7-44bc-a52d-a46b4fb8a5d4`
- Owner: Corey Peters (`858523d2-2e3c-4856-b569-f172fbc9ec66`)

**Platform Application:**
- Name: Integration Hub
- Application ID: `57998a8f-1fff-456c-9dcd-1956179ba1a2`
- Organization: One Red Boot (`227d2fad-bef7-44bc-a52d-a46b4fb8a5d4`)
- Owner: Corey Peters (`858523d2-2e3c-4856-b569-f172fbc9ec66`)
- Environments: DEVELOPMENT, STAGING, PRODUCTION

**Frontend API Key:**
- Key ID: `frontend-web-app`
- Application ID: `57998a8f-1fff-456c-9dcd-1956179ba1a2`
- Organization ID: `227d2fad-bef7-44bc-a52d-a46b4fb8a5d4`
- Environment: `dev`
- Scopes: CheckEmailExists, CreateUserFromCognito

## Troubleshooting

### API Key Authorization Fails

If the Lambda authorizer returns `BadRequestException`, verify:

1. API key record has `applicationId`, `organizationId`, and `environment` fields
2. These IDs match actual records in the Applications and Organizations tables
3. The key status is `ACTIVE`
4. The key hash matches the plaintext key

### Timestamp Type Mismatch

If you get "Type mismatch for Index Key createdAt Expected: S Actual: N":

- The Organizations table's `StatusCreatedIndex` GSI uses `createdAt` as a string sort key
- Use `{"S": "1772794218"}` not `{"N": "1772794218"}`
- This is a schema quirk - timestamps are usually numbers, but this GSI requires strings

## Security Notes

- Store the root user password in a secure password manager
- Rotate the frontend API key periodically
- Use MFA for the root OWNER account
- Limit OWNER group membership to essential personnel only
