# HeroSplitComponent Usage Guide

## Overview

The `HeroSplitComponent` provides a standardized hero section with logo on the left and content on the right. All pages use the same gold standard dimensions for consistency.

## Component Structure

```
┌─────────────────────────────────────────────────────┐
│  Logo (400×400)    │    Content (500px wide)        │
│  Right-aligned     │    Left-aligned                │
│  in 500px          │                                │
│  container         │    • Title (30px)              │
│                    │    • Subtitle (18px)           │
│                    │    • Custom Content (optional) │
│                    │    • Buttons (optional)        │
└─────────────────────────────────────────────────────┘
         50px gap between containers
```

## Gold Standard Dimensions

- **Container**: `max-width: 1400px`, centered
- **Logo container**: `500px` wide, image right-aligned
- **Logo image**: `400px × 400px` fixed size
- **Content container**: `500px` wide, text left-aligned
- **Gap**: `50px` between logo and content
- **Title**: `30px` (var(--font-size-3xl)) - optimized for single-line fit
- **Subtitle**: `18px` (var(--font-size-lg))
- **Padding**: `48px` top/bottom (var(--spacing-2xl))

## Basic Usage

### Simple Title + Subtitle

```html
<app-hero-split
  [logoSrc]="'assets/orb-logo.jpg'"
  [logoAlt]="'Orb Integration Hub Logo'"
  [title]="'Page Title'"
  [subtitle]="'Page description goes here'">
</app-hero-split>
```

### With Custom Content

Use the default (unnamed) content slot for badges, status indicators, or additional text:

```html
<app-hero-split
  [logoSrc]="'assets/orb-logo.jpg'"
  [logoAlt]="'Orb Integration Hub Logo'"
  [title]="'Organizations Management'"
  [subtitle]="'Manage your organizations and their settings.'">
  
  <!-- Custom content slot -->
  <div class="custom-content">
    <p class="hint-text">
      Create organizations to collaborate with team members.
    </p>
    <app-status-badge [status]="status"></app-status-badge>
  </div>
</app-hero-split>
```

### With Call-to-Action Buttons

Use the `buttons` attribute on a container to place content in the buttons slot:

```html
<app-hero-split
  [logoSrc]="'assets/orb-logo.jpg'"
  [logoAlt]="'Orb Integration Hub Logo'"
  [title]="'Orb Integration Hub'"
  [subtitle]="'A comprehensive solution for payment processing'">
  
  <!-- Buttons slot -->
  <div buttons class="cta-buttons">
    <button class="orb-btn orb-btn--primary" (click)="onGetStarted()">
      <fa-icon icon="rocket"></fa-icon>
      Get Started
    </button>
    <button class="orb-btn orb-btn--secondary" (click)="onLearnMore()">
      <fa-icon icon="book"></fa-icon>
      Learn More
    </button>
  </div>
</app-hero-split>
```

### With Both Custom Content and Buttons

```html
<app-hero-split
  [logoSrc]="'assets/orb-logo.jpg'"
  [logoAlt]="'Orb Integration Hub Logo'"
  [title]="'Dashboard'"
  [subtitle]="'Your integration hub is ready for action'">
  
  <!-- Custom content (appears between subtitle and buttons) -->
  <div class="dashboard-status">
    <p class="hint-text">Complete the actions below to get started.</p>
    <span class="orb-header-badge orb-header-badge--active">
      <fa-icon icon="check-circle"></fa-icon>
      Account Active
    </span>
  </div>
  
  <!-- Buttons (appears at bottom) -->
  <div buttons class="action-buttons">
    <button class="orb-btn orb-btn--primary" (click)="onCreate()">
      Create Resource
    </button>
  </div>
</app-hero-split>
```

## Content Slots

The component supports two content projection slots:

### 1. Default Slot (Unnamed)

**Purpose**: Custom content like badges, status indicators, hints, or additional text

**Location**: Between subtitle and buttons

**Usage**: Just place content inside `<app-hero-split>` tags

```html
<app-hero-split [title]="'Title'" [subtitle]="'Subtitle'">
  <!-- This goes in the default slot -->
  <div class="my-custom-content">
    <app-status-badge [status]="status"></app-status-badge>
  </div>
</app-hero-split>
```

### 2. Buttons Slot

**Purpose**: Call-to-action buttons or action controls

**Location**: Bottom of content area

**Usage**: Add `buttons` attribute to the container element

```html
<app-hero-split [title]="'Title'" [subtitle]="'Subtitle'">
  <!-- This goes in the buttons slot -->
  <div buttons class="my-buttons">
    <button class="orb-btn orb-btn--primary">Action</button>
  </div>
</app-hero-split>
```

## Component Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `logoSrc` | string | `'assets/orb-logo.jpg'` | Path to logo image |
| `logoAlt` | string | `'Orb Integration Hub Logo'` | Alt text for logo |
| `title` | string | `'Orb Integration Hub'` | Main title text |
| `subtitle` | string | `''` | Subtitle/description text |

## Responsive Behavior

### Desktop (> 1024px)
- Logo and content side-by-side
- Logo right-aligned in its container
- Content left-aligned in its container
- 50px gap between containers

### Tablet/Mobile (≤ 1024px)
- Stacks vertically (logo on top, content below)
- Both sections centered
- Text centered

### Mobile (≤ 768px)
- Buttons stack vertically
- Full width buttons

## CSS Classes

### Component Classes

