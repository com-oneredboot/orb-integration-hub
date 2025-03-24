/**
 * Role Model
 * Generated code - do not modify directly
 * @generated
 */




// Interface
export interface IRole {  role_id: string;  user_id: string;  application_id: string;  role_name: string;  role_type: string;  permissions: [];  created_at: timestamp;  updated_at: timestamp;  active: boolean;}

// Model Class
export class Role implements IRole {  role_id: string = '';  user_id: string = '';  application_id: string = '';  role_name: string = '';  role_type: string = '';  permissions: [] = [];  created_at: timestamp;  updated_at: timestamp;  active: boolean = false;
  constructor(data: Partial<IRole> = {}) {
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
    if (this.role_id === undefined || this.role_id === null) {
      return false;
    }
    if (this.user_id === undefined || this.user_id === null) {
      return false;
    }
    if (this.application_id === undefined || this.application_id === null) {
      return false;
    }
    if (this.role_name === undefined || this.role_name === null) {
      return false;
    }
    if (this.role_type === undefined || this.role_type === null) {
      return false;
    }
    if (this.permissions === undefined || this.permissions === null) {
      return false;
    }
    if (!Array.isArray(this.permissions)) {
      return false;
    }
    if (this.created_at === undefined || this.created_at === null) {
      return false;
    }
    if (this.updated_at === undefined || this.updated_at === null) {
      return false;
    }
    if (this.active === undefined || this.active === null) {
      return false;
    }
    return true;
  }

  /**
   * Creates a copy of the model
   * @returns A new instance of the model with the same values
   */
  clone(): Role {
    return new Role({...this});
  }
}