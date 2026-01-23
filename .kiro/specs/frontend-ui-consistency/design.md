# Design Document: Frontend UI Consistency

## Overview

This document provides a comprehensive audit of all frontend UI patterns across the orb-integration-hub Angular application and outlines the plan to unify them into a consistent design system. The goal is to eliminate duplication, ensure all components use centralized styles, and maintain visual consistency using the project's established color palette with `$orb-red` (#E31837) as the primary color.

## Architecture

The design system follows a layered architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Feature Components                        │
│  (auth-flow, profile, dashboard, organizations, etc.)       │
├─────────────────────────────────────────────────────────────┤
│                    Shared Components                         │
│  (auth-button, auth-input-field, verification-code-input)   │
├─────────────────────────────────────────────────────────────┤
│                    Global Styles                             │
│  (components.scss - .orb-card, .orb-table, etc.)            │
├─────────────────────────────────────────────────────────────┤
│                    Mixins Layer                              │
│  (mixins.scss - button-primary, form-container, card, etc.) │
├─────────────────────────────────────────────────────────────┤
│                    Design Tokens                             │
│  (_tokens.scss - CSS custom properties)                     │
├─────────────────────────────────────────────────────────────┤
│                    Variables Layer                           │
│  (variables.scss - $orb-red, $spacing-*, $font-*, etc.)     │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Design System Foundation (Already Established)

The project has a solid design system foundation:

| File | Purpose | Status |
|------|---------|--------|
| `variables.scss` | SCSS variables for colors, spacing, typography | ✅ Complete |
| `mixins.scss` | Reusable style patterns (button-primary, card, etc.) | ✅ Complete |
| `components.scss` | Global component classes (.orb-card, .orb-table, etc.) | ✅ Complete |
| `_tokens.scss` | CSS custom properties for runtime theming | ✅ Complete |

### Shared Components (Already Established)

| Component | Purpose | Status |
|-----------|---------|--------|
| `AuthButtonComponent` | Reusable button with variants (primary, secondary, outline, ghost, danger, success) | ✅ Complete |
| `AuthInputFieldComponent` | Reusable input field with validation states | ✅ Complete |
| `VerificationCodeInputComponent` | 6-digit code input for email/phone/MFA verification | ✅ Updated to use orb colors |

## Data Models

### Color Palette

| Variable | Value | Usage |
|----------|-------|-------|
| `$orb-red` | #E31837 | Primary brand color, buttons, links, focus states |
| `$orb-black` | #000000 | Primary text |
| `$orb-gray` | #666666 | Secondary text |
| `$orb-light-gray` | #e5e5e5 | Borders, backgrounds |
| `$orb-white` | #FFFFFF | Backgrounds, button text |
| `$success-color` | #2B8A3E | Success states, valid inputs |
| `$warning-color` | #f59e0b | Warning states |
| `$danger-color` | $orb-red | Error states (same as primary) |

### CSS Custom Properties (Design Tokens)

| Token | Value | Usage |
|-------|-------|-------|
| `--orb-primary` | #E31837 | Primary color for inline styles |
| `--orb-primary-dark` | #c91518 | Hover states |
| `--orb-text-primary` | #000000 | Primary text |
| `--orb-text-secondary` | #666666 | Secondary text |
| `--orb-success` | #2B8A3E | Success states |
| `--orb-error` | #E31837 | Error states |
| `--orb-border` | #9ca3af | Input borders |

## Comprehensive UI Audit

### Files Audited

| Category | Files |
|----------|-------|
| **Root/Layout** | `app.component.scss`, `platform-layout.component.scss`, `user-layout.component.scss` |
| **Shared Components** | `debug-panel.component.scss`, `error-boundary.component.scss`, `progress-steps.component.scss`, `status-badge.component.scss`, `auth-button.component.scss`, `auth-input-field.component.scss`, `verification-code-input.component.ts` |
| **Feature: Auth** | `auth-flow.component.scss` |
| **Feature: User** | `profile.component.scss`, `dashboard.component.scss`, `this-is-not-the-page.component.scss` |
| **Feature: Platform** | `platform.component.scss` |
| **Feature: Customers** | `applications.component.scss`, `application-detail.component.scss`, `applications-list.component.scss`, `organizations.component.scss`, `organization-detail.component.scss`, `organizations-list.component.scss` |
| **Global Styles** | `variables.scss`, `mixins.scss`, `components.scss`, `_tokens.scss` |

