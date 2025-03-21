/**
 * Application_user Model
 * Generated code - do not modify directly
 * @generated
 */






  
  

  
  

  
    
  
  

  
  

  
  



// Import enum types
import { ApplicationUserStatus } from './application_user.enum';


// Interface
export interface IApplication_user {
  application_id: string;
  user_id: string;
  status: ApplicationUserStatus;
  created_at: timestamp;
  updated_at: timestamp?;
}

// Model Class
export class Application_user implements IApplication_user {
  application_id: string = '';
  user_id: string = '';
  status: ApplicationUserStatus = ApplicationUserStatus.UNKNOWN;
  created_at: timestamp;
  updated_at: timestamp;

  constructor(data: Partial<IApplication_user> = {}) {
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
    
    
    
    
    
    if (this.user_id === undefined || this.user_id === null) {
      return false;
    }
    
    
    
    
    
    if (this.status === undefined || this.status === null) {
      return false;
    }
    
    
    if (!Object.values(ApplicationUserStatus).includes(this.status)) {
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
  clone(): Application_user {
    return new Application_user({...this});
  }
}