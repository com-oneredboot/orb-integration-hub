// file: frontend/src/app/services/api.service.ts
// author: Corey Dale Peters
// date: 2024-12-06
// description: The API service provides a core interface for making GraphQL queries and mutations

// 3rd Party Imports
import { generateClient } from 'aws-amplify/api';
import { GraphQLResult } from '@aws-amplify/api-graphql';
import { Injectable } from '@angular/core';


@Injectable({
  providedIn: 'root'
})
export abstract class ApiService {
  private apiKeyClient = generateClient({authMode: 'apiKey'});
  private userPoolClient = generateClient({authMode: 'userPool'});

  protected async query<T>(query: string, variables?: any, authMode: 'userPool' | 'apiKey' = 'userPool'): Promise<GraphQLResult<T>> {
    console.debug('query:', query, 'variables:', variables, 'authMode:', authMode);
    
    try {
      const client = authMode === 'apiKey' ? this.apiKeyClient : this.userPoolClient;
      return client.graphql({
        query: query,
        variables: variables
      }) as Promise<GraphQLResult<T>>;
    } catch (error) {
      // If userPool auth fails and this isn't already an apiKey request, try with apiKey
      if (authMode === 'userPool' && this.isAuthError(error)) {
        console.warn('🔄 userPool auth failed, falling back to apiKey for query:', { query: query.substring(0, 50), error });
        return this.query(query, variables, 'apiKey');
      }
      throw error;
    }
  }

  protected async mutate<T>(mutation: string, variables?: any, authMode: 'userPool' | 'apiKey' = 'userPool'): Promise<GraphQLResult<T>> {
    console.debug('mutation:', mutation, 'variables:', variables, 'authMode:', authMode);
    
    // Debug JWT token for userPool auth
    if (authMode === 'userPool') {
      try {
        const { fetchAuthSession } = await import('@aws-amplify/auth');
        const session = await fetchAuthSession();
        console.debug('🔐 JWT Token Debug:', {
          hasAccessToken: !!session.tokens?.accessToken,
          hasIdToken: !!session.tokens?.idToken,
          accessTokenExp: session.tokens?.accessToken?.payload?.exp,
          idTokenExp: session.tokens?.idToken?.payload?.exp,
          currentTime: Math.floor(Date.now() / 1000),
          userGroups: session.tokens?.idToken?.payload?.['cognito:groups'],
          tokenUse: session.tokens?.accessToken?.payload?.['token_use'],
          clientId: session.tokens?.accessToken?.payload?.['client_id'],
          username: session.tokens?.accessToken?.payload?.['username']
        });
      } catch (tokenError) {
        console.error('❌ Error checking JWT token:', tokenError);
      }
    }
    
    try {
      const client = authMode === 'apiKey' ? this.apiKeyClient : this.userPoolClient;
      return client.graphql({
        query: mutation,
        variables: variables
      }) as Promise<GraphQLResult<T>>;
    } catch (error) {
      // For mutations, be more selective about fallback - only for read-only operations
      if (authMode === 'userPool' && this.isAuthError(error) && this.isReadOnlyMutation(mutation)) {
        console.warn('🔄 userPool auth failed, falling back to apiKey for read-only mutation:', { mutation: mutation.substring(0, 50), error });
        return this.mutate(mutation, variables, 'apiKey');
      }
      throw error;
    }
  }

  /**
   * Check if an error is authentication-related
   */
  private isAuthError(error: any): boolean {
    if (!error) return false;
    
    const errorString = String(error).toLowerCase();
    const errorMessage = error?.message?.toLowerCase() || '';
    
    return (
      errorString.includes('unauthorized') ||
      errorString.includes('invalid authorization') ||
      errorString.includes('access denied') ||
      errorString.includes('authentication') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('invalid authorization') ||
      errorMessage.includes('access denied') ||
      error?.name === 'UnauthorizedException' ||
      error?.code === 'UnauthorizedException'
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