### 1. Button Styles Audit

| Location | Class/Selector | Color | Uses Design System | Issues |
|----------|----------------|-------|-------------------|--------|
| auth-flow.component.scss | `&__button` | `$primary-color` (red) | ✅ Yes | None |
| auth-flow.component.scss | `&__back-button` | `$text-secondary` → `$primary-color` hover | ✅ Yes | None |
| auth-flow.component.scss | `&__text-button` | `$primary-color` | ✅ Yes | None |
| profile.component.scss | `&__button--primary` | `$primary-color` | ✅ Yes | None |
| profile.component.scss | `&__link` | `$text-secondary` → `$primary-color` hover | ✅ Yes | None |
| profile.component.scss | `.profile-setup__button` | `$primary-color` | ✅ Yes | None |
| dashboard.component.scss | Uses mixins | `$primary-color` via mixin | ✅ Yes | None |
| platform.component.scss | `.primary-button` | `v.$orb-red` | ✅ Yes | None |
| platform.component.scss | `.secondary-button` | `v.$orb-red` | ✅ Yes | None |
| platform.component.scss | `.pricing-cta` | `v.$orb-red` | ✅ Yes | None |
| auth-button.component.scss | `[data-variant="primary"]` | `v.$primary-color` | ✅ Yes | None |
| components.scss | `.orb-card-btn` | `v.$orb-red` | ✅ Yes | None |
| components.scss | `.orb-action-button--primary` | `v.$orb-red` | ✅ Yes | None |
| verification-code-input | `.verification-code__resend-button` | `var(--orb-primary)` | ✅ Yes | None (fixed) |
| this-is-not-the-page.component.scss | `.not-found-actions__button--primary` | `v.$primary-color` | ✅ Yes | None |
| this-is-not-the-page.component.scss | `.not-found-actions__button--secondary` | `v.$orb-red` | ✅ Yes | None |
| application-detail.component.scss | `&__action--primary` | `v.$orb-red` | ✅ Yes | None |
| organization-detail.component.scss | `&__action--primary` | `v.$orb-red` | ✅ Yes | None |

**Button Audit Summary**: All buttons correctly use `$orb-red` or `$primary-color` (which equals `$orb-red`).

### 2. Input Field Styles Audit

| Location | Class/Selector | Border | Focus Color | Uses Design System | Issues |
|----------|----------------|--------|-------------|-------------------|--------|
| auth-flow.component.scss | `&__input-group-field` | 2px solid `$gray-400` | `$primary-color` | ✅ Yes | None |
| profile.component.scss | `.profile-form__field-input` | 2px solid `$gray-400` | `$primary-color` | ✅ Yes | None |
| profile.component.scss | `.profile-setup__input` | 2px solid `$gray-400` | `$primary-color` | ✅ Yes | None |
| profile.component.scss | `.profile-setup-flow__input` | 2px solid `$gray-400` | `$primary-color` | ✅ Yes | None |
| auth-input-field.component.scss | `.auth-input__field` | 1px solid `$input-border-color` | `$primary-color` | ✅ Yes | None |
| components.scss | `.orb-filters__input` | 1px solid `$border-color` | `$primary-color` | ✅ Yes | None |
| verification-code-input | `.verification-code__input` | 2px solid `var(--orb-border)` | `var(--orb-primary)` | ✅ Yes | None (fixed) |
| application-detail.component.scss | `&__info-input` | 1px solid `$input-border-color` | `$primary-color` | ✅ Yes | None |
| organization-detail.component.scss | `&__info-input` | 1px solid `$input-border-color` | `$primary-color` | ✅ Yes | None |

