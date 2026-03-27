# Cowork E2E Test Instructions — orb-integration-hub

## Purpose

This document contains step-by-step instructions for **Cowork** (Claude Computer) to execute end-to-end tests against the orb-integration-hub Angular frontend. Cowork runs on a Windows machine, controlling both a browser (Chrome) and a CLI terminal (PowerShell/CMD). The frontend runs on a separate Linux development machine and is exposed via ngrok.

**How to use this document:** Read it top-to-bottom. Execute each workflow in order, following the dependency chain. Record all data in your Notepad. Take screenshots at every labeled point. Produce the test summary report at the end.

---

## Glossary

| Term | Definition |
|------|------------|
| **Frontend_URL** | `https://tameka-overhonest-carefully.ngrok-free.dev` — the ngrok tunnel URL used to access the Angular frontend from the Windows machine |
| **Test_Email** | Retrieved from SSM Parameter Store via CLI: `aws --profile sso-orb-dev ssm get-parameter --name /orb/integration-hub/dev/e2e/test-user-email --query Parameter.Value --output text` |
| **Test_Password** | Retrieved from Secrets Manager via CLI (two steps): 1) `aws --profile sso-orb-dev secretsmanager get-secret-value --secret-id orb/integration-hub/dev/secrets/e2e/test-user-password --query 'SecretString' --output text` 2) Parse the returned JSON to extract the `"password"` field |
| **AWS_Profile** | `sso-orb-dev` — the AWS CLI profile used for all AWS operations |
| **Cognito_User_Pool_ID** | `us-east-1_8ch8unBaX` |
| **Users_Table** | `orb-integration-hub-dev-users` — the DynamoDB table storing user records |
| **SMS_Log_Group** | `/aws/lambda/orb-integration-hub-dev-sms-verification` — CloudWatch log group where the dev Lambda logs SMS verification codes in the format `[DEV] Verification code for {phone_number}: {code}` |
| **E2E_Test_Prefix** | `e2e-test-` — prepended to all test resource names to distinguish them from production data |
| **TOTP_Secret** | The base32-encoded secret key displayed in the `#secret-key-text` span on the MFA setup page, used to compute 6-digit TOTP codes via `python -c "import pyotp; print(pyotp.TOTP('{secret}').now())"` |
| **Notepad** | A running record you (Cowork) maintain throughout the test session containing all test data: emails, passwords, secrets, resource IDs, verification codes, and workflow results |

---

## Notepad Schema

Maintain this Notepad throughout the entire session. Update it as each workflow produces data.

| Key | Source | Used By |
|-----|--------|---------|
| Test_Email | SSM Parameter Store (`/orb/integration-hub/dev/e2e/test-user-email`) | Signup, Cleanup, Report |
| Test_Password | Secrets Manager (`orb/integration-hub/dev/secrets/e2e/test-user-password`) | Signup |
| TOTP_Secret | MFA setup page `#secret-key-text` | MFA verification |
| Phone Number | Hardcoded `+15551234567` | Phone verify, Report |
| userId | DynamoDB scan during cleanup | DynamoDB delete |
| Organization ID | URL after create (`/customers/organizations/:id`) | Cleanup, App linking |
| Application ID | URL after create (`/customers/applications/:id`) | Cleanup |
| Verification codes | Gmail (email), CLI (TOTP, SMS) | Code entry steps |
| Workflow results | Each workflow (status, duration, notes) | Report generation |

---

## Workflow Dependency Chain

There are 16 workflows executed in order. The dependency chain determines skip behavior when a workflow fails.

```
 1. PREREQ-CHECK
 │
 2. CLEAN-STATE
 │
 3. SIGNUP-EMAIL
 │
 4. SIGNUP-PASSWORD
 │
 5. SIGNUP-EMAIL-VERIFY
 │
 6. SIGNUP-MFA-SETUP
 │
 7. SIGNUP-PROFILE-NAME
 │
 8. SIGNUP-PHONE-VERIFY
 ├──────────────────┐
 9. VERIFY-DASHBOARD  10. VERIFY-PROFILE
 │
11. ORG-CRUD
 │
12. APP-CRUD
 ├──────────────────┐
13. APP-ROLES        14. APP-ENVIRONMENTS
 └──────────┬───────┘
15. CLEANUP  ★ always runs
 │
16. LOGOUT   ★ always runs
```

### Workflow Summary Table

| # | Workflow Name | Dependencies | Requirements |
|---|--------------|--------------|--------------|
| 1 | PREREQ-CHECK | — | 2.1–2.5 |
| 2 | CLEAN-STATE | PREREQ-CHECK | 3.1–3.5 |
| 3 | SIGNUP-EMAIL | CLEAN-STATE | 4.1–4.6 |
| 4 | SIGNUP-PASSWORD | SIGNUP-EMAIL | 5.1–5.7 |
| 5 | SIGNUP-EMAIL-VERIFY | SIGNUP-PASSWORD | 6.1–6.8, 7.1–7.6 |
| 6 | SIGNUP-MFA-SETUP | SIGNUP-EMAIL-VERIFY | 8.1–8.9 |
| 7 | SIGNUP-PROFILE-NAME | SIGNUP-MFA-SETUP | 9.1–9.6 |
| 8 | SIGNUP-PHONE-VERIFY | SIGNUP-PROFILE-NAME | 10.1–10.12 |
| 9 | VERIFY-DASHBOARD | SIGNUP-PHONE-VERIFY | 11.1–11.4 |
| 10 | VERIFY-PROFILE | SIGNUP-PHONE-VERIFY | 12.1–12.5 |
| 11 | ORG-CRUD | VERIFY-DASHBOARD | 13.1–13.9 |
| 12 | APP-CRUD | ORG-CRUD | 14.1–14.7 |
| 13 | APP-ROLES | APP-CRUD | 15.1–15.4 |
| 14 | APP-ENVIRONMENTS | APP-CRUD | 16.1–16.5 |
| 15 | CLEANUP | ★ always runs | 17.1–17.8 |
| 16 | LOGOUT | ★ always runs | 18.1–18.3 |

### Dependency Skip Rules

When a workflow **fails**, skip all workflows that transitively depend on it:

- If **PREREQ-CHECK** fails → skip 2–14, run CLEANUP + LOGOUT
- If **CLEAN-STATE** fails → skip 3–14, run CLEANUP + LOGOUT
- If any **SIGNUP-\*** fails → skip remaining signup workflows and 9–14, run CLEANUP + LOGOUT
- If **VERIFY-DASHBOARD** fails → skip 11–14, run CLEANUP + LOGOUT
- If **ORG-CRUD** fails → skip 12–14, run CLEANUP + LOGOUT
- If **APP-CRUD** fails → skip 13–14, run CLEANUP + LOGOUT

### Always-Run Rule

> **CLEANUP (workflow 15) and LOGOUT (workflow 16) ALWAYS execute regardless of prior failures.** Never skip them. If no resources were created, CLEANUP adapts to partial state (e.g., skips Cognito/DynamoDB deletion if no user was created, skips browser deletion if no resources exist).

---

<!-- WORKFLOW SECTIONS BELOW -->

## Workflow 1: PREREQ-CHECK

**Dependencies:** None
**Requirements:** 2.1–2.5

### Steps

