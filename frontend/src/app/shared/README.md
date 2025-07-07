# Shared Module

The Shared module provides reusable components, services, and utilities that can be used across multiple features in the Orb Integration Hub frontend application.

## Architecture

The shared module follows Angular best practices:
- **Standalone Components**: All components are standalone for better tree-shaking
- **Barrel Exports**: Clean import paths through index.ts files
- **Service Providers**: Services are provided at the root level
- **Module Structure**: Organized by component type and functionality

## Directory Structure

```
shared/
├── components/
│   ├── auth/                    # Authentication-related components
│   │   ├── auth-button.component.ts
│   │   ├── auth-input-field.component.ts
│   │   └── index.ts
│   ├── error/                   # Error handling components
│   │   ├── error-boundary.component.ts
│   │   └── index.ts
│   ├── ui/                      # UI utility components
│   │   ├── status-badge.component.ts
│   │   └── index.ts
│   └── index.ts                 # Main component exports
├── services/
│   ├── form-validation.service.ts
│   ├── status-display.service.ts
│   └── index.ts
├── shared.module.ts             # Main shared module
├── index.ts                     # Main barrel export
└── README.md                    # This file
```

## Components

### Authentication Components (`components/auth/`)

#### AuthButtonComponent
- **Purpose**: Reusable button with loading states, variants, and accessibility
- **Features**: Loading indicators, success states, haptic feedback, ripple effects
- **Usage**: Authentication flows, forms, general UI actions

#### AuthInputFieldComponent
- **Purpose**: Advanced input field with validation and accessibility
- **Features**: Real-time validation, password visibility toggle, custom styling
- **Usage**: Forms, authentication, user input

### Error Components (`components/error/`)

#### ErrorBoundaryComponent
- **Purpose**: Generic error boundary with recovery options
- **Features**: Retry/back/start-over actions, technical details, accessibility
- **Usage**: Error handling across all features

### UI Components (`components/ui/`)

#### StatusBadgeComponent
- **Purpose**: Consistent status display across the application
- **Features**: Multiple variants, themes, status types, accessibility
- **Usage**: User status, organization status, application status, verification status

## Services

### FormValidationService
- **Purpose**: Common form validation patterns and utilities
- **Features**: Field validation, error messages, password strength, form utilities
- **Usage**: All forms throughout the application

### StatusDisplayService
- **Purpose**: Centralized status configuration and display logic
- **Features**: Status configurations, CSS classes, priority sorting, health checks
- **Usage**: Status displays, sorting, filtering

## Usage

### Importing the Shared Module

```typescript
// In a feature module
import { SharedModule } from '../../shared';

@NgModule({
  imports: [
    CommonModule,
    SharedModule  // Provides all shared components and services
  ],
  // ...
})
export class FeatureModule { }
```

### Using Individual Components

```typescript
// Import specific components (recommended for standalone components)
import { 
  AuthButtonComponent, 
  ErrorBoundaryComponent, 
  StatusBadgeComponent 
} from '../../shared';

@Component({
  imports: [
    AuthButtonComponent,
    ErrorBoundaryComponent,
    StatusBadgeComponent
  ],
  // ...
})
export class MyComponent { }
```

### Using Services

```typescript
// Services are provided at root level
import { FormValidationService, StatusDisplayService } from '../../shared';

@Component({
  // ...
})
export class MyComponent {
  constructor(
    private formValidator: FormValidationService,
    private statusDisplay: StatusDisplayService
  ) {}
}
```

## Examples

### Status Badge Usage

```html
<!-- User status -->
<app-status-badge 
  [status]="user.status" 
  type="user" 
  size="medium"
  [showIcon]="true">
</app-status-badge>

<!-- Organization status with custom styling -->
<app-status-badge 
  [status]="org.status" 
  type="organization"
  variant="chip"
  theme="compact">
</app-status-badge>
```

### Error Boundary Usage

```html
<!-- Network error -->
<app-error-boundary
  [config]="ErrorBoundaryComponent.createNetworkError()"
  (retry)="onRetry()"
  (goBack)="onGoBack()">
</app-error-boundary>

<!-- Custom error -->
<app-error-boundary
  errorTitle="Custom Error"
  errorMessage="Something specific went wrong"
  [allowRetry]="true"
  [allowGoBack]="false"
  (retry)="handleRetry()">
</app-error-boundary>
```

### Form Validation Usage

```typescript
export class MyFormComponent {
  constructor(private formValidator: FormValidationService) {}

  isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return this.formValidator.isFieldInvalid(control);
  }

  getFieldError(fieldName: string): string {
    const control = this.form.get(fieldName);
    return this.formValidator.getErrorMessage(control, fieldName);
  }
}
```

## Best Practices

### Component Development
1. **Keep components generic**: Avoid feature-specific logic
2. **Use inputs for configuration**: Make components highly configurable
3. **Emit events for actions**: Let parent components handle business logic
4. **Include accessibility**: Always implement ARIA attributes and keyboard support
5. **Document thoroughly**: Include JSDoc comments for all public APIs

### Service Development
1. **Provide at root**: Use `providedIn: 'root'` for singleton services
2. **Pure functions**: Prefer stateless service methods
3. **Type safety**: Use TypeScript interfaces and types
4. **Error handling**: Implement proper error handling and logging

### Module Organization
1. **Barrel exports**: Always create index.ts files for clean imports
2. **Categorize by function**: Group related components together
3. **Standalone components**: Prefer standalone components over module declarations
4. **Documentation**: Document usage patterns and examples

## Testing

### Component Testing
- All shared components should have comprehensive unit tests
- Test accessibility features and keyboard navigation
- Test all input combinations and edge cases
- Mock external dependencies

### Service Testing
- Test all public methods with various inputs
- Test error conditions and edge cases
- Mock external dependencies and HTTP calls
- Verify service behavior in different states

## Contributing

When adding new shared components or services:

1. **Follow existing patterns**: Use the established directory structure
2. **Create barrel exports**: Add to appropriate index.ts files
3. **Update shared module**: Add to SHARED_COMPONENTS or SHARED_SERVICES arrays
4. **Document thoroughly**: Update this README and add inline documentation
5. **Write tests**: Include comprehensive test coverage
6. **Review dependencies**: Ensure no feature-specific dependencies

## Migration Notes

This shared module structure was created as part of Task 31.7 to reorganize the frontend directory structure following Angular best practices. Components were moved from feature-specific locations to this centralized shared structure for better reusability and maintainability.