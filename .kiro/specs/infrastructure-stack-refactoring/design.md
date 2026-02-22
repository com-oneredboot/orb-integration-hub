# Design Document: Infrastructure Stack Refactoring

## Overview

This design document describes the refactoring of CDK infrastructure stacks from technology-based naming (CognitoStack, DynamoDBStack, AppSyncStack, LambdaStack) to function-based naming (AuthorizationStack, DataStack, ApiStack, ComputeStack). The refactoring also reorganizes the API Key Authorizer Lambda from the Compute Stack to the Authorization Stack and adds the SDK AppSync API to the API Stack.

The refactoring is primarily a renaming and reorganization effort with minimal logic changes. All existing functionality will be preserved, and the dependency chain will be clarified to reflect the logical flow: Bootstrap → Data → Authorization → Compute → API → Monitoring.

## Architecture

### Current Architecture

```
Bootstrap Stack (S3, SQS, IAM) → writes SSM parameters
    ↓
Cognito Stack (User Pool, Identity Pool, Groups) → writes SSM parameters
    ↓
DynamoDB Stack (All Tables) → writes SSM parameters
    ↓
Lambda Stack (All Lambdas including API Key Authorizer) → reads/writes SSM parameters
    ↓
AppSync Stack (Main API only) → reads/writes SSM parameters
    ↓
Monitoring Stack (CloudWatch) → reads SSM parameters
```

### Target Architecture

```
Bootstrap Stack (S3, SQS, IAM) → writes SSM parameters
    ↓
Data Stack (All Tables) → reads/writes SSM parameters
    ↓
Authorization Stack (Cognito + API Key Authorizer Lambda) → reads/writes SSM parameters
    ↓
Compute Stack (Business Logic Lambdas) → reads/writes SSM parameters
    ↓
API Stack (Main API + SDK API) → reads/writes SSM parameters
    ↓
Monitoring Stack (CloudWatch) → reads SSM parameters
```

### Key Changes

1. **Bootstrap Stack** (unchanged)
   - Writes SSM parameters for S3 bucket names, SQS queue URLs, IAM role ARNs
   - Foundation stack - no dependencies

2. **Data Stack** (renamed from DynamoDBStack)
   - No logic changes
   - Only file/class/stack name changes
   - Writes table names and ARNs to SSM

3. **Authorization Stack** (renamed from CognitoStack, adds API Key Authorizer)
   - Adds API Key Authorizer Lambda (moved from Compute Stack)
   - Adds dependency on Data Stack (needs ApplicationApiKeys table)
   - Reads ApplicationApiKeys table name from SSM
   - Writes Cognito and API Key Authorizer resources to SSM

4. **Compute Stack** (renamed from LambdaStack, removes API Key Authorizer)
   - Removes API Key Authorizer Lambda creation
   - Adds dependency on Authorization Stack
   - Reads table names, Cognito User Pool ID, and layer ARNs from SSM
   - Writes Lambda ARNs to SSM
   - All other Lambdas remain unchanged

5. **API Stack** (renamed from AppSyncStack, adds SDK API)
   - Adds SDK AppSync API using generated `AppSyncSdkApi` construct
   - Configures SDK API with Lambda authorizer (API Key Authorizer)
   - Reads table ARNs, Lambda ARNs, Cognito User Pool ID, and API Key Authorizer ARN from SSM
   - Writes Main and SDK API IDs and URLs to SSM
   - Adds dependency on Authorization Stack

6. **Monitoring Stack** (unchanged)
   - Reads API IDs and URLs from SSM
   - No writes to SSM (terminal stack in dependency chain)

## Components and Interfaces

### Data Stack

**File:** `infrastructure/cdk/stacks/data_stack.py`

**Class:** `DataStack`

**Purpose:** Creates all DynamoDB tables using generated constructs.

**Dependencies:**
- Bootstrap Stack (implicit - needs S3, IAM)

**Reads from SSM:**
- None (foundation stack)

**Writes to SSM:**
- Table names: `/orb/integration-hub/dev/dynamodb/{table}/table-name`
- Table ARNs: `/orb/integration-hub/dev/dynamodb/{table}/table-arn`