1. **Check frontend accessibility via ngrok.** Open the CLI and run:
   ```
   curl -s -o /dev/null -w "%{http_code}" https://tameka-overhonest-carefully.ngrok-free.dev
   ```
   Confirm the output is `200`. If the output is anything other than `200`, this step fails — go to **On Failure**.

2. **Check AWS SSO session.** In the CLI, run:
   ```
   aws --profile sso-orb-dev sts get-caller-identity
   ```
   Confirm the output is a JSON object containing `Account`, `UserId`, and `Arn` fields. If the command returns an error or expired-session message, this step fails — go to **On Failure**.

3. **Record result.** Both checks passed. Update your Notepad:
   ```
   Prerequisites: verified
   ```

4. **Take screenshot** labeled `prereq-check` showing the CLI output of both commands.

### On Failure

- If the **frontend check** failed (step 1): report that the frontend is not accessible via ngrok. Recommend the operator run the setup script on the Linux machine:
  ```
  ./scripts/e2e-cowork-setup.sh
  ```
- If the **SSO check** failed (step 2): report that the AWS SSO session is expired or invalid. Recommend the operator run:
  ```
  aws sso login --profile sso-orb-dev
  ```
- Mark this workflow as **FAIL** and skip dependent workflows per the dependency chain.

### Notepad Update

- Set `Prerequisites` to `verified` (only on success)

### Screenshot

- Label: `prereq-check`

## Workflow 2: CLEAN-STATE

**Dependencies:** PREREQ-CHECK
**Requirements:** 3.1–3.5

### Steps

1. **Navigate to the frontend.** Open the browser and navigate to:
   ```
   https://tameka-overhonest-carefully.ngrok-free.dev
   ```
   Wait for the page to load completely.

2. **Check the current URL path.** Look at the browser's address bar and determine the current path:
   - If the path is `/authenticate` — skip to step 4.
   - If the path is `/dashboard` or any path other than `/authenticate` — continue to step 3.

3. **Sign out to reach clean state.** Navigate to:
   ```
   https://tameka-overhonest-carefully.ngrok-free.dev/authenticate?signout=true
   ```
   Wait up to **15 seconds** for the URL to resolve to `/authenticate`.

4. **Confirm unauthenticated state.** Verify the following:
   - The URL path is `/authenticate`
   - The email input field (`#email-input`) is visible on the page

   If `#email-input` is not visible within 15 seconds, this step fails — go to **On Failure**.

5. **Take screenshot** labeled `clean-state` showing the `/authenticate` page with the email input visible.

### On Failure

- If the page did not resolve to `/authenticate` within 15 seconds, or `#email-input` is not visible: take a screenshot labeled `clean-state-fail`, report that the application could not reach a clean unauthenticated state, and note the current URL path.
- Mark this workflow as **FAIL** and skip dependent workflows per the dependency chain.

### Notepad Update

- No new data recorded. The clean state is confirmed by the screenshot.

### Screenshot

- Label: `clean-state`

## Workflow 3: SIGNUP-EMAIL

**Dependencies:** CLEAN-STATE
**Requirements:** 4.1–4.6

### Steps

1. **Retrieve the test email from SSM.** Open the CLI and run:
   ```
   aws --profile sso-orb-dev ssm get-parameter --name /orb/integration-hub/dev/e2e/test-user-email --query Parameter.Value --output text
   ```
   The output is the Test_Email value. Copy it.

2. **Record the test email.** Update your Notepad:
   ```
   Test_Email: {the value returned from step 1}
   ```

3. **Enter the email in the signup form.** Switch to the browser. Confirm you are on `/authenticate` with `#email-input` visible. Click the `#email-input` field and type the Test_Email value.

4. **Submit the email.** Click the `button[type="submit"]` button.

5. **Wait for the password setup step.** Wait up to **15 seconds** for the `#password-setup-input` field to appear on the page. This indicates the Auth_Flow has advanced to the password creation step for a new user.

   If `#password-setup-input` does not appear within 15 seconds, this step fails — go to **On Failure**.

6. **Take screenshot** labeled `signup-email-submitted` showing the password setup step with `#password-setup-input` visible.

### On Failure

- If the **SSM retrieval** failed (step 1): report that the test email could not be retrieved from SSM Parameter Store. Verify the parameter `/orb/integration-hub/dev/e2e/test-user-email` exists and the AWS SSO session is active.
- If `#password-setup-input` **did not appear** within 15 seconds (step 5): take a screenshot labeled `signup-email-fail`, report that the Auth_Flow did not advance to the password setup step after email submission, and note the current page state.
- Mark this workflow as **FAIL** and skip dependent workflows per the dependency chain.

### Notepad Update

- Set `Test_Email` to the value retrieved from SSM

### Screenshot

- Label: `signup-email-submitted`

## Workflow 4: SIGNUP-PASSWORD

**Dependencies:** SIGNUP-EMAIL
**Requirements:** 5.1–5.7

### Steps

1. **Retrieve the test password from Secrets Manager.** Open the CLI and run:
   ```
   aws --profile sso-orb-dev secretsmanager get-secret-value --secret-id orb/integration-hub/dev/secrets/e2e/test-user-password --query 'SecretString' --output text
   ```
   The output is a JSON string. Parse it to extract the `"password"` field. For example, if the output is `{"password":"MyP@ss1234"}`, the Test_Password is `MyP@ss1234`.

2. **Record the test password.** Update your Notepad:
   ```
   Test_Password: {the password value extracted from step 1}
   ```

3. **Enter the password in the signup form.** Switch to the browser. Confirm the `#password-setup-input` field is visible (you should already be on the password creation step from Workflow 3). Click the `#password-setup-input` field and type the Test_Password value.

4. **Verify password requirements.** After typing the password, verify the password requirements checklist shows all 5 requirements met:
   - 8+ characters
   - Uppercase letter
   - Lowercase letter
   - Number
   - Special character

   All 5 requirements should show as satisfied. If any requirement is not met, the password from Secrets Manager does not meet the policy — go to **On Failure**.

5. **Submit the password.** Click the `button[type="submit"]` button.

6. **Wait for the email verification step.** Wait up to **15 seconds** for the Auth_Flow to advance to the email verification step. The verification code input with `inputId="email-code-input"` should become visible.

   If `inputId="email-code-input"` does not appear within 15 seconds, this step fails — go to **On Failure**.

7. **Take screenshot** labeled `password-created` showing the email verification step with the code input visible.

### On Failure

- If the **Secrets Manager retrieval** failed (step 1): report that the test password could not be retrieved from Secrets Manager. Verify the secret `orb/integration-hub/dev/secrets/e2e/test-user-password` exists and the AWS SSO session is active.
- If the **password requirements** are not all met (step 4): report that the password from Secrets Manager does not satisfy the Cognito password policy. Note which requirements are unmet.
- If `inputId="email-code-input"` **did not appear** within 15 seconds (step 6): take a screenshot labeled `password-fail`, report that the Auth_Flow did not advance to the email verification step after password submission, and note the current page state.
- Mark this workflow as **FAIL** and skip dependent workflows per the dependency chain.

### Notepad Update

- Set `Test_Password` to the value extracted from Secrets Manager

### Screenshot

- Label: `password-created`

## Workflow 5: SIGNUP-EMAIL-VERIFY

**Dependencies:** SIGNUP-PASSWORD
**Requirements:** 6.1–6.8, 7.1–7.6

This workflow covers two phases: retrieving the email verification code from Gmail (Requirement 6) and entering it in the application (Requirement 7).

