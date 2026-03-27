# Requirements Document

## Introduction

This spec defines a comprehensive end-to-end testing plan designed for execution by Cowork (Claude Computer) — an AI agent running on a Windows machine that controls both a browser and a CLI terminal. Cowork will execute step-by-step manual testing instructions against the orb-integration-hub Angular frontend, which runs on a Linux development machine and is exposed via ngrok at `https://tameka-overhonest-carefully.ngrok-free.dev`. The frontend connects to the deployed AWS dev backend (AppSync, Cognito, DynamoDB). Cowork uses CLI on Windows for AWS operations (the Windows machine has full AWS SSO access) and the browser for frontend interactions via the ngrok URL. Each test scenario provides explicit selectors, URLs, CLI commands, and expected outcomes that Cowork can follow without ambiguity.

## Glossary

- **Cowork**: An AI agent (Claude Computer) running on a Windows machine, capable of controlling a browser (clicking, typing, navigating, screenshots) AND a CLI terminal (running shell commands). Cowork uses CLI for AWS operations and the browser for frontend interactions. The frontend runs on a separate Linux machine and is accessed via ngrok.
- **Frontend**: The Angular application served locally on a Linux development machine and exposed via ngrok at `https://tameka-overhonest-carefully.ngrok-free.dev`
- **Frontend_URL**: `https://tameka-overhonest-carefully.ngrok-free.dev` — the ngrok tunnel URL that Cowork uses to access the Angular frontend from the Windows machine
- **Dev_Backend**: The deployed AWS dev environment including AppSync GraphQL APIs, Cognito user pools, and DynamoDB tables
- **Test_Email**: Retrieved from SSM Parameter Store at `/orb/integration-hub/dev/e2e/test-user-email` via CLI: `aws --profile sso-orb-dev ssm get-parameter --name /orb/integration-hub/dev/e2e/test-user-email --query Parameter.Value --output text`
- **Test_Password**: Retrieved from SSM Parameter Store at `/orb/integration-hub/dev/e2e/test-user-password` via CLI: `aws --profile sso-orb-dev ssm get-parameter --name /orb/integration-hub/dev/e2e/test-user-password --with-decryption --query Parameter.Value --output text`
- **E2E_Test_Prefix**: The string `e2e-test-` prepended to all test resource names to distinguish them from production data
- **Auth_Flow**: The multi-step authentication flow at `/authenticate` that handles email entry, password setup, email verification, MFA TOTP setup, and redirects to profile setup
- **Profile_Setup_Flow**: The multi-step profile setup flow at `/profile` that handles name entry, phone number entry, and phone verification after initial signup
- **TOTP_Secret**: The base32-encoded secret key displayed in the `#secret-key-text` span on the MFA setup page, used to compute 6-digit TOTP codes
- **TOTP_Code**: A 6-digit code computed from the TOTP_Secret using `python -c "import pyotp; print(pyotp.TOTP('{secret_key}').now())"` on the Windows CLI (requires `pip install pyotp` if not already installed)
- **SMS_Log_Group**: The CloudWatch log group `/aws/lambda/orb-integration-hub-dev-sms-verification` where the dev Lambda logs SMS verification codes in the format `[DEV] Verification code for {phone_number}: {code}`
- **AWS_Profile**: `sso-orb-dev` — the AWS CLI profile used for all AWS operations
- **Cognito_User_Pool_ID**: `us-east-1_8ch8unBaX`
- **Users_Table**: `orb-integration-hub-dev-users` — the DynamoDB table storing user records
- **Gmail_URL**: `https://mail.google.com` used to retrieve email verification codes via browser
- **Notepad**: A running record maintained by Cowork throughout the test session containing: Test_Email, Test_Password, TOTP_Secret, phone number, userId, all resource IDs created, and any other test data needed for subsequent steps or cleanup
- **Dashboard**: The authenticated landing page at `/dashboard`
- **Create_On_Click_Pattern**: The application pattern where clicking "Create" immediately creates a PENDING record and navigates to the detail page for editing

## Requirements

### Requirement 1: Linux Environment Setup Script

**User Story:** As a test operator, I want a single setup script to prepare the Linux development machine for Cowork testing, so that the environment is ready with one command.

#### Acceptance Criteria

