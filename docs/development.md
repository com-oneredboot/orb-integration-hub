# Development Guide - Orb Integration Hub

This guide provides instructions for setting up the development environment and common development workflows for the Orb Integration Hub project.

## 1. Prerequisites

*   **Node.js & npm:** Node.js `^18.13.0` or `>=20.9.0`. Check your version with `node -v`. Comes with compatible npm.
*   **Angular CLI:** `v19.x`. Install globally with `npm install -g @angular/cli@19`. Verify with `ng version`.
*   **Python & Pip:** Python `3.12.x`. Check with `python --version`. Comes with compatible pip.
*   **Pipenv:** Latest version recommended. Install with `pip install pipenv`.
*   **AWS CLI:** Latest version recommended. Install and configure following AWS documentation. Ensure credentials provide necessary access to project AWS resources.
*   **AWS SAM CLI:** Latest version recommended. Install following AWS documentation. Required for local backend development and deployment.
*   **Docker:** Latest version recommended. Required for `sam local` commands.
*   **Git:** Standard version control.
*   **Code Editor:** VS Code recommended with relevant extensions (Angular Language Service, Python [ms-python.python], Prettier, ESLint).

## 2. Initial Setup

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/CoreyDalePeters/orb-integration-hub.git
    cd orb-integration-hub
    ```
2.  **Install Frontend Dependencies:**
    ```bash
    cd frontend
    npm install
    cd ..
    ```
3.  **Install Backend Dependencies:**
    ```bash
    # Install internal Python packages
    cd backend/packages/orb-common
    pip install -e .
    cd ../orb-models
    pip install -e .
    cd ../../..
    
    # Install Lambda function dependencies
    cd backend/src/lambdas
    for dir in */; do
        if [ -f "$dir/Pipfile" ]; then
            echo "Installing dependencies for $dir"
            cd "$dir"
            pipenv install --dev
            cd ..
        fi
    done
    cd ../../..
    ```
4.  **Install Schema Generator Dependencies:**
    ```bash
    cd schemas
    pipenv install --dev
    cd ..
    ```
5.  **Configure AWS Amplify:**
    *   The frontend uses AWS Amplify. After installing dependencies, you might need to configure Amplify by pulling the backend configuration.
    *   Check the `frontend/README.md` or Amplify documentation for specific commands like `amplify pull` or `npx ampx generate outputs --stack [YourCloudFormationStackName]`. *(Self-correction: Found Amplify command in repo README)*
    ```bash
    cd frontend
    # Replace [YourCloudFormationStackName] if needed
    npx ampx generate outputs --stack orb-integration-hub-api-cognito
    cd ..
    ```

6.  **Environment Variables:**
    *   The frontend uses Angular's environment files: `frontend/src/environments/environment.ts` (for development) and `frontend/src/environments/environment.prod.ts` (for production builds).
    *   These files contain configuration like Cognito IDs and the AppSync GraphQL endpoint details.
    *   Local development uses the values in `environment.ts`, which should point to your development AWS resources (Cognito pool, AppSync API).
    *   **Important:** Ensure sensitive values (like API keys if used directly) are handled appropriately and potentially replaced during CI/CD for production builds, or use Amplify's configuration mechanisms which avoid hardcoding keys.

## 3. Running the Application Locally

*   **Backend (AWS SAM):**
    *   Local backend execution is **not** the standard workflow for this project.
    *   Backend changes are deployed to AWS via GitHub Actions and tested against the deployed environment.
*   **Frontend (Angular CLI):**
    ```bash
    cd frontend
    # Starts the dev server
    npm start
    cd ..
    ```
    *   Access at `http://localhost:4200`.
    *   The frontend connects directly to the AWS backend (Cognito, AppSync) configured via Amplify and the `environment.ts` file. No local proxy is typically needed.

## 4. Schema Generation Workflow

1.  Modify schema definitions in `schemas/entities/*.yml`.
2.  Modify templates if necessary in `schemas/templates/*.jinja`.
3.  Run the generator from the root directory:
    ```bash
    # Ensure you are in the schemas pipenv environment or have dependencies installed
    cd schemas
    pipenv run python generate.py
    cd ..
    ```
4.  Verify generated files:
    - Check `backend/packages/orb-models/orb_models/models/` for Python models
    - Check `backend/packages/orb-models/orb_models/enums/` for Python enums
    - Check `frontend/src/models/` for TypeScript models
    - Check `infrastructure/cloudformation/` for:
      - Latest `appsync_*.graphql` file
      - Updated `appsync.yml` and `dynamodb.yml`
5.  Commit *both* the schema changes *and* the generated files.

**Important:** Never edit generated files directly.

## 5. Deployment Process

1. **Schema Validation**:
   - After schema generation, verify the GraphQL schema:
     ```bash
     cd infrastructure/cloudformation
     # Find the latest generated schema file
     SCHEMA_FILE=$(find . -name "appsync_*.graphql" | sort -r | head -1)
     ```
   - Check for:
     - Proper type definitions
     - Query and mutation definitions
     - Input type definitions
     - No duplicate operations

2. **Deployment Steps**:
   - Use GitHub Actions workflow:
     1. Go to Actions tab in GitHub repository
     2. Select "deploy-backend" workflow
     3. Click "Run workflow"
     4. Select environment and required parameters
     5. Monitor deployment progress

