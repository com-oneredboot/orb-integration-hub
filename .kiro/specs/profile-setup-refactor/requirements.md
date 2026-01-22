# Requirements Document

## Introduction

This specification covers the refactoring of profile setup functionality from the authentication flow to a dedicated profile management system. Currently, profile fields (first name, last name, phone number) are partially handled in the auth flow but blocked by the auth guard for authenticated users. This creates a broken user experience where users cannot complete their profile setup.

The refactoring separates concerns:
- **Auth Flow**: Security-focused (email, password, email verification, MFA) - Cognito-driven
- **Profile Page**: Profile data management (name, phone, verification) - post-authentication

## Standard Requirements

This spec follows the [orb-templates Spec Standards](../../repositories/orb-templates/docs/kiro-steering/templates/spec-standards.md).

## Glossary

- **Auth_Flow**: The authentication workflow component at `/authenticate` handling sign-in, sign-up, and MFA
- **Profile_Page**: The profile management component at `/profile` for viewing and editing user data
- **Auth_Guard**: Angular route guard that redirects authenticated users away from `/authenticate`
- **Profile_Form**: The reactive form in the profile component for editing user data
- **Phone_Verification**: SMS-based verification of phone numbers using the SmsVerification Lambda
- **User_Status**: Enum indicating account completion state (PENDING, ACTIVE, etc.)
- **Health_Check**: Dashboard section showing profile completion status

## Requirements

### Requirement 1: Profile Page Input Styling

**User Story:** As a user, I want profile form inputs to be clearly visible and consistent with the auth flow styling, so that I can easily see and edit my information.

#### Acceptance Criteria

1. THE Profile_Form inputs SHALL use the same styling as Auth_Flow inputs (visible borders, proper contrast)
2. THE Profile_Form inputs SHALL have clear focus states with visible outlines
3. THE Profile_Form inputs SHALL display validation errors with the same styling as Auth_Flow
4. THE Profile_Form labels SHALL be clearly visible above each input field

### Requirement 2: Profile Edit Mode Simplification

**User Story:** As a user, I want to see only the edit form when editing my profile, so that I'm not confused by duplicate information.

#### Acceptance Criteria

1. WHEN the user clicks "Edit Profile", THE Profile_Page SHALL hide the read-only summary section
2. WHEN the user clicks "Edit Profile", THE Profile_Page SHALL show only the edit form
3. WHEN the user saves or cancels, THE Profile_Page SHALL return to showing the read-only summary
4. THE edit form SHALL include all editable fields: first name, last name, phone number

### Requirement 3: Phone Number Editing in Profile

**User Story:** As a user, I want to add or change my phone number from the profile page, so that I can complete my profile setup.

#### Acceptance Criteria

1. THE Profile_Form SHALL enable the phone number field for editing (currently disabled)
2. THE Profile_Form SHALL validate phone numbers in international format (E.164)
3. WHEN a user enters a new phone number, THE Profile_Page SHALL display a "Verify Phone" button
4. THE Profile_Page SHALL NOT allow saving an unverified phone number as verified

### Requirement 4: Phone Verification in Profile

**User Story:** As a user, I want to verify my phone number from the profile page, so that I can complete my account setup without navigating elsewhere.

#### Acceptance Criteria

1. WHEN a user clicks "Verify Phone", THE Profile_Page SHALL send an SMS verification code
2. THE Profile_Page SHALL display a code input field after sending the verification code
3. WHEN a user enters the correct code, THE Profile_Page SHALL mark the phone as verified
4. WHEN a user enters an incorrect code, THE Profile_Page SHALL display an error message
5. THE Profile_Page SHALL allow resending the verification code after a cooldown period
6. IF the verification code expires, THEN THE Profile_Page SHALL prompt the user to request a new code

### Requirement 5: Remove Profile Steps from Auth Flow

**User Story:** As a developer, I want profile setup steps removed from the auth flow, so that the auth flow focuses only on authentication.

#### Acceptance Criteria

1. THE Auth_Flow SHALL NOT include the NAME_SETUP step
2. THE Auth_Flow SHALL NOT include the PHONE_SETUP step
3. THE Auth_Flow SHALL NOT include the PHONE_VERIFY step
4. THE Auth_Flow SHALL proceed directly from MFA verification to dashboard
5. THE Auth_Flow state machine SHALL be updated to remove these steps

### Requirement 6: Dashboard Health Check Updates

**User Story:** As a user, I want dashboard health check items to link to the profile page, so that I can complete my profile setup.

#### Acceptance Criteria

1. WHEN a user clicks "Add Phone" or "Verify Phone" in the health check, THE Dashboard SHALL navigate to the profile page
2. WHEN a user clicks profile-related health items, THE Profile_Page SHALL open in edit mode
3. THE Dashboard health check SHALL accurately reflect profile completion status
4. THE Dashboard SHALL NOT attempt to navigate to the auth flow for profile completion

### Requirement 7: User Status Calculation

**User Story:** As a system, I want user status to be calculated based on profile completion, so that users know what they need to complete.

#### Acceptance Criteria

1. THE User_Status SHALL be PENDING when any required field is missing (firstName, lastName, phoneNumber)
2. THE User_Status SHALL be PENDING when phone is not verified
3. THE User_Status SHALL be ACTIVE when all required fields are present and phone is verified
4. WHEN a user completes their profile, THE System SHALL update their status to ACTIVE

### Requirement 8: Unit Test Coverage

**User Story:** As a developer, I want comprehensive unit tests for the refactored code, so that we maintain code quality.

#### Acceptance Criteria

1. THE Profile_Component SHALL have unit tests for edit mode toggling
2. THE Profile_Component SHALL have unit tests for phone verification flow
3. THE Auth_Flow SHALL have updated unit tests reflecting removed steps
4. THE Dashboard_Component SHALL have unit tests for profile navigation
5. THE User_Effects SHALL have unit tests for any new or modified effects