1. THE Developer SHALL create a script at `scripts/e2e-cowork-setup.sh` that prepares the Linux box for Cowork E2E testing
2. THE script SHALL perform the following steps in order:
   - Verify AWS SSO session is active by running `aws --profile sso-orb-dev sts get-caller-identity` and exit with a clear error message if expired
   - Install frontend dependencies if needed: `cd apps/web && npm install`
   - Start the Angular dev server in the background: `npm start &`
   - Wait for the frontend to be ready by polling `http://localhost:4200` with a timeout of 60 seconds
   - Start the ngrok tunnel: `npm run ngrok`
3. THE script SHALL output the ngrok URL (`https://tameka-overhonest-carefully.ngrok-free.dev`) when ready, confirming Cowork can begin testing
4. THE script SHALL be executable (`chmod +x scripts/e2e-cowork-setup.sh`)
5. IF any step fails, THEN THE script SHALL output a clear error message indicating which step failed and how to fix it, then exit with a non-zero code
6. THE script SHALL include a `--stop` flag that kills the Angular dev server and ngrok processes: `scripts/e2e-cowork-setup.sh --stop`

### Requirement 2: Prerequisite Checks via CLI

**User Story:** As a test operator, I want Cowork to verify all prerequisites before starting tests, so that failures are caught early with clear diagnostics.

#### Acceptance Criteria

1. WHEN Cowork begins a test session, THE Cowork SHALL run `curl -s -o /dev/null -w "%{http_code}" https://tameka-overhonest-carefully.ngrok-free.dev` in the CLI to verify the frontend is accessible via ngrok and confirm the response code is `200`
2. IF the frontend is not accessible, THEN THE Cowork SHALL report the failure and recommend that the operator run `scripts/e2e-cowork-setup.sh` on the Linux box
3. WHEN the frontend check passes, THE Cowork SHALL run `aws --profile sso-orb-dev sts get-caller-identity` in the CLI to verify the AWS SSO session is active
4. IF the SSO session is expired or invalid, THEN THE Cowork SHALL report the failure and recommend that the operator run `aws sso login --profile sso-orb-dev`
5. WHEN both checks pass, THE Cowork SHALL record "Prerequisites verified" in the Notepad and proceed to the clean state step

### Requirement 3: Clean State — Logout If Authenticated

**User Story:** As a test operator, I want Cowork to always start from a clean unauthenticated state, so that tests are deterministic.

#### Acceptance Criteria

1. WHEN prerequisites are verified, THE Cowork SHALL open the browser and navigate to `https://tameka-overhonest-carefully.ngrok-free.dev`
2. WHEN the page loads, THE Cowork SHALL check the current URL path
3. WHEN the URL path is `/dashboard` or any path other than `/authenticate`, THE Cowork SHALL navigate to `https://tameka-overhonest-carefully.ngrok-free.dev/authenticate?signout=true` to sign out and wait for the URL to resolve to `/authenticate` within 15 seconds
4. WHEN the URL path is `/authenticate`, THE Cowork SHALL confirm the email input field (`#email-input`) is visible and proceed
5. THE Cowork SHALL take a screenshot labeled `clean-state` after confirming the unauthenticated state at `/authenticate`

### Requirement 4: Signup Flow — Email Entry

**User Story:** As a test operator, I want Cowork to begin the signup flow by entering a unique test email, so that a new user registration is initiated.

#### Acceptance Criteria

1. WHEN Cowork is at `/authenticate` with the email input visible, THE Cowork SHALL retrieve the test email from SSM by running in the CLI: `aws --profile sso-orb-dev ssm get-parameter --name /orb/integration-hub/dev/e2e/test-user-email --query Parameter.Value --output text`
2. THE Cowork SHALL record the Test_Email value in the Notepad
3. WHEN the Test_Email is generated, THE Cowork SHALL click the `#email-input` field and type the Test_Email
4. WHEN the email is entered, THE Cowork SHALL click the `button[type="submit"]` button
5. WHEN the submit completes, THE Cowork SHALL wait up to 15 seconds for the Auth_Flow to advance (the password setup input `#password-setup-input` becomes visible, indicating a new user)
6. THE Cowork SHALL take a screenshot labeled `signup-email-submitted`

### Requirement 5: Signup Flow — Password Creation

**User Story:** As a test operator, I want Cowork to create a password for the new test user, so that the account has credentials.

#### Acceptance Criteria

