/**
 * API Key Validation Tests
 *
 * Unit tests and property-based tests for the API key validation utilities.
 *
 * @see .kiro/specs/api-key-configuration-flow/design.md
 */

import * as fc from 'fast-check';
import {
  validateApplicationApiKeys,
  getEnvironmentLabel,
  formatMissingEnvironments,
} from './api-key-validation';
import { IApplications } from '../../../../core/models/ApplicationsModel';
import { IApplicationApiKeys } from '../../../../core/models/ApplicationApiKeysModel';
import { ApplicationApiKeyStatus } from '../../../../core/enums/ApplicationApiKeyStatusEnum';
import { ApplicationStatus } from '../../../../core/enums/ApplicationStatusEnum';
import { Environment } from '../../../../core/enums/EnvironmentEnum';

// Test data generators
const environmentStringArb = fc.constantFrom('PRODUCTION', 'STAGING', 'DEVELOPMENT', 'TEST', 'PREVIEW');

const apiKeyStatusArb = fc.constantFrom(
  ApplicationApiKeyStatus.Active,
  ApplicationApiKeyStatus.Rotating,
  ApplicationApiKeyStatus.Revoked,
  ApplicationApiKeyStatus.Expired,
  ApplicationApiKeyStatus.Unknown
);

// Generate a mock application with specific environments
function createMockApplication(environments: string[]): IApplications {
  return {
    applicationId: 'app-123',
    organizationId: 'org-123',
    name: 'Test App',
    description: 'Test application',
    status: ApplicationStatus.Pending,
    environments,
    createdAt: new Date(),
    updatedAt: new Date(),
    ownerId: 'user-123'
  } as IApplications;
}

// Generate a mock API key for an environment
function createMockApiKey(environment: string, status: ApplicationApiKeyStatus): IApplicationApiKeys {
  const envEnum = environment as Environment;
  return {
    applicationApiKeyId: `key-${environment}-${Date.now()}`,
    applicationId: 'app-123',
    organizationId: 'org-123',
    environment: envEnum,
    status,
    keyPrefix: `orb_${environment.toLowerCase().substring(0, 2)}_`,
    keyHash: 'mock-hash-value',
    createdAt: new Date(),
    updatedAt: new Date()
  } as IApplicationApiKeys;
}

