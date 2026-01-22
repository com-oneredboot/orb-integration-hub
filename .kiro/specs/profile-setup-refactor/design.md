# Design Document

## Overview

This design refactors the profile setup functionality from the authentication flow to the profile page. The goal is to create a clear separation between authentication (security-focused, Cognito-driven) and profile management (user data, post-authentication).

### Current State

```
Auth Flow: EMAIL → PASSWORD → EMAIL_VERIFY → SIGNIN → NAME_SETUP → PHONE_SETUP → PHONE_VERIFY → MFA_SETUP → MFA_VERIFY → Dashboard
```

Problems:
- Auth guard blocks authenticated users from `/authenticate`, preventing profile completion
- Profile page has phone number disabled, expecting auth flow to handle it
- Users cannot complete profile setup after initial authentication

### Target State

```
Auth Flow: EMAIL → PASSWORD → EMAIL_VERIFY → SIGNIN → MFA_SETUP → MFA_VERIFY → Dashboard
Profile Page: Name editing + Phone editing + Phone verification
```

Benefits:
- Clear separation of concerns
- No auth guard conflicts
- Single location for all profile management
- Better UX - users can complete profile at their own pace

## Architecture

### Component Responsibilities

```
┌─────────────────────────────────────────────────────────────────┐
│                        Auth Flow                                 │
│  ┌─────────┐  ┌──────────┐  ┌────────────┐  ┌─────────────────┐ │
│  │  Email  │→ │ Password │→ │Email Verify│→ │ MFA Setup/Verify│ │
│  └─────────┘  └──────────┘  └────────────┘  └─────────────────┘ │
│                                                      ↓          │
└──────────────────────────────────────────────────────┼──────────┘
                                                       ↓
┌─────────────────────────────────────────────────────────────────┐
│                        Dashboard                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Health Check: Profile incomplete? → Link to /profile?mode=  ││
│  │               setup&startFrom=incomplete                    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                      ↓          │
└──────────────────────────────────────────────────────┼──────────┘
                                                       ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Profile Page (Flow Mode)                       │
│                                                                  │
│  Entry: "Edit Profile" → Full flow (all steps)                  │
│  Entry: Dashboard link → Skip to first incomplete step          │
│                                                                  │
│  ┌──────────┐    ┌────────────┐    ┌──────────────┐    ┌──────┐│
│  │  NAME    │ →  │   PHONE    │ →  │ PHONE_VERIFY │ →  │DONE  ││
│  │firstName │    │phoneNumber │    │ SMS code     │    │      ││
│  │lastName  │    │            │    │              │    │      ││
│  └──────────┘    └────────────┘    └──────────────┘    └──────┘│
│       ↑                                                   ↓     │
│       └───────────────── Back ────────────────────────────┘     │
│                                                                  │
│  Summary View: Read-only display of all profile data            │
└─────────────────────────────────────────────────────────────────┘
```

### Flow Logic

```
Dashboard Health Check Click:
  → Navigate to /profile?mode=setup&startFrom=incomplete
  → Profile component checks user data
  → Skips to first incomplete step (e.g., if name is filled, go to PHONE)
  → User completes remaining steps
  → Returns to summary view

"Edit Profile" Button Click:
  → startFullFlow()
  → Always starts at NAME step
  → User can update any/all fields
  → Goes through all steps: NAME → PHONE → PHONE_VERIFY → COMPLETE
  → Returns to summary view
```

## Components and Interfaces

### Profile Setup Flow

The profile page implements a step-based flow similar to the auth flow:

```
Profile Setup Steps:
  NAME_STEP → PHONE_STEP → PHONE_VERIFY_STEP → COMPLETE
```

**Flow Behavior:**
- **From Dashboard Health Check**: Skips to the first incomplete step (smart navigation)
- **From "Edit Profile" button**: Goes through entire flow regardless of completion (allows updates)

