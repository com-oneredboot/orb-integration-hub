/**
 * @deprecated This file is deprecated. Use the environments store instead.
 * The API keys functionality has been consolidated into the environments store.
 * Tests should be updated to use environments store reducer.
 *
 * API Keys Reducer Unit Tests
 *
 * Tests for the api-keys NgRx reducer.
 *
 * @see .kiro/specs/application-access-management/design.md
 * @see .kiro/specs/store-consolidation/requirements.md - Requirements 5.1, 5.2
 * _Requirements: 9.5_
 */

import { apiKeysReducer } from './api-keys.reducer';
import { ApiKeysActions } from './api-keys.actions';
import { ApiKeysState, ApiKeyTableRow, GeneratedKeyResult, initialApiKeysState } from './api-keys.state';
import { IApplicationApiKeys } from '../../../../../core/models/ApplicationApiKeysModel';
import { ApplicationApiKeyStatus } from '../../../../../core/enums/ApplicationApiKeyStatusEnum';
import { ApplicationApiKeyType } from '../../../../../core/enums/ApplicationApiKeyTypeEnum';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';

describe('ApiKeys Reducer', () => {
  const createMockApiKey = (overrides: Partial<IApplicationApiKeys> = {}): IApplicationApiKeys => ({
    applicationApiKeyId: 'key-1',
    applicationId: 'app-1',
    organizationId: 'org-1',
    environment: Environment.Development,
    keyHash: 'hash123',
    keyPrefix: 'pk_dev_',
    keyType: ApplicationApiKeyType.Publishable,
    status: ApplicationApiKeyStatus.Active,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-15'),
    ...overrides,
  });

  const createMockApiKeyRow = (apiKey: IApplicationApiKeys): ApiKeyTableRow => ({
    apiKey,
    applicationId: apiKey.applicationId,
    environmentLabel: 'Development',
    statusLabel: 'Active',
    lastActivity: 'Just now',
    isRotating: false,
  });

  const createMockGeneratedKey = (overrides: Partial<GeneratedKeyResult> = {}): GeneratedKeyResult => ({
    apiKeyId: 'key-1',
    fullKey: 'orb_dev_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
    environment: Environment.Development,
    keyPrefix: 'orb_dev_',
    ...overrides,
  });

  describe('Initial State', () => {
    it('should return the initial state', () => {
      const action = { type: 'UNKNOWN' };
      const state = apiKeysReducer(undefined, action);
      expect(state).toEqual(initialApiKeysState);
    });
  });

  describe('Set Application Context', () => {
    it('should set application and organization IDs', () => {
      const action = ApiKeysActions.setApplicationContext({
        applicationId: 'app-1',
        organizationId: 'org-1',
      });
      const state = apiKeysReducer(initialApiKeysState, action);

      expect(state.currentApplicationId).toBe('app-1');
      expect(state.currentOrganizationId).toBe('org-1');
    });
  });

  describe('Load API Keys', () => {
    it('should set isLoading to true on loadApiKeys', () => {
      const action = ApiKeysActions.loadApiKeys({ applicationId: 'app-1' });
      const state = apiKeysReducer(initialApiKeysState, action);

      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should populate apiKeys and apiKeyRows on loadApiKeysSuccess', () => {
      const apiKeys = [
        createMockApiKey({ applicationApiKeyId: 'key-1', environment: Environment.Development }),
        createMockApiKey({ applicationApiKeyId: 'key-2', environment: Environment.Production }),
      ];
      const action = ApiKeysActions.loadApiKeysSuccess({ apiKeys });
      const state = apiKeysReducer(initialApiKeysState, action);

      expect(state.isLoading).toBe(false);
      expect(state.apiKeys).toEqual(apiKeys);
      expect(state.apiKeyRows.length).toBe(2);
      expect(state.filteredApiKeyRows.length).toBe(2);
      expect(state.error).toBeNull();
    });

    it('should set error on loadApiKeysFailure', () => {
      const action = ApiKeysActions.loadApiKeysFailure({ error: 'Failed to load API keys' });
      const state = apiKeysReducer(initialApiKeysState, action);

      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Failed to load API keys');
    });
  });

  describe('Generate API Key', () => {
    it('should set isGenerating to true on generateApiKey', () => {
      const action = ApiKeysActions.generateApiKey({
        applicationId: 'app-1',
        organizationId: 'org-1',
        environment: Environment.Development,
      });
      const state = apiKeysReducer(initialApiKeysState, action);

      expect(state.isGenerating).toBe(true);
      expect(state.generateError).toBeNull();
      expect(state.generatedKey).toBeNull();
    });

    it('should add apiKey and set generatedKey on generateApiKeySuccess', () => {
      const apiKey = createMockApiKey();
      const generatedKey = createMockGeneratedKey();
      const action = ApiKeysActions.generateApiKeySuccess({ apiKey, generatedKey });
      const state = apiKeysReducer(initialApiKeysState, action);

      expect(state.isGenerating).toBe(false);
      expect(state.apiKeys).toContain(apiKey);
      expect(state.generatedKey).toEqual(generatedKey);
      expect(state.lastGeneratedKey).toEqual(apiKey);
      expect(state.generateError).toBeNull();
    });

    it('should set generateError on generateApiKeyFailure', () => {
      const action = ApiKeysActions.generateApiKeyFailure({ error: 'Generation failed' });
      const state = apiKeysReducer(initialApiKeysState, action);

      expect(state.isGenerating).toBe(false);
      expect(state.generateError).toBe('Generation failed');
    });
  });

  describe('Rotate API Key', () => {
    it('should set isRotating to true on rotateApiKey', () => {
      const action = ApiKeysActions.rotateApiKey({
        apiKeyId: 'key-1',
        applicationId: 'app-1',
        environment: Environment.Development,
      });
      const state = apiKeysReducer(initialApiKeysState, action);

      expect(state.isRotating).toBe(true);
      expect(state.rotateError).toBeNull();
      expect(state.generatedKey).toBeNull();
    });

    it('should update apiKey and set newKey on rotateApiKeySuccess', () => {
      const existingKey = createMockApiKey({ status: ApplicationApiKeyStatus.Active });
      const rotatedKey = createMockApiKey({ status: ApplicationApiKeyStatus.Rotating });
      const newKey = createMockGeneratedKey();

      const initialState: ApiKeysState = {
        ...initialApiKeysState,
        apiKeys: [existingKey],
        apiKeyRows: [createMockApiKeyRow(existingKey)],
        filteredApiKeyRows: [createMockApiKeyRow(existingKey)],
      };

      const action = ApiKeysActions.rotateApiKeySuccess({ apiKey: rotatedKey, newKey });
      const state = apiKeysReducer(initialState, action);

      expect(state.isRotating).toBe(false);
      expect(state.apiKeys[0].status).toBe(ApplicationApiKeyStatus.Rotating);
      expect(state.generatedKey).toEqual(newKey);
      expect(state.lastRotatedKey).toEqual(rotatedKey);
      expect(state.rotateError).toBeNull();
    });

    it('should set rotateError on rotateApiKeyFailure', () => {
      const action = ApiKeysActions.rotateApiKeyFailure({ error: 'Rotation failed' });
      const state = apiKeysReducer(initialApiKeysState, action);

      expect(state.isRotating).toBe(false);
      expect(state.rotateError).toBe('Rotation failed');
    });
  });

  describe('Revoke API Key', () => {
    it('should set isRevoking to true on revokeApiKey', () => {
      const action = ApiKeysActions.revokeApiKey({
        apiKeyId: 'key-1',
        applicationId: 'app-1',
        environment: Environment.Development,
      });
      const state = apiKeysReducer(initialApiKeysState, action);

      expect(state.isRevoking).toBe(true);
      expect(state.revokeError).toBeNull();
    });

    it('should update apiKey status to REVOKED on revokeApiKeySuccess', () => {
      const existingKey = createMockApiKey({ status: ApplicationApiKeyStatus.Active });

      const initialState: ApiKeysState = {
        ...initialApiKeysState,
        apiKeys: [existingKey],
        apiKeyRows: [createMockApiKeyRow(existingKey)],
        filteredApiKeyRows: [createMockApiKeyRow(existingKey)],
      };

      const revokedKey = {
        ...existingKey,
        status: ApplicationApiKeyStatus.Revoked,
        revokedAt: new Date(),
        expiresAt: new Date(),
      };
      const action = ApiKeysActions.revokeApiKeySuccess({ apiKeyId: 'key-1', revokedKey });
      const state = apiKeysReducer(initialState, action);

      expect(state.isRevoking).toBe(false);
      expect(state.apiKeys[0].status).toBe(ApplicationApiKeyStatus.Revoked);
      expect(state.lastRevokedKeyId).toBe('key-1');
      expect(state.revokeError).toBeNull();
    });

    it('should clear selectedApiKey if revoked key was selected', () => {
      const existingKey = createMockApiKey({ status: ApplicationApiKeyStatus.Active });

      const initialState: ApiKeysState = {
        ...initialApiKeysState,
        apiKeys: [existingKey],
        apiKeyRows: [createMockApiKeyRow(existingKey)],
        filteredApiKeyRows: [createMockApiKeyRow(existingKey)],
        selectedApiKey: existingKey,
      };

      const revokedKey = {
        ...existingKey,
        status: ApplicationApiKeyStatus.Revoked,
        revokedAt: new Date(),
        expiresAt: new Date(),
      };
      const action = ApiKeysActions.revokeApiKeySuccess({ apiKeyId: 'key-1', revokedKey });
      const state = apiKeysReducer(initialState, action);

      expect(state.selectedApiKey).toBeNull();
    });

    it('should set revokeError on revokeApiKeyFailure', () => {
      const action = ApiKeysActions.revokeApiKeyFailure({ error: 'Revocation failed' });
      const state = apiKeysReducer(initialApiKeysState, action);

      expect(state.isRevoking).toBe(false);
      expect(state.revokeError).toBe('Revocation failed');
    });
  });

  describe('Selection Management', () => {
    it('should set selectedApiKey on selectApiKey', () => {
      const apiKey = createMockApiKey();
      const action = ApiKeysActions.selectApiKey({ apiKey });
      const state = apiKeysReducer(initialApiKeysState, action);

      expect(state.selectedApiKey).toEqual(apiKey);
    });

    it('should clear selectedApiKey when null is passed', () => {
      const initialState: ApiKeysState = {
        ...initialApiKeysState,
        selectedApiKey: createMockApiKey(),
      };

      const action = ApiKeysActions.selectApiKey({ apiKey: null });
      const state = apiKeysReducer(initialState, action);

      expect(state.selectedApiKey).toBeNull();
    });
  });

  describe('Clear Generated Key', () => {
    it('should clear generatedKey on clearGeneratedKey', () => {
      const initialState: ApiKeysState = {
        ...initialApiKeysState,
        generatedKey: createMockGeneratedKey(),
      };

      const action = ApiKeysActions.clearGeneratedKey();
      const state = apiKeysReducer(initialState, action);

      expect(state.generatedKey).toBeNull();
    });
  });


  describe('Filtering', () => {
    it('should filter apiKeys by search term', () => {
      const apiKeys = [
        createMockApiKey({ applicationApiKeyId: 'key-1', keyPrefix: 'orb_dev_' }),
        createMockApiKey({ applicationApiKeyId: 'key-2', keyPrefix: 'orb_prod_' }),
        createMockApiKey({ applicationApiKeyId: 'key-3', keyPrefix: 'orb_stg_' }),
      ];

      const loadAction = ApiKeysActions.loadApiKeysSuccess({ apiKeys });
      let state = apiKeysReducer(initialApiKeysState, loadAction);

      const filterAction = ApiKeysActions.setSearchTerm({ searchTerm: 'prod' });
      state = apiKeysReducer(state, filterAction);

      expect(state.searchTerm).toBe('prod');
      expect(state.filteredApiKeyRows.length).toBe(1);
      expect(state.filteredApiKeyRows[0].apiKey.keyPrefix).toBe('orb_prod_');
    });

    it('should filter apiKeys by status', () => {
      const apiKeys = [
        createMockApiKey({ applicationApiKeyId: 'key-1', status: ApplicationApiKeyStatus.Active }),
        createMockApiKey({ applicationApiKeyId: 'key-2', status: ApplicationApiKeyStatus.Revoked }),
      ];

      const loadAction = ApiKeysActions.loadApiKeysSuccess({ apiKeys });
      let state = apiKeysReducer(initialApiKeysState, loadAction);

      const filterAction = ApiKeysActions.setStatusFilter({
        statusFilter: ApplicationApiKeyStatus.Active,
      });
      state = apiKeysReducer(state, filterAction);

      expect(state.statusFilter).toBe(ApplicationApiKeyStatus.Active);
      expect(state.filteredApiKeyRows.length).toBe(1);
      expect(state.filteredApiKeyRows[0].apiKey.status).toBe(ApplicationApiKeyStatus.Active);
    });

    it('should filter apiKeys by environment', () => {
      const apiKeys = [
        createMockApiKey({ applicationApiKeyId: 'key-1', environment: Environment.Development }),
        createMockApiKey({ applicationApiKeyId: 'key-2', environment: Environment.Production }),
        createMockApiKey({ applicationApiKeyId: 'key-3', environment: Environment.Staging }),
      ];

      const loadAction = ApiKeysActions.loadApiKeysSuccess({ apiKeys });
      let state = apiKeysReducer(initialApiKeysState, loadAction);

      const filterAction = ApiKeysActions.setEnvironmentFilter({
        environmentFilter: Environment.Production,
      });
      state = apiKeysReducer(state, filterAction);

      expect(state.environmentFilter).toBe(Environment.Production);
      expect(state.filteredApiKeyRows.length).toBe(1);
      expect(state.filteredApiKeyRows[0].apiKey.environment).toBe(Environment.Production);
    });

    it('should combine multiple filters', () => {
      const apiKeys = [
        createMockApiKey({
          applicationApiKeyId: 'key-1',
          keyPrefix: 'orb_dev_',
          status: ApplicationApiKeyStatus.Active,
          environment: Environment.Development,
        }),
        createMockApiKey({
          applicationApiKeyId: 'key-2',
          keyPrefix: 'orb_dev_',
          status: ApplicationApiKeyStatus.Revoked,
          environment: Environment.Development,
        }),
        createMockApiKey({
          applicationApiKeyId: 'key-3',
          keyPrefix: 'orb_prod_',
          status: ApplicationApiKeyStatus.Active,
          environment: Environment.Production,
        }),
      ];

      const loadAction = ApiKeysActions.loadApiKeysSuccess({ apiKeys });
      let state = apiKeysReducer(initialApiKeysState, loadAction);

      state = apiKeysReducer(state, ApiKeysActions.setSearchTerm({ searchTerm: 'dev' }));
      state = apiKeysReducer(
        state,
        ApiKeysActions.setStatusFilter({ statusFilter: ApplicationApiKeyStatus.Active })
      );

      expect(state.filteredApiKeyRows.length).toBe(1);
      expect(state.filteredApiKeyRows[0].apiKey.applicationApiKeyId).toBe('key-1');
    });
  });


  describe('Error Management', () => {
    it('should clear all errors on clearErrors', () => {
      const initialState: ApiKeysState = {
        ...initialApiKeysState,
        error: 'Some error',
        generateError: 'Generate error',
        rotateError: 'Rotate error',
        revokeError: 'Revoke error',
      };

      const action = ApiKeysActions.clearErrors();
      const state = apiKeysReducer(initialState, action);

      expect(state.error).toBeNull();
      expect(state.generateError).toBeNull();
      expect(state.rotateError).toBeNull();
      expect(state.revokeError).toBeNull();
    });

    it('should clear only generateError on clearGenerateError', () => {
      const initialState: ApiKeysState = {
        ...initialApiKeysState,
        error: 'Some error',
        generateError: 'Generate error',
      };

      const action = ApiKeysActions.clearGenerateError();
      const state = apiKeysReducer(initialState, action);

      expect(state.error).toBe('Some error');
      expect(state.generateError).toBeNull();
    });

    it('should clear only rotateError on clearRotateError', () => {
      const initialState: ApiKeysState = {
        ...initialApiKeysState,
        error: 'Some error',
        rotateError: 'Rotate error',
      };

      const action = ApiKeysActions.clearRotateError();
      const state = apiKeysReducer(initialState, action);

      expect(state.error).toBe('Some error');
      expect(state.rotateError).toBeNull();
    });

    it('should clear only revokeError on clearRevokeError', () => {
      const initialState: ApiKeysState = {
        ...initialApiKeysState,
        error: 'Some error',
        revokeError: 'Revoke error',
      };

      const action = ApiKeysActions.clearRevokeError();
      const state = apiKeysReducer(initialState, action);

      expect(state.error).toBe('Some error');
      expect(state.revokeError).toBeNull();
    });
  });

  describe('UI State Management', () => {
    it('should set isLoading on setLoading', () => {
      const action = ApiKeysActions.setLoading({ isLoading: true });
      const state = apiKeysReducer(initialApiKeysState, action);
      expect(state.isLoading).toBe(true);
    });

    it('should set isGenerating on setGenerating', () => {
      const action = ApiKeysActions.setGenerating({ isGenerating: true });
      const state = apiKeysReducer(initialApiKeysState, action);
      expect(state.isGenerating).toBe(true);
    });

    it('should set isRotating on setRotating', () => {
      const action = ApiKeysActions.setRotating({ isRotating: true });
      const state = apiKeysReducer(initialApiKeysState, action);
      expect(state.isRotating).toBe(true);
    });

    it('should set isRevoking on setRevoking', () => {
      const action = ApiKeysActions.setRevoking({ isRevoking: true });
      const state = apiKeysReducer(initialApiKeysState, action);
      expect(state.isRevoking).toBe(true);
    });
  });

  describe('Reset State', () => {
    it('should reset to initial state on resetState', () => {
      const modifiedState: ApiKeysState = {
        ...initialApiKeysState,
        apiKeys: [createMockApiKey()],
        isLoading: true,
        error: 'Some error',
        generatedKey: createMockGeneratedKey(),
      };

      const action = ApiKeysActions.resetState();
      const state = apiKeysReducer(modifiedState, action);

      expect(state).toEqual(initialApiKeysState);
    });
  });

  describe('Refresh API Keys', () => {
    it('should set isLoading to true on refreshApiKeys', () => {
      const action = ApiKeysActions.refreshApiKeys({ applicationId: 'app-1' });
      const state = apiKeysReducer(initialApiKeysState, action);

      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });
  });
});
