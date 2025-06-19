// file: frontend/src/app/services/api.service.ts
// author: Corey Dale Peters
// date: 2024-12-06
// description: The API service provides a core interface for making GraphQL queries and mutations

// 3rd Party Imports
import { generateClient } from 'aws-amplify/api';
import { GraphQLResult, GraphQLOptions } from '@aws-amplify/api-graphql';
import { Injectable } from '@angular/core';


@Injectable({
  providedIn: 'root'
})
export abstract class ApiService {
  private apiKeyClient = generateClient({authMode: 'apiKey'});
  private userPoolClient = generateClient({authMode: 'userPool'});

  protected async query<T>(query: string, variables?: any, authMode: 'userPool' | 'apiKey' = 'userPool'): Promise<GraphQLResult<T>> {
    console.debug('query:', query, 'variables:', variables, 'authMode:', authMode);
    const client = authMode === 'apiKey' ? this.apiKeyClient : this.userPoolClient;
    return client.graphql({
      query: query,
      variables: variables
    }) as Promise<GraphQLResult<T>>;
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
          clientId: session.tokens?.accessToken?.payload?.client_id,
          username: session.tokens?.accessToken?.payload?.username
        });
      } catch (tokenError) {
        console.error('❌ Error checking JWT token:', tokenError);
      }
    }
    
    const client = authMode === 'apiKey' ? this.apiKeyClient : this.userPoolClient;
    return client.graphql({
      query: mutation,
      variables: variables
    }) as Promise<GraphQLResult<T>>;
  }
}
