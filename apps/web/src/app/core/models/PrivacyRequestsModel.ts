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
  receivedAt: string;
  deadline: string;
  completedAt: string | undefined;
  estimatedCompletion: string | undefined;
  automatedProcessing: boolean;
  accessReport: string | undefined;
  deletionResult: string | undefined;
  portableData: string | undefined;
  rejectionReason: string | undefined;
  errorDetails: string | undefined;
  complianceNotes: string | undefined;
  createdAt: string;
  updatedAt: string;
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
  receivedAt: string;
  deadline: string;
  completedAt: string | undefined;
  estimatedCompletion: string | undefined;
  automatedProcessing: boolean;
  accessReport: string | undefined;
  deletionResult: string | undefined;
  portableData: string | undefined;
  rejectionReason: string | undefined;
  errorDetails: string | undefined;
  complianceNotes: string | undefined;
  createdAt: string;
  updatedAt: string;
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

export interface IPrivacyRequests {
  requestId: string;
  requestType: PrivacyRequestType;
  dataSubjectEmail: string;
  legalBasis: LegalBasis;
  organizationId: string | undefined;
  requesterId: string;
  status: PrivacyRequestStatus;
  receivedAt: string;
  deadline: string;
  completedAt: string | undefined;
  estimatedCompletion: string | undefined;
  automatedProcessing: boolean;
  accessReport: string | undefined;
  deletionResult: string | undefined;
  portableData: string | undefined;
  rejectionReason: string | undefined;
  errorDetails: string | undefined;
  complianceNotes: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export class PrivacyRequests implements IPrivacyRequests {
  requestId = '';
  requestType = PrivacyRequestType.UNKNOWN;
  dataSubjectEmail = '';
  legalBasis = LegalBasis.UNKNOWN;
  organizationId = '';
  requesterId = '';
  status = PrivacyRequestStatus.UNKNOWN;
  receivedAt = '';
  deadline = '';
  completedAt = '';
  estimatedCompletion = '';
  automatedProcessing = false;
  accessReport = '';
  deletionResult = '';
  portableData = '';
  rejectionReason = '';
  errorDetails = '';
  complianceNotes = '';
  createdAt = '';
  updatedAt = '';

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