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
- CodeArtifact repository: `orb-shared`

Example AWS CLI usage:
```bash
aws --profile sso-orb-dev s3 ls
aws --profile sso-orb-dev codeartifact login --tool pip --domain orb-infrastructure-shared-codeartifact-domain --repository orb-shared
```

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
aws --profile sso-orb-dev codeartifact list-packages --domain orb-infrastructure-shared --repository orb-shared

# Login to CodeArtifact for pip
aws --profile sso-orb-dev codeartifact login --tool pip --domain orb-infrastructure-shared-codeartifact-domain --repository orb-shared
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