### Steps

#### Phase 1: Retrieve Verification Code from Gmail

1. **Open Gmail in a new tab.** Open a new browser tab and navigate to:
   ```
   https://mail.google.com
   ```
   Wait for Gmail to load completely.

2. **Search for the verification email.** Locate the Gmail search bar and type the following search query:
   ```
   verification code to:{Test_Email}
   ```
   Replace `{Test_Email}` with the actual Test_Email value from your Notepad. Press Enter to search.

3. **Open the most recent verification email.** When search results appear, click on the most recent email matching the search. This is the Cognito verification email containing the 6-digit code.

   If no matching email is found within **60 seconds**, go to **Retry: Email Not Found**.

4. **Read the 6-digit verification code.** With the email open, locate and read the 6-digit verification code from the email body.

5. **Record the verification code.** Update your Notepad:
   ```
   Email_Verification_Code: {the 6-digit code from the email}
   ```

6. **Take screenshot** labeled `email-code-retrieved` showing the verification email with the code visible.

7. **Switch back to the application tab.** Switch to the browser tab with the application at:
   ```
   https://tameka-overhonest-carefully.ngrok-free.dev
   ```

#### Phase 2: Enter Verification Code in the Application

8. **Verify the code input is visible.** Confirm the email verification code input (component with `inputId="email-code-input"`) is visible on the page.

   If `inputId="email-code-input"` is not visible, go to **On Failure**.

9. **Type the verification code.** Click the email verification code input and type the 6-digit code retrieved from Gmail.

10. **Submit the verification code.** Click the `button[type="submit"]` button.

11. **Wait for the MFA setup step.** Wait up to **15 seconds** for the Auth_Flow to advance to the MFA setup step. The `#secret-key-text` element should become visible, indicating the MFA TOTP setup page has loaded.

    If `#secret-key-text` does not appear within 15 seconds, go to **On Failure**.

12. **Take screenshot** labeled `email-verified` showing the MFA setup step with `#secret-key-text` visible.

### Retry: Email Not Found

If the verification email is not found in Gmail within 60 seconds:

1. **Take screenshot** labeled `email-code-not-found` showing the empty Gmail search results.
2. **Wait 15 seconds** for the email to arrive.
3. **Retry the search once.** Repeat the same search query:
   ```
   verification code to:{Test_Email}
   ```
4. If the email is found on retry, continue from step 3 above (open the most recent email).
5. If the email is still not found after the retry, go to **On Failure**.

### On Failure

- If the **verification email was not found** after retry: report that the Cognito verification email was not delivered to the test email address within the timeout period. Verify the Test_Email is correct and check Gmail spam/filters.
- If `inputId="email-code-input"` **was not visible** (step 8): take a screenshot labeled `email-verify-fail`, report that the email verification code input was not found on the application page, and note the current page state.
- If the **verification code was rejected** (after step 10): take a screenshot labeled `email-verify-failure`, capture the error text displayed on the page, and report the failure. Note: do not retry code entry — the code may have expired or been entered incorrectly.
- If `#secret-key-text` **did not appear** within 15 seconds (step 11): take a screenshot labeled `email-verify-fail`, report that the Auth_Flow did not advance to the MFA setup step after email verification, and note the current page state.
- Mark this workflow as **FAIL** and skip dependent workflows per the dependency chain.

### Notepad Update

- Set `Email_Verification_Code` to the 6-digit code retrieved from Gmail

### Screenshots

- Label: `email-code-retrieved` (after reading the code from Gmail)
- Label: `email-code-not-found` (only if email not found on first attempt)
- Label: `email-verified` (after successful verification and MFA setup step visible)

## Workflow 6: SIGNUP-MFA-SETUP

**Dependencies:** SIGNUP-EMAIL-VERIFY
**Requirements:** 8.1–8.9

This workflow completes MFA TOTP setup by reading the secret key from the browser, computing a TOTP code via CLI, and entering it to verify MFA.

### Steps

1. **Wait for the MFA setup interface.** The MFA setup page should already be visible from Workflow 5. Wait up to **15 seconds** for the MFA setup interface to fully load. Confirm the `#secret-key-text` span is visible in the "Manual Setup" section.

   If `#secret-key-text` is not visible within 15 seconds, this step fails — go to **On Failure**.

2. **Read the TOTP secret key.** Locate the `#secret-key-text` span on the MFA setup page and read the TOTP_Secret text. This is a base32-encoded string (e.g., `JBSWY3DPEHPK3PXP`).

3. **Record the TOTP secret.** Update your Notepad:
   ```
   TOTP_Secret: {the base32 secret key from step 2}
   ```

4. **Compute the TOTP code via CLI.** Switch to the CLI and run the following command, replacing `{secret_key}` with the actual TOTP_Secret value from your Notepad:
   ```
   python -c "import pyotp; print(pyotp.TOTP('{secret_key}').now())"
   ```
   The output is a 6-digit numeric code. Copy it.

   If the command fails (e.g., `pyotp` not installed), run `pip install pyotp` first, then retry the command.

5. **Enter the TOTP code in the browser.** Switch back to the browser. Locate the MFA setup verification input (component with `inputId="mfa-setup-input"`) and type the 6-digit TOTP code.

6. **Submit the TOTP code.** Click the `button[type="submit"]` button.

7. **Wait for redirect to /profile.** Wait up to **30 seconds** for the application to redirect to `/profile` for the Profile_Setup_Flow. Confirm the URL path is `/profile`.

   If the redirect to `/profile` does not happen within 30 seconds, check if the TOTP code was rejected — go to **Retry: TOTP Rejected**.

8. **Take screenshot** labeled `mfa-setup-complete` showing the `/profile` page (Profile_Setup_Flow).

### Retry: TOTP Rejected

If the TOTP code is rejected (an error message appears or the page does not advance after submission):

1. **Recompute the TOTP code.** The 30-second TOTP window may have elapsed. Switch to the CLI and run the command again with the same TOTP_Secret:
   ```
   python -c "import pyotp; print(pyotp.TOTP('{secret_key}').now())"
   ```
   Copy the new 6-digit code.

2. **Clear and re-enter the code.** Switch back to the browser. Clear the MFA setup verification input (`inputId="mfa-setup-input"`) and type the new 6-digit TOTP code.

3. **Submit the new code.** Click the `button[type="submit"]` button.

4. **Wait for redirect to /profile.** Wait up to **30 seconds** for the redirect to `/profile`.

5. If the redirect succeeds, continue to step 8 above (take screenshot).
6. If the code is rejected again after this retry, go to **On Failure**.

### On Failure

- If `#secret-key-text` **was not visible** within 15 seconds (step 1): take a screenshot labeled `mfa-setup-fail`, report that the MFA setup interface did not load, and note the current page state.
- If the **TOTP code was rejected twice** (after retry): take a screenshot labeled `mfa-setup-fail`, report that the TOTP code was rejected on both attempts. Note the TOTP_Secret value used and suggest verifying the system clock is synchronized (TOTP codes are time-sensitive).
- If the **redirect to /profile did not happen** within 30 seconds (step 7, after retry): take a screenshot labeled `mfa-setup-fail`, report that the application did not redirect to `/profile` after MFA verification, and note the current URL path and page state.
- Mark this workflow as **FAIL** and skip dependent workflows per the dependency chain.

### Notepad Update

- Set `TOTP_Secret` to the base32 secret key read from `#secret-key-text`

