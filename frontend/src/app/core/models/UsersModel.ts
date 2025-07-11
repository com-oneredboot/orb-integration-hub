/**
 * Users model.
 */

// Import enums and models used in this model
import { UserStatus } from './UserStatusEnum';

// CreateInput
export type UsersCreateInput = {
  userId: string;
  cognitoId: string;
  cognitoSub: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  phoneNumber: string | undefined;
  groups: string[] | undefined;
  emailVerified: boolean | undefined;
  phoneVerified: boolean | undefined;
  mfaEnabled: boolean | undefined;
  mfaSetupComplete: boolean | undefined;
};

// UpdateInput
export type UsersUpdateInput = {
  userId: string;
  cognitoId: string;
  cognitoSub: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  phoneNumber: string | undefined;
  groups: string[] | undefined;
  emailVerified: boolean | undefined;
  phoneVerified: boolean | undefined;
  mfaEnabled: boolean | undefined;
  mfaSetupComplete: boolean | undefined;
};

// QueryInput
export type UsersQueryByUserIdInput = {
  userId: string;
};


export type UsersQueryByEmailInput = {
  email: string;
};
export type UsersQueryByCognitoIdInput = {
  cognitoId: string;
};
export type UsersQueryByCognitoSubInput = {
  cognitoSub: string;
};

// Response types
export type UsersResponse = {
  StatusCode: number;
  Message: string;
  Data: Users | null;
};

export type UsersCreateResponse = {
  StatusCode: number;
  Message: string;
  Data: Users | null;
};

export type UsersUpdateResponse = {
  StatusCode: number;
  Message: string;
  Data: Users | null;
};

export type UsersListResponse = {
  StatusCode: number;
  Message: string;
  Data: Users[] | null;
};

export interface IUsers {
  userId: string;
  cognitoId: string;
  cognitoSub: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  phoneNumber: string | undefined;
  groups: string[] | undefined;
  emailVerified: boolean | undefined;
  phoneVerified: boolean | undefined;
  mfaEnabled: boolean | undefined;
  mfaSetupComplete: boolean | undefined;
}

export class Users implements IUsers {
  userId = '';
  cognitoId = '';
  cognitoSub = '';
  email = '';
  firstName = '';
  lastName = '';
  status = UserStatus.UNKNOWN;
  createdAt = '';
  updatedAt = '';
  phoneNumber = '';
  groups = [];
  emailVerified = false;
  phoneVerified = false;
  mfaEnabled = false;
  mfaSetupComplete = false;

  constructor(data: Partial<IUsers> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        if (key === 'status' && typeof value === 'string') {
          this.status = UserStatus[value as keyof typeof UserStatus] ?? UserStatus.UNKNOWN;
        } else 
        {
          this[key as keyof this] = value as this[keyof this];
        }
      }
    });
  }
} 