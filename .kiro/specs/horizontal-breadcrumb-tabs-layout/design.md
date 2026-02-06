# Design Document: Horizontal Breadcrumb and Tabs Layout

## Overview

This design implements a space-efficient horizontal layout for breadcrumbs and tabs on user pages. The solution uses CSS flexbox for responsive layout management, implements intelligent breadcrumb truncation for deep navigation paths, and maintains full backward compatibility with existing components.

### Key Design Decisions

1. **Flexbox Layout**: Use CSS flexbox with `justify-content: space-between` for horizontal alignment
2. **Truncation Algorithm**: Implement client-side truncation logic in the breadcrumb component
3. **Responsive Strategy**: Use CSS media queries at 1024px breakpoint for layout switching
4. **Component Isolation**: Keep truncation logic within breadcrumb component, layout logic in user-page
5. **No Breaking Changes**: Preserve all existing component APIs and behaviors

### Technology Stack

- **Angular 18+**: Component framework
- **TypeScript**: Type-safe implementation
- **CSS Flexbox**: Layout mechanism
- **CSS Media Queries**: Responsive breakpoints

## Architecture

### Component Hierarchy

```
UserPageComponent (layout container)
├── BreadcrumbComponent (left-aligned, with truncation)
└── TabNavigationComponent (right-aligned)
```

### Layout Strategy

**Desktop (≥1024px)**:
```
┌─────────────────────────────────────────────────────────┐
│ [Home > ... > Orgs > Acme]        [Tab1] [Tab2] [Tab3] │
└─────────────────────────────────────────────────────────┘
```

**Mobile (<1024px)**:
```
┌─────────────────────────────────────────────────────────┐
│ [Home > Organizations > Acme Corp]                      │
├─────────────────────────────────────────────────────────┤
│ [Tab1] [Tab2] [Tab3]                                    │
└─────────────────────────────────────────────────────────┘
```


## Components and Interfaces

### 1. UserPageComponent (Modified)

**Location**: `apps/web/src/app/layouts/pages/user-page/user-page.component.ts`

**Responsibilities**:
- Arrange breadcrumb and tab components in responsive layout
- Apply flexbox styling for horizontal alignment on desktop
- Switch to vertical stacking on mobile

**Template Changes**:
```html
<div class="user-page-header">
  <app-breadcrumb [items]="breadcrumbItems"></app-breadcrumb>
  <app-tab-navigation [tabs]="tabs" [activeTab]="activeTab"></app-tab-navigation>
</div>
<div class="user-page-content">
  <ng-content></ng-content>
</div>
```

**CSS Changes**:
```css
.user-page-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

@media (min-width: 1024px) {
  .user-page-header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}
```

**Interface** (unchanged):
```typescript
interface UserPageComponent {
  breadcrumbItems: BreadcrumbItem[];
  tabs: Tab[];
  activeTab: string;
}
```


### 2. BreadcrumbComponent (Modified)

**Location**: `apps/web/src/app/shared/components/breadcrumb/breadcrumb.component.ts`

**Responsibilities**:
- Render breadcrumb navigation items
- Apply truncation when item count ≥ 4
- Maintain visual consistency with current design

**Truncation Algorithm**:
```typescript
function truncateBreadcrumbs(items: BreadcrumbItem[]): BreadcrumbItem[] {
  if (items.length < 4) {
    return items;
  }
  
  const first = items[0];
  const lastTwo = items.slice(-2);
  const ellipsis: BreadcrumbItem = {
    label: '...',
    url: null,
    isEllipsis: true
  };
  
  return [first, ellipsis, ...lastTwo];
}
```

**Interface**:
```typescript
interface BreadcrumbItem {
  label: string;
  url: string | null;
  isEllipsis?: boolean;
}

interface BreadcrumbComponent {
  @Input() items: BreadcrumbItem[];
  @Input() truncationThreshold?: number; // default: 4
  
  displayItems: BreadcrumbItem[]; // computed property
}
```

**Template Pattern**:
```html
<nav class="breadcrumb">
  <ol class="breadcrumb-list">
    <li *ngFor="let item of displayItems; let last = last" class="breadcrumb-item">
      <a *ngIf="item.url && !item.isEllipsis" [routerLink]="item.url">{{ item.label }}</a>
      <span *ngIf="!item.url || item.isEllipsis" [class.ellipsis]="item.isEllipsis">{{ item.label }}</span>
      <span *ngIf="!last" class="separator">></span>
    </li>
  </ol>
</nav>
```

