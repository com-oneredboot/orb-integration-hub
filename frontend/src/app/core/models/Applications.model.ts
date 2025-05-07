/**
 *  DynamoDB model.
 */

// Import enums and models used in this model
import { ApplicationType } from './ApplicationType.enum';
import { ApplicationStatus } from './ApplicationStatus.enum';

// CreateInput
export type CreateInput = {
  id: string;
  name: string;
  description: string | undefined;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

// UpdateInput
export type UpdateInput = {
  id: string;
  name: string;
  description: string | undefined;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

// QueryInput
// Primary key queries
export type QueryByIdInput = {
  id: string;
};

export type QueryByNameInput = {
  name: string;
};

export type QueryByBothInput = {
  id: string;
  name: string;
};

// Secondary index queries
export type QueryByStatusInput = {
  status: string;
};
export type QueryByTypeInput = {
  type: string;
};

// Response types
export type Response = {
  statusCode: number;
  message: string;
  data: I | null;
};

export type CreateResponse = {
  statusCode: number;
  message: string;
  data: I | null;
};

export type UpdateResponse = {
  statusCode: number;
  message: string;
  data: I | null;
};

export interface I {
  id: string;
  name: string;
  description: string | undefined;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export class  implements I {
  id = '';
  name = '';
  description = '';
  type = '';
  status = '';
  createdAt = '';
  updatedAt = '';

  constructor(data: Partial<I> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        if (key === 'type' && typeof value === 'string') {
          this.type = ApplicationType[value as keyof typeof ApplicationType] ?? ApplicationType.UNKNOWN;
        } else 
        if (key === 'status' && typeof value === 'string') {
          this.status = ApplicationStatus[value as keyof typeof ApplicationStatus] ?? ApplicationStatus.UNKNOWN;
        } else 
        {
          this[key as keyof this] = value as this[keyof this];
        }
      }
    });
  }
} 