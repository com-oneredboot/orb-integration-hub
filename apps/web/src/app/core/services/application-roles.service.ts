/**
 * Application Roles Service
 *
 * Provides operations for application role management.
 * Uses v0.19.0 response envelope format with ApiService base class methods.
 *
 * @see .kiro/specs/application-roles-management/design.md
 * _Requirements: 9.1, 9.2, 9.3, 9.4_
 */

import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { ApiService } from './api.service';
import {
  ApplicationRolesCreate,
  ApplicationRolesUpdate,
  ApplicationRolesDelete,
  ApplicationRolesDisable,
  ApplicationRolesListByApplicationId,
} from '../graphql/ApplicationRoles.graphql';
import {
  ApplicationRoles,
  ApplicationRolesCreateInput,
  ApplicationRolesUpdateInput,
  IApplicationRoles,
} from '../models/ApplicationRolesModel';
import { ApplicationRoleStatus } from '../enums/ApplicationRoleStatusEnum';
import { ApplicationRoleType } from '../enums/ApplicationRoleTypeEnum';
import { toGraphQLInput } from '../../graphql-utils';
import { Connection } from '../types/graphql.types';
import { isAuthenticationError } from '../errors/api-errors';

/**
 * Input for creating a new application role
 */
export interface CreateRoleInput {
  applicationId: string;
  organizationId: string;
  roleName: string;
  roleType: ApplicationRoleType;
  description?: string;
}

/**
 * Input for updating an application role
 */
export interface UpdateRoleInput {
  applicationRoleId: string;
  roleName?: string;
  roleType?: ApplicationRoleType;
  description?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ApplicationRolesService extends ApiService {
  constructor() {
    super();
  }

  /**
   * Generate a UUID v4 for client-side ID generation
   * _Requirements: 9.3_
   */
  private generateUUID(): string {
    return crypto.randomUUID();
  }

  // ============================================================================
  // Application Role Operations
  // ============================================================================

  /**
   * List all roles for an application
   *
   * @param applicationId The application ID
   * @param limit Optional limit for pagination
   * @param nextToken Optional token for pagination
   * @returns Observable<Connection<IApplicationRoles>> Paginated list of roles
   *
   * _Requirements: 9.4_
   */
  public listByApplicationId(
    applicationId: string,
    limit?: number,
    nextToken?: string
  ): Observable<Connection<IApplicationRoles>> {
    console.debug('[ApplicationRolesService] Listing roles for application:', applicationId);

    if (!applicationId) {
      throw new Error('Application ID is required');
    }

    return from(
      this.executeListQuery<IApplicationRoles>(
        ApplicationRolesListByApplicationId,
        { input: { applicationId, limit, nextToken } },
        'userPool'
      )
    ).pipe(
      map((connection) => {
        console.debug('[ApplicationRolesService] Roles retrieved:', connection.items.length);
        return {
          items: connection.items.map((item) => new ApplicationRoles(item)),
          nextToken: connection.nextToken,
        };
      }),
      catchError((error) => {
        console.error('[ApplicationRolesService] Error listing roles:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to view roles.');
        }
        throw new Error('Failed to retrieve roles. Please try again later.');
      })
    );
  }