**CSS Changes**:
```css
.breadcrumb {
  flex-shrink: 1;
  min-width: 0; /* Allow flexbox truncation */
}

.breadcrumb-list {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ellipsis {
  color: var(--text-secondary);
  user-select: none;
}
```


### 3. TabNavigationComponent (Modified)

**Location**: `apps/web/src/app/shared/components/tab-navigation/tab-navigation.component.ts`

**Responsibilities**:
- Render horizontal tab navigation
- Maintain current tab styling and behavior
- Ensure font size matches breadcrumb component

**Interface** (unchanged):
```typescript
interface Tab {
  id: string;
  label: string;
  route?: string;
}

interface TabNavigationComponent {
  @Input() tabs: Tab[];
  @Input() activeTab: string;
  @Output() tabChange: EventEmitter<string>;
}
```

**CSS Changes**:
```css
.tab-navigation {
  flex-shrink: 0; /* Prevent tabs from shrinking */
}

.tab-list {
  display: flex;
  gap: 1rem;
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 1rem; /* Match breadcrumb font size */
}
```

## Data Models

### BreadcrumbItem

```typescript
interface BreadcrumbItem {
  /**
   * Display text for the breadcrumb item
   */
  label: string;
  
  /**
   * Navigation URL (null for non-clickable items like ellipsis)
   */
  url: string | null;
  
  /**
   * Flag indicating this is an ellipsis placeholder
   */
  isEllipsis?: boolean;
}
```

### TruncationConfig

