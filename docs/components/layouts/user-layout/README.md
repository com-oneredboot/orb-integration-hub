# User Layout Component

## Overview

The User Layout component provides a specialized layout structure for authenticated user pages within the Orb Integration Hub. It extends the base platform layout with user-specific features, session management, and enhanced security controls. This component ensures proper user authentication state and handles session refresh operations.

## Component Details

- **Selector**: `app-user-layout`
- **Type**: Layout Component (Standalone)
- **Location**: `layouts/user-layout/`
- **Author**: Corey Dale Peters
- **Date**: 2025-03-07

## Features

### User-Specific Layout
- Enhanced layout for authenticated users
- User session state monitoring
- Automatic session refresh handling
- Secure navigation controls

### Authentication Management
- Session validation on initialization
- Automatic token refresh
- Secure sign-out functionality
- Authentication state monitoring

### Security Features
- Protected route enforcement
- Session timeout handling
- Automatic security checks
- Secure state management

## API Reference

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `isAuthenticated$` | `Observable<boolean>` | Observable stream of authentication status |

### Lifecycle Methods

#### `ngOnInit(): void`
Initializes component and triggers session refresh.
- **Purpose**: Ensures user data is loaded and session is valid
- **Side Effects**: Dispatches `UserActions.refreshSession()`

### Public Methods

#### `signOut(): void`
Initiates secure user sign-out process.
- **Returns**: `void`
- **Side Effects**: Dispatches sign-out action, clears user state, triggers navigation

### Constructor Dependencies

#### `authService: CognitoService`
- **Type**: Private
- **Purpose**: AWS Cognito authentication service integration

#### `router: Router`
- **Type**: Private
- **Purpose**: Navigation and routing functionality

#### `store: Store`
- **Type**: Private
- **Purpose**: NgRx store for state management

## Dependencies

### Angular Core
- `@angular/core` - Component, OnInit
- `@angular/common` - CommonModule
- `@angular/router` - Router, RouterModule

### State Management
- `@ngrx/store` - Store for state management

### Services
- `CognitoService` - AWS Cognito authentication service

### Store Integration
- `UserActions.refreshSession()` - Session refresh action
- `UserActions.signout()` - Sign-out action
- `selectIsAuthenticated` - Authentication status selector

## Usage Examples

### Basic Implementation
```typescript
import { UserLayoutComponent } from './user-layout.component';

// Used for authenticated user pages
@Component({
  template: `
    <app-user-layout>
      <router-outlet></router-outlet>
    </app-user-layout>
  `,
  imports: [UserLayoutComponent, RouterOutlet]
})
```

### Route Configuration
```typescript
// Protected routes using user layout
{
  path: 'user',
  component: UserLayoutComponent,
  canActivate: [AuthGuard],
  children: [
    { path: 'dashboard', component: DashboardComponent },
    { path: 'profile', component: ProfileComponent },
    { path: 'settings', component: SettingsComponent }
  ]
}
```

### Guard Integration
```typescript
// Route guard for user layout
@Injectable()
export class UserLayoutGuard implements CanActivate {
  constructor(private store: Store) {}
  
  canActivate(): Observable<boolean> {
    return this.store.select(selectIsAuthenticated);
  }
}
```

## Architecture Integration

### Layout Hierarchy
```
PlatformLayoutComponent (Root)
└── UserLayoutComponent (User Pages)
    ├── User Navigation
    ├── User Content Area
    │   └── RouterOutlet (User Components)
    │       ├── DashboardComponent
    │       ├── ProfileComponent
    │       └── SettingsComponent
    └── User-Specific Footer
```

### Session Management Flow
```
1. Component Initialization
2. Dispatch refreshSession()
3. Store Effect Processes Action
4. Cognito Service Validates Session
5. User State Updated
6. UI Responds to State Changes
```

## State Integration

### Session Management
- Automatic session refresh on component init
- Continuous authentication state monitoring
- Session timeout detection
- Token renewal handling

### User State
- Current user data synchronization
- Profile information management
- Permission-based UI rendering
- Real-time state updates

