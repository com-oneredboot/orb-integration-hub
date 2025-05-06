/**
 * AuthError model.
 */

// Import enums used in this model

export interface IAuthError {
  code: string;
  message: string;
  description: string;
  details: string;
}

export class AuthError implements IAuthError {
  code: string = '';
  message: string = '';
  description: string = '';
  details: string = '';

  constructor(data: Partial<IAuthError> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        {
          this[key as keyof this] = value as any;
        }
      }
    });
  }
}
// Response envelope for GraphQL type
export type AuthErrorResponse = {
  StatusCode: number;
  Message: string;
  Data: IAuthError | null;
};
