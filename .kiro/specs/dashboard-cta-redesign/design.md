# Design Document: Dashboard CTA Redesign

## Overview

This design transforms the dashboard from a two-column layout into a single-column call-to-action (CTA) hub. The dashboard becomes the central place for guiding users through their journey, with role-based CTA cards that adapt to user status and role. Quick actions move to an icon-only side navigation, and the main navigation is updated to include customer-specific menu items.

## Architecture

### Component Structure

```
DashboardComponent (refactored)
├── DashboardSideNavComponent (new)
│   └── Icon buttons with tooltips
├── DashboardCtaContainerComponent (new)
│   ├── HealthCtaCardComponent (new)
│   ├── UserBenefitCtaCardComponent (new)
│   └── CustomerCtaCardComponent (new)
└── Page Header (existing)

UserLayoutComponent (updated)
└── Main Navigation with conditional customer items
```

### Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   NgRx Store    │────▶│ DashboardComponent│────▶│  CTA Cards      │
│  (currentUser)  │     │  (determines CTAs)│     │  (role-based)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │ Side Navigation  │
                        │ (quick actions)  │
                        └──────────────────┘
```

## Components and Interfaces

### CTA Card Interface

```typescript
interface CtaCard {
  id: string;
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
  actionRoute?: string;
  actionHandler?: () => void;
  priority: number; // Lower = higher priority, displayed first
  category: 'health' | 'benefit' | 'action';
}
```

### Side Navigation Item Interface

```typescript
interface SideNavItem {
  icon: string;
  tooltip: string;
  route?: string;
  action?: () => void;
}
```

### DashboardCtaService

```typescript
class DashboardCtaService {
  getCtaCards(user: IUsers | null): CtaCard[];
  getHealthCards(user: IUsers | null): CtaCard[];
  getUserBenefitCards(): CtaCard[];
  getCustomerActionCards(user: IUsers | null): CtaCard[];
}
```

## Data Models

### CTA Card Categories

| Category | Role | Purpose |
|----------|------|---------|
| health | ALL | Incomplete profile/security items |
| benefit | USER | Upgrade promotion cards |
| action | CUSTOMER | Next-step action cards |

### Health CTA Cards

| Card ID | Condition | Title | Action |
|---------|-----------|-------|--------|
| health-name | !hasValidName | Complete Your Profile | Navigate to profile setup |
| health-email | !emailVerified | Verify Your Email | Navigate to email verification |
| health-phone | !phoneVerified | Verify Your Phone | Navigate to phone verification |
| health-mfa | !mfaComplete | Secure Your Account | Navigate to MFA setup |

### USER Benefit Cards

| Card ID | Title | Description |
|---------|-------|-------------|
| benefit-orgs | Manage Organizations | Create and manage business entities |
| benefit-integrations | Connect Integrations | Link third-party services |
| benefit-team | Build Your Team | Invite members and assign roles |

### CUSTOMER Action Cards

| Card ID | Condition | Title | Action |
|---------|-----------|-------|--------|
| action-create-org | organizations.length === 0 | Create Your First Organization | Navigate to org creation |
| action-add-app | hasOrgs && apps.length === 0 | Add Your First Application | Navigate to app creation |
| action-manage-orgs | hasOrgs | Manage Organizations | Navigate to org list |

## CTA Card Matrix

This matrix defines all CTA cards by account type, severity, and display conditions.

### Severity Levels

| Severity | Color | Use Case |
|----------|-------|----------|
| low (green) | `#7bc47f` | Informational, resource creation, benefits |
| medium (yellow) | `#f5c872` | Attention needed, expiring items, warnings |
| high (orange) | `#f5a66b` | Urgent action required, security issues |

### Health Cards (All Account Types)

These cards appear for ALL users when profile/security items are incomplete.

| ID | Icon | Title | Description | Severity | Condition |
|----|------|-------|-------------|----------|-----------|
| health-name | `user` | Complete Your Profile | Your profile is missing your name. Adding your first and last name helps personalize your experience and makes it easier for team members to identify you. | high | `!firstName \|\| !lastName` |
| health-email | `envelope` | Verify Your Email | Your email address has not been verified yet. Confirming your email ensures you receive important notifications and helps secure your account against unauthorized access. | high | `!emailVerified` |
| health-phone | `phone` | Verify Your Phone | Adding and verifying your phone number provides an additional layer of security for account recovery and enables two-factor authentication via SMS. | high | `!phoneVerified` |
| health-mfa | `shield-alt` | Secure Your Account | Multi-factor authentication (MFA) adds an extra layer of protection to your account. Enable MFA to prevent unauthorized access even if your password is compromised. | high | `!mfaEnabled \|\| !mfaSetupComplete` |

### USER Cards (Basic Users - No CUSTOMER/EMPLOYEE/OWNER Group)

These cards promote upgrading to CUSTOMER status.

| ID | Icon | Title | Description | Severity | Condition |
|----|------|-------|-------------|----------|-----------|
| benefit-orgs | `building` | Manage Organizations | Upgrade to create and manage business entities, invite team members with role-based permissions, and maintain full control over your organization's access and settings. | low | Always shown |
| benefit-integrations | `plug` | Connect Integrations | Link your favorite third-party services like Stripe, PayPal, and more. Seamlessly connect payment processors, analytics tools, and business applications to power your workflow. | low | Always shown |
| benefit-team | `users` | Build Your Team | Invite team members to collaborate on projects, assign granular roles and permissions, and work together efficiently with shared access to resources and applications. | low | Always shown |

### CUSTOMER Cards

These cards guide customers through resource creation and management.

