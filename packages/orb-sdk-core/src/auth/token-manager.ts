/**
 * Token manager for handling authentication tokens.
 *
 * Responsibilities:
 * - Store and retrieve tokens
 * - Check token expiration
 * - Refresh tokens before expiry
 * - Emit events on token changes
 *
 * @module auth/token-manager
 */

import { jwtDecode } from 'jwt-decode';
import type { AuthTokens } from './types';
import type { TokenStorage } from './token-storage';
import { MemoryTokenStorage } from './token-storage';
import { AuthenticationError, ErrorCode } from '../errors/errors';
import type { EventEmitter } from '../events/event-emitter';

/**
 * JWT payload structure.
 */
interface JwtPayload {
  exp: number;
  iat: number;
  sub: string;
  [key: string]: unknown;
}

/**
 * Token refresh function type.
 */
export type TokenRefreshFn = (refreshToken: string) => Promise<AuthTokens>;

/**
 * Token manager configuration.
 */
export interface TokenManagerConfig {
  /** Token storage implementation */
  storage?: TokenStorage | undefined;
  /** Event emitter for auth events */
  eventEmitter?: EventEmitter | undefined;
  /** Refresh tokens this many seconds before expiry */
  refreshThresholdSeconds?: number | undefined;
  /** Function to refresh tokens */
  refreshFn?: TokenRefreshFn | undefined;
}

/**
 * Manages authentication tokens including storage, refresh, and expiration.
 *
 * @example
 * ```typescript
 * const tokenManager = new TokenManager({
 *   storage: new LocalStorageTokenStorage(),
 *   refreshFn: async (refreshToken) => {
 *     // Call Cognito to refresh tokens
 *   },
 * });
 *
 * // Store tokens after sign in
 * await tokenManager.storeTokens(tokens);
 *
 * // Get current tokens
 * const tokens = await tokenManager.getTokens();
 *
 * // Start auto-refresh
 * tokenManager.startAutoRefresh();
 * ```
 */
export class TokenManager {
  private readonly storage: TokenStorage;
  private readonly eventEmitter?: EventEmitter;
  private readonly refreshThresholdSeconds: number;
  private refreshFn?: TokenRefreshFn | undefined;
  private refreshTimer?: ReturnType<typeof setTimeout> | undefined;
  private isRefreshing = false;

  constructor(config: TokenManagerConfig = {}) {
    this.storage = config.storage ?? new MemoryTokenStorage();
    this.eventEmitter = config.eventEmitter;
    this.refreshThresholdSeconds = config.refreshThresholdSeconds ?? 300; // 5 minutes
    this.refreshFn = config.refreshFn;
  }

  /**
   * Set the token refresh function.
   */
  setRefreshFn(fn: TokenRefreshFn): void {
    this.refreshFn = fn;
  }

  /**
   * Store authentication tokens.
   */
  async storeTokens(tokens: AuthTokens): Promise<void> {
    await this.storage.setTokens(tokens);
    this.eventEmitter?.emit('tokenRefreshed', { tokens });
  }

  /**
   * Get stored authentication tokens.
   */
  async getTokens(): Promise<AuthTokens | null> {
    return this.storage.getTokens();
  }

  /**
   * Clear stored tokens.
   */
  async clearTokens(): Promise<void> {
    this.stopAutoRefresh();
    await this.storage.clearTokens();
  }

  /**
   * Check if the access token is expired.
   */
  async isTokenExpired(): Promise<boolean> {
    const tokens = await this.getTokens();
    if (tokens === null) {
      return true;
    }

    try {
      const decoded = jwtDecode<JwtPayload>(tokens.accessToken);
      const now = Math.floor(Date.now() / 1000);
      return decoded.exp <= now;
    } catch {
      return true;
    }
  }

  /**
   * Get the time until the access token expires in seconds.
   */
  async getTimeUntilExpiry(): Promise<number> {
    const tokens = await this.getTokens();
    if (tokens === null) {
      return 0;
    }

    try {
      const decoded = jwtDecode<JwtPayload>(tokens.accessToken);
      const now = Math.floor(Date.now() / 1000);
      return Math.max(0, decoded.exp - now);
    } catch {
      return 0;
    }
  }

  /**
   * Refresh the authentication tokens.
   *
   * @throws {AuthenticationError} If refresh fails
   */
  async refreshTokens(): Promise<AuthTokens> {
    if (this.refreshFn === undefined) {
      throw new AuthenticationError(
        'Token refresh function not configured',
        ErrorCode.TOKEN_REFRESH_FAILED
      );
    }

    if (this.isRefreshing) {
      // Wait for ongoing refresh to complete
      const tokens = await this.waitForRefresh();
      if (tokens !== null) {
        return tokens;
      }
      throw new AuthenticationError(
        'Token refresh failed',
        ErrorCode.TOKEN_REFRESH_FAILED
      );
    }

    this.isRefreshing = true;

    try {
      const currentTokens = await this.getTokens();
      if (currentTokens === null) {
        throw new AuthenticationError(
          'No tokens to refresh',
          ErrorCode.SESSION_EXPIRED,
          { suggestion: 'Please sign in again.' }
        );
      }

      const newTokens = await this.refreshFn(currentTokens.refreshToken);
      await this.storeTokens(newTokens);
      return newTokens;
    } catch (error) {
      this.eventEmitter?.emit('sessionExpired', {
        reason: error instanceof Error ? error.message : 'Token refresh failed',
      });
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Start automatic token refresh.
   *
   * Tokens will be refreshed before they expire based on refreshThresholdSeconds.
   */
  startAutoRefresh(): void {
    this.stopAutoRefresh();
    void this.scheduleRefresh();
  }

  /**
   * Stop automatic token refresh.
   */
  stopAutoRefresh(): void {
    if (this.refreshTimer !== undefined) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  /**
   * Get the access token, refreshing if necessary.
   */
  async getAccessToken(): Promise<string | null> {
    const tokens = await this.getTokens();
    if (tokens === null) {
      return null;
    }

    const timeUntilExpiry = await this.getTimeUntilExpiry();
    if (timeUntilExpiry <= this.refreshThresholdSeconds) {
      try {
        const newTokens = await this.refreshTokens();
        return newTokens.accessToken;
      } catch {
        // If refresh fails, return current token if not expired
        if (timeUntilExpiry > 0) {
          return tokens.accessToken;
        }
        return null;
      }
    }

    return tokens.accessToken;
  }

  /**
   * Schedule the next token refresh.
   */
  private async scheduleRefresh(): Promise<void> {
    const timeUntilExpiry = await this.getTimeUntilExpiry();
    if (timeUntilExpiry <= 0) {
      return;
    }

    // Refresh before expiry
    const refreshIn = Math.max(
      0,
      (timeUntilExpiry - this.refreshThresholdSeconds) * 1000
    );

    this.refreshTimer = setTimeout(() => {
      void this.performScheduledRefresh();
    }, refreshIn);
  }

  /**
   * Perform a scheduled token refresh.
   */
  private async performScheduledRefresh(): Promise<void> {
    try {
      await this.refreshTokens();
      await this.scheduleRefresh();
    } catch {
      // Refresh failed, session expired event already emitted
    }
  }

  /**
   * Wait for an ongoing refresh to complete.
   */
  private async waitForRefresh(): Promise<AuthTokens | null> {
    const maxWait = 10000; // 10 seconds
    const checkInterval = 100; // 100ms
    let waited = 0;

    while (this.isRefreshing && waited < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    return this.getTokens();
  }
}
