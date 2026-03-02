/**
 * SDK API Service
 *
 * Lightweight fetch-based GraphQL client for the SDK API.
 * Uses native fetch instead of Amplify to avoid the single-API limitation.
 * The Lambda authorizer expects the API key in the Authorization header.
 *
 * @see .kiro/specs/migrate-auth-to-sdk-api/design.md
 */

import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ApiError, AuthenticationError, NetworkError } from '../errors/api-errors';
import { GraphQLResult } from '../types/graphql.types';

@Injectable({ providedIn: 'root' })
export class SdkApiService {
  private readonly sdkEndpoint: string;
  private readonly sdkApiKey: string;

  constructor() {
    this.sdkEndpoint = environment.sdkApi.url;
    this.sdkApiKey = environment.sdkApi.apiKey;
  }

  /**
   * Execute a GraphQL query against the SDK API.
   */
  async query<T>(query: string, variables?: Record<string, unknown>): Promise<GraphQLResult<T>> {
    return this.execute<T>(query, variables);
  }

  /**
   * Execute a GraphQL mutation against the SDK API.
   */
  async mutate<T>(mutation: string, variables?: Record<string, unknown>): Promise<GraphQLResult<T>> {
    return this.execute<T>(mutation, variables);
  }

  /**
   * Shared fetch logic for both queries and mutations.
   */
  private async execute<T>(operation: string, variables?: Record<string, unknown>): Promise<GraphQLResult<T>> {
    let response: Response;

    try {
      response = await fetch(this.sdkEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': this.sdkApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: operation, variables }),
      });
    } catch (error: unknown) {
      throw new NetworkError('SDK API is unreachable. Check network connectivity.', error);
    }

    if (response.status === 401 || response.status === 403) {
      throw new AuthenticationError('SDK API key is invalid or expired. Contact your administrator.');
    }

    let body: GraphQLResult<T>;

    try {
      body = await response.json();
    } catch {
      throw new ApiError('Invalid response from SDK API', 'INVALID_RESPONSE');
    }

    if (this.isUnauthorizedResponse(body)) {
      throw new AuthenticationError('SDK API key is invalid or expired. Contact your administrator.');
    }

    if (body.errors && body.errors.length > 0) {
      throw new ApiError(body.errors[0].message, 'GRAPHQL_ERROR', body.errors);
    }

    return body;
  }

  /**
   * Check if the response body indicates an authorization failure.
   */
  private isUnauthorizedResponse(body: GraphQLResult<unknown>): boolean {
    if (!body.errors || body.errors.length === 0) {
      return false;
    }
    return body.errors.some(
      (e) => e.errorType === 'Unauthorized' || e.message === 'Unauthorized'
    );
  }
}
