# HeroSplitComponent - Usage Examples

This document shows how to use the HeroSplitComponent on different types of pages.

## Example 1: Platform Page (Original Implementation)

**File**: `apps/web/src/app/features/platform/platform.component.html`

```html
<div class="home-container">
  <!-- Hero Section using HeroSplitComponent -->
  <app-hero-split
    [logoSrc]="'assets/orb-logo.jpg'"
    [logoAlt]="'Orb Integration Hub Logo'"
    [title]="'Orb Integration Hub'"
    [subtitle]="'A comprehensive solution for payment processing, event management, and user authentication'"
    [showButtons]="true">
    <!-- Custom button content -->
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

  <!-- Rest of page content -->
  <section class="features-section">
    <!-- Features content -->
  </section>
</div>
```

**Component TypeScript**:

```typescript
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { CommonModule } from '@angular/common';
import { HeroSplitComponent } from '../../shared/components';
import { faRocket, faBook } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-platform',
  templateUrl: './platform.component.html',
  styleUrls: ['./platform.component.scss'],
  standalone: true,
  imports: [FontAwesomeModule, CommonModule, HeroSplitComponent]
})
export class PlatformComponent {
  protected faRocket = faRocket;
  protected faBook = faBook;

  constructor(private router: Router) {}

  navigateToSignup() {
    this.router.navigate(['/authenticate']);
  }
}
```

**Component SCSS** (button styles):

```scss
// Button styles for hero section (used within HeroSplitComponent)
.cta-buttons {
  display: flex;
  gap: var(--spacing-lg);
  justify-content: center;

  @media (max-width: 768px) {
    flex-direction: column;
    width: 100%;
    
    button {
      width: 100%;
      justify-content: center;
    }
  }
}

.primary-button {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-base);
  transition: all var(--transition-fast);
  border: none;
  cursor: pointer;
  background-color: v.$orb-red;
  color: var(--color-text-inverse);
  box-shadow: 0 2px 4px rgba(227, 24, 55, 0.2);

  &:hover {
    background-color: color.adjust(v.$orb-red, $lightness: -5%);
    box-shadow: 0 4px 6px rgba(227, 24, 55, 0.3);
    transform: translateY(-1px);
  }
}

.secondary-button {
  // Same as primary-button
}
```

## Example 2: Simple Marketing Page (No Buttons)

**Use Case**: A simple informational page with logo and text, no interactive elements.

```html
<app-hero-split
  [logoSrc]="'assets/orb-logo.jpg'"
  [logoAlt]="'Orb Integration Hub'"
  [title]="'About Orb Integration Hub'"
  [subtitle]="'Learn more about our mission to simplify payment processing and event management for businesses of all sizes.'">
</app-hero-split>

<!-- Rest of page content -->
<section class="content-section">
  <p>More detailed content here...</p>
</section>
```

## Example 3: Feature Introduction Page

**Use Case**: Introducing a specific feature with custom logo and single CTA.

```html
<app-hero-split
  [logoSrc]="'assets/features/payment-processing.svg'"
  [logoAlt]="'Payment Processing Feature'"
  [title]="'Payment Processing Made Easy'"
  [subtitle]="'Accept payments from multiple providers with a single integration. Support for Stripe, PayPal, Apple Pay, and more.'"
  [showButtons]="true">
  <button class="primary-button" (click)="learnMore()">
    <fa-icon [icon]="faArrowRight"></fa-icon>
    Learn More
  </button>
</app-hero-split>
```

## Example 4: Authentication/Welcome Page

**Use Case**: Welcome page for authentication flow.

```html
<app-hero-split
  [logoSrc]="'assets/orb-logo.jpg'"
  [logoAlt]="'Orb Integration Hub'"
  [title]="'Welcome Back'"
  [subtitle]="'Sign in to access your account and manage your integrations.'">
</app-hero-split>

<!-- Auth form below -->
<div class="auth-form-container">
  <app-auth-form></app-auth-form>
</div>
```

## Example 5: Product Launch Page

**Use Case**: Announcing a new product or feature with multiple CTAs.

```html
<app-hero-split
  [logoSrc]="'assets/products/new-product.png'"
  [logoAlt]="'New Product Launch'"
  [title]="'Introducing Orb Analytics'"
  [subtitle]="'Gain deep insights into your payment data with our new analytics dashboard. Track revenue, monitor trends, and make data-driven decisions.'"
  [showButtons]="true">
  <div class="cta-buttons">
    <button class="primary-button" (click)="startTrial()">
      <fa-icon [icon]="faRocket"></fa-icon>
      Start Free Trial
    </button>
    <button class="secondary-button" (click)="watchDemo()">
      <fa-icon [icon]="faPlay"></fa-icon>
      Watch Demo
    </button>
    <button class="secondary-button" (click)="viewPricing()">
      <fa-icon [icon]="faDollarSign"></fa-icon>
      View Pricing
    </button>
  </div>
</app-hero-split>
```

