/**
 * Application Users Service
 *
 * Provides operations for managing users assigned to applications.
 * Uses the GetApplicationUsers Lambda-backed query for retrieving users with role assignments.
 */

import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { ApiService } from './api.service';
import {
  GetApplicationUsers,
  GetApplicationUsersInput,
  GetApplicationUsersResponse,
  UserWithRoles
} from '../graphql/GetApplicationUsers.graphql';
import {
  ApplicationUsersCreate,
  ApplicationUsersDelete
} from '../graphql/ApplicationUsers.graphql';
import {
  ApplicationUsersCreateInput,
  IApplicationUsers
} from '../models/ApplicationUsersModel';
import { ApplicationUserStatus } from '../enums/ApplicationUserStatusEnum';
import { toGraphQLInput } from '../../graphql-utils';
import { isAuthenticationError } from '../errors/api-errors';

@Injectable({
  providedIn: 'root',
})
export class ApplicationUsersService extends ApiService {
  constructor() {
    super();
  }

  /**
   * Generate a UUID v4 for client-side ID generation
   */
  private generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Get all users assigned to an application with their role assignments
   *
   * @param applicationId The application ID
   * @returns Observable<UserWithRoles[]> Array of users with their role assignments
   */
  public getApplicationUsers(applicationId: string): Observable<UserWithRoles[]> {
    console.debug('[ApplicationUsersService] Getting users for application:', applicationId);

    const input: GetApplicationUsersInput = {
      applicationIds: [applicationId]
    };

    return from(
      this.executeGetQuery<GetApplicationUsersResponse>(GetApplicationUsers, { input }, 'userPool')
    ).pipe(
      map((response) => {
        if (!response) {
          console.warn('[ApplicationUsersService] No response received');
          return [];
        }
        console.debug('[ApplicationUsersService] Users retrieved:', response.GetApplicationUsers.users);
        return response.GetApplicationUsers.users;
      }),
      catchError((error) => {
        console.error('[ApplicationUsersService] Error getting application users:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to view application users. Please ensure you are signed in.');
        }
        throw error;
      })
    );
  }

  /**
   * Assign a user to an application
   *
   * @param applicationId The application ID
   * @param userId The user ID
   * @returns Observable<IApplicationUsers> The created application user record
   */
  public assignUserToApplication(
    applicationId: string,
    userId: string
  ): Observable<IApplicationUsers> {
    console.debug('[ApplicationUsersService] Assigning user to application:', { applicationId, userId });

    const now = new Date();
    const applicationUserId = this.generateUUID();

    const createInput: ApplicationUsersCreateInput = {
      applicationUserId,
      userId,
      applicationId,
      status: ApplicationUserStatus.Active,
      createdAt: now,
      updatedAt: now
    };

    const graphqlInput = toGraphQLInput(createInput as unknown as Record<string, unknown>);

    return from(
      this.executeMutation<IApplicationUsers>(ApplicationUsersCreate, { input: graphqlInput }, 'userPool')
    ).pipe(
      map((item) => {
        console.debug('[ApplicationUsersService] User assigned:', item);
        return item;
      }),
      catchError((error) => {
        console.error('[ApplicationUsersService] Error assigning user:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to assign users. Please ensure you are signed in.');
        }
        throw error;
      })
    );
  }

  /**
   * Unassign a user from an application
   *
   * @param applicationUserId The application user ID
   * @returns Observable<IApplicationUsers> The deleted application user record
   */
  public unassignUserFromApplication(applicationUserId: string): Observable<IApplicationUsers> {
    console.debug('[ApplicationUsersService] Unassigning user from application:', applicationUserId);

    return from(
      this.executeMutation<IApplicationUsers>(
        ApplicationUsersDelete,
        { input: { applicationUserId } },
        'userPool'
      )
    ).pipe(
      map((item) => {
        console.debug('[ApplicationUsersService] User unassigned:', item);
        return item;
      }),
      catchError((error) => {
        console.error('[ApplicationUsersService] Error unassigning user:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to unassign users. Please ensure you are signed in.');
        }
        throw error;
      })
    );
  }
}
