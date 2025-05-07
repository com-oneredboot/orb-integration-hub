/**
 * ErrorRegistry static model.
 */

// Import enums and models used in this model

export interface IErrorRegistry {
  code: string;
  message: string;
  description: string;
  solution: string;
  details: Record<string, any> | undefined;
}

export class ErrorRegistry implements IErrorRegistry {
  code = '';
  message = '';
  description = '';
  solution = '';
  details = {};

  constructor(data: Partial<IErrorRegistry> = {}) {
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
export type ErrorRegistryResponse = {
  statusCode: number;
  message: string;
  data: IErrorRegistry | null;
}; 