## Accessibility

### WCAG Compliance
- Enhanced accessibility for user interfaces
- Screen reader optimizations
- Keyboard navigation patterns
- Focus management for user flows

### User-Specific Features
- Personalized navigation aids
- User preference integration
- Customizable accessibility settings
- Enhanced contrast options

## Performance Considerations

### Session Optimization
- Efficient session validation
- Minimal API calls for refresh
- Cached user data utilization
- Optimized state updates

### Component Performance
- OnPush change detection
- Lazy loading for user features
- Efficient observable handling
- Memory leak prevention

## Security Features

### Session Security
- Automatic session validation
- Secure token handling
- Session timeout enforcement
- Cross-tab synchronization

### Data Protection
- Encrypted user data handling
- Secure API communication
- XSS protection measures
- CSRF token validation

### Authentication Flow
```
1. User Layout Initialization
2. Session Refresh Dispatch
3. Token Validation
4. User Data Retrieval
5. State Synchronization
6. UI Update
```

## Testing Strategy

### Unit Tests
- Component initialization
- Session refresh logic
- Sign-out functionality
- Authentication state handling
- Observable stream testing

### Integration Tests
- NgRx store integration
- Router navigation
- Service interaction
- Guard integration
- State synchronization

### E2E Tests
- Complete user session flow
- Authentication workflows
- Session timeout scenarios
- Multi-tab behavior
- Security validations

## Error Handling

### Session Errors
- Invalid session handling
- Token expiration recovery
- Network failure handling
- Authentication failures

### User Experience
- Graceful error messages
- Automatic retry mechanisms
- Fallback UI states
- Error reporting

## Common Issues

### Troubleshooting

**Issue**: Session not refreshing
- **Solution**: Check NgRx effect implementation and service integration

**Issue**: Authentication state not updating
- **Solution**: Verify store selector and subscription handling

**Issue**: User data not loading
- **Solution**: Check session refresh action and user service

**Issue**: Navigation not working after sign-out
- **Solution**: Verify router navigation in sign-out effect

## Development Guidelines

### Best Practices
- Always refresh session on init
- Handle authentication errors gracefully
- Implement proper loading states
- Use reactive patterns consistently
- Follow security best practices

### Component Responsibilities
- **Do**: Handle user session management, authentication state, user-specific layout
- **Don't**: Include business logic, data manipulation, complex computations

### Security Guidelines
- Validate session state continuously
- Handle token expiration properly
- Implement secure sign-out
- Protect against common vulnerabilities

## Comparison with Platform Layout

| Feature | Platform Layout | User Layout |
|---------|----------------|-------------|
| **Purpose** | Global app shell | User-specific pages |
| **Authentication** | Basic monitoring | Active session management |
| **Session Handling** | None | Automatic refresh |
| **Security** | Standard | Enhanced |
| **Target Users** | All visitors | Authenticated users only |

## Future Enhancements

### Planned Features
- Enhanced session analytics
- Multi-device session management
- Advanced security monitoring
- User preference persistence

### Extensibility
- Pluggable authentication providers
- Customizable user interfaces
- Enhanced security modules
- Advanced session controls

## Migration Guide

### From Platform Layout
```typescript
// Before (Platform Layout)
<app-platform-layout>
  <router-outlet></router-outlet>
</app-platform-layout>

// After (User Layout for authenticated pages)
<app-user-layout>
  <router-outlet></router-outlet>
</app-user-layout>
```

### Route Updates
```typescript
// Update routes to use user layout for protected pages
{
  path: 'protected',
  component: UserLayoutComponent, // Changed from PlatformLayoutComponent
  canActivate: [AuthGuard],
  children: [/* protected routes */]
}
```

---

**Related Documentation**:
- [Platform Layout Component](../platform-layout/README.md)
- [Authentication Flow](../../auth/README.md)
- [Dashboard Component](../../features/dashboard/README.md)
- [Session Management](../../../session-management.md)
- [Security Architecture](../../../security.md)