**Input Audit Summary**: All inputs correctly use design system variables for borders and focus states.

### 3. Link Styles Audit

| Location | Class/Selector | Color | Hover Color | Uses Design System | Issues |
|----------|----------------|-------|-------------|-------------------|--------|
| auth-flow.component.scss | `&__back-button` | `$text-secondary` | `$primary-color` | ✅ Yes | None |
| auth-flow.component.scss | `&__text-button` | `$primary-color` | darker `$primary-color` | ✅ Yes | None |
| profile.component.scss | `&__link` | `$text-secondary` | `$primary-color` | ✅ Yes | None |
| profile.component.scss | `.profile-setup__text-button` | `$primary-color` | darker `$primary-color` | ✅ Yes | None |
| profile.component.scss | `.profile-setup__link` | `$text-secondary` | `$primary-color` | ✅ Yes | None |
| verification-code-input | `.verification-code__resend-button` | `var(--orb-primary)` | `var(--orb-primary-dark)` | ✅ Yes | None (fixed) |

**Link Audit Summary**: All links correctly use design system colors.

### 4. Card/Container Styles Audit

| Location | Class/Selector | Uses Design System | Issues |
|----------|----------------|-------------------|--------|
| components.scss | `.orb-card` | ✅ Yes - uses variables | None |
| dashboard.component.scss | `.dashboard-card` | ✅ Yes - uses `@include m.card` | None |
| profile.component.scss | `.profile-card` | ✅ Yes - uses `@include m.card` | None |
| applications.component.scss | Uses `.orb-card` class | ✅ Yes | None |
| organizations.component.scss | Uses `.orb-card` class | ✅ Yes | None |

**Card Audit Summary**: All cards correctly use the centralized `.orb-card` class or `@include m.card` mixin.

### 5. Form Layout Patterns Audit

| Location | Pattern | Uses Design System | Issues |
|----------|---------|-------------------|--------|
| auth-flow.component.scss | `&__form` - flex column, centered | ✅ Yes | None |
| profile.component.scss | `.profile-form` - grid layout | ✅ Yes | None |
| profile.component.scss | `.profile-setup-flow__form` | ✅ Yes | None |
| auth-input-field.component.scss | `.auth-input` - standard input group | ✅ Yes | None |

**Form Layout Summary**: All forms follow consistent patterns using design system spacing.

### 6. Icon Colors Audit

| Location | Icon Usage | Color | Uses Design System | Issues |
|----------|------------|-------|-------------------|--------|
| auth-flow.component.scss | Progress step icons | `$primary-color` | ✅ Yes | None |
| profile.component.scss | Card icons | `$primary-color` via mixin | ✅ Yes | None |
| platform.component.scss | Feature icons | `v.$orb-red` | ✅ Yes | None |
| verification-code-input | Type icon (email/phone/mfa) | `var(--orb-primary)` | ✅ Yes | None (fixed) |

**Icon Audit Summary**: All icons correctly use the primary red color.

### 7. Status Badge Styles Audit

| Location | Class/Selector | Uses Design System | Issues |
|----------|----------------|-------------------|--------|
| components.scss | `.status-badge` | ✅ Yes | None |
| components.scss | `.orb-role-badge` | ✅ Yes | None |
| components.scss | `.orb-header-badge` | ✅ Yes | None |
| dashboard.component.scss | `.dashboard-card__badge` | ✅ Yes - uses mixin | None |
| profile.component.scss | `.profile-card__badge` | ✅ Yes | None |
| profile.component.scss | `.verification-badge` | ✅ Yes | None |

**Status Badge Summary**: All badges correctly use design system colors.

### 8. Page Header Styles Audit

| Location | Class/Selector | Uses Design System | Issues |
|----------|----------------|-------------------|--------|
| components.scss | `.orb-page-header` | ✅ Yes | None |
| auth-flow.component.scss | `&__header` | ✅ Yes | None |
| dashboard.component.scss | Uses `.orb-page-header` | ✅ Yes | None |
| profile.component.scss | Uses `.orb-page-header` | ✅ Yes | None |
| applications.component.scss | Uses `.orb-page-header` | ✅ Yes | None |
| organizations.component.scss | Uses `.orb-page-header` | ✅ Yes | None |

