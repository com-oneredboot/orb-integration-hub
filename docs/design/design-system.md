# Orb Integration Hub Design System

This document provides a comprehensive reference for the design system used in the Orb Integration Hub frontend application. All components should use these standardized variables, mixins, and CSS custom properties to ensure visual consistency.

## Quick Reference

| Category | File | Import |
|----------|------|--------|
| SCSS Variables | `styles/variables.scss` | `@use '../../../../styles/variables' as v;` |
| CSS Tokens | `styles/_tokens.scss` | Loaded globally via `styles.scss` |
| Mixins | `styles/mixins.scss` | `@use '../../../../styles/mixins' as m;` |
| Components | `styles/components.scss` | Global classes available everywhere |

## Brand Colors

The primary brand color is **Orb Red** (`#E31837`). All interactive elements should use this color.

### Primary Colors

| Variable | Value | Usage |
|----------|-------|-------|
| `v.$orb-red` | `#E31837` | Primary brand color, buttons, links, focus states |
| `v.$primary-color` | `#E31837` | Alias for `$orb-red` |
| `v.$orb-black` | `#000000` | Primary text |
| `v.$orb-white` | `#FFFFFF` | Backgrounds, button text |
| `v.$orb-gray` | `#666666` | Secondary text |
| `v.$orb-light-gray` | `#e5e5e5` | Borders, dividers |
| `v.$orb-dark-gray` | `#3A3A3A` | Dark backgrounds |
| `v.$orb-dark-blue` | `#1E293B` | Headers, titles |
| `v.$orb-slate` | `#334155` | Secondary headers |
| `v.$orb-paper` | `#F8FAFC` | Page backgrounds |

### Semantic Colors

| Variable | Value | Usage |
|----------|-------|-------|
| `v.$success-color` | `#2B8A3E` | Success states, verified badges |
| `v.$warning-color` | `#f59e0b` | Warning states, pending badges |
| `v.$danger-color` | `#E31837` | Error states, danger badges |

### Role Colors

Use these for user role badges (NOT for status indicators):

| Variable | Value | Usage |
|----------|-------|-------|
| `v.$role-owner` | `#3b82f6` | Owner role badge |
| `v.$role-admin` | `#8b5cf6` | Administrator role badge |
| `v.$role-developer` | `#0d9488` | Developer role badge |
| `v.$role-viewer` | `#6b7280` | Viewer role badge |

### Gray Scale

| Variable | Value |
|----------|-------|
| `v.$gray-50` | `#f9fafb` |
| `v.$gray-100` | `#f3f4f6` |
| `v.$gray-200` | `#e5e7eb` |
| `v.$gray-300` | `#d1d5db` |
| `v.$gray-400` | `#9ca3af` |
| `v.$gray-500` | `#6b7280` |
| `v.$gray-600` | `#4b5563` |
| `v.$gray-700` | `#374151` |
| `v.$gray-800` | `#1f2937` |
| `v.$gray-900` | `#111827` |

## CSS Custom Properties (Tokens)

CSS custom properties are defined in `_tokens.scss` and available globally via `var(--property-name)`.

### Orb Brand Tokens

```css
var(--orb-primary)        /* #E31837 */
var(--orb-primary-dark)   /* #c91518 */
var(--orb-primary-light)  /* #f04d5f */
var(--orb-black)          /* #000000 */
var(--orb-white)          /* #FFFFFF */
var(--orb-gray)           /* #666666 */
var(--orb-light-gray)     /* #e5e5e5 */
var(--orb-success)        /* #2B8A3E */
var(--orb-warning)        /* #f59e0b */
var(--orb-error)          /* #E31837 */
```

### Spacing Tokens

```css
var(--spacing-xs)   /* 0.25rem (4px) */
var(--spacing-sm)   /* 0.5rem (8px) */
var(--spacing-md)   /* 1rem (16px) */
var(--spacing-lg)   /* 1.5rem (24px) */
var(--spacing-xl)   /* 2rem (32px) */
var(--spacing-2xl)  /* 3rem (48px) */
```

### Typography Tokens

```css
var(--font-family-primary)  /* Roboto, system fonts */
var(--font-family-heading)  /* Archivo Black, Roboto */
var(--font-family-mono)     /* Fira Code, Consolas */

var(--font-size-xs)   /* 0.75rem (12px) */
var(--font-size-sm)   /* 0.875rem (14px) */
var(--font-size-base) /* 1rem (16px) */
var(--font-size-lg)   /* 1.125rem (18px) */
var(--font-size-xl)   /* 1.25rem (20px) */
var(--font-size-2xl)  /* 1.5rem (24px) */

var(--font-weight-normal)   /* 400 */
var(--font-weight-medium)   /* 500 */
var(--font-weight-semibold) /* 600 */
var(--font-weight-bold)     /* 700 */
```

### Border Radius Tokens

