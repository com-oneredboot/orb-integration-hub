export class OrbitError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'OrbitError';
  }
}

export class ErrorRegistry {
  private static errors: Record<string, string> = {
    'ORB-API-001': 'API request failed',
    'ORB-API-002': 'GraphQL mutation error',
    'ORB-API-003': 'Invalid input for GraphQL operation',
    'ORB-SYS-001': 'Unexpected system error'
  };

  static getErrorMessage(code: string): string {
    return this.errors[code] || 'Unknown error occurred';
  }

  static logError(code: string, context: Record<string, any> = {}): void {
    console.error(`[${code}] ${this.getErrorMessage(code)}`, context);
  }
} 