1. WHEN the Auth_Flow shows the password setup step (`#password-setup-input` is visible), THE Cowork SHALL retrieve the test password from SSM by running in the CLI: `aws --profile sso-orb-dev ssm get-parameter --name /orb/integration-hub/dev/e2e/test-user-password --with-decryption --query Parameter.Value --output text`
2. THE Cowork SHALL record the Test_Password in the Notepad
3. WHEN the password is retrieved, THE Cowork SHALL click the `#password-setup-input` field and type the Test_Password
4. WHEN the password is entered, THE Cowork SHALL verify the password requirements checklist shows all 5 requirements met (8+ chars, uppercase, lowercase, number, special char)
5. WHEN all requirements are met, THE Cowork SHALL click the `button[type="submit"]` button
6. WHEN the submit completes, THE Cowork SHALL wait up to 15 seconds for the Auth_Flow to advance to the email verification step (a verification code input with `inputId="email-code-input"` becomes visible)
7. THE Cowork SHALL take a screenshot labeled `password-created`

### Requirement 6: Signup Flow — Email Verification Code Retrieval from Gmail

**User Story:** As a test operator, I want Cowork to retrieve the Cognito verification code from Gmail, so that the email can be verified.

#### Acceptance Criteria

1. WHEN the Auth_Flow shows the email verification step, THE Cowork SHALL open a new browser tab and navigate to `https://mail.google.com`
2. WHEN Gmail loads, THE Cowork SHALL locate the search bar and search for `verification code to:testuser` (or the Test_Email) to find the Cognito verification email
3. WHEN search results appear, THE Cowork SHALL click on the most recent email matching the search
4. WHEN the email is open, THE Cowork SHALL locate and read the 6-digit verification code from the email body
5. THE Cowork SHALL record the 6-digit code in the Notepad
6. THE Cowork SHALL take a screenshot labeled `email-code-retrieved` showing the verification email
7. WHEN the code is retrieved, THE Cowork SHALL switch back to the application tab at `https://tameka-overhonest-carefully.ngrok-free.dev`
8. IF the verification email is not found within 60 seconds, THEN THE Cowork SHALL take a screenshot labeled `email-code-not-found`, wait 15 seconds, and retry the search once

### Requirement 7: Signup Flow — Email Verification Code Entry

**User Story:** As a test operator, I want Cowork to enter the email verification code, so that the email address is confirmed.

#### Acceptance Criteria

1. WHEN Cowork switches back to the application tab, THE Cowork SHALL verify the email verification code input (component with `inputId="email-code-input"`) is visible
2. WHEN the input is visible, THE Cowork SHALL type the 6-digit verification code retrieved from Gmail
3. WHEN the code is entered, THE Cowork SHALL click the `button[type="submit"]` button
4. WHEN the verification succeeds, THE Cowork SHALL wait up to 15 seconds for the Auth_Flow to advance to the MFA setup step (the QR code or `#secret-key-text` becomes visible)
5. IF the verification code is rejected, THEN THE Cowork SHALL take a screenshot labeled `email-verify-failure`, capture the error text, and report the failure
6. THE Cowork SHALL take a screenshot labeled `email-verified`

### Requirement 8: Signup Flow — MFA TOTP Setup

**User Story:** As a test operator, I want Cowork to complete MFA TOTP setup by reading the secret key and computing a TOTP code, so that multi-factor authentication is configured.

#### Acceptance Criteria

1. WHEN the Auth_Flow shows the MFA setup step, THE Cowork SHALL wait up to 15 seconds for the MFA setup interface to load
2. WHEN the MFA setup page is visible, THE Cowork SHALL locate the `#secret-key-text` span in the "Manual Setup" section and read the TOTP_Secret text
3. THE Cowork SHALL record the TOTP_Secret in the Notepad
4. WHEN the TOTP_Secret is read, THE Cowork SHALL switch to the CLI and compute a TOTP code by running: `python -c "import pyotp; print(pyotp.TOTP('{secret_key}').now())"` (replace `{secret_key}` with the actual TOTP_Secret value)
5. WHEN the 6-digit TOTP code is computed, THE Cowork SHALL switch back to the browser and type the code into the MFA setup verification input (component with `inputId="mfa-setup-input"`)
6. WHEN the code is entered, THE Cowork SHALL click the `button[type="submit"]` button
7. WHEN the MFA verification succeeds, THE Cowork SHALL wait up to 30 seconds for the application to redirect to `/profile` for the Profile_Setup_Flow
8. IF the TOTP code is rejected, THEN THE Cowork SHALL recompute the TOTP code via CLI (the 30-second window may have elapsed) and retry once
9. THE Cowork SHALL take a screenshot labeled `mfa-setup-complete`

