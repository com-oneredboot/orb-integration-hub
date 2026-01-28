/**
 * API Keys Selectors Unit Tests
 *
 * Tests for the api-keys NgRx selectors.
 *
 * @see .kiro/specs/application-access-management/design.md
 * _Requirements: 9.5_
 */

import * as fromSelectors from './api-keys.selectors';
import { ApiKeysState, ApiKeyTableRow, GeneratedKeyResult, initialApiKeysState } from './api-keys.state';
import { IApplicationApiKeys } from '../../../../../core/models/ApplicationApiKeysModel';
import { ApplicationApiKeyStatus } from '../../../../../core/enums/ApplicationApiKeyStatusEnum';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';

describe('ApiKeys Selectors', () => {
  const createMockApiKey = (overrides: Partial<IApplicationApiKeys> = {}): IApplicationApiKeys => ({
    applicationApiKeyId: 'key-1',
    applicationId: 'app-1',
    organizationId: 'org-1',
    environment: Environment.Development,
    keyHash: 'hash123',
    keyPrefix: 'orb_dev_',
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

  describe('Core Data Selectors', () => {
    it('should select apiKeys', () => {
      const apiKeys = [createMockApiKey()];
      const state: ApiKeysState = { ...initialApiKeysState, apiKeys };

      const result = fromSelectors.selectApiKeys.projector(state);
      expect(result).toEqual(apiKeys);
    });

    it('should return empty array when state has no apiKeys', () => {
      const result = fromSelectors.selectApiKeys.projector(initialApiKeysState);
      expect(result).toEqual([]);
    });

    it('should select apiKeyRows', () => {
      const apiKey = createMockApiKey();
      const apiKeyRows = [createMockApiKeyRow(apiKey)];
      const state: ApiKeysState = { ...initialApiKeysState, apiKeyRows };

      const result = fromSelectors.selectApiKeyRows.projector(state);
      expect(result).toEqual(apiKeyRows);
    });

    it('should select selectedApiKey', () => {
      const selectedApiKey = createMockApiKey();
      const state: ApiKeysState = { ...initialApiKeysState, selectedApiKey };

      const result = fromSelectors.selectSelectedApiKey.projector(state);
      expect(result).toEqual(selectedApiKey);
    });

    it('should select currentApplicationId', () => {
      const state: ApiKeysState = { ...initialApiKeysState, currentApplicationId: 'app-1' };

      const result = fromSelectors.selectCurrentApplicationId.projector(state);
      expect(result).toBe('app-1');
    });

    it('should select currentOrganizationId', () => {
      const state: ApiKeysState = { ...initialApiKeysState, currentOrganizationId: 'org-1' };

      const result = fromSelectors.selectCurrentOrganizationId.projector(state);
      expect(result).toBe('org-1');
    });
  });


  describe('Generated Key Selector', () => {
    it('should select generatedKey', () => {
      const generatedKey = createMockGeneratedKey();
      const state: ApiKeysState = { ...initialApiKeysState, generatedKey };

      const result = fromSelectors.selectGeneratedKey.projector(state);
      expect(result).toEqual(generatedKey);
    });

    it('should return null when no generated key', () => {
      const result = fromSelectors.selectGeneratedKey.projector(initialApiKeysState);
      expect(result).toBeNull();
    });
  });

  describe('Filter Selectors', () => {
    it('should select searchTerm', () => {
      const state: ApiKeysState = { ...initialApiKeysState, searchTerm: 'test' };

      const result = fromSelectors.selectSearchTerm.projector(state);
      expect(result).toBe('test');
    });

    it('should select statusFilter', () => {
      const state: ApiKeysState = { ...initialApiKeysState, statusFilter: 'ACTIVE' };

      const result = fromSelectors.selectStatusFilter.projector(state);
      expect(result).toBe('ACTIVE');
    });

    it('should select environmentFilter', () => {
      const state: ApiKeysState = { ...initialApiKeysState, environmentFilter: 'DEVELOPMENT' };

      const result = fromSelectors.selectEnvironmentFilter.projector(state);
      expect(result).toBe('DEVELOPMENT');
    });

    it('should select filteredApiKeyRows', () => {
      const apiKey = createMockApiKey();
      const filteredApiKeyRows = [createMockApiKeyRow(apiKey)];
      const state: ApiKeysState = { ...initialApiKeysState, filteredApiKeyRows };

      const result = fromSelectors.selectFilteredApiKeyRows.projector(state);
      expect(result).toEqual(filteredApiKeyRows);
    });
  });

  describe('Loading State Selectors', () => {
    it('should select isLoading', () => {
      const state: ApiKeysState = { ...initialApiKeysState, isLoading: true };

      const result = fromSelectors.selectIsLoading.projector(state);
      expect(result).toBe(true);
    });

    it('should select isGenerating', () => {
      const state: ApiKeysState = { ...initialApiKeysState, isGenerating: true };

      const result = fromSelectors.selectIsGenerating.projector(state);
      expect(result).toBe(true);
    });

    it('should select isRotating', () => {
      const state: ApiKeysState = { ...initialApiKeysState, isRotating: true };

      const result = fromSelectors.selectIsRotating.projector(state);
      expect(result).toBe(true);
    });

    it('should select isRevoking', () => {
      const state: ApiKeysState = { ...initialApiKeysState, isRevoking: true };

      const result = fromSelectors.selectIsRevoking.projector(state);
      expect(result).toBe(true);
    });
  });

  describe('Error Selectors', () => {
    it('should select error', () => {
      const state: ApiKeysState = { ...initialApiKeysState, error: 'Test error' };

      const result = fromSelectors.selectError.projector(state);
      expect(result).toBe('Test error');
    });

    it('should select generateError', () => {
      const state: ApiKeysState = { ...initialApiKeysState, generateError: 'Generate error' };

      const result = fromSelectors.selectGenerateError.projector(state);
      expect(result).toBe('Generate error');
    });

    it('should select rotateError', () => {
      const state: ApiKeysState = { ...initialApiKeysState, rotateError: 'Rotate error' };

      const result = fromSelectors.selectRotateError.projector(state);
      expect(result).toBe('Rotate error');
    });

    it('should select revokeError', () => {
      const state: ApiKeysState = { ...initialApiKeysState, revokeError: 'Revoke error' };

      const result = fromSelectors.selectRevokeError.projector(state);
      expect(result).toBe('Revoke error');
    });
  });


  describe('Operation Result Selectors', () => {
    it('should select lastGeneratedKey', () => {
      const lastGeneratedKey = createMockApiKey();
      const state: ApiKeysState = { ...initialApiKeysState, lastGeneratedKey };

      const result = fromSelectors.selectLastGeneratedKey.projector(state);
      expect(result).toEqual(lastGeneratedKey);
    });

    it('should select lastRotatedKey', () => {
      const lastRotatedKey = createMockApiKey();
      const state: ApiKeysState = { ...initialApiKeysState, lastRotatedKey };

      const result = fromSelectors.selectLastRotatedKey.projector(state);
      expect(result).toEqual(lastRotatedKey);
    });

    it('should select lastRevokedKeyId', () => {
      const state: ApiKeysState = { ...initialApiKeysState, lastRevokedKeyId: 'key-1' };

      const result = fromSelectors.selectLastRevokedKeyId.projector(state);
      expect(result).toBe('key-1');
    });
  });

  describe('Computed Selectors', () => {
    it('should return true for selectHasApiKeys when apiKeys exist', () => {
      const apiKeys = [createMockApiKey()];

      const result = fromSelectors.selectHasApiKeys.projector(apiKeys);
      expect(result).toBe(true);
    });

    it('should return false for selectHasApiKeys when no apiKeys', () => {
      const result = fromSelectors.selectHasApiKeys.projector([]);
      expect(result).toBe(false);
    });

    it('should return correct count for selectApiKeyCount', () => {
      const apiKeys = [createMockApiKey(), createMockApiKey({ applicationApiKeyId: 'key-2' })];

      const result = fromSelectors.selectApiKeyCount.projector(apiKeys);
      expect(result).toBe(2);
    });

    it('should return correct count for selectFilteredApiKeyCount', () => {
      const filteredRows = [
        createMockApiKeyRow(createMockApiKey()),
        createMockApiKeyRow(createMockApiKey({ applicationApiKeyId: 'key-2' })),
      ];

      const result = fromSelectors.selectFilteredApiKeyCount.projector(filteredRows);
      expect(result).toBe(2);
    });

    it('should return true for selectHasFiltersApplied when searchTerm is set', () => {
      const result = fromSelectors.selectHasFiltersApplied.projector('test', '', '');
      expect(result).toBe(true);
    });

    it('should return true for selectHasFiltersApplied when statusFilter is set', () => {
      const result = fromSelectors.selectHasFiltersApplied.projector('', 'ACTIVE', '');
      expect(result).toBe(true);
    });

    it('should return true for selectHasFiltersApplied when environmentFilter is set', () => {
      const result = fromSelectors.selectHasFiltersApplied.projector('', '', 'DEVELOPMENT');
      expect(result).toBe(true);
    });

    it('should return false for selectHasFiltersApplied when no filters', () => {
      const result = fromSelectors.selectHasFiltersApplied.projector('', '', '');
      expect(result).toBe(false);
    });

    it('should return true for selectIsAnyOperationInProgress when loading', () => {
      const result = fromSelectors.selectIsAnyOperationInProgress.projector(true, false, false, false);
      expect(result).toBe(true);
    });

    it('should return true for selectIsAnyOperationInProgress when generating', () => {
      const result = fromSelectors.selectIsAnyOperationInProgress.projector(false, true, false, false);
      expect(result).toBe(true);
    });

    it('should return false for selectIsAnyOperationInProgress when no operations', () => {
      const result = fromSelectors.selectIsAnyOperationInProgress.projector(false, false, false, false);
      expect(result).toBe(false);
    });

    it('should return true for selectHasAnyError when error exists', () => {
      const result = fromSelectors.selectHasAnyError.projector('error', null, null, null);
      expect(result).toBe(true);
    });

    it('should return false for selectHasAnyError when no errors', () => {
      const result = fromSelectors.selectHasAnyError.projector(null, null, null, null);
      expect(result).toBe(false);
    });

    it('should return correct count for selectActiveApiKeyCount', () => {
      const apiKeys = [
        createMockApiKey({ status: ApplicationApiKeyStatus.Active }),
        createMockApiKey({ applicationApiKeyId: 'key-2', status: ApplicationApiKeyStatus.Revoked }),
        createMockApiKey({ applicationApiKeyId: 'key-3', status: ApplicationApiKeyStatus.Active }),
      ];

      const result = fromSelectors.selectActiveApiKeyCount.projector(apiKeys);
      expect(result).toBe(2);
    });
  });

  describe('Parameterized Selectors', () => {
    it('should find apiKey by ID with selectApiKeyById', () => {
      const apiKeys = [
        createMockApiKey({ applicationApiKeyId: 'key-1' }),
        createMockApiKey({ applicationApiKeyId: 'key-2' }),
      ];

      const selector = fromSelectors.selectApiKeyById('key-2');
      const result = selector.projector(apiKeys);
      expect(result?.applicationApiKeyId).toBe('key-2');
    });

    it('should return undefined when apiKey not found', () => {
      const apiKeys = [createMockApiKey({ applicationApiKeyId: 'key-1' })];

      const selector = fromSelectors.selectApiKeyById('key-999');
      const result = selector.projector(apiKeys);
      expect(result).toBeUndefined();
    });

    it('should find apiKeyRow by ID with selectApiKeyRowById', () => {
      const apiKeyRows = [
        createMockApiKeyRow(createMockApiKey({ applicationApiKeyId: 'key-1' })),
        createMockApiKeyRow(createMockApiKey({ applicationApiKeyId: 'key-2' })),
      ];

      const selector = fromSelectors.selectApiKeyRowById('key-2');
      const result = selector.projector(apiKeyRows);
      expect(result?.apiKey.applicationApiKeyId).toBe('key-2');
    });

    it('should filter apiKeys by environment with selectApiKeysByEnvironment', () => {
      const apiKeys = [
        createMockApiKey({ applicationApiKeyId: 'key-1', environment: Environment.Development }),
        createMockApiKey({ applicationApiKeyId: 'key-2', environment: Environment.Production }),
        createMockApiKey({ applicationApiKeyId: 'key-3', environment: Environment.Development }),
      ];

      const selector = fromSelectors.selectApiKeysByEnvironment(Environment.Development);
      const result = selector.projector(apiKeys);
      expect(result.length).toBe(2);
      expect(result.every(k => k.environment === Environment.Development)).toBe(true);
    });
  });
});