**Changes from DynamoDBStack:**
- File renamed: `dynamodb_stack.py` → `data_stack.py`
- Class renamed: `DynamoDBStack` → `DataStack`
- Stack ID: `{prefix}-dynamodb` → `{prefix}-data`
- No logic changes

### Authorization Stack

**File:** `infrastructure/cdk/stacks/authorization_stack.py`

**Class:** `AuthorizationStack`

**Purpose:** Creates Cognito resources and API Key Authorizer Lambda for authentication and authorization.

**Dependencies:**
- Bootstrap Stack (needs S3, SQS, IAM)
- Data Stack (needs ApplicationApiKeys table for API Key Authorizer)

**Reads from SSM:**
- ApplicationApiKeys table name: `/orb/integration-hub/dev/dynamodb/applicationapikeys/table-name`

**Writes to SSM:**
- Cognito User Pool ID: `/orb/integration-hub/dev/cognito/user-pool-id`
- Cognito User Pool ARN: `/orb/integration-hub/dev/cognito/user-pool-arn`
- Cognito Client ID: `/orb/integration-hub/dev/cognito/client-id`
- Identity Pool ID: `/orb/integration-hub/dev/cognito/identity-pool-id`
- QR Issuer: `/orb/integration-hub/dev/cognito/qr-issuer`
- SMS Verification Topic ARN: `/orb/integration-hub/dev/cognito/phone-number-verification-topic/arn`
- API Key Authorizer Lambda ARN: `/orb/integration-hub/dev/lambda/apikeyauthorizer/arn`

**Changes from CognitoStack:**
- File renamed: `cognito_stack.py` → `authorization_stack.py`
- Class renamed: `CognitoStack` → `AuthorizationStack`
- Stack ID: `{prefix}-cognito` → `{prefix}-authorization`
- Adds `_create_api_key_authorizer_lambda()` method (moved from ComputeStack)
- Adds dependency on Data Stack

**New Method: _create_api_key_authorizer_lambda()**

```python
def _create_api_key_authorizer_lambda(self) -> lambda_.Function:
    """Create API Key Authorizer Lambda for SDK AppSync API.
    
    This Lambda validates API keys in the format orb_{env}_{key} and returns
    application/organization context on success.
    """
    # Create dedicated role with minimal permissions
    authorizer_role = iam.Role(
        self,
        "ApiKeyAuthorizerRole",
        role_name=self.config.resource_name("api-key-authorizer-role"),
        assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
        managed_policies=[
            iam.ManagedPolicy.from_aws_managed_policy_name(
                "service-role/AWSLambdaBasicExecutionRole"
            ),
        ],
    )
    
    # Read ApplicationApiKeys table name from SSM
    api_keys_table_name = ssm.StringParameter.value_for_string_parameter(
        self,
        self.config.ssm_parameter_name("dynamodb/applicationapikeys/table-name"),
    )
    
    # DynamoDB access for ApplicationApiKeys table
    authorizer_role.add_to_policy(
        iam.PolicyStatement(
            sid="DynamoDBApiKeysAccess",
            effect=iam.Effect.ALLOW,
            actions=[
                "dynamodb:GetItem",
                "dynamodb:Query",
                "dynamodb:Scan",
                "dynamodb:UpdateItem",
            ],
            resources=[
                f"arn:aws:dynamodb:{self.region}:{self.account}:table/{api_keys_table_name}",
                f"arn:aws:dynamodb:{self.region}:{self.account}:table/{api_keys_table_name}/index/*",
            ],
        )
    )
    
    # CloudWatch Logging
    authorizer_role.add_to_policy(
        iam.PolicyStatement(
            sid="CloudWatchLogging",
            effect=iam.Effect.ALLOW,
            actions=[
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
            ],
            resources=[
                f"arn:aws:logs:{self.region}:{self.account}:log-group:/aws/lambda/{self.config.prefix}-api-key-authorizer*",
            ],
        )
    )
    
    function = lambda_.Function(
        self,
        "ApiKeyAuthorizerLambda",
        function_name=self.config.resource_name("api-key-authorizer"),
        description="Lambda authorizer for SDK AppSync API - validates API keys",
        runtime=lambda_.Runtime.PYTHON_3_12,
        handler="index.lambda_handler",
        code=lambda_.Code.from_asset("../apps/api/lambdas/api_key_authorizer"),
        timeout=Duration.seconds(10),
        memory_size=128,
        role=authorizer_role,
        environment={
            "APPLICATION_API_KEYS_TABLE": api_keys_table_name,
            "LOGGING_LEVEL": "INFO",
            "VERSION": "1",
            "RATE_LIMIT_MAX_REQUESTS": "100",
        },
        dead_letter_queue_enabled=True,
    )
    
    # Export Lambda ARN to SSM
    ssm.StringParameter(
        self,
        "ApiKeyAuthorizerLambdaArnParameter",
        parameter_name=self.config.ssm_parameter_name("lambda/apikeyauthorizer/arn"),
        string_value=function.function_arn,
        description="ARN of the API Key Authorizer Lambda function",
    )
    
    return function
```