describe('validateApplicationApiKeys', () => {
  describe('Unit Tests', () => {
    it('should return valid for null application', () => {
      const result = validateApplicationApiKeys(null, []);
      expect(result.isValid).toBe(true);
      expect(result.missingEnvironments).toEqual([]);
      expect(result.configuredEnvironments).toEqual([]);
      expect(result.totalEnvironments).toBe(0);
    });

    it('should return valid for application with no environments', () => {
      const app = createMockApplication([]);
      const result = validateApplicationApiKeys(app, []);
      expect(result.isValid).toBe(true);
      expect(result.totalEnvironments).toBe(0);
    });

    it('should return invalid when all environments lack keys', () => {
      const app = createMockApplication(['PRODUCTION', 'STAGING']);
      const result = validateApplicationApiKeys(app, []);
      expect(result.isValid).toBe(false);
      expect(result.missingEnvironments).toEqual(['PRODUCTION', 'STAGING']);
      expect(result.configuredEnvironments).toEqual([]);
    });

    it('should return valid when all environments have active keys', () => {
      const app = createMockApplication(['PRODUCTION', 'STAGING']);
      const keys = [
        createMockApiKey('PRODUCTION', ApplicationApiKeyStatus.Active),
        createMockApiKey('STAGING', ApplicationApiKeyStatus.Active)
      ];
      const result = validateApplicationApiKeys(app, keys);
      expect(result.isValid).toBe(true);
      expect(result.missingEnvironments).toEqual([]);
      expect(result.configuredEnvironments).toEqual(['PRODUCTION', 'STAGING']);
    });

    it('should count ROTATING status as valid', () => {
      const app = createMockApplication(['PRODUCTION']);
      const keys = [createMockApiKey('PRODUCTION', ApplicationApiKeyStatus.Rotating)];
      const result = validateApplicationApiKeys(app, keys);
      expect(result.isValid).toBe(true);
    });

    it('should not count REVOKED keys as valid', () => {
      const app = createMockApplication(['PRODUCTION']);
      const keys = [createMockApiKey('PRODUCTION', ApplicationApiKeyStatus.Revoked)];
      const result = validateApplicationApiKeys(app, keys);
      expect(result.isValid).toBe(false);
      expect(result.missingEnvironments).toEqual(['PRODUCTION']);
    });

    it('should not count EXPIRED keys as valid', () => {
      const app = createMockApplication(['PRODUCTION']);
      const keys = [createMockApiKey('PRODUCTION', ApplicationApiKeyStatus.Expired)];
      const result = validateApplicationApiKeys(app, keys);
      expect(result.isValid).toBe(false);
    });

    it('should handle partial configuration correctly', () => {
      const app = createMockApplication(['PRODUCTION', 'STAGING', 'DEVELOPMENT']);
      const keys = [
        createMockApiKey('PRODUCTION', ApplicationApiKeyStatus.Active),
        createMockApiKey('DEVELOPMENT', ApplicationApiKeyStatus.Active)
      ];
      const result = validateApplicationApiKeys(app, keys);
      expect(result.isValid).toBe(false);
      expect(result.missingEnvironments).toEqual(['STAGING']);
      expect(result.configuredEnvironments).toEqual(['PRODUCTION', 'DEVELOPMENT']);
    });
  });

  describe('Property Tests', () => {
    /**
     * Feature: api-key-configuration-flow, Property 1: Activation Validation Correctness
     * Validates: Requirements 1.1, 1.2, 1.3
     *
     * For any application with N environments and M active API keys where M < N,
     * the validation function SHALL return isValid: false and list exactly (N - M)
     * missing environments.
     */
    it('Property 1: missing environment count equals environments minus active keys', () => {
      fc.assert(
        fc.property(
          // Generate unique environments (1-5)
          fc.uniqueArray(environmentStringArb, { minLength: 1, maxLength: 5 }),
          // Generate which environments have active keys (subset)
          fc.func(fc.boolean()),
          (environments, hasActiveKey) => {
            const app = createMockApplication(environments);

            // Create keys based on the random function
            const keys: IApplicationApiKeys[] = environments
              .filter((_, i) => hasActiveKey(i))
              .map(env => createMockApiKey(env, ApplicationApiKeyStatus.Active));

            const result = validateApplicationApiKeys(app, keys);

            // Count environments with active keys
            const activeKeyEnvs = new Set(keys.map(k => k.environment as string));
            const expectedMissing = environments.filter(e => !activeKeyEnvs.has(e));

            // Verify the property
            expect(result.missingEnvironments.length).toBe(expectedMissing.length);
            expect(result.configuredEnvironments.length).toBe(keys.length);
            expect(result.isValid).toBe(expectedMissing.length === 0);
            expect(result.totalEnvironments).toBe(environments.length);

            // Verify missing environments are correct
            expect(new Set(result.missingEnvironments)).toEqual(new Set(expectedMissing));
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: api-key-configuration-flow, Property 1b: Only active/rotating keys count
     * Validates: Requirements 1.1, 1.2
     *
     * For any environment, only ACTIVE or ROTATING status keys should count as configured.
     */
    it('Property 1b: only ACTIVE and ROTATING keys count as configured', () => {
      fc.assert(
        fc.property(
          environmentStringArb,
          apiKeyStatusArb,
          (environment, status) => {
            const app = createMockApplication([environment]);
            const keys = [createMockApiKey(environment, status)];

            const result = validateApplicationApiKeys(app, keys);

            const isActiveStatus =
              status === ApplicationApiKeyStatus.Active ||
              status === ApplicationApiKeyStatus.Rotating;

            expect(result.isValid).toBe(isActiveStatus);
            if (isActiveStatus) {
              expect(result.configuredEnvironments).toContain(environment);
              expect(result.missingEnvironments).not.toContain(environment);
            } else {
              expect(result.missingEnvironments).toContain(environment);
              expect(result.configuredEnvironments).not.toContain(environment);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('getEnvironmentLabel', () => {
  it('should return correct labels for known environments', () => {
    expect(getEnvironmentLabel('PRODUCTION')).toBe('Production');
    expect(getEnvironmentLabel('STAGING')).toBe('Staging');
    expect(getEnvironmentLabel('DEVELOPMENT')).toBe('Development');
    expect(getEnvironmentLabel('TEST')).toBe('Test');
    expect(getEnvironmentLabel('PREVIEW')).toBe('Preview');
  });

  it('should return the input for unknown environments', () => {
    expect(getEnvironmentLabel('CUSTOM')).toBe('CUSTOM');
  });
});

describe('formatMissingEnvironments', () => {
  it('should return empty string for empty array', () => {
    expect(formatMissingEnvironments([])).toBe('');
  });

  it('should return single environment label', () => {
    expect(formatMissingEnvironments(['PRODUCTION'])).toBe('Production');
  });

  it('should join two environments with "and"', () => {
    expect(formatMissingEnvironments(['PRODUCTION', 'STAGING'])).toBe('Production and Staging');
  });

  it('should use Oxford comma for three or more', () => {
    expect(formatMissingEnvironments(['PRODUCTION', 'STAGING', 'DEVELOPMENT']))
      .toBe('Production, Staging, and Development');
  });

  /**
   * Feature: api-key-configuration-flow, Property 4: Activation Error Message Correctness
   * Validates: Requirements 1.4, 4.1
   *
   * For any list of missing environments, the formatted error message SHALL
   * contain all environment labels and use proper grammar (Oxford comma for 3+).
   */
  describe('Property Tests', () => {
    it('Property 4: error message contains all missing environment labels', () => {
      fc.assert(
        fc.property(
          // Generate unique environments (1-5)
          fc.uniqueArray(environmentStringArb, { minLength: 1, maxLength: 5 }),
          (environments) => {
            const formatted = formatMissingEnvironments(environments);

            // All environments should appear in the formatted string
            for (const env of environments) {
              const label = getEnvironmentLabel(env);
              expect(formatted).toContain(label);
            }

            // Check grammar rules
            if (environments.length === 1) {
              // Single environment: just the label
              expect(formatted).toBe(getEnvironmentLabel(environments[0]));
            } else if (environments.length === 2) {
              // Two environments: "X and Y"
              expect(formatted).toContain(' and ');
              expect(formatted).not.toContain(',');
            } else {
              // Three or more: Oxford comma "X, Y, and Z"
              expect(formatted).toContain(', and ');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