### Screenshot

- Label: `mfa-setup-complete`

## Workflow 7: SIGNUP-PROFILE-NAME

**Dependencies:** SIGNUP-MFA-SETUP
**Requirements:** 9.1–9.6

This workflow enters the user's first and last name in the Profile_Setup_Flow after MFA setup redirects to `/profile`.

### Steps

1. **Wait for the name step to appear.** The application should have redirected to `/profile` from Workflow 6. Wait up to **15 seconds** for the `#setup-firstName` input to become visible, indicating the Profile_Setup_Flow name step is active.

   If `#setup-firstName` is not visible within 15 seconds, this step fails — go to **On Failure**.

2. **Enter the first name.** Click the `#setup-firstName` input field and type:
   ```
   E2E
   ```

3. **Enter the last name.** Click the `#setup-lastName` input field and type:
   ```
   TestUser
   ```

4. **Submit the name step.** Click the primary action button (`.profile-setup-flow__button--primary`) to advance to the next step.

5. **Wait for the phone number step.** Wait up to **15 seconds** for the `#setup-phoneNumber` input to become visible, indicating the Profile_Setup_Flow has advanced to the phone number step.

   If `#setup-phoneNumber` does not appear within 15 seconds, this step fails — go to **On Failure**.

6. **Take screenshot** labeled `name-entered` showing the phone number step with `#setup-phoneNumber` visible.

### On Failure

- If `#setup-firstName` **was not visible** within 15 seconds (step 1): take a screenshot labeled `name-entry-fail`, report that the Profile_Setup_Flow name step did not load. Verify the URL path is `/profile` and note the current page state.
- If `#setup-phoneNumber` **did not appear** within 15 seconds (step 5): take a screenshot labeled `name-entry-fail`, report that the Profile_Setup_Flow did not advance to the phone number step after name submission, and note the current page state.
- Mark this workflow as **FAIL** and skip dependent workflows per the dependency chain.

### Notepad Update

- No new data recorded. The name values (`E2E`, `TestUser`) are hardcoded and do not need to be stored in the Notepad.

### Screenshot

- Label: `name-entered`

## Workflow 8: SIGNUP-PHONE-VERIFY

**Dependencies:** SIGNUP-PROFILE-NAME
**Requirements:** 10.1–10.12

This workflow enters the phone number, retrieves the SMS verification code from CloudWatch Logs via CLI, and completes phone verification to finish the Profile_Setup_Flow.

### Steps

1. **Enter the phone number.** The phone number step should already be visible from Workflow 7 with the `#setup-phoneNumber` input displayed. Click the `#setup-phoneNumber` input field and type:
   ```
   +15551234567
   ```

2. **Record the phone number.** Update your Notepad:
   ```
   Phone_Number: +15551234567
   ```

3. **Submit the phone number.** Click the primary action button (`.profile-setup-flow__button--primary`) to submit the phone number and trigger the SMS verification send.

4. **Wait for the phone verification code input.** Wait up to **15 seconds** for the phone verification code input (component with `inputId="phone-verification-code"`) to become visible, indicating the SMS has been sent and the verification step is active.

   If `inputId="phone-verification-code"` does not appear within 15 seconds, this step fails — go to **On Failure**.

5. **Retrieve the SMS verification code from CloudWatch Logs.** Switch to the CLI and run:
   ```
   aws --profile sso-orb-dev logs filter-log-events --log-group-name /aws/lambda/orb-integration-hub-dev-sms-verification --filter-pattern '"[DEV] Verification code"' --start-time $(date -d '5 minutes ago' +%s)000 --query 'events[-1].message' --output text
   ```
   The output should be a log message in the format:
   ```
   [DEV] Verification code for +15551234567: {code}
   ```
   where `{code}` is a 6-digit numeric code.

   If the command returns no results or `None`, go to **Retry: SMS Code Not Found**.

6. **Extract the 6-digit code.** From the log message `[DEV] Verification code for +15551234567: {code}`, extract the 6-digit verification code.

7. **Record the SMS verification code.** Update your Notepad:
   ```
   SMS_Verification_Code: {the 6-digit code from step 6}
   ```

8. **Enter the verification code in the browser.** Switch back to the browser. Click the phone verification code input (component with `inputId="phone-verification-code"`) and type the 6-digit code.

9. **Submit the verification code.** Click the primary action button (`.profile-setup-flow__button--primary`) to verify the phone number.

10. **Wait for redirect to /dashboard.** Wait up to **15 seconds** for the profile setup to complete and the application to redirect to `/dashboard`. Confirm the URL path is `/dashboard`.

    If the redirect to `/dashboard` does not happen within 15 seconds, this step fails — go to **On Failure**.

11. **Take screenshot** labeled `phone-verified` showing the `/dashboard` page after successful phone verification and profile setup completion.

### Retry: SMS Code Not Found

If the CloudWatch Logs query returns no results or `None`:

1. **Wait 10 seconds** for the SMS Lambda to process and write the log entry.
2. **Retry the CLI command once.** Run the same command again:
   ```
   aws --profile sso-orb-dev logs filter-log-events --log-group-name /aws/lambda/orb-integration-hub-dev-sms-verification --filter-pattern '"[DEV] Verification code"' --start-time $(date -d '5 minutes ago' +%s)000 --query 'events[-1].message' --output text
   ```
3. If the log message is found on retry, continue from step 6 above (extract the 6-digit code).
4. If the log message is still not found after the retry, go to **On Failure**.

### On Failure

- If `inputId="phone-verification-code"` **did not appear** within 15 seconds (step 4): take a screenshot labeled `phone-verify-fail`, report that the phone verification code input did not appear after phone number submission, and note the current page state.
- If the **SMS verification code was not found** in CloudWatch Logs after retry: take a screenshot labeled `phone-verify-fail`, report that the SMS verification code was not found in the CloudWatch log group `/aws/lambda/orb-integration-hub-dev-sms-verification`. Verify the Lambda is deployed and the log group exists.
- If the **verification code was rejected** (after step 9): take a screenshot labeled `phone-verify-fail`, capture the error text displayed on the page, and report the failure. Note: do not retry code entry — the code may have expired or been entered incorrectly.
- If the **redirect to /dashboard did not happen** within 15 seconds (step 10): take a screenshot labeled `phone-verify-fail`, report that the application did not redirect to `/dashboard` after phone verification, and note the current URL path and page state.
- Mark this workflow as **FAIL** and skip dependent workflows per the dependency chain.

### Notepad Update

- Set `Phone_Number` to `+15551234567`
- Set `SMS_Verification_Code` to the 6-digit code retrieved from CloudWatch Logs

### Screenshot

- Label: `phone-verified`

## Workflow 9: VERIFY-DASHBOARD

**Dependencies:** SIGNUP-PHONE-VERIFY
**Requirements:** 11.1–11.4

This workflow verifies the dashboard loads correctly after completing the signup and profile setup flows.

### Steps

1. **Verify the URL is `/dashboard`.** After completing Workflow 8 (SIGNUP-PHONE-VERIFY), the application should have redirected to `/dashboard`. Confirm the browser's address bar shows the path `/dashboard`.

   If the URL is not `/dashboard`, this step fails — go to **On Failure**.

2. **Verify at least one CTA card is visible.** On the dashboard page, confirm that at least one call-to-action (CTA) card is visible. These are the cards that guide the user to key actions (e.g., creating an organization or application).

   If no CTA cards are visible within **15 seconds**, this step fails — go to **On Failure**.

