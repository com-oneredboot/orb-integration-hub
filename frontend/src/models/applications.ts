/**
 * applications model.
 */
export interface applications {
  application_id: string;
  name: string;
  description: string;
  status: string;
  created_at: number;
  updated_at: number;
  user_id: string;
}