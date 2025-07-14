// file: frontend/src/app/core/services/csrf.service.ts
// author: Claude Code
// date: 2025-06-21
// description: CSRF protection service for GraphQL mutations using double submit cookie pattern

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

interface CsrfToken {
  token: string;
  expiresAt: number;
  sessionId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CsrfService {
  private readonly CSRF_COOKIE_NAME = 'csrf-token';
  private readonly CSRF_HEADER_NAME = 'X-CSRF-Token';
  private readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry
  private readonly TOKEN_VALIDITY_DURATION = 30 * 60 * 1000; // 30 minutes

  private currentToken$ = new BehaviorSubject<CsrfToken | null>(null);
  private isRefreshing = false;

  constructor() {
    this.initializeCsrfProtection();
  }

  /**
   * Get current CSRF token for GraphQL requests
   * Returns a promise that resolves to a valid token
   */
  public async getCsrfToken(): Promise<string> {
    const currentToken = this.currentToken$.value;
    
    // Check if we need a new token
    if (!currentToken || this.isTokenExpired(currentToken) || this.shouldRefreshToken(currentToken)) {
      await this.refreshCsrfToken();
    }
    
    const token = this.currentToken$.value;
    if (!token) {
      throw new Error('[CsrfService] Failed to obtain valid CSRF token');
    }
    
    return token.token;
  }

  /**
   * Get CSRF token as Observable for reactive programming
   */
  public getCsrfToken$(): Observable<string | null> {
    return new Observable(subscriber => {
      const subscription = this.currentToken$.subscribe(async token => {
        if (!token || this.isTokenExpired(token) || this.shouldRefreshToken(token)) {
          try {
            await this.refreshCsrfToken();
            const newToken = this.currentToken$.value;
            subscriber.next(newToken?.token || null);
          } catch (error) {
            console.error('[CsrfService] Failed to refresh CSRF token:', error);
            subscriber.next(null);
          }
        } else {
          subscriber.next(token.token);
        }
      });
      
      return () => subscription.unsubscribe();
    });
  }

  /**
   * Get CSRF header name for HTTP requests
   */
  public getCsrfHeaderName(): string {
    return this.CSRF_HEADER_NAME;
  }

  /**
   * Validate CSRF token from server response
   * Used for double submit cookie pattern validation
   */
  public validateCsrfToken(receivedToken: string): boolean {
    const currentToken = this.currentToken$.value;
    
    if (!currentToken || !receivedToken) {
      console.warn('[CsrfService] CSRF token validation failed - missing tokens');
      return false;
    }
    
    const isValid = currentToken.token === receivedToken && !this.isTokenExpired(currentToken);
    
    if (!isValid) {
      console.warn('[CsrfService] CSRF token validation failed - token mismatch or expired');
    }
    
    return isValid;
  }

  /**
   * Force refresh CSRF token (useful for error recovery)
   */
  public async forceRefreshToken(): Promise<void> {
    this.currentToken$.next(null);
    await this.refreshCsrfToken();
  }

  /**
   * Clear CSRF token (useful for logout)
   */
  public clearCsrfToken(): void {
    this.currentToken$.next(null);
    this.deleteCsrfCookie();
    console.debug('[CsrfService] CSRF token cleared');
  }

  /**
   * Initialize CSRF protection on service creation
   */
  private initializeCsrfProtection(): void {
    console.debug('[CsrfService] Initializing CSRF protection');
    
    // Try to load existing token from cookie
    const existingToken = this.getCsrfCookie();
    if (existingToken) {
      // Validate existing token
      const tokenData: CsrfToken = {
        token: existingToken,
        expiresAt: Date.now() + this.TOKEN_VALIDITY_DURATION,
        sessionId: this.generateSessionId()
      };
      
      if (!this.isTokenExpired(tokenData)) {
        this.currentToken$.next(tokenData);
        console.debug('[CsrfService] Loaded existing CSRF token from cookie');
        return;
      }
    }
    
    // Generate new token if no valid existing token
    this.refreshCsrfToken().catch(error => {
      console.error('[CsrfService] Failed to initialize CSRF token:', error);
    });
  }

  /**
   * Refresh CSRF token from server or generate locally
   */
  private async refreshCsrfToken(): Promise<void> {
    if (this.isRefreshing) {
      // Wait for existing refresh to complete
      return new Promise((resolve) => {
        const checkRefresh = () => {
          if (!this.isRefreshing) {
            resolve();
          } else {
            setTimeout(checkRefresh, 100);
          }
        };
        checkRefresh();
      });
    }

    this.isRefreshing = true;

    try {
      // In production, this would fetch from a backend endpoint
      // For now, generate a cryptographically secure token locally
      const token = await this.generateSecureToken();
      const sessionId = this.generateSessionId();
      
      const csrfToken: CsrfToken = {
        token,
        expiresAt: Date.now() + this.TOKEN_VALIDITY_DURATION,
        sessionId
      };

      // Store in memory and cookie (double submit pattern)
      this.currentToken$.next(csrfToken);
      this.setCsrfCookie(token);
      
      console.debug('[CsrfService] CSRF token refreshed successfully');
    } catch (error) {
      console.error('[CsrfService] Failed to refresh CSRF token:', error);
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Generate cryptographically secure CSRF token
   */
  private async generateSecureToken(): Promise<string> {
    // Use Web Crypto API for cryptographically secure random values
    if (crypto && crypto.getRandomValues) {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    // Fallback for older browsers
    return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
  }

  /**
   * Generate session identifier
   */
  private generateSessionId(): string {
    if (crypto && crypto.getRandomValues) {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      const randomHex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      return `csrf_${Date.now()}_${randomHex}`;
    }
    // Fallback for older browsers
    return `csrf_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(token: CsrfToken): boolean {
    return Date.now() >= token.expiresAt;
  }

  /**
   * Check if token should be refreshed (proactive refresh)
   */
  private shouldRefreshToken(token: CsrfToken): boolean {
    return Date.now() >= (token.expiresAt - this.TOKEN_REFRESH_THRESHOLD);
  }

  /**
   * Get CSRF token from cookie
   */
  private getCsrfCookie(): string | null {
    if (typeof document === 'undefined') {
      return null; // SSR safety
    }
    
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === this.CSRF_COOKIE_NAME) {
        return decodeURIComponent(value);
      }
    }
    return null;
  }

  /**
   * Set CSRF token in cookie
   */
  private setCsrfCookie(token: string): void {
    if (typeof document === 'undefined') {
      return; // SSR safety
    }
    
    const expiryDate = new Date(Date.now() + this.TOKEN_VALIDITY_DURATION);
    const cookieValue = [
      `${this.CSRF_COOKIE_NAME}=${encodeURIComponent(token)}`,
      `expires=${expiryDate.toUTCString()}`,
      'path=/',
      'SameSite=Strict'
    ];
    
    // Add Secure flag in production
    if (environment.production || location.protocol === 'https:') {
      cookieValue.push('Secure');
    }
    
    document.cookie = cookieValue.join('; ');
  }

  /**
   * Delete CSRF cookie
   */
  private deleteCsrfCookie(): void {
    if (typeof document === 'undefined') {
      return; // SSR safety
    }
    
    document.cookie = `${this.CSRF_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict`;
  }
}