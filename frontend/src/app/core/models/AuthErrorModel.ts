/**
 * AuthError standard model.
 * Generated at 2025-06-09T21:46:13.265314
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
  statusCode: number;
  message: string;
  data: IAuthError | null;
};
