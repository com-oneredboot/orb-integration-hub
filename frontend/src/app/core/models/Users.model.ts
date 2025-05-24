/**
 *  DynamoDB model.
 */

/*
 * schema.table: 
 * schema.name: Users
 */

// Import enums and models used in this model












import { UserStatus } from './UserStatus.enum';
















// CreateInput
export type UsersCreateInput = {

  userId: string;

  cognitoId: string;

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

};

// UpdateInput
export type UsersUpdateInput = {

  userId: string;

  cognitoId: string;

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

};

// QueryInput
// Primary key queries
export type UsersQueryByUserIdInput = {
  userId: string;
};




// Secondary index queries

export type UsersQueryByEmailInput = {
  email: string;
};


export type UsersQueryByCognitoIdInput = {
  cognitoId: string;
};




// Response types
export type UsersResponse = {
  statusCode: number;
  message: string;
  data: IUsers | null;
};

export type UsersCreateResponse = {
  statusCode: number;
  message: string;
  data: IUsers | null;
};

export type UsersUpdateResponse = {
  statusCode: number;
  message: string;
  data: IUsers | null;
};

export interface IUsers {

  userId: string;

  cognitoId: string;

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

}

export class Users implements IUsers {

  userId = '';

  cognitoId = '';

  email = '';

  firstName = '';

  lastName = '';

  status = '';

  createdAt = '';

  updatedAt = '';

  phoneNumber = '';

  groups = [];

  emailVerified = false;

  phoneVerified = false;


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