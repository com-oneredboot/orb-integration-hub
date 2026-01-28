/**
 * Group Service
 *
 * Provides CRUD operations for application group management.
 * Uses v0.19.0 response envelope format with ApiService base class methods.
 *
 * @see .kiro/specs/application-access-management/design.md
 * _Requirements: 8.1, 8.3_
 */

import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { ApiService } from './api.service';
import {
  ApplicationGroupsCreate,
  ApplicationGroupsUpdate,
  ApplicationGroupsDelete,
  ApplicationGroupsGet,
  ApplicationGroupsListByApplicationId,
} from '../graphql/ApplicationGroups.graphql';
import {
  ApplicationGroupUsersCreate,
  ApplicationGroupUsersDelete,
  ApplicationGroupUsersListByApplicationGroupId,
} from '../graphql/ApplicationGroupUsers.graphql';
import {
  ApplicationGroupRolesCreate,
  ApplicationGroupRolesDelete,
  ApplicationGroupRolesListByApplicationGroupId,
} from '../graphql/ApplicationGroupRoles.graphql';
import {
  ApplicationGroups,
  ApplicationGroupsCreateInput,
  ApplicationGroupsUpdateInput,
  IApplicationGroups,
} from '../models/ApplicationGroupsModel';
import {
  ApplicationGroupUsers,
  ApplicationGroupUsersCreateInput,
  IApplicationGroupUsers,
} from '../models/ApplicationGroupUsersModel';
import {
  ApplicationGroupRoles,
  ApplicationGroupRolesCreateInput,
  IApplicationGroupRoles,
} from '../models/ApplicationGroupRolesModel';
import { ApplicationGroupStatus } from '../enums/ApplicationGroupStatusEnum';
import { ApplicationGroupUserStatus } from '../enums/ApplicationGroupUserStatusEnum';
import { ApplicationGroupRoleStatus } from '../enums/ApplicationGroupRoleStatusEnum';
import { toGraphQLInput } from '../../graphql-utils';
import { Connection } from '../types/graphql.types';
import { isAuthenticationError } from '../errors/api-errors';

@Injectable({
  providedIn: 'root',
})
export class GroupService extends ApiService {
  constructor() {
    super();
  }

  /**
   * Generate a UUID v4 for client-side ID generation
   */
  private generateUUID(): string {
    return crypto.randomUUID();
  }


  // ============================================================================
  // Group CRUD Operations
  // ============================================================================

