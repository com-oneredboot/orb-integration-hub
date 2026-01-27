/**
 * Application Service
 *
 * Provides CRUD operations for application management.
 * Uses v0.19.0 response envelope format with ApiService base class methods.
 *
 * @see .kiro/specs/applications-management/design.md
 */

import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { ApiService } from './api.service';
import {
  ApplicationsCreate,
  ApplicationsUpdate,
  ApplicationsDelete,
  ApplicationsGet,
  ApplicationsListByOrganizationId,
} from '../graphql/Applications.graphql';
import {
  Applications,
  ApplicationsCreateInput,
  ApplicationsUpdateInput,
  IApplications,
} from '../models/ApplicationsModel';
import { ApplicationStatus } from '../enums/ApplicationStatusEnum';
import { toGraphQLInput } from '../../graphql-utils';
import { Connection } from '../types/graphql.types';
import { isAuthenticationError } from '../errors/api-errors';

@Injectable({
  providedIn: 'root',
})
export class ApplicationService extends ApiService {
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
   * Create a draft application (create-on-click pattern)
   * Creates a new application with PENDING status and minimal default values.
   * The user will then be navigated to the detail page to complete the setup.
   *
   * @param ownerId The user ID of the application owner
   * @param organizationId The organization ID (optional, can be set later)
   * @returns Observable<IApplications> The created application
   *
   * _Requirements: 1.1, 1.2_
   */
  public createDraft(ownerId: string, organizationId = ''): Observable<IApplications> {
    console.debug('[ApplicationService] Creating draft application for owner:', ownerId);

    if (!ownerId) {
      throw new Error('Owner ID is required to create an application');
    }

    const now = new Date();
    const applicationId = this.generateUUID();

    console.debug('[ApplicationService] Generated applicationId:', applicationId);

    const createInput: ApplicationsCreateInput = {
      applicationId,
      name: 'New Application',
      organizationId,
      ownerId,
      status: ApplicationStatus.Pending,
      createdAt: now,
      updatedAt: now,
      apiKey: '',
      apiKeyNext: '',
      environments: [],
    };

    const graphqlInput = toGraphQLInput(createInput as unknown as Record<string, unknown>);

    return from(
      this.executeMutation<IApplications>(ApplicationsCreate, { input: graphqlInput }, 'userPool')
    ).pipe(
      map((item) => {
        console.debug('[ApplicationService] Draft application created:', item);
        return new Applications(item);
      }),
      catchError((error) => {
        console.error('[ApplicationService] Error creating draft application:', error);
        if (isAuthenticationError(error)) {
          throw new Error(
            'You are not authorized to create applications. Please ensure you are signed in.'
          );
        }
        throw new Error('Failed to create draft application. Please try again later.');
      })
    );
  }

  /**
   * Create a new application
   *
   * @param input Application creation data
   * @returns Observable<IApplications> The created application
   *
   * _Requirements: 1.3_
   */
  public createApplication(input: Partial<ApplicationsCreateInput>): Observable<IApplications> {
    console.debug('[ApplicationService] Creating application:', input);

    const now = new Date();
    const createInput: ApplicationsCreateInput = {
      applicationId: input.applicationId || this.generateUUID(),
      name: input.name || '',
      organizationId: input.organizationId || '',
      ownerId: input.ownerId || '',
      status: input.status || ApplicationStatus.Pending,
      createdAt: now,
      updatedAt: now,
      apiKey: input.apiKey || '',
      apiKeyNext: input.apiKeyNext || '',
      environments: input.environments || [],
    };

    const graphqlInput = toGraphQLInput(createInput as unknown as Record<string, unknown>);

    return from(
      this.executeMutation<IApplications>(ApplicationsCreate, { input: graphqlInput }, 'userPool')
    ).pipe(
      map((item) => {
        console.debug('[ApplicationService] Application created:', item);
        return new Applications(item);
      }),
      catchError((error) => {
        console.error('[ApplicationService] Error creating application:', error);
        if (isAuthenticationError(error)) {
          throw new Error(
            'You are not authorized to create applications. Please ensure you are signed in.'
          );
        }
        if (error?.message?.includes('validation')) {
          throw new Error('Invalid application data. Please check your input and try again.');
        }
        throw new Error('Failed to create application. Please try again later.');
      })
    );
  }

