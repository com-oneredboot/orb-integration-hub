# Profile Component

This component handles both profile viewing/editing and profile completion for new users.

## Features

- **Dual mode operation:** Works as both a profile editor and a profile completion form
- **Form validation:** Validates user input with appropriate error messages
- **Responsive design:** Adapts to different screen sizes
- **Authentication integration:** Works with the authentication flow

## Modes

The component operates in two modes:

1. **View/Edit Mode:** For existing users to view and update their profile
2. **Completion Mode:** For new users to complete their required profile information

## Usage

The mode is determined by the route data:

```typescript
// In the routes file:
{
  path: 'profile',
  component: ProfileComponent,
  canActivate: [AuthGuard],
  data: { requiresAuth: true, mode: 'view' }
},
{
  path: 'profile-completion',
  component: ProfileComponent,
  canActivate: [ProfileCompletionGuard],
  data: { requiresAuth: true, mode: 'completion' }
}
```

## Guards

Two guards control access to the profile features:

1. **ProfileCompletionGuard:** Ensures users with incomplete profiles are directed to complete them
2. **DashboardGuard:** Ensures users can only access the dashboard with complete profiles

## Form Fields

The form includes the following fields:

- **First Name:** Required, minimum 2 characters
- **Last Name:** Required, minimum 2 characters
- **Email:** Read-only field showing the user's email
- **Phone Number:** Required in completion mode, read-only in view mode

## Integration with Auth Flow

This component is part of the authentication flow, specifically handling Step 6 (Profile Completion Check) and Step 7 (User Profile Form). It works with the auth store to:

1. Check if a profile is complete
2. Update profile information
3. Redirect to appropriate pages based on profile status 