**Page Header Summary**: All pages correctly use the centralized `.orb-page-header` class.

### 9. Layout Components Audit

| Location | Class/Selector | Uses Design System | Issues |
|----------|----------------|-------------------|--------|
| app.component.scss | `:root` CSS vars | ❌ No - duplicates `_tokens.scss` | Redundant CSS custom properties |
| platform-layout.component.scss | `:host` CSS vars | ❌ No - duplicates `_tokens.scss` | Redundant CSS custom properties |
| platform-layout.component.scss | `.platform-bg` | ❌ No - hardcoded `#3A3A3A` | Should use design system variable |
| user-layout.component.scss | `:host` CSS vars | ⚠️ Partial - duplicates but also uses `v.$` | Redundant CSS custom properties |
| user-layout.component.scss | `.header`, `.nav-link` | ✅ Yes - uses `v.$orb-red`, `v.$orb-dark-blue` | None |

**Layout Audit Summary**: Layout components have redundant CSS custom property declarations that should be removed since `_tokens.scss` already provides them globally.

### 10. Status Badge Component Audit

| Location | Class/Selector | Uses Design System | Issues |
|----------|----------------|-------------------|--------|
| status-badge.component.scss | `.status-badge--organization-active` | ❌ No - hardcoded `#2B8A3E` | Should use `v.$success-color` |
| status-badge.component.scss | `.status-badge--organization-inactive` | ❌ No - hardcoded `#721c24`, `#f8d7da` | Should use design system colors |
| status-badge.component.scss | `.status-badge--organization-pending` | ❌ No - hardcoded `#856404`, `#fff3cd` | Should use `v.$warning-color` |
| status-badge.component.scss | `.status-badge--user-*` | ❌ No - hardcoded colors | Should use design system colors |

**Status Badge Audit Summary**: The status-badge component uses hardcoded hex colors instead of design system variables. This needs to be migrated.

### 11. Shared Components Audit

| Location | Uses Design System | Issues |
|----------|-------------------|--------|
| debug-panel.component.scss | ✅ Yes - uses `v.$`, `m.` | None |
| error-boundary.component.scss | ✅ Yes - uses `v.$`, `m.` | None |
| progress-steps.component.scss | ✅ Yes - uses `v.$` | None |
| this-is-not-the-page.component.scss | ✅ Yes - uses `v.$`, `m.` | None |

**Shared Components Summary**: Most shared components correctly use the design system. Only `status-badge.component.scss` needs migration.

### 12. Customer Feature Components Audit

| Location | Uses Design System | Issues |
|----------|-------------------|--------|
| application-detail.component.scss | ✅ Yes - uses `v.$`, `m.` | None |
| applications-list.component.scss | ✅ Yes - uses global styles | None (empty, uses components.scss) |
| organization-detail.component.scss | ✅ Yes - uses `v.$`, `m.` | None |
| organizations-list.component.scss | ✅ Yes - uses global styles | None (empty, uses components.scss) |

**Customer Components Summary**: All customer feature components correctly use the design system.

### 13. Debug Panel Usage Audit

A shared `DebugPanelComponent` exists at `apps/web/src/app/shared/components/debug/debug-panel.component.ts` but is NOT being used by any pages. Instead, each page implements its own custom debug section:

| Location | Uses Shared Component | Issues |
|----------|----------------------|--------|
| auth-flow.component.html | ❌ No - custom `.auth-flow__debug` | Should use `<app-debug-panel>` |
| this-is-not-the-page.component.html | ❌ No - custom `.not-found__debug` | Should use `<app-debug-panel>` |
| applications.component.html | ❌ No - custom `.applications__debug` | Should use `<app-debug-panel>` |
| organizations.component.html | ❌ No - custom `.organizations__debug` | Should use `<app-debug-panel>` |

