// file: apps/web/src/app/features/user/services/dashboard-cta.service.spec.ts
// author: Kiro
// date: 2026-01-23
// description: Unit tests for DashboardCtaService

import { TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';
import { DashboardCtaService } from './dashboard-cta.service';
import { IUsers } from '../../../core/models/UsersModel';
import { IApplications } from '../../../core/models/ApplicationsModel';
import { IApplicationApiKeys } from '../../../core/models/ApplicationApiKeysModel';
import { UserStatus } from '../../../core/enums/UserStatusEnum';
import { ApplicationStatus } from '../../../core/enums/ApplicationStatusEnum';
import { ApplicationApiKeyStatus } from '../../../core/enums/ApplicationApiKeyStatusEnum';
import { Environment } from '../../../core/enums/EnvironmentEnum';

describe('DashboardCtaService', () => {
  let service: DashboardCtaService;

  // Helper to create a test user with customizable properties
  const createTestUser = (overrides: Partial<IUsers> = {}): IUsers => ({
    userId: 'test-user-id',
    cognitoId: 'test-cognito-id',
    cognitoSub: 'test-cognito-sub',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    emailVerified: true,
    phoneVerified: true,
    phoneNumber: '+1234567890',
    mfaEnabled: true,
    mfaSetupComplete: true,
    groups: ['USER'],
    status: UserStatus.Active,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DashboardCtaService]
    });
    service = TestBed.inject(DashboardCtaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCtaCards', () => {
    it('should return empty array for null user', () => {
      const cards = service.getCtaCards(null);
      expect(cards).toEqual([]);
    });

    it('should return cards sorted by priority', () => {
      const user = createTestUser({ emailVerified: false });
      const cards = service.getCtaCards(user);
      
      for (let i = 1; i < cards.length; i++) {
        expect(cards[i].priority).toBeGreaterThanOrEqual(cards[i - 1].priority);
      }
    });

    it('should return health cards before benefit cards for USER', () => {
      const user = createTestUser({ 
        emailVerified: false,
        groups: ['USER']
      });
      const cards = service.getCtaCards(user);
      
      const healthCards = cards.filter(c => c.category === 'health');
      const benefitCards = cards.filter(c => c.category === 'benefit');
      
      expect(healthCards.length).toBeGreaterThan(0);
      expect(benefitCards.length).toBeGreaterThan(0);
      
      // Health cards should come before benefit cards
      const lastHealthIndex = cards.findIndex(c => c.id === healthCards[healthCards.length - 1].id);
      const firstBenefitIndex = cards.findIndex(c => c.id === benefitCards[0].id);
      expect(lastHealthIndex).toBeLessThan(firstBenefitIndex);
    });

    it('should return health cards before action cards for CUSTOMER', () => {
      const user = createTestUser({ 
        emailVerified: false,
        groups: ['USER', 'CUSTOMER']
      });
      const cards = service.getCtaCards(user);
      
      const healthCards = cards.filter(c => c.category === 'health');
      const actionCards = cards.filter(c => c.category === 'action');
      
      expect(healthCards.length).toBeGreaterThan(0);
      expect(actionCards.length).toBeGreaterThan(0);
      
      // Health cards should come before action cards
      const lastHealthIndex = cards.findIndex(c => c.id === healthCards[healthCards.length - 1].id);
      const firstActionIndex = cards.findIndex(c => c.id === actionCards[0].id);
      expect(lastHealthIndex).toBeLessThan(firstActionIndex);
    });
  });

  describe('getHealthCards', () => {
    it('should return empty array for null user', () => {
      const cards = service.getHealthCards(null);
      expect(cards).toEqual([]);
    });

    it('should return no health cards for fully complete user', () => {
      const user = createTestUser();
      const cards = service.getHealthCards(user);
      expect(cards.length).toBe(0);
    });

    it('should return name card when firstName is missing', () => {
      const user = createTestUser({ firstName: '' });
      const cards = service.getHealthCards(user);
      
      const nameCard = cards.find(c => c.id === 'health-name');
      expect(nameCard).toBeTruthy();
      expect(nameCard?.title).toBe('Complete Your Profile');
    });

    it('should return name card when lastName is missing', () => {
      const user = createTestUser({ lastName: '' });
      const cards = service.getHealthCards(user);
      
      const nameCard = cards.find(c => c.id === 'health-name');
      expect(nameCard).toBeTruthy();
    });

    it('should return name card when name is whitespace only', () => {
      const user = createTestUser({ firstName: '   ', lastName: '   ' });
      const cards = service.getHealthCards(user);
      
      const nameCard = cards.find(c => c.id === 'health-name');
      expect(nameCard).toBeTruthy();
    });

    it('should return email card when email is not verified', () => {
      const user = createTestUser({ emailVerified: false });
      const cards = service.getHealthCards(user);
      
      const emailCard = cards.find(c => c.id === 'health-email');
      expect(emailCard).toBeTruthy();
      expect(emailCard?.title).toBe('Verify Your Email');
    });

    it('should return phone card when phone is not verified', () => {
      const user = createTestUser({ phoneVerified: false });
      const cards = service.getHealthCards(user);
      
      const phoneCard = cards.find(c => c.id === 'health-phone');
      expect(phoneCard).toBeTruthy();
      expect(phoneCard?.title).toBe('Verify Your Phone');
    });

    it('should show "Add Phone" label when phone number is missing', () => {
      const user = createTestUser({ phoneVerified: false, phoneNumber: undefined });
      const cards = service.getHealthCards(user);
      
      const phoneCard = cards.find(c => c.id === 'health-phone');
      expect(phoneCard?.actionLabel).toBe('Add Phone');
    });

    it('should show "Verify Phone" label when phone number exists', () => {
      const user = createTestUser({ phoneVerified: false, phoneNumber: '+1234567890' });
      const cards = service.getHealthCards(user);
      
      const phoneCard = cards.find(c => c.id === 'health-phone');
      expect(phoneCard?.actionLabel).toBe('Verify Phone');
    });

    it('should return MFA card when MFA is not enabled', () => {
      const user = createTestUser({ mfaEnabled: false });
      const cards = service.getHealthCards(user);
      
      const mfaCard = cards.find(c => c.id === 'health-mfa');
      expect(mfaCard).toBeTruthy();
      expect(mfaCard?.title).toBe('Secure Your Account');
    });

    it('should return MFA card when MFA setup is not complete', () => {
      const user = createTestUser({ mfaEnabled: true, mfaSetupComplete: false });
      const cards = service.getHealthCards(user);
      
      const mfaCard = cards.find(c => c.id === 'health-mfa');
      expect(mfaCard).toBeTruthy();
    });

    it('should return all 4 health cards when all items are incomplete', () => {
      const user = createTestUser({
        firstName: '',
        lastName: '',
        emailVerified: false,
        phoneVerified: false,
        mfaEnabled: false,
        mfaSetupComplete: false
      });
      const cards = service.getHealthCards(user);
      
      expect(cards.length).toBe(4);
      expect(cards.map(c => c.id)).toContain('health-name');
      expect(cards.map(c => c.id)).toContain('health-email');
      expect(cards.map(c => c.id)).toContain('health-phone');
      expect(cards.map(c => c.id)).toContain('health-mfa');
    });

    it('should return health cards sorted by priority', () => {
      const user = createTestUser({
        firstName: '',
        emailVerified: false,
        phoneVerified: false,
        mfaEnabled: false
      });
      const cards = service.getHealthCards(user);
      
      for (let i = 1; i < cards.length; i++) {
        expect(cards[i].priority).toBeGreaterThanOrEqual(cards[i - 1].priority);
      }
    });
  });

  describe('getUserBenefitCards', () => {
    it('should return benefit cards for upgrade promotion', () => {
      const cards = service.getUserBenefitCards();
      
      expect(cards.length).toBeGreaterThan(0);
      expect(cards.every(c => c.category === 'benefit')).toBe(true);
    });

    it('should include organization management card', () => {
      const cards = service.getUserBenefitCards();
      
      const orgCard = cards.find(c => c.id === 'benefit-orgs');
      expect(orgCard).toBeTruthy();
      expect(orgCard?.title).toBe('Manage Organizations');
    });

    it('should include integrations card', () => {
      const cards = service.getUserBenefitCards();
      
      const intCard = cards.find(c => c.id === 'benefit-integrations');
      expect(intCard).toBeTruthy();
      expect(intCard?.title).toBe('Connect Integrations');
    });

    it('should include team building card', () => {
      const cards = service.getUserBenefitCards();
      
      const teamCard = cards.find(c => c.id === 'benefit-team');
      expect(teamCard).toBeTruthy();
      expect(teamCard?.title).toBe('Build Your Team');
    });
  });

  describe('getCustomerActionCards', () => {
    it('should return empty array for null user', () => {
      const cards = service.getCustomerActionCards(null);
      expect(cards).toEqual([]);
    });

    it('should return action cards for CUSTOMER', () => {
      const user = createTestUser({ groups: ['USER', 'CUSTOMER'] });
      const cards = service.getCustomerActionCards(user);
      
      expect(cards.length).toBeGreaterThan(0);
      expect(cards.every(c => c.category === 'action')).toBe(true);
    });

    it('should include create organization card', () => {
      const user = createTestUser({ groups: ['USER', 'CUSTOMER'] });
      const cards = service.getCustomerActionCards(user);
      
      const createOrgCard = cards.find(c => c.id === 'action-create-org');
      expect(createOrgCard).toBeTruthy();
      expect(createOrgCard?.title).toBe('Create Your First Organization');
    });

    it('should include manage organizations card', () => {
      const user = createTestUser({ groups: ['USER', 'CUSTOMER'] });
      const cards = service.getCustomerActionCards(user);
      
      const manageOrgCard = cards.find(c => c.id === 'action-manage-orgs');
      expect(manageOrgCard).toBeTruthy();
      expect(manageOrgCard?.title).toBe('Manage Organizations');
    });

    it('should include add application card', () => {
      const user = createTestUser({ groups: ['USER', 'CUSTOMER'] });
      const cards = service.getCustomerActionCards(user);
      
      const addAppCard = cards.find(c => c.id === 'action-add-app');
      expect(addAppCard).toBeTruthy();
      expect(addAppCard?.title).toBe('Add Your First Application');
    });
  });

  describe('Role-based card exclusivity', () => {
    it('should return benefit cards for USER (non-customer)', () => {
      const user = createTestUser({ groups: ['USER'] });
      const cards = service.getCtaCards(user);
      
      const benefitCards = cards.filter(c => c.category === 'benefit');
      const actionCards = cards.filter(c => c.category === 'action');
      
      expect(benefitCards.length).toBeGreaterThan(0);
      expect(actionCards.length).toBe(0);
    });

    it('should return action cards for CUSTOMER', () => {
      const user = createTestUser({ groups: ['USER', 'CUSTOMER'] });
      const cards = service.getCtaCards(user);
      
      const benefitCards = cards.filter(c => c.category === 'benefit');
      const actionCards = cards.filter(c => c.category === 'action');
      
      expect(benefitCards.length).toBe(0);
      expect(actionCards.length).toBeGreaterThan(0);
    });

    it('should not mix benefit and action cards', () => {
      const userOnly = createTestUser({ groups: ['USER'] });
      const customer = createTestUser({ groups: ['USER', 'CUSTOMER'] });
      
      const userCards = service.getCtaCards(userOnly);
      const customerCards = service.getCtaCards(customer);
      
      // USER should have benefit but not action
      expect(userCards.some(c => c.category === 'benefit')).toBe(true);
      expect(userCards.some(c => c.category === 'action')).toBe(false);
      
      // CUSTOMER should have action but not benefit
      expect(customerCards.some(c => c.category === 'action')).toBe(true);
      expect(customerCards.some(c => c.category === 'benefit')).toBe(false);
    });
  });

  describe('countIncompleteHealthItems', () => {
    it('should return 4 for null user', () => {
      expect(service.countIncompleteHealthItems(null)).toBe(4);
    });

    it('should return 0 for fully complete user', () => {
      const user = createTestUser();
      expect(service.countIncompleteHealthItems(user)).toBe(0);
    });

    it('should count each incomplete item', () => {
      const user = createTestUser({
        firstName: '',
        emailVerified: false
      });
      expect(service.countIncompleteHealthItems(user)).toBe(2);
    });

    it('should return 4 for completely incomplete user', () => {
      const user = createTestUser({
        firstName: '',
        lastName: '',
        emailVerified: false,
        phoneVerified: false,
        mfaEnabled: false
      });
      expect(service.countIncompleteHealthItems(user)).toBe(4);
    });
  });

  describe('filterByCategory', () => {
    it('should filter cards by category', () => {
      const user = createTestUser({ 
        emailVerified: false,
        groups: ['USER']
      });
      const allCards = service.getCtaCards(user);
      
      const healthCards = service.filterByCategory(allCards, 'health');
      const benefitCards = service.filterByCategory(allCards, 'benefit');
      
      expect(healthCards.every(c => c.category === 'health')).toBe(true);
      expect(benefitCards.every(c => c.category === 'benefit')).toBe(true);
    });

    it('should return empty array when no cards match category', () => {
      const user = createTestUser({ groups: ['USER'] });
      const allCards = service.getCtaCards(user);
      
      const actionCards = service.filterByCategory(allCards, 'action');
      expect(actionCards.length).toBe(0);
    });
  });

  describe('Card structure validation', () => {
    it('all cards should have required properties', () => {
      const user = createTestUser({
        firstName: '',
        emailVerified: false,
        groups: ['USER']
      });
      const cards = service.getCtaCards(user);
      
      cards.forEach(card => {
        expect(card.id).toBeTruthy();
        expect(card.icon).toBeTruthy();
        expect(card.title).toBeTruthy();
        expect(card.description).toBeTruthy();
        expect(card.actionLabel).toBeTruthy();
        expect(typeof card.priority).toBe('number');
        expect(['health', 'benefit', 'action']).toContain(card.category);
        // Each card should have either actionRoute or actionHandler
        expect(card.actionRoute || card.actionHandler).toBeTruthy();
      });
    });

    it('all cards should have unique IDs', () => {
      const user = createTestUser({
        firstName: '',
        emailVerified: false,
        phoneVerified: false,
        mfaEnabled: false,
        groups: ['USER']
      });
      const cards = service.getCtaCards(user);
      
      const ids = cards.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('getApiKeyCtaCards', () => {
    // Test data generators
    const environmentStringArb = fc.constantFrom('PRODUCTION', 'STAGING', 'DEVELOPMENT', 'TEST', 'PREVIEW');

    // Helper to create a mock application
    const createMockApplication = (
      id: string,
      environments: string[],
      status: ApplicationStatus = ApplicationStatus.Pending
    ): IApplications => ({
      applicationId: id,
      organizationId: 'org-123',
      name: `App ${id}`,
      description: 'Test application',
      status,
      environments,
      createdAt: new Date(),
      updatedAt: new Date(),
      ownerId: 'user-123'
    } as IApplications);

    // Helper to create a mock API key
    const createMockApiKey = (
      appId: string,
      environment: string,
      status: ApplicationApiKeyStatus
    ): IApplicationApiKeys => ({
      applicationApiKeyId: `key-${appId}-${environment}`,
      applicationId: appId,
      organizationId: 'org-123',
      environment: environment as Environment,
      status,
      keyPrefix: `orb_${environment.toLowerCase().substring(0, 2)}_`,
      keyHash: 'mock-hash',
      createdAt: new Date(),
      updatedAt: new Date()
    } as IApplicationApiKeys);

    describe('Unit Tests', () => {
      it('should return empty array for empty applications', () => {
        const cards = service.getApiKeyCtaCards([], new Map());
        expect(cards).toEqual([]);
      });

      it('should return empty array for applications with no environments', () => {
        const app = createMockApplication('app-1', []);
        const cards = service.getApiKeyCtaCards([app], new Map());
        expect(cards).toEqual([]);
      });

      it('should return CTA for application with missing keys', () => {
        const app = createMockApplication('app-1', ['PRODUCTION', 'STAGING']);
        const cards = service.getApiKeyCtaCards([app], new Map());
        
        expect(cards.length).toBe(1);
        expect(cards[0].id).toBe('api-keys-app-1');
        expect(cards[0].title).toContain('App app-1');
        expect(cards[0].description).toContain('2 of 2');
      });

      it('should not return CTA for fully configured application', () => {
        const app = createMockApplication('app-1', ['PRODUCTION']);
        const keys = new Map<string, IApplicationApiKeys[]>([
          ['app-1', [createMockApiKey('app-1', 'PRODUCTION', ApplicationApiKeyStatus.Active)]]
        ]);
        
        const cards = service.getApiKeyCtaCards([app], keys);
        expect(cards.length).toBe(0);
      });

      it('should return CTA for partially configured application', () => {
        const app = createMockApplication('app-1', ['PRODUCTION', 'STAGING']);
        const keys = new Map<string, IApplicationApiKeys[]>([
          ['app-1', [createMockApiKey('app-1', 'PRODUCTION', ApplicationApiKeyStatus.Active)]]
        ]);
        
        const cards = service.getApiKeyCtaCards([app], keys);
        expect(cards.length).toBe(1);
        expect(cards[0].description).toContain('1 of 2');
      });

      it('should skip INACTIVE applications', () => {
        const app = createMockApplication('app-1', ['PRODUCTION'], ApplicationStatus.Inactive);
        const cards = service.getApiKeyCtaCards([app], new Map());
        expect(cards.length).toBe(0);
      });

      it('should include PENDING applications', () => {
        const app = createMockApplication('app-1', ['PRODUCTION'], ApplicationStatus.Pending);
        const cards = service.getApiKeyCtaCards([app], new Map());
        expect(cards.length).toBe(1);
      });

      it('should include ACTIVE applications', () => {
        const app = createMockApplication('app-1', ['PRODUCTION'], ApplicationStatus.Active);
        const cards = service.getApiKeyCtaCards([app], new Map());
        expect(cards.length).toBe(1);
      });

      it('should use health category for yellow styling', () => {
        const app = createMockApplication('app-1', ['PRODUCTION']);
        const cards = service.getApiKeyCtaCards([app], new Map());
        expect(cards[0].category).toBe('health');
      });

      it('should navigate to Security tab', () => {
        const app = createMockApplication('app-1', ['PRODUCTION']);
        const cards = service.getApiKeyCtaCards([app], new Map());
        expect(cards[0].actionRoute).toBe('/customers/applications/app-1');
        expect(cards[0].actionQueryParams).toEqual({ tab: 'security' });
      });
    });

    describe('Property Tests', () => {
      /**
       * Feature: api-key-configuration-flow, Property 2: CTA Generation Correctness
       * Validates: Requirements 2.1, 2.5
       *
       * For any set of applications, the Dashboard_CTA_Service SHALL generate
       * exactly one CTA card for each application that has at least one environment
       * without an active API key, and zero CTAs for fully configured applications.
       */
      it('Property 2: generates exactly one CTA per application with missing keys', () => {
        fc.assert(
          fc.property(
            // Generate 1-5 unique application IDs
            fc.uniqueArray(fc.uuid(), { minLength: 1, maxLength: 5 }),
            // For each app, generate 1-3 environments
            fc.func(fc.uniqueArray(environmentStringArb, { minLength: 1, maxLength: 3 })),
            // For each app, decide if it has all keys configured
            fc.func(fc.boolean()),
            (appIds, getEnvs, hasAllKeys) => {
              // Create applications
              const applications = appIds.map((id, i) => 
                createMockApplication(id, getEnvs(i))
              );

              // Create API keys map - some apps fully configured, some not
              const apiKeysByApp = new Map<string, IApplicationApiKeys[]>();
              const expectedCtaCount = applications.filter((app, i) => {
                const envs = app.environments || [];
                if (envs.length === 0) return false;
                
                if (hasAllKeys(i)) {
                  // Fully configured - create keys for all environments
                  apiKeysByApp.set(
                    app.applicationId,
                    envs.map(env => createMockApiKey(app.applicationId, env, ApplicationApiKeyStatus.Active))
                  );
                  return false;
                } else {
                  // Not fully configured - no keys
                  return true;
                }
              }).length;

              const cards = service.getApiKeyCtaCards(applications, apiKeysByApp);

              // Verify exactly one CTA per app with missing keys
              expect(cards.length).toBe(expectedCtaCount);

              // Verify each CTA has unique app ID
              const ctaAppIds = cards.map(c => c.id.replace('api-keys-', ''));
              expect(new Set(ctaAppIds).size).toBe(ctaAppIds.length);
            }
          ),
          { numRuns: 100 }
        );
      });

      /**
       * Feature: api-key-configuration-flow, Property 3: CTA Content Correctness
       * Validates: Requirements 2.3
       *
       * For any application with missing API keys, the generated CTA card SHALL
       * contain the application name and the correct count of missing environments.
       */
      it('Property 3: CTA content contains correct app name and missing count', () => {
        fc.assert(
          fc.property(
            fc.uuid(),
            fc.string({ minLength: 1, maxLength: 50 }),
            fc.uniqueArray(environmentStringArb, { minLength: 1, maxLength: 5 }),
            fc.integer({ min: 0 }),
            (appId, appName, environments, configuredCount) => {
              // Ensure we have at least one missing environment
              const actualConfigured = Math.min(configuredCount, environments.length - 1);
              const expectedMissing = environments.length - actualConfigured;

              const app: IApplications = {
                applicationId: appId,
                organizationId: 'org-123',
                name: appName,
                description: 'Test',
                status: ApplicationStatus.Pending,
                environments,
                createdAt: new Date(),
                updatedAt: new Date(),
                ownerId: 'user-123'
              } as IApplications;

              // Create keys for some environments
              const keys = environments
                .slice(0, actualConfigured)
                .map(env => createMockApiKey(appId, env, ApplicationApiKeyStatus.Active));

              const apiKeysByApp = new Map<string, IApplicationApiKeys[]>([
                [appId, keys]
              ]);

              const cards = service.getApiKeyCtaCards([app], apiKeysByApp);

              expect(cards.length).toBe(1);
              expect(cards[0].title).toContain(appName);
              expect(cards[0].description).toContain(`${expectedMissing} of ${environments.length}`);
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});