```typescript
// profile.component.ts

enum ProfileSetupStep {
  NAME = 'NAME',           // First name, last name
  PHONE = 'PHONE',         // Phone number entry
  PHONE_VERIFY = 'PHONE_VERIFY', // SMS code verification
  COMPLETE = 'COMPLETE'    // All done, show summary
}

interface ProfileSetupState {
  currentStep: ProfileSetupStep;
  isFlowMode: boolean;     // true = step-by-step flow, false = summary view
  startFromBeginning: boolean; // true = edit all, false = skip completed
}

interface PhoneVerificationState {
  codeSent: boolean;
  codeExpiration: Date | null;
  error: string | null;
  cooldownUntil: Date | null;
}

@Component({...})
export class ProfileComponent {
  // Setup flow state
  setupState: ProfileSetupState;
  phoneVerificationState: PhoneVerificationState;
  
  // Forms for each step
  nameForm: FormGroup;
  phoneForm: FormGroup;
  verifyForm: FormGroup;
  
  // Initialize forms
  initForms(): void {
    this.nameForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]]
    });
    
    this.phoneForm = this.fb.group({
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\+[1-9]\d{1,14}$/)]]
    });
    
    this.verifyForm = this.fb.group({
      verificationCode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });
  }
  
  // Entry points
  startFullFlow(): void;           // "Edit Profile" - go through all steps
  startFromIncomplete(): void;     // Dashboard link - skip to first incomplete
  
  // Navigation
  nextStep(): void;
  previousStep(): void;
  skipToStep(step: ProfileSetupStep): void;
  
  // Step completion
  async submitNameStep(): Promise<void>;
  async submitPhoneStep(): Promise<void>;
  async submitVerifyStep(): Promise<void>;
  
  // Phone verification
  async sendVerificationCode(): Promise<void>;
  async verifyPhoneCode(code: string): Promise<void>;
  canResendCode(): boolean;
  
  // Helpers
  getFirstIncompleteStep(user: IUsers): ProfileSetupStep;
  isStepComplete(step: ProfileSetupStep, user: IUsers): boolean;
}
```

### Auth Flow State Changes

```typescript
// user.state.ts - Remove profile-related steps

export enum AuthSteps {
  EMAIL = 'EMAIL',
  PASSWORD = 'PASSWORD',
  PASSWORD_SETUP = 'PASSWORD_SETUP',
  EMAIL_VERIFY = 'EMAIL_VERIFY',
  SIGNIN = 'SIGNIN',
  // REMOVED: NAME_SETUP, PHONE_SETUP, PHONE_VERIFY
  MFA_SETUP = 'MFA_SETUP',
  MFA_VERIFY = 'MFA_VERIFY',
  COMPLETE = 'COMPLETE'
}
```

### Dashboard Navigation Changes

```typescript
// dashboard.component.ts

// Navigate to profile, starting from first incomplete step
goToPhoneVerification(): void {
  this.router.navigate(['/profile'], { 
    queryParams: { mode: 'setup', startFrom: 'incomplete' } 
  });
}

goToNameSetup(): void {
  this.router.navigate(['/profile'], { 
    queryParams: { mode: 'setup', startFrom: 'incomplete' } 
  });
}

// The profile component reads query params and determines starting step
```

### Profile Page Entry Points

```typescript
// profile.component.ts - ngOnInit

ngOnInit(): void {
  this.route.queryParams.subscribe(params => {
    if (params['mode'] === 'setup') {
      if (params['startFrom'] === 'incomplete') {
        // Dashboard link - skip to first incomplete step
        this.startFromIncomplete();
      } else {
        // Full flow
        this.startFullFlow();
      }
    } else {
      // Default - show summary view
      this.showSummary();
    }
  });
}

// "Edit Profile" button triggers full flow
enterEditMode(): void {
  this.startFullFlow(); // Goes through NAME → PHONE → PHONE_VERIFY
}
```

## Data Models

### Phone Verification Flow

```typescript
// Existing SmsVerification service interface
interface SmsVerificationInput {
  phoneNumber: string;
  code?: number;
  valid?: boolean;
}

interface SmsVerificationResponse {
  phoneNumber: string;
  code?: number;
  valid?: boolean;
}
```