  /**
   * Create a new application role
   *
   * @param input The role creation input
   * @returns Observable<IApplicationRoles> The created role
   *
   * _Requirements: 9.1, 9.3_
   */
  public create(input: CreateRoleInput): Observable<IApplicationRoles> {
    console.debug('[ApplicationRolesService] Creating role:', input);

    if (!input.applicationId) {
      throw new Error('Application ID is required');
    }
    if (!input.roleName) {
      throw new Error('Role name is required');
    }
    if (!input.roleType) {
      throw new Error('Role type is required');
    }

    const now = new Date();
    const applicationRoleId = this.generateUUID();
    const roleId = this.generateUUID();

    const createInput: ApplicationRolesCreateInput = {
      applicationRoleId,
      applicationId: input.applicationId,
      roleId,
      roleName: input.roleName,
      roleType: input.roleType,
      description: input.description,
      status: ApplicationRoleStatus.Active,
      createdAt: now,
      updatedAt: now,
    };

    const graphqlInput = toGraphQLInput(createInput as unknown as Record<string, unknown>);

    return from(
      this.executeMutation<IApplicationRoles>(
        ApplicationRolesCreate,
        { input: graphqlInput },
        'userPool'
      )
    ).pipe(
      map((item) => {
        console.debug('[ApplicationRolesService] Role created:', item);
        return new ApplicationRoles(item);
      }),
      catchError((error) => {
        console.error('[ApplicationRolesService] Error creating role:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to create roles.');
        }
        if (error?.message?.includes('already exists')) {
          throw new Error('A role with this name already exists.');
        }
        throw new Error('Failed to create role. Please try again later.');
      })
    );
  }

  /**
   * Update an existing application role
   *
   * @param input The role update input
   * @returns Observable<IApplicationRoles> The updated role
   *
   * _Requirements: 9.2_
   */
  public update(input: UpdateRoleInput): Observable<IApplicationRoles> {
    console.debug('[ApplicationRolesService] Updating role:', input);

    if (!input.applicationRoleId) {
      throw new Error('Application role ID is required');
    }

    const updateInput: ApplicationRolesUpdateInput = {
      applicationRoleId: input.applicationRoleId,
      roleName: input.roleName,
      roleType: input.roleType,
      description: input.description,
      updatedAt: new Date(),
    };

    const graphqlInput = toGraphQLInput(updateInput as unknown as Record<string, unknown>);

    return from(
      this.executeMutation<IApplicationRoles>(
        ApplicationRolesUpdate,
        { input: graphqlInput },
        'userPool'
      )
    ).pipe(
      map((item) => {
        console.debug('[ApplicationRolesService] Role updated:', item);
        return new ApplicationRoles(item);
      }),
      catchError((error) => {
        console.error('[ApplicationRolesService] Error updating role:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to update roles.');
        }
        if (error?.message?.includes('not found')) {
          throw new Error('Role not found. It may have been deleted.');
        }
        throw new Error('Failed to update role. Please try again later.');
      })
    );
  }

  /**
   * Disable (deactivate) an application role
   *
   * @param applicationRoleId The role ID to disable
   * @returns Observable<IApplicationRoles> The disabled role
   *
   * _Requirements: 9.2_
   */
  public disable(applicationRoleId: string): Observable<IApplicationRoles> {
    console.debug('[ApplicationRolesService] Disabling role:', applicationRoleId);

    if (!applicationRoleId) {
      throw new Error('Application role ID is required');
    }

    return from(
      this.executeMutation<IApplicationRoles>(
        ApplicationRolesDisable,
        { input: { applicationRoleId } },
        'userPool'
      )
    ).pipe(
      map((item) => {
        console.debug('[ApplicationRolesService] Role disabled:', item);
        return new ApplicationRoles(item);
      }),
      catchError((error) => {
        console.error('[ApplicationRolesService] Error disabling role:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to disable roles.');
        }
        if (error?.message?.includes('not found')) {
          throw new Error('Role not found. It may have been deleted.');
        }
        throw new Error('Failed to disable role. Please try again later.');
      })
    );
  }

  /**
   * Delete an application role
   *
   * @param applicationRoleId The role ID to delete
   * @returns Observable<IApplicationRoles> The deleted role
   *
   * _Requirements: 9.2_
   */
  public delete(applicationRoleId: string): Observable<IApplicationRoles> {
    console.debug('[ApplicationRolesService] Deleting role:', applicationRoleId);

    if (!applicationRoleId) {
      throw new Error('Application role ID is required');
    }

    return from(
      this.executeMutation<IApplicationRoles>(
        ApplicationRolesDelete,
        { input: { applicationRoleId } },
        'userPool'
      )
    ).pipe(
      map((item) => {
        console.debug('[ApplicationRolesService] Role deleted:', item);
        return new ApplicationRoles(item);
      }),
      catchError((error) => {
        console.error('[ApplicationRolesService] Error deleting role:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to delete roles.');
        }
        if (error?.message?.includes('not found')) {
          throw new Error('Role not found. It may have already been deleted.');
        }
        throw new Error('Failed to delete role. Please try again later.');
      })
    );
  }
}
