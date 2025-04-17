/**
 * ApplicationUser Model
 * Generated code - do not modify directly
 * @generated
 */

// Import enum types
import { ApplicationUserStatus } from './applicationUser.enum';

// Interface
export interface IApplicationUser {
  applicationId: string;
  userId: string;
  roleId?: string;
  status: ApplicationUserStatus;
  createdAt: number;
  updatedAt?: number;
}

// Model Class
export class ApplicationUser implements IApplicationUser {
  applicationId: string = '';
  userId: string = '';
  roleId: string = '';
  status: ApplicationUserStatus = ApplicationUserStatus.UNKNOWN;
  createdAt: number = 0;
  updatedAt: number = 0;

  constructor(data: Partial<IApplicationUser> = {}) {
    // Validate and assign data
    Object.entries(data).forEach(([key, value]) => {
      const typedKey = key as keyof IApplicationUser;
      if (typedKey in this) {
        // Handle enum arrays
        if (Array.isArray(value) && Array.isArray(this[typedKey]) && this[typedKey].length === 0) {
          (this[typedKey] as any) = value;
        }
        // Handle single enums
        else if (typeof value === 'string' && typeof this[typedKey] === 'object' && this[typedKey] !== null && 'UNKNOWN' in (this[typedKey] as any)) {
          (this[typedKey] as any) = (this[typedKey] as any)[value] || (this[typedKey] as any).UNKNOWN;
        }
        // Handle other types
        else {
          (this[typedKey] as any) = value;
        }
      }
    });
  }

  /**
   * Validates if the model has all required fields
   * @returns boolean indicating if the model is valid
   */
  isValid(): boolean {
    if (this.applicationId === undefined || this.applicationId === null) {
      return false;
    }
    if (this.userId === undefined || this.userId === null) {
      return false;
    }
    if (this.status === undefined || this.status === null) {
      return false;
    }
    if (!Object.values(ApplicationUserStatus).includes(this.status)) {
      return false;
    }
    if (this.createdAt === undefined || this.createdAt === null) {
      return false;
    }
    return true;
  }

  /**
   * Creates a copy of the model
   * @returns A new instance of the model with the same values
   */
  clone(): ApplicationUser {
    return new ApplicationUser({...this});
  }
} 