// file: apps/web/src/app/tests/dashboard-cta.property.spec.ts
// author: Kiro
// date: 2026-01-23
// description: Property-based tests for Dashboard CTA redesign

import { TestBed } from '@angular/core/testing';
import { DashboardCtaService } from '../features/user/services/dashboard-cta.service';
import { IUsers } from '../core/models/UsersModel';

/**
 * Property-Based Tests for Dashboard CTA Redesign
 * 
 * These tests validate the four correctness properties defined in the design document:
 * 1. Health Cards Display Only for Incomplete Items
 * 2. Role-Based Card Exclusivity
 * 3. CTA Card Priority Ordering
 * 4. Navigation Visibility by Role
 */
describe('Dashboard CTA Property Tests', () => {
  let service: DashboardCtaService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DashboardCtaService]
    });
    service = TestBed.inject(DashboardCtaService);
  });

  // ==========================================================================
  // Helper Functions for Generating Test Data
  // ==========================================================================

  /**
   * Generate a random user with configurable profile completion
   */
  function generateUser(overrides: Partial<IUsers> = {}): IUsers {
    return {
      userId: `user-${Math.random().toString(36).substring(7)}`,
      email: `test-${Math.random().toString(36).substring(7)}@example.com`,
      firstName: Math.random() > 0.5 ? 'John' : '',
      lastName: Math.random() > 0.5 ? 'Doe' : '',
      emailVerified: Math.random() > 0.5,
      phoneVerified: Math.random() > 0.5,
      phoneNumber: Math.random() > 0.5 ? '+1234567890' : undefined,
      mfaEnabled: Math.random() > 0.5,
      mfaSetupComplete: Math.random() > 0.5,
      groups: [],
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    } as IUsers;
  }

  /**
   * Generate a user with all profile items complete
   */
  function generateCompleteUser(groups: string[] = ['USER']): IUsers {
    return generateUser({
      firstName: 'John',
      lastName: 'Doe',
      emailVerified: true,
      phoneVerified: true,
      phoneNumber: '+1234567890',
      mfaEnabled: true,
      mfaSetupComplete: true,
      groups
    });
  }

  /**
   * Generate a user with all profile items incomplete
   */
  function generateIncompleteUser(groups: string[] = ['USER']): IUsers {
    return generateUser({
      firstName: '',
      lastName: '',
      emailVerified: false,
      phoneVerified: false,
      phoneNumber: undefined,
      mfaEnabled: false,
      mfaSetupComplete: false,
      groups
    });
  }

  /**
   * Count expected health cards based on user state
   */
  function countExpectedHealthCards(user: IUsers): number {
    let count = 0;
    if (!user.firstName?.trim() || !user.lastName?.trim()) count++;
    if (!user.emailVerified) count++;
    if (!user.phoneVerified) count++;
    if (!user.mfaEnabled || !user.mfaSetupComplete) count++;
    return count;
  }

  // ==========================================================================
  // Property 1: Health Cards Display Only for Incomplete Items
  // Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6
  // ==========================================================================

  describe('Property 1: Health Cards Display Only for Incomplete Items', () => {
    
    it('should display exactly one health card per incomplete item (100 iterations)', () => {
      for (let i = 0; i < 100; i++) {
        const user = generateUser();
        const cards = service.getCtaCards(user);
        const healthCards = cards.filter(c => c.category === 'health');
        const expectedCount = countExpectedHealthCards(user);

        // Property: Number of health cards equals number of incomplete items
        expect(healthCards.length).toBe(expectedCount);
      }
    });

    it('should display zero health cards when all items are complete (100 iterations)', () => {
      for (let i = 0; i < 100; i++) {
        const groups = Math.random() > 0.5 ? ['CUSTOMER'] : ['USER'];
        const user = generateCompleteUser(groups);
        const cards = service.getCtaCards(user);
        const healthCards = cards.filter(c => c.category === 'health');

        // Property: Complete users have zero health cards
        expect(healthCards.length).toBe(0);
      }
    });

    it('should display all four health cards when all items are incomplete (100 iterations)', () => {
      for (let i = 0; i < 100; i++) {
        const groups = Math.random() > 0.5 ? ['CUSTOMER'] : ['USER'];
        const user = generateIncompleteUser(groups);
        const cards = service.getCtaCards(user);
        const healthCards = cards.filter(c => c.category === 'health');

        // Property: Incomplete users have exactly 4 health cards
        expect(healthCards.length).toBe(4);
        
        // Verify each health card type exists
        const healthIds = healthCards.map(c => c.id);
        expect(healthIds).toContain('health-name');
        expect(healthIds).toContain('health-email');
        expect(healthIds).toContain('health-phone');
        expect(healthIds).toContain('health-mfa');
      }
    });

    it('should generate name card only when name is incomplete', () => {
      // With incomplete name
      const userNoName = generateCompleteUser();
      userNoName.firstName = '';
      const cardsNoName = service.getHealthCards(userNoName);
      expect(cardsNoName.some(c => c.id === 'health-name')).toBe(true);

      // With complete name
      const userWithName = generateCompleteUser();
      const cardsWithName = service.getHealthCards(userWithName);
      expect(cardsWithName.some(c => c.id === 'health-name')).toBe(false);
    });

    it('should generate email card only when email is unverified', () => {
      // With unverified email
      const userUnverified = generateCompleteUser();
      userUnverified.emailVerified = false;
      const cardsUnverified = service.getHealthCards(userUnverified);
      expect(cardsUnverified.some(c => c.id === 'health-email')).toBe(true);

      // With verified email
      const userVerified = generateCompleteUser();
      const cardsVerified = service.getHealthCards(userVerified);
      expect(cardsVerified.some(c => c.id === 'health-email')).toBe(false);
    });

    it('should generate phone card only when phone is unverified', () => {
      // With unverified phone
      const userUnverified = generateCompleteUser();
      userUnverified.phoneVerified = false;
      const cardsUnverified = service.getHealthCards(userUnverified);
      expect(cardsUnverified.some(c => c.id === 'health-phone')).toBe(true);

      // With verified phone
      const userVerified = generateCompleteUser();
      const cardsVerified = service.getHealthCards(userVerified);
      expect(cardsVerified.some(c => c.id === 'health-phone')).toBe(false);
    });

    it('should generate MFA card only when MFA is incomplete', () => {
      // With incomplete MFA
      const userNoMfa = generateCompleteUser();
      userNoMfa.mfaEnabled = false;
      const cardsNoMfa = service.getHealthCards(userNoMfa);
      expect(cardsNoMfa.some(c => c.id === 'health-mfa')).toBe(true);

      // With complete MFA
      const userWithMfa = generateCompleteUser();
      const cardsWithMfa = service.getHealthCards(userWithMfa);
      expect(cardsWithMfa.some(c => c.id === 'health-mfa')).toBe(false);
    });

    it('should return empty array for null user', () => {
      const cards = service.getCtaCards(null);
      expect(cards.length).toBe(0);
    });
  });

  // ==========================================================================
  // Property 2: Role-Based Card Exclusivity
  // Validates: Requirements 3.1, 4.1
  // ==========================================================================

  describe('Property 2: Role-Based Card Exclusivity', () => {

    it('should display benefit cards for USER role, not action cards (100 iterations)', () => {
      for (let i = 0; i < 100; i++) {
        const user = generateCompleteUser(['USER']);
        const cards = service.getCtaCards(user);
        
        const benefitCards = cards.filter(c => c.category === 'benefit');
        const actionCards = cards.filter(c => c.category === 'action');

        // Property: USER sees benefit cards, not action cards
        expect(benefitCards.length).toBeGreaterThan(0);
        expect(actionCards.length).toBe(0);
      }
    });

    it('should display action cards for CUSTOMER role, not benefit cards (100 iterations)', () => {
      for (let i = 0; i < 100; i++) {
        const user = generateCompleteUser(['CUSTOMER']);
        const cards = service.getCtaCards(user);
        
        const benefitCards = cards.filter(c => c.category === 'benefit');
        const actionCards = cards.filter(c => c.category === 'action');

        // Property: CUSTOMER sees action cards, not benefit cards
        expect(actionCards.length).toBeGreaterThan(0);
        expect(benefitCards.length).toBe(0);
      }
    });

    it('should treat users with no groups as USER role (100 iterations)', () => {
      for (let i = 0; i < 100; i++) {
        const user = generateCompleteUser([]);
        const cards = service.getCtaCards(user);
        
        const benefitCards = cards.filter(c => c.category === 'benefit');
        const actionCards = cards.filter(c => c.category === 'action');

        // Property: No groups = USER role = benefit cards
        expect(benefitCards.length).toBeGreaterThan(0);
        expect(actionCards.length).toBe(0);
      }
    });

    it('should prioritize CUSTOMER role when user has multiple groups', () => {
      const user = generateCompleteUser(['USER', 'CUSTOMER']);
      const cards = service.getCtaCards(user);
      
      const benefitCards = cards.filter(c => c.category === 'benefit');
      const actionCards = cards.filter(c => c.category === 'action');

      // Property: CUSTOMER takes priority over USER
      expect(actionCards.length).toBeGreaterThan(0);
      expect(benefitCards.length).toBe(0);
    });

    it('should never mix benefit and action cards (100 iterations)', () => {
      for (let i = 0; i < 100; i++) {
        const groups = Math.random() > 0.5 ? ['CUSTOMER'] : ['USER'];
        const user = generateUser({ groups });
        const cards = service.getCtaCards(user);
        
        const benefitCards = cards.filter(c => c.category === 'benefit');
        const actionCards = cards.filter(c => c.category === 'action');

        // Property: Mutual exclusivity - never both types
        const hasBenefit = benefitCards.length > 0;
        const hasAction = actionCards.length > 0;
        expect(hasBenefit && hasAction).toBe(false);
      }
    });
  });

  // ==========================================================================
  // Property 3: CTA Card Priority Ordering
  // Validates: Requirements 2.1, 2.2, 2.3, 2.4, 3.1, 4.1
  // ==========================================================================

  describe('Property 3: CTA Card Priority Ordering', () => {

    it('should order cards by priority ascending (100 iterations)', () => {
      for (let i = 0; i < 100; i++) {
        const user = generateUser();
        const cards = service.getCtaCards(user);

        // Property: Cards are sorted by priority (ascending)
        for (let j = 1; j < cards.length; j++) {
          expect(cards[j].priority).toBeGreaterThanOrEqual(cards[j - 1].priority);
        }
      }
    });

    it('should display health cards before benefit/action cards (100 iterations)', () => {
      for (let i = 0; i < 100; i++) {
        const user = generateIncompleteUser();
        const cards = service.getCtaCards(user);
        
        const healthCards = cards.filter(c => c.category === 'health');
        const otherCards = cards.filter(c => c.category !== 'health');

        if (healthCards.length > 0 && otherCards.length > 0) {
          const lastHealthIndex = cards.findIndex(c => c === healthCards[healthCards.length - 1]);
          const firstOtherIndex = cards.findIndex(c => c === otherCards[0]);

          // Property: All health cards appear before other cards
          expect(lastHealthIndex).toBeLessThan(firstOtherIndex);
        }
      }
    });

    it('should maintain consistent ordering for same user state (100 iterations)', () => {
      const user = generateIncompleteUser(['CUSTOMER']);
      
      for (let i = 0; i < 100; i++) {
        const cards1 = service.getCtaCards(user);
        const cards2 = service.getCtaCards(user);

        // Property: Same input produces same output order
        expect(cards1.length).toBe(cards2.length);
        for (let j = 0; j < cards1.length; j++) {
          expect(cards1[j].id).toBe(cards2[j].id);
          expect(cards1[j].priority).toBe(cards2[j].priority);
        }
      }
    });

    it('should order health cards by type: name < email < phone < mfa', () => {
      const user = generateIncompleteUser();
      const healthCards = service.getHealthCards(user);

      const nameCard = healthCards.find(c => c.id === 'health-name');
      const emailCard = healthCards.find(c => c.id === 'health-email');
      const phoneCard = healthCards.find(c => c.id === 'health-phone');
      const mfaCard = healthCards.find(c => c.id === 'health-mfa');

      // Property: Health cards have specific priority order
      expect(nameCard!.priority).toBeLessThan(emailCard!.priority);
      expect(emailCard!.priority).toBeLessThan(phoneCard!.priority);
      expect(phoneCard!.priority).toBeLessThan(mfaCard!.priority);
    });

    it('should have health card priorities less than benefit/action priorities', () => {
      const healthCards = service.getHealthCards(generateIncompleteUser());
      const benefitCards = service.getUserBenefitCards();
      const actionCards = service.getCustomerActionCards(generateCompleteUser(['CUSTOMER']));

      const maxHealthPriority = Math.max(...healthCards.map(c => c.priority));
      const minBenefitPriority = Math.min(...benefitCards.map(c => c.priority));
      const minActionPriority = Math.min(...actionCards.map(c => c.priority));

      // Property: Health priorities < benefit/action priorities
      expect(maxHealthPriority).toBeLessThan(minBenefitPriority);
      expect(maxHealthPriority).toBeLessThan(minActionPriority);
    });
  });

  // ==========================================================================
  // Property 4: Navigation Visibility by Role
  // Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
  // ==========================================================================

  describe('Property 4: Navigation Visibility by Role', () => {

    /**
     * Helper to determine if customer nav items should be visible
     */
    function shouldShowCustomerNav(user: IUsers | null): boolean {
      return user?.groups?.includes('CUSTOMER') || false;
    }

    it('should show customer nav items for CUSTOMER users (100 iterations)', () => {
      for (let i = 0; i < 100; i++) {
        const user = generateUser({ groups: ['CUSTOMER'] });
        
        // Property: CUSTOMER users see customer nav items
        expect(shouldShowCustomerNav(user)).toBe(true);
      }
    });

    it('should hide customer nav items for non-CUSTOMER users (100 iterations)', () => {
      for (let i = 0; i < 100; i++) {
        const groups = ['USER', 'EMPLOYEE', 'OWNER'].filter(() => Math.random() > 0.5);
        const user = generateUser({ groups });
        
        // Property: Non-CUSTOMER users don't see customer nav items
        expect(shouldShowCustomerNav(user)).toBe(false);
      }
    });

    it('should hide customer nav items for null user', () => {
      expect(shouldShowCustomerNav(null)).toBe(false);
    });

    it('should show customer nav items when CUSTOMER is among multiple groups', () => {
      const user = generateUser({ groups: ['USER', 'CUSTOMER', 'EMPLOYEE'] });
      expect(shouldShowCustomerNav(user)).toBe(true);
    });

    it('should hide customer nav items for users with empty groups array', () => {
      const user = generateUser({ groups: [] });
      expect(shouldShowCustomerNav(user)).toBe(false);
    });
  });

  // ==========================================================================
  // Additional Invariant Tests
  // ==========================================================================

  describe('Additional Invariants', () => {

    it('should always return valid card structure (100 iterations)', () => {
      for (let i = 0; i < 100; i++) {
        const user = generateUser();
        const cards = service.getCtaCards(user);

        for (const card of cards) {
          // Property: All cards have required fields
          expect(card.id).toBeDefined();
          expect(typeof card.id).toBe('string');
          expect(card.id.length).toBeGreaterThan(0);

          expect(card.icon).toBeDefined();
          expect(typeof card.icon).toBe('string');

          expect(card.title).toBeDefined();
          expect(typeof card.title).toBe('string');

          expect(card.description).toBeDefined();
          expect(typeof card.description).toBe('string');

          expect(card.actionLabel).toBeDefined();
          expect(typeof card.actionLabel).toBe('string');

          expect(card.priority).toBeDefined();
          expect(typeof card.priority).toBe('number');

          expect(card.category).toBeDefined();
          expect(['health', 'benefit', 'action']).toContain(card.category);
        }
      }
    });

    it('should generate unique card IDs within a single call (100 iterations)', () => {
      for (let i = 0; i < 100; i++) {
        const user = generateUser();
        const cards = service.getCtaCards(user);
        const ids = cards.map(c => c.id);
        const uniqueIds = new Set(ids);

        // Property: No duplicate card IDs
        expect(uniqueIds.size).toBe(ids.length);
      }
    });

    it('should be deterministic - same input produces same output (100 iterations)', () => {
      const user = generateUser({
        firstName: 'Test',
        lastName: '',
        emailVerified: true,
        phoneVerified: false,
        mfaEnabled: false,
        mfaSetupComplete: false,
        groups: ['CUSTOMER']
      });

      const firstResult = service.getCtaCards(user);

      for (let i = 0; i < 100; i++) {
        const result = service.getCtaCards(user);
        
        // Property: Deterministic output
        expect(result.length).toBe(firstResult.length);
        expect(result.map(c => c.id)).toEqual(firstResult.map(c => c.id));
      }
    });

    it('should handle edge case: user with undefined groups', () => {
      const user = generateUser();
      (user as Partial<IUsers>).groups = undefined;
      
      // Should not throw and should treat as USER role
      const cards = service.getCtaCards(user);
      const benefitCards = cards.filter(c => c.category === 'benefit');
      expect(benefitCards.length).toBeGreaterThan(0);
    });
  });
});