3. **Post-Deployment Verification**:
   - Check AWS AppSync console for:
     - Updated schema
     - Working resolvers
     - No deployment errors
   - Test queries using AppSync console or frontend application
   - Verify DynamoDB table updates

4. **Common Issues**:
   - Schema validation errors: Check YAML syntax and required fields
   - Deployment failures: Check CloudFormation logs
   - Query errors: Verify generated schema matches expected operations
   - Resolver issues: Check AppSync console for resolver mapping errors

## 6. Running Tests

For comprehensive testing guidelines and best practices, see [Testing Guidelines](./testing-guidelines.md).

*   **Frontend:**
    ```bash
    cd frontend
    # Run unit tests
    npm run test
    # Run linter
    npm run lint
    cd ..
    ```
*   **Backend:**
    ```bash
    # Test internal packages
    cd backend/packages/orb-common
    pytest
    cd ../orb-models
    pytest
    cd ../../..
    
    # Test Lambda functions
    cd backend/src/lambdas
    for dir in */; do
        if [ -f "$dir/Pipfile" ] && [ -d "$dir/tests" ]; then
            echo "Testing $dir"
            cd "$dir"
            pipenv run pytest
            cd ..
        fi
    done
    cd ../../..
    ```

## 7. Coding Style & Conventions

### Frontend
* Adheres to Angular standards and ESLint rules defined in `frontend/eslint.config.js`
* Uses Prettier (likely via VS Code extension) for formatting

### Backend Python Code Quality Standards

All Python code must pass the following quality checks before deployment:

#### Required Tools
1. **Black** - Code formatter (line-length: 100)
   ```bash
   black --check .
   ```

2. **isort** - Import organizer (profile: black)
   ```bash
   isort --check-only . --profile black --line-length 100
   ```

3. **mypy** - Type checker
   ```bash
   mypy <package> --ignore-missing-imports
   ```

4. **bandit** - Security linter
   ```bash
   bandit -r <package> -f json
   ```

#### Configuration
Each Python package must have a `pyproject.toml` with:

```toml
[tool.black]
line-length = 100
target-version = ['py312']

[tool.isort]
profile = "black"
line_length = 100

[tool.mypy]
python_version = "3.12"
disallow_untyped_defs = true
```

#### Pre-commit Workflow
Before committing Python code:
```bash
# Format code
black .
isort .

# Run checks
black --check .
isort --check-only .
mypy <package> --ignore-missing-imports
bandit -r <package>
pytest
```

All CI/CD pipelines enforce these standards automatically.

## 8a. Using the MCP Memory Graph

The MCP Memory Graph is a living knowledge base for entities, relationships, and key observations in the project. Keeping it up to date helps the team and AI agents reason about architecture, dependencies, and lessons learned.

**When to update the Memory Graph:**
- When adding a new feature, service, error type, or workflow
- When discovering a recurring issue or making a key architectural/implementation decision
- After completing a major feature, refactor, or resolving a significant bug
- When updating documentation that changes project structure or conventions

**How to update:**
- Use the MCP tools to add entities, relationships, and observations (see project README for examples)
- Reference the Memory Graph when planning, debugging, or onboarding
- After updating a task/subtask (especially when logging new findings), check if a new entity, relationship, or observation should be added to the Memory Graph

**Example actions:**
- Add an entity: `admin-interface` (type: feature)
- Add a relationship: `admin-interface` manages `UserProfileService`
- Add an observation: `UserProfileService`: 'Switched to ISO string timestamps for DynamoDB compatibility (2024-06-01)'

**Review:**
- Periodically review the Memory Graph for gaps or outdated info
- Use it to inform retrospectives, planning, and documentation updates

## 8. Branching Strategy

*   Follows a feature branch workflow:
    1.  Create feature branches from `main` (e.g., `git checkout -b feature/your-feature-name main`).
    2.  Commit changes to the feature branch.
    3.  Push the feature branch to the remote.
    4.  Create a Pull Request (PR) targeting the `main` branch.
    5.  PR requires successful automated tests (GitHub Actions) and manual verification/review before merging.

## 9. Deployment

*   Deployment is automated via GitHub Actions upon merges to the `main` branch (Verify triggers in workflow files).
*   See workflow files in `.github/workflows/` (`deploy-backend.yml`, `deploy-frontend.yml`).

## 10. Troubleshooting

*   **SAM Local Issues:** Ensure Docker is running. Check AWS credentials. Verify `--env-vars` path/format.
*   **Frontend Build Issues:** Delete `node_modules` and `package-lock.json`, then run `npm install` again.
*   **Schema Generation Errors:** Check YAML syntax in `schemas/entities/`. Ensure schema `pipenv` environment is active or dependencies are installed.
*   *(Add more common issues and solutions)*

## Auto-Generated CRUD and List Resolvers for DynamoDB Entities

As of [DATE], the code generation process automatically creates standard CRUD (Create, Update, Delete, Get, List) resolvers for every DynamoDB entity schema. You do **not** need to manually specify these in the `operations` field of your entity YAML files.

- **Default resolvers generated:**
  - Create<Entity>
  - Update<Entity>
  - Delete<Entity>
  - Get<Entity>
  - List<Entity>
- These are always present for every entity with `type: dynamodb`.
- If you need custom or extra operations (e.g., special queries, mutations, or GSI-based queries), you can add an `operations` field to your schema YAML. These will be merged with the defaults.
- See `schemas/templates/appsync_resolver_dynamodb.jinja` for implementation details.

**This reduces boilerplate and ensures a consistent API for all entities.** 