| ID | Icon | Title | Description | Severity | Condition |
|----|------|-------|-------------|----------|-----------|
| action-create-org | `plus-circle` | Create Your First Organization | Set up your business entity to get started. Organizations allow you to manage teams, applications, and integrations all in one place with centralized billing and access control. | low | `organizations.length === 0` |
| action-manage-orgs | `building` | Manage Organizations | View and manage your existing organizations, update settings, invite or remove team members, and configure access permissions for your business entities. | low | `organizations.length > 0` |
| action-add-app | `cube` | Add Your First Application | Create an application to start integrating services. Applications provide API keys and configuration for connecting your software with our platform's powerful features. | low | `applications.length === 0` |
| action-manage-apps | `cubes` | Manage Applications | View and configure your applications, rotate API keys, update settings, and monitor usage across your integrated services. | low | `applications.length > 0` |
| action-billing-warning | `credit-card` | Update Payment Method | Your payment method is expiring soon. Update your billing information to avoid service interruption. | medium | `paymentExpiringSoon` |
| action-subscription-expired | `exclamation-triangle` | Subscription Expired | Your subscription has expired. Renew now to restore full access to all features and prevent data loss. | high | `subscriptionExpired` |

### EMPLOYEE Cards

These cards are for internal employees managing the platform.

| ID | Icon | Title | Description | Severity | Condition |
|----|------|-------|-------------|----------|-----------|
| employee-pending-reviews | `clipboard-check` | Pending Reviews | There are customer applications or organizations awaiting your review. Complete reviews to maintain service quality. | medium | `pendingReviews > 0` |
| employee-support-tickets | `headset` | Open Support Tickets | You have unresolved support tickets assigned to you. Address customer issues promptly to maintain satisfaction. | medium | `openTickets > 0` |
| employee-urgent-escalations | `fire` | Urgent Escalations | Critical issues require immediate attention. These escalations have been flagged as high priority. | high | `urgentEscalations > 0` |
| employee-system-alerts | `bell` | System Alerts | There are active system alerts that may affect platform operations. Review and acknowledge alerts. | medium | `systemAlerts > 0` |
| employee-dashboard | `chart-line` | View Analytics | Access platform analytics, user metrics, and performance dashboards to monitor system health. | low | Always shown |

### OWNER Cards

These cards are for platform owners with full administrative access.

| ID | Icon | Title | Description | Severity | Condition |
|----|------|-------|-------------|----------|-----------|
| owner-system-health | `heartbeat` | System Health Critical | One or more system components are experiencing issues. Immediate attention required to prevent service degradation. | high | `systemHealthCritical` |
| owner-security-audit | `user-shield` | Security Audit Required | A security audit is overdue. Review access logs, permissions, and security configurations to maintain compliance. | high | `securityAuditOverdue` |
| owner-pending-approvals | `stamp` | Pending Approvals | Employee or configuration changes are awaiting your approval. Review and approve to unblock team operations. | medium | `pendingApprovals > 0` |
| owner-billing-overview | `file-invoice-dollar` | Review Billing | Monthly billing summary is available. Review revenue, expenses, and financial metrics for the platform. | low | `billingReviewAvailable` |
| owner-user-management | `users-cog` | Manage Platform Users | Administer platform users, manage employee access, and configure role-based permissions across the system. | low | Always shown |
| owner-config-management | `cogs` | Platform Configuration | Access and modify platform-wide settings, feature flags, and system configurations. | low | Always shown |

### Card Priority Rules

1. **Health cards** always appear first (priority 10-40)
2. **High severity** cards appear before medium/low within each category
3. **Medium severity** cards appear after high but before low
4. **Low severity** cards appear last
5. Within same severity, cards are ordered by their defined priority value

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Health Cards Display Only for Incomplete Items

*For any* user with incomplete profile items, the dashboard SHALL display exactly one health CTA card per incomplete item, and *for any* user with all items complete, the dashboard SHALL display zero health CTA cards.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6**

### Property 2: Role-Based Card Exclusivity

*For any* USER (non-customer), the dashboard SHALL display benefit cards and SHALL NOT display customer action cards. *For any* CUSTOMER, the dashboard SHALL display customer action cards and SHALL NOT display benefit cards.

**Validates: Requirements 3.1, 4.1**

### Property 3: CTA Card Priority Ordering

*For any* set of CTA cards displayed, health cards SHALL appear before benefit/action cards, and within each category, cards SHALL be ordered by their priority value (ascending).

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 3.1, 4.1**

### Property 4: Navigation Visibility by Role

*For any* CUSTOMER user, the main navigation SHALL include Organizations, Applications, Groups, and Users items. *For any* non-CUSTOMER user, these items SHALL NOT be visible.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

## Error Handling

| Scenario | Handling |
|----------|----------|
| User data not loaded | Show loading state, no CTA cards |
| Navigation fails | Show error toast, remain on dashboard |
| Side nav tooltip fails | Graceful degradation, icon still clickable |

## Testing Strategy

### Unit Tests

- DashboardCtaService: Test card generation for each user state
- HealthCtaCardComponent: Test rendering and click handlers
- UserBenefitCtaCardComponent: Test rendering and navigation
- CustomerCtaCardComponent: Test conditional display logic
- DashboardSideNavComponent: Test tooltip display and navigation

### Property-Based Tests

- Property 1: Generate random user states, verify health card count matches incomplete items
- Property 2: Generate users with/without CUSTOMER group, verify card category exclusivity
- Property 3: Generate multiple cards, verify ordering invariant
- Property 4: Generate users with various groups, verify nav item visibility

### Integration Tests

- Full dashboard render with mock user data
- Navigation flow from CTA card to target page
- Side navigation interactions
