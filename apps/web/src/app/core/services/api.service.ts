// file: apps/web/src/app/services/api.service.ts
// author: Corey Dale Peters
// date: 2024-12-06
// description: The API service provides a core interface for making GraphQL queries and mutations

// 3rd Party Imports
import { generateClient } from 'aws-amplify/api';
import { GraphQLResult } from '@aws-amplify/api-graphql';
import { Injectable, inject } from '@angular/core';

// Application Imports
import { CsrfService } from './csrf.service';
import { DebugLogService } from './debug-log.service';

type AuthMode = 'userPool' | 'apiKey';
type OperationType = 'query' | 'mutation';

@Injectable({
  providedIn: 'root'
})
export abstract class ApiService {
  private apiKeyClient = generateClient({ authMode: 'apiKey' });
  private userPoolClient = generateClient({ authMode: 'userPool' });
  private csrfService = inject(CsrfService);
  private debugLog = inject(DebugLogService);

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
      const client = authMode === 'apiKey' ? this.apiKeyClient : this.userPoolClient;
      
      // Build request - add CSRF for authenticated state-changing mutations
      const request: { query: string; variables?: Record<string, unknown>; authToken?: string } = {
        query: operation,
        variables
      };

      if (type === 'mutation' && authMode === 'userPool' && this.isStateMutation(operation)) {
        await this.addCsrfToken(request, operationName, authMode);
      }

      const result = await client.graphql(request as never) as GraphQLResult<T>;

      this.debugLog.logApi(operationName, 'success', {
        authMode,
        type,
        hasData: !!result.data,
        hasErrors: !!result.errors?.length
      });

      return result;
    } catch (error) {
      this.debugLog.logApi(operationName, 'failure', { authMode, type }, this.extractErrorMessage(error));
      throw error;
    }
  }

  /**
   * Add CSRF token to request for state-changing mutations
   */
  private async addCsrfToken(
    request: { authToken?: string },
    operationName: string,
    authMode: AuthMode
  ): Promise<void> {
    try {
      request.authToken = await this.csrfService.getCsrfToken();
      console.debug('[ApiService] CSRF token added to mutation request');
    } catch (csrfError) {
      console.error('[ApiService] Failed to obtain CSRF token:', csrfError);
      this.debugLog.logError(operationName, 'CSRF protection failed', { authMode });
      throw new Error('CSRF protection failed - request blocked');
    }
  }

  /**
   * Check if operation is a state-changing mutation requiring CSRF protection
   */
  private isStateMutation(operation: string): boolean {
    const opLower = operation.toLowerCase();
    const statePatterns = [
      'create', 'update', 'delete', 'insert', 'modify', 'change',
      'set', 'add', 'remove', 'smsverification', 'signup', 'signin',
      'signout', 'confirm', 'reset', 'verify'
    ];
    return statePatterns.some(p => opLower.includes(p));
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
