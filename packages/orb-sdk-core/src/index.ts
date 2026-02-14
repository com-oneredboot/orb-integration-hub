/**
 * @orb/sdk-core - Core TypeScript SDK for orb-integration-hub
 *
 * This package provides authentication, authorization, and API client
 * functionality for integrating with the orb-integration-hub platform.
 *
 * @packageDocumentation
 */

// Main client
export { OrbClient } from './client/orb-client';
export type { OrbClientConfig } from './client/orb-client';

// Auth module
export { AuthModule } from './auth/auth-module';
export type {
  SignUpParams,
  SignUpResult,
  SignInParams,
  SignInResult,
  MFASetupResult,
  AuthTokens,
  AuthSession,
} from './auth/types';

// Token manager
export { TokenManager } from './auth/token-manager';
export type { TokenStorage } from './auth/token-storage';

// Authorization module
export { AuthorizationModule } from './authorization/authorization-module';
export type { UserRole, OrgRole } from './authorization/types';

// Errors
export {
  OrbError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NetworkError,
  ServiceUnavailableError,
} from './errors/errors';

// Event emitter
export { EventEmitter } from './events/event-emitter';
export type { AuthState, AuthStateCallback, Unsubscribe } from './events/types';

// Version
export const VERSION = '1.0.0';
