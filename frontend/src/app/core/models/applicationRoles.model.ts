/**
 * ApplicationRole Model
 * Generated code - do not modify directly
 * @generated
 */

// Import enum types
import { ApplicationRoleStatus } from './applicationRole.enum';

// Interface
export interface IApplicationRole {
  applicationId: string;
  roleId: string;
  description?: string;
  status: ApplicationRoleStatus;
  createdAt: number;
  updatedAt: number;
}

// Model Class
export class ApplicationRole implements IApplicationRole {
  applicationId: string = '';
  roleId: string = '';
  description: string = '';
  status: ApplicationRoleStatus = ApplicationRoleStatus.UNKNOWN;
  createdAt: number = 0;
  updatedAt: number = 0;

  constructor(data: Partial<IApplicationRole> = {}) {
    // Validate and assign data
    Object.entries(data).forEach(([key, value]) => {
      const typedKey = key as keyof IApplicationRole;
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
    if (this.roleId === undefined || this.roleId === null) {
      return false;
    }
    if (this.status === undefined || this.status === null) {
      return false;
    }
    if (!Object.values(ApplicationRoleStatus).includes(this.status)) {
      return false;
    }
    if (this.createdAt === undefined || this.createdAt === null) {
      return false;
    }
    if (this.updatedAt === undefined || this.updatedAt === null) {
      return false;
    }
    return true;
  }

  /**
   * Creates a copy of the model
   * @returns A new instance of the model with the same values
   */
  clone(): ApplicationRole {
    return new ApplicationRole({...this});
  }
} 