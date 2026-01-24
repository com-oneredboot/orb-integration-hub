---
inclusion: fileMatch
fileMatchPattern: "apps/web/**/*.ts"
---

# Frontend Component Standards

Guidelines for creating Angular components in orb-integration-hub.

## CTA Card System

The dashboard uses a role-based CTA card system. See the full card matrix in:
#[[file:.kiro/specs/dashboard-cta-redesign/design.md]]

### CTA Card Component

Use `CtaCardComponent` for dashboard call-to-action cards. Located at `apps/web/src/app/features/user/components/dashboard/cta-card/cta-card.component.ts`.

**Card Layout:**
- Fixed dimensions: 400px × 220px
- Vertical layout: icon+title top, description middle, button bottom-right
- Severity-based colors on left border and button

**Severity Colors (muted):**
| Severity | Color | Hex | Use Case |
|----------|-------|-----|----------|
| low | Green | `#7bc47f` | Informational, resource creation |
| medium | Yellow | `#f5c872` | Attention needed, expiring items |
| high | Orange | `#f5a66b` | Urgent action, security issues |

**Usage:**

```typescript
import { CtaCardComponent } from '../cta-card/cta-card.component';
import { CtaCard } from '../dashboard.types';

@Component({
  imports: [CtaCardComponent],
})
export class DashboardComponent {
  cards: CtaCard[] = this.ctaService.getCtaCards(user);
}
```

**Template:**

```html
<app-cta-card
  [card]="card"
  (action)="onCardAction($event)">
</app-cta-card>
```

### DashboardCtaService

Use `DashboardCtaService` to generate CTA cards based on user state and role.

```typescript
import { DashboardCtaService } from '../../services/dashboard-cta.service';

// Get all cards for user (sorted by priority)
const cards = this.ctaService.getCtaCards(user);

// Get specific card types
const healthCards = this.ctaService.getHealthCards(user);
const benefitCards = this.ctaService.getUserBenefitCards();
const customerCards = this.ctaService.getCustomerActionCards(user);
```

### Card Categories by Account Type

| Account Type | Card Categories |
|--------------|-----------------|
| USER | Health cards + Benefit cards (upgrade promotions) |
| CUSTOMER | Health cards + Action cards (resource management) |
| EMPLOYEE | Health cards + Employee cards (internal tools) |
| OWNER | Health cards + Owner cards (platform admin) |

## Shared Components

### Progress Steps Component

Use `ProgressStepsComponent` for multi-step flow progress indicators. Located at `apps/web/src/app/shared/components/progress-steps/progress-steps.component.ts`.

**When to use:**
- Any multi-step wizard or flow (auth, profile setup, onboarding)
- Registration or checkout processes
- Any sequential step-based UI

**Usage:**

```typescript
import { ProgressStepsComponent, ProgressStep } from '../../shared/components/progress-steps/progress-steps.component';

@Component({
  imports: [ProgressStepsComponent],
  // ...
})
export class MyFlowComponent {
  steps: ProgressStep[] = [
    { number: 1, label: 'Step One' },
    { number: 2, label: 'Step Two' },
    { number: 3, label: 'Step Three' }
  ];
  
  currentStep = 1;
}
```

**Template:**

```html
<app-progress-steps
  [steps]="steps"
  [currentStep]="currentStep">
</app-progress-steps>
```

**Features:**
- Animated progress bar between steps
- Active step pulse animation
- Completed steps show checkmark
- Responsive (smaller on mobile, labels hidden on very small screens)
- Full accessibility support (ARIA progressbar, screen reader announcements)
- Reduced motion support

### Debug Panel Component

Use `DebugPanelComponent` for consistent debugging across pages. Located at `apps/web/src/app/shared/components/debug/debug-panel.component.ts`.

**When to use:**
- Any page with multi-step flows (auth, profile setup, onboarding)
- Pages with complex state management
- During development for troubleshooting

**Usage:**

```typescript
import { DebugPanelComponent, DebugContext } from '../../shared/components/debug/debug-panel.component';
import { DebugLogService } from '../../core/services/debug-log.service';

@Component({
  imports: [DebugPanelComponent],
  // ...
})
export class MyComponent {
  debugLogs$ = inject(DebugLogService).logs$;
  showDebug = !environment.production;

  get debugContext(): DebugContext {
    return {
      page: 'MyPage',
      step: this.currentStep,
      email: this.userEmail,
      formState: { /* form values */ },
      storeState: { /* store state */ },
      additionalSections: [
        { title: 'Custom Data', data: { /* ... */ } }
      ]
    };
  }
}
```

**Template:**

```html
<app-debug-panel
  [visible]="showDebug"
  [title]="'My Page Debug'"
  [logs$]="debugLogs$"
  [context]="debugContext">
</app-debug-panel>
```

