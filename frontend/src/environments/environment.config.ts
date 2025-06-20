// file: frontend/src/environments/environment.config.ts
// author: Corey Dale Peters  
// date: 2025-06-20
// description: Secure environment variable configuration helper

/**
 * Safely retrieves environment variables with fallback support for development
 * @param key - Environment variable key
 * @param fallback - Fallback value for development (optional)
 * @param required - Whether this variable is required in production
 */
export function getEnvironmentConfig(
  key: string, 
  fallback?: string, 
  required: boolean = true
): string {
  // Check if running in browser environment
  if (typeof window !== 'undefined' && (window as any).__env) {
    // Runtime environment variables (injected by deployment scripts)
    const value = (window as any).__env[key];
    if (value) {
      return value;
    }
  }

  // Build-time environment variables (for development)
  const processValue = process.env?.[key];
  if (processValue) {
    return processValue;
  }

  // Use fallback if provided (development only)
  if (fallback && !isProduction()) {
    console.warn(
      `[Environment Config] Using fallback value for ${key}. ` +
      `Set ${key} environment variable for production.`
    );
    return fallback;
  }

  // Throw error if required variable is missing
  if (required) {
    throw new Error(
      `[Environment Config] Required environment variable ${key} is not set. ` +
      `Please configure ${key} in your deployment environment.`
    );
  }

  return '';
}

/**
 * Checks if the application is running in production mode
 */
function isProduction(): boolean {
  // Check Angular production flag
  if (typeof process !== 'undefined' && process.env?.['NODE_ENV'] === 'production') {
    return true;
  }

  // Check window environment flag (runtime)
  if (typeof window !== 'undefined' && (window as any).__env?.['NODE_ENV'] === 'production') {
    return true;
  }

  return false;
}

/**
 * Validates that all required environment variables are present
 * Call this during app initialization
 */
export function validateEnvironmentConfig(): void {
  const requiredVars = [
    'COGNITO_USER_POOL_ID',
    'COGNITO_CLIENT_ID', 
    'GRAPHQL_API_URL',
    'GRAPHQL_API_KEY',
    'AWS_REGION'
  ];

  const missingVars: string[] = [];

  for (const varName of requiredVars) {
    try {
      getEnvironmentConfig(varName, undefined, true);
    } catch (error) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0 && isProduction()) {
    throw new Error(
      `[Environment Config] Missing required environment variables: ${missingVars.join(', ')}. ` +
      `Please configure these variables in your deployment environment.`
    );
  }

  if (missingVars.length > 0) {
    console.warn(
      `[Environment Config] Missing environment variables: ${missingVars.join(', ')}. ` +
      `Using fallback values for development.`
    );
  }
}

/**
 * Runtime environment variable injection interface
 * This will be populated by deployment scripts
 */
declare global {
  interface Window {
    __env?: {
      [key: string]: string;
    };
  }
}