  /**
   * Update an existing application
   *
   * @param input Application update data
   * @returns Observable<IApplications> The updated application
   *
   * _Requirements: 1.4_
   */
  public updateApplication(input: Partial<ApplicationsUpdateInput>): Observable<IApplications> {
    console.debug('[ApplicationService] Updating application:', input);

    if (!input.applicationId) {
      throw new Error('Application ID is required for updates');
    }

    const updateInput: ApplicationsUpdateInput = {
      applicationId: input.applicationId,
      name: input.name,
      organizationId: input.organizationId,
      ownerId: input.ownerId,
      status: input.status,
      createdAt: input.createdAt ? new Date(input.createdAt) : undefined,
      updatedAt: new Date(),
      apiKey: input.apiKey,
      apiKeyNext: input.apiKeyNext,
      environments: input.environments,
    };

    const graphqlInput = toGraphQLInput(updateInput as unknown as Record<string, unknown>);

    return from(
      this.executeMutation<IApplications>(ApplicationsUpdate, { input: graphqlInput }, 'userPool')
    ).pipe(
      map((item) => {
        console.debug('[ApplicationService] Application updated:', item);
        return new Applications(item);
      }),
      catchError((error) => {
        console.error('[ApplicationService] Error updating application:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to update this application.');
        }
        if (error?.message?.includes('not found')) {
          throw new Error('Application not found. It may have been deleted.');
        }
        throw new Error('Failed to update application. Please try again later.');
      })
    );
  }

  /**
   * Delete an application
   *
   * @param applicationId ID of application to delete
   * @returns Observable<IApplications> The deleted application
   *
   * _Requirements: 1.5_
   */
  public deleteApplication(applicationId: string): Observable<IApplications> {
    console.debug('[ApplicationService] Deleting application:', applicationId);

    if (!applicationId) {
      throw new Error('Application ID is required for deletion');
    }

    return from(
      this.executeMutation<IApplications>(
        ApplicationsDelete,
        { input: { applicationId } },
        'userPool'
      )
    ).pipe(
      map((item) => {
        console.debug('[ApplicationService] Application deleted:', item);
        return new Applications(item);
      }),
      catchError((error) => {
        console.error('[ApplicationService] Error deleting application:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to delete this application.');
        }
        if (error?.message?.includes('not found')) {
          throw new Error('Application not found. It may have already been deleted.');
        }
        throw new Error('Failed to delete application. Please try again later.');
      })
    );
  }

  /**
   * Get applications for an organization
   *
   * @param organizationId The organization ID
   * @param limit Optional limit for pagination
   * @param nextToken Optional token for pagination
   * @returns Observable<Connection<IApplications>> Paginated list of applications
   *
   * _Requirements: 1.6_
   */
  public getApplicationsByOrganization(
    organizationId: string,
    limit?: number,
    nextToken?: string
  ): Observable<Connection<IApplications>> {
    console.debug('[ApplicationService] Getting applications for organization:', organizationId);

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return from(
      this.executeListQuery<IApplications>(
        ApplicationsListByOrganizationId,
        { input: { organizationId, limit, nextToken } },
        'userPool'
      )
    ).pipe(
      map((connection) => {
        console.debug('[ApplicationService] Applications retrieved:', connection.items.length);
        return {
          items: connection.items.map((item) => new Applications(item)),
          nextToken: connection.nextToken,
        };
      }),
      catchError((error) => {
        console.error('[ApplicationService] Error getting applications:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to view applications.');
        }
        throw new Error('Failed to retrieve applications. Please try again later.');
      })
    );
  }

  /**
   * Get a specific application by ID
   *
   * @param applicationId ID of application to retrieve
   * @returns Observable<IApplications | null> The application or null if not found
   *
   * _Requirements: 1.7_
   */
  public getApplication(applicationId: string): Observable<IApplications | null> {
    console.debug('[ApplicationService] Getting application:', applicationId);

    if (!applicationId) {
      throw new Error('Application ID is required');
    }

    return from(
      this.executeGetQuery<IApplications>(
        ApplicationsGet,
        { input: { applicationId } },
        'userPool'
      )
    ).pipe(
      map((item) => {
        console.debug('[ApplicationService] Application retrieved:', item);
        return item ? new Applications(item) : null;
      }),
      catchError((error) => {
        console.error('[ApplicationService] Error getting application:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to view this application.');
        }
        throw new Error('Failed to retrieve application. Please try again later.');
      })
    );
  }
}
