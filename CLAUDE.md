# ORB Integration Hub Code Guidelines

## Model Generation Guidelines
CRITICAL: Never directly edit model files (.model.ts, .model.py)! 
- Always modify schema templates (`schemas/templates/*.jinja`) or the generator (`schemas/generate.py`)
- After template changes, run `cd schemas && ./run-generator.sh` to regenerate all models
- Custom type fixes should be applied to the generator script, not individual model files
- For GraphQL schema changes, modify auth configurations in table YAML files under `schemas/tables/`

## Build Commands
- Frontend: `cd frontend && npm run build` - Build Angular app
- Dev server: `cd frontend && npm run start` - Run development server
- Lint: `cd frontend && npm run lint` - Lint TypeScript code
- Tests: `cd frontend && npm run test` - Run Angular tests 
- Single test: `cd frontend && npm test -- --include=src/path/to/file.spec.ts`
- Schema generation: `cd schemas && ./run-generator.sh` - Generate models and schemas
- Schema deployment: `cd schemas && ./deploy.sh` - Generate and deploy schemas
- CloudFormation: `cd backend/infrastructure/scripts && ./deploy_schema.sh` - Deploy CF templates

## Code Style
- **TypeScript**: 
  - Imports: Group by 3rd party then application imports
  - Naming: PascalCase for classes/interfaces, camelCase for methods/variables
  - Observables: Suffix with $ (example: users$)
  - Services: Create dedicated services for API interactions
  - Error handling: Use try/catch with typed errors

- **Python**:
  - Imports: Standard lib → Third party → Local
  - Naming: snake_case for variables/functions, PascalCase for classes
  - Type hints: Use throughout codebase
  - Error handling: Use specific exceptions with descriptive messages
  - Validation: Validate input before processing

- **Models**: Generated via the schema generator for consistency
  - **IMPORTANT**: Never modify generated model files directly, always update templates in `schemas/templates` or make modifications to `schemas/generate.py`
  - When fixing type issues, apply fixes in the generator script or templates, then regenerate models with `cd schemas && ./run-generator.sh`

## Project Context
- Primary reference: `/context/project.md` - Core project information
- Architecture: `/context/structure.md` - System architecture
- DynamoDB: `/context/dynamodb_resolver_standards.md` - Database patterns
- State management: `/context/state.md` - App state flow reference
- Feature registry: `/context/features/REGISTRY.md` - List of all features

## Feature Development Workflow
- **START OF SESSION**: Identify feature name - format: `[feature-name]-feature`
  - IMPORTANT: Ask user "Which feature are we working on today?" at start of session
  - Verify current git branch matches pattern `[feature-name]-feature`
  - Load feature-specific context from `/context/features/[feature-name]/[feature-name].md`
  - Verify feature changelog exists at `/context/features/[feature-name]/changelog.md`
  - Create feature context using templates if it doesn't exist:
    - Feature template: `/context/features/feature-template.md`
    - Changelog template: `/context/features/changelog-template.md`
- Work on only one feature at a time until completion and deployment
- **END OF SESSION**: 
  - Update feature changelog with detailed file changes and reasoning
  - Run `/context/scripts/update-changelog.sh [feature-name]` to auto-capture git diffs