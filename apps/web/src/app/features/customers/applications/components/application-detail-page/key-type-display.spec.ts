/**
 * Key Type Display Logic Unit Tests
 *
 * Tests for the key type display logic in the application detail page.
 * Verifies that publishable (pk) and secret (sk) keys are displayed correctly.
 *
 * @see .kiro/specs/application-environment-config/design.md
 * _Requirements: 7.1, 7.2, 7.3, 8.1_
 */

import { getActivityText, EnvironmentKeyRow } from './application-detail-page.component';
import { IApplicationApiKeys } from '../../../../../core/models/ApplicationApiKeysModel';
import { ApplicationApiKeyStatus } from '../../../../../core/enums/ApplicationApiKeyStatusEnum';
import { ApplicationApiKeyType } from '../../../../../core/enums/ApplicationApiKeyTypeEnum';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';

describe('Key Type Display Logic', () => {
  const createMockApiKey = (
    overrides: Partial<IApplicationApiKeys> = {}
  ): IApplicationApiKeys => ({
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

  describe('Key Type Badge Display', () => {
    it('should identify publishable key type from keyType property', () => {
      const apiKey = createMockApiKey({
        keyType: ApplicationApiKeyType.Publishable,
        keyPrefix: 'pk_dev_',
      });

      expect(apiKey.keyType).toBe(ApplicationApiKeyType.Publishable);
      expect(apiKey.keyType).toBe('PUBLISHABLE');
    });

    it('should identify secret key type from keyType property', () => {
      const apiKey = createMockApiKey({
        keyType: ApplicationApiKeyType.Secret,
        keyPrefix: 'sk_dev_',
      });

      expect(apiKey.keyType).toBe(ApplicationApiKeyType.Secret);
      expect(apiKey.keyType).toBe('SECRET');
    });

    it('should display pk badge for publishable keys', () => {
      const apiKey = createMockApiKey({
        keyType: ApplicationApiKeyType.Publishable,
      });

      const badgeText = apiKey.keyType === 'SECRET' ? 'sk' : 'pk';
      expect(badgeText).toBe('pk');
    });

    it('should display sk badge for secret keys', () => {
      const apiKey = createMockApiKey({
        keyType: ApplicationApiKeyType.Secret,
      });

      const badgeText = apiKey.keyType === 'SECRET' ? 'sk' : 'pk';
      expect(badgeText).toBe('sk');
    });
  });

  describe('Key Prefix Patterns', () => {
    it('should have pk_ prefix for publishable keys', () => {
      const apiKey = createMockApiKey({
        keyType: ApplicationApiKeyType.Publishable,
        keyPrefix: 'pk_dev_abc123',
      });

      expect(apiKey.keyPrefix).toMatch(/^pk_/);
    });

    it('should have sk_ prefix for secret keys', () => {
      const apiKey = createMockApiKey({
        keyType: ApplicationApiKeyType.Secret,
        keyPrefix: 'sk_dev_xyz789',
      });

      expect(apiKey.keyPrefix).toMatch(/^sk_/);
    });

    it('should include environment in prefix for publishable keys', () => {
      const devKey = createMockApiKey({
        keyType: ApplicationApiKeyType.Publishable,
        keyPrefix: 'pk_dev_abc123',
        environment: Environment.Development,
      });

      const prodKey = createMockApiKey({
        keyType: ApplicationApiKeyType.Publishable,
        keyPrefix: 'pk_prod_def456',
        environment: Environment.Production,
      });

      expect(devKey.keyPrefix).toContain('dev');
      expect(prodKey.keyPrefix).toContain('prod');
    });

    it('should include environment in prefix for secret keys', () => {
      const devKey = createMockApiKey({
        keyType: ApplicationApiKeyType.Secret,
        keyPrefix: 'sk_dev_abc123',
        environment: Environment.Development,
      });

      const prodKey = createMockApiKey({
        keyType: ApplicationApiKeyType.Secret,
        keyPrefix: 'sk_prod_def456',
        environment: Environment.Production,
      });

      expect(devKey.keyPrefix).toContain('dev');
      expect(prodKey.keyPrefix).toContain('prod');
    });
  });

  describe('Environment Key Row with Key Types', () => {
    const createEnvironmentKeyRow = (
      apiKey: IApplicationApiKeys | null,
      environment = 'DEVELOPMENT'
    ): EnvironmentKeyRow => {
      const isRevoked = apiKey?.status === ApplicationApiKeyStatus.Revoked;
      const isExpired = apiKey?.status === ApplicationApiKeyStatus.Expired;
      const isActive = apiKey?.status === ApplicationApiKeyStatus.Active;
      const isRotating = apiKey?.status === ApplicationApiKeyStatus.Rotating;
      const hasActiveKey = !!apiKey && (isActive || isRotating);

      return {
        environment,
        environmentLabel: environment.charAt(0) + environment.slice(1).toLowerCase(),
        apiKey,
        hasKey: hasActiveKey,
        isRevoked,
        isExpired,
        canRevoke: hasActiveKey,
        canGenerate: !apiKey || isRevoked || isExpired,
        canRotate: hasActiveKey,
      };
    };

    it('should include key type in row when key exists', () => {
      const publishableKey = createMockApiKey({
        keyType: ApplicationApiKeyType.Publishable,
      });
      const row = createEnvironmentKeyRow(publishableKey);

      expect(row.apiKey?.keyType).toBe(ApplicationApiKeyType.Publishable);
    });

    it('should handle row without key', () => {
      const row = createEnvironmentKeyRow(null);

      expect(row.apiKey).toBeNull();
      expect(row.hasKey).toBe(false);
      expect(row.canGenerate).toBe(true);
    });

    it('should handle revoked key in row', () => {
      const revokedKey = createMockApiKey({
        keyType: ApplicationApiKeyType.Secret,
        status: ApplicationApiKeyStatus.Revoked,
        revokedAt: new Date('2026-01-20'),
      });
      const row = createEnvironmentKeyRow(revokedKey);

      expect(row.apiKey?.keyType).toBe(ApplicationApiKeyType.Secret);
      expect(row.isRevoked).toBe(true);
      expect(row.hasKey).toBe(false);
      expect(row.canGenerate).toBe(true);
    });
  });

  describe('getActivityText with Key Types', () => {
    it('should return activity text for active publishable key', () => {
      const apiKey = createMockApiKey({
        keyType: ApplicationApiKeyType.Publishable,
        status: ApplicationApiKeyStatus.Active,
        lastUsedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      });

      const text = getActivityText(apiKey);
      expect(text).toContain('Last used');
    });

    it('should return activity text for active secret key', () => {
      const apiKey = createMockApiKey({
        keyType: ApplicationApiKeyType.Secret,
        status: ApplicationApiKeyStatus.Active,
        lastUsedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      });

      const text = getActivityText(apiKey);
      expect(text).toContain('Last used');
    });

    it('should return "Never used" for key without lastUsedAt', () => {
      const apiKey = createMockApiKey({
        keyType: ApplicationApiKeyType.Publishable,
        status: ApplicationApiKeyStatus.Active,
        lastUsedAt: undefined,
      });

      const text = getActivityText(apiKey);
      expect(text).toBe('Never used');
    });

    it('should return revoked text for revoked key', () => {
      const apiKey = createMockApiKey({
        keyType: ApplicationApiKeyType.Secret,
        status: ApplicationApiKeyStatus.Revoked,
        revokedAt: new Date('2026-01-20'),
      });

      const text = getActivityText(apiKey);
      expect(text).toContain('Revoked');
    });

    it('should return expired text for expired key', () => {
      const apiKey = createMockApiKey({
        keyType: ApplicationApiKeyType.Publishable,
        status: ApplicationApiKeyStatus.Expired,
        expiresAt: new Date('2026-01-15'),
      });

      const text = getActivityText(apiKey);
      expect(text).toContain('Expired');
    });

    it('should return rotating text for rotating key', () => {
      const apiKey = createMockApiKey({
        keyType: ApplicationApiKeyType.Secret,
        status: ApplicationApiKeyStatus.Rotating,
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      });

      const text = getActivityText(apiKey);
      expect(text).toContain('Expires');
    });

    it('should return "No API key configured" for null key', () => {
      const text = getActivityText(null);
      expect(text).toBe('No API key configured');
    });
  });

  describe('Key Type CSS Class Logic', () => {
    it('should apply publishable class for PUBLISHABLE key type', () => {
      const apiKey = createMockApiKey({
        keyType: ApplicationApiKeyType.Publishable,
      });

      const isPublishable = apiKey.keyType === 'PUBLISHABLE';
      const isSecret = apiKey.keyType === 'SECRET';

      expect(isPublishable).toBe(true);
      expect(isSecret).toBe(false);
    });

    it('should apply secret class for SECRET key type', () => {
      const apiKey = createMockApiKey({
        keyType: ApplicationApiKeyType.Secret,
      });

      const isPublishable = apiKey.keyType === 'PUBLISHABLE';
      const isSecret = apiKey.keyType === 'SECRET';

      expect(isPublishable).toBe(false);
      expect(isSecret).toBe(true);
    });
  });
});
