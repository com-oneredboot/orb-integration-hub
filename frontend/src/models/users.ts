/**
 * Users model.
 */
export interface Users {
  user_id: string;
  cognito_id: string;
  email: string;
  phone_number: string;
  phone_verified: string;
  first_name: string;
  last_name: string;
  groups: string;
  status: string;
  created_at: number;
  updated_at: number;
}