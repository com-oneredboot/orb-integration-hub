/**
 * PrivacyRequests model.
 */

// Import enums and models used in this model
import { PrivacyRequestType } from './PrivacyRequestTypeEnum';
import { LegalBasis } from './LegalBasisEnum';
import { PrivacyRequestStatus } from './PrivacyRequestStatusEnum';

// CreateInput
export type PrivacyRequestsCreateInput = {
  requestId: string;
  requestType: string;
  dataSubjectEmail: string;
  legalBasis: string;
  organizationId: string | undefined;
  requesterId: string;
  status: string;
  receivedAt: number;
  deadline: number;
  completedAt: number | undefined;
  estimatedCompletion: number | undefined;
  automatedProcessing: boolean;
  accessReport: string | undefined;
  deletionResult: string | undefined;
  portableData: string | undefined;
  rejectionReason: string | undefined;
  errorDetails: string | undefined;
  complianceNotes: string | undefined;
  createdAt: number;
  updatedAt: number;
};

// UpdateInput
export type PrivacyRequestsUpdateInput = {
  requestId: string;
  requestType: string;
  dataSubjectEmail: string;
  legalBasis: string;
  organizationId: string | undefined;
  requesterId: string;
  status: string;
  receivedAt: number;
  deadline: number;
  completedAt: number | undefined;
  estimatedCompletion: number | undefined;
  automatedProcessing: boolean;
  accessReport: string | undefined;
  deletionResult: string | undefined;
  portableData: string | undefined;
  rejectionReason: string | undefined;
  errorDetails: string | undefined;
  complianceNotes: string | undefined;
  createdAt: number;
  updatedAt: number;
};

// QueryInput
export type PrivacyRequestsQueryByRequestIdInput = {
  requestId: string;
};


export type PrivacyRequestsQueryByRequestTypeInput = {
  requestType: string;
};
export type PrivacyRequestsQueryByDataSubjectEmailInput = {
  dataSubjectEmail: string;
};
export type PrivacyRequestsQueryByOrganizationIdInput = {
  organizationId: string;
};
export type PrivacyRequestsQueryByStatusInput = {
  status: string;
};

// Response types
export type PrivacyRequestsResponse = {
  StatusCode: number;
  Message: string;
  Data: PrivacyRequests | null;
};

export type PrivacyRequestsCreateResponse = {
  StatusCode: number;
  Message: string;
  Data: PrivacyRequests | null;
};

export type PrivacyRequestsUpdateResponse = {
  StatusCode: number;
  Message: string;
  Data: PrivacyRequests | null;
};

export type PrivacyRequestsListResponse = {
  StatusCode: number;
  Message: string;
  Data: PrivacyRequests[] | null;
};

// GraphQL Response Wrappers
export type PrivacyRequestsCreateMutationResponse = {
  PrivacyRequestsCreate: PrivacyRequestsCreateResponse;
};

export type PrivacyRequestsUpdateMutationResponse = {
  PrivacyRequestsUpdate: PrivacyRequestsUpdateResponse;
};

export type PrivacyRequestsDeleteMutationResponse = {
  PrivacyRequestsDelete: PrivacyRequestsResponse;
};

export type PrivacyRequestsQueryByRequestIdResponse = {
  PrivacyRequestsQueryByRequestId: PrivacyRequestsResponse;
};

export type PrivacyRequestsQueryByRequestTypeResponse = {
  PrivacyRequestsQueryByRequestType: PrivacyRequestsListResponse;
};
export type PrivacyRequestsQueryByDataSubjectEmailResponse = {
  PrivacyRequestsQueryByDataSubjectEmail: PrivacyRequestsListResponse;
};
export type PrivacyRequestsQueryByOrganizationIdResponse = {
  PrivacyRequestsQueryByOrganizationId: PrivacyRequestsListResponse;
};
export type PrivacyRequestsQueryByStatusResponse = {
  PrivacyRequestsQueryByStatus: PrivacyRequestsListResponse;
};

export interface IPrivacyRequests {
  requestId: string;
  requestType: PrivacyRequestType;
  dataSubjectEmail: string;
  legalBasis: LegalBasis;
  organizationId: string | undefined;
  requesterId: string;
  status: PrivacyRequestStatus;
  receivedAt: number;
  deadline: number;
  completedAt: number | undefined;
  estimatedCompletion: number | undefined;
  automatedProcessing: boolean;
  accessReport: string | undefined;
  deletionResult: string | undefined;
  portableData: string | undefined;
  rejectionReason: string | undefined;
  errorDetails: string | undefined;
  complianceNotes: string | undefined;
  createdAt: number;
  updatedAt: number;
}

export class PrivacyRequests implements IPrivacyRequests {
  requestId = '';
  requestType = PrivacyRequestType.UNKNOWN;
  dataSubjectEmail = '';
  legalBasis = LegalBasis.UNKNOWN;
  organizationId = '';
  requesterId = '';
  status = PrivacyRequestStatus.UNKNOWN;
  receivedAt = 0;
  deadline = 0;
  completedAt = 0;
  estimatedCompletion = 0;
  automatedProcessing = false;
  accessReport = '';
  deletionResult = '';
  portableData = '';
  rejectionReason = '';
  errorDetails = '';
  complianceNotes = '';
  createdAt = 0;
  updatedAt = 0;

  constructor(data: Partial<IPrivacyRequests> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        if (key === 'requestType' && typeof value === 'string') {
          this.requestType = PrivacyRequestType[value as keyof typeof PrivacyRequestType] ?? PrivacyRequestType.UNKNOWN;
        } else 
        if (key === 'legalBasis' && typeof value === 'string') {
          this.legalBasis = LegalBasis[value as keyof typeof LegalBasis] ?? LegalBasis.UNKNOWN;
        } else 
        if (key === 'status' && typeof value === 'string') {
          this.status = PrivacyRequestStatus[value as keyof typeof PrivacyRequestStatus] ?? PrivacyRequestStatus.UNKNOWN;
        } else 
        {
          this[key as keyof this] = value as this[keyof this];
        }
      }
    });
  }
} 