**DebugContext interface:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| page | string | Yes | Page identifier |
| step | string | No | Current step in multi-step flow |
| email | string | No | User email if available |
| userExists | boolean | No | Whether user exists in system |
| emailVerified | boolean | No | Email verification status |
| phoneVerified | boolean | No | Phone verification status |
| mfaEnabled | boolean | No | MFA enabled status |
| status | string | No | Current status |
| formState | object | No | Current form values |
| storeState | object | No | Current store/state values |
| additionalSections | DebugSection[] | No | Custom debug sections |

## Component Patterns

### Multi-Step Flow Components

For components with multiple steps (auth, profile setup, wizards):

1. Use enum for step definitions
2. Track current step in component state
3. Include progress indicator
4. Add debug panel for development
5. Handle step transitions with proper validation

**Example structure:**

```typescript
enum FlowStep {
  STEP_ONE = 'STEP_ONE',
  STEP_TWO = 'STEP_TWO',
  COMPLETE = 'COMPLETE'
}

@Component({...})
export class MyFlowComponent {
  currentStep = FlowStep.STEP_ONE;
  
  // Include debug panel
  debugLogs$ = inject(DebugLogService).logs$;
  showDebug = !environment.production;
}
```

### Standalone Components

All new components should be standalone:

```typescript
@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, /* other imports */],
  templateUrl: './my-component.component.html',
  styleUrls: ['./my-component.component.scss']
})
```

### Form Components

Use reactive forms with proper validation:

```typescript
form = this.fb.group({
  email: ['', [Validators.required, Validators.email]],
  name: ['', [Validators.required, Validators.minLength(2)]]
});
```

### Async Observable Pattern for Store Selectors

When getting values from NgRx store selectors in async methods, **always use `take(1).toPromise()`** to ensure the Observable completes after the first emission.

**WRONG - Creates memory leaks and unpredictable behavior:**

```typescript
// ❌ DON'T DO THIS - subscription never completes
private async getCurrentUser(): Promise<IUsers | null> {
  return new Promise((resolve) => {
    this.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => resolve(user));
  });
}
```

**CORRECT - Completes after first emission:**

```typescript
// ✅ DO THIS - matches auth-flow pattern
import { take } from 'rxjs';

private async getCurrentUser(): Promise<IUsers | null> {
  return this.currentUser$.pipe(take(1)).toPromise() ?? null;
}
```

**Why this matters:**
- `takeUntil(this.destroy$)` only completes when the component is destroyed, not after getting the value
- The Promise resolves on first emission, but the subscription stays active
- This can cause memory leaks and unexpected behavior when the store updates
- `take(1)` ensures the Observable completes immediately after emitting one value

**Use this pattern for:**
- Getting current user state in async methods
- Reading any store selector value in async/await code
- Any place you need a single snapshot of Observable state

**Reference implementation:** See `auth-flow.component.ts` for consistent usage of this pattern.

## Styling Conventions

### BEM Naming

Use BEM (Block Element Modifier) for CSS classes:

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

### Use Shared Mixins

Import from `styles/mixins.scss`:

```scss
@use '../../../../../styles/variables' as v;
@use '../../../../../styles/mixins' as m;

.my-component {
  @include m.page-container;
  
  &__card {
    @include m.card;
  }
  
  &__debug {
    @include m.debug-container;
  }
}
```

### Available Mixins

| Mixin | Purpose |
|-------|---------|
| `auth-container` | Auth flow page layout |
| `page-container` | Standard page layout |
| `form-container` | Form wrapper styling |
| `card` | Card component base |
| `card-header` | Card header styling |
| `card-content` | Card content area |
| `debug-container` | Debug panel styling |
| `professional-header` | Dashboard/profile header |
| `status-badge-*` | Status indicators |

## GraphQL Mutations with Timestamps

When sending data to GraphQL mutations that include `Date` fields (like `createdAt`, `updatedAt`), you MUST convert them to Unix timestamps using `toGraphQLInput()`.

AppSync uses `AWSTimestamp` which expects Unix epoch seconds (integer), not JavaScript Date objects.

**Always use `toGraphQLInput()` before mutations:**

```typescript
import { toGraphQLInput } from '../../graphql-utils';

// WRONG - Date objects will cause "invalid value" errors
const response = await this.mutate(UsersUpdate, { input: updateInput }, authMode);

// CORRECT - Convert Date fields to Unix timestamps
const graphqlInput = toGraphQLInput(updateInput as unknown as Record<string, unknown>);
const response = await this.mutate(UsersUpdate, { input: graphqlInput }, authMode);
```

**What `toGraphQLInput()` does:**
- Converts `Date` objects to Unix timestamps (seconds since epoch)
- Recursively handles nested objects and arrays
- Leaves non-Date fields unchanged

**When receiving timestamps from GraphQL:**

```typescript
import { fromGraphQLTimestamp } from '../../graphql-utils';

// Convert AWSTimestamp back to Date
const createdDate = fromGraphQLTimestamp(response.data.createdAt);
```

## Accessibility Requirements

All components must be accessible:

- Use semantic HTML elements
- Include ARIA labels where needed
- Ensure keyboard navigation works
- Maintain focus management in modals/dialogs
- Support reduced motion preferences
- Meet WCAG 2.1 AA contrast requirements
