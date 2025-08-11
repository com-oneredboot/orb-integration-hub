/**
 * Invitations Service
 * 
 * Manages organization invitation operations including creating invitations,
 * fetching pending invitations, resending, and cancelling invitations.
 */

import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../../../core/services/api.service';
import { InvitationStatus } from '../../../../core/models/InvitationStatusEnum';
import { Invitations } from '../../../../core/models/InvitationsModel';
import {
  InvitationsQueryByOrganizationId,
  InvitationsCreateMutation,
  InvitationsUpdateMutation
} from '../../../../core/graphql/Invitations.graphql';

export interface Invitation extends Invitations {
  // No additional fields needed
}

export interface CreateInvitationInput {
  organizationId: string;
  inviteeEmail: string;
  role: string;
  message?: string;
  expiresInDays?: number;
}

@Injectable({
  providedIn: 'root'
})
export class InvitationsService extends ApiService {
  
  /**
   * Get all invitations for an organization
   */
  getOrganizationInvitations(organizationId: string): Observable<Invitation[]> {
    return from(this.query<any>(InvitationsQueryByOrganizationId, {
      input: { organizationId }
    })).pipe(
      map(response => {
        console.log('Invitations response:', response);
        if (response.data?.InvitationsQueryByOrganizationId?.Data) {
          return response.data.InvitationsQueryByOrganizationId.Data as Invitation[];
        }
        return [];
      }),
      catchError(error => {
        console.error('Error fetching invitations:', error);
        return of([]);
      })
    );
  }
  
  /**
   * Create a new invitation
   */
  createInvitation(input: CreateInvitationInput): Observable<Invitation> {
    // Note: inviterUserId will be set by the lambda from the authenticated user context
    const mutationInput = {
      organizationId: input.organizationId,
      inviteeEmail: input.inviteeEmail,
      role: input.role,
      message: input.message,
      // The lambda will handle setting default expiration if not provided
    };
    
    return from(this.mutate<any>(InvitationsCreateMutation, {
      input: mutationInput
    })).pipe(
      map(response => {
        if (response.data?.InvitationsCreate?.StatusCode === 200) {
          return response.data.InvitationsCreate.Data as Invitation;
        }
        throw new Error(response.data?.InvitationsCreate?.Message || 'Failed to create invitation');
      })
    );
  }
  
  /**
   * Resend an invitation
   */
  resendInvitation(invitationId: string): Observable<any> {
    // For resending, we update the expiration time to extend the invitation
    return from(this.mutate<any>(InvitationsUpdateMutation, {
      input: {
        invitationId,
        // The lambda should handle extending the expiration when resending
        action: 'RESEND'
      }
    })).pipe(
      map(response => {
        if (response.data?.InvitationsUpdate?.StatusCode === 200) {
          return { success: true, data: response.data.InvitationsUpdate.Data };
        }
        throw new Error(response.data?.InvitationsUpdate?.Message || 'Failed to resend invitation');
      })
    );
  }
  
  /**
   * Cancel/revoke an invitation
   */
  cancelInvitation(invitationId: string): Observable<any> {
    return from(this.mutate<any>(InvitationsUpdateMutation, {
      input: {
        invitationId,
        status: InvitationStatus.REVOKED
      }
    })).pipe(
      map(response => {
        if (response.data?.InvitationsUpdate?.StatusCode === 200) {
          return { success: true };
        }
        throw new Error(response.data?.InvitationsUpdate?.Message || 'Failed to cancel invitation');
      })
    );
  }
}