# Page Wrapper Components

This directory contains reusable page wrapper components that enforce standard structure and styling for pages rendered within layout shells.

## Purpose

Page wrappers solve the problem of inconsistent page structure across features. Instead of each feature page implementing its own layout logic, they use a standard wrapper that ensures:

- Consistent dimensions (max-width, padding, margins)
- Correct element ordering (hero → breadcrumbs → tabs → content)
- Proper spacing and responsive behavior
- No layout shifts when navigating between pages

## Architecture

```
layouts/
├── user-layout/          (shell with <router-outlet>)
├── platform-layout/      (shell for marketing)
└── pages/                (page wrappers used IN shells)
    ├── user-page/        (wrapper for user-layout pages)
    └── README.md
```

## Available Page Wrappers

### UserPageComponent

Standard page wrapper for all pages rendered within `user-layout` (authenticated user pages).

**Location:** `layouts/pages/user-page/`

**Structure:**
1. Hero Split (optional) - sits outside content section
2. Content Section (required) - max-width: 1400px, centered
   - Breadcrumbs (required) - first element
   - Tab Navigation (optional) - after breadcrumbs
   - Main Content (projected) - your page content

**Usage:**

```typescript
import { UserPageComponent } from '../../../layouts/pages/user-page/user-page.component';

@Component({
  selector: 'app-my-feature',
  standalone: true,
  imports: [UserPageComponent, /* other imports */],
  template: `
    <app-user-page
      [heroTitle]="'My Feature'"
      [heroSubtitle]="'Feature description'"
      [breadcrumbItems]="breadcrumbItems"
      [tabs]="tabs"
      [activeTab]="activeTab"
      (tabChange)="onTabChange($event)">
      
      <!-- Your page content here -->
      <div class="orb-card">
        <!-- Feature-specific content -->
      </div>
      
    </app-user-page>
  `
})
export class MyFeatureComponent {
  breadcrumbItems = [
    { label: 'Home', route: '/' },
    { label: 'My Feature', route: null }
  ];
  
  tabs = [
    { id: 'overview', label: 'Overview', icon: 'info-circle' }
  ];
  
  activeTab = 'overview';
  
  onTabChange(tabId: string): void {
    this.activeTab = tabId;
  }
}
```

**Inputs:**

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `showHero` | boolean | `true` | Whether to show hero section |
| `heroLogo` | string | `'assets/orb-logo.jpg'` | Logo image source |
| `heroLogoAlt` | string | `'Orb Integration Hub Logo'` | Logo alt text |
| `heroTitle` | string | `''` | Main title (required if showHero) |
| `heroSubtitle` | string | `''` | Subtitle/description |
| `showHeroButtons` | boolean | `false` | Show custom buttons slot |
| `breadcrumbItems` | BreadcrumbItem[] | `[]` | Breadcrumb navigation items |
| `tabs` | TabConfig[] | `[]` | Tab configuration |
| `activeTab` | string | `''` | Active tab ID |

**Outputs:**

| Output | Type | Description |
|--------|------|-------------|
| `tabChange` | EventEmitter<string> | Emits when tab is changed |

**Content Projection:**

```html
<!-- Default content slot -->
<app-user-page>
  <div>Your main content here</div>
</app-user-page>

<!-- Hero buttons slot -->
<app-user-page [showHeroButtons]="true">
  <div heroButtons>
    <button>Custom Button</button>
  </div>
  
  <div>Your main content here</div>
</app-user-page>
```

## When to Create a New Page Wrapper

Create a new page wrapper when:

1. You have a new layout shell (e.g., `admin-layout`)
2. The new shell requires a different page structure
3. The structure is significantly different from existing wrappers

**Do NOT create a new wrapper for:**
- Minor variations in content (use inputs/content projection)
- Feature-specific styling (use feature component styles)
- One-off pages (use existing wrapper with customization)

## Standards

All page wrappers MUST:

1. Enforce consistent max-width (1400px for user pages)
2. Enforce consistent padding/margins
3. Support breadcrumbs (required for navigation)
4. Support optional hero section
5. Support optional tab navigation
6. Use content projection for main content
7. Be fully responsive (mobile, tablet, desktop)
8. Include comprehensive unit tests

## Testing

Each page wrapper must have:

- Component creation test
- Hero section visibility tests
- Breadcrumb rendering tests
- Tab navigation tests
- Layout structure tests (element ordering)
- Content projection tests
- Responsive behavior tests

## Migration Guide

To migrate an existing page to use UserPageComponent:

1. **Import the component:**
   ```typescript
   import { UserPageComponent } from '../../../layouts/pages/user-page/user-page.component';
   ```

2. **Wrap your content:**
   ```html
   <app-user-page
     [heroTitle]="'Your Title'"
     [breadcrumbItems]="breadcrumbItems">
     
     <!-- Move your existing content here -->
     
   </app-user-page>
   ```

3. **Remove custom wrappers:**
   - Delete custom `page-content` divs
   - Delete custom `content-wrapper` divs
   - Delete custom max-width/padding styles

4. **Update breadcrumbs:**
   - Remove custom breadcrumb containers
   - Pass breadcrumb items as input

5. **Update tabs (if applicable):**
   - Remove custom tab navigation
   - Pass tabs as input
   - Handle tabChange event

6. **Test:**
   - Verify no layout shifts
   - Verify responsive behavior
   - Verify breadcrumbs and tabs work

## References

- **Canonical Implementation:** `features/customers/organizations/components/organizations-list/`
- **Design Spec:** `.kiro/specs/user-layout-standardization/requirements.md`
- **Frontend Standards:** `.kiro/steering/frontend-components.md`
