---
inclusion: always
---

# Figma Design System Integration Rules

This document defines how to integrate Figma designs into the orb-integration-hub Angular codebase using the Figma MCP server.

## Design System Structure

### 1. Token Definitions

**Location:** `apps/web/src/styles/_tokens.scss`

Design tokens are defined as CSS custom properties (variables) in `:root`:

```scss
:root {
  /* Orb Brand Colors */
  --orb-primary: #E31837;
  --orb-white: #FFFFFF;
  --orb-black: #000000;
  --orb-gray: #666666;
  
  /* Typography */
  --font-size-base: 1rem;
  --font-weight-medium: 500;
  
  /* Spacing */
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  
  /* Border Radius */
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
}
```

**Token Categories:**
- Colors: Orb brand colors (red primary), neutrals, semantic colors
- Typography: Font families, sizes, weights, line heights
- Spacing: 8px base scale (4px to 96px)
- Border Radius: sm to full
- Shadows: sm, md, lg, xl
- Transitions: fast (150ms), normal (250ms), slow (350ms)
- Z-index: Layering system for modals, dropdowns, tooltips

**SCSS Variables:** `apps/web/src/styles/variables.scss` provides SCSS variables that mirror the CSS custom properties for use in SCSS files.

### 2. Component Library

**Location:** `apps/web/src/app/shared/components/`

**Component Architecture:** Standalone Angular components (Angular 19+)

**Key Shared Components:**
- `DataGridComponent` - Tabular data display (REQUIRED for all list pages)
- `StatusBadgeComponent` - Status indicators with icons
- `HeroSplitComponent` - Split hero layout (logo + content)
- `ProgressStepsComponent` - Multi-step flow indicators
- `DebugPanelComponent` - Development debugging
- `UserPageComponent` - Page wrapper for consistent layout

**Component Pattern:**
```typescript
@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [CommonModule, /* other imports */],
  templateUrl: './my-component.component.html',
  styleUrls: ['./my-component.component.scss']
})
export class MyComponent { }
```

### 3. Frameworks & Libraries

**UI Framework:** Angular 19.2.18
- Standalone components (no NgModules)
- Reactive forms
- Router for navigation
- Signals for reactive state

**State Management:** NgRx 19.2.1
- Store for application state
- Effects for side effects
- Entity for normalized data
- Store DevTools for debugging

**Styling:**
- SCSS (Sass) preprocessor
- BEM naming convention
- CSS custom properties for tokens
- Global utility classes (`orb-*` prefix)

**Icon System:** Font Awesome 6.5.1
- `@fortawesome/angular-fontawesome`
- Solid icons from `@fortawesome/free-solid-svg-icons`

**Build System:** Angular CLI with esbuild
- Development server: `ng serve`
- Production build: `ng build --configuration production`
- Bundle size limits enforced

### 4. Asset Management

**Location:** `apps/web/src/assets/`

**Assets:**
- Images: `.jpg` format for logos and photos
- Favicon: `favicon.ico` in src root
- No CDN - assets bundled with application

**Asset References:**
```typescript
logoSrc = 'assets/orb-logo.jpg';
```

### 5. Icon System

**Library:** Font Awesome (Angular integration)

**Usage Pattern:**
```typescript
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBuilding, faPlus } from '@fortawesome/free-solid-svg-icons';

@Component({
  imports: [FontAwesomeModule],
})
export class MyComponent {
  faBuilding = faBuilding;
  faPlus = faPlus;
}
```

```html
<fa-icon [icon]="faBuilding"></fa-icon>
```

**Icon Naming:** Use Font Awesome icon names (camelCase in TypeScript, kebab-case in Figma)

### 6. Styling Approach

**CSS Methodology:** BEM (Block Element Modifier)

```scss
.my-component {
  &__header { /* element */ }
  &__title { /* element */ }
  &__button {
    &--primary { /* modifier */ }
    &--disabled { /* modifier */ }
  }
}
```

