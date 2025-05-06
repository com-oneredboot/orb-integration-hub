import { IErrorRegistry } from './ErrorRegistry.model';

// Example error registry map (expand as needed)
const ERROR_REGISTRY: Record<string, IErrorRegistry> = {
  'ORB-API-002': {
    code: 'ORB-API-002',
    message: 'A problem occurred while processing your request.',
    description: 'GraphQL mutation error',
    solution: 'Check the mutation input and try again.',
    details: ''
  },
  'ORB-API-003': {
    code: 'ORB-API-003',
    message: 'Invalid input for operation.',
    description: 'Invalid input for GraphQL operation',
    solution: 'Check the input and try again.',
    details: ''
  },
  'ORB-SYS-001': {
    code: 'ORB-SYS-001',
    message: 'An unexpected system error occurred.',
    description: 'Unexpected error',
    solution: 'Try again later or contact support.',
    details: ''
  }
};

export class ErrorRegistryUtil {
  static logError(code: string, details?: any): void {
    // In production, send to a logging service
    const error = ERROR_REGISTRY[code];
    // eslint-disable-next-line no-console
    console.error(`[${code}] ${error?.description || 'Unknown error'}`, details);
  }

  static getErrorMessage(code: string): string {
    return ERROR_REGISTRY[code]?.message || 'An unknown error occurred.';
  }
} 