  /**
   * Get all groups for an application
   *
   * @param applicationId The application ID
   * @param limit Optional limit for pagination
   * @param nextToken Optional token for pagination
   * @returns Observable<Connection<IApplicationGroups>> Paginated list of groups
   *
   * _Requirements: 8.1_
   */
  public getGroupsByApplication(
    applicationId: string,
    limit?: number,
    nextToken?: string
  ): Observable<Connection<IApplicationGroups>> {
    console.debug('[GroupService] Getting groups for application:', applicationId);

    if (!applicationId) {
      throw new Error('Application ID is required');
    }

    return from(
      this.executeListQuery<IApplicationGroups>(
        ApplicationGroupsListByApplicationId,
        { input: { applicationId, limit, nextToken } },
        'userPool'
      )
    ).pipe(
      map((connection) => {
        console.debug('[GroupService] Groups retrieved:', connection.items.length);
        return {
          items: connection.items.map((item) => new ApplicationGroups(item)),
          nextToken: connection.nextToken,
        };
      }),
      catchError((error) => {
        console.error('[GroupService] Error getting groups:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to view groups.');
        }
        throw new Error('Failed to retrieve groups. Please try again later.');
      })
    );
  }

  /**
   * Get a specific group by ID
   *
   * @param groupId ID of group to retrieve
   * @returns Observable<IApplicationGroups | null> The group or null if not found
   *
   * _Requirements: 8.1_
   */
  public getGroup(groupId: string): Observable<IApplicationGroups | null> {
    console.debug('[GroupService] Getting group:', groupId);

    if (!groupId) {
      throw new Error('Group ID is required');
    }

    return from(
      this.executeGetQuery<IApplicationGroups>(
        ApplicationGroupsGet,
        { input: { applicationGroupId: groupId } },
        'userPool'
      )
    ).pipe(
      map((item) => {
        console.debug('[GroupService] Group retrieved:', item);
        return item ? new ApplicationGroups(item) : null;
      }),
      catchError((error) => {
        console.error('[GroupService] Error getting group:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to view this group.');
        }
        throw new Error('Failed to retrieve group. Please try again later.');
      })
    );
  }

  /**
   * Create a new group
   *
   * @param input Group creation data
   * @returns Observable<IApplicationGroups> The created group
   *
   * _Requirements: 8.1_
   */
  public createGroup(input: Partial<ApplicationGroupsCreateInput>): Observable<IApplicationGroups> {
    console.debug('[GroupService] Creating group:', input);

    if (!input.applicationId) {
      throw new Error('Application ID is required to create a group');
    }

    const now = new Date();
    const createInput: ApplicationGroupsCreateInput = {
      applicationGroupId: input.applicationGroupId || this.generateUUID(),
      applicationId: input.applicationId,
      name: input.name || '',
      description: input.description || '',
      status: input.status || ApplicationGroupStatus.Active,
      memberCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    const graphqlInput = toGraphQLInput(createInput as unknown as Record<string, unknown>);

    return from(
      this.executeMutation<IApplicationGroups>(
        ApplicationGroupsCreate,
        { input: graphqlInput },
        'userPool'
      )
    ).pipe(
      map((item) => {
        console.debug('[GroupService] Group created:', item);
        return new ApplicationGroups(item);
      }),
      catchError((error) => {
        console.error('[GroupService] Error creating group:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to create groups.');
        }
        if (error?.message?.includes('already exists')) {
          throw new Error('A group with this name already exists in this application.');
        }
        throw new Error('Failed to create group. Please try again later.');
      })
    );
  }


  /**
   * Update an existing group
   *
   * @param input Group update data
   * @returns Observable<IApplicationGroups> The updated group
   *
   * _Requirements: 8.1_
   */
  public updateGroup(input: Partial<ApplicationGroupsUpdateInput>): Observable<IApplicationGroups> {
    console.debug('[GroupService] Updating group:', input);

    if (!input.applicationGroupId) {
      throw new Error('Group ID is required for updates');
    }

    const updateInput: ApplicationGroupsUpdateInput = {
      applicationGroupId: input.applicationGroupId,
      applicationId: input.applicationId,
      name: input.name,
      description: input.description,
      status: input.status,
      memberCount: input.memberCount,
      createdAt: input.createdAt ? new Date(input.createdAt) : undefined,
      updatedAt: new Date(),
    };

    const graphqlInput = toGraphQLInput(updateInput as unknown as Record<string, unknown>);

    return from(
      this.executeMutation<IApplicationGroups>(
        ApplicationGroupsUpdate,
        { input: graphqlInput },
        'userPool'
      )
    ).pipe(
      map((item) => {
        console.debug('[GroupService] Group updated:', item);
        return new ApplicationGroups(item);
      }),
      catchError((error) => {
        console.error('[GroupService] Error updating group:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to update this group.');
        }
        if (error?.message?.includes('not found')) {
          throw new Error('Group not found. It may have been deleted.');
        }
        throw new Error('Failed to update group. Please try again later.');
      })
    );
  }

  /**
   * Delete a group
   *
   * @param groupId ID of group to delete
   * @returns Observable<IApplicationGroups> The deleted group
   *
   * _Requirements: 8.1_
   */
  public deleteGroup(groupId: string): Observable<IApplicationGroups> {
    console.debug('[GroupService] Deleting group:', groupId);

    if (!groupId) {
      throw new Error('Group ID is required for deletion');
    }

    return from(
      this.executeMutation<IApplicationGroups>(
        ApplicationGroupsDelete,
        { input: { applicationGroupId: groupId } },
        'userPool'
      )
    ).pipe(
      map((item) => {
        console.debug('[GroupService] Group deleted:', item);
        return new ApplicationGroups(item);
      }),
      catchError((error) => {
        console.error('[GroupService] Error deleting group:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to delete this group.');
        }
        if (error?.message?.includes('not found')) {
          throw new Error('Group not found. It may have already been deleted.');
        }
        throw new Error('Failed to delete group. Please try again later.');
      })
    );
  }

  // ============================================================================
  // Group Membership Operations
  // ============================================================================

  /**
   * Get all members of a group
   *
   * @param groupId The group ID
   * @param limit Optional limit for pagination
   * @param nextToken Optional token for pagination
   * @returns Observable<Connection<IApplicationGroupUsers>> Paginated list of members
   *
   * _Requirements: 8.3_
   */
  public getGroupMembers(
    groupId: string,
    limit?: number,
    nextToken?: string
  ): Observable<Connection<IApplicationGroupUsers>> {
    console.debug('[GroupService] Getting members for group:', groupId);

    if (!groupId) {
      throw new Error('Group ID is required');
    }

    return from(
      this.executeListQuery<IApplicationGroupUsers>(
        ApplicationGroupUsersListByApplicationGroupId,
        { input: { applicationGroupId: groupId, limit, nextToken } },
        'userPool'
      )
    ).pipe(
      map((connection) => {
        console.debug('[GroupService] Members retrieved:', connection.items.length);
        return {
          items: connection.items.map((item) => new ApplicationGroupUsers(item)),
          nextToken: connection.nextToken,
        };
      }),
      catchError((error) => {
        console.error('[GroupService] Error getting group members:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to view group members.');
        }
        throw new Error('Failed to retrieve group members. Please try again later.');
      })
    );
  }


  /**
   * Add a user to a group
   *
   * @param groupId The group ID
   * @param userId The user ID to add
   * @param applicationId The application ID (for denormalization)
   * @returns Observable<IApplicationGroupUsers> The created membership
   *
   * _Requirements: 8.3_
   */
  public addMemberToGroup(
    groupId: string,
    userId: string,
    applicationId?: string
  ): Observable<IApplicationGroupUsers> {
    console.debug('[GroupService] Adding member to group:', { groupId, userId });

    if (!groupId) {
      throw new Error('Group ID is required');
    }
    if (!userId) {
      throw new Error('User ID is required');
    }

    const now = new Date();
    const createInput: ApplicationGroupUsersCreateInput = {
      applicationGroupUserId: this.generateUUID(),
      applicationGroupId: groupId,
      userId: userId,
      applicationId: applicationId || '',
      status: ApplicationGroupUserStatus.Active,
      createdAt: now,
      updatedAt: now,
    };

    const graphqlInput = toGraphQLInput(createInput as unknown as Record<string, unknown>);

    return from(
      this.executeMutation<IApplicationGroupUsers>(
        ApplicationGroupUsersCreate,
        { input: graphqlInput },
        'userPool'
      )
    ).pipe(
      map((item) => {
        console.debug('[GroupService] Member added to group:', item);
        return new ApplicationGroupUsers(item);
      }),
      catchError((error) => {
        console.error('[GroupService] Error adding member to group:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to add members to this group.');
        }
        if (error?.message?.includes('already exists')) {
          throw new Error('This user is already a member of this group.');
        }
        throw new Error('Failed to add member to group. Please try again later.');
      })
    );
  }

  /**
   * Remove a user from a group
   *
   * @param membershipId The membership ID to remove
   * @returns Observable<IApplicationGroupUsers> The deleted membership
   *
   * _Requirements: 8.3_
   */
  public removeMemberFromGroup(membershipId: string): Observable<IApplicationGroupUsers> {
    console.debug('[GroupService] Removing member from group:', membershipId);

    if (!membershipId) {
      throw new Error('Membership ID is required');
    }

    return from(
      this.executeMutation<IApplicationGroupUsers>(
        ApplicationGroupUsersDelete,
        { input: { applicationGroupUserId: membershipId } },
        'userPool'
      )
    ).pipe(
      map((item) => {
        console.debug('[GroupService] Member removed from group:', item);
        return new ApplicationGroupUsers(item);
      }),
      catchError((error) => {
        console.error('[GroupService] Error removing member from group:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to remove members from this group.');
        }
        if (error?.message?.includes('not found')) {
          throw new Error('Membership not found. It may have already been removed.');
        }
        throw new Error('Failed to remove member from group. Please try again later.');
      })
    );
  }

  // ============================================================================
  // Group Role Assignment Operations
  // ============================================================================

  /**
   * Get all role assignments for a group
   *
   * @param groupId The group ID
   * @param limit Optional limit for pagination
   * @param nextToken Optional token for pagination
   * @returns Observable<Connection<IApplicationGroupRoles>> Paginated list of role assignments
   *
   * _Requirements: 8.2_
   */
  public getGroupRoles(
    groupId: string,
    limit?: number,
    nextToken?: string
  ): Observable<Connection<IApplicationGroupRoles>> {
    console.debug('[GroupService] Getting roles for group:', groupId);

    if (!groupId) {
      throw new Error('Group ID is required');
    }

    return from(
      this.executeListQuery<IApplicationGroupRoles>(
        ApplicationGroupRolesListByApplicationGroupId,
        { input: { applicationGroupId: groupId, limit, nextToken } },
        'userPool'
      )
    ).pipe(
      map((connection) => {
        console.debug('[GroupService] Roles retrieved:', connection.items.length);
        return {
          items: connection.items.map((item) => new ApplicationGroupRoles(item)),
          nextToken: connection.nextToken,
        };
      }),
      catchError((error) => {
        console.error('[GroupService] Error getting group roles:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to view group roles.');
        }
        throw new Error('Failed to retrieve group roles. Please try again later.');
      })
    );
  }

  /**
   * Assign a role to a group for a specific environment
   *
   * @param input Role assignment data
   * @returns Observable<IApplicationGroupRoles> The created role assignment
   *
   * _Requirements: 8.2_
   */
  public assignRoleToGroup(
    input: Partial<ApplicationGroupRolesCreateInput>
  ): Observable<IApplicationGroupRoles> {
    console.debug('[GroupService] Assigning role to group:', input);

    if (!input.applicationGroupId) {
      throw new Error('Group ID is required');
    }
    if (!input.applicationId) {
      throw new Error('Application ID is required');
    }
    if (!input.environment) {
      throw new Error('Environment is required');
    }
    if (!input.roleId) {
      throw new Error('Role ID is required');
    }

    const now = new Date();
    const createInput: ApplicationGroupRolesCreateInput = {
      applicationGroupRoleId: input.applicationGroupRoleId || this.generateUUID(),
      applicationGroupId: input.applicationGroupId,
      applicationId: input.applicationId,
      environment: input.environment,
      roleId: input.roleId,
      roleName: input.roleName || '',
      permissions: input.permissions || [],
      status: input.status || ApplicationGroupRoleStatus.Active,
      createdAt: now,
      updatedAt: now,
    };

    const graphqlInput = toGraphQLInput(createInput as unknown as Record<string, unknown>);

    return from(
      this.executeMutation<IApplicationGroupRoles>(
        ApplicationGroupRolesCreate,
        { input: graphqlInput },
        'userPool'
      )
    ).pipe(
      map((item) => {
        console.debug('[GroupService] Role assigned to group:', item);
        return new ApplicationGroupRoles(item);
      }),
      catchError((error) => {
        console.error('[GroupService] Error assigning role to group:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to assign roles to this group.');
        }
        if (error?.message?.includes('already exists')) {
          throw new Error('This role is already assigned to this group for this environment.');
        }
        throw new Error('Failed to assign role to group. Please try again later.');
      })
    );
  }

  /**
   * Remove a role assignment from a group
   *
   * @param roleAssignmentId The role assignment ID to remove
   * @returns Observable<IApplicationGroupRoles> The deleted role assignment
   *
   * _Requirements: 8.2_
   */
  public removeRoleFromGroup(roleAssignmentId: string): Observable<IApplicationGroupRoles> {
    console.debug('[GroupService] Removing role from group:', roleAssignmentId);

    if (!roleAssignmentId) {
      throw new Error('Role assignment ID is required');
    }

    return from(
      this.executeMutation<IApplicationGroupRoles>(
        ApplicationGroupRolesDelete,
        { input: { applicationGroupRoleId: roleAssignmentId } },
        'userPool'
      )
    ).pipe(
      map((item) => {
        console.debug('[GroupService] Role removed from group:', item);
        return new ApplicationGroupRoles(item);
      }),
      catchError((error) => {
        console.error('[GroupService] Error removing role from group:', error);
        if (isAuthenticationError(error)) {
          throw new Error('You are not authorized to remove roles from this group.');
        }
        if (error?.message?.includes('not found')) {
          throw new Error('Role assignment not found. It may have already been removed.');
        }
        throw new Error('Failed to remove role from group. Please try again later.');
      })
    );
  }
}