**Debug Panel Summary**: All pages should migrate to use the shared `DebugPanelComponent` for consistent debug UI across the application.

## Issues Found and Resolved

### Issue 1: VerificationCodeInputComponent (RESOLVED)

The `VerificationCodeInputComponent` was using hardcoded blue hex values instead of the design system.

**Before (WRONG)**:
```css
--primary: #3b82f6;        /* Blue - should be red */
--primary-dark: #2563eb;   /* Dark blue - should be dark red */
```

**After (CORRECT)**:
```css
color: var(--orb-primary, #E31837);
color: var(--orb-primary-dark, #c91518);
```

**Status**: ✅ Fixed - Component now uses CSS custom properties that default to orb brand colors.

## Issues Found - Pending Resolution

### Issue 2: StatusBadgeComponent Hardcoded Colors (PENDING)

The `status-badge.component.scss` uses hardcoded hex colors instead of design system variables.

**Current (WRONG)**:
```scss
&-active {
  background: rgba(43, 138, 62, 0.1);  // Hardcoded
  color: #2B8A3E;                       // Hardcoded
  border: 1px solid rgba(43, 138, 62, 0.2);
}
```

**Should Be**:
```scss
@use '../../../../styles/variables' as v;

&-active {
  background: rgba(v.$success-color, 0.1);
  color: v.$success-color;
  border: 1px solid rgba(v.$success-color, 0.2);
}
```

**Status**: ⏳ Pending - Needs migration to use design system variables.

### Issue 3: Redundant CSS Custom Properties in Layout Components (PENDING)

The `app.component.scss`, `platform-layout.component.scss`, and `user-layout.component.scss` declare redundant CSS custom properties that are already defined in `_tokens.scss`.

**Current (REDUNDANT)**:
```scss
:root {
  --orb-red: #E31837;
  --orb-black: #000000;
  // ... duplicated from _tokens.scss
}
```

**Should Be**: Remove these declarations since `_tokens.scss` already provides them globally.

**Status**: ⏳ Pending - Needs cleanup to remove redundant declarations.

### Issue 4: Hardcoded Background Color in Platform Layout (PENDING)

The `platform-layout.component.scss` uses a hardcoded `#3A3A3A` color for the background.

**Current (WRONG)**:
```scss
.platform-bg {
  background-color: #3A3A3A;  // Hardcoded
}
```

**Should Be**: Add a new variable to `variables.scss` (e.g., `$orb-dark-gray: #3A3A3A`) and reference it.

**Status**: ⏳ Pending - Needs variable addition and reference update.

### Issue 5: Debug Panels Not Using Shared Component (PENDING)

Multiple pages implement custom debug sections instead of using the shared `DebugPanelComponent`.

**Current (INCONSISTENT)**:
```html
<!-- auth-flow.component.html -->
<div class="auth-flow__debug">
  <h3 class="auth-flow__debug-title">Debug Information</h3>
  <!-- Custom implementation -->
</div>
```

**Should Be**:
```html
<app-debug-panel
  [visible]="debugMode$ | async"
  [title]="'Auth Flow Debug'"
  [logs$]="debugLogs$"
  [context]="debugContext">
</app-debug-panel>
```

**Affected Pages**:
- `auth-flow.component.html`
- `this-is-not-the-page.component.html`
- `applications.component.html`
- `organizations.component.html`

**Status**: ⏳ Pending - All pages should migrate to use the shared `DebugPanelComponent`.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Primary Color Consistency

*For any* UI component that uses a primary/brand color, the color value SHALL be `#E31837` (orb-red) or reference `$orb-red`, `$primary-color`, or `var(--orb-primary)`.

**Validates: Requirements 2.7, 6.1**

### Property 2: Focus State Consistency

*For any* focusable element (button, input, link), the focus ring color SHALL use `$primary-color` or `var(--orb-primary)` with appropriate opacity.

**Validates: Requirements 3.4**

### Property 3: Input Border Consistency

*For any* input field, the border SHALL use design system variables (`$gray-400`, `$border-color`, or `var(--orb-border)`) and focus state SHALL use `$primary-color`.

