# Infrastructure Scripts

This directory contains utility scripts for managing the infrastructure.

## Available Scripts

### `deploy_schema.sh`

**Purpose**: Automates the process of generating, uploading, and deploying the GraphQL schema to AWS AppSync.

**Usage**:

```bash
# Run with default settings
./deploy_schema.sh

# Or specify custom environment variables
CUSTOMER_ID=mycompany PROJECT_ID=myproject ENVIRONMENT=prod ./deploy_schema.sh
```

**What it does**:

1. Runs the schema generator to create the latest schema
2. Uploads the schema to S3 (required for CloudFormation updates)
3. Attempts to update the CloudFormation stack
4. Also updates the AppSync schema directly (for immediate changes)

**Parameters**:

- `CUSTOMER_ID`: Customer identifier (default: "orb")
- `PROJECT_ID`: Project identifier (default: "integration-hub")
- `ENVIRONMENT`: Deployment environment (default: "dev")

**Requirements**:

- AWS CLI configured with appropriate permissions
- Access to the S3 bucket and AppSync API

### `reset_user.sh`

**Purpose**: Utility script for resetting user password in Cognito.

**Usage**:

```bash
./reset_user.sh com-oneredboot-dev us-east-1_bWdAfDhW7 corey@oneredboot.com
```