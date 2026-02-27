# Designer Handoff Package

This package contains everything a Figma designer needs to organize and refine our design system.

## Project Overview

**Project:** Orb Integration Hub
**Tech Stack:** Angular 19 + SCSS + NgRx
**Current State:** Working application with HTML/CSS imported into Figma via html.to.design plugin
**Goal:** Create a proper Figma component library with design tokens applied

## What We Provide

### 1. Running Application
- **Local URL:** http://localhost:4200 (we can provide access or screenshots)
- **Live Demo:** [If you have a staging environment, add URL here]

### 2. Design Tokens
- **File:** `docs/design/figma-tokens.json`
- **Import using:** Tokens Studio for Figma plugin
- **Contains:** Colors, spacing, typography, shadows, border radius

### 3. Figma File
- **Current state:** HTML/CSS imported via html.to.design
- **Needs:** Cleanup, organization, component creation

### 4. Documentation
- **Component inventory:** `docs/design/component-inventory.md`
- **Design system rules:** `.kiro/steering/design-system.md`
- **Frontend standards:** `.kiro/steering/frontend-components.md`

## Scope of Work

### Phase 1: Cleanup & Organization (Week 1)

**Tasks:**
1. Review imported HTML/CSS designs in Figma
2. Remove unnecessary layers and clean up structure
3. Organize into logical pages:
   - Design Tokens
   - Components
   - Page Layouts
   - Reference/Screenshots

4. Apply design tokens from JSON file:
   - Colors: Replace hex values with token references
   - Spacing: Ensure 8px grid (4, 8, 12, 16, 24, 32, 48)
   - Typography: Apply font sizes and weights from tokens
   - Shadows and border radius

**Deliverable:** Clean, organized Figma file with tokens applied

### Phase 2: Component Library (Week 2)

**Priority Components to Create:**

1. **Buttons** (4 variants)
   - Primary (red #E31837)
   - Secondary (gray)
   - Outline (transparent with red border)
   - Card header button (white border)
   - States: default, hover, active, disabled

2. **Cards**
   - Card with black header
   - Card with content (padded)
   - Card with table (no padding)
   - Include icon + title in header

3. **Data Grid/Table**
   - Header row
   - Data rows with variants:
     - Info cell (name + ID)
     - Status badge cell
     - Role badge cell
     - Count cell (icon + number)
     - Date cell
   - Pagination controls

4. **Status Badges**
   - Variants: Active (green), Pending (yellow), Suspended (red), Inactive (gray)
   - Sizes: small, medium, large
   - With/without icon

5. **Form Inputs**
   - Text input (normal, focused, error states)
   - Text input with icon
   - Select dropdown
   - Labels and helper text

6. **Navigation**
   - Tab navigation (active/inactive states)
   - Breadcrumbs
   - Tab with badge

7. **Layout Components**
   - Hero split (logo left, content right)
   - Page wrapper (max-width 1400px)
   - Card layout

**Deliverable:** Complete component library with variants

### Phase 3: Documentation (Ongoing)

**Tasks:**
1. Name components consistently (e.g., "Button/Primary", "Card/Header")
2. Add descriptions to components
3. Document usage guidelines
4. Create example page layouts using components

**Deliverable:** Documented component library ready for handoff

## Design Tokens Reference

### Colors
```
Primary Red: #E31837
White: #FFFFFF
Black: #000000
Gray: #666666
Light Gray: #e5e5e5
Success: #2B8A3E
Warning: #f59e0b
```

### Spacing (8px grid)
```
4px, 8px, 12px, 16px, 24px, 32px, 48px, 96px
```

### Typography
```
Font sizes: 12px, 14px, 16px, 18px, 20px, 24px, 36px
Font weights: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)
```

### Border Radius
```
Small: 2px
Medium: 6px
Large: 8px
XL: 12px
Full: 9999px
```

## Key Design Patterns

### BEM Naming Convention
Our CSS uses BEM (Block Element Modifier):
- Block: `.orb-card`
- Element: `.orb-card__header`
- Modifier: `.orb-card__header--dark`

Please use similar naming in Figma components.

### Component Hierarchy
```
Card
├── Card/Default
├── Card/With Header
└── Card/Table

Button
├── Button/Primary
├── Button/Secondary
├── Button/Outline
└── Button/Card Header
```

### Auto-Layout Requirements
- All components should use auto-layout
- Spacing should use 8px grid
- Components should be responsive

## Canonical Examples

**Best reference pages:**
- Organizations List: Shows card, data grid, filters, buttons
- Organization Detail: Shows hero, tabs, forms, metadata
- Dashboard: Shows CTA cards with different severity levels

## Communication

**Questions?** Contact: [Your email/Slack/etc.]

**Review cadence:** 
- Daily check-ins (async)
- Mid-week review (30 min call)
- Final review at end of each phase

## Success Criteria

**Phase 1 Complete When:**
- [ ] Figma file is organized into clear pages
- [ ] Design tokens are imported and applied
- [ ] Unnecessary layers are removed
- [ ] Structure is clean and logical

**Phase 2 Complete When:**
- [ ] All priority components are created
- [ ] Components have proper variants
- [ ] Auto-layout is used throughout
- [ ] Components are named consistently

**Phase 3 Complete When:**
- [ ] Components are documented
- [ ] Example pages are created
- [ ] Design system is ready for developer handoff
- [ ] Code Connect can be set up (we'll handle this)

## Timeline

**Week 1:** Phase 1 (Cleanup & Organization)
**Week 2:** Phase 2 (Component Library)
**Ongoing:** Phase 3 (Documentation)

**Total estimated time:** 40-60 hours over 2 weeks

## Budget

[Add your budget here - typically $1500-3000 for this scope]

## Next Steps After Completion

Once the Figma component library is complete:
1. We'll set up Code Connect to link Figma components to Angular code
2. Designers can iterate and improve designs
3. Developers will use Figma as source of truth for new features
4. Design-code consistency will be maintained automatically