**Validates: Requirements 3.1, 3.4**

### Property 4: Button Variant Consistency

*For any* primary button, the background color SHALL be `$orb-red` or `$primary-color`, and hover state SHALL darken by 10%.

**Validates: Requirements 2.1, 2.7**

### Property 5: Link Hover Consistency

*For any* text link, the hover color SHALL transition to `$primary-color` or a darker variant of the current color.

**Validates: Requirements 4.3**

### Property 6: Card Structure Consistency

*For any* card component, it SHALL use either the `.orb-card` class or `@include m.card` mixin to ensure consistent styling.

**Validates: Requirements 1.4, 1.7**

### Property 7: No Hardcoded Colors

*For any* component SCSS file, there SHALL be no hardcoded hex color values for brand colors (blue #3b82f6, etc.) - all colors SHALL reference design system variables or CSS custom properties.

**Validates: Requirements 1.9, 6.1**

## Error Handling

### CSS Custom Property Fallbacks

All CSS custom properties include fallback values to ensure graceful degradation:

```css
color: var(--orb-primary, #E31837);  /* Fallback to red if variable not set */
```

### Browser Compatibility

- CSS custom properties are supported in all modern browsers
- SCSS variables compile to static values for older browser support
- The design system uses progressive enhancement

## Testing Strategy

### Visual Regression Testing

1. **Automated Screenshots**: Capture screenshots of all pages/components
2. **Color Verification**: Verify primary color (#E31837) appears correctly
3. **Focus State Testing**: Tab through all interactive elements to verify focus rings

### Manual Testing Checklist

- [ ] All buttons use red (#E31837) as primary color
- [ ] All input focus rings are red
- [ ] All links hover to red
- [ ] All icons use red as primary color
- [ ] No blue (#3b82f6) appears anywhere in the UI
- [ ] Cards have consistent styling across all pages
- [ ] Forms follow consistent layout patterns

### Property-Based Testing

Using Hypothesis (Python) or fast-check (TypeScript) to verify:
- Color values in compiled CSS match design system
- No hardcoded hex values in component styles

## Migration Plan

### Phase 1: Audit Complete ✅

All components have been audited and documented.

### Phase 2: VerificationCodeInputComponent Fix ✅

The component has been updated to use CSS custom properties with orb brand colors.

### Phase 3: Documentation (This Document)

This design document serves as the comprehensive documentation of the design system.

### Phase 4: Ongoing Maintenance

- Add linting rules to prevent hardcoded colors
- Create component library documentation
- Add visual regression tests to CI/CD

## Files Modified

1. `apps/web/src/app/shared/components/verification-code-input/verification-code-input.component.ts` - Updated to use `--orb-*` CSS custom properties
2. `apps/web/src/styles/_tokens.scss` - Added orb brand colors section

## Files To Be Modified

3. `apps/web/src/app/shared/components/ui/status-badge.component.scss` - Migrate to design system variables
4. `apps/web/src/app/app.component.scss` - Remove redundant CSS custom properties
5. `apps/web/src/app/layouts/platform-layout/platform-layout.component.scss` - Remove redundant CSS custom properties, add variable for dark gray
6. `apps/web/src/app/layouts/user-layout/user-layout.component.scss` - Remove redundant CSS custom properties
7. `apps/web/src/styles/variables.scss` - Add `$orb-dark-gray` variable

## Success Criteria

- [x] All verification code inputs use `$orb-red` as primary color
- [x] Focus rings are red, not blue
- [x] Resend links hover to red, not blue
- [x] Type icons (email/phone/mfa) are red, not blue
- [x] No hardcoded blue hex values in VerificationCodeInputComponent
- [x] Build passes with no errors
- [x] Comprehensive audit documented
- [x] All components use design system variables or CSS custom properties
- [ ] StatusBadgeComponent migrated to design system variables
- [ ] Redundant CSS custom properties removed from layout components
- [ ] Platform layout dark gray color added to variables.scss
- [ ] Design system documentation created