3. **Verify the navigation menu.** Confirm the navigation menu is present on the page and contains links to:
   - **Organizations** — a link/menu item pointing to the organizations section
   - **Applications** — a link/menu item pointing to the applications section

   If the navigation menu is not visible or is missing the Organizations or Applications links, this step fails — go to **On Failure**.

4. **Take screenshot** labeled `dashboard-verified` showing the dashboard page with CTA cards and navigation menu visible.

### On Failure

- If the **URL is not `/dashboard`** (step 1): take a screenshot labeled `dashboard-verify-fail`, report that the application did not land on `/dashboard` after profile setup, and note the current URL path.
- If **no CTA cards are visible** (step 2): take a screenshot labeled `dashboard-verify-fail`, report that no CTA cards were found on the dashboard page, and note the current page state.
- If the **navigation menu is missing or incomplete** (step 3): take a screenshot labeled `dashboard-verify-fail`, report which navigation links are missing (Organizations, Applications, or both), and note the current page state.
- Mark this workflow as **FAIL** and skip dependent workflows per the dependency chain.

### Notepad Update

- No new data recorded. The dashboard verification is confirmed by the screenshot.

### Screenshot

- Label: `dashboard-verified`
## Workflow 10: VERIFY-PROFILE

**Dependencies:** SIGNUP-PHONE-VERIFY
**Requirements:** 12.1–12.5

This workflow verifies the profile page displays the correct user data (email, name, phone number) after completing the signup and profile setup flows.

### Steps

1. **Navigate to the profile page.** In the browser, navigate to:
   ```
   https://tameka-overhonest-carefully.ngrok-free.dev/profile
   ```
   Wait for the profile page to load completely.

   If the page does not load within **15 seconds**, this step fails — go to **On Failure**.

2. **Verify the Test_Email is visible.** On the profile page, confirm that the Test_Email value (from your Notepad) is displayed on the page.

   If the Test_Email is not visible on the page, this step fails — go to **On Failure**.

3. **Verify the name fields.** Confirm the profile page displays the following name values:
   - First name: `E2E`
   - Last name: `TestUser`

   If either name field does not show the expected value, this step fails — go to **On Failure**.

4. **Verify the phone number.** Confirm the phone number `+15551234567` is visible on the profile page.

   If the phone number is not visible, this step fails — go to **On Failure**.

5. **Take screenshot** labeled `profile-verified` showing the profile page with the email, name fields, and phone number visible.

### On Failure

- If the **profile page did not load** within 15 seconds (step 1): take a screenshot labeled `profile-verify-fail`, report that the profile page failed to load, and note the current URL path and page state.
- If the **Test_Email is not visible** (step 2): take a screenshot labeled `profile-verify-fail`, report that the test email was not found on the profile page. Note the expected email value and the current page content.
- If the **name fields do not match** (step 3): take a screenshot labeled `profile-verify-fail`, report which name field is incorrect. Note the expected values (`E2E` for first name, `TestUser` for last name) and the actual values displayed.
- If the **phone number is not visible** (step 4): take a screenshot labeled `profile-verify-fail`, report that the phone number `+15551234567` was not found on the profile page, and note the current page content.
- Mark this workflow as **FAIL** and skip dependent workflows per the dependency chain.

### Notepad Update

- No new data recorded. The profile verification is confirmed by the screenshot.

### Screenshot

- Label: `profile-verified`

## Workflow 11: ORG-CRUD

**Dependencies:** VERIFY-DASHBOARD
**Requirements:** 13.1–13.9

This workflow tests the full organization lifecycle: navigating to the organizations list, creating a new organization via the Create_On_Click_Pattern, setting the name, verifying it, updating the name, and verifying the update.

### Steps

1. **Navigate to the organizations list page.** In the browser, navigate to:
   ```
   https://tameka-overhonest-carefully.ngrok-free.dev/customers/organizations
   ```
   Wait for the organizations list page to load completely.

   If the page does not load within **15 seconds**, this step fails — go to **On Failure**.

2. **Create a new organization.** Click the "Create" button in the card header (`.orb-card-btn`). This triggers the Create_On_Click_Pattern — the application immediately creates a PENDING organization record and navigates to the new organization's detail page.

3. **Wait for the detail page to load.** Wait up to **15 seconds** for the organization detail page to load. Confirm the URL has changed to a path matching `/customers/organizations/:id`, where `:id` is the new organization's UUID.

   If the detail page does not load within 15 seconds, this step fails — go to **On Failure**.

4. **Record the organization ID.** Read the organization ID from the URL path (`/customers/organizations/:id`) and update your Notepad:
   ```
   Organization_ID: {the UUID from the URL}
   ```

5. **Enter the organization name.** The detail page should be in edit mode for the newly created PENDING organization. Locate the organization name input field, clear any existing value, and type:
   ```
   e2e-test-org
   ```

6. **Save the organization.** Click the save button to persist the organization name.

7. **Verify the organization name is displayed.** After the save completes, verify the organization name displays `e2e-test-org` on the detail page.

   If the name does not display `e2e-test-org` after saving, this step fails — go to **On Failure**.

8. **Update the organization name.** Locate the organization name input field, clear the current value, and type:
   ```
   e2e-test-org-updated
   ```

9. **Save the updated organization.** Click the save button to persist the updated name.

10. **Verify the updated organization name is displayed.** After the save completes, verify the organization name displays `e2e-test-org-updated` on the detail page.

    If the name does not display `e2e-test-org-updated` after saving, this step fails — go to **On Failure**.

11. **Take screenshot** labeled `organization-crud` showing the organization detail page with the updated name `e2e-test-org-updated` displayed.

### On Failure

- If the **organizations list page did not load** within 15 seconds (step 1): take a screenshot labeled `organization-crud-fail`, report that the organizations list page failed to load, and note the current URL path and page state.
- If the **detail page did not load** within 15 seconds (step 3): take a screenshot labeled `organization-crud-fail`, report that the organization detail page did not load after clicking Create, and note the current URL path and page state.
- If the **organization name does not display `e2e-test-org`** after saving (step 7): take a screenshot labeled `organization-crud-fail`, report that the organization name was not saved correctly. Note the expected value (`e2e-test-org`) and the actual value displayed.
- If the **organization name does not display `e2e-test-org-updated`** after saving (step 10): take a screenshot labeled `organization-crud-fail`, report that the organization name update was not saved correctly. Note the expected value (`e2e-test-org-updated`) and the actual value displayed.
- Mark this workflow as **FAIL** and skip dependent workflows per the dependency chain.

### Notepad Update

- Set `Organization_ID` to the UUID extracted from the URL after creating the organization

### Screenshot

- Label: `organization-crud`

## Workflow 12: APP-CRUD

**Dependencies:** ORG-CRUD
**Requirements:** 14.1–14.7

This workflow tests the full application lifecycle: navigating to the applications list, creating a new application via the Create_On_Click_Pattern, setting the name, selecting the organization, saving, and verifying the result.

### Steps

1. **Navigate to the applications list page.** In the browser, navigate to:
   ```
   https://tameka-overhonest-carefully.ngrok-free.dev/customers/applications
   ```
   Wait for the applications list page to load completely.

   If the page does not load within **15 seconds**, this step fails — go to **On Failure**.