### Compute Stack

**File:** `infrastructure/cdk/stacks/compute_stack.py`

**Class:** `ComputeStack`

**Purpose:** Creates business logic Lambda functions.

**Dependencies:**
- Data Stack (needs table names from SSM)
- Authorization Stack (needs Cognito User Pool ID from SSM)

**Reads from SSM:**
- Table names: `/orb/integration-hub/dev/dynamodb/{table}/table-name`
- Cognito User Pool ID: `/orb/integration-hub/dev/cognito/user-pool-id`
- Lambda layer ARNs: `/orb/integration-hub/dev/lambda-layers/{layer}/arn`

**Writes to SSM:**
- Lambda ARNs for each function: `/orb/integration-hub/dev/lambda/{function}/arn`

**Lambda Functions:**
- CheckEmailExists
- CreateUserFromCognito
- GetCurrentUser
- GetApplicationUsers
- SmsVerification
- CognitoGroupManager
- UserStatusCalculator
- Organizations

**Changes from LambdaStack:**
- File renamed: `lambda_stack.py` → `compute_stack.py`
- Class renamed: `LambdaStack` → `ComputeStack`
- Stack ID: `{prefix}-lambda` → `{prefix}-compute`
- Removes `_create_api_key_authorizer_lambda()` method
- Removes `api_key_authorizer_lambda` attribute
- Removes API Key Authorizer from `self.functions` dictionary
- Constructor parameter: `cognito_stack: CognitoStack` → `authorization_stack: AuthorizationStack`
- Updates all references to `self.cognito_stack` → `self.authorization_stack`
- Adds dependency on Authorization Stack (in app.py)

### API Stack

**File:** `infrastructure/cdk/stacks/api_stack.py`

**Class:** `ApiStack`

**Purpose:** Creates Main and SDK AppSync APIs.

**Dependencies:**
- Data Stack (needs table references from SSM)
- Compute Stack (needs Lambda ARNs from SSM)
- Authorization Stack (needs Cognito User Pool ID and API Key Authorizer Lambda ARN from SSM)

**Reads from SSM:**
- Table ARNs: `/orb/integration-hub/dev/dynamodb/{table}/table-arn`
- Lambda ARNs: `/orb/integration-hub/dev/lambda/{function}/arn`
- Cognito User Pool ID: `/orb/integration-hub/dev/cognito/user-pool-id`
- API Key Authorizer Lambda ARN: `/orb/integration-hub/dev/lambda/apikeyauthorizer/arn`

**Writes to SSM:**
- Main API ID: `/orb/integration-hub/dev/appsync/main/api-id`
- Main API URL: `/orb/integration-hub/dev/appsync/main/api-url`
- SDK API ID: `/orb/integration-hub/dev/appsync/sdk/api-id`
- SDK API URL: `/orb/integration-hub/dev/appsync/sdk/api-url`

**Changes from AppSyncStack:**
- File renamed: `appsync_stack.py` → `api_stack.py`
- Class renamed: `AppSyncStack` → `ApiStack`
- Stack ID: `{prefix}-appsync` → `{prefix}-api`
- Adds `_create_sdk_api()` method
- Adds SDK API SSM parameter exports

**New Method: _create_sdk_api()**