## Example 6: Documentation Landing Page

**Use Case**: Documentation homepage with search and quick links.

```html
<app-hero-split
  [logoSrc]="'assets/orb-logo.jpg'"
  [logoAlt]="'Orb Integration Hub Documentation'"
  [title]="'Documentation'"
  [subtitle]="'Everything you need to integrate Orb into your application. Guides, API references, and code examples.'"
  [showButtons]="true">
  <!-- Custom search form -->
  <div class="doc-search">
    <input 
      type="text" 
      placeholder="Search documentation..." 
      class="search-input"
      [(ngModel)]="searchQuery"
      (keyup.enter)="search()">
    <button class="search-button" (click)="search()">
      <fa-icon [icon]="faSearch"></fa-icon>
    </button>
  </div>
  
  <!-- Quick links -->
  <div class="quick-links">
    <a routerLink="/docs/getting-started" class="quick-link">
      <fa-icon [icon]="faRocket"></fa-icon>
      Getting Started
    </a>
    <a routerLink="/docs/api-reference" class="quick-link">
      <fa-icon [icon]="faCode"></fa-icon>
      API Reference
    </a>
    <a routerLink="/docs/examples" class="quick-link">
      <fa-icon [icon]="faBook"></fa-icon>
      Examples
    </a>
  </div>
</app-hero-split>
```

## Example 7: Error Page (404, 500, etc.)

**Use Case**: Friendly error page with navigation options.

```html
<app-hero-split
  [logoSrc]="'assets/orb-logo.jpg'"
  [logoAlt]="'Orb Integration Hub'"
  [title]="'Page Not Found'"
  [subtitle]="'The page you are looking for does not exist or has been moved. Let us help you find what you need.'"
  [showButtons]="true">
  <div class="cta-buttons">
    <button class="primary-button" (click)="goHome()">
      <fa-icon [icon]="faHome"></fa-icon>
      Go Home
    </button>
    <button class="secondary-button" (click)="goBack()">
      <fa-icon [icon]="faArrowLeft"></fa-icon>
      Go Back
    </button>
  </div>
</app-hero-split>
```

## Example 8: Pricing Page

**Use Case**: Pricing page with CTA to view plans.

```html
<app-hero-split
  [logoSrc]="'assets/orb-logo.jpg'"
  [logoAlt]="'Orb Integration Hub Pricing'"
  [title]="'Simple, Transparent Pricing'"
  [subtitle]="'Choose the plan that fits your business. All plans include our core features with no hidden fees.'"
  [showButtons]="true">
  <button class="primary-button" (click)="scrollToPlans()">
    <fa-icon [icon]="faDollarSign"></fa-icon>
    View Plans
  </button>
</app-hero-split>

<!-- Pricing cards below -->
<section class="pricing-section">
  <!-- Pricing content -->
</section>
```

## Tips for Using HeroSplitComponent

### 1. Logo Guidelines
- Use high-resolution images (at least 1200px wide)
- Maintain aspect ratio (logo will scale to fit)
- Use transparent PNGs or SVGs for best results
- Ensure logo works on white background

### 2. Title Guidelines
- Keep titles concise (3-7 words ideal)
- Use sentence case or title case consistently
- Make it descriptive and action-oriented

### 3. Subtitle Guidelines
- Aim for 15-25 words
- Explain the value proposition clearly
- Use active voice
- End with a period

### 4. Button Guidelines
- Use 1-3 buttons maximum
- Primary action should be most prominent
- Use icons to enhance meaning
- Keep button text short (1-3 words)

### 5. Responsive Considerations
- Component automatically stacks on mobile
- Test button layout on small screens
- Ensure text is readable at all sizes
- Consider touch target sizes for mobile

### 6. Accessibility
- Always provide meaningful alt text for logos
- Ensure sufficient color contrast
- Make buttons keyboard accessible
- Use semantic HTML in custom content

## Common Patterns

### Pattern: Two-Button CTA
```html
<div class="cta-buttons">
  <button class="primary-button" (click)="primaryAction()">
    <fa-icon [icon]="primaryIcon"></fa-icon>
    {{ primaryLabel }}
  </button>
  <button class="secondary-button" (click)="secondaryAction()">
    <fa-icon [icon]="secondaryIcon"></fa-icon>
    {{ secondaryLabel }}
  </button>
</div>
```

### Pattern: Form Input
```html
<div class="hero-form">
  <input 
    type="email" 
    placeholder="Enter your email"
    [(ngModel)]="email"
    class="hero-input">
  <button class="primary-button" (click)="submit()">
    Get Started
  </button>
</div>
```

### Pattern: Link List
```html
<div class="hero-links">
  <a *ngFor="let link of links" 
     [routerLink]="link.route" 
     class="hero-link">
    <fa-icon [icon]="link.icon"></fa-icon>
    {{ link.label }}
  </a>
</div>
```