```css
var(--radius-sm)   /* 0.125rem (2px) */
var(--radius-md)   /* 0.375rem (6px) */
var(--radius-lg)   /* 0.5rem (8px) */
var(--radius-xl)   /* 0.75rem (12px) */
var(--radius-full) /* 9999px */
```

### Shadow Tokens

```css
var(--shadow-sm)  /* Subtle shadow */
var(--shadow-md)  /* Medium shadow */
var(--shadow-lg)  /* Large shadow */
var(--shadow-xl)  /* Extra large shadow */
```

## SCSS Variables

Import variables in your component SCSS:

```scss
@use '../../../../styles/variables' as v;

.my-component {
  color: v.$orb-red;
  padding: v.$spacing-md;
  font-size: v.$font-size-base;
}
```

### Spacing Variables

| Variable | Value |
|----------|-------|
| `v.$spacing-xs` | `0.25rem` (4px) |
| `v.$spacing-sm` | `0.5rem` (8px) |
| `v.$spacing-md` | `1rem` (16px) |
| `v.$spacing-lg` | `1.5rem` (24px) |
| `v.$spacing-xl` | `2rem` (32px) |

### Typography Variables

| Variable | Value |
|----------|-------|
| `v.$font-family-base` | System font stack |
| `v.$font-family-heading` | Same as base |
| `v.$font-family-monospace` | Monospace font stack |
| `v.$font-size-xs` | `0.75rem` (12px) |
| `v.$font-size-sm` | `0.875rem` (14px) |
| `v.$font-size-base` | `1rem` (16px) |
| `v.$font-size-lg` | `1.25rem` (20px) |
| `v.$font-size-xl` | `1.5rem` (24px) |
| `v.$font-weight-normal` | `400` |
| `v.$font-weight-medium` | `500` |
| `v.$font-weight-semibold` | `600` |
| `v.$font-weight-bold` | `700` |

### Border Variables

| Variable | Value |
|----------|-------|
| `v.$border-color` | `#e5e7eb` |
| `v.$border-radius-sm` | `0.125rem` (2px) |
| `v.$border-radius` | `0.25rem` (4px) |
| `v.$border-radius-md` | `0.375rem` (6px) |
| `v.$border-radius-lg` | `0.5rem` (8px) |
| `v.$border-radius-xl` | `0.75rem` (12px) |

### Shadow Variables

| Variable | Description |
|----------|-------------|
| `v.$shadow-sm` | Subtle shadow for cards |
| `v.$shadow-md` | Medium shadow for elevated elements |
| `v.$shadow-lg` | Large shadow for modals/dropdowns |

### Layout Variables

| Variable | Value | Usage |
|----------|-------|-------|
| `v.$page-max-width` | `1400px` | Maximum content width |

## Mixins

Import mixins in your component SCSS:

```scss
@use '../../../../styles/mixins' as m;

.my-component {
  @include m.card;
}
```

### Layout Mixins

| Mixin | Description |
|-------|-------------|
| `m.page-container` | Standard page layout with max-width and padding |
| `m.auth-container` | Centered auth flow layout |
| `m.form-container` | Form wrapper with card styling |
| `m.flex-center` | Flexbox centering |

### Card Mixins

| Mixin | Description |
|-------|-------------|
| `m.card` | Base card with shadow and hover effect |
| `m.card-header` | Card header with border and background |
| `m.card-title` | Card title styling |
| `m.card-icon` | Card icon in primary color |
| `m.card-content` | Card content padding |

### Button Mixins

| Mixin | Description |
|-------|-------------|
| `m.button-primary` | Primary button with Orb Red background |

### Header Mixins

| Mixin | Description |
|-------|-------------|
| `m.professional-header` | Gradient header for dashboard/profile |
| `m.header-content` | Header content container |
| `m.header-flex` | Responsive header flex layout |
| `m.page-title` | Large page title |
| `m.page-subtitle` | Page subtitle text |

### Status Badge Mixins

| Mixin | Description |
|-------|-------------|
| `m.status-badge` | Base badge styling |
| `m.status-badge-success` | Green success badge |
| `m.status-badge-warning` | Yellow warning badge |
| `m.status-badge-danger` | Red danger badge |

### Debug Mixins

| Mixin | Description |
|-------|-------------|
| `m.debug-container` | Debug panel container styling |
| `m.debug-section` | Debug section spacing |
| `m.debug-button` | Debug action button |

## Global Component Classes

These classes are available globally from `components.scss`.

### Card Components

```html
<div class="orb-card">
  <div class="orb-card__header">
    <h2 class="orb-card__title">
      <fa-icon class="orb-card__icon" icon="users"></fa-icon>
      Title
    </h2>
  </div>
  <div class="orb-card__content">
    Content here
  </div>
</div>
```

### Status Badges