| Class | Purpose |
|-------|---------|
| `.orb-hero-split` | Main container |
| `.orb-hero-split__container` | Inner container with max-width |
| `.orb-hero-split__flex` | Flex container for logo and content |
| `.orb-hero-split__logo` | Logo section (500px container) |
| `.orb-hero-split__content` | Content section (500px container) |
| `.orb-hero-split__title` | Title text (30px) |
| `.orb-hero-split__subtitle` | Subtitle text (18px) |
| `.orb-hero-split__custom-content` | Custom content slot wrapper |
| `.orb-hero-split__actions` | Buttons slot wrapper |

### Styling Custom Content

You can add your own classes to content inside the slots:

```html
<app-hero-split [title]="'Title'" [subtitle]="'Subtitle'">
  <div class="my-custom-styles">
    <!-- Your custom content with your own CSS -->
  </div>
  
  <div buttons class="my-button-styles">
    <!-- Your buttons with your own CSS -->
  </div>
</app-hero-split>
```

## Real-World Examples

### Platform/Landing Page

```html
<app-hero-split
  [logoSrc]="'assets/orb-logo.jpg'"
  [logoAlt]="'Orb Integration Hub Logo'"
  [title]="'Orb Integration Hub'"
  [subtitle]="'A comprehensive solution for payment processing, event management, and user authentication'">
  
  <div buttons class="cta-buttons">
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

### List Page (Organizations)

```html
<app-hero-split
  [logoSrc]="'assets/orb-logo.jpg'"
  [logoAlt]="'Orb Integration Hub Logo'"
  [title]="'Organizations Management'"
  [subtitle]="'Organizations let you manage teams, control access with roles, and organize your applications in one place.'">
  
  <div class="organizations-header-content">
    <p class="organizations-header-hint">
      Create organizations to collaborate with team members. Assign Owner, Administrator, or Viewer roles to control what each member can do.
    </p>
    <div class="organizations-header-status">
      <span class="orb-header-badge orb-header-badge--active">
        <fa-icon icon="building" class="orb-header-badge__icon"></fa-icon>
        Organizations Active
      </span>
    </div>
  </div>
</app-hero-split>
```

### Detail Page (Application)

```html
<app-hero-split
  [logoSrc]="'assets/orb-logo.jpg'"
  [logoAlt]="'Orb Integration Hub Logo'"
  [title]="application?.name || 'Application Details'"
  [subtitle]="'Manage your application settings, groups, and API keys.'">
  
  <div class="app-detail-header-content" *ngIf="application">
    <app-status-badge
      [status]="application.status"
      type="application"
      [showIcon]="true"
      [showLabel]="true"
      size="medium"
      variant="chip">
    </app-status-badge>
  </div>
</app-hero-split>
```

### Dashboard

```html
<app-hero-split
  [logoSrc]="'assets/orb-logo.jpg'"
  [logoAlt]="'Orb Integration Hub Logo'"
  [title]="'Integration Hub'"
  [subtitle]="user.status === 'ACTIVE' 
    ? 'Your integration hub is ready for action' 
    : 'Complete your profile setup to activate your account'">
  
  <div class="dashboard-header-content">
    <p class="dashboard-header-hint">
      Complete the actions below to get started. Use the quick access menu on the left for common tasks.
    </p>
    <div class="dashboard-header-status">
      <span class="orb-header-badge" 
            [ngClass]="'orb-header-badge--' + getStatusClass(user.status)">
        <fa-icon [icon]="getStatusIcon(user.status)" class="orb-header-badge__icon"></fa-icon>
        {{ getStatusLabel(user.status) }}
      </span>
    </div>
  </div>
</app-hero-split>
```

## Best Practices

### Title Length
- Keep titles concise (1-4 words)
- Title font is 30px to ensure single-line fit
- Avoid titles longer than ~40 characters

### Subtitle Length
- 1-2 sentences maximum
- Aim for 100-150 characters
- Provides context without overwhelming

### Custom Content
- Use for status badges, hints, or additional context
- Keep it minimal - 1-3 elements max
- Don't duplicate information from title/subtitle

### Buttons
- 1-2 primary actions maximum
- Use clear, action-oriented labels
- Follow button hierarchy (primary + secondary)

### Consistency
- All pages use the same logo and alt text
- All pages use the same dimensions
- Don't create custom variants or sizes

## Migration from Old Pattern

### Before (with showButtons)

```html
<app-hero-split
  [title]="'Title'"
  [subtitle]="'Subtitle'"
  [showButtons]="true">
  <div class="content">...</div>
</app-hero-split>
```

### After (with named slots)

```html
<app-hero-split
  [title]="'Title'"
  [subtitle]="'Subtitle'">
  <!-- Custom content (default slot) -->
  <div class="content">...</div>
  
  <!-- Buttons (named slot) -->
  <div buttons class="buttons">...</div>
</app-hero-split>
```

## Accessibility

The component includes:
- Semantic `<h1>` for title
- Proper heading hierarchy
- Alt text for logo image
- Responsive design for all screen sizes
- Keyboard navigation support (via button elements)

## Testing

When testing components that use HeroSplitComponent:

```typescript
import { HeroSplitComponent } from '../../../shared/components/hero-split/hero-split.component';

@Component({
  imports: [HeroSplitComponent],
  // ...
})
```

Mock the component in tests:

```typescript
TestBed.configureTestingModule({
  imports: [YourComponent, HeroSplitComponent]
});
```

## Related Documentation

- [MIGRATION-COMPLETE.md](./MIGRATION-COMPLETE.md) - Migration history
- [DIMENSIONS.md](./DIMENSIONS.md) - Detailed dimension specifications
- [EXAMPLES.md](./EXAMPLES.md) - More usage examples