```python
def _create_sdk_api(self) -> None:
    """Create SDK AppSync API using generated construct.
    
    The SDK API uses Lambda authorizer (API Key Authorizer) for programmatic access.
    """
    # Read API Key Authorizer Lambda ARN from SSM
    api_key_authorizer_arn = ssm.StringParameter.value_for_string_parameter(
        self,
        self.config.ssm_parameter_name("lambda/apikeyauthorizer/arn"),
    )
    
    # Load tables from SSM (same as Main API)
    tables = self._load_tables_from_ssm()
    
    # Create SDK API using generated construct
    self.sdk_api = AppSyncSdkApi(
        self,
        "AppSyncSdkApi",
        tables=tables,
        authorizer_lambda_arn=api_key_authorizer_arn,
        enable_xray=True,
    )
    
    # Export SDK API ID and URL to SSM
    ssm.StringParameter(
        self,
        "SdkApiIdParameter",
        parameter_name=self.config.ssm_parameter_name("appsync/sdk/api-id"),
        string_value=self.sdk_api.api_id,
        description="SDK AppSync API ID",
    )
    
    ssm.StringParameter(
        self,
        "SdkApiUrlParameter",
        parameter_name=self.config.ssm_parameter_name("appsync/sdk/api-url"),
        string_value=self.sdk_api.graphql_url,
        description="SDK AppSync API GraphQL URL",
    )
```

### app.py Changes

**Updated Stack Instantiation:**

```python
# Stack naming convention: {customer_id}-{project_id}-{environment}-{stack_name}
stack_prefix = f"{config.customer_id}-{config.project_id}-{config.environment}"

# ===== Foundation Stacks (no dependencies) =====

# Bootstrap Stack - S3 buckets, IAM, SQS queues
bootstrap_stack = BootstrapStack(
    app,
    f"{stack_prefix}-bootstrap",
    config=config,
    env=env,
    description="Bootstrap resources: S3 buckets, IAM, SQS queues",
)

# Data Stack - All DynamoDB tables (writes SSM parameters)
data_stack = DataStack(
    app,
    f"{stack_prefix}-data",
    env=env,
    description="DynamoDB tables (writes table names/ARNs to SSM)",
)

# Authorization Stack - Cognito and API Key Authorizer Lambda
authorization_stack = AuthorizationStack(
    app,
    f"{stack_prefix}-authorization",
    config=config,
    env=env,
    description="Authorization resources: Cognito User Pool, Identity Pool, Groups, API Key Authorizer",
)

# Frontend Stack - S3 and CloudFront for website
frontend_stack = FrontendStack(
    app,
    f"{stack_prefix}-frontend",
    config=config,
    env=env,
    description="Frontend resources: S3 bucket, CloudFront distribution",
)

# ===== Application Stacks (with dependencies) =====

# Compute Stack - Business logic Lambda functions
compute_stack = ComputeStack(
    app,
    f"{stack_prefix}-compute",
    config=config,
    authorization_stack=authorization_stack,
    env=env,
    description="Lambda functions for business logic",
)

# API Stack - Main and SDK GraphQL APIs
api_stack = ApiStack(
    app,
    f"{stack_prefix}-api",
    config=config,
    env=env,
    description="AppSync APIs: Main (Cognito auth) and SDK (Lambda auth)",
)

# Monitoring Stack - CloudWatch dashboards and alarms
monitoring_stack = MonitoringStack(
    app,
    f"{stack_prefix}-monitoring",
    config=config,
    env=env,
    description="Monitoring: CloudWatch dashboards, alarms, GuardDuty",
)

# Add stack dependencies explicitly
# Bootstrap must deploy first (provides S3, SQS, IAM)
data_stack.add_dependency(bootstrap_stack)
authorization_stack.add_dependency(bootstrap_stack)
authorization_stack.add_dependency(data_stack)  # Needs ApplicationApiKeys table
frontend_stack.add_dependency(bootstrap_stack)

# Compute depends on Data and Authorization
compute_stack.add_dependency(data_stack)
compute_stack.add_dependency(authorization_stack)

# API depends on Data, Compute, and Authorization
api_stack.add_dependency(data_stack)
api_stack.add_dependency(compute_stack)
api_stack.add_dependency(authorization_stack)

# Monitoring depends on API
monitoring_stack.add_dependency(api_stack)
```

