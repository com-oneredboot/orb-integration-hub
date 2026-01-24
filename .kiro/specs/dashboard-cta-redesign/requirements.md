# Requirements Document

## Introduction

Redesign the dashboard to be a single-column call-to-action (CTA) hub that guides users through their journey. The current two-column layout with quick actions and recent activity will be replaced with role-based CTA cards. Quick actions will move to an icon-only side navigation, and the main navigation will be restructured to include Organizations, Applications, Groups, and Users.

## Glossary

- **Dashboard**: The main landing page for authenticated users
- **CTA_Card**: A call-to-action card that prompts users to take a specific action
- **Side_Navigation**: Icon-only vertical navigation bar for quick access to common actions
- **Main_Navigation**: The primary horizontal navigation in the header/layout
- **USER**: A basic authenticated user without customer privileges
- **CUSTOMER**: A user with subscription/payment privileges who can manage organizations

## Requirements

### Requirement 1: Single-Column CTA Layout

**User Story:** As a user, I want to see a single column of actionable cards on my dashboard, so that I can quickly understand what actions I should take next.

#### Acceptance Criteria

1. WHEN the dashboard loads, THE Dashboard SHALL display CTA cards in a single centered column
2. THE Dashboard SHALL remove the two-column layout (left pane / right pane)
3. THE Dashboard SHALL remove the Recent Activity card entirely
4. THE Dashboard SHALL maintain the page header with logo and status badge
5. WHEN viewing on mobile devices, THE Dashboard SHALL stack cards vertically with appropriate spacing

### Requirement 2: Account Health CTA Cards

**User Story:** As a user with incomplete profile setup, I want to see individual CTA cards for each incomplete item, so that I can easily complete my account setup.

#### Acceptance Criteria

1. WHEN a user has an incomplete profile name, THE Dashboard SHALL display a "Complete Your Profile" CTA card
2. WHEN a user has unverified email, THE Dashboard SHALL display a "Verify Your Email" CTA card
3. WHEN a user has unverified phone, THE Dashboard SHALL display a "Verify Your Phone" CTA card
4. WHEN a user has incomplete MFA setup, THE Dashboard SHALL display a "Secure Your Account" CTA card
5. WHEN a user clicks a health CTA card, THE Dashboard SHALL navigate to the appropriate setup flow
6. WHEN all health items are complete, THE Dashboard SHALL not display any health CTA cards

### Requirement 3: USER Role CTA Cards

**User Story:** As a USER, I want to see cards explaining the benefits of upgrading to CUSTOMER, so that I understand the value proposition.

#### Acceptance Criteria

1. WHEN a USER views the dashboard, THE Dashboard SHALL display benefit CTA cards promoting CUSTOMER upgrade
2. THE Dashboard SHALL display at least one card highlighting organization management benefits
3. THE Dashboard SHALL display at least one card highlighting integration capabilities
4. WHEN a USER clicks an upgrade CTA card, THE Dashboard SHALL navigate to the upgrade flow (placeholder for now)

### Requirement 4: CUSTOMER Role CTA Cards

**User Story:** As a CUSTOMER, I want to see relevant next-step CTA cards, so that I can continue building out my workspace.

#### Acceptance Criteria

1. WHEN a CUSTOMER views the dashboard, THE Dashboard SHALL display CUSTOMER-specific CTA cards
2. IF a CUSTOMER has no organizations, THE Dashboard SHALL display a "Create Your First Organization" CTA card
3. IF a CUSTOMER has organizations but no applications, THE Dashboard SHALL display an "Add Your First Application" CTA card
4. WHEN a CUSTOMER clicks a CTA card, THE Dashboard SHALL navigate to the appropriate creation/management flow

### Requirement 5: Icon-Only Side Navigation

**User Story:** As a user, I want quick access to common actions via an icon-only side navigation, so that I can navigate efficiently without cluttering the main content area.

#### Acceptance Criteria

1. THE Side_Navigation SHALL display as a vertical bar of icons on the left side of the dashboard
2. THE Side_Navigation SHALL include icons for: Profile, Security Settings, Payment Methods, Integrations
3. WHEN a user hovers over a side navigation icon, THE Side_Navigation SHALL display a tooltip with the action name
4. WHEN a user clicks a side navigation icon, THE Side_Navigation SHALL navigate to the appropriate page
5. THE Side_Navigation SHALL be visible only on the dashboard page (not site-wide)
6. WHEN viewing on mobile devices, THE Side_Navigation SHALL collapse or reposition appropriately

### Requirement 6: Main Navigation Updates

**User Story:** As a CUSTOMER, I want to access Organizations, Applications, Groups, and Users from the main navigation, so that I can manage my workspace efficiently.

#### Acceptance Criteria

1. WHEN a CUSTOMER is authenticated, THE Main_Navigation SHALL display "Organizations" menu item
2. WHEN a CUSTOMER is authenticated, THE Main_Navigation SHALL display "Applications" menu item
3. WHEN a CUSTOMER is authenticated, THE Main_Navigation SHALL display "Groups" menu item
4. WHEN a CUSTOMER is authenticated, THE Main_Navigation SHALL display "Users" menu item
5. WHEN a USER (non-customer) is authenticated, THE Main_Navigation SHALL NOT display Organizations, Applications, Groups, or Users menu items
6. THE Main_Navigation SHALL maintain existing items: Dashboard, Profile, Sign Out

### Requirement 7: CTA Card Visual Design

**User Story:** As a user, I want CTA cards to be visually distinct and actionable, so that I can easily identify and interact with them.

#### Acceptance Criteria

1. THE CTA_Card SHALL display an icon representing the action
2. THE CTA_Card SHALL display a title describing the action
3. THE CTA_Card SHALL display a brief description of the benefit or next step
4. THE CTA_Card SHALL display a primary action button
5. THE CTA_Card SHALL use the orb-red color for primary action buttons
6. WHEN a user hovers over a CTA card, THE CTA_Card SHALL provide visual feedback (subtle elevation/shadow)
