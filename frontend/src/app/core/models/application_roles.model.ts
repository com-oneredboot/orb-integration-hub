/**
 * Application_role Model
 * Generated code - do not modify directly
 * @generated
 */






  
  

  
  

  
  

  
    
  
  

  
  

  
  



// Import enum types
import { ApplicationRoleStatus } from './application_role.enum';


// Interface
export interface IApplication_role {
  application_id: string;
  role_id: string;
  description: string?;
  status: ApplicationRoleStatus;
  created_at: timestamp;
  updated_at: timestamp;
}

// Model Class
export class Application_role implements IApplication_role {
  application_id: string = '';
  role_id: string = '';
  description: string = '';
  status: ApplicationRoleStatus = ApplicationRoleStatus.UNKNOWN;
  created_at: timestamp;
  updated_at: timestamp;

  constructor(data: Partial<IApplication_role> = {}) {
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
    
    
    if (this.application_id === undefined || this.application_id === null) {
      return false;
    }
    
    
    
    
    
    if (this.role_id === undefined || this.role_id === null) {
      return false;
    }
    
    
    
    
    
    
    
    if (this.status === undefined || this.status === null) {
      return false;
    }
    
    
    if (!Object.values(ApplicationRoleStatus).includes(this.status)) {
      return false;
    }
    
    
    
    
    if (this.created_at === undefined || this.created_at === null) {
      return false;
    }
    
    
    
    
    
    if (this.updated_at === undefined || this.updated_at === null) {
      return false;
    }
    
    
    
    
    return true;
  }

  /**
   * Creates a copy of the model
   * @returns A new instance of the model with the same values
   */
  clone(): Application_role {
    return new Application_role({...this});
  }
}