## Data Models

No new data models are introduced. All existing data models remain unchanged.

## Correctness Properties


A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Stack Naming Consistency

*For all* refactored stacks (Data, Authorization, Compute, API), the CloudFormation stack name SHALL follow the pattern `{prefix}-{descriptive-name}` where descriptive-name reflects the stack's functional purpose (data, authorization, compute, api) rather than technology (dynamodb, cognito, lambda, appsync).

**Validates: Requirements 1.4, 2.4, 3.4, 4.4, 10.2**

### Property 2: Resource Preservation

*For all* refactored stacks, all existing AWS resources (DynamoDB tables, Cognito resources, Lambda functions, AppSync APIs) SHALL be created with identical configurations after refactoring, ensuring no functional changes occur during the rename.

**Validates: Requirements 1.5, 1.6, 2.6, 3.6**

### Property 3: Dependency Chain Integrity

*For all* stacks in the system, the dependency chain SHALL form a directed acyclic graph (DAG) with the structure: Bootstrap → Data → Authorization → Compute → API → Monitoring, where each stack only depends on stacks that appear earlier in the chain.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 10.5**

### Property 4: SSM Parameter Consistency

*For all* SSM parameters written by stacks, the parameter names SHALL follow the pattern `/orb/integration-hub/dev/{category}/{resource}/{ attribute}` and all parameter reads SHALL reference parameters that were written by a stack earlier in the dependency chain.

**Validates: Requirements 1.6, 2.7, 4.8, 10.4**

### Property 5: No CloudFormation Exports

*For all* CloudFormation templates generated by CDK synthesis, there SHALL be zero CloudFormation exports (Outputs with Export property), ensuring all cross-stack references use SSM Parameter Store instead.

**Validates: Requirements 10.3**

## Error Handling

### Stack Rename Migration

**Challenge:** CloudFormation treats stack renames as stack deletions + creations, which would destroy and recreate all resources.

**Solution:** This refactoring does NOT rename existing deployed stacks. Instead:
1. The CDK code is refactored with new names
2. New stacks are deployed with new names
3. Old stacks are manually deleted after verification
4. This is a breaking change that requires coordination

**Alternative (Recommended):** Deploy to a new environment first to validate the refactoring before applying to production.

### Dependency Violations

**Challenge:** If Authorization Stack is deployed before Data Stack, the API Key Authorizer Lambda will fail because ApplicationApiKeys table doesn't exist.

**Solution:** CDK dependency declarations (`add_dependency()`) ensure CloudFormation deploys stacks in the correct order. The dependency chain is enforced at synthesis time.

### Missing SSM Parameters

**Challenge:** If a stack tries to read an SSM parameter that hasn't been written yet, deployment fails.

**Solution:** 
1. All SSM parameter reads use `StringParameter.value_for_string_parameter()` which creates an implicit dependency
2. Explicit stack dependencies ensure parameters are written before they're read
3. Parameter naming convention is consistent across all stacks

### Test Failures

**Challenge:** Existing tests may fail after renaming stacks and moving resources.

**Solution:**
1. Update test imports to use new class names
2. Update test assertions to use new stack names
3. Move API Key Authorizer tests from Compute Stack tests to Authorization Stack tests
4. Add new tests for SDK API in API Stack tests
5. Run full test suite before deployment

## Testing Strategy

### Unit Tests

Unit tests will verify specific examples and edge cases:

1. **File and Class Renaming**
   - Verify `data_stack.py` exists and `dynamodb_stack.py` doesn't exist
   - Verify `DataStack` class exists in `data_stack.py`
   - Verify `authorization_stack.py` exists and `cognito_stack.py` doesn't exist
   - Verify `AuthorizationStack` class exists in `authorization_stack.py`
   - Verify `compute_stack.py` exists and `lambda_stack.py` doesn't exist
   - Verify `ComputeStack` class exists in `compute_stack.py`
   - Verify `api_stack.py` exists and `appsync_stack.py` doesn't exist
   - Verify `ApiStack` class exists in `api_stack.py`

