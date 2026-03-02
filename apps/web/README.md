# OrbPaymentGateway

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.3.9.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## E2E Testing

This project uses Playwright for end-to-end testing. Tests run against the local frontend (localhost:4200) and deployed AWS backend.

### Quick Start

```bash
# Install Playwright browsers (first time only)
npm run e2e:install

# Run all tests
npm run e2e

# Open Playwright UI (recommended for development)
npm run e2e:ui
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run e2e` | Run all tests headless |
| `npm run e2e:ui` | Open Playwright UI |
| `npm run e2e:headed` | Run with visible browser |
| `npm run e2e:debug` | Debug mode with inspector |
| `npm run e2e:report` | Open HTML report |
| `npm run e2e:codegen` | Generate test code |

### Setup

1. Create `.env.test` from `.env.test.example`
2. Retrieve test credentials from AWS Secrets Manager
3. Ensure AWS SSO session is active: `aws sso login --profile sso-orb-dev`

For complete documentation, see [e2e/README.md](e2e/README.md).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
