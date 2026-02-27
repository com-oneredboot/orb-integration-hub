# Component Inventory for Figma Recreation

This document provides a visual and code reference for designers to recreate components in Figma.

## How to Use This Document

1. Take screenshots of each component in the running application
2. Add screenshots to `docs/design/screenshots/`
3. Designers use these as reference to create Figma components
4. Once Figma components exist, use Code Connect to link them back

## Component Categories

### Layout Components

#### UserPageComponent
- **Location:** `apps/web/src/app/layouts/pages/user-page/`
- **Purpose:** Standard page wrapper with hero, breadcrumbs, tabs
- **Screenshot:** [TODO: Add screenshot]
- **Key Features:**
  - Max-width: 1400px
  - Hero section with logo + content
  - Breadcrumb navigation
  - Tab navigation
  - Content projection

#### HeroSplitComponent
- **Location:** `apps/web/src/app/shared/components/hero-split/`
- **Purpose:** Split hero layout (logo left, content right)
- **Screenshot:** [TODO: Add screenshot]
- **Dimensions:**
  - Container: max-width 1400px
  - Left/Right: flex 1, max-width 600px each
  - Gap: 96px
  - Padding: 48px vertical

### Data Display Components

#### DataGridComponent
- **Location:** `apps/web/src/app/shared/components/data-grid/`
- **Purpose:** Tabular data with sorting, filtering, pagination
- **Screenshot:** [TODO: Add screenshot]
- **Features:**
  - Sortable columns
  - Filterable columns
  - Pagination controls
  - Loading states
  - Empty states

#### StatusBadgeComponent
- **Location:** `apps/web/src/app/shared/components/ui/status-badge.component.ts`
- **Purpose:** Status indicators with icons and colors
- **Screenshot:** [TODO: Add screenshot]
- **Variants:**
  - Sizes: small, medium, large
  - Styles: badge, chip, text, indicator
  - Types: user, organization, application, verification, group, apiKey

### Card Components

#### Card Layout (Global CSS)
- **Location:** `apps/web/src/styles/components.scss`
- **Classes:** `orb-card`, `orb-card__header`, `orb-card__content`
- **Screenshot:** [TODO: Add screenshot]
- **Features:**
  - Black header with white text
  - Shadow and hover effects
  - Rounded corners
  - Icon + title in header
  - Action buttons in header

### Button Components

#### Primary Button
- **Class:** `orb-btn orb-btn--primary`
- **Color:** Red (#E31837)
- **Screenshot:** [TODO: Add screenshot]

#### Card Header Button
- **Class:** `orb-card-btn`
- **Style:** White border, transparent background
- **Screenshot:** [TODO: Add screenshot]

#### Secondary Button
- **Class:** `orb-btn orb-btn--secondary`
- **Color:** Gray
- **Screenshot:** [TODO: Add screenshot]

### Form Components

#### Input Fields
- **Class:** `orb-filters__input`
- **Screenshot:** [TODO: Add screenshot]
- **Features:**
  - Icon support
  - Border styling
  - Focus states

#### Select Dropdowns
- **Class:** `orb-filters__select`
- **Screenshot:** [TODO: Add screenshot]

### Navigation Components

#### Tab Navigation
- **Class:** `orb-tabs`, `orb-tabs__tab`
- **Screenshot:** [TODO: Add screenshot]
- **Features:**
  - Active state indicator
  - Icon support
  - Badge support
  - Danger variant

#### Breadcrumbs
- **Component:** Part of UserPageComponent
- **Screenshot:** [TODO: Add screenshot]

## Design Tokens Reference

### Colors
- Primary Red: #E31837
- White: #FFFFFF
- Black: #000000
- Gray: #666666
- Light Gray: #e5e5e5
- Success: #2B8A3E
- Warning: #f59e0b

### Spacing Scale (8px base)
- 4px (--spacing-1)
- 8px (--spacing-2)
- 12px (--spacing-3)
- 16px (--spacing-4)
- 24px (--spacing-6)
- 32px (--spacing-8)
- 48px (--spacing-12)

### Typography
- Body: 16px (1rem)
- Small: 14px (0.875rem)
- Large: 18px (1.125rem)
- H1: 36px (2.25rem)
- H2: 24px (1.5rem)

### Border Radius
- Small: 2px
- Medium: 6px
- Large: 8px
- XL: 12px

## Next Steps

1. **Run the application locally** and take screenshots of each component
2. **Create a Figma file** with these components
3. **Use design tokens** from this document to match colors, spacing, typography
4. **Set up Code Connect** to link Figma components back to code
5. **Iterate** - designers can now modify and improve the designs

## Screenshot Checklist

- [ ] UserPageComponent (with hero, breadcrumbs, tabs)
- [ ] HeroSplitComponent
- [ ] DataGridComponent (with data)
- [ ] StatusBadgeComponent (all variants)
- [ ] Card layouts (header + content)
- [ ] All button variants
- [ ] Form inputs and selects
- [ ] Tab navigation
- [ ] Organizations list page (canonical example)
- [ ] Organization detail page (canonical example)
- [ ] Application list page
- [ ] Application detail page
- [ ] Dashboard with CTA cards
- [ ] Auth flow pages