### Requirement 9: Profile Setup — Name Entry

**User Story:** As a test operator, I want Cowork to enter the user's name in the profile setup flow, so that the profile is configured.

#### Acceptance Criteria

1. WHEN the application redirects to `/profile` and the Profile_Setup_Flow is active, THE Cowork SHALL wait up to 15 seconds for the name step to appear (the `#setup-firstName` input is visible)
2. WHEN the first name input is visible, THE Cowork SHALL click `#setup-firstName` and type `E2E`
3. WHEN the first name is entered, THE Cowork SHALL click `#setup-lastName` and type `TestUser`
4. WHEN both name fields are filled, THE Cowork SHALL click the primary action button (`.profile-setup-flow__button--primary`) containing "Next" or "Continue"
5. WHEN the name step completes, THE Cowork SHALL wait up to 15 seconds for the phone number step to appear (`#setup-phoneNumber` input is visible)
6. THE Cowork SHALL take a screenshot labeled `name-entered`

### Requirement 10: Profile Setup — Phone Number Entry and SMS Verification

**User Story:** As a test operator, I want Cowork to enter a phone number and verify it using the SMS code from CloudWatch Logs, so that phone verification is complete.

#### Acceptance Criteria

1. WHEN the phone number step is visible, THE Cowork SHALL click `#setup-phoneNumber` and type `+15551234567`
2. THE Cowork SHALL record the phone number `+15551234567` in the Notepad
3. WHEN the phone number is entered, THE Cowork SHALL click the primary action button (`.profile-setup-flow__button--primary`) to submit and trigger the SMS send
4. WHEN the phone verification code step appears (verification code input with `inputId="phone-verification-code"` is visible), THE Cowork SHALL switch to the CLI
5. WHEN in the CLI, THE Cowork SHALL run: `aws --profile sso-orb-dev logs filter-log-events --log-group-name /aws/lambda/orb-integration-hub-dev-sms-verification --filter-pattern '"[DEV] Verification code"' --start-time $(date -d '5 minutes ago' +%s)000 --query 'events[-1].message' --output text`
6. WHEN the CLI returns the log message, THE Cowork SHALL extract the 6-digit verification code from the message format `[DEV] Verification code for +15551234567: {code}`
7. THE Cowork SHALL record the SMS verification code in the Notepad
8. WHEN the code is extracted, THE Cowork SHALL switch back to the browser and type the 6-digit code into the phone verification input (component with `inputId="phone-verification-code"`)
9. WHEN the code is entered, THE Cowork SHALL click the primary action button (`.profile-setup-flow__button--primary`) to verify
10. WHEN the phone verification succeeds, THE Cowork SHALL wait up to 15 seconds for the profile setup to complete and redirect to `/dashboard`
11. IF the SMS code is not found in CloudWatch Logs, THEN THE Cowork SHALL wait 10 seconds and retry the CLI command once
12. THE Cowork SHALL take a screenshot labeled `phone-verified`

### Requirement 11: Dashboard Verification

**User Story:** As a test operator, I want Cowork to verify the dashboard loads correctly after signup, so that the authenticated experience is confirmed.

#### Acceptance Criteria

1. WHEN the Profile_Setup_Flow completes, THE Cowork SHALL verify the URL is `/dashboard`
2. WHEN the Dashboard is displayed, THE Cowork SHALL verify at least one CTA card is visible on the page
3. WHEN the Dashboard is displayed, THE Cowork SHALL verify the navigation menu is present with links to Organizations and Applications
4. THE Cowork SHALL take a screenshot labeled `dashboard-verified`

### Requirement 12: Profile Page Verification

**User Story:** As a test operator, I want Cowork to verify the profile page displays the correct user data, so that user data persistence is confirmed.

#### Acceptance Criteria

1. WHEN Cowork is logged in, THE Cowork SHALL navigate to `https://tameka-overhonest-carefully.ngrok-free.dev/profile`
2. WHEN the profile page loads, THE Cowork SHALL verify the Test_Email is visible on the page
3. WHEN the profile page is displayed, THE Cowork SHALL verify the name fields display `E2E` and `TestUser`
4. WHEN the profile page is displayed, THE Cowork SHALL verify the phone number `+15551234567` is visible
5. THE Cowork SHALL take a screenshot labeled `profile-verified`


### Requirement 13: Organization CRUD

