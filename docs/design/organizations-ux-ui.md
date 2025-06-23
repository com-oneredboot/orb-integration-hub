# Organizations Feature - UX/UI Design Specification

## Overview
Design specification for organizations feature integrated into the customer dashboard and applications management interface. Organizations are displayed as widgets for CUSTOMER users only.

## Design Principles

### Core UX Principles
- **Clear Hierarchy**: Users understand their role and organization context at all times
- **Seamless Context Switching**: Quick access to switch between organizations
- **Progressive Disclosure**: Complex features revealed as needed
- **Consistent Visual Language**: Follows established dashboard and profile patterns
- **Accessibility First**: WCAG 2.1 AA compliance throughout

### Visual Design System
Based on existing dashboard and profile components:
- Card-based layouts with consistent shadows and borders
- Primary action buttons with clear hierarchy
- Status badges with color-coded states
- Icon-driven navigation with FontAwesome consistency
- Form validation with inline error states

## 1. User Dashboard Integration (CUSTOMER Users Only)

### 1.1 Organizations Widget on User Dashboard
*Only displayed for users with CUSTOMER group membership*

```
┌─────────────────────────────────────────────────────────────┐
│ <!-- Existing Dashboard Content --> 
│ <!-- Account Health Card -->
│ <!-- Recent Activity Card -->
│
│ <!-- NEW: Organizations Widget (CUSTOMER users only) -->
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🏢 Your Organizations                 [Edit Organizations] │ │
│ │                                                         │ │
│ │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │ │
│ │ │ Acme Corp   │ │ Beta Tech   │ │ DevCorp     │        │ │
│ │ │ Owner       │ │ Admin       │ │ Viewer      │        │ │
│ │ │ 15 members  │ │ 8 members   │ │ 25 members  │        │ │
│ │ │ [Active]    │ │ [Active]    │ │ [Pending]   │        │ │
│ │ └─────────────┘ └─────────────┘ └─────────────┘        │ │
│ │                                                         │ │
│ │ Manage your organizations, members, and applications    │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 2. Customer Applications Tab (/applications route - CUSTOMER only)

### 2.1 Applications Page with Organizations Widget
*Accessible only to users with CUSTOMER group membership*

```
┌─────────────────────────────────────────────────────────────┐
│ Applications Management                     [Create App] [⚙] │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Organizations                          [+ Create Organization] │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Name          │ Role    │ Status │ Members │ Apps │ Actions │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Acme Corp     │ [OWNER] │ Active │   15    │  12  │ [Manage] │
│ │ Beta Industries │ [ADMIN] │ Active │    8    │   5  │ [Manage] │
│ │ Gamma Solutions │ [VIEW]  │ Active │   25    │  18  │ [View]  │
│ │ Dev Team Co   │ [ADMIN] │ Pending│    3    │   1  │ [View]  │
│ │ Test Org      │ [VIEW]  │ Inactive│   12    │   8  │ [---]   │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Showing 5 of 8 organizations                      [1][2][3] │
└─────────────────────────────────────────────────────────────┘

<!-- Future widgets will be added below -->
┌─────────────────────────────────────────────────────────────┐
│ Future Widget Placeholder                                   │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Organization Settings (Owner/Admin Only)
```
┌─────────────────────────────────────────────────────────────┐
│ Organization Settings                                       │
│                                                             │
│ ┌─ Basic Information ──────────────────────────────────────┐ │
│ │ Organization Name: [Acme Corp                         ] │ │
│ │ Description:       [Software development company     ] │ │
│ │ Industry:          [Technology ▼                     ] │ │
│ │ Website:           [https://acme.com                 ] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─ Security & Compliance ──────────────────────────────────┐ │
│ │ □ Require MFA for all members                          │ │
│ │ □ Enable audit logging                                 │ │
│ │ □ Restrict invitation domains                          │ │
│ │ Allowed Domains: [@acme.com, @contractor.acme.com   ] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─ Danger Zone ────────────────────────────────────────────┐ │
│ │ [Transfer Ownership] [Delete Organization]             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Cancel] [Save Changes]                                     │
└─────────────────────────────────────────────────────────────┘
```

