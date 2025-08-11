/**
 * Invitations model.
 */

// Import enums and models used in this model












import { OrganizationUserRole } from './OrganizationUserRoleEnum';



import { InvitationStatus } from './InvitationStatusEnum';













// CreateInput
export type InvitationsCreateInput = {

  invitationId: string;

  organizationId: string;

  inviterUserId: string;

  inviteeEmail: string;

  inviteeUserId: string | undefined;

  role: string;

  status: string;

  message: string | undefined;

  expiresAt: number;

  createdAt: number;

  updatedAt: number;

};

// UpdateInput
export type InvitationsUpdateInput = {

  invitationId: string;

  organizationId: string;

  inviterUserId: string;

  inviteeEmail: string;

  inviteeUserId: string | undefined;

  role: string;

  status: string;

  message: string | undefined;

  expiresAt: number;

  createdAt: number;

  updatedAt: number;

};

// QueryInput
export type InvitationsQueryByInvitationIdInput = {
  invitationId: string;
};




export type InvitationsQueryByOrganizationIdInput = {
  organizationId: string;
};

export type InvitationsQueryByInviteeEmailInput = {
  inviteeEmail: string;
};

export type InvitationsQueryByInviteeUserIdInput = {
  inviteeUserId: string;
};


// Response types
export type InvitationsResponse = {
  StatusCode: number;
  Message: string;
  Data: Invitations | null;
};

export type InvitationsCreateResponse = {
  StatusCode: number;
  Message: string;
  Data: Invitations | null;
};

export type InvitationsUpdateResponse = {
  StatusCode: number;
  Message: string;
  Data: Invitations | null;
};

export type InvitationsListResponse = {
  StatusCode: number;
  Message: string;
  Data: Invitations[] | null;
};

// GraphQL Response Wrappers
export type InvitationsCreateMutationResponse = {
  InvitationsCreate: InvitationsCreateResponse;
};

export type InvitationsUpdateMutationResponse = {
  InvitationsUpdate: InvitationsUpdateResponse;
};

export type InvitationsDeleteMutationResponse = {
  InvitationsDelete: InvitationsResponse;
};

export type InvitationsQueryByInvitationIdResponse = {
  InvitationsQueryByInvitationId: InvitationsResponse;
};


export type InvitationsQueryByOrganizationIdResponse = {
  InvitationsQueryByOrganizationId: InvitationsListResponse;
};

export type InvitationsQueryByInviteeEmailResponse = {
  InvitationsQueryByInviteeEmail: InvitationsListResponse;
};

export type InvitationsQueryByInviteeUserIdResponse = {
  InvitationsQueryByInviteeUserId: InvitationsListResponse;
};


export interface IInvitations {

  invitationId: string;

  organizationId: string;

  inviterUserId: string;

  inviteeEmail: string;

  inviteeUserId: string | undefined;

  role: OrganizationUserRole;

  status: InvitationStatus;

  message: string | undefined;

  expiresAt: number;

  createdAt: number;

  updatedAt: number;

}

export class Invitations implements IInvitations {

  invitationId = '';

  organizationId = '';

  inviterUserId = '';

  inviteeEmail = '';

  inviteeUserId = '';

  role = OrganizationUserRole.ADMINISTRATOR;

  status = InvitationStatus.PENDING;

  message = '';

  expiresAt = 0;

  createdAt = 0;

  updatedAt = 0;


  constructor(data: Partial<IInvitations> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {












        if (key === 'role' && typeof value === 'string') {
          this.role = OrganizationUserRole[value as keyof typeof OrganizationUserRole] ?? OrganizationUserRole.ADMINISTRATOR;
        } else 



        if (key === 'status' && typeof value === 'string') {
          this.status = InvitationStatus[value as keyof typeof InvitationStatus] ?? InvitationStatus.PENDING;
        } else 










        {
          this[key as keyof this] = value as this[keyof this];
        }
      }
    });
  }
} 