**Global Styles:** `apps/web/src/styles/components.scss`
- Card layouts (`orb-card`, `orb-card__header`, `orb-card__content`)
- Buttons (`orb-btn`, `orb-btn--primary`, `orb-card-btn`)
- Table cells (`orb-info`, `orb-count`, `orb-role-badge`)
- Filters (`orb-filters`, `orb-filters__input`)
- Tabs (`orb-tabs`, `orb-tabs__tab`)

**CRITICAL:** Always use global `orb-*` classes. DO NOT duplicate these styles in component SCSS files.

**Mixins:** `apps/web/src/styles/mixins.scss`
- `@include m.card` - Card component base
- `@include m.page-container` - Page layout
- `@include m.debug-container` - Debug panel
- `@include m.professional-header` - Dashboard header
- `@include m.status-badge-*` - Status indicators

**Responsive Design:**
- Mobile-first approach
- Breakpoints: 640px (sm), 768px (md), 1024px (lg), 1280px (xl)
- Use SCSS mixins for media queries

### 7. Project Structure

```
apps/web/src/app/
├── core/                    # Core services, guards, interceptors
│   ├── models/             # Generated TypeScript models
│   ├── enums/              # Generated TypeScript enums
│   ├── graphql/            # GraphQL queries/mutations
│   └── services/           # Core services
├── features/               # Feature modules
│   ├── auth/              # Authentication flows
│   ├── user/              # User dashboard
│   └── customers/         # Customer features
│       ├── organizations/ # Organizations feature
│       ├── applications/  # Applications feature
│       └── groups/        # Groups feature
├── layouts/               # Layout components
│   ├── user-layout/      # Main authenticated shell
│   └── pages/            # Page wrappers
│       └── user-page/    # Standard page wrapper
├── shared/               # Shared components, services
│   ├── components/       # Reusable UI components
│   └── services/         # Shared services
└── store/                # Global NgRx store
```

**Feature Organization Pattern:**
```
features/customers/{resource}/
├── components/
│   ├── {resource}-list/        # List page
│   └── {resource}-detail-page/ # Detail page
├── store/
│   ├── {resource}.state.ts     # State interface
│   ├── {resource}.actions.ts   # Actions
│   ├── {resource}.reducer.ts   # Reducer
│   ├── {resource}.selectors.ts # Selectors
│   └── {resource}.effects.ts   # Effects
└── services/
    └── {resource}.service.ts   # API service
```

## Figma-to-Code Workflow

### Step 1: Get Design Context

When provided a Figma URL, extract the design context:

```typescript
// Figma URL format: https://figma.com/design/:fileKey/:fileName?node-id=1-2
// Extract fileKey and nodeId (convert dash to colon: 1-2 → 1:2)

// Use get_design_context tool
const context = await figma.getDesignContext({
  fileKey: 'extracted-file-key',
  nodeId: '1:2',
  clientLanguages: 'typescript,html,css',
  clientFrameworks: 'angular'
});
```

### Step 2: Adapt Reference Code

The Figma MCP returns React + Tailwind code. Transform it to Angular + SCSS:

**React → Angular Component:**
```typescript
// React (from Figma)
function MyComponent({ title, onClick }) {
  return <div className="container" onClick={onClick}>{title}</div>;
}

// Angular (adapted)
@Component({
  selector: 'app-my-component',
  standalone: true,
  template: `
    <div class="my-component" (click)="onClick.emit()">
      {{ title }}
    </div>
  `
})
export class MyComponent {
  @Input() title!: string;
  @Output() onClick = new EventEmitter<void>();
}
```

**Tailwind → SCSS + Design Tokens:**
```scss
// Tailwind (from Figma)
.container {
  @apply bg-red-500 text-white p-4 rounded-lg;
}

// SCSS with tokens (adapted)
.my-component {
  background-color: var(--orb-primary);
  color: var(--orb-white);
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
}
```