## 2. Context Switching Interface

### 2.1 Organization Selector (Header Component)
```
┌─────────────────────────────────────────────────────────────┐
│ Current Context: [Acme Corp ▼]                             │
│                                                             │
│ ┌─ Switch Organization ────────────────────────────────────┐ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ ● Acme Corp (Owner) - Current                      │ │ │
│ │ │ ○ Beta Industries (Administrator)                  │ │ │
│ │ │ ○ Gamma Solutions (Viewer)                         │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │                                                         │ │
│ │ [+ Create New Organization] [Manage Organizations]     │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Context Switch Confirmation
```
┌─────────────────────────────────────────────────────────────┐
│ Switch Organization Context                                 │
│                                                             │
│ You are switching from:                                     │
│ Acme Corp (Owner)                                          │
│                                                             │
│ To:                                                         │
│ Beta Industries (Administrator)                             │
│                                                             │
│ This will change your dashboard view and available          │
│ actions based on your role in the new organization.        │
│                                                             │
│ [Cancel] [Switch Organization]                              │
└─────────────────────────────────────────────────────────────┘
```

## 3. Member Management & Invitation Workflows

### 3.1 Members List
```
┌─────────────────────────────────────────────────────────────┐
│ Organization Members                    [+ Invite Member]   │
│                                                             │
│ [Search members...] [Filter: All ▼] [Role: All ▼]         │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Name          │ Email              │ Role    │ Status   │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ John Smith    │ john@acme.com     │ [ADMIN] │ Active   │ │
│ │ Jane Doe      │ jane@acme.com     │ [VIEW]  │ Active   │ │
│ │ Bob Wilson    │ bob@contractor... │ [VIEW]  │ Pending  │ │
│ │ Alice Brown   │ alice@acme.com    │ [ADMIN] │ Inactive │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Showing 4 of 15 members                           [1][2][3] │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Invite Member Form
```
┌─────────────────────────────────────────────────────────────┐
│ Invite New Member                                     [×]   │
│                                                             │
│ Email Address *                                             │
│ [user@example.com                                        ]  │
│                                                             │
│ Role *                                                      │
│ ○ Administrator - Can manage applications and invite users  │
│ ● Viewer - Can view applications and data (read-only)      │
│                                                             │
│ Personal Message (Optional)                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Hi! I'd like to invite you to join our organization    │ │
│ │ on the Integration Hub platform...                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ □ Send welcome email immediately                            │
│ □ Require email verification before access                 │
│                                                             │
│ [Cancel] [Send Invitation]                                  │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Invitation Status Tracking
```
┌─────────────────────────────────────────────────────────────┐
│ Pending Invitations                                         │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ bob@contractor.acme.com                                 │ │
│ │ Invited as VIEWER • 2 days ago                          │ │
│ │ [Resend] [Cancel] [Change Role]                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ sarah@partner.com                                       │ │
│ │ Invited as ADMINISTRATOR • 5 hours ago                  │ │
│ │ [Resend] [Cancel] [Change Role]                         │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 4. Mobile-Responsive Design

### 4.1 Mobile Organization Dashboard
```
┌─────────────────────┐
│ ☰ Integration Hub   │
│                     │
│ [Acme Corp ▼]      │
│ Administrator       │
│                     │
│ ┌─ Quick Actions ─┐ │
│ │ [👥] Members    │ │
│ │ [📱] Apps       │ │
│ │ [⚙️] Settings  │ │
│ │ [📊] Reports    │ │
│ └─────────────────┘ │
│                     │
│ ┌─ Health Status ─┐ │
│ │ ✅ Setup        │ │
│ │ ⚠️ 3 Pending   │ │
│ │ ✅ Security     │ │
│ └─────────────────┘ │
│                     │
│ ┌─ Recent ────────┐ │
│ │ User invited... │ │
│ │ App created...  │ │
│ │ [View All]      │ │
│ └─────────────────┘ │
└─────────────────────┘
```