### Profile Update Flow

```typescript
// UsersUpdateInput - existing, no changes needed
interface UsersUpdateInput {
  userId: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  phoneVerified?: boolean;
  // ... other fields
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Edit Mode State Consistency

*For any* profile page state, when edit mode is active, the summary section SHALL be hidden AND the edit form SHALL be visible. Conversely, when edit mode is inactive, the summary SHALL be visible AND the edit form SHALL be hidden.

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 2: Phone Number Validation

*For any* string input to the phone number field, the input SHALL be valid if and only if it matches the E.164 format (starts with +, followed by 1-15 digits, first digit non-zero).

**Validates: Requirements 3.2**

### Property 3: Phone Verification Data Integrity

*For any* phone number that has not completed SMS verification, the phoneVerified flag SHALL remain false regardless of form submission.

**Validates: Requirements 3.4**

### Property 4: Verification Code Correctness

*For any* verification attempt, if the code matches the sent code AND is not expired, verification SHALL succeed. If the code does not match OR is expired, verification SHALL fail with an appropriate error.

**Validates: Requirements 4.3, 4.4**

### Property 5: Dashboard Navigation Consistency

*For any* profile-related health check item click (name, phone), the navigation SHALL target `/profile` and SHALL NOT target `/authenticate`.

**Validates: Requirements 6.1, 6.4**

### Property 6: User Status Calculation

*For any* user object, the status SHALL be ACTIVE if and only if: firstName is non-empty AND lastName is non-empty AND phoneNumber is non-empty AND phoneVerified is true. Otherwise, status SHALL be PENDING.

**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

### Property 7: Form Validation Error Display

*For any* form field with validation errors, when the field is touched or dirty, the error message SHALL be displayed with the appropriate error styling class.

**Validates: Requirements 1.3**

## Error Handling

### Phone Verification Errors

| Error | User Message | Recovery Action |
|-------|--------------|-----------------|
| Rate limited | "Too many attempts. Please wait X minutes." | Show countdown timer |
| Invalid code | "Incorrect code. Please try again." | Allow retry |
| Expired code | "Code expired. Please request a new one." | Show resend button |
| Network error | "Unable to send code. Please check your connection." | Show retry button |
| Invalid phone format | "Please enter a valid phone number (e.g., +12025551234)" | Highlight field |

### Profile Update Errors

| Error | User Message | Recovery Action |
|-------|--------------|-----------------|
| Validation failed | Field-specific error messages | Highlight invalid fields |
| Network error | "Unable to save changes. Please try again." | Show retry button |
| Unauthorized | "Session expired. Please sign in again." | Redirect to auth |

## Testing Strategy

### Unit Tests

Unit tests verify specific examples and edge cases:

1. **Profile Component Tests**
   - Edit mode toggle behavior
   - Form initialization with user data
   - Phone verification state transitions
   - Navigation with query parameters

2. **Auth Flow Tests**
   - Verify NAME_SETUP, PHONE_SETUP, PHONE_VERIFY steps are removed
   - MFA completion leads directly to dashboard

3. **Dashboard Tests**
   - Health check navigation targets profile page
   - Health check status reflects profile completion

### Property-Based Tests

Property tests verify universal properties across all inputs using fast-check:

1. **Phone Validation Property Test**
   - Generate random strings, verify E.164 validation is correct
   - Minimum 100 iterations

2. **User Status Calculation Property Test**
   - Generate random user objects, verify status calculation
   - Minimum 100 iterations

3. **Edit Mode State Property Test**
   - Generate random edit mode transitions, verify UI state consistency
   - Minimum 100 iterations

### Test Configuration

```typescript
// fast-check configuration
fc.assert(
  fc.property(...),
  { numRuns: 100 }
);
```

Each property test must include:
- Tag: `Feature: profile-setup-refactor, Property N: {title}`
- Reference to design document property
- Minimum 100 iterations