2. **Create a new application.** Click the "Create" button in the card header (`.orb-card-btn`). This triggers the Create_On_Click_Pattern — the application immediately creates a PENDING application record and navigates to the new application's detail page.

3. **Wait for the detail page to load.** Wait up to **15 seconds** for the application detail page to load. Confirm the URL has changed to a path matching `/customers/applications/:id`, where `:id` is the new application's UUID.

   If the detail page does not load within 15 seconds, this step fails — go to **On Failure**.

4. **Record the application ID.** Read the application ID from the URL path (`/customers/applications/:id`) and update your Notepad:
   ```
   Application_ID: {the UUID from the URL}
   ```

5. **Enter the application name.** The detail page should be in edit mode for the newly created PENDING application. Locate the application name input field, clear any existing value, and type:
   ```
   e2e-test-app
   ```

6. **Select the organization.** Locate the organization selector/dropdown on the application detail page and select `e2e-test-org-updated` (the organization created and updated in Workflow 11).

7. **Save the application.** Click the save button to persist the application name and organization assignment.

8. **Verify the application name is displayed.** After the save completes, verify the application name displays `e2e-test-app` on the detail page.

   If the name does not display `e2e-test-app` after saving, this step fails — go to **On Failure**.

9. **Take screenshot** labeled `application-crud` showing the application detail page with the name `e2e-test-app` displayed and the organization `e2e-test-org-updated` assigned.

### On Failure

- If the **applications list page did not load** within 15 seconds (step 1): take a screenshot labeled `application-crud-fail`, report that the applications list page failed to load, and note the current URL path and page state.
- If the **detail page did not load** within 15 seconds (step 3): take a screenshot labeled `application-crud-fail`, report that the application detail page did not load after clicking Create, and note the current URL path and page state.
- If the **application name does not display `e2e-test-app`** after saving (step 8): take a screenshot labeled `application-crud-fail`, report that the application name was not saved correctly. Note the expected value (`e2e-test-app`) and the actual value displayed.
- Mark this workflow as **FAIL** and skip dependent workflows per the dependency chain.

### Notepad Update

- Set `Application_ID` to the UUID extracted from the URL after creating the application

### Screenshot

- Label: `application-crud`

## Workflow 13: APP-ROLES

**Dependencies:** APP-CRUD
**Requirements:** 15.1–15.4

This workflow verifies the roles tab on the application detail page, confirming that the roles list is visible and contains the default roles (OWNER, ADMINISTRATOR).

### Steps

1. **Confirm you are on the application detail page.** After completing Workflow 12 (APP-CRUD), you should still be on the application detail page at `/customers/applications/:id`. Confirm the URL path matches `/customers/applications/{Application_ID}` from your Notepad.

   If you are not on the application detail page, navigate to:
   ```
   https://tameka-overhonest-carefully.ngrok-free.dev/customers/applications/{Application_ID}
   ```
   Replace `{Application_ID}` with the value from your Notepad. Wait up to **15 seconds** for the page to load.

2. **Click the "Roles" tab.** Locate the tab navigation on the application detail page and click the "Roles" tab (`.orb-tabs__tab`). Wait up to **15 seconds** for the Roles tab content to load.

   If the "Roles" tab is not visible or cannot be clicked, this step fails — go to **On Failure**.

3. **Verify the roles list is visible.** Confirm the roles list is rendered as a Data_Grid on the page. The Data_Grid should be visible and contain rows of role data.

   If the Data_Grid is not visible within **15 seconds**, this step fails — go to **On Failure**.

4. **Verify default roles are present.** Inspect the rows in the Data_Grid and confirm at least the following default roles are present:
   - **OWNER**
   - **ADMINISTRATOR**

   If either default role is missing from the list, this step fails — go to **On Failure**.

5. **Take screenshot** labeled `roles-management` showing the application detail page with the Roles tab active and the Data_Grid displaying the default roles (OWNER, ADMINISTRATOR).

### On Failure

- If you are **not on the application detail page** and navigation failed: take a screenshot labeled `roles-management-fail`, report that the application detail page could not be loaded. Verify the Application_ID in your Notepad is correct and the application was created successfully in Workflow 12.
- If the **"Roles" tab was not visible** or could not be clicked (step 2): take a screenshot labeled `roles-management-fail`, report that the Roles tab was not found in the tab navigation on the application detail page. Note the tabs that are visible.
- If the **Data_Grid was not visible** within 15 seconds (step 3): take a screenshot labeled `roles-management-fail`, report that the roles list (Data_Grid) did not render after clicking the Roles tab. Note the current tab content state.
- If the **default roles (OWNER, ADMINISTRATOR) are missing** (step 4): take a screenshot labeled `roles-management-fail`, report which default roles are missing from the Data_Grid. List the roles that are present.
- Mark this workflow as **FAIL** and skip dependent workflows per the dependency chain.

### Notepad Update

- No new data recorded. The roles are verified visually via the screenshot.

### Screenshot

- Label: `roles-management`

## Workflow 14: APP-ENVIRONMENTS

**Dependencies:** APP-CRUD
**Requirements:** 16.1–16.5

This workflow verifies the environments tab on the application detail page, confirming that the environments list is visible, and then navigates into the `development` environment detail page to verify the environment name and configuration section are displayed.

### Steps

1. **Confirm you are on the application detail page.** After completing Workflow 13 (APP-ROLES), you should still be on the application detail page at `/customers/applications/:id`. Confirm the URL path matches `/customers/applications/{Application_ID}` from your Notepad.

   If you are not on the application detail page, navigate to:
   ```
   https://tameka-overhonest-carefully.ngrok-free.dev/customers/applications/{Application_ID}
   ```
   Replace `{Application_ID}` with the value from your Notepad. Wait up to **15 seconds** for the page to load.

2. **Click the "Environments" tab.** Locate the tab navigation on the application detail page and click the "Environments" tab (`.orb-tabs__tab`). Wait up to **15 seconds** for the Environments tab content to load.

   If the "Environments" tab is not visible or cannot be clicked, this step fails — go to **On Failure**.

3. **Verify the environments list is visible.** Confirm the environments list is rendered on the page. The list should be visible and contain one or more environment entries.

   If the environments list is not visible within **15 seconds**, this step fails — go to **On Failure**.

4. **Click on the `development` environment.** Locate the `development` environment entry in the environments list and click on it to navigate to the environment detail page. Wait up to **15 seconds** for the environment detail page to load.

   If the `development` environment is not listed, or the detail page does not load within 15 seconds, this step fails — go to **On Failure**.

5. **Verify the environment detail page.** Confirm the following are visible on the environment detail page:
   - The environment name (e.g., `development`) is displayed
   - A configuration section is visible on the page

   If the environment name or configuration section is not visible, this step fails — go to **On Failure**.

6. **Take screenshot** labeled `environment-config` showing the environment detail page with the environment name and configuration section visible.

### On Failure

