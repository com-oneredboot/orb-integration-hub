# Project Standards - orb-integration-hub

## Documentation References

For complete coding standards and conventions, see:
- #[[file:repositories/orb-templates/docs/coding-standards/README.md]]
- #[[file:repositories/orb-templates/docs/testing-standards/README.md]]
- #[[file:repositories/orb-templates/docs/project-structure/README.md]]

## AWS Configuration

- Always use `--profile sso-orb-dev` for all AWS CLI commands
- Region: `us-east-1`
- CodeArtifact domain: `orb-infrastructure-shared-codeartifact-domain`
- CodeArtifact PyPI repository: `orb-infrastructure-shared-pypi-repo`

Example AWS CLI usage:
```bash
aws --profile sso-orb-dev s3 ls
```

### CodeArtifact Login for pipenv

Before running `pipenv install` for packages from CodeArtifact, you MUST:

1. Get the auth token and export it:
```bash
export CODEARTIFACT_AUTH_TOKEN=$(aws --profile sso-orb-dev codeartifact get-authorization-token --domain orb-infrastructure-shared-codeartifact-domain --query authorizationToken --output text)
```

2. Then run pipenv commands:
```bash
pipenv install
```

**CRITICAL**: The Pipfile uses `${CODEARTIFACT_AUTH_TOKEN}` environment variable. Without exporting it first, pipenv will fail to authenticate with CodeArtifact.

## Package Management

- Python: Use `pipenv` for dependency management
- TypeScript/Angular: Use `npm` for dependency management

Always install dependencies through the project's package manager:
```bash
# Python (apps/api)
cd apps/api
pipenv install <package>
pipenv install --dev <dev-package>

# TypeScript (apps/web)
cd apps/web
npm install <package>
npm install --save-dev <dev-package>
```

After cloning:
```bash
# Backend
cd apps/api && pipenv install --dev

# Frontend
cd apps/web && npm install
```

## Repositories Directory

The `repositories/` directory contains cloned orb repos for documentation reference.

**IMPORTANT**: Treat as READ-ONLY - do not modify files in this directory.

To set up reference repositories:
```bash
mkdir -p repositories
git clone https://github.com/com-oneredboot/orb-templates.git repositories/orb-templates
git clone https://github.com/com-oneredboot/orb-infrastructure.git repositories/orb-infrastructure
git clone https://github.com/com-oneredboot/orb-geo-fence.git repositories/orb-geo-fence
```

## GitHub Issue Ownership

**CRITICAL RULE**: NEVER close issues created by another team.

- Only the originating team closes their issues when satisfied with the resolution
- When responding to cross-team issues, provide implementation details and let them verify
- Comment on issues to indicate work is complete, but leave closing to the issue creator

This applies to all orb projects and ensures proper cross-team collaboration.

## Cross-Team Issue Tracking

Check `.github/ISSUES/` for any upstream blockers affecting this project.

If this directory exists, it contains:
- `README.md` with tables tracking Current Blockers and Resolved Issues
- Body files for issues filed with other teams

Use "review blocked issues" command phrase to get a summary.

## CLI Access

### GitHub CLI (`gh`)

Use the `gh` command to interact with GitHub issues, PRs, and repositories:

```bash
# List issues
gh issue list

# View issue details
gh issue view <number>

# Comment on an issue
gh issue comment <number> --body "Your comment here"

# Create a new issue
gh issue create --title "Title" --body "Description"

# List PRs
gh pr list

# View PR details
gh pr view <number>
```

### AWS CLI with SSO

Use AWS CLI with the SSO profile for AWS operations:

```bash
# Always use the sso-orb-dev profile
aws --profile sso-orb-dev s3 ls

# List packages in CodeArtifact
aws --profile sso-orb-dev codeartifact list-packages --domain orb-infrastructure-shared-codeartifact-domain --repository orb-infrastructure-shared-pypi-repo --format pypi

# List package versions
aws --profile sso-orb-dev codeartifact list-package-versions --domain orb-infrastructure-shared-codeartifact-domain --repository orb-infrastructure-shared-pypi-repo --package <package-name> --format pypi
```

## Project-Specific Settings

