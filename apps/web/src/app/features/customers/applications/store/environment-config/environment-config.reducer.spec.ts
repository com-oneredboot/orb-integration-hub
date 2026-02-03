/**
 * Environment Config Reducer Unit Tests
 *
 * Tests for the environment-config NgRx reducer.
 *
 * @see .kiro/specs/application-environment-config/design.md
 * _Requirements: 1.1, 2.1, 3.1, 4.1, 8.1_
 */

import { environmentConfigReducer } from './environment-config.reducer';
import { EnvironmentConfigActions } from './environment-config.actions';
import { EnvironmentConfigState, initialEnvironmentConfigState } from './environment-config.state';
import { IApplicationEnvironmentConfig } from '../../../../../core/models/ApplicationEnvironmentConfigModel';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';

describe('EnvironmentConfig Reducer', () => {
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

  describe('Initial State', () => {
    it('should return the initial state', () => {
      const action = { type: 'UNKNOWN' };
      const state = environmentConfigReducer(undefined, action);
      expect(state).toEqual(initialEnvironmentConfigState);
    });
  });

  describe('Set Application Context', () => {
    it('should set application and organization IDs', () => {
      const action = EnvironmentConfigActions.setApplicationContext({
        applicationId: 'app-1',
        organizationId: 'org-1',
      });
      const state = environmentConfigReducer(initialEnvironmentConfigState, action);

      expect(state.applicationId).toBe('app-1');
      expect(state.organizationId).toBe('org-1');
    });
  });

  describe('Load Configs', () => {
    it('should set isLoading to true on loadConfigs', () => {
      const action = EnvironmentConfigActions.loadConfigs({ applicationId: 'app-1' });
      const state = environmentConfigReducer(initialEnvironmentConfigState, action);

      expect(state.isLoading).toBe(true);
      expect(state.loadError).toBeNull();
    });

    it('should populate configs on loadConfigsSuccess', () => {
      const configs = [
        createMockConfig({ environment: Environment.Development }),
        createMockConfig({ environment: Environment.Production }),
      ];
      const action = EnvironmentConfigActions.loadConfigsSuccess({ configs });
      const state = environmentConfigReducer(initialEnvironmentConfigState, action);

      expect(state.isLoading).toBe(false);
      expect(state.configs).toEqual(configs);
      expect(state.loadError).toBeNull();
    });

    it('should set loadError on loadConfigsFailure', () => {
      const action = EnvironmentConfigActions.loadConfigsFailure({
        error: 'Failed to load configs',
      });
      const state = environmentConfigReducer(initialEnvironmentConfigState, action);

      expect(state.isLoading).toBe(false);
      expect(state.loadError).toBe('Failed to load configs');
    });
  });

  describe('Load Single Config', () => {
    it('should set isLoading to true on loadConfig', () => {
      const action = EnvironmentConfigActions.loadConfig({
        applicationId: 'app-1',
        environment: Environment.Development,
      });
      const state = environmentConfigReducer(initialEnvironmentConfigState, action);

      expect(state.isLoading).toBe(true);
      expect(state.loadError).toBeNull();
    });

    it('should set selectedConfig on loadConfigSuccess', () => {
      const config = createMockConfig();
      const action = EnvironmentConfigActions.loadConfigSuccess({ config });
      const state = environmentConfigReducer(initialEnvironmentConfigState, action);

      expect(state.isLoading).toBe(false);
      expect(state.selectedConfig).toEqual(config);
      expect(state.loadError).toBeNull();
    });

    it('should set loadError on loadConfigFailure', () => {
      const action = EnvironmentConfigActions.loadConfigFailure({
        error: 'Config not found',
      });
      const state = environmentConfigReducer(initialEnvironmentConfigState, action);

      expect(state.isLoading).toBe(false);
      expect(state.loadError).toBe('Config not found');
    });
  });

  describe('Create Config', () => {
    it('should set isSaving to true on createConfig', () => {
      const action = EnvironmentConfigActions.createConfig({
        applicationId: 'app-1',
        organizationId: 'org-1',
        environment: Environment.Development,
      });
      const state = environmentConfigReducer(initialEnvironmentConfigState, action);

      expect(state.isSaving).toBe(true);
      expect(state.saveError).toBeNull();
    });

    it('should add config to configs on createConfigSuccess', () => {
      const config = createMockConfig();
      const action = EnvironmentConfigActions.createConfigSuccess({ config });
      const state = environmentConfigReducer(initialEnvironmentConfigState, action);

      expect(state.isSaving).toBe(false);
      expect(state.configs).toContain(config);
      expect(state.selectedConfig).toEqual(config);
      expect(state.saveError).toBeNull();
    });

    it('should set saveError on createConfigFailure', () => {
      const action = EnvironmentConfigActions.createConfigFailure({
        error: 'Failed to create config',
      });
      const state = environmentConfigReducer(initialEnvironmentConfigState, action);

      expect(state.isSaving).toBe(false);
      expect(state.saveError).toBe('Failed to create config');
    });
  });

  describe('Update Config', () => {
    it('should set isSaving to true on updateConfig', () => {
      const action = EnvironmentConfigActions.updateConfig({
        applicationId: 'app-1',
        environment: Environment.Development,
        rateLimitPerMinute: 100,
      });
      const state = environmentConfigReducer(initialEnvironmentConfigState, action);

      expect(state.isSaving).toBe(true);
      expect(state.saveError).toBeNull();
    });

    it('should update config in configs on updateConfigSuccess', () => {
      const existingConfig = createMockConfig({ rateLimitPerMinute: 60 });
      const updatedConfig = createMockConfig({ rateLimitPerMinute: 100 });

      const initialState: EnvironmentConfigState = {
        ...initialEnvironmentConfigState,
        configs: [existingConfig],
        selectedConfig: existingConfig,
      };

      const action = EnvironmentConfigActions.updateConfigSuccess({ config: updatedConfig });
      const state = environmentConfigReducer(initialState, action);

      expect(state.isSaving).toBe(false);
      expect(state.configs[0].rateLimitPerMinute).toBe(100);
      expect(state.selectedConfig?.rateLimitPerMinute).toBe(100);
      expect(state.saveError).toBeNull();
    });

    it('should set saveError on updateConfigFailure', () => {
      const action = EnvironmentConfigActions.updateConfigFailure({
        error: 'Failed to update config',
      });
      const state = environmentConfigReducer(initialEnvironmentConfigState, action);

      expect(state.isSaving).toBe(false);
      expect(state.saveError).toBe('Failed to update config');
    });
  });

  describe('Add Allowed Origin', () => {
    it('should set isSaving to true on addAllowedOrigin', () => {
      const action = EnvironmentConfigActions.addAllowedOrigin({
        applicationId: 'app-1',
        environment: Environment.Development,
        origin: 'https://new-origin.com',
      });
      const state = environmentConfigReducer(initialEnvironmentConfigState, action);

      expect(state.isSaving).toBe(true);
      expect(state.saveError).toBeNull();
    });

    it('should update config with new origin on addAllowedOriginSuccess', () => {
      const existingConfig = createMockConfig({ allowedOrigins: ['https://example.com'] });
      const updatedConfig = createMockConfig({
        allowedOrigins: ['https://example.com', 'https://new-origin.com'],
      });

      const initialState: EnvironmentConfigState = {
        ...initialEnvironmentConfigState,
        configs: [existingConfig],
        selectedConfig: existingConfig,
      };

      const action = EnvironmentConfigActions.addAllowedOriginSuccess({ config: updatedConfig });
      const state = environmentConfigReducer(initialState, action);

      expect(state.isSaving).toBe(false);
      expect(state.configs[0].allowedOrigins).toContain('https://new-origin.com');
      expect(state.saveError).toBeNull();
    });
  });

  describe('Remove Allowed Origin', () => {
    it('should set isSaving to true on removeAllowedOrigin', () => {
      const action = EnvironmentConfigActions.removeAllowedOrigin({
        applicationId: 'app-1',
        environment: Environment.Development,
        origin: 'https://example.com',
      });
      const state = environmentConfigReducer(initialEnvironmentConfigState, action);

      expect(state.isSaving).toBe(true);
      expect(state.saveError).toBeNull();
    });

    it('should update config without removed origin on removeAllowedOriginSuccess', () => {
      const existingConfig = createMockConfig({
        allowedOrigins: ['https://example.com', 'https://other.com'],
      });
      const updatedConfig = createMockConfig({ allowedOrigins: ['https://other.com'] });

      const initialState: EnvironmentConfigState = {
        ...initialEnvironmentConfigState,
        configs: [existingConfig],
        selectedConfig: existingConfig,
      };

      const action = EnvironmentConfigActions.removeAllowedOriginSuccess({ config: updatedConfig });
      const state = environmentConfigReducer(initialState, action);

      expect(state.isSaving).toBe(false);
      expect(state.configs[0].allowedOrigins).not.toContain('https://example.com');
      expect(state.saveError).toBeNull();
    });
  });

  describe('Update Webhook Config', () => {
    it('should set isSaving to true on updateWebhookConfig', () => {
      const action = EnvironmentConfigActions.updateWebhookConfig({
        applicationId: 'app-1',
        environment: Environment.Development,
        webhookUrl: 'https://new-webhook.com',
        webhookEnabled: true,
      });
      const state = environmentConfigReducer(initialEnvironmentConfigState, action);

      expect(state.isSaving).toBe(true);
      expect(state.saveError).toBeNull();
    });

    it('should update webhook config on updateWebhookConfigSuccess', () => {
      const existingConfig = createMockConfig({ webhookEnabled: false });
      const updatedConfig = createMockConfig({ webhookEnabled: true });

      const initialState: EnvironmentConfigState = {
        ...initialEnvironmentConfigState,
        configs: [existingConfig],
        selectedConfig: existingConfig,
      };

      const action = EnvironmentConfigActions.updateWebhookConfigSuccess({ config: updatedConfig });
      const state = environmentConfigReducer(initialState, action);

      expect(state.isSaving).toBe(false);
      expect(state.configs[0].webhookEnabled).toBe(true);
      expect(state.saveError).toBeNull();
    });
  });

  describe('Regenerate Webhook Secret', () => {
    it('should set isSaving to true on regenerateWebhookSecret', () => {
      const action = EnvironmentConfigActions.regenerateWebhookSecret({
        applicationId: 'app-1',
        environment: Environment.Development,
      });
      const state = environmentConfigReducer(initialEnvironmentConfigState, action);

      expect(state.isSaving).toBe(true);
      expect(state.saveError).toBeNull();
    });

    it('should complete on regenerateWebhookSecretSuccess', () => {
      const action = EnvironmentConfigActions.regenerateWebhookSecretSuccess({
        webhookSecret: 'new-secret-123',
      });
      const state = environmentConfigReducer(initialEnvironmentConfigState, action);

      expect(state.isSaving).toBe(false);
      expect(state.saveError).toBeNull();
    });
  });

  describe('Set Feature Flag', () => {
    it('should set isSaving to true on setFeatureFlag', () => {
      const action = EnvironmentConfigActions.setFeatureFlag({
        applicationId: 'app-1',
        environment: Environment.Development,
        key: 'new_feature',
        value: true,
      });
      const state = environmentConfigReducer(initialEnvironmentConfigState, action);

      expect(state.isSaving).toBe(true);
      expect(state.saveError).toBeNull();
    });

    it('should update feature flags on setFeatureFlagSuccess', () => {
      const existingConfig = createMockConfig({ featureFlags: { feature_a: true } });
      const updatedConfig = createMockConfig({
        featureFlags: { feature_a: true, feature_b: false },
      });

      const initialState: EnvironmentConfigState = {
        ...initialEnvironmentConfigState,
        configs: [existingConfig],
        selectedConfig: existingConfig,
      };

      const action = EnvironmentConfigActions.setFeatureFlagSuccess({ config: updatedConfig });
      const state = environmentConfigReducer(initialState, action);

      expect(state.isSaving).toBe(false);
      expect(state.configs[0].featureFlags).toEqual({ feature_a: true, feature_b: false });
      expect(state.saveError).toBeNull();
    });
  });

  describe('Delete Feature Flag', () => {
    it('should set isSaving to true on deleteFeatureFlag', () => {
      const action = EnvironmentConfigActions.deleteFeatureFlag({
        applicationId: 'app-1',
        environment: Environment.Development,
        key: 'feature_a',
      });
      const state = environmentConfigReducer(initialEnvironmentConfigState, action);

      expect(state.isSaving).toBe(true);
      expect(state.saveError).toBeNull();
    });

    it('should remove feature flag on deleteFeatureFlagSuccess', () => {
      const existingConfig = createMockConfig({
        featureFlags: { feature_a: true, feature_b: false },
      });
      const updatedConfig = createMockConfig({ featureFlags: { feature_b: false } });

      const initialState: EnvironmentConfigState = {
        ...initialEnvironmentConfigState,
        configs: [existingConfig],
        selectedConfig: existingConfig,
      };

      const action = EnvironmentConfigActions.deleteFeatureFlagSuccess({ config: updatedConfig });
      const state = environmentConfigReducer(initialState, action);

      expect(state.isSaving).toBe(false);
      expect(state.configs[0].featureFlags).toEqual({ feature_b: false });
      expect(state.saveError).toBeNull();
    });
  });

  describe('Selection Management', () => {
    it('should set selectedConfig on selectConfig', () => {
      const config = createMockConfig();
      const action = EnvironmentConfigActions.selectConfig({ config });
      const state = environmentConfigReducer(initialEnvironmentConfigState, action);

      expect(state.selectedConfig).toEqual(config);
    });

    it('should clear selectedConfig when null is passed', () => {
      const initialState: EnvironmentConfigState = {
        ...initialEnvironmentConfigState,
        selectedConfig: createMockConfig(),
      };

      const action = EnvironmentConfigActions.selectConfig({ config: null });
      const state = environmentConfigReducer(initialState, action);

      expect(state.selectedConfig).toBeNull();
    });
  });

  describe('Filter Management', () => {
    it('should set searchTerm on setSearchTerm', () => {
      const action = EnvironmentConfigActions.setSearchTerm({ searchTerm: 'test' });
      const state = environmentConfigReducer(initialEnvironmentConfigState, action);

      expect(state.searchTerm).toBe('test');
    });

    it('should set environmentFilter on setEnvironmentFilter', () => {
      const action = EnvironmentConfigActions.setEnvironmentFilter({
        environmentFilter: 'PRODUCTION',
      });
      const state = environmentConfigReducer(initialEnvironmentConfigState, action);

      expect(state.environmentFilter).toBe('PRODUCTION');
    });
  });

  describe('Error Management', () => {
    it('should clear all errors on clearErrors', () => {
      const initialState: EnvironmentConfigState = {
        ...initialEnvironmentConfigState,
        loadError: 'Load error',
        saveError: 'Save error',
      };

      const action = EnvironmentConfigActions.clearErrors();
      const state = environmentConfigReducer(initialState, action);

      expect(state.loadError).toBeNull();
      expect(state.saveError).toBeNull();
    });

    it('should clear only saveError on clearSaveError', () => {
      const initialState: EnvironmentConfigState = {
        ...initialEnvironmentConfigState,
        loadError: 'Load error',
        saveError: 'Save error',
      };

      const action = EnvironmentConfigActions.clearSaveError();
      const state = environmentConfigReducer(initialState, action);

      expect(state.loadError).toBe('Load error');
      expect(state.saveError).toBeNull();
    });
  });

  describe('UI State Management', () => {
    it('should set isLoading on setLoading', () => {
      const action = EnvironmentConfigActions.setLoading({ isLoading: true });
      const state = environmentConfigReducer(initialEnvironmentConfigState, action);
      expect(state.isLoading).toBe(true);
    });

    it('should set isSaving on setSaving', () => {
      const action = EnvironmentConfigActions.setSaving({ isSaving: true });
      const state = environmentConfigReducer(initialEnvironmentConfigState, action);
      expect(state.isSaving).toBe(true);
    });
  });

  describe('Reset State', () => {
    it('should reset to initial state on resetState', () => {
      const modifiedState: EnvironmentConfigState = {
        ...initialEnvironmentConfigState,
        configs: [createMockConfig()],
        isLoading: true,
        loadError: 'Some error',
      };

      const action = EnvironmentConfigActions.resetState();
      const state = environmentConfigReducer(modifiedState, action);

      expect(state).toEqual(initialEnvironmentConfigState);
    });
  });
});
