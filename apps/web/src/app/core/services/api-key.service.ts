/**
 * API Key Service
 *
 * Provides operations for application API key management.
 * Uses v0.19.0 response envelope format with ApiService base class methods.
 *
 * @see .kiro/specs/application-access-management/design.md
 * _Requirements: 9.1_
 */

import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

import { ApiService } from './api.service';
import {
  ApplicationApiKeysCreate,
  ApplicationApiKeysUpdate,
  ApplicationApiKeysListByApplicationId,
} from '../graphql/ApplicationApiKeys.graphql';
import {
  ApplicationApiKeys,
  ApplicationApiKeysCreateInput,
  ApplicationApiKeysUpdateInput,
  IApplicationApiKeys,
} from '../models/ApplicationApiKeysModel';
import { ApplicationApiKeyStatus } from '../enums/ApplicationApiKeyStatusEnum';
import { Environment } from '../enums/EnvironmentEnum';
import { toGraphQLInput } from '../../graphql-utils';
import { Connection } from '../types/graphql.types';
import { isAuthenticationError } from '../errors/api-errors';

/**
 * Result of a key generation operation
 */
export interface GeneratedKeyResult {
  apiKeyId: string;
  fullKey: string;
  environment: Environment;
  keyPrefix: string;
}

/**
 * Result of a key generation or rotation operation
 */
export interface ApiKeyOperationResult {
  apiKey: IApplicationApiKeys;
  generatedKey: GeneratedKeyResult;
}

/**
 * Result of a key rotation operation
 */
export interface ApiKeyRotationResult {
  apiKey: IApplicationApiKeys;
  newKey: GeneratedKeyResult;
}

@Injectable({
  providedIn: 'root',
})
export class ApiKeyService extends ApiService {
  constructor() {
    super();
  }

  /**
   * Generate a UUID v4 for client-side ID generation
   */
  private generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Generate a cryptographically secure API key string
   * Format: orb_{env}_{random32chars}
   */
  private generateApiKeyString(environment: Environment): string {
    const envPrefix = this.getEnvironmentPrefix(environment);
    const randomPart = this.generateSecureRandomString(32);
    return `orb_${envPrefix}_${randomPart}`;
  }

  /**
   * Get environment prefix for API key
   */
  private getEnvironmentPrefix(environment: Environment): string {
    const prefixes: Record<Environment, string> = {
      [Environment.Unknown]: 'unk',
      [Environment.Production]: 'prod',
      [Environment.Staging]: 'stg',
      [Environment.Development]: 'dev',
      [Environment.Test]: 'test',
      [Environment.Preview]: 'prev',
    };
    return prefixes[environment] || 'unk';
  }

