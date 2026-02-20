/**
 * GraphQL Type Definitions
 *
 * Standardized types for GraphQL API responses following v0.19.0 format.
 * These types match the response envelope structure from orb-schema-generator.
 *
 * @see .kiro/specs/graphql-service-cleanup/design.md
 */

/**
 * Connection type for paginated list queries.
 * Follows the GraphQL connection pattern with items and pagination token.
 */
export interface Connection<T> {
  /** Array of items in the current page */
  items: T[];
  /** Token for fetching the next page, null if no more pages */
  nextToken: string | null;
}

/**
 * Response envelope from v0.19.0 GraphQL schema.
 * All GraphQL operations return this envelope structure.
 *
 * - Mutations: { code, success, message, item }
 * - Get queries: { code, success, message, item }
 * - List queries: { code, success, message, items, nextToken }
 */
export interface GraphQLResponseEnvelope<T> {
  /** HTTP-like status code (200 for success, 4xx/5xx for errors) */
  code: number;
  /** Whether the operation succeeded */
  success: boolean;
  /** Optional message (error message on failure, success message on success) */
  message?: string;
  /** Single item for mutations and Get queries */
  item?: T;
  /** Array of items for List queries */
  items?: T[];
  /** Pagination token for List queries */
  nextToken?: string;
}

/**
 * GraphQL error structure from AppSync
 */
export interface GraphQLError {
  /** Error message */
  message: string;
  /** Error type/code from AppSync */
  errorType?: string;
  /** Error info from AppSync */
  errorInfo?: unknown;
  /** Path to the field that caused the error */
  path?: string[];
  /** Location in the query where the error occurred */
  locations?: { line: number; column: number }[];
}

/**
 * Auth mode for GraphQL operations
 */
export type AuthMode = 'userPool' | 'apiKey' | 'iam' | 'oidc' | 'lambda';

/**
 * Generic GraphQL result type matching AWS Amplify's GraphQLResult
 */
export interface GraphQLResult<T> {
  data?: T;
  errors?: GraphQLError[];
  extensions?: Record<string, unknown>;
}
