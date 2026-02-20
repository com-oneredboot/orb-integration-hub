# FontAwesome Icon Configuration

This document explains the centralized FontAwesome icon configuration for this Angular application.

## Overview

All FontAwesome icons are now configured globally in `/src/app/core/config/fontawesome-icons.ts` and registered in `main.ts`. This provides better performance and easier maintenance compared to component-level icon registration.

## Configuration

### Global Setup
Icons are configured in `main.ts` using the `configureFontAwesome()` function, which registers all icons with the global `FaIconLibrary`.

### Available Icons
The following icons are currently registered and available throughout the application:

#### Navigation & Actions
- `plus` - Add/create actions
- `plus-circle` - Alternative add icon
- `search` - Search functionality
- `sort-up` - Ascending sort indicator
- `sort-down` - Descending sort indicator
- `sort` - Default sort indicator
- `edit` - Edit actions
- `copy` - Copy actions
- `sync-alt` - Refresh/sync actions

#### User & Roles
- `crown` - Owner role indicator
- `user` - Single user representation
- `users` - Multiple users/team
- `shield-alt` - Administrator role
- `eye` - View/viewer role
- `user-edit` - User profile editing

#### Organization & Building
- `building` - Organization representation
- `sign-in-alt` - Enter/login actions

#### Application & Technology
- `rocket` - Applications/launch
- `server` - Environments/infrastructure
- `cube` - Applications (alternative)
- `cog` - Settings/configuration
- `code` - Development/code
- `key` - API keys/security
- `tools` - Administration tools

#### Charts & Analytics
- `chart-bar` - Analytics/statistics

#### Status & Feedback
- `check-circle` - Success states
- `exclamation-triangle` - Warning states
- `info-circle` - Information
- `spinner` - Loading states
- `question-circle` - Unknown/help

#### Navigation & Movement
- `chevron-left` - Previous/back
- `chevron-right` - Next/forward
- `arrow-right` - Directional actions

#### Time & History
- `clock` - Time/recent activity
- `history` - Historical data

#### Security & Privacy
- `bolt` - Performance/speed
- `heartbeat` - Health/monitoring
- `credit-card` - Billing/payments

## Usage in Components

### Template Usage
```html
<fa-icon icon="plus" class="my-icon"></fa-icon>
<fa-icon icon="search"></fa-icon>
<fa-icon icon="crown"></fa-icon>
```

### No Component-Level Registration Required
Components no longer need to:
- Import individual icon constants
- Inject `FaIconLibrary`
- Call `library.addIcons()`

Simply import `FontAwesomeModule` and use the icons in templates.

### Component Import Example
```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  template: `
    <button>
      <fa-icon icon="plus"></fa-icon>
      Add Item
    </button>
  `
})
export class MyComponent {}
```

## Adding New Icons

To add new icons to the application:

1. Import the icon in `fontawesome-icons.ts`:
   ```typescript
   import { faNewIcon } from '@fortawesome/free-solid-svg-icons';
   ```

2. Add it to the `library.addIcons()` call:
   ```typescript
   library.addIcons(
     // ... existing icons
     faNewIcon
   );
   ```

3. Add the icon name to the `registeredIcons` array:
   ```typescript
   export const registeredIcons = [
     // ... existing icons
     'new-icon'
   ] as const;
   ```

4. Use it in any component template:
   ```html
   <fa-icon icon="new-icon"></fa-icon>
   ```

## Benefits

- **Performance**: Icons are bundled once, not duplicated across components
- **Consistency**: All components use the same icon library
- **Maintainability**: Single source of truth for all icons
- **Type Safety**: TypeScript types for all registered icons
- **Developer Experience**: Clear documentation of available icons

## Migration Notes

Components that previously registered icons locally have been updated to remove:
- Individual icon imports
- `FaIconLibrary` injection
- `library.addIcons()` calls

All icon functionality remains the same for templates and styles.