2. **Import Updates**
   - Verify `app.py` imports `DataStack` and not `DynamoDBStack`
   - Verify `app.py` imports `AuthorizationStack` and not `CognitoStack`
   - Verify `app.py` imports `ComputeStack` and not `LambdaStack`
   - Verify `app.py` imports `ApiStack` and not `AppSyncStack`
   - Verify `compute_stack.py` references `authorization_stack` parameter

3. **API Key Authorizer Relocation**
   - Verify `AuthorizationStack` has `_create_api_key_authorizer_lambda()` method
   - Verify `ComputeStack` does NOT have `_create_api_key_authorizer_lambda()` method
   - Verify API Key Authorizer Lambda ARN is written to SSM by Authorization Stack

4. **SDK API Addition**
   - Verify `ApiStack` has `_create_sdk_api()` method
   - Verify SDK API ID and URL are written to SSM by API Stack
   - Verify SDK API references API Key Authorizer Lambda ARN from SSM

5. **Stack Dependencies**
   - Verify Bootstrap Stack has no dependencies
   - Verify Data Stack depends on Bootstrap
   - Verify Authorization Stack depends on Bootstrap and Data
   - Verify Compute Stack depends on Data and Authorization
   - Verify API Stack depends on Data, Compute, and Authorization
   - Verify Monitoring Stack depends on API
   - Verify Frontend Stack depends only on Bootstrap

6. **CDK Synthesis**
   - Verify `cdk synth --all` completes without errors
   - Verify generated CloudFormation templates have correct stack names
   - Verify no CloudFormation exports exist in any template

7. **Test Suite Updates**
   - Verify `test_authorization_stack.py` exists and `test_cognito_stack.py` doesn't exist
   - Verify all test imports use new class names
   - Verify API Key Authorizer tests exist in Authorization Stack tests
   - Verify SDK API tests exist in API Stack tests
   - Verify all tests pass

8. **Documentation Updates**
   - Verify `infrastructure/cdk/README.md` contains new stack names
   - Verify README documents dependency chain
   - Verify README documents API Key Authorizer location
   - Verify README documents both Main and SDK APIs
   - Verify CHANGELOG.md contains refactoring entry with issue numbers

### Property-Based Tests

Property-based tests will verify universal properties across all inputs. Each test should run a minimum of 100 iterations.

1. **Property Test: Stack Naming Consistency**
   - **Feature: infrastructure-stack-refactoring, Property 1: Stack Naming Consistency**
   - Generate: All stack names from synthesized CloudFormation templates
   - Verify: Each stack name matches pattern `{prefix}-{descriptive-name}`
   - Verify: No stack names contain technology terms (dynamodb, cognito, lambda, appsync)

2. **Property Test: Resource Preservation**
   - **Feature: infrastructure-stack-refactoring, Property 2: Resource Preservation**
   - Generate: List of all resources in original stacks (before refactoring)
   - Compare: Resources in refactored stacks (after refactoring)
   - Verify: All resources exist in both with identical configurations
   - Verify: Resource counts match (same number of tables, Lambdas, APIs, etc.)

3. **Property Test: Dependency Chain Integrity**
   - **Feature: infrastructure-stack-refactoring, Property 3: Dependency Chain Integrity**
   - Generate: Dependency graph from CloudFormation templates
   - Verify: Graph is a DAG (no cycles)
   - Verify: Dependency order matches: Bootstrap → Data → Authorization → Compute → API → Monitoring
   - Verify: No stack depends on a stack later in the chain

4. **Property Test: SSM Parameter Consistency**
   - **Feature: infrastructure-stack-refactoring, Property 4: SSM Parameter Consistency**
   - Generate: All SSM parameter writes from all stacks
   - Generate: All SSM parameter reads from all stacks
   - Verify: All parameter names follow pattern `/orb/integration-hub/dev/{category}/{resource}/{attribute}`
   - Verify: Every parameter read has a corresponding write in an earlier stack
   - Verify: No dangling parameter reads (reads without writes)