### Project Name
orb-integration-hub

### Primary Purpose
A serverless integration platform built with AWS AppSync, DynamoDB, and TypeScript/Python providing a unified API for integrating various services and data sources.

### Key Workflows
- Schema-driven development using orb-schema-generator
- GraphQL API development with AWS AppSync
- Angular frontend development
- Python Lambda backend development
- CloudFormation infrastructure deployment

### Build Commands
```bash
# Backend (Python)
cd apps/api && pipenv run pytest

# Frontend (Angular)
cd apps/web && npm test
cd apps/web && npm run build

# Schema Generation
orb-schema-generator generate
```

## Change Plan Requirement

**CRITICAL**: Before making any code changes, you MUST provide a plan and get user approval.

### Plan Format

Every change plan must include:

1. **Problem**: Brief description of what needs to be fixed/added
2. **Proposed Solution**: Concise explanation of the approach
3. **Files to Modify**: List of all files that will be created, modified, or deleted

### Example Plan

```
## Plan: Fix Import Path Issue

**Problem**: CI fails with `ModuleNotFoundError: No module named 'generated'`

**Proposed Solution**: Add sys.path manipulation to include the cdk directory

**Files to Modify**:
1. `infrastructure/cdk/stacks/appsync_stack.py` - Add path fix at top of file
```

### Rules

- Always present the plan BEFORE making changes
- Wait for explicit user approval (e.g., "yes", "proceed", "go ahead")
- If the user asks a question, answer it - don't assume they want changes
- Keep plans concise - no lengthy explanations needed

## Code Quality Standards

### Zero Tolerance for Linting Issues

**CRITICAL**: This project has a zero-tolerance policy for linting errors AND warnings.

- All ESLint errors MUST be fixed immediately - never ignore or suppress them
- All ESLint warnings MUST be fixed immediately - warnings are treated as errors
- The ESLint configuration treats all warnings as errors (`--max-warnings 0`)
- CI will fail if any linting issues exist
- Never use `// eslint-disable` comments to suppress errors - fix the underlying issue instead

When you encounter linting issues:
1. Fix the issue properly using the correct pattern
2. If unsure how to fix, research the rule and apply the recommended solution
3. Never leave warnings "for later" - fix them now

Common fix patterns:
- Unused imports → Remove them
- Unused variables → Remove or prefix with `_` if intentionally unused
- `any` types → Replace with specific types from models or create interfaces
- Accessibility errors → Add proper ARIA attributes, labels, and keyboard handlers
- `standalone: false` → Convert to standalone components with proper imports

## Schema Generation

### orb-schema-generator

This project uses `orb-schema-generator` for code generation from YAML schemas. Reference documentation is in `repositories/orb-schema-generator/`.

**Run schema generation:**
```bash
pipenv run orb-schema generate
```

**What it generates:**
- GraphQL schema (`apps/api/graphql/schema.graphql`)
- Python models (`apps/api/models/`)
- TypeScript models (`apps/web/src/app/core/models/`)
- TypeScript enums (`apps/web/src/app/core/enums/`)
- VTL resolvers (`apps/api/graphql/resolvers/`)
- CDK constructs (`infrastructure/cdk/generated/`)

**What it does NOT generate:**
- TypeScript GraphQL query definition files (`apps/web/src/app/core/graphql/*.graphql.ts`) - these are hand-written and must match the generated schema

**Configuration:** `schema-generator.yml`

**Schema locations:**
- `schemas/tables/` - DynamoDB table schemas
- `schemas/models/` - Standard data models
- `schemas/registries/` - Enum/registry types
- `schemas/lambdas/` - Lambda-only types
- `schemas/core/` - Shared enums

**Key documentation:**
- `repositories/orb-schema-generator/README.md` - Main documentation
- `repositories/orb-schema-generator/docs/generation/graphql.md` - GraphQL generation details
- `repositories/orb-schema-generator/docs/generation/schema-attributes.md` - Schema attribute reference

## Command Phrases

When the user says these phrases, execute the corresponding actions:

