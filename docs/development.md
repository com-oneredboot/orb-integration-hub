# Development Guide - Orb Integration Hub

This guide provides instructions for setting up the development environment and common development workflows for the Orb Integration Hub project.

## 1. Prerequisites

- **Node.js & npm:** Node.js `^18.13.0` or `>=20.9.0`. Check your version with `node -v`. Comes with compatible npm.
- **Angular CLI:** `v19.x`. Install globally with `npm install -g @angular/cli@19`. Verify with `ng version`.
- **Python & Pip:** Python `3.12.x`. Check with `python --version`. Comes with compatible pip.
- **Pipenv:** Latest version recommended. Install with `pip install pipenv`.
- **AWS CLI:** Latest version recommended. Install and configure following AWS documentation.
- **AWS CDK CLI:** Install with `npm install -g aws-cdk`. Required for infrastructure deployment.
- **Git:** Standard version control.
- **Code Editor:** VS Code recommended with relevant extensions (Angular Language Service, Python [ms-python.python], Prettier, ESLint).

## 2. Initial Setup

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/CoreyDalePeters/orb-integration-hub.git
   cd orb-integration-hub
   ```

2. **Install Frontend Dependencies:**
   ```bash
   cd apps/web
   npm install
   cd ../..
   ```

3. **Install Backend Dependencies:**
   ```bash
   cd apps/api
   pipenv install --dev
   cd ../..
   ```

4. **Install Infrastructure Dependencies:**
   ```bash
   cd infrastructure
   pipenv install --dev
   cd ..
   ```

5. **Configure AWS Amplify:**
   The frontend uses AWS Amplify for authentication. After installing dependencies:
   ```bash
   cd apps/web
   npx ampx generate outputs --stack orb-integration-hub-api-cognito
   cd ../..
   ```

6. **Environment Variables:**
   - The frontend uses Angular's environment files: `apps/web/src/environments/environment.ts` (development) and `apps/web/src/environments/environment.prod.ts` (production).
   - These files contain configuration like Cognito IDs and the AppSync GraphQL endpoint details.
   - Local development uses the values in `environment.ts`, which should point to your development AWS resources.

## 3. Running the Application Locally

- **Backend:** Backend changes are deployed to AWS via GitHub Actions and tested against the deployed environment. Local backend execution is not the standard workflow.

- **Frontend (Angular CLI):**
  ```bash
  cd apps/web
  npm start
  ```
  Access at `http://localhost:4200`. The frontend connects directly to the AWS backend (Cognito, AppSync) configured via Amplify.

## 4. Schema Generation Workflow

1. Modify schema definitions in `schemas/models/*.yml` or `schemas/tables/*.yml`.
2. Run the generator:
   ```bash
   orb-schema-generator generate
   ```
3. Verify generated files:
   - Check `apps/api/models/` for Python models
   - Check `apps/web/src/app/core/models/` for TypeScript models
   - Check `apps/api/graphql/` for GraphQL schema and resolvers
4. Commit both the schema changes and the generated files.

**Important:** Never edit generated files directly.

## 5. Deployment Process

Infrastructure is deployed using AWS CDK via GitHub Actions.

### CDK Deployment

1. **Synthesize stacks locally (optional):**
   ```bash
   cd infrastructure
   pipenv run cdk synth --all
   ```

2. **Deploy via GitHub Actions:**
   - Go to Actions tab in GitHub repository
   - Select `deploy-infrastructure.yml` workflow
   - Click "Run workflow"
   - Select environment and required parameters
   - Monitor deployment progress

3. **Manual deployment (if needed):**
   ```bash
   cd infrastructure
   pipenv run cdk deploy --all --profile sso-orb-dev
   ```

### Post-Deployment Verification

- Check AWS AppSync console for updated schema and working resolvers
- Test queries using AppSync console or frontend application
- Verify DynamoDB table updates
- Check CloudWatch logs for any errors

## 6. Running Tests

**Frontend:**
```bash
cd apps/web
npm run test    # Run unit tests
npm run lint    # Run linter
```

**Backend:**
```bash
cd apps/api
pipenv run pytest           # Run tests
pipenv run black --check .  # Check formatting
pipenv run ruff check .     # Run linter
```

**Infrastructure:**
```bash
cd infrastructure
pipenv run pytest cdk/tests/  # Run CDK tests
```

## 7. Coding Style & Conventions

- **Frontend:** Adheres to Angular standards and ESLint rules defined in `apps/web/eslint.config.js`. Uses Prettier for formatting.
- **Backend:** Uses **Black** for code formatting and **Ruff** for linting. Configuration is in `pyproject.toml`.

## 8. Branching Strategy

Follows a feature branch workflow:
1. Create feature branches from `main` (e.g., `git checkout -b feature/your-feature-name main`).
2. Commit changes to the feature branch.
3. Push the feature branch to the remote.
4. Create a Pull Request (PR) targeting the `main` branch.
5. PR requires successful automated tests (GitHub Actions) and manual verification/review before merging.

## 9. Deployment

Deployment is automated via GitHub Actions upon merges to the `main` branch.
See workflow files in `.github/workflows/`:
- `deploy-infrastructure.yml` - CDK infrastructure deployment
- `deploy-frontend.yml` - Frontend deployment

## 10. Troubleshooting

- **Frontend Build Issues:** Delete `node_modules` and `package-lock.json`, then run `npm install` again.
- **Schema Generation Errors:** Check YAML syntax in `schemas/`. Ensure `orb-schema-generator` is installed.
- **CDK Synth Errors:** Check for circular dependencies in stacks. Run `cdk doctor` for diagnostics.
- **Test Failures:** Ensure all dependencies are installed. Check for missing environment variables.

## Auto-Generated CRUD and List Resolvers

The code generation process automatically creates standard CRUD (Create, Update, Delete, Get, List) resolvers for every DynamoDB entity schema. You do **not** need to manually specify these in the `operations` field of your entity YAML files.

- **Default resolvers generated:** Create, Update, Delete, Get, List for every entity with `type: dynamodb`
- Custom operations can be added via the `operations` field in schema YAML files
- See `schemas/templates/` for implementation details
