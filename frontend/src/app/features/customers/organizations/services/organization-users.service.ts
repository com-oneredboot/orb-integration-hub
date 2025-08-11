/**
 * Organization Users Service
 * 
 * Manages organization member operations including fetching members,
 * updating roles, and removing members from organizations.
 */

import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../../../core/services/api.service';
import { Users } from '../../../../core/models/UsersModel';
import { OrganizationUsers } from '../../../../core/models/OrganizationUsersModel';
import { 
  OrganizationUsersQueryByOrganizationId,
  OrganizationUsersUpdateMutation,
  OrganizationUsersDeleteMutation
} from '../../../../core/graphql/OrganizationUsers.graphql';

export interface OrganizationMember extends OrganizationUsers {
  // Extended fields from Users table
  name?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  userDetails?: Users;
}

@Injectable({
  providedIn: 'root'
})
export class OrganizationUsersService extends ApiService {
  
  /**
   * Get all members of an organization with their user details
   */
  getOrganizationMembers(organizationId: string): Observable<OrganizationMember[]> {
    return from(this.query<any>(OrganizationUsersQueryByOrganizationId, {
      input: { organizationId }
    })).pipe(
      map(response => {
        console.log('OrganizationUsers response:', response);
        if (response.data?.OrganizationUsersQueryByOrganizationId?.Data) {
          const members = response.data.OrganizationUsersQueryByOrganizationId.Data as OrganizationUsers[];
          // Return the actual data from the API without placeholders
          return members.map(member => {
            const orgMember: OrganizationMember = {
              ...member,
              // These fields might be populated if the lambda includes user details
              name: '',
              email: ''
            };
            return orgMember;
          });
        }
        return [];
      }),
      catchError(error => {
        console.error('Error fetching organization members:', error);
        return of([]);
      })
    );
  }
  
  /**
   * Update a member's role in an organization
   */
  updateMemberRole(userId: string, organizationId: string, newRole: string): Observable<any> {
    return from(this.mutate<any>(OrganizationUsersUpdateMutation, {
      input: {
        userId,
        organizationId,
        role: newRole
      }
    })).pipe(
      map(response => {
        if (response.data?.OrganizationUsersUpdate?.StatusCode === 200) {
          return { success: true, data: response.data.OrganizationUsersUpdate.Data };
        }
        throw new Error(response.data?.OrganizationUsersUpdate?.Message || 'Failed to update member role');
      })
    );
  }
  
  /**
   * Remove a member from an organization
   */
  removeMember(userId: string, organizationId: string): Observable<any> {
    // For OrganizationUsers, we need to pass the composite key
    const compositeKey = `${organizationId}#${userId}`;
    
    return from(this.mutate<any>(OrganizationUsersDeleteMutation, {
      id: compositeKey
    })).pipe(
      map(response => {
        if (response.data?.OrganizationUsersDelete?.StatusCode === 200) {
          return { success: true };
        }
        throw new Error(response.data?.OrganizationUsersDelete?.Message || 'Failed to remove member');
      })
    );
  }
}