### Step 3: Use Existing Components

Before creating new components, check if shared components exist:

| Figma Pattern | Use Component |
|---------------|---------------|
| Data table | `DataGridComponent` |
| Status indicator | `StatusBadgeComponent` |
| Hero section | `HeroSplitComponent` |
| Multi-step flow | `ProgressStepsComponent` |
| Page layout | `UserPageComponent` |

### Step 4: Apply Global CSS Classes

Use global `orb-*` classes instead of creating component-specific styles:

| Pattern | Global Class |
|---------|--------------|
| Card container | `orb-card` |
| Card header | `orb-card__header` |
| Primary button | `orb-btn orb-btn--primary` |
| Info display | `orb-info` |
| Role badge | `orb-role-badge orb-role-badge--owner` |
| Count display | `orb-count` |

### Step 5: Validate Visual Parity

Compare the implemented component against the Figma screenshot:
- Colors match design tokens
- Spacing uses token values
- Typography follows token scale
- Responsive behavior works correctly
- Accessibility requirements met

## Design Token Mapping

### Color Mapping

| Figma Color | Token | Value |
|-------------|-------|-------|
| Primary Red | `--orb-primary` | #E31837 |
| White | `--orb-white` | #FFFFFF |
| Black | `--orb-black` | #000000 |
| Gray | `--orb-gray` | #666666 |
| Light Gray | `--orb-light-gray` | #e5e5e5 |
| Success Green | `--orb-success` | #2B8A3E |
| Warning Yellow | `--orb-warning` | #f59e0b |

### Spacing Mapping

| Figma Spacing | Token | Value |
|---------------|-------|-------|
| 4px | `--spacing-1` | 0.25rem |
| 8px | `--spacing-2` | 0.5rem |
| 12px | `--spacing-3` | 0.75rem |
| 16px | `--spacing-4` | 1rem |
| 24px | `--spacing-6` | 1.5rem |
| 32px | `--spacing-8` | 2rem |
| 48px | `--spacing-12` | 3rem |

### Typography Mapping

| Figma Text Style | Token | Value |
|------------------|-------|-------|
| Body | `--font-size-base` | 1rem (16px) |
| Small | `--font-size-sm` | 0.875rem (14px) |
| Large | `--font-size-lg` | 1.125rem (18px) |
| Heading 1 | `--font-size-4xl` | 2.25rem (36px) |
| Heading 2 | `--font-size-2xl` | 1.5rem (24px) |

## Component Standards

### Layout Components

**UserPageComponent** (REQUIRED for all pages):
```html
<app-user-page
  [heroTitle]="'Page Title'"
  [heroSubtitle]="'Description'"
  [breadcrumbItems]="breadcrumbItems"
  [tabs]="tabs"
  [activeTab]="activeTab"
  (tabChange)="onTabChange($event)">
  
  <!-- Page content here -->
  <div class="orb-card">
    <!-- Feature content -->
  </div>
  
</app-user-page>
```

### List Page Pattern

```html
<app-user-page [heroTitle]="'Resources'" [breadcrumbItems]="breadcrumbItems">
  <div class="orb-card">
    <div class="orb-card__header">
      <h2 class="orb-card__title">
        <fa-icon [icon]="faList" class="orb-card__icon"></fa-icon>
        Resources
      </h2>
      <div class="orb-card__header-actions">
        <button class="orb-card-btn" (click)="onCreate()">
          <fa-icon [icon]="faPlus" class="orb-card-btn__icon"></fa-icon>
          Create
        </button>
      </div>
    </div>
    <div class="orb-card__content">
      <app-data-grid
        [columns]="columns"
        [data]="(filteredRows$ | async) || []"
        [loading]="(isLoading$ | async) || false">
      </app-data-grid>
    </div>
  </div>
</app-user-page>
```

### Card Pattern

