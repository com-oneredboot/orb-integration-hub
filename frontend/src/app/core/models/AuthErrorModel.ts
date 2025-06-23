/**
 * AuthError standard model.
 * Generated at 2025-06-23T16:03:31.442034
 */

// Import enums and models used in this model

// Interface definition
export interface IAuthError {
  code: string;
  message: string;
  description: string | undefined;
  details: Record<string, any> | undefined;
}

// Class definition
export class AuthError implements IAuthError {
  code = '';
  message = '';
  description = '';
  details = {};

  constructor(data: Partial<IAuthError> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        {
          this[key as keyof this] = value as this[keyof this];
        }
      }
    });
  }
}

// Response type
export type AuthErrorResponse = {
  StatusCode: number;
  Message: string;
  Data: AuthError | null;
};
