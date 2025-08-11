/**
 * AuthError standard model.
 * Generated at 2025-08-10T00:38:12.017422+00:00
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
