# Design Document: Frontend UI Consistency

## Overview

This document outlines the audit findings and proposed changes to unify the frontend UI components, styles, and patterns across the orb-integration-hub Angular application.

## Current State Audit

### 1. Design System Foundation

The project has a solid design system foundation in place:

**Variables (`apps/web/src/styles/variables.scss`):**
- Color palette: `$orb-red` (#E31837) as primary, grays, semantic colors
- Spacing scale: `$spacing-xs` through `$spacing-xl`
- Typography: font families, sizes, weights
- Border radii, shadows, input styles

**Mixins (`apps/web/src/styles/mixins.scss`):**
- `button-primary` - Primary button styling with `$orb-red`
- `form-container` - Form wrapper styling
- `card`, `card-header`, `card-content` - Card component mixins
- `debug-container` - Debug panel styling

**Components (`apps/web/src/styles/components.scss`):**
- `.orb-card` - Card component with header, content, actions
- `.orb-filters` - Filter section styles
- `.orb-table` - Table styles
- `.status-badge` - Status badge variants

### 2. Button Styles Audit

| Location | Style | Color | Issues |
|----------|-------|-------|--------|
| Auth-flow `&__button` | Full-width, 48px min-height | `$primary-color` (red) | ✅ Correct |
| Auth-flow `&__back-button` | Text link, underlined | `$text-secondary` | ✅ Correct |
| Auth-flow `&__text-button` | Text link, underlined | `$primary-color` | ✅ Correct |
| Profile `&__button--primary` | Standard button | `$primary-color` (red) | ✅ Correct |
| Profile `&__link` | Text link, underlined | `$text-secondary` | ✅ Correct |
| **VerificationCodeInput** | Resend button | **Hardcoded `#3b82f6` (blue)** | ❌ **WRONG** |

### 3. Input Styles Audit

| Location | Border | Focus | Issues |
|----------|--------|-------|--------|
| Auth-flow `&__input-group-field` | 2px solid `$gray-400` | `$primary-color` ring | ✅ Correct |
| Profile `&__input` | 2px solid `$gray-400` | `$primary-color` ring | ✅ Correct |
| **VerificationCodeInput** | 2px solid `#9ca3af` | **Hardcoded `#3b82f6` (blue)** | ❌ **WRONG** |

### 4. Link Styles Audit

| Location | Style | Color | Issues |
|----------|-------|-------|--------|
| Auth-flow `&__back-button` | Underlined, small | `$text-secondary` → `$primary-color` on hover | ✅ Correct |
| Auth-flow `&__text-button` | Underlined | `$primary-color` | ✅ Correct |
| Profile `&__link` | Underlined, small | `$text-secondary` → `$primary-color` on hover | ✅ Correct |
| **VerificationCodeInput** | Resend link | **Hardcoded `#3b82f6` (blue)** | ❌ **WRONG** |

### 5. Icon Colors Audit

| Location | Icon | Color | Issues |
|----------|------|-------|--------|
| Auth-flow | Various | `$primary-color` | ✅ Correct |
| **VerificationCodeInput** | Type icon (email/phone/mfa) | **Hardcoded `#3b82f6` (blue)** | ❌ **WRONG** |

## Issues Summary

### Critical Issue: VerificationCodeInputComponent

The `VerificationCodeInputComponent` uses hardcoded CSS values instead of the project's design system:

**Hardcoded values found:**
```css
/* Current - WRONG */
--primary: #3b82f6;        /* Should be $orb-red (#E31837) */
--primary-dark: #2563eb;   /* Should be darken($orb-red, 10%) */
--border-dark: #9ca3af;    /* Should be $gray-400 */
--text-primary: #1f2937;   /* Should be $text-primary */
--text-secondary: #6b7280; /* Should be $text-secondary */
--error: #ef4444;          /* Should be $danger-color */
--success: #059669;        /* Should be $success-color */
```

## Proposed Solution

### Approach: CSS Custom Properties Bridge

Since the component uses inline styles (required for standalone components), we'll use CSS custom properties that can be set from the parent component's SCSS, which has access to the design system variables.

**Step 1: Update VerificationCodeInputComponent**

Replace hardcoded hex values with CSS custom properties that default to the correct design system values:

```css
.verification-code {
  /* Use CSS custom properties with correct defaults */
  --vc-primary: var(--orb-primary, #E31837);
  --vc-primary-dark: var(--orb-primary-dark, #c91518);
  --vc-text-primary: var(--orb-text-primary, #000000);
  --vc-text-secondary: var(--orb-text-secondary, #666666);
  --vc-border: var(--orb-border, #9ca3af);
  --vc-error: var(--orb-error, #E31837);
  --vc-success: var(--orb-success, #2B8A3E);
}
```

**Step 2: Set CSS Custom Properties in Global Styles**

Add to `apps/web/src/styles.scss` or create a new file:

```scss
:root {
  --orb-primary: #{v.$orb-red};
  --orb-primary-dark: #{color.adjust(v.$orb-red, $lightness: -10%)};
  --orb-text-primary: #{v.$text-primary};
  --orb-text-secondary: #{v.$text-secondary};
  --orb-border: #{v.$gray-400};
  --orb-error: #{v.$danger-color};
  --orb-success: #{v.$success-color};
}
```

## Implementation Tasks

### Task 1: Fix VerificationCodeInputComponent Colors

**File:** `apps/web/src/app/shared/components/verification-code-input/verification-code-input.component.ts`

**Changes:**
1. Replace all hardcoded `#3b82f6` (blue) with `var(--orb-primary, #E31837)`
2. Replace all hardcoded `#2563eb` (dark blue) with `var(--orb-primary-dark, #c91518)`
3. Replace `#9ca3af` border with `var(--orb-border, #9ca3af)`
4. Replace `#1f2937` text with `var(--orb-text-primary, #000000)`
5. Replace `#6b7280` secondary text with `var(--orb-text-secondary, #666666)`
6. Replace `#ef4444` error with `var(--orb-error, #E31837)`
7. Replace `#059669` success with `var(--orb-success, #2B8A3E)`

### Task 2: Add CSS Custom Properties to Global Styles

**File:** `apps/web/src/styles.scss`

**Changes:**
1. Add `:root` block with CSS custom properties mapped to SCSS variables

### Task 3: Verify Visual Consistency

1. Build the application: `npm run build`
2. Visual inspection of:
   - Auth-flow email verification
   - Auth-flow MFA verification
   - Profile phone verification
3. Confirm all use red (`$orb-red`) as primary color

## Files to Modify

1. `apps/web/src/app/shared/components/verification-code-input/verification-code-input.component.ts`
2. `apps/web/src/styles.scss`

## Testing

- Run `npm run build` to verify no build errors
- Visual inspection of verification flows
- Verify focus states use red, not blue
- Verify resend link uses red on hover
- Verify icon colors are red

## Success Criteria

- [ ] All verification code inputs use `$orb-red` as primary color
- [ ] Focus rings are red, not blue
- [ ] Resend links hover to red, not blue
- [ ] Type icons (email/phone/mfa) are red, not blue
- [ ] No hardcoded blue hex values in VerificationCodeInputComponent
- [ ] Build passes with no errors
