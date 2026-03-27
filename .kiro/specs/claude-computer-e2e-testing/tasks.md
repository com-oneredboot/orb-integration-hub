# Implementation Plan: Claude Computer E2E Testing

## Overview

This plan implements the Cowork E2E testing system. The main deliverable is a self-contained markdown instruction document (`docs/e2e-cowork-instructions.md`) that Cowork reads and follows to execute 16 sequential test workflows. The only real code artifact is the Linux setup script (`scripts/e2e-cowork-setup.sh`). Property tests are optional since most requirements are procedural Cowork instructions.

## Tasks

- [x] 1. Create the Linux setup script
  - [x] 1.1 Create `scripts/e2e-cowork-setup.sh` with start mode
    - Implement sequential fail-fast steps: SSO check, npm install, Angular dev server start, poll localhost:4200 (60s timeout), ngrok tunnel start
    - Output ngrok URL (`https://tameka-overhonest-carefully.ngrok-free.dev`) on success
    - Each step checks exit code; on failure, output which step failed with remediation hint and exit non-zero
    - Make script executable (`chmod +x`)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 1.2 Add `--stop` mode to the setup script
    - Kill Angular dev server process (port 4200) and ngrok process
    - Print confirmation of cleanup
    - Handle case where no processes are running (exit 0, idempotent)
    - _Requirements: 1.6_

  - [ ]* 1.3 Write property test for setup script fail-fast behavior
    - **Property 1: Setup script fails fast with non-zero exit on any step failure**
    - **Validates: Requirements 1.5**

- [x] 2. Create/verify SSM parameters for test credentials
  - [x] 2.1 Verify or create SSM parameters for test credentials
    - Verify `/orb/integration-hub/dev/e2e/test-user-email` exists (String type)
    - Verify `/orb/integration-hub/dev/e2e/test-user-password` exists (SecureString type)
    - **Implementation note**: Password moved to Secrets Manager (CDK cannot create SSM SecureString). Added `_create_e2e_test_credentials()` to `BootstrapStack` in `infrastructure/cdk/stacks/bootstrap_stack.py`:
      - SSM StringParameter: `/orb/integration-hub/dev/e2e/test-user-email` (email)
      - Secrets Manager: `orb/integration-hub/dev/secrets/e2e/test-user-password` (password, auto-generated)
      - SSM StringParameter: `/orb/integration-hub/dev/e2e/test-user-password/secret-name` (secret name pointer)
    - Cowork retrieves password via: `aws --profile sso-orb-dev secretsmanager get-secret-value --secret-id orb/integration-hub/dev/secrets/e2e/test-user-password --query SecretString --output text`
    - _Requirements: 4.1, 5.1_