```typescript
interface TruncationConfig {
  /**
   * Number of items that triggers truncation (default: 4)
   */
  threshold: number;
  
  /**
   * Number of items to show at the end (default: 2)
   */
  trailingItems: number;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Desktop Viewport Triggers Horizontal Layout

*For any* viewport width >= 1024px, rendering the User_Page_Layout should result in the header container having flex-direction: row (or equivalent horizontal layout).

**Validates: Requirements 1.1**

### Property 2: Truncation Threshold Enforcement

*For any* breadcrumb array, if the array length is >= 4, then applying the truncation function should produce a truncated result; if the array length is < 4, the result should be identical to the input.

**Validates: Requirements 2.1, 2.3**

### Property 3: Truncation Pattern Correctness

*For any* breadcrumb array with length >= 4, the truncated result should contain exactly 4 items: the first item from the original array, an ellipsis item (with isEllipsis: true and url: null), and the last 2 items from the original array, in that order.

**Validates: Requirements 2.2, 2.4**

### Property 4: Mobile Viewport Triggers Vertical Layout

*For any* viewport width < 1024px, rendering the User_Page_Layout should result in the header container having flex-direction: column (or equivalent vertical layout).

**Validates: Requirements 3.1**

### Property 5: Font Size Consistency

*For any* rendered User_Page_Layout, the computed font-size of the Breadcrumb_Component should equal the computed font-size of the Tab_Navigation_Component.

**Validates: Requirements 1.5, 4.5**

### Property 6: Truncation Preserves First and Last Items

*For any* breadcrumb array with length >= 4, the first item in the truncated result should have the same label and url as the first item in the original array, and the last item in the truncated result should have the same label and url as the last item in the original array.

**Validates: Requirements 2.2**

### Property 7: Separator Rendering Between Items

*For any* breadcrumb array (truncated or not), when rendered, separators should appear between all adjacent items except after the last item, including around the ellipsis if present.

**Validates: Requirements 2.5**


## Error Handling

### Invalid Input Handling

**Empty Breadcrumb Array**:
- If `items` input is empty or null, render nothing (no breadcrumb container)
- No error thrown, graceful degradation

**Invalid Viewport Width**:
- CSS media queries handle all viewport widths automatically
- No JavaScript viewport detection needed
- Layout defaults to mobile (vertical) if media query fails

**Missing Tab Data**:
- If `tabs` input is empty or null, render empty tab container
- Layout structure maintained for consistency

### Edge Cases

**Single Breadcrumb Item**:
- Display single item without separator
- No truncation applied (length < 4)

**Exactly 4 Breadcrumb Items**:
- Truncation threshold met, apply truncation
- Result: [first, ellipsis, item3, item4]

**Very Long Breadcrumb Labels**:
- CSS text-overflow: ellipsis on individual labels if needed
- Container uses min-width: 0 to allow flex shrinking

**Rapid Viewport Resizing**:
- CSS transitions handle smooth layout changes
- No JavaScript resize listeners needed
- Performance optimized through CSS-only approach

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and component integration
- **Property tests**: Verify universal properties across all inputs

### Property-Based Testing

**Library**: Use `fast-check` for TypeScript property-based testing

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number

**Property Test Coverage**:

1. **Desktop Layout Property** (Property 1)
   - Generate random viewport widths >= 1024px
   - Verify horizontal layout applied
   - Tag: `Feature: horizontal-breadcrumb-tabs-layout, Property 1`

2. **Truncation Threshold Property** (Property 2)
   - Generate random breadcrumb arrays of lengths 0-20
   - Verify truncation applied only when length >= 4
   - Tag: `Feature: horizontal-breadcrumb-tabs-layout, Property 2`

3. **Truncation Pattern Property** (Property 3)
   - Generate random breadcrumb arrays with length >= 4
   - Verify result has exactly 4 items with correct pattern
   - Tag: `Feature: horizontal-breadcrumb-tabs-layout, Property 3`

4. **Mobile Layout Property** (Property 4)
   - Generate random viewport widths < 1024px
   - Verify vertical layout applied
   - Tag: `Feature: horizontal-breadcrumb-tabs-layout, Property 4`

5. **Font Size Consistency Property** (Property 5)
   - Generate random component configurations
   - Verify font sizes match
   - Tag: `Feature: horizontal-breadcrumb-tabs-layout, Property 5`

6. **Truncation Preservation Property** (Property 6)
   - Generate random breadcrumb arrays with length >= 4
   - Verify first and last items preserved
   - Tag: `Feature: horizontal-breadcrumb-tabs-layout, Property 6`

7. **Separator Rendering Property** (Property 7)
   - Generate random breadcrumb arrays
   - Verify separator count equals item count - 1
   - Tag: `Feature: horizontal-breadcrumb-tabs-layout, Property 7`

### Unit Testing

**Unit Test Coverage**:

1. **Component Rendering**:
   - Breadcrumb renders with 0, 1, 2, 3, 4, 5 items
   - Tab navigation renders with various tab counts
   - User page layout renders with both components

2. **Edge Cases**:
   - Empty breadcrumb array
   - Null inputs
   - Single breadcrumb item
   - Exactly 4 items (threshold boundary)

3. **Integration**:
   - User page layout integrates breadcrumb and tabs correctly
   - Event handlers fire correctly
   - Router navigation works with breadcrumb links

4. **Responsive Behavior**:
   - Layout switches at 1024px breakpoint
   - Mobile layout stacks vertically
   - Desktop layout aligns horizontally

5. **API Compatibility**:
   - All existing @Input properties still work
   - All existing @Output events still fire
   - Backward compatibility with existing page implementations

### Test Organization

```
breadcrumb.component.spec.ts
├── Unit Tests
│   ├── Rendering with various item counts
│   ├── Truncation edge cases
│   └── Separator rendering
└── Property Tests
    ├── Truncation threshold property
    ├── Truncation pattern property
    ├── Truncation preservation property
    └── Separator rendering property

user-page.component.spec.ts
├── Unit Tests
│   ├── Layout rendering
│   ├── Component integration
│   └── API compatibility
└── Property Tests
    ├── Desktop layout property
    ├── Mobile layout property
    └── Font size consistency property
```

### Testing Tools

- **Angular Testing Library**: Component rendering and DOM queries
- **Jest**: Test runner and assertions
- **fast-check**: Property-based testing library
- **@angular/core/testing**: Angular-specific testing utilities

### Acceptance Testing

Manual testing checklist:
- [ ] Desktop layout displays breadcrumbs left, tabs right
- [ ] Mobile layout stacks vertically
- [ ] Breadcrumbs truncate at 4+ items with correct pattern
- [ ] Font sizes match between components
- [ ] Existing pages still work correctly
- [ ] Responsive transition is smooth
- [ ] Breadcrumb links navigate correctly
- [ ] Tab clicks work correctly
