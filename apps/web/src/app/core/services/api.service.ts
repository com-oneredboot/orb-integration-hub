// file: apps/web/src/app/services/api.service.ts
// author: Corey Dale Peters
// date: 2024-12-06
// description: The API service provides a core interface for making GraphQL queries and mutations

// 3rd Party Imports
import { generateClient } from 'aws-amplify/api';
import { GraphQLResult } from '@aws-amplify/api-graphql';
import { Injectable, inject } from '@angular/core';

// Application Imports
import { DebugLogService } from './debug-log.service';

type AuthMode = 'userPool' | 'apiKey';
type OperationType = 'query' | 'mutation';

@Injectable({
  providedIn: 'root'
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

  /**
   * Execute a GraphQL query
   */
  protected async query<T>(
    query: string,
    variables?: Record<string, unknown>,
    authMode: AuthMode = 'userPool'
  ): Promise<GraphQLResult<T>> {
    return this.execute<T>(query, variables, authMode, 'query');
  }

  /**
   * Execute a GraphQL mutation
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
      hasVariables: !!variables
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
            hasTokens
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
        variables
      };

      const result = await client.graphql(request as never) as GraphQLResult<T>;

      this.debugLog.logApi(operationName, 'success', {
        authMode,
        type,
        hasData: !!result.data,
        hasErrors: !!result.errors?.length
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
      return errorObj.errors.map(e => e.message).filter(Boolean).join('; ');
    }
    return String(error);
  }
}
