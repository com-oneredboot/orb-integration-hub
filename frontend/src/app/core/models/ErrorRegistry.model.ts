/**
 * ErrorRegistry model.
 */

// Import enums used in this model

export interface IErrorRegistry {
  code: string;
  message: string;
  description: string;
  solution: string;
  details: string;
}

export class ErrorRegistry implements IErrorRegistry {
  code: string = '';
  message: string = '';
  description: string = '';
  solution: string = '';
  details: string = '';

  constructor(data: Partial<IErrorRegistry> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        {
          this[key as keyof this] = value as any;
        }
      }
    });
  }
}
