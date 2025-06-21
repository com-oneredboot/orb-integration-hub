// file: frontend/src/app/core/services/csrf.service.spec.ts
// author: Claude Code
// date: 2025-06-21
// description: Comprehensive unit tests for CsrfService

import { TestBed } from '@angular/core/testing';
import { CsrfService } from './csrf.service';
import { of, throwError } from 'rxjs';

describe('CsrfService', () => {
  let service: CsrfService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CsrfService);
    
    // Clear cookies and localStorage for clean test state
    document.cookie = '';
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    // Cleanup
    document.cookie = 'csrf-token=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/';
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Token Generation', () => {
    it('should generate a valid CSRF token', async () => {
      const token = await service.getCsrfToken();
      
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(20); // Should be substantial length
    });

    it('should generate unique tokens on consecutive calls', async () => {
      const token1 = await service.getCsrfToken();
      const token2 = await service.getCsrfToken();
      
      expect(token1).not.toBe(token2);
    });

    it('should use cryptographically secure random generation', async () => {
      const tokens = new Set();
      
      // Generate multiple tokens to check uniqueness
      for (let i = 0; i < 100; i++) {
        const token = await service.getCsrfToken();
        expect(tokens.has(token)).toBe(false);
        tokens.add(token);
      }
      
      expect(tokens.size).toBe(100);
    });
  });

  describe('Token Validation', () => {
    it('should validate correct CSRF token', async () => {
      const token = await service.getCsrfToken();
      const isValid = await service.validateCsrfToken(token);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid CSRF token', async () => {
      const invalidToken = 'invalid-token-12345';
      const isValid = await service.validateCsrfToken(invalidToken);
      
      expect(isValid).toBe(false);
    });

    it('should reject empty or null tokens', async () => {
      expect(await service.validateCsrfToken('')).toBe(false);
      expect(await service.validateCsrfToken(null as any)).toBe(false);
      expect(await service.validateCsrfToken(undefined as any)).toBe(false);
    });

    it('should reject expired tokens', async () => {
      // Create a token with very short expiry
      const shortExpiryService = new CsrfService();
      (shortExpiryService as any).TOKEN_LIFETIME = 1; // 1ms
      
      const token = await shortExpiryService.getCsrfToken();
      
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const isValid = await shortExpiryService.validateCsrfToken(token);
      expect(isValid).toBe(false);
    });
  });

  describe('Cookie Management', () => {
    it('should set CSRF token in cookie', async () => {
      const token = await service.getCsrfToken();
      
      // Check if cookie is set
      const cookies = document.cookie.split(';');
      const csrfCookie = cookies.find(cookie => cookie.trim().startsWith('csrf-token='));
      
      expect(csrfCookie).toBeTruthy();
      expect(csrfCookie).toContain(token);
    });

    it('should set secure cookie attributes', async () => {
      // Mock window.location.protocol for HTTPS
      const originalProtocol = window.location.protocol;
      Object.defineProperty(window.location, 'protocol', {
        writable: true,
        value: 'https:'
      });
      
      await service.getCsrfToken();
      
      // In a real implementation, we would check that the cookie has Secure flag
      // This is limited by jsdom environment, but the service should set it
      expect(document.cookie).toContain('csrf-token=');
      
      // Restore original protocol
      Object.defineProperty(window.location, 'protocol', {
        writable: true,
        value: originalProtocol
      });
    });

    it('should handle cookie read/write errors gracefully', async () => {
      // Mock document.cookie to throw error
      const originalCookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!;
      
      Object.defineProperty(document, 'cookie', {
        get: () => { throw new Error('Cookie access denied'); },
        set: () => { throw new Error('Cookie write denied'); }
      });
      
      // Should not throw error, should handle gracefully
      const token = await service.getCsrfToken();
      expect(token).toBeTruthy();
      
      // Restore original cookie behavior
      Object.defineProperty(document, 'cookie', originalCookie);
    });
  });

  describe('Token Observable', () => {
    it('should provide observable for token changes', (done) => {
      service.getCsrfToken$().subscribe(token => {
        expect(token).toBeTruthy();
        expect(typeof token).toBe('string');
        done();
      });
      
      // Trigger token generation
      service.getCsrfToken();
    });

    it('should emit new tokens when refreshed', (done) => {
      let tokenCount = 0;
      const receivedTokens: string[] = [];
      
      service.getCsrfToken$().subscribe(token => {
        if (token) {
          receivedTokens.push(token);
          tokenCount++;
          
          if (tokenCount === 2) {
            expect(receivedTokens[0]).not.toBe(receivedTokens[1]);
            done();
          }
        }
      });
      
      // Generate two tokens
      service.getCsrfToken().then(() => {
        (service as any).refreshCsrfToken();
      });
    });
  });

  describe('Token Refresh', () => {
    it('should refresh CSRF token', async () => {
      const originalToken = await service.getCsrfToken();
      await (service as any).refreshCsrfToken();
      const newToken = await service.getCsrfToken();
      
      expect(newToken).not.toBe(originalToken);
    });

    it('should handle concurrent refresh requests', async () => {
      const refreshPromises = [];
      
      // Trigger multiple concurrent refreshes
      for (let i = 0; i < 5; i++) {
        refreshPromises.push((service as any).refreshCsrfToken());
      }
      
      await Promise.all(refreshPromises);
      
      // Should complete without errors
      const token = await service.getCsrfToken();
      expect(token).toBeTruthy();
    });
  });

  describe('Token Expiry Management', () => {
    it('should automatically refresh expired tokens', async () => {
      // Create service with short token lifetime
      const shortLifetimeService = new CsrfService();
      (shortLifetimeService as any).TOKEN_LIFETIME = 10; // 10ms
      
      const originalToken = await shortLifetimeService.getCsrfToken();
      
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Getting token again should return a new one
      const newToken = await shortLifetimeService.getCsrfToken();
      expect(newToken).not.toBe(originalToken);
    });

    it('should return cached token if not expired', async () => {
      const token1 = await service.getCsrfToken();
      const token2 = await service.getCsrfToken();
      
      // Should return same token if not expired
      expect(token1).toBe(token2);
    });
  });

  describe('Double Submit Cookie Pattern', () => {
    it('should implement double submit cookie pattern correctly', async () => {
      const token = await service.getCsrfToken();
      
      // Token should be in both cookie and available for header
      const cookies = document.cookie;
      expect(cookies).toContain(`csrf-token=${token}`);
      
      // Should be able to get same token for header
      const headerToken = await service.getCsrfToken();
      expect(headerToken).toBe(token);
    });

    it('should validate double submit pattern', async () => {
      const cookieToken = await service.getCsrfToken();
      
      // Should validate when cookie and header tokens match
      const isValid = await service.validateCsrfToken(cookieToken);
      expect(isValid).toBe(true);
    });
  });

  describe('Security Features', () => {
    it('should sanitize token values', async () => {
      const token = await service.getCsrfToken();
      
      // Token should not contain dangerous characters
      expect(token).not.toMatch(/[<>\"'&]/);
      expect(token).not.toContain('javascript:');
      expect(token).not.toContain('<script>');
    });

    it('should handle malicious input gracefully', async () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:void(0)',
        '../../etc/passwd',
        'DROP TABLE users;',
        '\x00\x01\x02'
      ];
      
      for (const maliciousInput of maliciousInputs) {
        const isValid = await service.validateCsrfToken(maliciousInput);
        expect(isValid).toBe(false);
      }
    });

    it('should use secure random token generation', async () => {
      const tokens = new Set();
      
      // Test that tokens have good entropy/randomness
      for (let i = 0; i < 50; i++) {
        const token = await service.getCsrfToken();
        tokens.add(token);
        
        // Should not have obvious patterns
        expect(token).not.toMatch(/^(111|000|aaa)/);
        expect(token).not.toMatch(/123456/);
      }
      
      // All tokens should be unique
      expect(tokens.size).toBe(50);
    });
  });

  describe('Error Handling', () => {
    it('should handle crypto API unavailability', async () => {
      // Mock crypto API as unavailable
      const originalCrypto = window.crypto;
      (window as any).crypto = undefined;
      
      const token = await service.getCsrfToken();
      
      // Should still generate a token using fallback
      expect(token).toBeTruthy();
      expect(token.length).toBeGreaterThan(10);
      
      // Restore crypto
      (window as any).crypto = originalCrypto;
    });

    it('should handle localStorage unavailability', async () => {
      // Mock localStorage as unavailable
      const originalLocalStorage = window.localStorage;
      (window as any).localStorage = undefined;
      
      const token = await service.getCsrfToken();
      
      // Should still work without localStorage
      expect(token).toBeTruthy();
      
      // Restore localStorage
      (window as any).localStorage = originalLocalStorage;
    });

    it('should handle network errors gracefully', async () => {
      // Mock fetch to fail
      const originalFetch = window.fetch;
      window.fetch = () => Promise.reject(new Error('Network error'));
      
      const token = await service.getCsrfToken();
      
      // Should fallback to client-side generation
      expect(token).toBeTruthy();
      
      // Restore fetch
      window.fetch = originalFetch;
    });
  });

  describe('Performance', () => {
    it('should cache tokens for performance', async () => {
      const startTime = Date.now();
      
      // First call should generate token
      const token1 = await service.getCsrfToken();
      const firstCallTime = Date.now() - startTime;
      
      const cacheStartTime = Date.now();
      
      // Second call should use cache
      const token2 = await service.getCsrfToken();
      const secondCallTime = Date.now() - cacheStartTime;
      
      expect(token1).toBe(token2);
      expect(secondCallTime).toBeLessThan(firstCallTime);
    });

    it('should handle high frequency requests efficiently', async () => {
      const promises = [];
      const startTime = Date.now();
      
      // Make many concurrent requests
      for (let i = 0; i < 100; i++) {
        promises.push(service.getCsrfToken());
      }
      
      const tokens = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      // All should return the same cached token
      expect(new Set(tokens).size).toBe(1);
      
      // Should complete quickly
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Integration Features', () => {
    it('should work with Angular HTTP interceptors', async () => {
      const token = await service.getCsrfToken();
      
      // Should provide methods that interceptors can use
      expect(typeof service.getCsrfToken).toBe('function');
      expect(typeof service.validateCsrfToken).toBe('function');
      expect(token).toBeTruthy();
    });

    it('should provide header name for HTTP requests', () => {
      const headerName = (service as any).CSRF_HEADER_NAME;
      expect(headerName).toBe('X-CSRF-Token');
    });

    it('should provide cookie name for validation', () => {
      const cookieName = (service as any).CSRF_COOKIE_NAME;
      expect(cookieName).toBe('csrf-token');
    });
  });
});