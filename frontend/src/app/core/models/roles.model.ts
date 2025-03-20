/**
 * Role Model
 * Generated code - do not modify directly
 * @generated
 */






  
  

  
  

  
  

  
  

  
  

  
  

  
  

  
  

  
  




// Interface
export interface IRole {
  role_id: string;
  user_id: string;
  application_id: string;
  role_name: string;
  role_type: string;
  permissions: [];
  created_at: timestamp;
  updated_at: timestamp;
  active: boolean;
}

// Model Class
export class Role implements IRole {
  role_id: string = '';
  user_id: string = '';
  application_id: string = '';
  role_name: string = '';
  role_type: string = '';
  permissions: [] = [];
  created_at: timestamp;
  updated_at: timestamp;
  active: boolean = false;

  constructor(data: Partial<IRole> = {}) {
    Object.assign(this, data);
  }
}