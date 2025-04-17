/**
 * roles model.
 */
export interface Roles {
  role_id: string;
  user_id: string;
  application_id: string;
  role_name: string;
  role_type: string;
  permissions: string;
  created_at: number;
  updated_at: number;
  active: string;
}