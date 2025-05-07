/**
 *  model.
 */

// Import enums used in this model

export interface I {
  code: string;
  message: string;
  description: string | undefined;
  details: Record<string, any> | undefined;
}

export class  implements I {
  code: string = '';
  message: string = '';
  description: string | undefined = '';
  details: Record<string, any> | undefined = undefined;

  constructor(data: Partial<I> = {}) {
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
export type Response = {
  statusCode: number;
  message: string;
  data: I | null;
};
