/**
 * Token storage interface and implementations.
 *
 * @module auth/token-storage
 */

import type { AuthTokens } from './types';

/**
 * Interface for token storage implementations.
 *
 * Allows customization of how tokens are stored (localStorage, sessionStorage,
 * secure storage, etc.)
 */
export interface TokenStorage {
  /**
   * Store tokens.
   * @param tokens - The tokens to store
   */
  setTokens(tokens: AuthTokens): Promise<void>;

  /**
   * Retrieve stored tokens.
   * @returns The stored tokens or null if not found
   */
  getTokens(): Promise<AuthTokens | null>;

  /**
   * Clear stored tokens.
   */
  clearTokens(): Promise<void>;
}

/**
 * In-memory token storage.
 *
 * Tokens are lost when the page is refreshed. Useful for testing
 * or when persistence is not desired.
 */
export class MemoryTokenStorage implements TokenStorage {
  private tokens: AuthTokens | null = null;

  async setTokens(tokens: AuthTokens): Promise<void> {
    this.tokens = tokens;
  }

  async getTokens(): Promise<AuthTokens | null> {
    return this.tokens;
  }

  async clearTokens(): Promise<void> {
    this.tokens = null;
  }
}

/**
 * LocalStorage token storage.
 *
 * Tokens persist across page refreshes and browser sessions.
 * Note: Not suitable for sensitive applications as localStorage
 * is accessible to JavaScript.
 */
export class LocalStorageTokenStorage implements TokenStorage {
  private readonly key: string;

  constructor(key: string = 'orb_auth_tokens') {
    this.key = key;
  }

  async setTokens(tokens: AuthTokens): Promise<void> {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage is not available');
    }
    localStorage.setItem(this.key, JSON.stringify(tokens));
  }

  async getTokens(): Promise<AuthTokens | null> {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    const stored = localStorage.getItem(this.key);
    if (stored === null) {
      return null;
    }
    try {
      return JSON.parse(stored) as AuthTokens;
    } catch {
      return null;
    }
  }

  async clearTokens(): Promise<void> {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.removeItem(this.key);
  }
}

/**
 * SessionStorage token storage.
 *
 * Tokens persist across page refreshes but are cleared when
 * the browser tab is closed.
 */
export class SessionStorageTokenStorage implements TokenStorage {
  private readonly key: string;

  constructor(key: string = 'orb_auth_tokens') {
    this.key = key;
  }

  async setTokens(tokens: AuthTokens): Promise<void> {
    if (typeof sessionStorage === 'undefined') {
      throw new Error('sessionStorage is not available');
    }
    sessionStorage.setItem(this.key, JSON.stringify(tokens));
  }

  async getTokens(): Promise<AuthTokens | null> {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }
    const stored = sessionStorage.getItem(this.key);
    if (stored === null) {
      return null;
    }
    try {
      return JSON.parse(stored) as AuthTokens;
    } catch {
      return null;
    }
  }

  async clearTokens(): Promise<void> {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    sessionStorage.removeItem(this.key);
  }
}
