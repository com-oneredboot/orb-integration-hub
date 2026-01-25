/**
 * Organization Service
 *
 * Provides CRUD operations for organization management.
 * Uses v0.19.0 response envelope format with ApiService base class methods.
 *
 * @see .kiro/specs/graphql-service-cleanup/design.md
 */

import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { ApiService } from './api.service';
import {
  OrganizationsCreate,
  OrganizationsUpdate,
  OrganizationsDelete,
  OrganizationsGet,
  OrganizationsListByOwnerId,
} from '../graphql/Organizations.graphql';
import {
  Organizations,
  OrganizationsCreateInput,
  OrganizationsUpdateInput,
  IOrganizations,
} from '../models/OrganizationsModel';
import { OrganizationStatus } from '../enums/OrganizationStatusEnum';
import { toGraphQLInput } from '../../graphql-utils';
import { Connection } from '../types/graphql.types';
import { isAuthenticationError } from '../errors/api-errors';

@Injectable({
  providedIn: 'root',
})
export class OrganizationService extends ApiService {
  constructor() {
    super();
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
   *
   * @param ownerId The user ID of the organization owner
   * @returns Observable<IOrganizations> The created organization
   *
   * _Requirements: 1.1, 7.1, 7.2, 7.3_
   */
  public createDraft(ownerId: string): Observable<IOrganizations> {
    console.debug('[OrganizationService] Creating draft organization for owner:', ownerId);

    if (!ownerId) {
      throw new Error('Owner ID is required to create an organization');
    }

    const now = new Date();
    const organizationId = this.generateUUID();

    console.debug('[OrganizationService] Generated organizationId:', organizationId);

    const createInput: OrganizationsCreateInput = {
      organizationId,
      name: 'New Organization',
      description: '',
      ownerId,
      status: OrganizationStatus.Pending,
      createdAt: now,
      updatedAt: now,
      kmsKeyId: '',
      kmsKeyArn: '',
      kmsAlias: '',
    };

    const graphqlInput = toGraphQLInput(createInput as unknown as Record<string, unknown>);

    return from(
      this.executeMutation<IOrganizations>(OrganizationsCreate, { input: graphqlInput }, 'userPool')
    ).pipe(
      map((item) => {
        console.debug('[OrganizationService] Draft organization created:', item);
        return new Organizations(item);
      }),
      catchError((error) => {
        console.error('[OrganizationService] Error creating draft organization:', error);
        if (isAuthenticationError(error)) {
          throw new Error(
            'You are not authorized to create organizations. Please ensure you are signed in.'
          );
        }
        throw new Error('Failed to create draft organization. Please try again later.');
      })
    );
  }

  /**
   * Create a new organization
   *
   * @param input Organization creation data
   * @returns Observable<IOrganizations> The created organization
   *
   * _Requirements: 1.1, 7.1_
   */
  public createOrganization(input: Partial<OrganizationsCreateInput>): Observable<IOrganizations> {
    console.debug('[OrganizationService] Creating organization:', input);

    const now = new Date();
    const createInput: OrganizationsCreateInput = {
      organizationId: input.organizationId || this.generateUUID(),
      name: input.name || '',
      description: input.description || '',
      ownerId: input.ownerId || '',
      status: input.status || OrganizationStatus.Pending,
      createdAt: now,
      updatedAt: now,
      kmsKeyId: input.kmsKeyId || '',
      kmsKeyArn: input.kmsKeyArn || '',
      kmsAlias: input.kmsAlias || '',
    };

    const graphqlInput = toGraphQLInput(createInput as unknown as Record<string, unknown>);

    return from(
      this.executeMutation<IOrganizations>(OrganizationsCreate, { input: graphqlInput }, 'userPool')
    ).pipe(
      map((item) => {
        console.debug('[OrganizationService] Organization created:', item);
        return new Organizations(item);
      }),
      catchError((error) => {
        console.error('[OrganizationService] Error creating organization:', error);
        if (isAuthenticationError(error)) {
          throw new Error(
            'You are not authorized to create organizations. Please ensure you are signed in.'
          );
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
   *
   * @param input Organization update data
   * @returns Observable<IOrganizations> The updated organization
   *
   * _Requirements: 1.2, 7.1_
   */
  public updateOrganization(input: Partial<OrganizationsUpdateInput>): Observable<IOrganizations> {
    console.debug('[OrganizationService] Updating organization:', input);

    if (!input.organizationId) {
      throw new Error('Organization ID is required for updates');
    }

    const updateInput: OrganizationsUpdateInput = {
      organizationId: input.organizationId,
      name: input.name,
      description: input.description,
      ownerId: input.ownerId,
      status: input.status,
      createdAt: input.createdAt ? new Date(input.createdAt) : undefined,
      updatedAt: new Date(),
      kmsKeyId: input.kmsKeyId,
      kmsKeyArn: input.kmsKeyArn,
      kmsAlias: input.kmsAlias,
    };

    const graphqlInput = toGraphQLInput(updateInput as unknown as Record<string, unknown>);

    return from(
      this.executeMutation<IOrganizations>(OrganizationsUpdate, { input: graphqlInput }, 'userPool')
    ).pipe(
      map((item) => {
        console.debug('[OrganizationService] Organization updated:', item);
        return new Organizations(item);
      }),
      catchError((error) => {
        console.error('[OrganizationService] Error updating organization:', error);
        if (isAuthenticationError(error)) {
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
   *
   * @param organizationId ID of organization to delete
   * @returns Observable<IOrganizations> The deleted organization
   *
   * _Requirements: 1.3, 7.1_
   */
  public deleteOrganization(organizationId: string): Observable<IOrganizations> {
    console.debug('[OrganizationService] Deleting organization:', organizationId);

    if (!organizationId) {
      throw new Error('Organization ID is required for deletion');
    }

    return from(
      this.executeMutation<IOrganizations>(
        OrganizationsDelete,
        { input: { organizationId } },
        'userPool'
      )
    ).pipe(
      map((item) => {
        console.debug('[OrganizationService] Organization deleted:', item);
        return new Organizations(item);
      }),
      catchError((error) => {
        console.error('[OrganizationService] Error deleting organization:', error);
        if (isAuthenticationError(error)) {
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
   *
   * @param ownerId The owner's user ID
   * @param limit Optional limit for pagination
   * @param nextToken Optional token for pagination
   * @returns Observable<Connection<IOrganizations>> Paginated list of organizations
   *
   * _Requirements: 2.2, 7.1_
   */
  public getUserOrganizations(
    ownerId: string,
    limit?: number,
    nextToken?: string
  ): Observable<Connection<IOrganizations>> {
    console.debug('[OrganizationService] Getting user organizations for:', ownerId);

    if (!ownerId) {
      throw new Error('Owner ID is required');
    }

    return from(
      this.executeListQuery<IOrganizations>(
        OrganizationsListByOwnerId,
        { input: { ownerId, limit, nextToken } },
        'userPool'
      )
    ).pipe(
      map((connection) => {
        console.debug('[OrganizationService] User organizations retrieved:', connection.items.length);
        return {
          items: connection.items.map((item) => new Organizations(item)),
          nextToken: connection.nextToken,
        };
      }),
      catchError((error) => {
        console.error('[OrganizationService] Error getting organizations:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to view organizations.');
        }
        throw new Error('Failed to retrieve organizations. Please try again later.');
      })
    );
  }

  /**
   * Get a specific organization by ID
   *
   * @param organizationId ID of organization to retrieve
   * @returns Observable<IOrganizations | null> The organization or null if not found
   *
   * _Requirements: 2.1, 7.1_
   */
  public getOrganization(organizationId: string): Observable<IOrganizations | null> {
    console.debug('[OrganizationService] Getting organization:', organizationId);

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return from(
      this.executeGetQuery<IOrganizations>(
        OrganizationsGet,
        { input: { organizationId } },
        'userPool'
      )
    ).pipe(
      map((item) => {
        console.debug('[OrganizationService] Organization retrieved:', item);
        return item ? new Organizations(item) : null;
      }),
      catchError((error) => {
        console.error('[OrganizationService] Error getting organization:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to view this organization.');
        }
        throw new Error('Failed to retrieve organization. Please try again later.');
      })
    );
  }
}
