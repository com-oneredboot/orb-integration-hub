// file: frontend/src/app/services/api.service.ts
// author: Corey Dale Peters
// date: 2024-12-06
// description: The API service provides a common interface for making GraphQL queries and mutations

// 3rd Party Imports
import { generateClient } from 'aws-amplify/api';
import { GraphQLResult, GraphQLOptions } from '@aws-amplify/api-graphql';
import { Injectable } from '@angular/core';


@Injectable({
  providedIn: 'root'
})
export abstract class ApiService {

  protected client: any

  private authMode = 'userPool' as GraphQLOptions['authMode'];

  protected constructor() {
    this.client = generateClient({authMode: this.authMode});
  }

  protected async query(query: string, variables: any): Promise<GraphQLResult> {
    console.debug('query:', query, 'variables:', variables);
    return await this.client.graphql({query: query, variables: variables});
  }

  protected async mutate(mutation: string, variables_arg: any): Promise<GraphQLResult> {
    console.debug('mutation:', mutation, 'variables:', variables_arg);
    return await this.client.graphql({query: mutation, "variables": variables_arg});
  }
}
