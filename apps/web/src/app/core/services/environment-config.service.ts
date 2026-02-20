/**
 * Environment Config Service
 *
 * Provides operations for application environment configuration management.
 * Uses v0.19.0 response envelope format with ApiService base class methods.
 *
 * @see .kiro/specs/application-environment-config/design.md
 * _Requirements: 1.1, 2.1, 3.1, 4.1, 8.1_
 */

import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { ApiService } from './api.service';
import {
  ApplicationEnvironmentConfigCreate,
  ApplicationEnvironmentConfigUpdate,
  ApplicationEnvironmentConfigGet,
  ApplicationEnvironmentConfigListByApplicationId,
} from '../graphql/ApplicationEnvironmentConfig.graphql';
import {
  ApplicationEnvironmentConfig,
  ApplicationEnvironmentConfigCreateInput,
  ApplicationEnvironmentConfigUpdateInput,
  IApplicationEnvironmentConfig,
} from '../models/ApplicationEnvironmentConfigModel';
import { Environment } from '../enums/EnvironmentEnum';
import { toGraphQLInput } from '../../graphql-utils';
import { Connection } from '../types/graphql.types';
import { isAuthenticationError } from '../errors/api-errors';

@Injectable({
  providedIn: 'root',
})
export class EnvironmentConfigService extends ApiService {
  constructor() {
    super();
  }

