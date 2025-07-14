# Dashboard Component

## Overview

The Dashboard component serves as the main landing page for authenticated users, providing a comprehensive overview of their account status, health indicators, and quick access to key features. It displays user information, verification status, and account health warnings with actionable navigation options.

## Component Details

- **Selector**: `app-dashboard`
- **Type**: Feature Component (Standalone)
- **Location**: `features/user/components/dashboard/`
- **Author**: Corey Dale Peters
- **Date**: 2025-02-24

## Features

### User Information Display
- Current user profile information
- Account status indicators
- Profile completion status
- Last login information

### Health Monitoring
- Email verification status
- Phone verification status
- MFA setup status
- Profile completeness checks
- Health warning indicators

### Quick Actions
- Navigate to profile management
- Access email verification
- Set up phone verification
- Configure MFA/security settings
- Trigger MFA status checks

## API Reference

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `currentUser$` | `Observable<IUsers \| null>` | Observable stream of current user data |
| `debugMode$` | `Observable<boolean>` | Observable for debug mode state |
| `isLoading$` | `Observable<boolean>` | Observable for loading state |
| `isNotLoading$` | `Observable<boolean>` | Inverse of loading state |

### Public Methods

#### `isUserValid(user: any): boolean`
Validates if a user object has all required attributes.
- **Parameters**: `user` - User object to validate
- **Returns**: `boolean` - True if user is valid

#### `getStatusClass(status: string): string`
Returns appropriate CSS class for user status badge styling.
- **Parameters**: `status` - User status string
- **Returns**: `string` - CSS class name ('success', 'warning', 'error', 'default')

#### `formatDate(dateString: string): string`
Formats ISO date strings for user-friendly display.
- **Parameters**: `dateString` - ISO date string
- **Returns**: `string` - Formatted date or error message

#### `hasValidName(user: any): boolean`
Checks if user has valid first and last name.
- **Parameters**: `user` - User object
- **Returns**: `boolean` - True if both names are present

#### `hasHealthWarnings(user: any): boolean`
Determines if user has any incomplete account requirements.
- **Parameters**: `user` - User object
- **Returns**: `boolean` - True if any requirements are incomplete

### Navigation Methods

#### `goToProfile(): void`
Navigates to user profile management page.

#### `goToEmailVerification(): void`
Navigates to auth flow for email verification.

#### `goToPhoneVerification(): void`
Navigates to auth flow for phone verification.

#### `goToSecuritySettings(): void`
Initiates MFA setup flow and navigates to authentication.

#### `checkMFASetup(): void`
Triggers MFA status check if not currently loading.

## Dependencies

### Angular Core
- `@angular/core` - Component, OnInit
- `@angular/common` - CommonModule
- `@angular/router` - Router, RouterModule

### State Management
- `@ngrx/store` - Store
- `rxjs` - Observable, map operator

### UI Libraries
- `@fortawesome/angular-fontawesome` - FontAwesome icons

### Internal Dependencies
- `UserService` - User validation and operations
- `UserActions` - NgRx actions for user state
- `fromUser` selectors - User state selectors
- `IUsers` model - User interface

### FontAwesome Icons
The component uses multiple FontAwesome icons:
- `faUser` - User profile
- `faBolt` - Power/activity indicators
- `faHeartbeat` - Health status
- `faHistory` - History/activity
- `faUserEdit` - Profile editing
- `faShieldAlt` - Security/MFA
- `faCreditCard` - Billing/payment
- `faCog` - Settings
- `faCheckCircle` - Success states
- `faClock` - Pending states
- `faExclamationTriangle` - Warning states
- `faInfoCircle` - Information
- `faArrowRight` - Navigation

## Usage Examples

### Basic Implementation
```typescript
import { DashboardComponent } from './dashboard.component';

// Component is standalone and can be used directly
@Component({
  template: '<app-dashboard></app-dashboard>',
  imports: [DashboardComponent]
})
```

### Template Usage
```html
<!-- Main dashboard container -->
<app-dashboard></app-dashboard>
```

### Health Warning Check
```typescript
// Example of using health warning check
if (this.dashboardComponent.hasHealthWarnings(user)) {
  // Display warnings and guide user to complete profile
}
```

## State Integration

### NgRx Selectors Used
- `selectCurrentUser` - Current authenticated user
- `selectDebugMode` - Application debug state
- `selectIsLoading` - Loading state for UI feedback

### NgRx Actions Dispatched
- `UserActions.checkMFASetup()` - Triggers MFA status verification
- `UserActions.beginMFASetupFlow()` - Initiates MFA configuration

## Accessibility

### WCAG Compliance
- Semantic HTML structure
- ARIA labels for interactive elements
- Keyboard navigation support
- High contrast mode compatibility
- Screen reader friendly content

### Features
- Status indicators use both color and text
- All interactive elements have clear focus states
- Descriptive link text for navigation
- Proper heading hierarchy

## Performance Considerations

### Optimizations
- OnPush change detection strategy recommended
- Async pipe usage for observables
- Conditional rendering for loading states
- Efficient icon library management

### Loading States
- Loading indicators during MFA checks
- Skeleton loading for user data
- Progressive enhancement for slow connections

## Security Features

### Data Protection
- No sensitive data stored in component state
- Secure navigation to authentication flows
- MFA status verification through secure channels

### User Session
- Session validation through store selectors
- Automatic redirects for invalid sessions
- Secure signout functionality

## Testing Strategy

### Unit Tests
- Component initialization
- User validation logic
- Date formatting functionality
- Navigation method calls
- Health warning calculations

### Integration Tests
- NgRx store interactions
- Router navigation
- Service method calls
- Observable stream handling

### E2E Tests
- Complete dashboard user flow
- Health warning interactions
- Navigation to various features
- MFA setup initiation

## Common Issues

### Troubleshooting

**Issue**: User data not loading
- **Solution**: Check NgRx store setup and user selectors

**Issue**: Navigation not working
- **Solution**: Verify Router service injection and route configuration

**Issue**: Icons not displaying
- **Solution**: Ensure FontAwesome library setup and icon imports

**Issue**: MFA check not triggering
- **Solution**: Verify loading state and action dispatch logic

## Development Guidelines

### Best Practices
- Use reactive patterns with observables
- Implement proper error handling
- Follow Angular style guide
- Maintain component purity
- Use TypeScript strict mode

### Code Style
- Document all public methods
- Use descriptive variable names
- Implement proper type safety
- Follow consistent formatting

---

**Related Documentation**:
- [User Profile Component](../profile/README.md)
- [Authentication Flow](../../auth/README.md)
- [User Layout](../../layouts/user-layout/README.md)
- [User State Management](../../../frontend-architecture.md#state-management)