- If you are **not on the application detail page** and navigation failed: take a screenshot labeled `environment-config-fail`, report that the application detail page could not be loaded. Verify the Application_ID in your Notepad is correct and the application was created successfully in Workflow 12.
- If the **"Environments" tab was not visible** or could not be clicked (step 2): take a screenshot labeled `environment-config-fail`, report that the Environments tab was not found in the tab navigation on the application detail page. Note the tabs that are visible.
- If the **environments list was not visible** within 15 seconds (step 3): take a screenshot labeled `environment-config-fail`, report that the environments list did not render after clicking the Environments tab. Note the current tab content state.
- If the **`development` environment was not listed** or the detail page did not load (step 4): take a screenshot labeled `environment-config-fail`, report that the `development` environment entry was not found in the environments list, or that clicking it did not navigate to the detail page. List the environments that are visible.
- If the **environment name or configuration section is not visible** (step 5): take a screenshot labeled `environment-config-fail`, report which elements are missing from the environment detail page (name, configuration section). Note the current page state.
- Mark this workflow as **FAIL** and skip dependent workflows per the dependency chain.

### Notepad Update

- No new data recorded. The environment configuration is verified visually via the screenshot.

### Screenshot

- Label: `environment-config`

## Workflow 15: CLEANUP

**Dependencies:** ★ Always runs regardless of prior failures
**Requirements:** 17.1–17.8

This workflow deletes all test resources created during the test session. It ALWAYS runs, even if earlier workflows failed. It adapts to partial state — if no user was created, skip Cognito/DynamoDB deletion; if no resources were created, skip browser deletion.

### Steps

#### Phase 1: Cognito User Deletion (CLI)

1. **Check if a test user was created.** Review your Notepad for the `Test_Email` value. If `Test_Email` is not set (i.e., Workflow 3 SIGNUP-EMAIL never completed), skip to **Phase 3** — there is no user to delete.

2. **Delete the test user from Cognito.** Switch to the CLI and run the following command, replacing `{Test_Email}` with the actual Test_Email value from your Notepad:
   ```
   aws --profile sso-orb-dev cognito-idp admin-delete-user --user-pool-id us-east-1_8ch8unBaX --username {Test_Email}
   ```
   If the command succeeds (no output, exit code 0), the Cognito user has been deleted. Continue to step 3.

   If the command fails with `UserNotFoundException`, the user does not exist in Cognito — this is acceptable. Record the result and continue to step 3.

   If the command fails with any other error, record the error message and the Test_Email for manual cleanup. Continue to step 3.

3. **Record the Cognito cleanup result.** Update your Notepad:
   ```
   Cleanup_Cognito: {success | user-not-found | failed: {error message}}
   ```

#### Phase 2: DynamoDB User Record Deletion (CLI)

4. **Scan DynamoDB for the userId.** Run the following command, replacing `{Test_Email}` with the actual Test_Email value from your Notepad:
   ```
   aws --profile sso-orb-dev dynamodb scan --table-name orb-integration-hub-dev-users --filter-expression "email = :email" --expression-attribute-values '{":email":{"S":"{Test_Email}"}}' --query 'Items[0].userId.S' --output text
   ```
   The output is the userId string. If the output is `None` or empty, the user record does not exist in DynamoDB — skip to step 7.

5. **Record the userId.** Update your Notepad:
   ```
   userId: {the userId value from step 4}
   ```

6. **Delete the user record from DynamoDB.** Run the following command, replacing `{userId}` with the actual userId value from step 4:
   ```
   aws --profile sso-orb-dev dynamodb delete-item --table-name orb-integration-hub-dev-users --key '{"userId":{"S":"{userId}"}}'
   ```
   If the command succeeds (no output, exit code 0), the DynamoDB record has been deleted.

   If the command fails, record the error message and the userId for manual cleanup.

7. **Record the DynamoDB cleanup result.** Update your Notepad:
   ```
   Cleanup_DynamoDB: {success | record-not-found | failed: {error message}}
   ```

#### Phase 3: Browser Resource Deletion

8. **Check if test resources were created.** Review your Notepad for `Application_ID` and `Organization_ID` values. If neither is set (i.e., Workflows 11–12 never completed), skip to step 13 — there are no browser resources to delete.

9. **Delete the test application (if created).** If `Application_ID` is set in your Notepad, navigate to the application detail page:
   ```
   https://tameka-overhonest-carefully.ngrok-free.dev/customers/applications/{Application_ID}
   ```
   Replace `{Application_ID}` with the value from your Notepad. Wait up to **15 seconds** for the page to load.

   Locate the **Danger Zone** tab or section on the detail page. Click it to reveal the delete option. Click the delete button and confirm the deletion when prompted.

   Wait up to **15 seconds** for the deletion to complete and the page to redirect (typically back to the applications list).

   If the deletion fails or the Danger Zone is not accessible, record the Application_ID for manual cleanup and continue to step 10.

10. **Record the application cleanup result.** Update your Notepad:
    ```
    Cleanup_Application: {success | not-created | failed: {Application_ID} requires manual cleanup}
    ```

11. **Delete the test organization (if created).** If `Organization_ID` is set in your Notepad, navigate to the organization detail page:
    ```
    https://tameka-overhonest-carefully.ngrok-free.dev/customers/organizations/{Organization_ID}
    ```
    Replace `{Organization_ID}` with the value from your Notepad. Wait up to **15 seconds** for the page to load.

    Locate the **Danger Zone** tab or section on the detail page. Click it to reveal the delete option. Click the delete button and confirm the deletion when prompted.

    Wait up to **15 seconds** for the deletion to complete and the page to redirect (typically back to the organizations list).

    If the deletion fails or the Danger Zone is not accessible, record the Organization_ID for manual cleanup and continue to step 12.

12. **Record the organization cleanup result.** Update your Notepad:
    ```
    Cleanup_Organization: {success | not-created | failed: {Organization_ID} requires manual cleanup}
    ```

#### Phase 4: Final Cleanup Summary

13. **Take screenshot** labeled `cleanup-complete` showing the CLI or browser confirming the last cleanup action performed.

14. **Record the overall cleanup summary.** Update your Notepad with a summary of all cleanup actions:
    ```
    Cleanup_Summary:
      Cognito user: {result from step 3}
      DynamoDB record: {result from step 7}
      Application: {result from step 10}
      Organization: {result from step 12}
    ```

### On Failure

This workflow does NOT fail-fast. Each cleanup step is independent — if one step fails, continue with the remaining steps.

- If **Cognito user deletion fails** (step 2): record the error and Test_Email for manual cleanup. Continue to DynamoDB cleanup.
- If **DynamoDB scan or deletion fails** (steps 4 or 6): record the error and userId (if known) for manual cleanup. Continue to browser resource deletion.
- If **application deletion fails** via browser (step 9): record the Application_ID and report it for manual cleanup. Continue to organization deletion.
- If **organization deletion fails** via browser (step 11): record the Organization_ID and report it for manual cleanup. Continue to the final summary.
- Only mark this workflow as **FAIL** if all cleanup actions that were attempted resulted in errors. If at least some resources were cleaned successfully, mark as **PASS** with notes indicating partial cleanup.

### Notepad Update

- Set `userId` to the value retrieved from DynamoDB scan (if found)
- Set `Cleanup_Cognito` to the Cognito deletion result
- Set `Cleanup_DynamoDB` to the DynamoDB deletion result
- Set `Cleanup_Application` to the application deletion result
- Set `Cleanup_Organization` to the organization deletion result
- Set `Cleanup_Summary` to the overall cleanup summary

### Screenshot

- Label: `cleanup-complete`

## Workflow 16: LOGOUT

**Dependencies:** ★ Always runs regardless of prior failures
**Requirements:** 18.1–18.3

This workflow signs out of the application to end the test session cleanly. It ALWAYS runs, even if earlier workflows failed — including CLEANUP.

### Steps

