/**
 * Organizations model.
 */

// Import enums and models used in this model
import { OrganizationStatus } from './OrganizationStatusEnum';

// CreateInput
export type OrganizationsCreateInput = {
  organizationId: string;
  name: string;
  description: string | undefined;
  ownerId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  kmsKeyId: string | undefined;
  kmsKeyArn: string | undefined;
  kmsAlias: string | undefined;
};

// UpdateInput
export type OrganizationsUpdateInput = {
  organizationId: string;
  name: string;
  description: string | undefined;
  ownerId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  kmsKeyId: string | undefined;
  kmsKeyArn: string | undefined;
  kmsAlias: string | undefined;
};

// QueryInput
export type OrganizationsQueryByOrganizationIdInput = {
  organizationId: string;
};


export type OrganizationsQueryByOwnerIdInput = {
  ownerId: string;
};
export type OrganizationsQueryByStatusInput = {
  status: string;
};

// Response types
export type OrganizationsResponse = {
  StatusCode: number;
  Message: string;
  Data: Organizations | null;
};

export type OrganizationsCreateResponse = {
  StatusCode: number;
  Message: string;
  Data: Organizations | null;
};

export type OrganizationsUpdateResponse = {
  StatusCode: number;
  Message: string;
  Data: Organizations | null;
};

export type OrganizationsListResponse = {
  StatusCode: number;
  Message: string;
  Data: Organizations[] | null;
};

export interface IOrganizations {
  organizationId: string;
  name: string;
  description: string | undefined;
  ownerId: string;
  status: OrganizationStatus;
  createdAt: string;
  updatedAt: string;
  kmsKeyId: string | undefined;
  kmsKeyArn: string | undefined;
  kmsAlias: string | undefined;
}

export class Organizations implements IOrganizations {
  organizationId = '';
  name = '';
  description = '';
  ownerId = '';
  status = OrganizationStatus.UNKNOWN;
  createdAt = '';
  updatedAt = '';
  kmsKeyId = '';
  kmsKeyArn = '';
  kmsAlias = '';

  constructor(data: Partial<IOrganizations> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        if (key === 'status' && typeof value === 'string') {
          this.status = OrganizationStatus[value as keyof typeof OrganizationStatus] ?? OrganizationStatus.UNKNOWN;
        } else 
        {
          this[key as keyof this] = value as this[keyof this];
        }
      }
    });
  }
} 