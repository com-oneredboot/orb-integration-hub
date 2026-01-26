// file: apps/web/src/app/services/api.service.ts
// author: Corey Dale Peters
// date: 2024-12-06
// description: The API service provides a core interface for making GraphQL queries and mutations
// updated: 2026-01-25 - Added v0.19.0 response envelope handling methods

// 3rd Party Imports
import { generateClient } from 'aws-amplify/api';
import { GraphQLResult } from '@aws-amplify/api-graphql';
import { Injectable, inject } from '@angular/core';

// Application Imports
import { DebugLogService } from './debug-log.service';
import {
  ApiError,
  AuthenticationError,
  NetworkError,
  NotFoundError,
} from '../errors/api-errors';
import {
  Connection,
  GraphQLResponseEnvelope,
  GraphQLError,
  AuthMode,
} from '../types/graphql.types';

type OperationType = 'query' | 'mutation';

@Injectable({
  providedIn: 'root',
})
export abstract class ApiService {
  private apiKeyClient = generateClient({ authMode: 'apiKey' });
  private debugLog = inject(DebugLogService);

  /**
   * Get a fresh userPool client to ensure it uses current tokens
   * This is important after token refresh operations
   */
  private getUserPoolClient() {
    return generateClient({ authMode: 'userPool' });
  }

  // ============================================================================
  // v0.19.0 Response Envelope Methods
  // These methods handle the new response format with code, success, message
  // ============================================================================

  /**
   * Execute a GraphQL mutation and return the item directly.
   * v0.19.0 mutations return: { code, success, message, item }
   *
   * @param mutation - GraphQL mutation string
   * @param variables - Variables for the mutation
   * @param authMode - Authentication mode (default: userPool)
   * @returns The mutated item directly (unwrapped from envelope)
   * @throws ApiError on failure
   *
   * _Requirements: 1.1, 1.2, 1.3, 4.1_
   */
  protected async executeMutation<T>(
    mutation: string,
    variables: Record<string, unknown>,
    authMode: AuthMode = 'userPool'
  ): Promise<T> {
    const response = await this.mutate<Record<string, GraphQLResponseEnvelope<T>>>(
      mutation,
      variables,
      authMode
    );

    if (response.errors?.length) {
      throw this.handleGraphQLError(response.errors[0] as GraphQLError);
    }

    if (!response.data) {
      throw new ApiError('No data in mutation response', 'NO_DATA');
    }

    // Extract the mutation result (first key in data object)
    const mutationName = Object.keys(response.data)[0];
    const envelope = response.data[mutationName];

    // Handle null envelope (can happen if mutation returns null or auth fails silently)
    if (!envelope) {
      console.error(`[ApiService] executeMutation: No envelope returned for ${mutationName}`);
      throw new ApiError('No response envelope from mutation', 'NO_ENVELOPE');
    }

    // Check envelope success field
    if (!envelope.success) {
      throw new ApiError(envelope.message || 'Mutation failed', `HTTP_${envelope.code}`);
    }

    if (!envelope.item) {
      throw new ApiError('No item in mutation response', 'NO_ITEM');
    }

    return envelope.item;
  }


  /**
   * Execute a GraphQL Get query for a single item.
   * v0.19.0 Get queries return: { code, success, message, item }
   *
   * @param query - GraphQL query string
   * @param variables - Variables for the query
   * @param authMode - Authentication mode (default: userPool)
   * @returns The item or null if not found
   * @throws ApiError on failure
   *
   * _Requirements: 2.1, 4.2_
   */
  protected async executeGetQuery<T>(
    query: string,
    variables: Record<string, unknown>,
    authMode: AuthMode = 'userPool'
  ): Promise<T | null> {
    const response = await this.query<Record<string, GraphQLResponseEnvelope<T>>>(
      query,
      variables,
      authMode
    );

    if (response.errors?.length) {
      throw this.handleGraphQLError(response.errors[0] as GraphQLError);
    }

    if (!response.data) {
      return null;
    }

    const queryName = Object.keys(response.data)[0];
    const envelope = response.data[queryName];

    // Handle null envelope (can happen if query returns null or auth fails silently)
    if (!envelope) {
      console.warn(`[ApiService] executeGetQuery: No envelope returned for ${queryName}`);
      return null;
    }

    // Check envelope success field
    if (!envelope.success) {
      // 404 is not found, return null instead of throwing
      if (envelope.code === 404) {
        return null;
      }
      throw new ApiError(envelope.message || 'Query failed', `HTTP_${envelope.code}`);
    }

    return envelope.item ?? null;
  }

  /**
   * Execute a GraphQL List query (connection pattern).
   * v0.19.0 List queries return: { code, success, message, items, nextToken }
   *
   * @param query - GraphQL query string
   * @param variables - Variables for the query
   * @param authMode - Authentication mode (default: userPool)
   * @returns Connection with items array and pagination token
   * @throws ApiError on failure
   *
   * _Requirements: 2.2, 4.2_
   */
  protected async executeListQuery<T>(
    query: string,
    variables: Record<string, unknown>,
    authMode: AuthMode = 'userPool'
  ): Promise<Connection<T>> {
    const response = await this.query<Record<string, GraphQLResponseEnvelope<T>>>(
      query,
      variables,
      authMode
    );

    if (response.errors?.length) {
      throw this.handleGraphQLError(response.errors[0] as GraphQLError);
    }

    const queryName = Object.keys(response.data || {})[0];
    const envelope = response.data?.[queryName];

    // Check envelope success field
    if (envelope && !envelope.success) {
      throw new ApiError(envelope.message || 'Query failed', `HTTP_${envelope.code}`);
    }

    return {
      items: envelope?.items ?? [],
      nextToken: envelope?.nextToken ?? null,
    };
  }

