/**
 * User Model
 * Generated code - do not modify directly
 * @generated
 */



// Import enum types
import { UserStatus } from './user.enum';

// Interface
export interface IUser {  
  user_id: string;
  cognito_id: string;
  email: string;
  phone_number?: string;
  phone_verified?: boolean?;  first_name?: string?;  last_name: string?;  groups: [];  status: UserStatus;  created_at: timestamp;  updated_at: timestamp?;}

// Model Class
export class User implements IUser {  user_id: string = '';  cognito_id: string = '';  email: string = '';  phone_number: string = '';  phone_verified: boolean = false;  first_name: string = '';  last_name: string = '';  groups: [] = [];  status: UserStatus = UserStatus.UNKNOWN;  created_at: timestamp;  updated_at: timestamp;
  constructor(data: Partial<IUser> = {}) {
    // Validate and assign data
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        // Handle enum arrays
        if (Array.isArray(value) && this[key] instanceof Array && this[key].length === 0) {
          this[key] = value as typeof this[key];
        }
        // Handle single enums
        else if (typeof value === 'string' && this[key] instanceof Object && 'UNKNOWN' in this[key]) {
          this[key] = (this[key] as any)[value] || (this[key] as any).UNKNOWN;
        }
        // Handle other types
        else {
          this[key] = value as any;
        }
      }
    });
  }

  /**
   * Validates if the model has all required fields
   * @returns boolean indicating if the model is valid
   */
  isValid(): boolean {
    if (this.user_id === undefined || this.user_id === null) {
      return false;
    }
    if (this.cognito_id === undefined || this.cognito_id === null) {
      return false;
    }
    if (this.email === undefined || this.email === null) {
      return false;
    }
    if (this.groups === undefined || this.groups === null) {
      return false;
    }
    if (!Array.isArray(this.groups)) {
      return false;
    }
    if (this.status === undefined || this.status === null) {
      return false;
    }
    if (!Object.values(UserStatus).includes(this.status)) {
      return false;
    }
    if (this.created_at === undefined || this.created_at === null) {
      return false;
    }
    return true;
  }

  /**
   * Creates a copy of the model
   * @returns A new instance of the model with the same values
   */
  clone(): User {
    return new User({...this});
  }
}