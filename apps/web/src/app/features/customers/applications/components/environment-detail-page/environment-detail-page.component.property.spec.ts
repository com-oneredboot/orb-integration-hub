/**
 * Environment Detail Page Property Tests
 *
 * Property-based tests for environment detail page tab functionality using fast-check.
 * Validates universal correctness properties across all valid inputs.
 *
 * @see .kiro/specs/environments-list-and-detail/design.md
 */

import * as fc from 'fast-check';
import {
  EnvironmentDetailPageComponent,
  EnvironmentDetailTab,
} from './environment-detail-page.component';
import { ApplicationApiKeyStatus } from '../../../../../core/enums/ApplicationApiKeyStatusEnum';
import { IApplicationApiKeys } from '../../../../../core/models/ApplicationApiKeysModel';
import { IApplicationEnvironmentConfig } from '../../../../../core/models/ApplicationEnvironmentConfigModel';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';
import { ApplicationApiKeyType } from '../../../../../core/enums/ApplicationApiKeyTypeEnum';

describe('Environment Detail Page Property Tests', () => {
  // Arbitrary generators
  const tabArbitrary = fc.constantFrom(
    EnvironmentDetailTab.ApiKeys,
    EnvironmentDetailTab.Origins,
    EnvironmentDetailTab.RateLimits,
    EnvironmentDetailTab.Webhooks,
    EnvironmentDetailTab.FeatureFlags
  );

  const _apiKeyStatusArbitrary = fc.constantFrom(
    ApplicationApiKeyStatus.Active,
    ApplicationApiKeyStatus.Rotating,
    ApplicationApiKeyStatus.Revoked,
    ApplicationApiKeyStatus.Expired,
    ApplicationApiKeyStatus.Unknown
  );

  const environmentArbitrary = fc.constantFrom(
    Environment.Production,
    Environment.Staging,
    Environment.Development,
    Environment.Test,
    Environment.Preview
  );

  describe('Property 5: Tab Switching Updates Content and Styling', () => {
    /**
     * Feature: environments-list-and-detail, Property 5: Tab Switching Updates Content and Styling
     * **Validates: Requirements 3.4, 3.6**
     *
     * For any tab click, the active tab SHALL have the `orb-tabs__tab--active` class,
     * and the corresponding content section SHALL be visible while other sections are hidden.
     */
    it('should update activeTab when setActiveTab is called (100 iterations)', () => {
      fc.assert(
        fc.property(tabArbitrary, (tab) => {
          // Create a minimal component instance for testing
          const component = createMinimalComponent();

          // Set the active tab
          component.setActiveTab(tab);

          // Verify the active tab is updated
          return component.activeTab === tab;
        }),
        { numRuns: 100 }
      );
    });

    it('should have exactly one active tab at any time (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(tabArbitrary, { minLength: 1, maxLength: 10 }),
          (tabSequence) => {
            const component = createMinimalComponent();

            // Apply each tab selection in sequence
            for (const tab of tabSequence) {
              component.setActiveTab(tab);
            }

            // Verify only one tab is active (the last one selected)
            const lastTab = tabSequence[tabSequence.length - 1];
            return component.activeTab === lastTab;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain tab state across multiple switches (100 iterations)', () => {
      fc.assert(
        fc.property(tabArbitrary, tabArbitrary, (firstTab, secondTab) => {
          const component = createMinimalComponent();

          // Switch to first tab
          component.setActiveTab(firstTab);
          const afterFirst = component.activeTab;

          // Switch to second tab
          component.setActiveTab(secondTab);
          const afterSecond = component.activeTab;

          // Verify state transitions are correct
          return afterFirst === firstTab && afterSecond === secondTab;
        }),
        { numRuns: 100 }
      );
    });

    it('should handle keyboard navigation correctly (100 iterations)', () => {
      fc.assert(
        fc.property(tabArbitrary, (startTab) => {
          const component = createMinimalComponent();
          component.setActiveTab(startTab);

          const tabs = component.tabs;
          const startIndex = tabs.findIndex((t) => t.id === startTab);

          // Simulate ArrowRight key
          const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
          component.onTabKeydown(rightEvent, startTab);

          const expectedNextIndex =
            startIndex < tabs.length - 1 ? startIndex + 1 : 0;
          const expectedNextTab = tabs[expectedNextIndex].id;

          return component.activeTab === expectedNextTab;
        }),
        { numRuns: 100 }
      );
    });

    it('should handle ArrowLeft keyboard navigation (100 iterations)', () => {
      fc.assert(
        fc.property(tabArbitrary, (startTab) => {
          const component = createMinimalComponent();
          component.setActiveTab(startTab);

          const tabs = component.tabs;
          const startIndex = tabs.findIndex((t) => t.id === startTab);

          // Simulate ArrowLeft key
          const leftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
          component.onTabKeydown(leftEvent, startTab);

          const expectedPrevIndex =
            startIndex > 0 ? startIndex - 1 : tabs.length - 1;
          const expectedPrevTab = tabs[expectedPrevIndex].id;

          return component.activeTab === expectedPrevTab;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: Tab Issue Count Accuracy', () => {
    /**
     * Feature: environments-list-and-detail, Property 6: Tab Issue Count Accuracy
     * **Validates: Requirements 3.5**
     *
     * For any tab with configuration issues, the badge count SHALL equal the number
     * of issues for that tab. Tabs without issues SHALL NOT display a badge.
     */
    it('should return 1 for ApiKeys tab when no API key exists (100 iterations)', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const component = createMinimalComponent();
          component.environmentApiKey = null;

          const issueCount = component.getTabIssueCount(
            EnvironmentDetailTab.ApiKeys
          );
          return issueCount === 1;
        }),
        { numRuns: 100 }
      );
    });

    it('should return 0 for ApiKeys tab when API key is active (100 iterations)', () => {
      fc.assert(
        fc.property(environmentArbitrary, (env) => {
          const component = createMinimalComponent();
          component.environmentApiKey = createMockApiKey(
            env,
            ApplicationApiKeyStatus.Active
          );

          const issueCount = component.getTabIssueCount(
            EnvironmentDetailTab.ApiKeys
          );
          return issueCount === 0;
        }),
        { numRuns: 100 }
      );
    });

    it('should return 1 for ApiKeys tab when API key is revoked (100 iterations)', () => {
      fc.assert(
        fc.property(environmentArbitrary, (env) => {
          const component = createMinimalComponent();
          component.environmentApiKey = createMockApiKey(
            env,
            ApplicationApiKeyStatus.Revoked
          );

          const issueCount = component.getTabIssueCount(
            EnvironmentDetailTab.ApiKeys
          );
          return issueCount === 1;
        }),
        { numRuns: 100 }
      );
    });

    it('should return 1 for ApiKeys tab when API key is expired (100 iterations)', () => {
      fc.assert(
        fc.property(environmentArbitrary, (env) => {
          const component = createMinimalComponent();
          component.environmentApiKey = createMockApiKey(
            env,
            ApplicationApiKeyStatus.Expired
          );

          const issueCount = component.getTabIssueCount(
            EnvironmentDetailTab.ApiKeys
          );
          return issueCount === 1;
        }),
        { numRuns: 100 }
      );
    });

    it('should return 1 for Origins tab when no origins configured (100 iterations)', () => {
      fc.assert(
        fc.property(fc.constant([]), () => {
          const component = createMinimalComponent();
          component.selectedConfig = createMockConfig([]);

          const issueCount = component.getTabIssueCount(
            EnvironmentDetailTab.Origins
          );
          return issueCount === 1;
        }),
        { numRuns: 100 }
      );
    });

    it('should return 0 for Origins tab when origins are configured (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
          (origins) => {
            const component = createMinimalComponent();
            component.selectedConfig = createMockConfig(origins);

            const issueCount = component.getTabIssueCount(
              EnvironmentDetailTab.Origins
            );
            return issueCount === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 1 for RateLimits tab when rate limit is 0 (100 iterations)', () => {
      fc.assert(
        fc.property(fc.constant(0), () => {
          const component = createMinimalComponent();
          component.selectedConfig = createMockConfig([], 0);

          const issueCount = component.getTabIssueCount(
            EnvironmentDetailTab.RateLimits
          );
          return issueCount === 1;
        }),
        { numRuns: 100 }
      );
    });

    it('should return 0 for RateLimits tab when rate limit is configured (100 iterations)', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 10000 }), (rateLimit) => {
          const component = createMinimalComponent();
          component.selectedConfig = createMockConfig([], rateLimit);

          const issueCount = component.getTabIssueCount(
            EnvironmentDetailTab.RateLimits
          );
          return issueCount === 0;
        }),
        { numRuns: 100 }
      );
    });

    it('should always return 0 for Webhooks tab (optional feature) (100 iterations)', () => {
      fc.assert(
        fc.property(fc.boolean(), () => {
          const component = createMinimalComponent();

          const issueCount = component.getTabIssueCount(
            EnvironmentDetailTab.Webhooks
          );
          return issueCount === 0;
        }),
        { numRuns: 100 }
      );
    });

    it('should always return 0 for FeatureFlags tab (optional feature) (100 iterations)', () => {
      fc.assert(
        fc.property(fc.boolean(), () => {
          const component = createMinimalComponent();

          const issueCount = component.getTabIssueCount(
            EnvironmentDetailTab.FeatureFlags
          );
          return issueCount === 0;
        }),
        { numRuns: 100 }
      );
    });

    it('should correctly identify tabs with issues (100 iterations)', () => {
      fc.assert(
        fc.property(tabArbitrary, (tab) => {
          const component = createMinimalComponent();
          // Set up state that causes issues for some tabs
          component.environmentApiKey = null;
          component.selectedConfig = createMockConfig([], 0);

          const issueCount = component.getTabIssueCount(tab);
          const hasIssues = component.tabHasIssues(tab);

          // tabHasIssues should return true iff issueCount > 0
          return hasIssues === (issueCount > 0);
        }),
        { numRuns: 100 }
      );
    });

    it('should calculate total issue count correctly (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.boolean(), // hasApiKey
          fc.boolean(), // hasOrigins
          fc.boolean(), // hasRateLimit
          (hasApiKey, hasOrigins, hasRateLimit) => {
            const component = createMinimalComponent();

            // Set up state based on flags
            component.environmentApiKey = hasApiKey
              ? createMockApiKey(
                  Environment.Production,
                  ApplicationApiKeyStatus.Active
                )
              : null;
            component.selectedConfig = createMockConfig(
              hasOrigins ? ['https://example.com'] : [],
              hasRateLimit ? 60 : 0
            );

            const totalIssues = component.getTotalIssueCount();

            // Calculate expected issues
            let expectedIssues = 0;
            if (!hasApiKey) expectedIssues++;
            if (!hasOrigins) expectedIssues++;
            if (!hasRateLimit) expectedIssues++;

            return totalIssues === expectedIssues;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Helper functions
  function createMinimalComponent(): EnvironmentDetailPageComponent {
    // Create a minimal component instance for testing
    // We only need the tab-related properties and methods
    const component = Object.create(EnvironmentDetailPageComponent.prototype);

    // Initialize required properties
    component.activeTab = EnvironmentDetailTab.ApiKeys;
    component.environmentApiKey = null;
    component.selectedConfig = null;
    component.tabs = [
      { id: EnvironmentDetailTab.ApiKeys, label: 'API Keys', icon: 'key' },
      { id: EnvironmentDetailTab.Origins, label: 'Origins', icon: 'globe' },
      {
        id: EnvironmentDetailTab.RateLimits,
        label: 'Rate Limits',
        icon: 'tachometer-alt',
      },
      { id: EnvironmentDetailTab.Webhooks, label: 'Webhooks', icon: 'bolt' },
      {
        id: EnvironmentDetailTab.FeatureFlags,
        label: 'Feature Flags',
        icon: 'flag',
      },
    ];

    return component;
  }

  function createMockApiKey(
    environment: Environment,
    status: ApplicationApiKeyStatus
  ): IApplicationApiKeys {
    return {
      applicationApiKeyId: 'test-key-id',
      applicationId: 'test-app-id',
      organizationId: 'test-org-id',
      environment,
      keyPrefix: 'pk_test_abc123',
      keyHash: 'hash123',
      keyType: ApplicationApiKeyType.Publishable,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  function createMockConfig(
    allowedOrigins: string[],
    rateLimitPerMinute = 60
  ): IApplicationEnvironmentConfig {
    return {
      applicationId: 'test-app-id',
      organizationId: 'test-org-id',
      environment: Environment.Production,
      allowedOrigins,
      rateLimitPerMinute,
      rateLimitPerDay: 10000,
      webhookEnabled: false,
      webhookMaxRetries: 3,
      webhookRetryDelaySeconds: 60,
      featureFlags: {},
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
});