### 4.2 Mobile Organization List
```
┌─────────────────────┐
│ Organizations  [+]  │
│                     │
│ [Search...]         │
│                     │
│ ┌─ Acme Corp ─────┐ │
│ │ Owner - Active  │ │
│ │ 15 members, 12 apps │
│ │ [Enter] [Manage]│ │
│ └─────────────────┘ │
│                     │
│ ┌─ Beta Industries┐ │
│ │ Admin - Active  │ │
│ │ 8 members, 5 apps │
│ │ [Enter] [Manage]│ │
│ └─────────────────┘ │
│                     │
│ ┌─ Gamma Solutions┐ │
│ │ Viewer - Active │ │
│ │ 25 members, 18 apps │
│ │ [Enter]         │ │
│ └─────────────────┘ │
└─────────────────────┘
```

### 4.3 Mobile Member Management
```
┌─────────────────────┐
│ Members      [+ Add]│
│                     │
│ [Search...]         │
│                     │
│ ┌─ John Smith ────┐ │
│ │ john@acme.com   │ │
│ │ Administrator   │ │
│ │ Active          │ │
│ └─────────────────┘ │
│                     │
│ ┌─ Jane Doe ──────┐ │
│ │ jane@acme.com   │ │
│ │ Viewer          │ │
│ │ Active          │ │
│ └─────────────────┘ │
│                     │
│ ┌─ Bob Wilson ────┐ │
│ │ bob@contractor  │ │
│ │ Viewer          │ │
│ │ Pending         │ │
│ └─────────────────┘ │
└─────────────────────┘
```

## 5. Design System Components

### 5.1 Organization Status Badge
```html
<app-status-badge 
  status="ACTIVE" 
  type="organization"
  [showIcon]="true"
  [showLabel]="true">
</app-status-badge>
```

**States:**
- `ACTIVE` - Green with check circle
- `INACTIVE` - Gray with pause circle  
- `PENDING` - Yellow with clock
- `SUSPENDED` - Red with exclamation triangle
- `DELETED` - Red with trash

### 5.2 Role Badge Component
```html
<span class="role-badge role-badge--administrator">
  <fa-icon icon="shield-alt" class="role-badge__icon"></fa-icon>
  Administrator
</span>
```

**Variants:**
- `administrator` - Blue with shield icon
- `viewer` - Green with eye icon
- `owner` - Gold with crown icon (display only)

### 5.3 Organization Table Component
```html
<table class="org-table">
  <thead class="org-table__header">
    <tr>
      <th class="org-table__th org-table__th--name">Organization</th>
      <th class="org-table__th org-table__th--role">Your Role</th>
      <th class="org-table__th org-table__th--status">Status</th>
      <th class="org-table__th org-table__th--members">Members</th>
      <th class="org-table__th org-table__th--apps">Apps</th>
      <th class="org-table__th org-table__th--actions">Actions</th>
    </tr>
  </thead>
  <tbody class="org-table__body">
    <tr class="org-table__row" *ngFor="let org of organizations">
      <td class="org-table__td org-table__td--name">
        <div class="org-table__name-cell">
          <span class="org-table__org-name">{{ org.name }}</span>
          <span class="org-table__org-description" *ngIf="org.description">
            {{ org.description }}
          </span>
        </div>
      </td>
      <td class="org-table__td org-table__td--role">
        <span class="role-badge" [class]="getRoleBadgeClass(org.userRole)">
          <fa-icon [icon]="getRoleIcon(org.userRole)"></fa-icon>
          {{ org.userRole }}
        </span>
      </td>
      <td class="org-table__td org-table__td--status">
        <app-status-badge [status]="org.status" type="organization"></app-status-badge>
      </td>
      <td class="org-table__td org-table__td--members">{{ org.memberCount }}</td>
      <td class="org-table__td org-table__td--apps">{{ org.applicationCount }}</td>
      <td class="org-table__td org-table__td--actions">
        <div class="org-table__actions">
          <button class="org-table__action org-table__action--primary" 
                  [disabled]="org.status !== 'ACTIVE'">
            Enter
          </button>
          <button class="org-table__action org-table__action--secondary"
                  *ngIf="canManage(org)">
            Manage
          </button>
        </div>
      </td>
    </tr>
  </tbody>
</table>
```