1. **Navigate to the signout URL.** In the browser, navigate to:
   ```
   https://tameka-overhonest-carefully.ngrok-free.dev/authenticate?signout=true
   ```
   Wait up to **15 seconds** for the page to load and the signout to complete.

2. **Verify the signout completed.** Confirm the following:
   - The URL path has resolved to `/authenticate`
   - The email input field (`#email-input`) is visible on the page

   If the URL does not resolve to `/authenticate` or `#email-input` is not visible within 15 seconds, this step fails — go to **On Failure**.

3. **Take screenshot** labeled `logout-complete` showing the `/authenticate` page with the email input visible, confirming the session has ended.

### On Failure

- If the URL **did not resolve to `/authenticate`** within 15 seconds, or `#email-input` **is not visible**: take a screenshot labeled `logout-fail`, report that the signout did not complete successfully, and note the current URL path and page state.
- Mark this workflow as **FAIL**. Note: since LOGOUT is the final workflow, there are no dependent workflows to skip.

### Notepad Update

- No new data recorded. The successful logout is confirmed by the screenshot.

### Screenshot

- Label: `logout-complete`

---

## Test Summary Report

**Requirements:** 19.1–19.7

After all 16 workflows have completed (including CLEANUP and LOGOUT), you MUST produce a structured test summary report. This report is the final output of the test session. Output it to the terminal/chat.

### When to Produce the Report

Produce the report AFTER workflow 16 (LOGOUT) completes — regardless of whether LOGOUT passed or failed. Every test session ends with a report.

### Report Format

Use the exact format below. Replace all `{placeholder}` values with actual data from your Notepad and workflow results.

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

  TOTALS: X passed, Y failed, Z skipped
  
  SCREENSHOTS CAPTURED: N
  RESOURCES CREATED: N
  RESOURCES CLEANED: N (details)

  FAILURES:
  ─────────────────────────────────────────────────
  [#] WORKFLOW-NAME
      Error: description
      CLI Command: (if applicable)
      Screenshot: filename
  ─────────────────────────────────────────────────

  NOTEPAD (Test Data):
  ─────────────────────────────────────────────────
  (full Notepad dump)
═══════════════════════════════════════════════════
```

### Report Field Descriptions

| Field | Description |
|-------|-------------|
| `Date` | The current date and time when the report is generated |
| `Test Email` | The Test_Email value from your Notepad |
| `Duration` | Total elapsed time from the start of Workflow 1 to the end of Workflow 16 |
| `Status` | One of: `✅ PASS`, `❌ FAIL`, or `⏭️ SKIP` |
| `Duration` (per workflow) | Elapsed time for that workflow. Use `-` for skipped workflows |
| `Notes` | Brief context — error summary for FAIL, dependency reason for SKIP, relevant data for PASS |
| `TOTALS` | Count of passed, failed, and skipped workflows. Must sum to 16 |
| `SCREENSHOTS CAPTURED` | Total number of screenshots taken during the session |
| `RESOURCES CREATED` | Number of test resources created (organizations, applications) |
| `RESOURCES CLEANED` | Number of resources successfully cleaned up, with a parenthetical listing (e.g., `2 (Cognito user, DynamoDB record)`) |

### Dependency Chain Skip Logic

When a workflow fails, skip all workflows that transitively depend on it. The dependency chain is:

```
PREREQ-CHECK → CLEAN-STATE → SIGNUP-EMAIL → SIGNUP-PASSWORD → SIGNUP-EMAIL-VERIFY
→ SIGNUP-MFA-SETUP → SIGNUP-PROFILE-NAME → SIGNUP-PHONE-VERIFY → VERIFY-DASHBOARD
→ VERIFY-PROFILE → ORG-CRUD → APP-CRUD → [APP-ROLES, APP-ENVIRONMENTS]
→ CLEANUP → LOGOUT
```

Specific skip rules:

| If This Workflow Fails | Skip These Workflows |
|------------------------|----------------------|
| PREREQ-CHECK | 2–14 |
| CLEAN-STATE | 3–14 |
| Any SIGNUP-* | Remaining SIGNUP-* workflows and 9–14 |
| VERIFY-DASHBOARD | 11–14 |
| ORG-CRUD | 12–14 |
| APP-CRUD | 13–14 |

Mark each skipped workflow with `⏭️ SKIP` and set its Notes to `Depends on {FAILED_WORKFLOW_NAME}` — the workflow that directly caused the skip. For transitive skips (e.g., APP-CRUD skipped because ORG-CRUD was skipped because VERIFY-DASHBOARD failed), reference the original failed workflow, not the intermediate skipped one.

### Always-Run Rule: CLEANUP and LOGOUT

> **CLEANUP (workflow 15) and LOGOUT (workflow 16) ALWAYS execute regardless of prior failures.** They are never skipped. Their status is always either `✅ PASS` or `❌ FAIL` — never `⏭️ SKIP`.

If upstream workflows failed and no resources were created, CLEANUP still runs but adapts to the partial state (e.g., skips Cognito/DynamoDB deletion if no user was created, skips browser deletion if no resources exist). In this case, mark CLEANUP as `✅ PASS` with a note like `Partial: no resources to clean`.

### FAILURES Section

If any workflows have status `❌ FAIL`, include the FAILURES section. List each failed workflow with:

- **`[#] WORKFLOW-NAME`** — the workflow number and name
- **`Error:`** — a one-line description of what went wrong
- **`CLI Command:`** — the CLI command that failed, if applicable (omit this line if the failure was browser-based)
- **`Screenshot:`** — the failure screenshot filename (e.g., `phone-verify-fail-1711234567.png`)

If no workflows failed, omit the FAILURES section entirely.

### NOTEPAD (Test Data) Section

Dump the full contents of your Notepad at the end of the report. Include every key-value pair recorded during the session. For sensitive values (Test_Password), write `(stored in SSM)` instead of the actual value.

Example:

```
  NOTEPAD (Test Data):
  ─────────────────────────────────────────────────
  Test Email: testuser+e2e@thepetersfamily.ca
  Test Password: (stored in SSM)
  TOTP Secret: JBSWY3DPEHPK3PXP
  Phone: +15551234567
  userId: abc123-def456-ghi789
  Organization ID: org-uuid-here
  Application ID: app-uuid-here
  Email Verification Code: 123456
  SMS Verification Code: 654321
  Cleanup Summary:
    Cognito user: success
    DynamoDB record: success
    Application: success
    Organization: success
```

If a value was never set (because the workflow that produces it was skipped or failed before recording it), write `(not set)` for that key.

### Workflow Names and Order

The report MUST list all 16 workflows in this exact order:

| # | Workflow Name |
|---|--------------|
| 1 | PREREQ-CHECK |
| 2 | CLEAN-STATE |
| 3 | SIGNUP-EMAIL |
| 4 | SIGNUP-PASSWORD |
| 5 | SIGNUP-EMAIL-VERIFY |
| 6 | SIGNUP-MFA-SETUP |
| 7 | SIGNUP-PROFILE-NAME |
| 8 | SIGNUP-PHONE-VERIFY |
| 9 | VERIFY-DASHBOARD |
| 10 | VERIFY-PROFILE |
| 11 | ORG-CRUD |
| 12 | APP-CRUD |
| 13 | APP-ROLES |
| 14 | APP-ENVIRONMENTS |
| 15 | CLEANUP |
| 16 | LOGOUT |
