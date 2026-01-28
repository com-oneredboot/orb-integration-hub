/**
 * API Key Validation Utilities
 *
 * Provides validation functions for checking if applications have
 * all required API keys configured for their environments.
 *
 * @see .kiro/specs/api-key-configuration-flow/design.md
 * _Requirements: 1.1, 1.2, 1.3_
 */

import { IApplications } from '../../../../core/models/ApplicationsModel';
import { IApplicationApiKeys } from '../../../../core/models/ApplicationApiKeysModel';
import { ApplicationApiKeyStatus } from '../../../../core/enums/ApplicationApiKeyStatusEnum';

/**
 * Result of validating an application's API key configuration
 */
export interface ApiKeyValidationResult {
  /** Whether all environments have active API keys */
  isValid: boolean;
  /** List of environment names that lack active API keys */
  missingEnvironments: string[];
  /** List of environment names that have active API keys */
  configuredEnvironments: string[];
  /** Total number of environments for the application */
  totalEnvironments: number;
}

/**
 * Validates that an application has active API keys for all its environments.
 *
 * An environment is considered "configured" if it has an API key with status
 * ACTIVE or ROTATING. Keys with status REVOKED, EXPIRED, or UNKNOWN are not
 * counted as valid.
 *
 * @param application - The application to validate
 * @param apiKeys - All API keys for this application
 * @returns Validation result with lists of missing and configured environments
 *
 * @example
 * ```typescript
 * const result = validateApplicationApiKeys(app, keys);
 * if (!result.isValid) {
 *   console.log(`Missing keys for: ${result.missingEnvironments.join(', ')}`);
 * }
 * ```
 */
export function validateApplicationApiKeys(
  application: IApplications | null,
  apiKeys: IApplicationApiKeys[]
): ApiKeyValidationResult {
  // Handle null application
  if (!application) {
    return {
      isValid: true,
      missingEnvironments: [],
      configuredEnvironments: [],
      totalEnvironments: 0
    };
  }

  const environments = application.environments || [];

  // No environments means nothing to validate
  if (environments.length === 0) {
    return {
      isValid: true,
      missingEnvironments: [],
      configuredEnvironments: [],
      totalEnvironments: 0
    };
  }

  // Find active keys (ACTIVE or ROTATING status)
  const activeKeys = apiKeys.filter(key =>
    key.status === ApplicationApiKeyStatus.Active ||
    key.status === ApplicationApiKeyStatus.Rotating
  );

  // Get environments that have active keys
  const configuredEnvironments = environments.filter(env =>
    activeKeys.some(key => key.environment === env)
  );

  // Get environments that lack active keys
  const missingEnvironments = environments.filter(env =>
    !activeKeys.some(key => key.environment === env)
  );

  return {
    isValid: missingEnvironments.length === 0,
    missingEnvironments,
    configuredEnvironments,
    totalEnvironments: environments.length
  };
}

/**
 * Gets a human-readable label for an environment value.
 *
 * @param environment - The environment value (e.g., 'PRODUCTION')
 * @returns Human-readable label (e.g., 'Production')
 */
export function getEnvironmentLabel(environment: string): string {
  const labels: Record<string, string> = {
    'PRODUCTION': 'Production',
    'STAGING': 'Staging',
    'DEVELOPMENT': 'Development',
    'TEST': 'Test',
    'PREVIEW': 'Preview'
  };
  return labels[environment] || environment;
}

/**
 * Formats a list of missing environments into a human-readable string.
 *
 * @param missingEnvironments - Array of environment values
 * @returns Formatted string like "Production, Staging, and Development"
 */
export function formatMissingEnvironments(missingEnvironments: string[]): string {
  if (missingEnvironments.length === 0) {
    return '';
  }

  const labels = missingEnvironments.map(getEnvironmentLabel);

  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  const allButLast = labels.slice(0, -1).join(', ');
  const last = labels[labels.length - 1];
  return `${allButLast}, and ${last}`;
}
