/**
 * AuthError model.
 */

// Import enums used in this model

export interface IAuthError {
  code: string;
  message: string;
  description: string | undefined;
  details: Record<string, any> | undefined;
}

export class AuthError implements IAuthError {
  code: string = '';
  message: string = '';
  description: string | undefined = '';
  details: Record<string, any> | undefined = undefined;

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
  statusCode: number;
  message: string;
  data: IAuthError | null;
};
