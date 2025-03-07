// file: frontend/src/app/core/models/role.model.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: TypeScript file

/**
 * Role Model
 * Generated code - do not modify directly
 */

export interface IRole {
  role_id: string;
  user_id: string;
  application_id: string;
  role_name: string;
  role_type: string;
  permissions: [];
  created_at: number;
  updated_at: number;
  active: boolean;
}

export class Role implements IRole {
  role_id: string = '';
  user_id: string = '';
  application_id: string = '';
  role_name: string = '';
  role_type: string = '';
  permissions: [] = [];
  created_at: number = 0;
  updated_at: number = 0;
  active: boolean = false;

  constructor(data: Partial<IRole> = {}) {
    Object.assign(this, data);
  }
}