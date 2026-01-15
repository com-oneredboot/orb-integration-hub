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


@Injectable({
  providedIn: 'root'
})
export abstract class ApiService {
  private apiKeyClient = generateClient({authMode: 'apiKey'});
  private userPoolClient = generateClient({authMode: 'userPool'});
  private csrfService = inject(CsrfService);

  protected async query<T>(query: string, variables?: Record<string, unknown>, authMode: 'userPool' | 'apiKey' = 'userPool'): Promise<GraphQLResult<T>> {
    console.debug('[ApiService] GraphQL query initiated:', {
      operation: query.substring(0, 50) + '...',
      authMode,
      hasVariables: !!variables
    });
    
    try {
      const client = authMode === 'apiKey' ? this.apiKeyClient : this.userPoolClient;
      return client.graphql({
        query: query,
        variables: variables as never
      }) as Promise<GraphQLResult<T>>;
    } catch (error) {
      // If userPool auth fails and this isn't already an apiKey request, try with apiKey
      if (authMode === 'userPool' && this.isAuthError(error)) {
        console.warn('[ApiService] userPool auth failed, falling back to apiKey for query. Error details:', error);
        return this.query(query, variables, 'apiKey');
      }
      throw error;
    }
  }

  protected async mutate<T>(mutation: string, variables?: Record<string, unknown>, authMode: 'userPool' | 'apiKey' = 'userPool'): Promise<GraphQLResult<T>> {
    console.debug('[ApiService] GraphQL mutation initiated:', {
      operation: mutation.substring(0, 50) + '...',
      authMode,
      hasVariables: !!variables
    });
    
    // Validate JWT token for userPool auth
    if (authMode === 'userPool') {
      try {
        const { fetchAuthSession } = await import('@aws-amplify/auth');
        const session = await fetchAuthSession();
        const hasValidTokens = !!session.tokens?.accessToken && !!session.tokens?.idToken;
        console.debug('[ApiService] JWT token validation:', { hasValidTokens });
      } catch (tokenError) {
        console.error('[ApiService] JWT token validation failed');
      }
    }
    
    try {
      const client = authMode === 'apiKey' ? this.apiKeyClient : this.userPoolClient;
      
      // Add CSRF protection for state-changing mutations
      const graphqlRequest: { query: string; variables?: Record<string, unknown>; authToken?: string } = {
        query: mutation,
        variables: variables
      };
      
      // Add CSRF token for authenticated mutations that change state
      if (authMode === 'userPool' && this.isStateMutationOperation(mutation)) {
        try {
          const csrfToken = await this.csrfService.getCsrfToken();
          graphqlRequest.authToken = csrfToken; // This will be passed to the GraphQL context
          console.debug('[ApiService] CSRF token added to mutation request');
        } catch (csrfError) {
          console.error('[ApiService] Failed to obtain CSRF token:', csrfError);
          throw new Error('CSRF protection failed - request blocked');
        }
      }
      
      return client.graphql(graphqlRequest as never) as Promise<GraphQLResult<T>>;
    } catch (error) {
      // For mutations, be more selective about fallback - only for read-only operations
      if (authMode === 'userPool' && this.isAuthError(error) && this.isReadOnlyMutation(mutation)) {
        console.warn('[ApiService] userPool auth failed, falling back to apiKey for read-only mutation');
        return this.mutate(mutation, variables, 'apiKey');
      }
      throw error;
    }
  }

  /**
   * Check if an error is authentication-related
   */
  private isAuthError(error: unknown): boolean {
    if (!error) return false;
    
    const errorString = String(error).toLowerCase();
    const errorObj = error as { message?: string; name?: string; code?: string };
    const errorMessage = errorObj?.message?.toLowerCase() || '';
    
    return (
      errorString.includes('unauthorized') ||
      errorString.includes('invalid authorization') ||
      errorString.includes('access denied') ||
      errorString.includes('authentication') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('invalid authorization') ||
      errorMessage.includes('access denied') ||
      errorObj?.name === 'UnauthorizedException' ||
      errorObj?.code === 'UnauthorizedException'
    );
  }

  /**
   * Check if a mutation is a state-changing operation requiring CSRF protection
   */
  private isStateMutationOperation(mutation: string): boolean {
    const mutationLower = mutation.toLowerCase();
    
    // State-changing operations that require CSRF protection
    const stateMutationPatterns = [
      'create',
      'update', 
      'delete',
      'insert',
      'modify',
      'change',
      'set',
      'add',
      'remove',
      'smsverification', // SMS verification changes state
      'signup',          // User registration
      'signin',          // Authentication state change
      'signout',         // Authentication state change
      'confirm',         // Confirmation operations
      'reset',           // Password reset operations
      'verify'           // Verification operations
    ];
    
    return stateMutationPatterns.some(pattern => 
      mutationLower.includes(pattern)
    );
  }

  /**
   * Check if a mutation is read-only (safe to fallback to apiKey)
   * Read-only mutations are typically queries disguised as mutations
   */
  private isReadOnlyMutation(mutation: string): boolean {
    const mutationLower = mutation.toLowerCase();
    
    // List of read-only operation patterns that are safe to fallback
    const readOnlyPatterns = [
      'query',          // Some operations may be labeled as mutations but are actually queries
      'get',            // Get operations
      'fetch',          // Fetch operations  
      'list',           // List operations
      'search'          // Search operations
    ];
    
    // Check if this mutation contains only read-only operation keywords
    const hasWriteOperations = (
      mutationLower.includes('create') ||
      mutationLower.includes('update') || 
      mutationLower.includes('delete') ||
      mutationLower.includes('insert') ||
      mutationLower.includes('modify') ||
      mutationLower.includes('smsverification') // SMS verification requires userPool auth
    );
    
    const hasReadOnlyPatterns = readOnlyPatterns.some(pattern => 
      mutationLower.includes(pattern)
    );
    
    // Only allow fallback if it has read-only patterns and no write operations
    return hasReadOnlyPatterns && !hasWriteOperations;
  }
}
