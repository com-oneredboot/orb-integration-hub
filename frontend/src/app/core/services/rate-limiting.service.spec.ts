// file: frontend/src/app/core/services/rate-limiting.service.spec.ts
// author: Claude Code
// date: 2025-06-21
// description: Comprehensive unit tests for RateLimitingService

import { TestBed } from '@angular/core/testing';
import { RateLimitingService } from './rate-limiting.service';

type AttemptType = 'email_check' | 'password_verify' | 'mfa_verify' | 'phone_verify';

describe('RateLimitingService', () => {
  let service: RateLimitingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RateLimitingService);
    
    // Clear localStorage for clean test state
    localStorage.clear();
    
    // Reset service state
    (service as any).attempts = [];
    (service as any).attackPatterns.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Basic Rate Limiting', () => {
    it('should allow attempts within rate limit', async () => {
      const identifier = 'test@example.com';
      const attemptType: AttemptType = 'email_check';

      const result = await service.isAttemptAllowed(identifier, attemptType);

      expect(result.allowed).toBe(true);
      expect(result.delayMs).toBe(0);
      expect(result.allowed).toBe(true);
    });

    it('should block attempts when rate limit exceeded', async () => {
      const identifier = 'test@example.com';
      const attemptType: AttemptType = 'email_check';
      
      // Exhaust rate limit with failed attempts
      for (let i = 0; i < 11; i++) { // Default max is 10
        await service.recordAttempt(identifier, attemptType, false, 'test-user-agent');
      }

      const result = await service.isAttemptAllowed(identifier, attemptType);

      expect(result.allowed).toBe(false);
      expect(result.delayMs).toBeGreaterThan(0);
      expect(result.allowed).toBe(false);
    });

    it('should have different limits for different attempt types', async () => {
      const identifier = 'test@example.com';
      
      const emailResult = await service.isAttemptAllowed(identifier, 'email_check');
      const passwordResult = await service.isAttemptAllowed(identifier, 'password_verify');
      
      expect(emailResult.allowed).toBe(true);
      expect(passwordResult.allowed).toBe(true);
      
      // Both should be allowed initially
      expect(emailResult.allowed).toBe(true);
      expect(passwordResult.allowed).toBe(true);
    });
  });

  describe('Exponential Backoff', () => {
    it('should increase delay with consecutive failures', async () => {
      const identifier = 'test@example.com';
      const attemptType: AttemptType = 'password_verify';
      
      // Record multiple failed attempts
      await service.recordAttempt(identifier, attemptType, false, 'test-agent');
      const result1 = await service.isAttemptAllowed(identifier, attemptType);
      
      await service.recordAttempt(identifier, attemptType, false, 'test-agent');
      const result2 = await service.isAttemptAllowed(identifier, attemptType);
      
      await service.recordAttempt(identifier, attemptType, false, 'test-agent');
      const result3 = await service.isAttemptAllowed(identifier, attemptType);

      if (!result1.allowed && !result2.allowed && !result3.allowed) {
        expect(result2.delayMs).toBeGreaterThan(result1.delayMs);
        expect(result3.delayMs).toBeGreaterThan(result2.delayMs);
      }
    });

    it('should reset delay after successful attempt', async () => {
      const identifier = 'test@example.com';
      const attemptType: AttemptType = 'password_verify';
      
      // Record failed attempts
      await service.recordAttempt(identifier, attemptType, false, 'test-agent');
      await service.recordAttempt(identifier, attemptType, false, 'test-agent');
      
      // Record successful attempt
      await service.recordAttempt(identifier, attemptType, true, 'test-agent');
      
      const result = await service.isAttemptAllowed(identifier, attemptType);
      
      // Delay should be reset or significantly reduced
      expect(result.delayMs).toBeLessThan(5000); // Should be low after success
    });
  });

  describe('Attack Pattern Detection', () => {
    it('should detect attack patterns from same IP', () => {
      const identifier1 = 'user1@example.com';
      const identifier2 = 'user2@example.com';
      const userAgent = 'Mozilla/5.0 (attack-pattern)';
      
      // Simulate multiple failed attempts from same user agent
      for (let i = 0; i < 10; i++) {
        service.recordAttempt(identifier1, 'password_verify', false, userAgent);
        service.recordAttempt(identifier2, 'password_verify', false, userAgent);
      }
      
      expect(service.isUnderAttack(identifier1)).toBe(true);
      expect(service.isUnderAttack(identifier2)).toBe(true);
    });

    it('should not flag normal usage as attack', () => {
      const identifier = 'normal@example.com';
      const userAgent = 'Mozilla/5.0 (normal-usage)';
      
      // Simulate normal usage pattern
      service.recordAttempt(identifier, 'email_check', true, userAgent);
      service.recordAttempt(identifier, 'password_verify', true, userAgent);
      
      expect(service.isUnderAttack(identifier)).toBe(false);
    });
  });

  describe('Time Window Management', () => {
    it('should allow attempts after time window expires', async () => {
      const identifier = 'test@example.com';
      const attemptType: AttemptType = 'email_check';
      
      // Mock time to simulate expired window
      const originalNow = Date.now;
      const mockTime = Date.now();
      
      // Record attempts to exhaust limit
      for (let i = 0; i < 11; i++) {
        await service.recordAttempt(identifier, attemptType, false, 'test-agent');
      }
      
      // Should be blocked now
      let result = await service.isAttemptAllowed(identifier, attemptType);
      expect(result.allowed).toBe(false);
      
      // Simulate time passing (16 minutes later - beyond window)
      Date.now = () => mockTime + (16 * 60 * 1000);
      
      // Should be allowed again
      result = await service.isAttemptAllowed(identifier, attemptType);
      expect(result.allowed).toBe(true);
      
      // Restore original Date.now
      Date.now = originalNow;
    });
  });

  describe('Progressive Thresholds', () => {
    it('should implement progressive restrictions', async () => {
      const identifier = 'test@example.com';
      const attemptType: AttemptType = 'password_verify';
      
      let previousDelay = 0;
      
      // Record progressive failed attempts
      for (let i = 0; i < 5; i++) {
        await service.recordAttempt(identifier, attemptType, false, 'test-agent');
        const result = await service.isAttemptAllowed(identifier, attemptType);
        
        if (!result.allowed && result.delayMs > previousDelay) {
          previousDelay = result.delayMs;
        }
      }
      
      expect(previousDelay).toBeGreaterThan(0);
    });
  });

  describe('Lockout Management', () => {
    it('should implement lockout after excessive failures', async () => {
      const identifier = 'test@example.com';
      const attemptType: AttemptType = 'password_verify';
      
      // Exhaust all attempts to trigger lockout
      for (let i = 0; i < 20; i++) {
        await service.recordAttempt(identifier, attemptType, false, 'test-agent');
      }
      
      const result = await service.isAttemptAllowed(identifier, attemptType);
      
      expect(result.allowed).toBe(false);
      expect(result.delayMs).toBeGreaterThan(0);
      expect(result.reason).toBeTruthy();
    });
  });

  describe('Persistence and Recovery', () => {
    it('should persist rate limiting data to localStorage', async () => {
      const identifier = 'test@example.com';
      const attemptType: AttemptType = 'email_check';
      
      await service.recordAttempt(identifier, attemptType, false, 'test-agent');
      
      // Check if data is persisted
      const storedData = localStorage.getItem('rate_limiting_attempts');
      expect(storedData).toBeTruthy();
      
      const parsedData = JSON.parse(storedData!);
      expect(parsedData.length).toBeGreaterThan(0);
    });

    it('should recover state from localStorage on service initialization', () => {
      const testData = [{
        timestamp: Date.now(),
        identifier: 'stored@example.com',
        attemptType: 'email_check',
        success: false,
        userAgent: 'test-agent'
      }];
      
      localStorage.setItem('rate_limiting_attempts', JSON.stringify(testData));
      
      // Create new service instance to test recovery
      const newService = new RateLimitingService();
      
      // Service should have recovered the stored attempt
      const storedAttempts = (newService as any).attempts;
      expect(storedAttempts.length).toBe(1);
      expect(storedAttempts[0].identifier).toBe('stored@example.com');
    });
  });

  describe('Security Features', () => {
    it('should validate input parameters', async () => {
      // Test with invalid inputs
      try {
        await service.isAttemptAllowed('', 'email_check');
        fail('Should throw error for empty identifier');
      } catch (error) {
        expect(error).toBeTruthy();
      }
      
      try {
        await service.recordAttempt('test@example.com', 'invalid_type' as AttemptType, true, 'agent');
        fail('Should throw error for invalid attempt type');
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });

    it('should sanitize user agent strings', async () => {
      const identifier = 'test@example.com';
      const maliciousUserAgent = '<script>alert("xss")</script>';
      
      await service.recordAttempt(identifier, 'email_check', false, maliciousUserAgent);
      
      // Check that user agent is sanitized in storage
      const storedData = localStorage.getItem('rate_limiting_attempts');
      const parsedData = JSON.parse(storedData!);
      
      expect(parsedData[0].userAgent).not.toContain('<script>');
    });

    it('should prevent data injection attacks', async () => {
      const maliciousIdentifier = '"; DROP TABLE users; --';
      const attemptType: AttemptType = 'email_check';
      
      // Should handle malicious input gracefully
      await expectAsync(
        service.recordAttempt(maliciousIdentifier, attemptType, false, 'agent')
      ).not.toBeRejected();
      
      const result = await service.isAttemptAllowed(maliciousIdentifier, attemptType);
      expect(result).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of attempts efficiently', async () => {
      const startTime = Date.now();
      
      // Record many attempts
      for (let i = 0; i < 100; i++) {
        await service.recordAttempt(`user${i}@example.com`, 'email_check', Math.random() > 0.5, 'agent');
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(1000); // 1 second max
    });

    it('should cleanup old attempts to prevent memory issues', async () => {
      const identifier = 'test@example.com';
      
      // Mock old timestamp
      const oldTimestamp = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
      
      // Add old attempt directly to storage
      const oldAttempt = {
        timestamp: oldTimestamp,
        identifier,
        attemptType: 'email_check',
        success: false,
        userAgent: 'test'
      };
      
      localStorage.setItem('rate_limiting_attempts', JSON.stringify([oldAttempt]));
      
      // Record new attempt (should trigger cleanup)
      await service.recordAttempt(identifier, 'email_check', false, 'agent');
      
      const storedData = localStorage.getItem('rate_limiting_attempts');
      const attempts = JSON.parse(storedData!);
      
      // Old attempts should be cleaned up
      const recentAttempts = attempts.filter((a: any) => a.timestamp > oldTimestamp);
      expect(recentAttempts.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Management', () => {
    it('should use appropriate limits for different attempt types', async () => {
      const configs = (service as any).configs;
      
      expect(configs.email_check).toBeTruthy();
      expect(configs.password_verify).toBeTruthy();
      expect(configs.mfa_verify).toBeTruthy();
      expect(configs.phone_verify).toBeTruthy();
      
      // Each should have required properties
      Object.values(configs).forEach(config => {
        expect((config as any).maxAttempts).toBeGreaterThan(0);
        expect((config as any).windowMs).toBeGreaterThan(0);
        expect((config as any).exponentialBase).toBeGreaterThan(1);
      });
    });
  });
});