5. **Property Test: No CloudFormation Exports**
   - **Feature: infrastructure-stack-refactoring, Property 5: No CloudFormation Exports**
   - Generate: All CloudFormation templates from `cdk synth --all`
   - Parse: Each template's Outputs section
   - Verify: No Output has an Export property
   - Verify: All cross-stack references use SSM Parameter Store

### Testing Tools

- **CDK Testing Framework**: Use `@aws-cdk/assert` for unit tests
- **pytest**: Python test framework for property-based tests
- **Hypothesis**: Property-based testing library for Python
- **CloudFormation Template Parser**: Parse synthesized templates for verification

### Test Execution

```bash
# Run unit tests
cd infrastructure && PIPENV_IGNORE_VIRTUALENVS=1 pipenv run pytest cdk/tests/ -v

# Run CDK synthesis
cd infrastructure/cdk && cdk synth --all

# Verify no errors in synthesis
echo $?  # Should be 0

# Run property-based tests (after implementation)
cd infrastructure && PIPENV_IGNORE_VIRTUALENVS=1 pipenv run pytest cdk/tests/test_refactoring_properties.py -v
```

## Migration Strategy

### Phase 1: Code Refactoring (Non-Breaking)

1. Create new stack files with new names
2. Copy all logic from old files to new files
3. Update imports in `app.py`
4. Keep old stack files with `.old` extension for reference
5. Run `cdk synth --all` to verify synthesis works
6. Run all tests to verify correctness

### Phase 2: Deployment (Breaking Change)

**Option A: New Environment Deployment (Recommended)**
1. Deploy refactored stacks to a new environment (e.g., `dev2`)
2. Verify all resources are created correctly
3. Run integration tests against new environment
4. Once validated, apply to production environments

**Option B: In-Place Migration (Risky)**
1. Deploy new stacks with new names alongside old stacks
2. Verify new stacks work correctly
3. Update application configuration to use new stack resources
4. Delete old stacks manually
5. **WARNING**: This creates duplicate resources temporarily and requires careful coordination

### Phase 3: Cleanup

1. Delete old stack files (`.old` files)
2. Update all documentation
3. Update CI/CD pipelines with new stack names
4. Archive old CloudFormation stacks (if using Option B)

## Rollback Plan

If issues are discovered after deployment:

1. **Immediate**: Revert `app.py` to use old stack names
2. **Redeploy**: Run `cdk deploy --all` to restore old stacks
3. **Investigate**: Analyze what went wrong
4. **Fix**: Update refactored code to address issues
5. **Retry**: Attempt migration again after fixes

## Documentation Updates

### Files to Update

1. **infrastructure/cdk/README.md**
   - Update stack descriptions with new names
   - Document dependency chain
   - Document API Key Authorizer location
   - Document Main and SDK API architecture
   - Add rationale for descriptive naming

2. **CHANGELOG.md**
   - Add entry for stack refactoring
   - Include issue numbers
   - Follow format: `- Refactored CDK stacks to use descriptive names (#issue)`

3. **Architecture Diagrams** (if any)
   - Update stack names in diagrams
   - Update dependency arrows

4. **Deployment Documentation**
   - Update stack names in deployment commands
   - Update troubleshooting guides

### Documentation Rationale

**Why Descriptive Names?**

Technology-based naming (CognitoStack, DynamoDBStack) has several drawbacks:
- Obscures functional purpose
- Becomes misleading if technology changes
- Doesn't scale well (what if we add multiple databases?)
- Harder for new team members to understand architecture

Function-based naming (AuthorizationStack, DataStack) provides:
- Clear indication of stack purpose
- Technology-agnostic (can change implementation without renaming)
- Better separation of concerns
- Easier to understand system architecture at a glance

**Why Co-locate API Key Authorizer with Authorization?**

The API Key Authorizer Lambda is conceptually part of the authorization layer:
- It validates API keys (authorization function)
- It's used by the SDK API for authentication
- It depends on ApplicationApiKeys table (authorization data)
- Separating it from business logic Lambdas improves clarity

**Why Both APIs in One Stack?**

Both Main and SDK APIs are part of the API layer:
- They serve the same data models
- They use the same resolvers and data sources
- They differ only in authentication mechanism
- Co-locating them simplifies dependency management
