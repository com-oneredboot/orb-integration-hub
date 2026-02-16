# Design Handoff Guide

This document outlines the workflow for integrating Figma designs into the Orb Integration Hub Angular frontend.

## Figma Project

**Figma Project Link**: [Add Figma project URL here]

Contact the design team for access to the Figma project.

## Design Token Structure

Design tokens are CSS custom properties defined in `apps/web/src/styles/_tokens.scss`. These tokens are the single source of truth for visual styling.

### Token Categories

| Category | Prefix | Example |
|----------|--------|---------|
| Colors | `--color-` | `var(--color-primary)` |
| Typography | `--font-` | `var(--font-size-lg)` |
| Spacing | `--spacing-` | `var(--spacing-md)` |
| Border Radius | `--radius-` | `var(--radius-lg)` |
| Shadows | `--shadow-` | `var(--shadow-md)` |
| Transitions | `--transition-` | `var(--transition-normal)` |

### Color Tokens

```scss
// Primary brand colors
--color-primary: #3B82F6;
--color-secondary: #8B5CF6;
--color-accent: #10B981;

// Semantic colors
--color-success: #10B981;
--color-warning: #F59E0B;
--color-error: #EF4444;

// Text colors
--color-text-primary: #111827;
--color-text-secondary: #4B5563;
--color-text-inverse: #FFFFFF;

// Background colors
--color-background: #FFFFFF;
--color-background-secondary: #F9FAFB;
```

### Spacing Scale

```scss
--spacing-xs: 0.25rem;   // 4px
--spacing-sm: 0.5rem;    // 8px
--spacing-md: 1rem;      // 16px
--spacing-lg: 1.5rem;    // 24px
--spacing-xl: 2rem;      // 32px
--spacing-2xl: 3rem;     // 48px
```

## Component Naming Conventions

### Angular Component Structure

```
apps/web/src/app/
├── core/              # Singleton services, guards, interceptors
├── shared/            # Reusable components, directives, pipes
│   └── components/
│       └── ui/        # UI primitives (buttons, inputs, cards)
├── features/          # Feature modules
│   └── [feature]/
│       └── components/
└── layouts/           # Page layouts
```

### Naming Patterns

| Type | Pattern | Example |
|------|---------|---------|
| Component | `[name].component.ts` | `button.component.ts` |
| Styles | `[name].component.scss` | `button.component.scss` |
| Template | `[name].component.html` | `button.component.html` |
| Test | `[name].component.spec.ts` | `button.component.spec.ts` |

### CSS Class Naming (BEM-inspired)

```scss
// Block
.card { }

// Element
.card__header { }
.card__body { }
.card__footer { }

// Modifier
.card--featured { }
.card--compact { }
```

## Figma-to-Angular Workflow

### 1. Design Review

Before implementation:
- Review the Figma design for the component/feature
- Identify which design tokens apply
- Note any new tokens needed (coordinate with design team)
- Check responsive breakpoints

### 2. Token Mapping

Map Figma styles to design tokens:

| Figma Property | CSS Token |
|----------------|-----------|
| Fill color | `var(--color-*)` |
| Text style | `var(--font-size-*)`, `var(--font-weight-*)` |
| Spacing | `var(--spacing-*)` |
| Corner radius | `var(--radius-*)` |
| Effects/Shadow | `var(--shadow-*)` |

### 3. Component Implementation

```typescript
// example.component.ts
@Component({
  selector: 'app-example',
  templateUrl: './example.component.html',
  styleUrls: ['./example.component.scss']
})
export class ExampleComponent { }
```

```scss
// example.component.scss
.example {
  padding: var(--spacing-md);
  background: var(--color-background);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  
  &__title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }
}
```

### 4. Responsive Implementation

Use breakpoint tokens for responsive design:

```scss
// Breakpoints (use in media queries)
$breakpoint-sm: 640px;
$breakpoint-md: 768px;
$breakpoint-lg: 1024px;
$breakpoint-xl: 1280px;

.example {
  padding: var(--spacing-sm);
  
  @media (min-width: 768px) {
    padding: var(--spacing-md);
  }
  
  @media (min-width: 1024px) {
    padding: var(--spacing-lg);
  }
}
```

### 5. Accessibility Checklist

- [ ] Color contrast meets WCAG 2.1 AA (4.5:1 for text)
- [ ] Interactive elements have focus states
- [ ] ARIA labels for non-text content
- [ ] Keyboard navigation works
- [ ] Screen reader tested

## Adding New Design Tokens

When Figma introduces new styles:

1. **Coordinate with design team** - Ensure the token is intentional
2. **Add to `_tokens.scss`** - Follow existing naming conventions
3. **Document the token** - Update this guide if needed
4. **Update Figma** - Ensure Figma style names match token names

### Token Naming Rules

- Use lowercase with hyphens: `--color-primary-light`
- Be semantic, not descriptive: `--color-error` not `--color-red`
- Use consistent prefixes: `--color-`, `--spacing-`, etc.
- Include scale indicators: `-sm`, `-md`, `-lg`, `-xl`

## Brand Colors

The Orb Integration Hub brand uses these primary colors:

| Name | Hex | Usage |
|------|-----|-------|
| Orb Red | `#E31837` | Primary CTA, accents |
| Dark Blue | `#1E293B` | Headers, dark sections |
| White | `#FFFFFF` | Backgrounds, text on dark |
| Paper | `#F8FAFC` | Secondary backgrounds |

These are available as SCSS variables in `variables.scss` for brand-specific uses where CSS custom properties aren't appropriate.

## Resources

- [Design Tokens Spec](https://www.w3.org/community/design-tokens/)
- [Angular Style Guide](https://angular.io/guide/styleguide)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
