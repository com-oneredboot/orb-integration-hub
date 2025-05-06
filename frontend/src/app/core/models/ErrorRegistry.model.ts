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
        if (Array.isArray(value) && this[key] instanceof Array && this[key].length === 0) {
          this[key] = value as typeof this[key];
        } else if (typeof value === 'string' && this[key] instanceof Object && 'UNKNOWN' in this[key]) {
          this[key] = (this[key] as any)[value] || (this[key] as any).UNKNOWN;
        } else {
          this[key] = value as any;
        }
      }
    });
  }
}