```html
<span class="status-badge status-badge--success">Active</span>
<span class="status-badge status-badge--warning">Pending</span>
<span class="status-badge status-badge--danger">Suspended</span>
```

### Role Badges

```html
<span class="orb-role-badge orb-role-badge--owner">Owner</span>
<span class="orb-role-badge orb-role-badge--administrator">Admin</span>
<span class="orb-role-badge orb-role-badge--developer">Developer</span>
<span class="orb-role-badge orb-role-badge--viewer">Viewer</span>
```

### Page Header

```html
<div class="orb-page-header">
  <div class="orb-page-header__content">
    <div class="orb-page-header__flex-container">
      <div class="orb-page-header__logo-section">
        <img src="assets/orb-logo.jpg" class="orb-page-header__logo">
      </div>
      <div class="orb-page-header__text-section">
        <div class="orb-page-header__greeting">
          <h1 class="orb-page-header__title">Page Title</h1>
          <p class="orb-page-header__subtitle">Subtitle text</p>
        </div>
      </div>
    </div>
  </div>
</div>
```

### Empty State

```html
<div class="orb-empty-state">
  <div class="orb-empty-state__content">
    <fa-icon class="orb-empty-state__icon" icon="inbox"></fa-icon>
    <h3 class="orb-empty-state__title">No Items Found</h3>
    <p class="orb-empty-state__text">Description text here</p>
  </div>
</div>
```

## Shared Components

### DebugPanelComponent

Use the shared debug panel for consistent debugging across all pages:

```typescript
import { DebugPanelComponent, DebugContext } from '../../shared/components/debug/debug-panel.component';
import { DebugLogService } from '../../core/services/debug-log.service';

@Component({
  imports: [DebugPanelComponent],
})
export class MyComponent {
  debugLogs$ = inject(DebugLogService).logs$;
  debugMode$ = this.store.select(fromUser.selectDebugMode);

  get debugContext(): DebugContext {
    return {
      page: 'MyPage',
      formState: { /* form values */ },
      storeState: { /* store state */ },
      additionalSections: [
        { title: 'Custom Data', data: { /* ... */ } }
      ]
    };
  }
}
```

```html
<app-debug-panel
  [visible]="(debugMode$ | async) || false"
  [title]="'My Page Debug'"
  [logs$]="debugLogs$"
  [context]="debugContext">
</app-debug-panel>
```

### ProgressStepsComponent

Use for multi-step flows:

```typescript
import { ProgressStepsComponent, ProgressStep } from '../../shared/components/progress-steps/progress-steps.component';

@Component({
  imports: [ProgressStepsComponent],
})
export class MyFlowComponent {
  steps: ProgressStep[] = [
    { number: 1, label: 'Step One' },
    { number: 2, label: 'Step Two' },
    { number: 3, label: 'Complete' }
  ];
  currentStep = 1;
}
```

```html
<app-progress-steps [steps]="steps" [currentStep]="currentStep"></app-progress-steps>
```

## Best Practices

### DO

- ✅ Use SCSS variables for all colors: `v.$orb-red`, `v.$success-color`
- ✅ Use spacing variables: `v.$spacing-md`, `v.$spacing-lg`
- ✅ Use mixins for common patterns: `@include m.card;`
- ✅ Use global component classes: `.orb-card`, `.status-badge`
- ✅ Use the shared `DebugPanelComponent` for debug sections
- ✅ Follow BEM naming for component-specific styles

### DON'T

- ❌ Hardcode hex colors: `color: #3b82f6;` (use variables instead)
- ❌ Hardcode spacing values: `padding: 16px;` (use `v.$spacing-md`)
- ❌ Create custom debug sections (use shared component)
- ❌ Duplicate CSS custom properties in component `:host` blocks
- ❌ Use blue colors for interactive elements (use Orb Red)

## Migration Guide

### Replacing Hardcoded Colors

```scss
// Before
.my-button {
  background: #3b82f6;  // ❌ Hardcoded blue
  color: #ffffff;
}

// After
@use '../../../../styles/variables' as v;

.my-button {
  background: v.$orb-red;  // ✅ Design system variable
  color: v.$orb-white;
}
```

### Using Mixins Instead of Custom Styles

```scss
// Before
.my-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  // ... many more lines
}

// After
@use '../../../../styles/mixins' as m;

.my-card {
  @include m.card;  // ✅ Reusable mixin
}
```

### Migrating Debug Sections

Replace custom debug HTML with the shared component:

```html
<!-- Before -->
<div class="my-page__debug" *ngIf="debugMode$ | async">
  <h3>Debug Information</h3>
  <!-- Custom debug content -->
</div>

<!-- After -->
<app-debug-panel
  [visible]="(debugMode$ | async) || false"
  [title]="'My Page Debug'"
  [logs$]="debugLogs$"
  [context]="debugContext">
</app-debug-panel>
```