  /**
   * Generate a cryptographically secure random string
   */
  private generateSecureRandomString(length: number): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from(array, (byte) => chars[byte % chars.length]).join('');
  }

  /**
   * Hash a string using SHA-256
   */
  private async hashKey(key: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // ============================================================================
  // API Key Operations
  // ============================================================================

  /**
   * Get all API keys for an application
   *
   * @param applicationId The application ID
   * @param limit Optional limit for pagination
   * @param nextToken Optional token for pagination
   * @returns Observable<Connection<IApplicationApiKeys>> Paginated list of API keys
   *
   * _Requirements: 9.1_
   */
  public getApiKeysByApplication(
    applicationId: string,
    limit?: number,
    nextToken?: string
  ): Observable<Connection<IApplicationApiKeys>> {
    console.debug('[ApiKeyService] Getting API keys for application:', applicationId);

    if (!applicationId) {
      throw new Error('Application ID is required');
    }

    return from(
      this.executeListQuery<IApplicationApiKeys>(
        ApplicationApiKeysListByApplicationId,
        { input: { applicationId, limit, nextToken } },
        'userPool'
      )
    ).pipe(
      map((connection) => {
        console.debug('[ApiKeyService] API keys retrieved:', connection.items.length);
        return {
          items: connection.items.map((item) => new ApplicationApiKeys(item)),
          nextToken: connection.nextToken,
        };
      }),
      catchError((error) => {
        console.error('[ApiKeyService] Error getting API keys:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to view API keys.');
        }
        throw new Error('Failed to retrieve API keys. Please try again later.');
      })
    );
  }

  /**
   * Generate a new API key for an application environment
   *
   * @param applicationId The application ID
   * @param organizationId The organization ID
   * @param environment The environment for the key
   * @returns Observable<ApiKeyOperationResult> The created API key and full key value
   *
   * _Requirements: 9.1, 9.2_
   */
  public generateApiKey(
    applicationId: string,
    organizationId: string,
    environment: Environment
  ): Observable<ApiKeyOperationResult> {
    console.debug('[ApiKeyService] Generating API key:', {
      applicationId,
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

    // Generate the full key
    const fullKey = this.generateApiKeyString(environment);
    const keyPrefix = fullKey.substring(0, 12); // e.g., "orb_dev_xxxx"
    const apiKeyId = this.generateUUID();

    // Hash the key for storage
    return from(this.hashKey(fullKey)).pipe(
      switchMap((keyHash) => {
        const now = new Date();
        const createInput: ApplicationApiKeysCreateInput = {
          applicationApiKeyId: apiKeyId,
          applicationId,
          organizationId,
          environment,
          keyHash,
          keyPrefix,
          status: ApplicationApiKeyStatus.Active,
          createdAt: now,
          updatedAt: now,
        };

        const graphqlInput = toGraphQLInput(
          createInput as unknown as Record<string, unknown>
        );

        return from(
          this.executeMutation<IApplicationApiKeys>(
            ApplicationApiKeysCreate,
            { input: graphqlInput },
            'userPool'
          )
        ).pipe(
          map((item) => {
            console.debug('[ApiKeyService] API key generated:', item);
            return {
              apiKey: new ApplicationApiKeys(item),
              generatedKey: {
                apiKeyId,
                fullKey,
                environment,
                keyPrefix,
              },
            };
          })
        );
      }),
      catchError((error) => {
        console.error('[ApiKeyService] Error generating API key:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to generate API keys.');
        }
        if (error?.message?.includes('already exists')) {
          throw new Error(
            'An API key already exists for this environment. Please revoke it first.'
          );
        }
        throw new Error('Failed to generate API key. Please try again later.');
      })
    );
  }

  /**
   * Rotate an API key
   * Creates a new key and marks the old one as rotating.
   * Both keys are valid during the rotation period.
   *
   * @param apiKeyId The API key ID to rotate
   * @param applicationId The application ID
   * @param environment The environment
   * @returns Observable<ApiKeyRotationResult> The updated API key and new key value
   *
   * _Requirements: 9.3_
   */
  public rotateApiKey(
    apiKeyId: string,
    applicationId: string,
    environment: Environment
  ): Observable<ApiKeyRotationResult> {
    console.debug('[ApiKeyService] Rotating API key:', apiKeyId);

    if (!apiKeyId) {
      throw new Error('API key ID is required');
    }

    // Generate the new key
    const newFullKey = this.generateApiKeyString(environment);
    const newKeyPrefix = newFullKey.substring(0, 12);

    // Hash the new key
    return from(this.hashKey(newFullKey)).pipe(
      switchMap((newKeyHash) => {
        const updateInput: ApplicationApiKeysUpdateInput = {
          applicationApiKeyId: apiKeyId,
          nextKeyHash: newKeyHash,
          status: ApplicationApiKeyStatus.Rotating,
          updatedAt: new Date(),
        };

        const graphqlInput = toGraphQLInput(
          updateInput as unknown as Record<string, unknown>
        );

        return from(
          this.executeMutation<IApplicationApiKeys>(
            ApplicationApiKeysUpdate,
            { input: graphqlInput },
            'userPool'
          )
        ).pipe(
          map((item) => {
            console.debug('[ApiKeyService] API key rotated:', item);
            return {
              apiKey: new ApplicationApiKeys(item),
              newKey: {
                apiKeyId,
                fullKey: newFullKey,
                environment,
                keyPrefix: newKeyPrefix,
              },
            };
          })
        );
      }),
      catchError((error) => {
        console.error('[ApiKeyService] Error rotating API key:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to rotate API keys.');
        }
        if (error?.message?.includes('not found')) {
          throw new Error('API key not found. It may have been deleted.');
        }
        throw new Error('Failed to rotate API key. Please try again later.');
      })
    );
  }

  /**
   * Revoke an API key immediately
   *
   * @param apiKeyId The API key ID to revoke
   * @returns Observable<IApplicationApiKeys> The revoked API key
   *
   * _Requirements: 9.4_
   */
  public revokeApiKey(apiKeyId: string): Observable<IApplicationApiKeys> {
    console.debug('[ApiKeyService] Revoking API key:', apiKeyId);

    if (!apiKeyId) {
      throw new Error('API key ID is required');
    }

    const updateInput: ApplicationApiKeysUpdateInput = {
      applicationApiKeyId: apiKeyId,
      status: ApplicationApiKeyStatus.Revoked,
      updatedAt: new Date(),
    };

    const graphqlInput = toGraphQLInput(
      updateInput as unknown as Record<string, unknown>
    );

    return from(
      this.executeMutation<IApplicationApiKeys>(
        ApplicationApiKeysUpdate,
        { input: graphqlInput },
        'userPool'
      )
    ).pipe(
      map((item) => {
        console.debug('[ApiKeyService] API key revoked:', item);
        return new ApplicationApiKeys(item);
      }),
      catchError((error) => {
        console.error('[ApiKeyService] Error revoking API key:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to revoke API keys.');
        }
        if (error?.message?.includes('not found')) {
          throw new Error('API key not found. It may have already been revoked.');
        }
        throw new Error('Failed to revoke API key. Please try again later.');
      })
    );
  }
}
