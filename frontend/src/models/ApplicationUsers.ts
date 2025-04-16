/**
 * ApplicationUsers model.
 */
export interface ApplicationUsers {
  application_id: string;
  user_id: string;
  role_id: string;
  status: string;
  created_at: number;
  updated_at: number;
}