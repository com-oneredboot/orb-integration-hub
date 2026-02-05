# HeroSplitComponent

Reusable component for displaying a split hero section with logo on the left and content on the right. Uses the exact dimensions from the platform page as the **gold standard** for all pages.

## Gold Standard Dimensions (Platform Page)

These dimensions are used consistently across ALL pages:

- **Container**: `max-width: 1400px`, centered with auto margins
- **Left (Logo)**: `flex: 1`, `max-width: 600px`
- **Right (Content)**: `flex: 1`, `max-width: 600px`
- **Gap**: `var(--spacing-24)` = `96px` between logo and content
- **Padding**: `var(--spacing-2xl)` = `48px` top and bottom
- **Title**: `var(--font-size-4xl)` = `36px`

## Usage

### Basic Usage

```html
<app-hero-split
  [logoSrc]="'assets/orb-logo.jpg'"
  [logoAlt]="'Orb Integration Hub Logo'"
  [title]="'Orb Integration Hub'"
  [subtitle]="'A comprehensive solution for payment processing...'">
</app-hero-split>
```

### With Custom Buttons

```html
<app-hero-split
  [logoSrc]="'assets/orb-logo.jpg'"
  [logoAlt]="'Orb Integration Hub Logo'"
  [title]="'Orb Integration Hub'"
  [subtitle]="'A comprehensive solution...'"
  [showButtons]="true">
  <!-- Custom button content via ng-content -->
  <div class="cta-buttons">
    <button class="primary-button" (click)="onAction()">
      <fa-icon [icon]="faRocket"></fa-icon>
      Get Started
    </button>
    <button class="secondary-button">
      <fa-icon [icon]="faBook"></fa-icon>
      Documentation
    </button>
  </div>
</app-hero-split>
```

## Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `logoSrc` | string | `'assets/orb-logo.jpg'` | Path to the logo image |
| `logoAlt` | string | `'Orb Integration Hub Logo'` | Alt text for the logo image |
| `title` | string | `'Orb Integration Hub'` | Main title text |
| `subtitle` | string | `''` | Subtitle/description text |
| `showButtons` | boolean | `false` | Whether to show the ng-content slot for custom buttons |

## Responsive Behavior

- **Desktop (> 1024px)**: Logo and content side-by-side
- **Tablet/Mobile (≤ 1024px)**: Stacks vertically, centered text
- **Mobile (≤ 768px)**: Buttons stack vertically, full width

## CSS Classes

All classes use the `orb-hero-split` prefix with BEM naming:

- `.orb-hero-split` - Main container
- `.orb-hero-split__container` - Inner container with max-width
- `.orb-hero-split__flex` - Flex container for logo and content
- `.orb-hero-split__logo` - Logo section
- `.orb-hero-split__content` - Content section
- `.orb-hero-split__title-container` - Title wrapper
- `.orb-hero-split__title` - Title text
- `.orb-hero-split__subtitle` - Subtitle text
- `.orb-hero-split__actions` - Actions/buttons slot

## Examples

### Platform Page

```typescript
// platform.component.html
<app-hero-split
  [logoSrc]="'assets/orb-logo.jpg'"
  [logoAlt]="'Orb Integration Hub Logo'"
  [title]="'Orb Integration Hub'"
  [subtitle]="'A comprehensive solution for payment processing, event management, and user authentication'"
  [showButtons]="true">
  <div class="cta-buttons">
    <button class="primary-button" (click)="navigateToSignup()">
      <fa-icon [icon]="faRocket"></fa-icon>
      Get Started
    </button>
    <button class="secondary-button">
      <fa-icon [icon]="faBook"></fa-icon>
      Documentation
    </button>
  </div>
</app-hero-split>
```

### Dashboard Page

```typescript
// dashboard.component.html
<app-hero-split
  [logoSrc]="'assets/orb-logo.jpg'"
  [logoAlt]="'Orb Integration Hub Logo'"
  [title]="'Integration Hub'"
  [subtitle]="'Your integration hub is ready for action'"
  [showButtons]="true">
  <div class="dashboard-header-content">
    <p class="dashboard-header-hint">Complete the actions below to get started.</p>
    <div class="dashboard-header-status">
      <span class="orb-header-badge orb-header-badge--active">
        <fa-icon icon="check-circle"></fa-icon>
        Active
      </span>
    </div>
  </div>
</app-hero-split>
```

### Auth Page Example

```typescript
// auth-page.component.html
<app-hero-split
  [logoSrc]="'assets/orb-logo.jpg'"
  [logoAlt]="'Orb Integration Hub'"
  [title]="'Welcome Back'"
  [subtitle]="'Sign in to access your account'">
</app-hero-split>
```

### Custom Logo Example

```typescript
// custom-page.component.html
<app-hero-split
  [logoSrc]="'assets/custom-logo.png'"
  [logoAlt]="'Custom Logo'"
  [title]="'Custom Title'"
  [subtitle]="'Custom description text'"
  [showButtons]="true">
  <button class="primary-button" (click)="onCustomAction()">
    Custom Action
  </button>
</app-hero-split>
```

## Notes

- The component uses global CSS custom properties from `styles/_tokens.scss`
- Button styles (`.primary-button`, `.secondary-button`, `.cta-buttons`) should be defined in the consuming component or globally
- The logo image should maintain its aspect ratio and will scale to fit the container
- All spacing and typography use design tokens for consistency
- **All pages use the same dimensions** - no size variants needed
