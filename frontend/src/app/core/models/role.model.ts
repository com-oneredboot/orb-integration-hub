/**
 * Role Model
 * Generated code - do not modify directly
 */

export interface Role {
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

export class RoleModel implements Role {
  role_id: string = '';
  user_id: string = '';
  application_id: string = '';
  role_name: string = '';
  role_type: string = '';
  permissions: [] = [];
  created_at: number = 0;
  updated_at: number = 0;
  active: boolean = false;

  constructor(data: Partial<Role> = {}) {
    Object.assign(this, data);
  }

  static fromDynamoDB(item: Record<string, any>): Role {
    if (!item) return new RoleModel();

    return new RoleModel({
      'role_id': item['role_id'],
      'user_id': item['user_id'],
      'application_id': item['application_id'],
      'role_name': item['role_name'],
      'role_type': item['role_type'],
      'permissions': item['permissions'],
      'created_at': item['created_at'],
      'updated_at': item['updated_at'],
      'active': item['active'],
    });
  }

  toDynamoDB(): Record<string, any> {
    return {
      'role_id': this.role_id,
      'user_id': this.user_id,
      'application_id': this.application_id,
      'role_name': this.role_name,
      'role_type': this.role_type,
      'permissions': this.permissions,
      'created_at': this.created_at,
      'updated_at': this.updated_at,
      'active': this.active,
    };
  }
}