**User Story:** As a test operator, I want Cowork to test the full organization lifecycle, so that CRUD operations are verified.

#### Acceptance Criteria

1. WHEN Cowork is logged in, THE Cowork SHALL navigate to `https://tameka-overhonest-carefully.ngrok-free.dev/customers/organizations`
2. WHEN the organizations list page loads, THE Cowork SHALL click the "Create" button in the card header (`.orb-card-btn`)
3. WHEN the create action triggers the Create_On_Click_Pattern and navigates to the new organization detail page, THE Cowork SHALL wait up to 15 seconds for the detail page to load
4. WHEN the detail page loads, THE Cowork SHALL record the organization ID from the URL (`/customers/organizations/:id`) in the Notepad
5. WHEN the detail page is in edit mode, THE Cowork SHALL enter `e2e-test-org` as the organization name and save
6. WHEN the save completes, THE Cowork SHALL verify the organization name displays `e2e-test-org`
7. WHEN the organization is verified, THE Cowork SHALL update the organization name to `e2e-test-org-updated` and save
8. WHEN the update completes, THE Cowork SHALL verify the organization name displays `e2e-test-org-updated`
9. THE Cowork SHALL take a screenshot labeled `organization-crud`

### Requirement 14: Application CRUD

**User Story:** As a test operator, I want Cowork to test the full application lifecycle, so that application management is verified.

#### Acceptance Criteria

1. WHEN Cowork is logged in, THE Cowork SHALL navigate to `https://tameka-overhonest-carefully.ngrok-free.dev/customers/applications`
2. WHEN the applications list page loads, THE Cowork SHALL click the "Create" button in the card header (`.orb-card-btn`)
3. WHEN the create action triggers the Create_On_Click_Pattern and navigates to the new application detail page, THE Cowork SHALL wait up to 15 seconds for the detail page to load
4. WHEN the detail page loads, THE Cowork SHALL record the application ID from the URL (`/customers/applications/:id`) in the Notepad
5. WHEN the detail page is in edit mode, THE Cowork SHALL enter `e2e-test-app` as the application name, select the `e2e-test-org-updated` organization, and save
6. WHEN the save completes, THE Cowork SHALL verify the application name displays `e2e-test-app`
7. THE Cowork SHALL take a screenshot labeled `application-crud`

### Requirement 15: Roles Management

**User Story:** As a test operator, I want Cowork to verify the roles tab on the application detail page, so that role management is confirmed.

#### Acceptance Criteria

1. WHEN Cowork is on the application detail page, THE Cowork SHALL click the "Roles" tab in the tab navigation (`.orb-tabs__tab`)
2. WHEN the Roles tab loads, THE Cowork SHALL verify the roles list is visible (Data_Grid is rendered)
3. WHEN the roles list is visible, THE Cowork SHALL verify at least the default roles are present (e.g., OWNER, ADMINISTRATOR)
4. THE Cowork SHALL take a screenshot labeled `roles-management`

### Requirement 16: Environment Configuration

**User Story:** As a test operator, I want Cowork to verify the environments tab on the application detail page, so that environment management is confirmed.

#### Acceptance Criteria

1. WHEN Cowork is on the application detail page, THE Cowork SHALL click the "Environments" tab in the tab navigation (`.orb-tabs__tab`)
2. WHEN the Environments tab loads, THE Cowork SHALL verify the environments list is visible
3. WHEN the environments list is visible, THE Cowork SHALL click on a listed environment (e.g., `development`) to navigate to the Environment_Detail_Page
4. WHEN the environment detail page loads, THE Cowork SHALL verify the environment name and configuration section are visible
5. THE Cowork SHALL take a screenshot labeled `environment-config`

### Requirement 17: Cleanup — Delete Test Resources via CLI and Browser

**User Story:** As a test operator, I want Cowork to clean up all test data after the test run, so that no test artifacts remain in the dev environment.

#### Acceptance Criteria