- [x] 3. Checkpoint — Setup script and SSM parameters
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create the Cowork instruction document
  - [x] 4.1 Create `docs/e2e-cowork-instructions.md` with header, glossary, and Notepad schema
    - Include document title, purpose, and how Cowork should use it
    - Define all glossary terms: Frontend_URL, Test_Email, Test_Password, AWS_Profile, Cognito_User_Pool_ID, Users_Table, SMS_Log_Group, E2E_Test_Prefix, TOTP_Secret, Notepad
    - Define the Notepad schema (keys, sources, used-by) that Cowork maintains throughout the session
    - Include the dependency chain diagram (text-based) showing all 16 workflows and their dependencies
    - Include the "always-run" rule for CLEANUP and LOGOUT
    - _Requirements: 2.1–2.5, 19.3, 19.5, 19.6_

  - [x] 4.2 Write Workflow 1: PREREQ-CHECK instructions
    - CLI command: `curl -s -o /dev/null -w "%{http_code}" https://tameka-overhonest-carefully.ngrok-free.dev` — expect `200`
    - CLI command: `aws --profile sso-orb-dev sts get-caller-identity` — expect success JSON
    - Failure actions: recommend `scripts/e2e-cowork-setup.sh` or `aws sso login --profile sso-orb-dev`
    - Notepad update: "Prerequisites verified"
    - Screenshot label: `prereq-check`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 4.3 Write Workflow 2: CLEAN-STATE instructions
    - Browser: navigate to `https://tameka-overhonest-carefully.ngrok-free.dev`
    - Check URL path; if not `/authenticate`, navigate to `https://tameka-overhonest-carefully.ngrok-free.dev/authenticate?signout=true`
    - Wait up to 15s for `/authenticate` with `#email-input` visible
    - Screenshot label: `clean-state`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 4.4 Write Workflow 3: SIGNUP-EMAIL instructions
    - CLI: retrieve Test_Email from SSM (`aws --profile sso-orb-dev ssm get-parameter --name /orb/integration-hub/dev/e2e/test-user-email --query Parameter.Value --output text`)
    - Notepad: record Test_Email
    - Browser: click `#email-input`, type Test_Email, click `button[type="submit"]`
    - Wait up to 15s for `#password-setup-input` to appear
    - Screenshot label: `signup-email-submitted`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 4.5 Write Workflow 4: SIGNUP-PASSWORD instructions
    - CLI: retrieve Test_Password from SSM (`aws --profile sso-orb-dev ssm get-parameter --name /orb/integration-hub/dev/e2e/test-user-password --with-decryption --query Parameter.Value --output text`)
    - Notepad: record Test_Password
    - Browser: click `#password-setup-input`, type password, verify 5 requirements met, click `button[type="submit"]`
    - Wait up to 15s for `inputId="email-code-input"` to appear
    - Screenshot label: `password-created`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 4.6 Write Workflow 5: SIGNUP-EMAIL-VERIFY instructions
    - Browser: open new tab → `https://mail.google.com`
    - Search for `verification code to:{Test_Email}`, click most recent email, read 6-digit code
    - Notepad: record email verification code
    - Screenshot label: `email-code-retrieved`
    - Switch back to app tab, verify `inputId="email-code-input"` visible, type code, click `button[type="submit"]`
    - Wait up to 15s for MFA setup step (`#secret-key-text` visible)
    - Retry: if email not found within 60s, wait 15s, retry search once
    - Screenshot label: `email-verified`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 4.7 Write Workflow 6: SIGNUP-MFA-SETUP instructions
    - Browser: wait up to 15s for MFA setup interface, read `#secret-key-text` span
    - Notepad: record TOTP_Secret
    - CLI: `python -c "import pyotp; print(pyotp.TOTP('{secret_key}').now())"`
    - Browser: type 6-digit code into `inputId="mfa-setup-input"`, click `button[type="submit"]`
    - Wait up to 30s for redirect to `/profile`
    - Retry: if TOTP rejected, recompute via CLI and retry once
    - Screenshot label: `mfa-setup-complete`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_

  - [x] 4.8 Write Workflow 7: SIGNUP-PROFILE-NAME instructions
    - Browser: wait up to 15s for `#setup-firstName` visible
    - Type `E2E` in `#setup-firstName`, `TestUser` in `#setup-lastName`
    - Click `.profile-setup-flow__button--primary`
    - Wait up to 15s for `#setup-phoneNumber` visible
    - Screenshot label: `name-entered`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 4.9 Write Workflow 8: SIGNUP-PHONE-VERIFY instructions
    - Browser: type `+15551234567` in `#setup-phoneNumber`, click `.profile-setup-flow__button--primary`
    - Notepad: record phone number
    - Wait for `inputId="phone-verification-code"` visible
    - CLI: `aws --profile sso-orb-dev logs filter-log-events --log-group-name /aws/lambda/orb-integration-hub-dev-sms-verification --filter-pattern '"[DEV] Verification code"' --start-time $(date -d '5 minutes ago' +%s)000 --query 'events[-1].message' --output text`
    - Extract 6-digit code from `[DEV] Verification code for +15551234567: {code}`
    - Notepad: record SMS code
    - Browser: type code into `inputId="phone-verification-code"`, click `.profile-setup-flow__button--primary`
    - Wait up to 15s for redirect to `/dashboard`
    - Retry: if SMS code not found, wait 10s, retry CLI once
    - Screenshot label: `phone-verified`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10, 10.11, 10.12_

  - [x] 4.10 Write Workflow 9: VERIFY-DASHBOARD instructions
    - Browser: verify URL is `/dashboard`
    - Verify at least one CTA card visible
    - Verify navigation menu with Organizations and Applications links
    - Screenshot label: `dashboard-verified`
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 4.11 Write Workflow 10: VERIFY-PROFILE instructions
    - Browser: navigate to `https://tameka-overhonest-carefully.ngrok-free.dev/profile`
    - Verify Test_Email visible, name fields show `E2E` and `TestUser`, phone `+15551234567` visible
    - Screenshot label: `profile-verified`
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 4.12 Write Workflow 11: ORG-CRUD instructions
    - Browser: navigate to `https://tameka-overhonest-carefully.ngrok-free.dev/customers/organizations`
    - Click `.orb-card-btn` (Create), wait up to 15s for detail page
    - Notepad: record organization ID from URL
    - Enter `e2e-test-org` as name, save, verify displayed
    - Update to `e2e-test-org-updated`, save, verify displayed
    - Screenshot label: `organization-crud`
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9_

  - [x] 4.13 Write Workflow 12: APP-CRUD instructions
    - Browser: navigate to `https://tameka-overhonest-carefully.ngrok-free.dev/customers/applications`
    - Click `.orb-card-btn` (Create), wait up to 15s for detail page
    - Notepad: record application ID from URL
    - Enter `e2e-test-app` as name, select `e2e-test-org-updated` organization, save, verify
    - Screenshot label: `application-crud`
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

  - [x] 4.14 Write Workflow 13: APP-ROLES instructions
    - Browser: on application detail page, click "Roles" tab (`.orb-tabs__tab`)
    - Verify roles list (Data_Grid) visible with default roles (OWNER, ADMINISTRATOR)
    - Screenshot label: `roles-management`
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [x] 4.15 Write Workflow 14: APP-ENVIRONMENTS instructions
    - Browser: click "Environments" tab (`.orb-tabs__tab`)
    - Verify environments list visible
    - Click on `development` environment, verify detail page loads with name and config section
    - Screenshot label: `environment-config`
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

  - [x] 4.16 Write Workflow 15: CLEANUP instructions
    - Always runs regardless of prior failures
    - CLI: `aws --profile sso-orb-dev cognito-idp admin-delete-user --user-pool-id us-east-1_8ch8unBaX --username {Test_Email}`
    - CLI: scan DynamoDB for userId, then delete-item
    - Browser: delete test organizations and applications via Danger Zone tab
    - If resource deletion fails, report resource ID for manual cleanup
    - Notepad: record all cleanup actions and results
    - Screenshot label: `cleanup-complete`
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8_

  - [x] 4.17 Write Workflow 16: LOGOUT instructions
    - Always runs regardless of prior failures
    - Browser: navigate to `https://tameka-overhonest-carefully.ngrok-free.dev/authenticate?signout=true`
    - Verify URL resolves to `/authenticate` with `#email-input` visible
    - Screenshot label: `logout-complete`
    - _Requirements: 18.1, 18.2, 18.3_

  - [x] 4.18 Write the test summary report template section
    - Include the exact report format from Requirement 19.4
    - Document the dependency chain skip logic
    - Document the always-run rule for CLEANUP and LOGOUT
    - Include the Notepad dump section
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7_

