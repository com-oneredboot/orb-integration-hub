/**
 * Organization Service
 * 
 * Provides CRUD operations for organization management.
 * Handles API communication for organization-related functionality.
 */

import { Injectable } from '@angular/core';
import { GraphQLResult } from '@aws-amplify/api-graphql';
import { Observable, from } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

import { ApiService } from './api.service';
import { 
  OrganizationsCreate, 
  OrganizationsUpdate, 
  OrganizationsDelete,
  OrganizationsQueryByOrganizationId,
  OrganizationsQueryByOwnerId
} from '../graphql/Organizations.graphql';
import {
  Organizations,
  OrganizationsCreateInput,
  OrganizationsUpdateInput,
  OrganizationsResponse,
  OrganizationsCreateResponse,
  OrganizationsUpdateResponse,
  OrganizationsListResponse,
  IOrganizations
} from '../models/OrganizationsModel';
import { OrganizationStatus } from '../enums/OrganizationStatusEnum';
import { toGraphQLInput } from '../../graphql-utils';

interface AuthCheckResult {
  isAuthenticated: boolean;
  error?: string;
}

// Response types for GraphQL operations
interface OrganizationsGraphQLResponse {
  items: IOrganizations[];
  nextToken?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrganizationService extends ApiService {

  constructor() {
    super();
  }

  /**
   * Check if user is properly authenticated for userPool operations
   */
  private async checkAuthentication(): Promise<AuthCheckResult> {
    try {
      const { fetchAuthSession } = await import('@aws-amplify/auth');
      const session = await fetchAuthSession();
      
      const hasAccessToken = !!session.tokens?.accessToken;
      const hasIdToken = !!session.tokens?.idToken;
      
      if (!hasAccessToken || !hasIdToken) {
        return {
          isAuthenticated: false,
          error: 'Missing authentication tokens'
        };
      }

      // Check if tokens are expired
      const now = Math.floor(Date.now() / 1000);
      const accessTokenExp = session.tokens?.accessToken?.payload?.exp as number;
      const idTokenExp = session.tokens?.idToken?.payload?.exp as number;
      
      if (!accessTokenExp || !idTokenExp || accessTokenExp <= now || idTokenExp <= now) {
        return {
          isAuthenticated: false,
          error: 'Authentication tokens have expired or are invalid'
        };
      }

      console.debug('[OrganizationService] Authentication check passed', {
        hasAccessToken,
        hasIdToken,
        accessTokenExp: new Date(accessTokenExp * 1000),
        idTokenExp: new Date(idTokenExp * 1000)
      });

      return { isAuthenticated: true };
    } catch (error) {
      console.error('[OrganizationService] Authentication check failed:', error);
      return {
        isAuthenticated: false,
        error: `Authentication check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }


  /**
   * Generate a UUID v4 for client-side ID generation
   * Uses native crypto.randomUUID() for secure random generation
   */
  private generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Create a draft organization (create-on-click pattern)
   * Creates a new organization with PENDING status and minimal default values.
   * The user will then be navigated to the detail page to complete the setup.
   * @param ownerId The user ID of the organization owner
   * @returns Observable<OrganizationsCreateResponse>
   */
  public createDraft(ownerId: string): Observable<OrganizationsCreateResponse> {
    console.debug('[OrganizationService] Creating draft organization for owner:', ownerId);

    if (!ownerId) {
      throw new Error('Owner ID is required to create an organization');
    }

    return from(this.checkAuthentication()).pipe(
      switchMap(async (authResult: AuthCheckResult) => {
        if (!authResult.isAuthenticated) {
          throw new Error(`Authentication required: ${authResult.error}`);
        }

        console.debug('[OrganizationService] User is authenticated, creating draft organization');

        const now = new Date();
        const organizationId = this.generateUUID();

        console.debug('[OrganizationService] Generated organizationId:', organizationId);

        // Build the create input with PENDING status
        const createInput: OrganizationsCreateInput = {
          organizationId,
          name: 'New Organization', // Default name - user will update on detail page
          description: '',
          ownerId,
          status: OrganizationStatus.Pending,
          createdAt: now,
          updatedAt: now,
          kmsKeyId: '',
          kmsKeyArn: '',
          kmsAlias: ''
        };

        // Convert Date fields to Unix timestamps for GraphQL AWSTimestamp
        const graphqlInput = toGraphQLInput(createInput as unknown as Record<string, unknown>);

        return this.mutate<{ OrganizationsCreate: OrganizationsGraphQLResponse }>(
          OrganizationsCreate,
          { input: graphqlInput },
          'userPool'
        );
      }),
      switchMap(response => from(Promise.resolve(response))),
      map((response: GraphQLResult<{ OrganizationsCreate: OrganizationsGraphQLResponse }>) => {
        console.debug('[OrganizationService] Create draft organization response:', response);
        
        if (!response.data?.OrganizationsCreate) {
          throw new Error('No data in create draft organization response');
        }

        const items = response.data.OrganizationsCreate.items;
        const createdOrg = items.length > 0 ? new Organizations(items[0]) : null;

        return {
          StatusCode: 200,
          Message: 'Draft organization created successfully',
          Data: createdOrg
        } as OrganizationsCreateResponse;
      }),
      catchError((error) => {
        console.error('[OrganizationService] Error creating draft organization:', error);
        
        if (error?.message?.includes('Not Authorized') || error?.message?.includes('Unauthorized')) {
          throw new Error('You are not authorized to create organizations. Please ensure you are signed in and have the necessary permissions.');
        }
        
        throw new Error('Failed to create draft organization. Please try again later.');
      })
    );
  }

  /**
   * Create a new organization
   * @param input Organization creation data
   * @returns Observable<OrganizationsCreateResponse>
   */
  public createOrganization(input: Partial<OrganizationsCreateInput>): Observable<OrganizationsCreateResponse> {
    console.debug('[OrganizationService] Creating organization:', input);

    return from(this.checkAuthentication()).pipe(
      switchMap((authResult: AuthCheckResult) => {
        if (!authResult.isAuthenticated) {
          throw new Error(`Authentication required: ${authResult.error}`);
        }

        console.debug('[OrganizationService] User is authenticated, proceeding with organization creation');

        const now = new Date();

        // Build the create input with required fields
        const createInput: OrganizationsCreateInput = {
          organizationId: input.organizationId || '', // Will be generated by backend
          name: input.name || '',
          description: input.description || '',
          ownerId: input.ownerId || '', // Will be set by backend from authenticated user
          status: input.status || OrganizationStatus.Pending,
          createdAt: now,
          updatedAt: now,
          kmsKeyId: input.kmsKeyId || '',
          kmsKeyArn: input.kmsKeyArn || '',
          kmsAlias: input.kmsAlias || ''
        };

        // Convert Date fields to Unix timestamps for GraphQL AWSTimestamp
        const graphqlInput = toGraphQLInput(createInput as unknown as Record<string, unknown>);

        return from(
          this.mutate<{ OrganizationsCreate: OrganizationsGraphQLResponse }>(
            OrganizationsCreate,
            { input: graphqlInput },
            'userPool'
          )
        );
      }),
      map((response: GraphQLResult<{ OrganizationsCreate: OrganizationsGraphQLResponse }>) => {
        console.debug('[OrganizationService] Create organization response:', response);
        
        if (!response.data?.OrganizationsCreate) {
          throw new Error('No data in create organization response');
        }

        const items = response.data.OrganizationsCreate.items;
        const createdOrg = items.length > 0 ? new Organizations(items[0]) : null;

        return {
          StatusCode: 200,
          Message: 'Organization created successfully',
          Data: createdOrg
        } as OrganizationsCreateResponse;
      }),
      catchError((error) => {
        console.error('[OrganizationService] Error creating organization:', error);
        
        if (error?.message?.includes('Not Authorized') || error?.message?.includes('Unauthorized')) {
          throw new Error('You are not authorized to create organizations. Please ensure you are signed in and have the necessary permissions.');
        }
        
        if (error?.message?.includes('validation')) {
          throw new Error('Invalid organization data. Please check your input and try again.');
        }
        
        throw new Error('Failed to create organization. Please try again later.');
      })
    );
  }

  /**
   * Update an existing organization
   * @param input Organization update data
   * @returns Observable<OrganizationsUpdateResponse>
   */
  public updateOrganization(input: Partial<OrganizationsUpdateInput>): Observable<OrganizationsUpdateResponse> {
    console.debug('[OrganizationService] Updating organization:', input);

    if (!input.organizationId) {
      throw new Error('Organization ID is required for updates');
    }

    const updateInput: OrganizationsUpdateInput = {
      organizationId: input.organizationId,
      name: input.name || '',
      description: input.description || '',
      ownerId: input.ownerId || '',
      status: input.status || OrganizationStatus.Active,
      createdAt: input.createdAt ? new Date(input.createdAt) : undefined,
      updatedAt: new Date(),
      kmsKeyId: input.kmsKeyId || '',
      kmsKeyArn: input.kmsKeyArn || '',
      kmsAlias: input.kmsAlias || ''
    };

    // Convert Date fields to Unix timestamps for GraphQL AWSTimestamp
    const graphqlInput = toGraphQLInput(updateInput as unknown as Record<string, unknown>);

    return from(
      this.mutate<{ OrganizationsUpdate: OrganizationsGraphQLResponse }>(
        OrganizationsUpdate,
        { input: graphqlInput },
        'userPool'
      )
    ).pipe(
      map((response: GraphQLResult<{ OrganizationsUpdate: OrganizationsGraphQLResponse }>) => {
        console.debug('[OrganizationService] Update organization response:', response);
        
        if (!response.data?.OrganizationsUpdate) {
          throw new Error('No data in update organization response');
        }

        const items = response.data.OrganizationsUpdate.items;
        const updatedOrg = items.length > 0 ? new Organizations(items[0]) : null;

        return {
          StatusCode: 200,
          Message: 'Organization updated successfully',
          Data: updatedOrg
        } as OrganizationsUpdateResponse;
      }),
      catchError((error) => {
        console.error('[OrganizationService] Error updating organization:', error);
        
        if (error?.message?.includes('Not Authorized') || error?.message?.includes('Unauthorized')) {
          throw new Error('You are not authorized to update this organization.');
        }
        
        if (error?.message?.includes('not found')) {
          throw new Error('Organization not found. It may have been deleted.');
        }
        
        throw new Error('Failed to update organization. Please try again later.');
      })
    );
  }


  /**
   * Delete an organization
   * @param organizationId ID of organization to delete
   * @returns Observable<OrganizationsResponse>
   */
  public deleteOrganization(organizationId: string): Observable<OrganizationsResponse> {
    console.debug('[OrganizationService] Deleting organization:', organizationId);

    if (!organizationId) {
      throw new Error('Organization ID is required for deletion');
    }

    return from(
      this.mutate<{ OrganizationsDelete: OrganizationsGraphQLResponse }>(
        OrganizationsDelete,
        { input: { organizationId } },
        'userPool'
      )
    ).pipe(
      map((response: GraphQLResult<{ OrganizationsDelete: OrganizationsGraphQLResponse }>) => {
        console.debug('[OrganizationService] Delete organization response:', response);
        
        if (!response.data?.OrganizationsDelete) {
          throw new Error('No data in delete organization response');
        }

        const items = response.data.OrganizationsDelete.items;
        const deletedOrg = items.length > 0 ? new Organizations(items[0]) : null;

        return {
          StatusCode: 200,
          Message: 'Organization deleted successfully',
          Data: deletedOrg
        } as OrganizationsResponse;
      }),
      catchError((error) => {
        console.error('[OrganizationService] Error deleting organization:', error);
        
        if (error?.message?.includes('Not Authorized') || error?.message?.includes('Unauthorized')) {
          throw new Error('You are not authorized to delete this organization.');
        }
        
        if (error?.message?.includes('not found')) {
          throw new Error('Organization not found. It may have already been deleted.');
        }
        
        throw new Error('Failed to delete organization. Please try again later.');
      })
    );
  }

  /**
   * Get organizations for the current user (by ownerId)
   * @param ownerId The owner's user ID
   * @returns Observable<OrganizationsListResponse>
   */
  public getUserOrganizations(ownerId: string): Observable<OrganizationsListResponse> {
    console.debug('[OrganizationService] Getting user organizations for:', ownerId);

    if (!ownerId) {
      throw new Error('Owner ID is required');
    }

    return from(
      this.query<{ OrganizationsQueryByOwnerId: OrganizationsGraphQLResponse }>(
        OrganizationsQueryByOwnerId,
        { input: { ownerId } },
        'userPool'
      )
    ).pipe(
      map((response: GraphQLResult<{ OrganizationsQueryByOwnerId: OrganizationsGraphQLResponse }>) => {
        console.debug('[OrganizationService] Get user organizations response:', response);
        
        if (!response.data?.OrganizationsQueryByOwnerId) {
          throw new Error('No data in get organizations response');
        }

        const items = response.data.OrganizationsQueryByOwnerId.items;
        const organizations = items.map(org => new Organizations(org));

        return {
          StatusCode: 200,
          Message: 'Organizations retrieved successfully',
          Data: organizations
        } as OrganizationsListResponse;
      }),
      catchError((error) => {
        console.error('[OrganizationService] Error getting organizations:', error);
        
        if (error?.message?.includes('Not Authorized') || error?.message?.includes('Unauthorized')) {
          throw new Error('You are not authorized to view organizations.');
        }
        
        throw new Error('Failed to retrieve organizations. Please try again later.');
      })
    );
  }

  /**
   * Get a specific organization by ID
   * @param organizationId ID of organization to retrieve
   * @returns Observable<OrganizationsResponse>
   */
  public getOrganization(organizationId: string): Observable<OrganizationsResponse> {
    console.debug('[OrganizationService] Getting organization:', organizationId);

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return from(
      this.query<{ OrganizationsQueryByOrganizationId: OrganizationsGraphQLResponse }>(
        OrganizationsQueryByOrganizationId,
        { input: { organizationId } },
        'userPool'
      )
    ).pipe(
      map((response: GraphQLResult<{ OrganizationsQueryByOrganizationId: OrganizationsGraphQLResponse }>) => {
        console.debug('[OrganizationService] Get organization response:', response);
        
        if (!response.data?.OrganizationsQueryByOrganizationId) {
          throw new Error('No data in get organization response');
        }

        const items = response.data.OrganizationsQueryByOrganizationId.items;
        const organization = items.length > 0 ? new Organizations(items[0]) : null;

        return {
          StatusCode: 200,
          Message: 'Organization retrieved successfully',
          Data: organization
        } as OrganizationsResponse;
      }),
      catchError((error) => {
        console.error('[OrganizationService] Error getting organization:', error);
        
        if (error?.message?.includes('Not Authorized') || error?.message?.includes('Unauthorized')) {
          throw new Error('You are not authorized to view this organization.');
        }
        
        if (error?.message?.includes('not found')) {
          throw new Error('Organization not found.');
        }
        
        throw new Error('Failed to retrieve organization. Please try again later.');
      })
    );
  }
}