1. WHEN all test scenarios are complete, THE Cowork SHALL switch to the CLI to begin cleanup
2. WHEN in the CLI, THE Cowork SHALL delete the test user from Cognito by running: `aws --profile sso-orb-dev cognito-idp admin-delete-user --user-pool-id us-east-1_8ch8unBaX --username {Test_Email}`
3. WHEN the Cognito deletion succeeds, THE Cowork SHALL find the userId in DynamoDB by running: `aws --profile sso-orb-dev dynamodb scan --table-name orb-integration-hub-dev-users --filter-expression "email = :email" --expression-attribute-values '{":email":{"S":"{Test_Email}"}}' --query 'Items[0].userId.S' --output text`
4. WHEN the userId is retrieved, THE Cowork SHALL delete the user record from DynamoDB by running: `aws --profile sso-orb-dev dynamodb delete-item --table-name orb-integration-hub-dev-users --key '{"userId":{"S":"{userId}"}}'`
5. WHEN user cleanup is complete, THE Cowork SHALL switch to the browser and delete any test organizations and applications created during the test via the Danger Zone tab on their respective detail pages
6. IF a resource cannot be deleted via the browser, THEN THE Cowork SHALL report the resource ID and type for manual cleanup
7. THE Cowork SHALL take a screenshot labeled `cleanup-complete` after all cleanup operations finish
8. THE Cowork SHALL record all cleanup actions and their results in the Notepad

### Requirement 18: Logout

**User Story:** As a test operator, I want Cowork to log out after all tests and cleanup are complete, so that the session ends cleanly.

#### Acceptance Criteria

1. WHEN cleanup is complete, THE Cowork SHALL navigate to `https://tameka-overhonest-carefully.ngrok-free.dev/authenticate?signout=true` in the browser
2. WHEN the signout completes, THE Cowork SHALL verify the URL resolves to `/authenticate` and the email input (`#email-input`) is visible
3. THE Cowork SHALL take a screenshot labeled `logout-complete`

### Requirement 19: Test Summary Report

**User Story:** As a test operator, I want Cowork to produce a structured test summary report at the end of each run, so that results are clear and actionable.

#### Acceptance Criteria

1. WHEN all test workflows and cleanup are complete, THE Cowork SHALL produce a structured test summary report
2. THE report SHALL organize results by named workflow, with each workflow showing its pass/fail status, duration, and any error details
3. THE report SHALL use the following workflow names and execution order:

| # | Workflow Name | Requirements Covered |
|---|--------------|---------------------|
| 1 | `PREREQ-CHECK` | Req 2 — Frontend accessible via ngrok, SSO session active |
| 2 | `CLEAN-STATE` | Req 3 — Logout if authenticated, confirm at /authenticate |
| 3 | `SIGNUP-EMAIL` | Req 4 — Enter test email from SSM, submit, advance to password step |
| 4 | `SIGNUP-PASSWORD` | Req 5 — Create password from SSM, verify requirements met |
| 5 | `SIGNUP-EMAIL-VERIFY` | Req 6, 7 — Retrieve code from Gmail, enter code |
| 6 | `SIGNUP-MFA-SETUP` | Req 8 — Read TOTP secret, compute code via CLI, verify MFA |
| 7 | `SIGNUP-PROFILE-NAME` | Req 9 — Enter first name and last name |
| 8 | `SIGNUP-PHONE-VERIFY` | Req 10 — Enter phone, retrieve SMS code from CloudWatch via CLI, verify |
| 9 | `VERIFY-DASHBOARD` | Req 11 — Confirm dashboard loads with CTA cards and nav |
| 10 | `VERIFY-PROFILE` | Req 12 — Confirm profile shows email, name, phone |
| 11 | `ORG-CRUD` | Req 13 — Create org, verify, edit, verify update |
| 12 | `APP-CRUD` | Req 14 — Create app, verify, link to org |
| 13 | `APP-ROLES` | Req 15 — Verify roles tab and default roles |
| 14 | `APP-ENVIRONMENTS` | Req 16 — Verify environments tab and detail page |
| 15 | `CLEANUP` | Req 17 — Delete test user (Cognito + DynamoDB), delete test resources |
| 16 | `LOGOUT` | Req 18 — Sign out, confirm at /authenticate |

4. THE report SHALL include the following sections:

