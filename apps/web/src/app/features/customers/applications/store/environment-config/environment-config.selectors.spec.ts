/**
 * Environment Config Selectors Unit Tests
 *
 * Tests for the environment-config NgRx selectors.
 *
 * @see .kiro/specs/application-environment-config/design.md
 * _Requirements: 1.1, 2.1, 3.1, 4.1, 8.1_
 */

import * as fromSelectors from './environment-config.selectors';
import {
  EnvironmentConfigState,
  EnvironmentConfigTableRow,
  initialEnvironmentConfigState,
} from './environment-config.state';
import { IApplicationEnvironmentConfig } from '../../../../../core/models/ApplicationEnvironmentConfigModel';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';

describe('EnvironmentConfig Selectors', () => {
  const createMockConfig = (
    overrides: Partial<IApplicationEnvironmentConfig> = {}
  ): IApplicationEnvironmentConfig => ({
    applicationId: 'app-1',
    environment: Environment.Development,
    organizationId: 'org-1',
    allowedOrigins: ['https://example.com'],
    rateLimitPerMinute: 60,
    rateLimitPerDay: 10000,
    webhookUrl: 'https://webhook.example.com',
    webhookSecret: 'secret123',
    webhookEvents: ['USER_CREATED'],
    webhookEnabled: true,
    webhookMaxRetries: 3,
    webhookRetryDelaySeconds: 60,
    featureFlags: { feature_a: true },
    metadata: {},
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-15'),
    ...overrides,
  });

  const createMockConfigRow = (
    config: IApplicationEnvironmentConfig
  ): EnvironmentConfigTableRow => ({
    applicationId: config.applicationId,
    environment: config.environment,
    organizationId: config.organizationId,
    allowedOriginsCount: config.allowedOrigins?.length ?? 0,
    rateLimitPerMinute: config.rateLimitPerMinute,
    rateLimitPerDay: config.rateLimitPerDay,
    webhookEnabled: config.webhookEnabled ?? false,
    featureFlagsCount: Object.keys(config.featureFlags ?? {}).length,
    updatedAt: config.updatedAt instanceof Date ? config.updatedAt.getTime() : 0,
  });

  describe('Core Data Selectors', () => {
    it('should select configs', () => {
      const configs = [createMockConfig()];
      const state: EnvironmentConfigState = { ...initialEnvironmentConfigState, configs };

      const result = fromSelectors.selectConfigs.projector(state);
      expect(result).toEqual(configs);
    });

    it('should return empty array when state has no configs', () => {
      const result = fromSelectors.selectConfigs.projector(initialEnvironmentConfigState);
      expect(result).toEqual([]);
    });

    it('should select selectedConfig', () => {
      const selectedConfig = createMockConfig();
      const state: EnvironmentConfigState = { ...initialEnvironmentConfigState, selectedConfig };

      const result = fromSelectors.selectSelectedConfig.projector(state);
      expect(result).toEqual(selectedConfig);
    });

    it('should select applicationId', () => {
      const state: EnvironmentConfigState = {
        ...initialEnvironmentConfigState,
        applicationId: 'app-1',
      };

      const result = fromSelectors.selectApplicationId.projector(state);
      expect(result).toBe('app-1');
    });

    it('should select organizationId', () => {
      const state: EnvironmentConfigState = {
        ...initialEnvironmentConfigState,
        organizationId: 'org-1',
      };

      const result = fromSelectors.selectOrganizationId.projector(state);
      expect(result).toBe('org-1');
    });
  });

  describe('Table Display Selectors', () => {
    it('should select configRows', () => {
      const config = createMockConfig();
      const configRows = [createMockConfigRow(config)];
      const state: EnvironmentConfigState = { ...initialEnvironmentConfigState, configRows };

      const result = fromSelectors.selectConfigRows.projector(state);
      expect(result).toEqual(configRows);
    });

    it('should select filteredConfigRows', () => {
      const config = createMockConfig();
      const filteredRows = [createMockConfigRow(config)];
      const state: EnvironmentConfigState = { ...initialEnvironmentConfigState, filteredRows };

      const result = fromSelectors.selectFilteredConfigRows.projector(state);
      expect(result).toEqual(filteredRows);
    });
  });

  describe('Filter Selectors', () => {
    it('should select searchTerm', () => {
      const state: EnvironmentConfigState = { ...initialEnvironmentConfigState, searchTerm: 'test' };

      const result = fromSelectors.selectSearchTerm.projector(state);
      expect(result).toBe('test');
    });

    it('should select environmentFilter', () => {
      const state: EnvironmentConfigState = {
        ...initialEnvironmentConfigState,
        environmentFilter: 'PRODUCTION',
      };

      const result = fromSelectors.selectEnvironmentFilter.projector(state);
      expect(result).toBe('PRODUCTION');
    });
  });

  describe('Loading State Selectors', () => {
    it('should select isLoading', () => {
      const state: EnvironmentConfigState = { ...initialEnvironmentConfigState, isLoading: true };

      const result = fromSelectors.selectIsLoading.projector(state);
      expect(result).toBe(true);
    });

    it('should select isSaving', () => {
      const state: EnvironmentConfigState = { ...initialEnvironmentConfigState, isSaving: true };

      const result = fromSelectors.selectIsSaving.projector(state);
      expect(result).toBe(true);
    });
  });

  describe('Error Selectors', () => {
    it('should select loadError', () => {
      const state: EnvironmentConfigState = {
        ...initialEnvironmentConfigState,
        loadError: 'Load error',
      };

      const result = fromSelectors.selectLoadError.projector(state);
      expect(result).toBe('Load error');
    });

    it('should select saveError', () => {
      const state: EnvironmentConfigState = {
        ...initialEnvironmentConfigState,
        saveError: 'Save error',
      };

      const result = fromSelectors.selectSaveError.projector(state);
      expect(result).toBe('Save error');
    });
  });

  describe('Computed Selectors', () => {
    it('should return true for selectHasConfigs when configs exist', () => {
      const configs = [createMockConfig()];

      const result = fromSelectors.selectHasConfigs.projector(configs);
      expect(result).toBe(true);
    });

    it('should return false for selectHasConfigs when no configs', () => {
      const result = fromSelectors.selectHasConfigs.projector([]);
      expect(result).toBe(false);
    });

    it('should return correct count for selectConfigCount', () => {
      const configs = [
        createMockConfig({ environment: Environment.Development }),
        createMockConfig({ environment: Environment.Production }),
      ];

      const result = fromSelectors.selectConfigCount.projector(configs);
      expect(result).toBe(2);
    });

    it('should return correct count for selectFilteredConfigCount', () => {
      const filteredRows = [
        createMockConfigRow(createMockConfig()),
        createMockConfigRow(createMockConfig({ environment: Environment.Production })),
      ];

      const result = fromSelectors.selectFilteredConfigCount.projector(filteredRows);
      expect(result).toBe(2);
    });

    it('should return true for selectHasFiltersApplied when searchTerm is set', () => {
      const result = fromSelectors.selectHasFiltersApplied.projector('test', '');
      expect(result).toBe(true);
    });

    it('should return true for selectHasFiltersApplied when environmentFilter is set', () => {
      const result = fromSelectors.selectHasFiltersApplied.projector('', 'PRODUCTION');
      expect(result).toBe(true);
    });

    it('should return false for selectHasFiltersApplied when no filters', () => {
      const result = fromSelectors.selectHasFiltersApplied.projector('', '');
      expect(result).toBe(false);
    });

    it('should return true for selectIsAnyOperationInProgress when loading', () => {
      const result = fromSelectors.selectIsAnyOperationInProgress.projector(true, false);
      expect(result).toBe(true);
    });

    it('should return true for selectIsAnyOperationInProgress when saving', () => {
      const result = fromSelectors.selectIsAnyOperationInProgress.projector(false, true);
      expect(result).toBe(true);
    });

    it('should return false for selectIsAnyOperationInProgress when no operations', () => {
      const result = fromSelectors.selectIsAnyOperationInProgress.projector(false, false);
      expect(result).toBe(false);
    });

    it('should return true for selectHasAnyError when loadError exists', () => {
      const result = fromSelectors.selectHasAnyError.projector('error', null);
      expect(result).toBe(true);
    });

    it('should return true for selectHasAnyError when saveError exists', () => {
      const result = fromSelectors.selectHasAnyError.projector(null, 'error');
      expect(result).toBe(true);
    });

    it('should return false for selectHasAnyError when no errors', () => {
      const result = fromSelectors.selectHasAnyError.projector(null, null);
      expect(result).toBe(false);
    });
  });

  describe('Parameterized Selectors', () => {
    it('should find config by environment with selectConfigByEnvironment', () => {
      const configs = [
        createMockConfig({ environment: Environment.Development }),
        createMockConfig({ environment: Environment.Production }),
      ];

      const selector = fromSelectors.selectConfigByEnvironment(Environment.Production);
      const result = selector.projector(configs);
      expect(result?.environment).toBe(Environment.Production);
    });

    it('should return undefined when config not found for environment', () => {
      const configs = [createMockConfig({ environment: Environment.Development })];

      const selector = fromSelectors.selectConfigByEnvironment(Environment.Production);
      const result = selector.projector(configs);
      expect(result).toBeUndefined();
    });
  });

  describe('Selected Config Derived Selectors', () => {
    it('should select allowed origins from selected config', () => {
      const config = createMockConfig({
        allowedOrigins: ['https://example.com', 'https://other.com'],
      });

      const result = fromSelectors.selectSelectedConfigAllowedOrigins.projector(config);
      expect(result).toEqual(['https://example.com', 'https://other.com']);
    });

    it('should return empty array when no selected config', () => {
      const result = fromSelectors.selectSelectedConfigAllowedOrigins.projector(null);
      expect(result).toEqual([]);
    });

    it('should select allowed origins count', () => {
      const origins = ['https://example.com', 'https://other.com'];

      const result = fromSelectors.selectSelectedConfigAllowedOriginsCount.projector(origins);
      expect(result).toBe(2);
    });

    it('should select rate limits from selected config', () => {
      const config = createMockConfig({
        rateLimitPerMinute: 100,
        rateLimitPerDay: 5000,
      });

      const result = fromSelectors.selectSelectedConfigRateLimits.projector(config);
      expect(result).toEqual({ perMinute: 100, perDay: 5000 });
    });

    it('should return default rate limits when no selected config', () => {
      const result = fromSelectors.selectSelectedConfigRateLimits.projector(null);
      expect(result).toEqual({ perMinute: 0, perDay: 0 });
    });

    it('should select webhook config from selected config', () => {
      const config = createMockConfig({
        webhookUrl: 'https://webhook.example.com',
        webhookSecret: 'secret123',
        webhookEvents: ['USER_CREATED', 'USER_UPDATED'],
        webhookEnabled: true,
        webhookMaxRetries: 5,
        webhookRetryDelaySeconds: 120,
      });

      const result = fromSelectors.selectSelectedConfigWebhookConfig.projector(config);
      expect(result).toEqual({
        url: 'https://webhook.example.com',
        secret: 'secret123',
        events: ['USER_CREATED', 'USER_UPDATED'],
        enabled: true,
        maxRetries: 5,
        retryDelaySeconds: 120,
      });
    });

    it('should return default webhook config when no selected config', () => {
      const result = fromSelectors.selectSelectedConfigWebhookConfig.projector(null);
      expect(result).toEqual({
        url: '',
        secret: '',
        events: [],
        enabled: false,
        maxRetries: 3,
        retryDelaySeconds: 60,
      });
    });

    it('should select feature flags from selected config', () => {
      const config = createMockConfig({
        featureFlags: { feature_a: true, feature_b: false },
      });

      const result = fromSelectors.selectSelectedConfigFeatureFlags.projector(config);
      expect(result).toEqual({ feature_a: true, feature_b: false });
    });

    it('should return empty object when no selected config', () => {
      const result = fromSelectors.selectSelectedConfigFeatureFlags.projector(null);
      expect(result).toEqual({});
    });

    it('should select feature flags count', () => {
      const flags = { feature_a: true, feature_b: false, feature_c: true };

      const result = fromSelectors.selectSelectedConfigFeatureFlagsCount.projector(flags);
      expect(result).toBe(3);
    });

    it('should select feature flag keys', () => {
      const flags = { feature_a: true, feature_b: false };

      const result = fromSelectors.selectSelectedConfigFeatureFlagKeys.projector(flags);
      expect(result).toEqual(['feature_a', 'feature_b']);
    });

    it('should select feature flag by key', () => {
      const flags = { feature_a: true, feature_b: false };

      const selector = fromSelectors.selectFeatureFlagByKey('feature_a');
      const result = selector.projector(flags);
      expect(result).toBe(true);
    });

    it('should return undefined for non-existent feature flag key', () => {
      const flags = { feature_a: true };

      const selector = fromSelectors.selectFeatureFlagByKey('feature_x');
      const result = selector.projector(flags);
      expect(result).toBeUndefined();
    });
  });

  describe('Environment-Specific Config Selectors', () => {
    it('should select production config', () => {
      const configs = [
        createMockConfig({ environment: Environment.Development }),
        createMockConfig({ environment: Environment.Production }),
        createMockConfig({ environment: Environment.Staging }),
      ];

      const result = fromSelectors.selectProductionConfig.projector(configs);
      expect(result?.environment).toBe(Environment.Production);
    });

    it('should select staging config', () => {
      const configs = [
        createMockConfig({ environment: Environment.Development }),
        createMockConfig({ environment: Environment.Staging }),
      ];

      const result = fromSelectors.selectStagingConfig.projector(configs);
      expect(result?.environment).toBe(Environment.Staging);
    });

    it('should select development config', () => {
      const configs = [
        createMockConfig({ environment: Environment.Development }),
        createMockConfig({ environment: Environment.Production }),
      ];

      const result = fromSelectors.selectDevelopmentConfig.projector(configs);
      expect(result?.environment).toBe(Environment.Development);
    });

    it('should return undefined when environment config not found', () => {
      const configs = [createMockConfig({ environment: Environment.Development })];

      const result = fromSelectors.selectProductionConfig.projector(configs);
      expect(result).toBeUndefined();
    });
  });

  describe('Environment Availability Selectors', () => {
    it('should select available environments', () => {
      const configs = [
        createMockConfig({ environment: Environment.Development }),
        createMockConfig({ environment: Environment.Production }),
      ];

      const result = fromSelectors.selectAvailableEnvironments.projector(configs);
      expect(result).toContain(Environment.Development);
      expect(result).toContain(Environment.Production);
      expect(result.length).toBe(2);
    });

    it('should select missing environments', () => {
      const available = [Environment.Development];

      const result = fromSelectors.selectMissingEnvironments.projector(available);
      expect(result).toContain(Environment.Production);
      expect(result).toContain(Environment.Staging);
      expect(result).not.toContain(Environment.Development);
    });

    it('should return empty array when all environments available', () => {
      const available = [
        Environment.Development,
        Environment.Staging,
        Environment.Production,
      ];

      const result = fromSelectors.selectMissingEnvironments.projector(available);
      expect(result).toEqual([]);
    });
  });
});
