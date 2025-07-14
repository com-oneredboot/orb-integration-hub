// file: frontend/src/app/services/api.service.ts
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

  protected async query<T>(query: string, variables?: any, authMode: 'userPool' | 'apiKey' = 'userPool'): Promise<GraphQLResult<T>> {
    console.debug('[ApiService] GraphQL query initiated:', {
      operation: query.substring(0, 50) + '...',
      authMode,
      hasVariables: !!variables
    });
    
    try {
      const client = authMode === 'apiKey' ? this.apiKeyClient : this.userPoolClient;
      return client.graphql({
        query: query,
        variables: variables
      }) as Promise<GraphQLResult<T>>;
    } catch (error) {
      // No fallback - expose authentication errors directly
      throw error;
    }
  }

  protected async mutate<T>(mutation: string, variables?: any, authMode: 'userPool' | 'apiKey' = 'userPool'): Promise<GraphQLResult<T>> {
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
      const graphqlRequest: any = {
        query: mutation,
        variables: variables
      };
      
      // Note: CSRF protection disabled for GraphQL requests 
      // AppSync handles authentication through Cognito userPool tokens
      // Custom authToken field causes "Valid authorization header not provided" error
      // if (authMode === 'userPool' && this.isStateMutationOperation(mutation)) {
      //   try {
      //     const csrfToken = await this.csrfService.getCsrfToken();
      //     graphqlRequest.authToken = csrfToken; // This will be passed to the GraphQL context
      //     console.debug('[ApiService] CSRF token added to mutation request');
      //   } catch (csrfError) {
      //     console.error('[ApiService] Failed to obtain CSRF token:', csrfError);
      //     throw new Error('CSRF protection failed - request blocked');
      //   }
      // }
      
      return client.graphql(graphqlRequest) as Promise<GraphQLResult<T>>;
    } catch (error) {
      // No fallback - expose authentication errors directly  
      throw error;
    }
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
}