```html
<div class="orb-card">
  <div class="orb-card__header">
    <h2 class="orb-card__title">
      <fa-icon [icon]="icon" class="orb-card__icon"></fa-icon>
      Title
    </h2>
  </div>
  <div class="orb-card__content orb-card__content--padded">
    <!-- Content -->
  </div>
</div>
```

## Accessibility Requirements

All Figma designs must be implemented with accessibility in mind:

### Semantic HTML
- Use proper heading hierarchy (h1, h2, h3)
- Use `<button>` for clickable actions
- Use `<a>` for navigation
- Use `<nav>` for navigation sections

### ARIA Attributes
```html
<button aria-label="Create organization" (click)="onCreate()">
  <fa-icon [icon]="faPlus" aria-hidden="true"></fa-icon>
</button>

<div role="status" aria-live="polite">
  {{ statusMessage }}
</div>
```

### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Focus indicators must be visible
- Tab order must be logical

### Color Contrast
- Text must meet WCAG 2.1 AA contrast requirements
- Use design tokens that meet contrast standards
- Test with contrast checker tools

### Reduced Motion
```scss
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Code Connect Workflow

### Mapping Figma Components to Code

When a Figma component should be linked to code:

1. Get Code Connect suggestions:
```typescript
const suggestions = await figma.getCodeConnectSuggestions({
  fileKey: 'file-key',
  nodeId: 'node-id',
  clientLanguages: 'typescript',
  clientFrameworks: 'angular'
});
```

2. Review suggestions with user

3. Save approved mappings:
```typescript
await figma.sendCodeConnectMappings({
  fileKey: 'file-key',
  nodeId: 'node-id',
  mappings: approvedMappings
});
```

### Component Mapping Examples

| Figma Component | Code Component | Path |
|-----------------|----------------|------|
| Button/Primary | `orb-btn orb-btn--primary` | `styles/components.scss` |
| Card | `orb-card` | `styles/components.scss` |
| DataGrid | `DataGridComponent` | `shared/components/data-grid/` |
| StatusBadge | `StatusBadgeComponent` | `shared/components/ui/` |
| HeroSplit | `HeroSplitComponent` | `shared/components/hero-split/` |

## Critical Rules

1. **Treat Figma output as reference, not final code** - Adapt to Angular patterns
2. **Replace Tailwind with design tokens** - Use CSS custom properties
3. **Reuse existing components** - Check shared components first
4. **Use global CSS classes** - Never duplicate `orb-*` styles
5. **Follow NgRx store-first architecture** - All data through store
6. **Maintain 1:1 visual parity** - Match Figma design exactly
7. **Validate accessibility** - Meet WCAG 2.1 AA standards
8. **Use UserPageComponent wrapper** - All pages must use standard wrapper
9. **Use DataGridComponent for tables** - Never create custom table implementations
10. **Import generated enums** - Never create manual enum definitions

## Reference Implementations

**Canonical Examples:**
- List Page: `apps/web/src/app/features/customers/organizations/components/organizations-list/`
- Detail Page: `apps/web/src/app/features/customers/organizations/components/organization-detail-page/`
- Store Pattern: `apps/web/src/app/features/customers/organizations/store/`
- Global CSS: `apps/web/src/styles/components.scss`
- Design Tokens: `apps/web/src/styles/_tokens.scss`

## Common Pitfalls to Avoid

❌ **Don't:**
- Copy Tailwind classes directly
- Create component-specific styles that duplicate global classes
- Skip the UserPageComponent wrapper
- Create custom table implementations
- Define enums manually
- Call services directly (bypass store)
- Use SCREAMING_CASE enum members (old pattern)

✅ **Do:**
- Convert Tailwind to design tokens
- Use global `orb-*` classes
- Wrap all pages in UserPageComponent
- Use DataGridComponent for tables
- Import generated enums from `core/enums/`
- Dispatch actions and use selectors
- Use PascalCase enum members (new pattern)
