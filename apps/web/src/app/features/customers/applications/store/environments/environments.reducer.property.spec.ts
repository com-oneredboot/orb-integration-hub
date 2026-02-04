/**
 * Environments Reducer Property Tests
 *
 * Property-based tests for environments reducer using fast-check.
 * Validates universal correctness properties across all valid inputs.
 *
 * @see .kiro/specs/environments-list-and-detail/design.md
 */

import * as fc from 'fast-check';
import { EnvironmentsActions } from './environments.actions';
import {
  environmentsReducer,
  computeEnvironmentStatus,
  buildEnvironmentRows,
} from './environments.reducer';
import { initialEnvironmentsState, EnvironmentStatus } from './environments.state';
import { IApplicationEnvironmentConfig } from '../../../../../core/models/ApplicationEnvironmentConfigModel';
import { IApplicationApiKeys } from '../../../../../core/models/ApplicationApiKeysModel';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';
import { ApplicationApiKeyStatus } from '../../../../../core/enums/ApplicationApiKeyStatusEnum';
import { ApplicationApiKeyType } from '../../../../../core/enums/ApplicationApiKeyTypeEnum';

describe('Environments Reducer Property Tests', () => {
  // Arbitrary generators for environment configs
  const environmentArbitrary = fc.constantFrom(
    Environment.Production,
    Environment.Staging,
    Environment.Development,
    Environment.Test,
    Environment.Preview
  );

  const apiKeyStatusArbitrary = fc.constantFrom(
    ApplicationApiKeyStatus.Active,
    ApplicationApiKeyStatus.Rotating,
    ApplicationApiKeyStatus.Revoked,
    ApplicationApiKeyStatus.Expired,
    ApplicationApiKeyStatus.Unknown
  );

  const environmentConfigArbitrary = fc.record({
    applicationId: fc.uuid(),
    environment: environmentArbitrary,
    organizationId: fc.uuid(),
    allowedOrigins: fc.array(fc.webUrl(), { minLength: 0, maxLength: 5 }),
    rateLimitPerMinute: fc.integer({ min: 0, max: 10000 }),
    rateLimitPerDay: fc.integer({ min: 0, max: 1000000 }),
    webhookUrl: fc.option(fc.webUrl(), { nil: undefined }),
    webhookEnabled: fc.boolean(),
    webhookMaxRetries: fc.integer({ min: 0, max: 10 }),
    webhookRetryDelaySeconds: fc.integer({ min: 0, max: 3600 }),
    featureFlags: fc.constant({}),
    metadata: fc.constant({}),
    createdAt: fc.date(),
    updatedAt: fc.date(),
  }) as fc.Arbitrary<IApplicationEnvironmentConfig>;

  const apiKeyArbitrary = (environment: Environment) =>
    fc.record({
      applicationApiKeyId: fc.uuid(),
      applicationId: fc.uuid(),
      organizationId: fc.uuid(),
      environment: fc.constant(environment),
      keyPrefix: fc.string({ minLength: 8, maxLength: 16 }),
      keyHash: fc.string({ minLength: 32, maxLength: 64 }),
      keyType: fc.constantFrom(
        ApplicationApiKeyType.Publishable,
        ApplicationApiKeyType.Secret
      ),
      status: apiKeyStatusArbitrary,
      createdAt: fc.date(),
      updatedAt: fc.date(),
      expiresAt: fc.option(fc.date(), { nil: undefined }),
      lastUsedAt: fc.option(fc.date(), { nil: undefined }),
      revokedAt: fc.option(fc.date(), { nil: undefined }),
      revokedBy: fc.option(fc.uuid(), { nil: undefined }),
      revokedReason: fc.option(fc.string(), { nil: undefined }),
    }) as fc.Arbitrary<IApplicationApiKeys>;

  describe('Property 2: Environment Status Computation', () => {
    /**
     * Feature: environments-list-and-detail, Property 2: Environment Status Computation
     * **Validates: Requirements 1.3, 4.1, 4.2, 4.3, 4.4**
     *
     * For any environment configuration and its associated API key (or lack thereof),
     * the computed status SHALL be:
     * - "Active" if API key exists and status is ACTIVE or ROTATING
     * - "Not Configured" if no API key exists
     * - "Revoked" if API key exists and status is REVOKED
     * - "Expired" if API key exists and status is EXPIRED
     */
    it('should return "Not Configured" when no API key exists (100 iterations)', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const status = computeEnvironmentStatus(null);
          return status === 'Not Configured';
        }),
        { numRuns: 100 }
      );
    });

    it('should return "Not Configured" when API key is undefined (100 iterations)', () => {
      fc.assert(
        fc.property(fc.constant(undefined), () => {
          const status = computeEnvironmentStatus(undefined);
          return status === 'Not Configured';
        }),
        { numRuns: 100 }
      );
    });

    it('should return "Active" when API key status is ACTIVE (100 iterations)', () => {
      fc.assert(
        fc.property(apiKeyArbitrary(Environment.Production), (apiKey) => {
          const activeKey = { ...apiKey, status: ApplicationApiKeyStatus.Active };
          const status = computeEnvironmentStatus(activeKey);
          return status === 'Active';
        }),
        { numRuns: 100 }
      );
    });

    it('should return "Active" when API key status is ROTATING (100 iterations)', () => {
      fc.assert(
        fc.property(apiKeyArbitrary(Environment.Production), (apiKey) => {
          const rotatingKey = { ...apiKey, status: ApplicationApiKeyStatus.Rotating };
          const status = computeEnvironmentStatus(rotatingKey);
          return status === 'Active';
        }),
        { numRuns: 100 }
      );
    });

    it('should return "Revoked" when API key status is REVOKED (100 iterations)', () => {
      fc.assert(
        fc.property(apiKeyArbitrary(Environment.Production), (apiKey) => {
          const revokedKey = { ...apiKey, status: ApplicationApiKeyStatus.Revoked };
          const status = computeEnvironmentStatus(revokedKey);
          return status === 'Revoked';
        }),
        { numRuns: 100 }
      );
    });

    it('should return "Expired" when API key status is EXPIRED (100 iterations)', () => {
      fc.assert(
        fc.property(apiKeyArbitrary(Environment.Production), (apiKey) => {
          const expiredKey = { ...apiKey, status: ApplicationApiKeyStatus.Expired };
          const status = computeEnvironmentStatus(expiredKey);
          return status === 'Expired';
        }),
        { numRuns: 100 }
      );
    });

    it('should correctly map all API key statuses to environment statuses (100 iterations)', () => {
      const expectedMapping: Record<ApplicationApiKeyStatus, EnvironmentStatus> = {
        [ApplicationApiKeyStatus.Active]: 'Active',
        [ApplicationApiKeyStatus.Rotating]: 'Active',
        [ApplicationApiKeyStatus.Revoked]: 'Revoked',
        [ApplicationApiKeyStatus.Expired]: 'Expired',
        [ApplicationApiKeyStatus.Unknown]: 'Not Configured',
      };

      fc.assert(
        fc.property(
          apiKeyArbitrary(Environment.Production),
          apiKeyStatusArbitrary,
          (apiKey, status) => {
            const keyWithStatus = { ...apiKey, status };
            const computedStatus = computeEnvironmentStatus(keyWithStatus);
            return computedStatus === expectedMapping[status];
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 1: Environment List Data Integrity', () => {
    /**
     * Feature: environments-list-and-detail, Property 1: Environment List Data Integrity
     * **Validates: Requirements 1.1, 1.2, 1.6, 1.7, 1.8, 1.9**
     *
     * For any application with environments, the environments list SHALL display
     * exactly one row per environment, and each row SHALL contain the correct
     * environment name, rate limit display, origins count, and webhook status.
     */
    it('should create exactly one row per config (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(environmentConfigArbitrary, { minLength: 0, maxLength: 5 }),
          (configs) => {
            const rows = buildEnvironmentRows(configs, []);
            return rows.length === configs.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should format rate limit as "X/min" (100 iterations)', () => {
      fc.assert(
        fc.property(environmentConfigArbitrary, (config) => {
          const rows = buildEnvironmentRows([config], []);
          const row = rows[0];
          return row.rateLimitDisplay === `${config.rateLimitPerMinute}/min`;
        }),
        { numRuns: 100 }
      );
    });

    it('should count origins correctly (100 iterations)', () => {
      fc.assert(
        fc.property(environmentConfigArbitrary, (config) => {
          const rows = buildEnvironmentRows([config], []);
          const row = rows[0];
          const expectedCount = config.allowedOrigins?.length || 0;
          return row.originsCount === expectedCount;
        }),
        { numRuns: 100 }
      );
    });

    it('should set webhook status based on webhookEnabled (100 iterations)', () => {
      fc.assert(
        fc.property(environmentConfigArbitrary, (config) => {
          const rows = buildEnvironmentRows([config], []);
          const row = rows[0];
          const expectedStatus = config.webhookEnabled ? 'Enabled' : 'Disabled';
          return row.webhookStatus === expectedStatus;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: API Key Display', () => {
    /**
     * Feature: environments-list-and-detail, Property 3: API Key Display
     * **Validates: Requirements 1.4, 1.5**
     *
     * For any environment with an API key, the key prefix SHALL be displayed.
     * For any environment without an API key, "—" SHALL be displayed.
     */
    it('should display "—" when no API key exists (100 iterations)', () => {
      fc.assert(
        fc.property(environmentConfigArbitrary, (config) => {
          const rows = buildEnvironmentRows([config], []);
          const row = rows[0];
          return row.keyPrefix === '—';
        }),
        { numRuns: 100 }
      );
    });

    it('should display key prefix when API key exists (100 iterations)', () => {
      fc.assert(
        fc.property(environmentConfigArbitrary, (config) => {
          const apiKey: IApplicationApiKeys = {
            applicationApiKeyId: 'test-key-id',
            applicationId: config.applicationId,
            organizationId: config.organizationId,
            environment: config.environment,
            keyPrefix: 'pk_live_abc123',
            keyHash: 'hash123',
            keyType: ApplicationApiKeyType.Publishable,
            status: ApplicationApiKeyStatus.Active,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const rows = buildEnvironmentRows([config], [apiKey]);
          const row = rows[0];
          return row.keyPrefix === 'pk_live_abc123';
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Filter State Updates Filtered Rows', () => {
    /**
     * Feature: environments-list-and-detail, Property 4: Filter State Updates Filtered Rows
     * **Validates: Requirements 2.4, 2.5**
     *
     * For any set of environments and any filter criteria, the filtered environment
     * rows SHALL contain only rows that match all active filter criteria.
     */
    it('should filter by search term matching environment label (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(environmentConfigArbitrary, { minLength: 1, maxLength: 5 }),
          fc.string({ minLength: 1, maxLength: 4 }),
          (configs, searchTerm) => {
            // Load environments
            const loadAction = EnvironmentsActions.loadEnvironmentsSuccess({
              configs,
              apiKeys: [],
            });
            const stateAfterLoad = environmentsReducer(initialEnvironmentsState, loadAction);

            // Apply search filter
            const filterAction = EnvironmentsActions.setSearchTerm({ searchTerm });
            const stateAfterFilter = environmentsReducer(stateAfterLoad, filterAction);

            // All filtered rows should match the search term
            return stateAfterFilter.filteredEnvironmentRows.every(
              (row) =>
                row.environmentLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
                row.config.environment.toLowerCase().includes(searchTerm.toLowerCase())
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter by status (100 iterations)', () => {
      const statusArbitrary = fc.constantFrom(
        'Active',
        'Not Configured',
        'Revoked',
        'Expired'
      );

      fc.assert(
        fc.property(
          fc.array(environmentConfigArbitrary, { minLength: 1, maxLength: 5 }),
          statusArbitrary,
          (configs, statusFilter) => {
            // Load environments
            const loadAction = EnvironmentsActions.loadEnvironmentsSuccess({
              configs,
              apiKeys: [],
            });
            const stateAfterLoad = environmentsReducer(initialEnvironmentsState, loadAction);

            // Apply status filter
            const filterAction = EnvironmentsActions.setStatusFilter({ statusFilter });
            const stateAfterFilter = environmentsReducer(stateAfterLoad, filterAction);

            // All filtered rows should match the status filter
            return stateAfterFilter.filteredEnvironmentRows.every(
              (row) => row.status === statusFilter
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return all rows when filters are empty (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(environmentConfigArbitrary, { minLength: 0, maxLength: 5 }),
          (configs) => {
            // Load environments
            const loadAction = EnvironmentsActions.loadEnvironmentsSuccess({
              configs,
              apiKeys: [],
            });
            const stateAfterLoad = environmentsReducer(initialEnvironmentsState, loadAction);

            // Clear filters
            const clearSearchAction = EnvironmentsActions.setSearchTerm({ searchTerm: '' });
            const stateAfterClearSearch = environmentsReducer(
              stateAfterLoad,
              clearSearchAction
            );

            const clearStatusAction = EnvironmentsActions.setStatusFilter({
              statusFilter: '',
            });
            const stateAfterClearStatus = environmentsReducer(
              stateAfterClearSearch,
              clearStatusAction
            );

            // All rows should be returned
            return (
              stateAfterClearStatus.filteredEnvironmentRows.length ===
              stateAfterClearStatus.environmentRows.length
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Error State Management', () => {
    it('loadEnvironmentsFailure should persist error message (100 iterations)', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 200 }), (errorMessage) => {
          const action = EnvironmentsActions.loadEnvironmentsFailure({
            error: errorMessage,
          });
          const state = environmentsReducer(initialEnvironmentsState, action);

          return state.error === errorMessage && state.isLoading === false;
        }),
        { numRuns: 100 }
      );
    });

    it('clearErrors should clear error state (100 iterations)', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 100 }), (error) => {
          const stateWithError = {
            ...initialEnvironmentsState,
            error,
          };

          const action = EnvironmentsActions.clearErrors();
          const state = environmentsReducer(stateWithError, action);

          return state.error === null;
        }),
        { numRuns: 100 }
      );
    });
  });
});