- [x] 5. Checkpoint — Instruction document and setup script complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Update documentation
  - [x] 6.1 Create or update E2E README at `docs/e2e-testing.md`
    - Document the two-machine setup (Linux + Windows/Cowork)
    - Reference `scripts/e2e-cowork-setup.sh` with usage instructions
    - Reference `docs/e2e-cowork-instructions.md` as the main instruction document
    - Document SSM parameter paths for test credentials
    - Document the `--stop` flag for teardown
    - Ensure no duplication with the instruction document — this is a high-level overview only
    - _Requirements: 20.1, 20.2, 20.3_

  - [x] 6.2 Update `docs/README.md` with E2E testing section
    - Add a link to `docs/e2e-testing.md` in the documentation index
    - _Requirements: 20.1_

- [ ] 7. Optional property tests for utility functions
  - [ ]* 7.1 Write property test for SMS verification code extraction
    - **Property 2: SMS verification code extraction from CloudWatch log format**
    - **Validates: Requirements 10.5, 10.6**

  - [ ]* 7.2 Write property test for resource ID extraction from URL path
    - **Property 3: Resource ID extraction from URL path**
    - **Validates: Requirements 13.4**

  - [ ]* 7.3 Write property test for report structure completeness
    - **Property 4: Test summary report contains all required sections and workflow entries**
    - **Validates: Requirements 19.1, 19.2, 19.4**

  - [ ]* 7.4 Write property test for dependency skip propagation
    - **Property 5: Dependency skip propagation**
    - **Validates: Requirements 19.5**

  - [ ]* 7.5 Write property test for CLEANUP and LOGOUT always execute
    - **Property 6: CLEANUP and LOGOUT always execute**
    - **Validates: Requirements 19.6**

- [x] 8. CHANGELOG and version bump
  - [x] 8.1 Update `CHANGELOG.md` with E2E testing spec entry
    - Add entry describing the Cowork E2E testing instruction document and setup script
    - Follow semantic versioning for version bump
    - _Requirements: 21.1, 21.2_

- [x] 9. Final checkpoint — All artifacts complete
  - Ensure all tests pass, ask the user if questions arise.
  - Verify no linting or compilation errors
  - Verify CHANGELOG.md is updated
  - Verify documentation is consistent and not duplicated
  - _Requirements: 22.1, 22.2, 23.1, 23.2, 23.3, 23.4_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The main deliverable is `docs/e2e-cowork-instructions.md` — a self-contained document Cowork reads and executes
- The only real code artifact is `scripts/e2e-cowork-setup.sh` (bash)
- Property tests are optional because most requirements are procedural Cowork instructions, not software functions
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
