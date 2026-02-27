# Component Screenshot Capture Guide

This guide helps you capture screenshots of existing components for Figma recreation.

## Prerequisites

1. Application running locally: `npm start` in `apps/web`
2. Browser DevTools open
3. Screenshot tool ready (OS built-in or browser extension)

## Pages to Capture

### 1. Organizations List (Canonical Example)
**URL:** `http://localhost:4200/customers/organizations`

**What to capture:**
- Full page with hero section
- Card with header (black bar with "Organizations" title and "Create" button)
- Data grid with columns: Organization Info, Status, Role, Members, Applications, Last Activity
- Filter section (search input, status dropdown)
- Pagination controls

**Screenshot name:** `organizations-list-full.png`

### 2. Organization Detail Page
**URL:** `http://localhost:4200/customers/organizations/{id}`

**What to capture:**
- Hero section with logo and organization name
- Tab navigation (Overview, Members, Settings, Delete)
- Overview tab content
- Metadata section (ID, Created, Last Updated)

**Screenshot names:**
- `organization-detail-overview.png`
- `organization-detail-members.png`
- `organization-detail-settings.png`

### 3. Applications List
**URL:** `http://localhost:4200/customers/applications`

**What to capture:**
- Similar to organizations list
- Note any differences in columns or layout

**Screenshot name:** `applications-list-full.png`

### 4. Dashboard
**URL:** `http://localhost:4200/dashboard`

**What to capture:**
- Hero section
- CTA cards (different severity levels: low/green, medium/yellow, high/orange)
- Card layout and spacing

**Screenshot name:** `dashboard-full.png`

### 5. Individual Components

#### Status Badges
**Where:** Any list page, look for status column

**Capture:**
- Active status (green)
- Pending status (yellow)
- Suspended/Inactive status (red)
- Different sizes if visible

**Screenshot name:** `status-badges.png`

#### Buttons
**Where:** Card headers, forms

**Capture:**
- Primary button (red)
- Secondary button (gray)
- Card header button (white border)
- Outline button
- Disabled states

**Screenshot name:** `buttons-all-variants.png`

#### Form Inputs
**Where:** Settings pages, create/edit forms

**Capture:**
- Text input (normal state)
- Text input (focused state)
- Text input with icon
- Select dropdown
- Error state

**Screenshot name:** `form-inputs.png`

#### Cards
**Where:** Any page with cards

**Capture:**
- Card with black header
- Card with content
- Card with table (no padding)
- Card with padded content

**Screenshot name:** `cards-variants.png`

## Screenshot Best Practices

1. **Use consistent browser width:** 1400px (matches max-width)
2. **Capture at 2x resolution** for clarity
3. **Include hover states** where applicable
4. **Show both empty and populated states**
5. **Capture error states** if possible

## Browser DevTools Tips

### Capture Specific Component
```javascript
// In browser console, select element and capture
const element = document.querySelector('.orb-card');
element.scrollIntoView({ behavior: 'smooth', block: 'center' });
// Then use screenshot tool
```

### Set Viewport Size
```javascript
// Chrome DevTools > Device Toolbar
// Set to 1400x900 for consistent captures
```

### Capture Component in Isolation
```javascript
// Temporarily hide other elements
document.querySelectorAll('body > *:not(.orb-card)').forEach(el => el.style.display = 'none');
// Capture, then refresh page to restore
```

## After Capturing Screenshots

1. **Organize screenshots** in `docs/design/screenshots/` folder
2. **Update component-inventory.md** with screenshot references
3. **Share with designers** along with `figma-tokens.json`
4. **Designers import tokens** using Figma Tokens Studio plugin
5. **Designers recreate components** in Figma using screenshots as reference
6. **Set up Code Connect** to link Figma components back to code

## Alternative: Use Storybook (Future Enhancement)

Consider setting up Storybook for component documentation:
```bash
npx storybook@latest init
```

This would provide:
- Interactive component playground
- Automatic screenshot generation
- Component documentation
- Easier for designers to explore components
