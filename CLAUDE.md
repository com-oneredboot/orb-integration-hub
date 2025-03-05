# ORB Integration Hub Code Guidelines

## Build Commands
- Frontend: `cd frontend && npm run build` - Build Angular app
- Dev server: `cd frontend && npm run start` - Run development server
- Tests: `cd frontend && npm run test` - Run Angular tests 
- Single test: `cd frontend && npm test -- --include=src/path/to/file.spec.ts`
- Schema generation: `cd schemas && ./run-generator.sh` - Generate models and schemas
- Schema deployment: `cd schemas && ./deploy.sh` - Generate and deploy schemas

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

## Project Context
- Primary reference: `/context/project.md` - Core project information
- Architecture: `/context/structure.md` - System architecture
- DynamoDB: `/context/dynamodb_resolver_standards.md` - Database patterns
- State management: `/context/state.md` - App state flow reference