### "review all open issues"
1. Run `gh issue list` to get all open issues
2. Run `gh issue view <number>` for each open issue to read full details
3. Summarize each issue with: title, description, and current status
4. Provide a prioritized plan to fix all issues
5. Ask which issue to start with

### "run all checks"
1. Run formatter: `cd apps/api && pipenv run black .` and `cd apps/web && npm run format`
2. Run linter: `cd apps/api && pipenv run ruff check . --fix` and `cd apps/web && npm run lint`
3. Run type checker: `cd apps/api && pipenv run mypy src/` and `cd apps/web && npm run typecheck`
4. Run tests: `cd apps/api && pipenv run pytest` and `cd apps/web && npm test`
5. Report results summary

### "open bug with [team-name]"
1. Determine the target repository from the team name:
   - orb-templates → com-oneredboot/orb-templates
   - orb-infrastructure → com-oneredboot/orb-infrastructure
   - orb-schema-generator → com-oneredboot/orb-schema-generator
   - orb-geo-fence → com-oneredboot/orb-geo-fence
2. Create body file: `.github/ISSUES/{team}-{number}.md` using the issue body template
3. Create a GitHub issue using `gh issue create --repo com-oneredboot/[team] --title "[Title]" --body-file .github/ISSUES/{team}-{number}.md`
4. Include relevant context, code snippets, and reproduction steps
5. Add entry to `.github/ISSUES/README.md` Current Blockers table
6. Report the issue number back to the user

### "sync dependencies"
1. Update lock files:
   - `cd apps/api && pipenv lock`
   - `cd apps/web && npm install`
2. Verify no dependency conflicts
3. Run tests to confirm compatibility
4. Report any issues found

### "prepare release"
1. Update version in pyproject.toml or package.json
2. Update CHANGELOG.md with new version section
3. Create git tag for the version
4. Report next steps for release

### "get all reference projects"
See #reference-projects for the full workflow. This command:
1. Pull latest changes for all repositories in `repositories/`
2. Show commits since last pull for each repository
3. Check for CHANGELOG updates and version bumps
4. Report summary with status and notable changes

### "review blocked issues"
1. Read `.github/ISSUES/README.md` to get the Current Blockers table
2. For each issue in the table, check GitHub status via `gh issue view [number] --repo com-oneredboot/[team]`
3. Summarize active blockers with their status and impact
4. Report any issues that have been closed or have new comments
5. Recommend next actions (e.g., "Issue #28 was closed, verify fix and update tracking")

### "update ticket [team-name] [number]"
Synchronizes a cross-team issue with local tracking:
1. Read `.github/ISSUES/README.md` for current tracking state
2. Check GitHub issue status via `gh issue view [number] --repo com-oneredboot/[team-name]`
3. If issue has new comments or status changes, report them
4. If issue is closed, prompt to move entry from Current Blockers to Resolved Issues table
5. Report synchronization summary

### "close ticket [team-name] [number]"
Closes a resolved cross-team issue (only for issues we created):
1. Verify the issue was created by this team (check issue author)
2. Add closing comment: `gh issue comment [number] --repo com-oneredboot/[team-name] --body "Verified fixed. Thank you!"`
3. Close the issue: `gh issue close [number] --repo com-oneredboot/[team-name]`
4. Update `.github/ISSUES/README.md` - move from Current Blockers to Resolved Issues
5. Report completion

### "generate schemas"
1. Run `orb-schema-generator validate` to check schema validity
2. Run `orb-schema-generator generate` to generate code
3. Report any errors or warnings
4. List generated files

### "setup local frontend"
Sets up the Angular frontend for local development with AWS backend:
1. Navigate to frontend: `cd apps/web`
2. Install dependencies: `npm install`
3. Run setup script for dev environment: `npm run setup-dev`
4. Report: "Frontend configured with dev environment credentials"

**Note**: The frontend connects to the deployed AWS backend (AppSync, Cognito) via environment configuration. No local backend needed.

### "start local testing"
Sets up and starts the frontend for local testing against the dev backend:
1. **Setup frontend**:
   - `cd apps/web && npm install`
   - `npm run setup-dev` (retrieves credentials from AWS SSM/Secrets Manager)
2. **Start dev server**: `npm start`
3. Report: "Frontend running at http://localhost:4200 - connects to AWS dev backend"

