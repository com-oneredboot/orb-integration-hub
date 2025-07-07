/**
 * OwnershipTransferRequests model.
 */

// Import enums and models used in this model
import { OwnershipTransferStatus } from './OwnershipTransferStatusEnum';

// CreateInput
export type OwnershipTransferRequestsCreateInput = {
  transferId: string;
  currentOwnerId: string;
  newOwnerId: string;
  organizationId: string;
  status: string;
  requiredBillingPlan: string;
  monthlyCost: number;
  paymentValidationToken: string;
  createdAt: string;
  expiresAt: string;
  updatedAt: string;
  completedAt: string | undefined;
  failureReason: string | undefined;
  billingTransitionDetails: Record<string, any> | undefined;
  fraudAssessment: Record<string, any> | undefined;
  notificationsSent: string[] | undefined;
};

// UpdateInput
export type OwnershipTransferRequestsUpdateInput = {
  transferId: string;
  currentOwnerId: string;
  newOwnerId: string;
  organizationId: string;
  status: string;
  requiredBillingPlan: string;
  monthlyCost: number;
  paymentValidationToken: string;
  createdAt: string;
  expiresAt: string;
  updatedAt: string;
  completedAt: string | undefined;
  failureReason: string | undefined;
  billingTransitionDetails: Record<string, any> | undefined;
  fraudAssessment: Record<string, any> | undefined;
  notificationsSent: string[] | undefined;
};

// QueryInput
export type OwnershipTransferRequestsQueryByTransferIdInput = {
  transferId: string;
};


export type OwnershipTransferRequestsQueryByCurrentOwnerIdInput = {
  currentOwnerId: string;
};
export type OwnershipTransferRequestsQueryByNewOwnerIdInput = {
  newOwnerId: string;
};
export type OwnershipTransferRequestsQueryByStatusInput = {
  status: string;
};
export type OwnershipTransferRequestsQueryByStatusInput = {
  status: string;
};

// Response types
export type OwnershipTransferRequestsResponse = {
  StatusCode: number;
  Message: string;
  Data: OwnershipTransferRequests | null;
};

export type OwnershipTransferRequestsCreateResponse = {
  StatusCode: number;
  Message: string;
  Data: OwnershipTransferRequests | null;
};

export type OwnershipTransferRequestsUpdateResponse = {
  StatusCode: number;
  Message: string;
  Data: OwnershipTransferRequests | null;
};

export type OwnershipTransferRequestsListResponse = {
  StatusCode: number;
  Message: string;
  Data: OwnershipTransferRequests[] | null;
};

export interface IOwnershipTransferRequests {
  transferId: string;
  currentOwnerId: string;
  newOwnerId: string;
  organizationId: string;
  status: OwnershipTransferStatus;
  requiredBillingPlan: string;
  monthlyCost: number;
  paymentValidationToken: string;
  createdAt: string;
  expiresAt: string;
  updatedAt: string;
  completedAt: string | undefined;
  failureReason: string | undefined;
  billingTransitionDetails: Record<string, any> | undefined;
  fraudAssessment: Record<string, any> | undefined;
  notificationsSent: string[] | undefined;
}

export class OwnershipTransferRequests implements IOwnershipTransferRequests {
  transferId = '';
  currentOwnerId = '';
  newOwnerId = '';
  organizationId = '';
  status = OwnershipTransferStatus.UNKNOWN;
  requiredBillingPlan = '';
  monthlyCost = 0;
  paymentValidationToken = '';
  createdAt = '';
  expiresAt = '';
  updatedAt = '';
  completedAt = '';
  failureReason = '';
  billingTransitionDetails = {};
  fraudAssessment = {};
  notificationsSent = [];

  constructor(data: Partial<IOwnershipTransferRequests> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        if (key === 'status' && typeof value === 'string') {
          this.status = OwnershipTransferStatus[value as keyof typeof OwnershipTransferStatus] ?? OwnershipTransferStatus.UNKNOWN;
        } else 
        {
          this[key as keyof this] = value as this[keyof this];
        }
      }
    });
  }
} 