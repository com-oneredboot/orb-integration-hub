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
  phone_number: string?;
  phone_verified: boolean?;
  first_name: string?;
  last_name: string?;
  groups: [];
  status: UserStatus;
  created_at: timestamp;
  updated_at: timestamp?;
}

// Model Class
export class User implements IUser {
  user_id: string = '';
  cognito_id: string = '';
  email: string = '';
  phone_number: string = '';
  phone_verified: boolean = false;
  first_name: string = '';
  last_name: string = '';
  groups: [] = [];
  status: UserStatus = UserStatus.UNKNOWN;
  created_at: timestamp;
  updated_at: timestamp;

  constructor(data: Partial<IUser> = {}) {
    Object.assign(this, data);
  }
}