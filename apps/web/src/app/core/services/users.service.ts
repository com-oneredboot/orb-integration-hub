/**
 * Users Service
 *
 * Provides query operations for users list management.
 * Queries both Users and ApplicationUsers tables to get users assigned to applications.
 *
 * @see .kiro/specs/application-users-list/design.md
 */

import { Injectable } from '@angular/core';
import { Observable, from, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { ApiService } from './api.service';
import { UsersListByUserId } from '../graphql/Users.graphql';
import { ApplicationUsersListByUserId } from '../graphql/ApplicationUsers.graphql';
import { IUsers, Users } from '../models/UsersModel';
import { IApplicationUsers, ApplicationUsers } from '../models/ApplicationUsersModel';
import { Connection } from '../types/graphql.types';
import { isAuthenticationError } from '../errors/api-errors';

@Injectable({
  providedIn: 'root',
})
export class UsersService extends ApiService {
  constructor() {
    super();
  }

  /**
   * Get application users for an organization
   * 
   * This method queries both Users and ApplicationUsers tables to get:
   * 1. All users in the organization
   * 2. Their application assignments
   * 
   * The component will use this data to:
   * - Build UserTableRow objects with application counts
   * - Filter out users with only REMOVED status
   * - Display users assigned to applications
   *
   * @param organizationId The organization ID (currently unused - will be used when OrganizationUsers table exists)
   * @returns Observable with users array and applicationUserRecords array
   *
   * _Requirements: 2.1, 2.2_
   */
  public getApplicationUsers(organizationId: string): Observable<{
    users: IUsers[];
    applicationUserRecords: IApplicationUsers[];
  }> {
    console.debug('[UsersService] Getting application users for organization:', organizationId);

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    // TODO: Once OrganizationUsers table exists, query it to get userIds for this organization
    // For now, we'll need to get all users and filter client-side
    // This is a temporary limitation until the OrganizationUsers join table is implemented
    
    // For MVP, we'll return empty arrays since we don't have a way to query users by organization yet
    // The proper implementation will be:
    // 1. Query OrganizationUsers by organizationId to get userIds
    // 2. Query Users for each userId
    // 3. Query ApplicationUsers for each userId
    // 4. Return combined results
    
    console.warn('[UsersService] OrganizationUsers table not yet implemented - returning empty results');
    console.warn('[UsersService] Proper implementation requires querying OrganizationUsers by organizationId');
    
    return from(Promise.resolve({
      users: [],
      applicationUserRecords: []
    })).pipe(
      catchError((error) => {
        console.error('[UsersService] Error getting application users:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to view users.');
        }
        throw new Error('Failed to retrieve users. Please try again later.');
      })
    );
  }

  /**
   * Get a specific user by ID
   *
   * @param userId ID of user to retrieve
   * @returns Observable<IUsers | null> The user or null if not found
   */
  public getUser(userId: string): Observable<IUsers | null> {
    console.debug('[UsersService] Getting user:', userId);

    if (!userId) {
      throw new Error('User ID is required');
    }

    return from(
      this.executeListQuery<IUsers>(
        UsersListByUserId,
        { input: { userId } },
        'userPool'
      )
    ).pipe(
      map((connection) => {
        console.debug('[UsersService] User retrieved:', connection.items.length);
        if (connection.items.length === 0) {
          return null;
        }
        return new Users(connection.items[0]);
      }),
      catchError((error) => {
        console.error('[UsersService] Error getting user:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to view this user.');
        }
        throw new Error('Failed to retrieve user. Please try again later.');
      })
    );
  }

  /**
   * Get application assignments for a user
   *
   * @param userId ID of user to get assignments for
   * @returns Observable<Connection<IApplicationUsers>> List of application assignments
   */
  public getUserApplications(userId: string): Observable<Connection<IApplicationUsers>> {
    console.debug('[UsersService] Getting applications for user:', userId);

    if (!userId) {
      throw new Error('User ID is required');
    }

    return from(
      this.executeListQuery<IApplicationUsers>(
        ApplicationUsersListByUserId,
        { input: { userId } },
        'userPool'
      )
    ).pipe(
      map((connection) => {
        console.debug('[UsersService] User applications retrieved:', connection.items.length);
        return {
          items: connection.items.map((item) => new ApplicationUsers(item)),
          nextToken: connection.nextToken,
        };
      }),
      catchError((error) => {
        console.error('[UsersService] Error getting user applications:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to view user applications.');
        }
        throw new Error('Failed to retrieve user applications. Please try again later.');
      })
    );
  }
}