**Prerequisites**: AWS SSO session must be active (`aws sso login --profile sso-orb-dev`)

### "setup local testing"
Sets up both frontend and infrastructure for local testing:
1. **Frontend setup**:
   - `cd apps/web && npm install`
   - `npm run setup-dev` (retrieves secrets from AWS)
2. **Infrastructure tests**:
   - Export CodeArtifact token: `export CODEARTIFACT_AUTH_TOKEN=$(aws --profile sso-orb-dev codeartifact get-authorization-token --domain orb-infrastructure-shared-codeartifact-domain --query authorizationToken --output text)`
   - `cd infrastructure && pipenv install --dev`
   - Run CDK tests: `PIPENV_IGNORE_VIRTUALENVS=1 pipenv run pytest cdk/tests/ -v`
3. **Frontend tests**:
   - `cd apps/web && npm test`
4. Report setup status and any issues

### "run frontend local"
Starts the Angular frontend in development mode:
1. Ensure dependencies installed: `cd apps/web && npm install`
2. Setup dev environment if needed: `npm run setup-dev`
3. Start dev server: `npm start`
4. Report: "Frontend running at http://localhost:4200 - connects to AWS dev backend"

### "run cdk tests"
Runs the CDK infrastructure tests:
1. Navigate to infrastructure: `cd infrastructure`
2. Ensure dependencies: `PIPENV_IGNORE_VIRTUALENVS=1 pipenv install --dev`
3. Run tests: `PIPENV_IGNORE_VIRTUALENVS=1 pipenv run pytest cdk/tests/ -v`
4. Report test results summary

### "start local testing with ngrok"
Starts the frontend with ngrok tunnel for external access (mobile testing, sharing):
1. **Setup frontend** (if not already done):
   - `cd apps/web && npm install`
   - `npm run setup-dev` (retrieves credentials from AWS SSM/Secrets Manager)
2. **Start dev server**: `npm start` (in background)
3. **Start ngrok tunnel**: `npm run ngrok`
4. Report: "Frontend running at http://localhost:4200 and https://tameka-overhonest-carefully.ngrok-free.dev"

**ngrok Configuration**:
- Primary domain: `tameka-overhonest-carefully.ngrok-free.dev`
- Secondary domain: `tameka-overhonest-selfishly.ngrok-free.dev`
- These are reserved domains on a paid ngrok plan

**Prerequisites**:
- AWS SSO session must be active (`aws sso login --profile sso-orb-dev`)
- ngrok must be installed and authenticated (`ngrok config add-authtoken YOUR_TOKEN`)

**Note**: If testing Cognito auth flows through ngrok, you may need to add the ngrok URL to Cognito's allowed callback URLs in AWS Console.

### "delete test user [email]"
Deletes a test user from both Cognito and DynamoDB (dev environment only):
1. **Find user in Cognito**:
   ```bash
   aws --profile sso-orb-dev --region us-east-1 cognito-idp list-users \
       --user-pool-id us-east-1_8ch8unBaX \
       --filter "email = \"[email]\""
   ```
2. **Delete from Cognito** (using the Username/UUID from step 1):
   ```bash
   aws --profile sso-orb-dev --region us-east-1 cognito-idp admin-delete-user \
       --user-pool-id us-east-1_8ch8unBaX \
       --username "[username-uuid]"
   ```
3. **Find user in DynamoDB**:
   ```bash
   aws --profile sso-orb-dev --region us-east-1 dynamodb query \
       --table-name orb-integration-hub-dev-users \
       --index-name EmailIndex \
       --key-condition-expression "email = :email" \
       --expression-attribute-values '{":email":{"S":"[email]"}}'
   ```
4. **Delete from DynamoDB** (using the userId from step 3):
   ```bash
   aws --profile sso-orb-dev --region us-east-1 dynamodb delete-item \
       --table-name orb-integration-hub-dev-users \
       --key '{"userId":{"S":"[userId]"}}'
   ```
5. Report: "User [email] deleted from Cognito and DynamoDB"

**Warning**: This permanently deletes user data. Only use for test accounts in dev environment.
