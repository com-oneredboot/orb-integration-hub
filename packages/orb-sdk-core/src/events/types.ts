/**
 * Event types for the Orb SDK.
 *
 * @module events/types
 */

import type { AuthTokens, User } from '../auth/types';

/**
 * Authentication state.
 */
export type AuthState =
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: User; tokens: AuthTokens }
  | { status: 'loading' };

/**
 * Callback for auth state changes.
 */
export type AuthStateCallback = (state: AuthState) => void;

/**
 * Function to unsubscribe from events.
 */
export type Unsubscribe = () => void;

/**
 * Event types emitted by the SDK.
 */
export interface EventMap {
  /** Emitted when user signs in */
  signIn: { user: User; tokens: AuthTokens };
  /** Emitted when user signs out */
  signOut: { reason?: string };
  /** Emitted when session expires */
  sessionExpired: { reason: string };
  /** Emitted when tokens are refreshed */
  tokenRefreshed: { tokens: AuthTokens };
  /** Emitted when user profile is updated */
  profileUpdated: { user: User };
  /** Emitted when auth state changes */
  authStateChange: AuthState;
}

/**
 * Event names.
 */
export type EventName = keyof EventMap;

/**
 * Event listener type.
 */
export type EventListener<T extends EventName> = (data: EventMap[T]) => void;
