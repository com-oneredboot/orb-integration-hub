# Implementation Tasks: Dashboard CTA Redesign

## Tasks

- [x] 1. Create CTA Card Interfaces and Types
  - Create `CtaCard` interface with id, icon, title, description, actionLabel, actionRoute, actionHandler, priority, category
  - Create `SideNavItem` interface with icon, tooltip, route, action
  - Create `CtaCardCategory` type union: 'health' | 'benefit' | 'action'
  - Export all types from `dashboard.types.ts`
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 2. Create DashboardCtaService
  - [x] 2.1 Create service with card generation methods
    - Create `DashboardCtaService` in `apps/web/src/app/features/user/services/`
    - Implement `getCtaCards(user)` method that returns all applicable CTA cards
    - Implement `getHealthCards(user)` for incomplete profile items (name, email, phone, MFA)
    - Implement `getUserBenefitCards()` for USER role upgrade promotion
    - Implement `getCustomerActionCards(user)` for CUSTOMER role actions
    - Cards sorted by priority (health first, then benefit/action)
    - _Requirements: 2.1-2.6, 3.1-3.4, 4.1-4.4_
  - [x] 2.2 Write unit tests for DashboardCtaService
    - Test health card generation for each incomplete item
    - Test USER benefit card generation
    - Test CUSTOMER action card generation
    - Test card ordering by priority
    - _Requirements: 2.1-2.6, 3.1-3.4, 4.1-4.4_

- [x] 3. Create CTA Card Component
  - [x] 3.1 Create CtaCardComponent
    - Create standalone component with CtaCard input
    - Display icon, title, description, and action button
    - Use `orb-btn--primary` for action button (orb-red color)
    - Add hover effect with subtle elevation/shadow
    - Handle click to navigate or execute action handler
    - Full accessibility support (keyboard navigation, ARIA)
    - _Requirements: 7.1-7.6_
  - [x] 3.2 Write unit tests for CtaCardComponent
    - Test rendering of card elements
    - Test click handler navigation
    - Test accessibility attributes
    - _Requirements: 7.1-7.6_

- [x] 4. Create Dashboard Side Navigation Component
  - [x] 4.1 Create DashboardSideNavComponent
    - Create standalone component with vertical icon bar
    - Include icons: Profile, Security Settings, Payment Methods, Integrations
    - Show tooltip on hover with action name
    - Navigate to appropriate page on click
    - Responsive: collapse/reposition on mobile
    - Full accessibility support
    - _Requirements: 5.1-5.6_
  - [x] 4.2 Write unit tests for DashboardSideNavComponent
    - Test icon rendering
    - Test tooltip display
    - Test navigation on click
    - _Requirements: 5.1-5.6_

- [x] 5. Refactor Dashboard to Single-Column CTA Layout
  - [x] 5.1 Update dashboard template and component
    - Remove two-column layout (left pane / right pane)
    - Remove Recent Activity card entirely
    - Remove Quick Actions card (moved to side nav)
    - Add single centered column for CTA cards
    - Integrate `DashboardCtaService` to generate cards
    - Integrate `CtaCardComponent` to render cards
    - Integrate `DashboardSideNavComponent` on left side
    - Maintain page header with logo and status badge
    - Mobile responsive: stack cards vertically
    - _Requirements: 1.1-1.5, 2.1-2.6, 3.1-3.4, 4.1-4.4_
  - [x] 5.2 Update dashboard component tests
    - Update tests for new layout structure
    - Test CTA card rendering
    - Test side navigation integration
    - _Requirements: 1.1-1.5_

- [x] 6. Update Main Navigation for CUSTOMER Role
  - [x] 6.1 Add Groups and Users menu items
    - Add "Groups" menu item for CUSTOMER users
    - Add "Users" menu item for CUSTOMER users
    - Maintain existing Organizations and Applications items
    - Hide all four items for non-CUSTOMER users
    - Maintain existing items: Dashboard, Profile, Sign Out
    - _Requirements: 6.1-6.6_
  - [x] 6.2 Update user-layout component tests
    - Test Groups/Users visibility for CUSTOMER
    - Test hidden for non-CUSTOMER
    - _Requirements: 6.1-6.6_

- [x] 7. Add CTA Card Styles to Global Components
  - Add `.orb-cta-card` styles to `components.scss`
  - Include hover elevation/shadow effect
  - Ensure orb-red primary button styling
  - Add responsive styles for mobile
  - Add side navigation styles
  - _Requirements: 7.5, 7.6_

- [x] 8. Remove Obsolete Dashboard Components
  - Remove `UserMarketingContentComponent` (replaced by benefit CTA cards)
  - Remove `CustomerOrganizationsComponent` (replaced by action CTA cards)
  - Remove `EmployeePlaceholderComponent` (no longer needed)
  - Clean up imports and references
  - Remove obsolete property tests from dashboard-role-content spec
  - _Requirements: 1.2, 1.3_

- [x] 9. Create Property-Based Tests
  - [x] 9.1 Write property test for health cards
    - **Property 1: Health Cards Display Only for Incomplete Items**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6**
  - [x] 9.2 Write property test for role-based card exclusivity
    - **Property 2: Role-Based Card Exclusivity**
    - **Validates: Requirements 3.1, 4.1**
  - [x] 9.3 Write property test for card ordering
    - **Property 3: CTA Card Priority Ordering**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 3.1, 4.1**
  - [x] 9.4 Write property test for navigation visibility
    - **Property 4: Navigation Visibility by Role**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

- [x] 10. Integration Testing and Cleanup
  - Run full test suite, all tests pass (539 tests)
  - Run linting, no errors or warnings
  - Run type checking, no new errors (pre-existing issues unrelated to CTA redesign)
  - Build succeeds
  - Manual verification of dashboard layout (pending)
  - Verify mobile responsiveness (pending)
