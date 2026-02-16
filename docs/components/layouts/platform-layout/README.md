# Platform Layout Component

## Overview

The Platform Layout component serves as the primary structural wrapper for the Orb Integration Hub application. It provides the main application shell, including the global header, navigation elements, authentication controls, and footer. This component handles the overall layout architecture and responsive design for all application pages.

## Component Details

- **Selector**: `app-platform-layout`
- **Type**: Layout Component (Standalone)
- **Location**: `layouts/platform-layout/`
- **Author**: Corey Dale Peters
- **Date**: 2024-12-04

## Features

### Application Shell
- Global application header
- Main content area wrapper
- Responsive layout structure
- Footer with copyright information

### Authentication Integration
- Authentication state monitoring
- Sign-out functionality
- Conditional UI based on auth status
- Secure session management

### Navigation Structure
- Global navigation elements
- Route-based content rendering
- Breadcrumb support (if implemented)
- Mobile-responsive navigation

## API Reference

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `title` | `string` | Application title displayed in header |
| `currentYear` | `number` | Current year for copyright display |
| `isAuthenticated$` | `Observable<boolean>` | Observable stream of authentication status |

### Public Methods

#### `signOut(): void`
Initiates user sign-out process using NgRx actions.
- **Returns**: `void`
- **Side Effects**: Dispatches sign-out action, triggers navigation

### Constructor Dependencies

#### `authService: CognitoService`
- **Type**: Private
- **Purpose**: Authentication service integration

#### `router: Router`
- **Type**: Public
- **Purpose**: Navigation and routing functionality
- **Template Access**: Available in template for routing operations

#### `store: Store`
- **Type**: Private
- **Purpose**: NgRx store for state management

## Dependencies

### Angular Core
- `@angular/core` - Component
- `@angular/common` - CommonModule
- `@angular/router` - Router, RouterModule

### State Management
- `@ngrx/store` - Store for state management

### Services
- `CognitoService` - AWS Cognito authentication service

### Store Integration
- `UserActions` - User-related NgRx actions
- `selectIsAuthenticated` - Authentication status selector

## Usage Examples

### Basic Implementation
```typescript
import { PlatformLayoutComponent } from './platform-layout.component';

// Used as main application wrapper
@Component({
  template: `
    <app-platform-layout>
      <router-outlet></router-outlet>
    </app-platform-layout>
  `,
  imports: [PlatformLayoutComponent, RouterOutlet]
})
```

### Route Configuration
```typescript
// In app routing module
{
  path: '',
  component: PlatformLayoutComponent,
  children: [
    { path: 'dashboard', component: DashboardComponent },
    { path: 'profile', component: ProfileComponent },
    // ... other routes
  ]
}
```

### Template Structure
```html
<!-- Platform layout wraps all application content -->
<app-platform-layout>
  <!-- Main content area -->
  <main class="main-content">
    <router-outlet></router-outlet>
  </main>
</app-platform-layout>
```

## Architecture Integration

### Layout Hierarchy
```
PlatformLayoutComponent (Root Layout)
├── Header (Global Navigation)
├── Main Content Area
│   └── RouterOutlet (Page Content)
│       ├── UserLayoutComponent (User Pages)
│       ├── AuthFlowComponent (Authentication)
│       └── Other Components
└── Footer (Copyright, Links)
```

### Responsive Design
- Mobile-first approach
- Breakpoint-based layouts
- Flexible grid system
- Touch-friendly interactions

## State Integration

### Authentication State
- Monitors `selectIsAuthenticated` selector
- Conditionally renders UI elements
- Handles sign-out state transitions

### Navigation State
- Router integration for active routes
- Dynamic navigation based on user state
- Protected route handling

## Accessibility

### WCAG Compliance
- Semantic HTML structure
- ARIA landmarks for navigation
- Keyboard navigation support
- Screen reader compatibility

### Features
- Skip-to-content links
- Proper heading hierarchy
- High contrast mode support
- Focus management during navigation

## Performance Considerations

### Optimizations
- OnPush change detection strategy
- Efficient template rendering
- Minimal DOM manipulations
- Optimized CSS delivery

### Loading Strategy
- Progressive enhancement
- Critical CSS inlining
- Lazy loading for non-critical components
- Efficient asset bundling

## Security Features

### Authentication Security
- Secure sign-out implementation
- Session validation
- Protected route enforcement
- CSRF protection integration

### Content Security
- XSS prevention measures
- Secure iframe handling
- Content sanitization
- Trusted navigation only

## Styling Architecture

### SCSS Structure
```scss
// platform-layout.component.scss
.platform-layout {
  &__header { /* Header styles */ }
  &__main { /* Main content styles */ }
  &__footer { /* Footer styles */ }
  &__nav { /* Navigation styles */ }
  
  // Responsive breakpoints
  @media (max-width: 768px) { /* Mobile styles */ }
  @media (min-width: 769px) { /* Desktop styles */ }
}
```

### CSS Custom Properties
- Theme color variables
- Spacing constants
- Typography scales
- Breakpoint definitions

## Testing Strategy

### Unit Tests
- Component initialization
- Authentication state handling
- Sign-out functionality
- Router integration
- Property binding

### Integration Tests
- Layout rendering
- Navigation flow
- Authentication integration
- Responsive behavior
- State management

### E2E Tests
- Complete application flow
- Authentication workflows
- Navigation scenarios
- Cross-browser compatibility

## Common Issues

### Troubleshooting

**Issue**: Layout not responsive
- **Solution**: Check CSS breakpoints and flexbox/grid implementation

**Issue**: Sign-out not working
- **Solution**: Verify NgRx action dispatch and effect implementation

**Issue**: Router outlet not rendering
- **Solution**: Check route configuration and RouterModule imports

**Issue**: Authentication state not updating
- **Solution**: Verify store selector and subscription handling

## Development Guidelines

### Best Practices
- Keep layout logic minimal
- Use reactive patterns for state
- Implement proper error boundaries
- Follow Angular style guide
- Maintain accessibility standards

### Component Responsibilities
- **Do**: Handle layout structure, authentication UI, global navigation
- **Don't**: Include business logic, data manipulation, complex state management

### Performance Guidelines
- Minimize template complexity
- Use trackBy functions for lists
- Implement efficient change detection
- Optimize CSS for critical rendering path

## Browser Support

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Fallbacks
- CSS Grid fallbacks for older browsers
- Progressive enhancement features
- Polyfills for missing features

## Future Enhancements

### Planned Features
- Theme switching capabilities
- Enhanced mobile navigation
- Breadcrumb integration
- Advanced accessibility features

### Extensibility
- Plugin architecture for additional features
- Customizable header/footer content
- Configurable navigation structure

---

**Related Documentation**:
- [User Layout Component](../user-layout/README.md)
- [Authentication Flow](../../auth/README.md)
- [Application Architecture](../../../frontend-architecture.md)
- [Routing Configuration](../../../routing.md)