## 6. Accessibility Requirements

### 6.1 Keyboard Navigation
- Tab order follows logical flow: header → context switcher → main actions → content
- All interactive elements accessible via keyboard
- Context switcher opens with Enter/Space, navigates with arrows
- Escape key closes modals and dropdowns

### 6.2 Screen Reader Support
- Organization context announced on page load
- Role changes announced when switching context
- Status updates announced via live regions
- Descriptive labels for all form controls

### 6.3 Visual Accessibility
- Minimum 4.5:1 contrast ratio for all text
- Color not the only indicator for status (icons included)
- Focus indicators visible for all interactive elements
- Error states clearly indicated with icons and text

## 7. Interaction Patterns

### 7.1 Context Switching Flow
1. User clicks organization name in header
2. Dropdown shows all organizations with current highlighted
3. User selects new organization
4. Confirmation modal appears (if significant permission change)
5. Context switches, page refreshes with new organization data
6. Success message confirms switch

### 7.2 Invitation Flow
1. Administrator clicks "Invite Member"
2. Modal opens with email and role selection
3. Form validation ensures valid email and role
4. Invitation sent, pending invitations list updates
5. Email sent to invitee with organization context
6. Invitee accepts, appears in active members

### 7.3 Permission Management
- Organization owners see all management options
- Administrators see member and app management
- Viewers see read-only dashboard and lists
- Role badges clearly indicate permissions
- Disabled buttons show tooltips explaining restrictions

## 8. Error Handling & Edge Cases

### 8.1 Network Errors
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Connection Error                                         │
│                                                             │
│ Unable to load organization data. Please check your        │
│ internet connection and try again.                          │
│                                                             │
│ [Retry] [Go Offline]                                        │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Permission Denied
```
┌─────────────────────────────────────────────────────────────┐
│ 🔒 Access Restricted                                        │
│                                                             │
│ You don't have permission to perform this action.          │
│ Contact your organization administrator for access.         │
│                                                             │
│ [Contact Admin] [Go Back]                                   │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 Empty States
```
┌─────────────────────────────────────────────────────────────┐
│ No Organizations Found                                      │
│                                                             │
│ 🏢 You're not a member of any organizations yet.           │
│                                                             │
│ Get started by creating your first organization or         │
│ contact someone to invite you to theirs.                   │
│                                                             │
│ [Create Organization] [Learn More]                          │
└─────────────────────────────────────────────────────────────┘
```

## 9. Performance Considerations

### 9.1 Lazy Loading
- Organization lists paginated (50 per page)
- Member lists paginated (25 per page)
- Application data loaded on demand
- Images and avatars lazy loaded

### 9.2 Caching Strategy
- Organization context cached in localStorage
- Member lists cached for 5 minutes
- Real-time updates for invitation status
- Optimistic updates for role changes

### 9.3 Loading States
- Skeleton screens for initial page loads
- Inline spinners for action feedback
- Progress indicators for multi-step processes
- Graceful degradation for slow connections

---

This design specification provides a comprehensive foundation for implementing the organizations feature with consistent UX patterns, accessibility compliance, and mobile-responsive design that integrates seamlessly with the existing application architecture.