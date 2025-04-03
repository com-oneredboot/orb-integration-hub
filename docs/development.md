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
    cd backend
    pipenv install --dev
    cd ..
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

*   (This section seems accurate based on `generate.py` and previous info)
1.  Modify schema definitions in `schemas/entities/*.yml`.
2.  Modify templates if necessary in `schemas/templates/*.jinja`.
3.  Run the generator from the root directory:
    ```bash
    # Ensure you are in the schemas pipenv environment or have dependencies installed
    cd schemas
    pipenv run python generate.py
    cd ..
    ```
4.  Verify generated files in `backend/src/models/`, `frontend/src/models/`, and `backend/infrastructure/cloudformation/`.
5.  Commit *both* the schema changes *and* the generated files.

**Important:** Never edit generated files directly.

## 5. Running Tests

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
    cd backend
    # Testing: (Assuming pytest is configured in Pipfile/pyproject.toml)
    pipenv run pytest
    # Linting: (Using Black + Flake8 - see pyproject.toml)
    pipenv run black --check .
    pipenv run flake8 .
    cd ..
    ```

## 6. Coding Style & Conventions

*   **Frontend:** Adheres to Angular standards and ESLint rules defined in `frontend/eslint.config.js`. Uses Prettier (likely via VS Code extension) for formatting.
*   **Backend:** Uses **Black** for code formatting and **Flake8** for linting. Configuration is typically in `pyproject.toml`. Ensure these tools are run before committing.

## 7. Branching Strategy

*   Follows a feature branch workflow:
    1.  Create feature branches from `main` (e.g., `git checkout -b feature/your-feature-name main`).
    2.  Commit changes to the feature branch.
    3.  Push the feature branch to the remote.
    4.  Create a Pull Request (PR) targeting the `main` branch.
    5.  PR requires successful automated tests (GitHub Actions) and manual verification/review before merging.

## 8. Deployment

*   Deployment is automated via GitHub Actions upon merges to the `main` branch (Verify triggers in workflow files).
*   See workflow files in `.github/workflows/` (`deploy-backend.yml`, `deploy-frontend.yml`).

## 9. Troubleshooting

*   **SAM Local Issues:** Ensure Docker is running. Check AWS credentials. Verify `--env-vars` path/format.
*   **Frontend Build Issues:** Delete `node_modules` and `package-lock.json`, then run `npm install` again.
*   **Schema Generation Errors:** Check YAML syntax in `schemas/entities/`. Ensure schema `pipenv` environment is active or dependencies are installed.
*   *(Add more common issues and solutions)* 