  /**
   * Convert GraphQL errors to typed ApiError.
   * Maps error types to appropriate error classes.
   *
   * _Requirements: 6.1, 6.2, 6.3, 6.4, 4.3_
   */
  protected handleGraphQLError(error: GraphQLError): ApiError {
    const message = error.message || 'Unknown GraphQL error';
    const errorType = error.errorType || 'UNKNOWN';

    // Authentication errors
    if (
      errorType.includes('Unauthorized') ||
      errorType.includes('UnauthorizedException') ||
      message.includes('Not Authorized') ||
      message.includes('Unauthorized')
    ) {
      return new AuthenticationError(message, { errorType, path: error.path });
    }

    // Network errors
    if (
      errorType.includes('Network') ||
      errorType.includes('Connection') ||
      errorType.includes('Timeout')
    ) {
      return new NetworkError(message, { errorType, path: error.path });
    }

    // Not found errors
    if (
      errorType.includes('NotFound') ||
      message.includes('not found') ||
      message.includes('does not exist')
    ) {
      return new NotFoundError(message, { errorType, path: error.path });
    }

    return new ApiError(message, errorType, { path: error.path });
  }

  // ============================================================================
  // Legacy Methods (kept for backward compatibility)
  // ============================================================================

  /**
   * Execute a GraphQL query (legacy method)
   * @deprecated Use executeGetQuery or executeListQuery for v0.19.0 format
   */
  protected async query<T>(
    query: string,
    variables?: Record<string, unknown>,
    authMode: AuthMode = 'userPool'
  ): Promise<GraphQLResult<T>> {
    return this.execute<T>(query, variables, authMode, 'query');
  }

  /**
   * Execute a GraphQL mutation (legacy method)
   * @deprecated Use executeMutation for v0.19.0 format
   */
  protected async mutate<T>(
    mutation: string,
    variables?: Record<string, unknown>,
    authMode: AuthMode = 'userPool'
  ): Promise<GraphQLResult<T>> {
    return this.execute<T>(mutation, variables, authMode, 'mutation');
  }


  /**
   * Core GraphQL execution - handles both queries and mutations
   */
  private async execute<T>(
    operation: string,
    variables: Record<string, unknown> | undefined,
    authMode: AuthMode,
    type: OperationType
  ): Promise<GraphQLResult<T>> {
    const operationName = this.extractOperationName(operation);

    console.debug(`[ApiService] GraphQL ${type} initiated:`, {
      operation: operationName,
      authMode,
      hasVariables: !!variables,
    });

    this.debugLog.logApi(operationName, 'pending', { authMode, type });

    try {
      // Always get a fresh userPool client to ensure current tokens are used
      const client = authMode === 'apiKey' ? this.apiKeyClient : this.getUserPoolClient();

      // Log which client type we're using
      console.debug(`[ApiService] Using ${authMode} client for ${operationName}`);

      // For userPool auth, verify we have tokens before making the request
      if (authMode === 'userPool') {
        try {
          const { fetchAuthSession } = await import('@aws-amplify/auth');
          const session = await fetchAuthSession();
          const hasTokens = !!session.tokens?.accessToken && !!session.tokens?.idToken;
          console.debug(`[ApiService] Token check for ${operationName}:`, {
            hasAccessToken: !!session.tokens?.accessToken,
            hasIdToken: !!session.tokens?.idToken,
            hasTokens,
          });

          if (!hasTokens) {
            console.error(`[ApiService] No valid tokens for userPool auth on ${operationName}`);
            this.debugLog.logError(operationName, 'No valid tokens for userPool auth', { authMode });
          }
        } catch (tokenCheckError) {
          console.error(`[ApiService] Error checking tokens for ${operationName}:`, tokenCheckError);
        }
      }

      // Build request
      const request: { query: string; variables?: Record<string, unknown> } = {
        query: operation,
        variables,
      };

      const result = (await client.graphql(request as never)) as GraphQLResult<T>;

      this.debugLog.logApi(operationName, 'success', {
        authMode,
        type,
        hasData: !!result.data,
        hasErrors: !!result.errors?.length,
      });

      return result;
    } catch (error) {
      console.error(`[ApiService] GraphQL ${type} failed for ${operationName}:`, error);
      this.debugLog.logApi(operationName, 'failure', { authMode, type }, this.extractErrorMessage(error));
      throw error;
    }
  }

  /**
   * Extract operation name from GraphQL string
   */
  private extractOperationName(operation: string): string {
    const match = operation.match(/(?:query|mutation)\s+(\w+)/i);
    if (match) return match[1];

    const fallback = operation.match(/(?:query|mutation)\s*{\s*(\w+)/i);
    return fallback ? fallback[1] : 'UnknownOperation';
  }

  /**
   * Extract error message from various error types
   */
  private extractErrorMessage(error: unknown): string {
    if (!error) return 'Unknown error';
    if (typeof error === 'string') return error;

    const errorObj = error as { message?: string; errors?: { message?: string }[] };
    if (errorObj.message) return errorObj.message;
    if (errorObj.errors?.length) {
      return errorObj.errors.map((e) => e.message).filter(Boolean).join('; ');
    }
    return String(error);
  }
}