  /**
   * Get environment config by application ID and environment
   *
   * @param applicationId The application ID
   * @param environment The environment
   * @returns Observable<IApplicationEnvironmentConfig> The environment config
   *
   * _Requirements: 1.1_
   */
  public getConfig(
    applicationId: string,
    environment: Environment
  ): Observable<IApplicationEnvironmentConfig> {
    console.debug('[EnvironmentConfigService] Getting config:', {
      applicationId,
      environment,
    });

    if (!applicationId) {
      throw new Error('Application ID is required');
    }
    if (!environment) {
      throw new Error('Environment is required');
    }

    return from(
      this.executeGetQuery<IApplicationEnvironmentConfig>(
        ApplicationEnvironmentConfigGet,
        { input: { applicationId, environment } },
        'userPool'
      )
    ).pipe(
      map((item) => {
        if (!item) {
          throw new Error('Environment configuration not found.');
        }
        console.debug('[EnvironmentConfigService] Config retrieved:', item);
        return new ApplicationEnvironmentConfig(item);
      }),
      catchError((error) => {
        console.error('[EnvironmentConfigService] Error getting config:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to view environment configuration.');
        }
        throw new Error('Failed to retrieve environment configuration. Please try again later.');
      })
    );
  }

  /**
   * Get all environment configs for an application
   *
   * @param applicationId The application ID
   * @param limit Optional limit for pagination
   * @param nextToken Optional token for pagination
   * @returns Observable<Connection<IApplicationEnvironmentConfig>> Paginated list of configs
   *
   * _Requirements: 1.1_
   */
  public getConfigsByApplication(
    applicationId: string,
    limit?: number,
    nextToken?: string
  ): Observable<Connection<IApplicationEnvironmentConfig>> {
    console.debug('[EnvironmentConfigService] Getting configs for application:', applicationId);

    if (!applicationId) {
      throw new Error('Application ID is required');
    }

    return from(
      this.executeListQuery<IApplicationEnvironmentConfig>(
        ApplicationEnvironmentConfigListByApplicationId,
        { input: { applicationId, limit, nextToken } },
        'userPool'
      )
    ).pipe(
      map((connection) => {
        console.debug('[EnvironmentConfigService] Configs retrieved:', connection.items.length);
        return {
          items: connection.items.map((item) => new ApplicationEnvironmentConfig(item)),
          nextToken: connection.nextToken,
        };
      }),
      catchError((error) => {
        console.error('[EnvironmentConfigService] Error getting configs:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to view environment configurations.');
        }
        throw new Error('Failed to retrieve environment configurations. Please try again later.');
      })
    );
  }

  /**
   * Create a new environment config
   *
   * @param applicationId The application ID
   * @param organizationId The organization ID
   * @param environment The environment
   * @returns Observable<IApplicationEnvironmentConfig> The created config
   *
   * _Requirements: 1.1_
   */
  public createConfig(
    applicationId: string,
    organizationId: string,
    environment: Environment
  ): Observable<IApplicationEnvironmentConfig> {
    console.debug('[EnvironmentConfigService] Creating config:', {
      applicationId,
      organizationId,
      environment,
    });

    if (!applicationId) {
      throw new Error('Application ID is required');
    }
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }
    if (!environment) {
      throw new Error('Environment is required');
    }

    const now = new Date();
    const createInput: ApplicationEnvironmentConfigCreateInput = {
      applicationId,
      organizationId,
      environment,
      allowedOrigins: [],
      rateLimitPerMinute: 60,
      rateLimitPerDay: 10000,
      webhookEnabled: false,
      webhookMaxRetries: 3,
      webhookRetryDelaySeconds: 60,
      featureFlags: {},
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };

    const graphqlInput = toGraphQLInput(createInput as unknown as Record<string, unknown>);

    return from(
      this.executeMutation<IApplicationEnvironmentConfig>(
        ApplicationEnvironmentConfigCreate,
        { input: graphqlInput },
        'userPool'
      )
    ).pipe(
      map((item) => {
        console.debug('[EnvironmentConfigService] Config created:', item);
        return new ApplicationEnvironmentConfig(item);
      }),
      catchError((error) => {
        console.error('[EnvironmentConfigService] Error creating config:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to create environment configuration.');
        }
        if (error?.message?.includes('already exists')) {
          throw new Error('Environment configuration already exists for this application and environment.');
        }
        throw new Error('Failed to create environment configuration. Please try again later.');
      })
    );
  }

  /**
   * Update an environment config
   *
   * @param applicationId The application ID
   * @param environment The environment
   * @param updates The fields to update
   * @returns Observable<IApplicationEnvironmentConfig> The updated config
   *
   * _Requirements: 2.1, 3.1, 4.1_
   */
  public updateConfig(
    applicationId: string,
    environment: Environment,
    updates: Partial<ApplicationEnvironmentConfigUpdateInput>
  ): Observable<IApplicationEnvironmentConfig> {
    console.debug('[EnvironmentConfigService] Updating config:', {
      applicationId,
      environment,
      updates,
    });

    if (!applicationId) {
      throw new Error('Application ID is required');
    }
    if (!environment) {
      throw new Error('Environment is required');
    }

    const updateInput: ApplicationEnvironmentConfigUpdateInput = {
      applicationId,
      environment,
      ...updates,
      updatedAt: new Date(),
    };

    const graphqlInput = toGraphQLInput(updateInput as unknown as Record<string, unknown>);

    return from(
      this.executeMutation<IApplicationEnvironmentConfig>(
        ApplicationEnvironmentConfigUpdate,
        { input: graphqlInput },
        'userPool'
      )
    ).pipe(
      map((item) => {
        console.debug('[EnvironmentConfigService] Config updated:', item);
        return new ApplicationEnvironmentConfig(item);
      }),
      catchError((error) => {
        console.error('[EnvironmentConfigService] Error updating config:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to update environment configuration.');
        }
        if (error?.message?.includes('not found')) {
          throw new Error('Environment configuration not found.');
        }
        throw new Error('Failed to update environment configuration. Please try again later.');
      })
    );
  }

  /**
   * Add an allowed origin to the config
   *
   * @param applicationId The application ID
   * @param environment The environment
   * @param origin The origin to add
   * @returns Observable<IApplicationEnvironmentConfig> The updated config
   *
   * _Requirements: 2.1_
   */
  public addAllowedOrigin(
    applicationId: string,
    environment: Environment,
    origin: string,
    currentOrigins: string[]
  ): Observable<IApplicationEnvironmentConfig> {
    console.debug('[EnvironmentConfigService] Adding allowed origin:', {
      applicationId,
      environment,
      origin,
    });

    if (!origin) {
      throw new Error('Origin is required');
    }

    // Validate origin format
    if (!this.isValidOrigin(origin)) {
      throw new Error('Invalid origin format. Must be a valid URL or wildcard pattern.');
    }

    const newOrigins = [...currentOrigins, origin];
    return this.updateConfig(applicationId, environment, { allowedOrigins: newOrigins });
  }

  /**
   * Remove an allowed origin from the config
   *
   * @param applicationId The application ID
   * @param environment The environment
   * @param origin The origin to remove
   * @returns Observable<IApplicationEnvironmentConfig> The updated config
   *
   * _Requirements: 2.1_
   */
  public removeAllowedOrigin(
    applicationId: string,
    environment: Environment,
    origin: string,
    currentOrigins: string[]
  ): Observable<IApplicationEnvironmentConfig> {
    console.debug('[EnvironmentConfigService] Removing allowed origin:', {
      applicationId,
      environment,
      origin,
    });

    const newOrigins = currentOrigins.filter((o) => o !== origin);
    return this.updateConfig(applicationId, environment, { allowedOrigins: newOrigins });
  }

  /**
   * Update webhook configuration
   *
   * @param applicationId The application ID
   * @param environment The environment
   * @param webhookConfig The webhook configuration updates
   * @returns Observable<IApplicationEnvironmentConfig> The updated config
   *
   * _Requirements: 4.1_
   */
  public updateWebhookConfig(
    applicationId: string,
    environment: Environment,
    webhookConfig: {
      webhookUrl?: string;
      webhookEvents?: string[];
      webhookEnabled?: boolean;
      webhookMaxRetries?: number;
      webhookRetryDelaySeconds?: number;
    }
  ): Observable<IApplicationEnvironmentConfig> {
    console.debug('[EnvironmentConfigService] Updating webhook config:', {
      applicationId,
      environment,
      webhookConfig,
    });

    return this.updateConfig(applicationId, environment, webhookConfig);
  }

  /**
   * Regenerate webhook secret
   *
   * @param applicationId The application ID
   * @param environment The environment
   * @returns Observable<{ config: IApplicationEnvironmentConfig; webhookSecret: string }> The updated config with new secret
   *
   * _Requirements: 4.1_
   */
  public regenerateWebhookSecret(
    applicationId: string,
    environment: Environment
  ): Observable<{ config: IApplicationEnvironmentConfig; webhookSecret: string }> {
    console.debug('[EnvironmentConfigService] Regenerating webhook secret:', {
      applicationId,
      environment,
    });

    const newSecret = this.generateWebhookSecret();

    return this.updateConfig(applicationId, environment, { webhookSecret: newSecret }).pipe(
      map((config) => ({
        config,
        webhookSecret: newSecret,
      }))
    );
  }

  /**
   * Set a feature flag
   *
   * @param applicationId The application ID
   * @param environment The environment
   * @param key The feature flag key
   * @param value The feature flag value
   * @param currentFlags The current feature flags
   * @returns Observable<IApplicationEnvironmentConfig> The updated config
   *
   * _Requirements: 8.1_
   */
  public setFeatureFlag(
    applicationId: string,
    environment: Environment,
    key: string,
    value: boolean | string | number,
    currentFlags: Record<string, unknown>
  ): Observable<IApplicationEnvironmentConfig> {
    console.debug('[EnvironmentConfigService] Setting feature flag:', {
      applicationId,
      environment,
      key,
      value,
    });

    if (!key) {
      throw new Error('Feature flag key is required');
    }

    // Validate key format (snake_case, max 50 chars)
    if (!this.isValidFeatureFlagKey(key)) {
      throw new Error('Invalid feature flag key. Must be snake_case and max 50 characters.');
    }

    const newFlags = { ...currentFlags, [key]: value };
    return this.updateConfig(applicationId, environment, { featureFlags: newFlags });
  }

  /**
   * Delete a feature flag
   *
   * @param applicationId The application ID
   * @param environment The environment
   * @param key The feature flag key to delete
   * @param currentFlags The current feature flags
   * @returns Observable<IApplicationEnvironmentConfig> The updated config
   *
   * _Requirements: 8.1_
   */
  public deleteFeatureFlag(
    applicationId: string,
    environment: Environment,
    key: string,
    currentFlags: Record<string, unknown>
  ): Observable<IApplicationEnvironmentConfig> {
    console.debug('[EnvironmentConfigService] Deleting feature flag:', {
      applicationId,
      environment,
      key,
    });

    const newFlags = { ...currentFlags };
    delete newFlags[key];
    return this.updateConfig(applicationId, environment, { featureFlags: newFlags });
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Validate origin format
   */
  private isValidOrigin(origin: string): boolean {
    // Allow wildcard patterns like *.example.com
    if (origin.startsWith('*.')) {
      const domain = origin.substring(2);
      return /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/.test(domain);
    }

    // Validate as URL
    try {
      const url = new URL(origin);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Validate feature flag key format (snake_case, max 50 chars)
   */
  private isValidFeatureFlagKey(key: string): boolean {
    return /^[a-z][a-z0-9_]{0,49}$/.test(key);
  }

  /**
   * Generate a cryptographically secure webhook secret (32 chars)
   */
  private generateWebhookSecret(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from(array, (byte) => chars[byte % chars.length]).join('');
  }
}