```
═══════════════════════════════════════════════════
  E2E TEST RUN SUMMARY
  Date: {date}
  Test Email: {Test_Email}
  Duration: {total_duration}
═══════════════════════════════════════════════════

  WORKFLOW RESULTS
  ─────────────────────────────────────────────────
  #  Workflow              Status    Duration  Notes
  ─────────────────────────────────────────────────
   1 PREREQ-CHECK          ✅ PASS   2s
   2 CLEAN-STATE           ✅ PASS   3s
   3 SIGNUP-EMAIL          ✅ PASS   5s
   4 SIGNUP-PASSWORD       ✅ PASS   4s
   5 SIGNUP-EMAIL-VERIFY   ✅ PASS   45s       Code: 123456
   6 SIGNUP-MFA-SETUP      ✅ PASS   12s
   7 SIGNUP-PROFILE-NAME   ✅ PASS   4s
   8 SIGNUP-PHONE-VERIFY   ❌ FAIL   30s       SMS code not found in CloudWatch
   9 VERIFY-DASHBOARD      ⏭️ SKIP   -         Depends on SIGNUP-PHONE-VERIFY
  10 VERIFY-PROFILE        ⏭️ SKIP   -         Depends on SIGNUP-PHONE-VERIFY
  11 ORG-CRUD              ⏭️ SKIP   -         Depends on VERIFY-DASHBOARD
  12 APP-CRUD              ⏭️ SKIP   -         Depends on ORG-CRUD
  13 APP-ROLES             ⏭️ SKIP   -         Depends on APP-CRUD
  14 APP-ENVIRONMENTS      ⏭️ SKIP   -         Depends on APP-CRUD
  15 CLEANUP               ✅ PASS   8s        Partial: user deleted, no resources to clean
  16 LOGOUT                ✅ PASS   3s
  ─────────────────────────────────────────────────

  TOTALS: 9 passed, 1 failed, 6 skipped
  
  SCREENSHOTS CAPTURED: 12
  RESOURCES CREATED: 0
  RESOURCES CLEANED: 1 (Cognito user)

  FAILURES:
  ─────────────────────────────────────────────────
  [8] SIGNUP-PHONE-VERIFY
      Error: SMS verification code not found in CloudWatch Logs
      CLI Command: aws --profile sso-orb-dev logs filter-log-events ...
      Screenshot: signup-phone-verify-fail-1711234567.png
  ─────────────────────────────────────────────────

  NOTEPAD (Test Data):
  ─────────────────────────────────────────────────
  Test Email: corey+e2e@thepetersfamily.ca
  Test Password: (stored in SSM)
  TOTP Secret: JBSWY3DPEHPK3PXP
  Phone: +15551234567
  Org ID: (none created)
  App ID: (none created)
═══════════════════════════════════════════════════
```

5. WHEN a workflow fails, THE Cowork SHALL skip dependent workflows (workflows that require the failed workflow's output) and mark them as `SKIP` with a note indicating the dependency
6. THE workflow dependency chain SHALL be: `PREREQ-CHECK` → `CLEAN-STATE` → `SIGNUP-*` (sequential) → `VERIFY-*` → `ORG-CRUD` → `APP-CRUD` → `APP-ROLES` + `APP-ENVIRONMENTS` → `CLEANUP` → `LOGOUT`. `CLEANUP` and `LOGOUT` SHALL always execute regardless of prior failures.
7. WHEN all workflows complete, THE Cowork SHALL output the full report to the terminal/chat

### Requirement 20: Documentation Updates

**User Story:** As a test operator, I want the E2E testing documentation to be kept current, so that future test runs can reference accurate instructions.

#### Acceptance Criteria

1. WHEN the spec is implemented, THE Cowork SHALL update relevant documentation files to reflect the CLI-first testing approach
2. THE Cowork SHALL document the exact CLI commands used for SMS code retrieval, TOTP computation, and user cleanup
3. THE Cowork SHALL ensure no duplication exists across documentation files

### Requirement 21: Version and Changelog Management

**User Story:** As a developer, I want version and changelog to be updated, so that changes are tracked.

#### Acceptance Criteria

1. WHEN the spec is implemented, THE Developer SHALL update CHANGELOG.md with a description of the E2E testing spec
2. THE Developer SHALL follow semantic versioning for any version bumps

### Requirement 22: Git Commit Standards

**User Story:** As a developer, I want commits to follow conventional format, so that the git history is consistent.

#### Acceptance Criteria

1. THE Developer SHALL use conventional commit format: `feat: description #issue`
2. THE Developer SHALL reference issue numbers in commit messages when applicable

### Requirement 23: Final Verification

**User Story:** As a developer, I want all checks to pass before the spec is considered complete, so that quality is maintained.

#### Acceptance Criteria

1. WHEN the spec is complete, THE Developer SHALL verify all tests pass
2. THE Developer SHALL verify no linting or compilation errors exist
3. THE Developer SHALL verify CHANGELOG.md is updated
4. THE Developer SHALL verify documentation is accurate and complete
