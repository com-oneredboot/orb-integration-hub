// src/app/models/auth.models.ts
export interface SignInCredentials {
  username: string;
  password: string;
}

export interface SignInResponse {
  success: boolean;
  user?: any;
  error?: string;
  role?: string;
}
