/**
 * AuthError static model.
 */

// Import enums and models used in this model

export interface IAuthError {
  code: string;
  message: string;
  description: string | undefined;
  details: Record<string, any> | undefined;
}

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

// Static type definitions
export type AuthErrorResponse = {
  statusCode: number;
  message: string;
  data: IAuthError | null;
}; 