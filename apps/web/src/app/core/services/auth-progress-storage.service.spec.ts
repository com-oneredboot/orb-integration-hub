// file: apps/web/src/app/core/services/auth-progress-storage.service.spec.ts
// author: Corey Dale Peters
// date: 2026-01-17
// description: Property-based tests for AuthProgressStorageService

import { TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';

import { AuthProgressStorageService, AuthProgress } from './auth-progress-storage.service';
import { AuthStep } from '../enums/AuthStepEnum';

describe('AuthProgressStorageService', () => {
  let service: AuthProgressStorageService;

  // Arbitrary generators for property-based tests
  const emailArbitrary = fc.emailAddress();
  const authStepArbitrary = fc.constantFrom(
    AuthStep.Email,
    AuthStep.EmailEntry,
    AuthStep.Password,
    AuthStep.PasswordSetup,
    AuthStep.PasswordVerify,
    AuthStep.EmailVerify,
    AuthStep.MfaSetup,
    AuthStep.MfaVerify
  );
  const timestampArbitrary = fc.integer({ min: 0, max: Date.now() + 1000000000 });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthProgressStorageService]
    });
    service = TestBed.inject(AuthProgressStorageService);
    
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Property 4: Progress persistence round-trip', () => {
    /**
     * Property: Saving and then getting progress should return the same data.
     * Tag: [round-trip]
     */
    it('should preserve data through save/get cycle', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArbitrary,
          authStepArbitrary,
          timestampArbitrary,
          async (email, step, timestamp) => {
            const input = { email, step, timestamp };
            
            service.save(input);
            const retrieved = service.get();

            expect(retrieved).not.toBeNull();
            expect(retrieved?.email).toBe(email);
            expect(retrieved?.step).toBe(step);
            expect(retrieved?.timestamp).toBe(timestamp);
            // expiresAt should be set automatically
            expect(retrieved?.expiresAt).toBeGreaterThan(Date.now());
            
            // Clean up for next iteration
            service.clear();
          }
        ),
        { numRuns: 100 }
      );
    });


    it('should handle optional cognitoSub in round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArbitrary,
          authStepArbitrary,
          fc.option(fc.uuid()),
          async (email, step, cognitoSub) => {
            const input = { 
              email, 
              step, 
              timestamp: Date.now(),
              cognitoSub: cognitoSub ?? undefined
            };
            
            service.save(input);
            const retrieved = service.get();

            expect(retrieved).not.toBeNull();
            expect(retrieved?.cognitoSub).toBe(cognitoSub ?? undefined);
            
            // Clean up for next iteration
            service.clear();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5: Expired progress detection', () => {
    /**
     * Property: Progress with expiresAt in the past should be detected as invalid.
     * Tag: [expiry]
     */
    it('should detect expired progress', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArbitrary,
          authStepArbitrary,
          fc.integer({ min: 1, max: 1000000000 }), // Past offset in ms
          async (email, step, pastOffset) => {
            const expiredProgress: AuthProgress = {
              email,
              step,
              timestamp: Date.now() - pastOffset - 1000,
              expiresAt: Date.now() - pastOffset // In the past
            };

            expect(service.isValid(expiredProgress)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid non-expired progress', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArbitrary,
          authStepArbitrary,
          fc.integer({ min: 1000, max: 100000000 }), // Future offset in ms
          async (email, step, futureOffset) => {
            const validProgress: AuthProgress = {
              email,
              step,
              timestamp: Date.now(),
              expiresAt: Date.now() + futureOffset // In the future
            };

            expect(service.isValid(validProgress)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null for expired progress on get()', () => {
      // Manually set expired progress in localStorage
      const expiredProgress: AuthProgress = {
        email: 'test@example.com',
        step: AuthStep.EmailVerify,
        timestamp: Date.now() - 100000,
        expiresAt: Date.now() - 1000 // Expired
      };
      localStorage.setItem('orb_auth_progress', JSON.stringify(expiredProgress));

      const result = service.get();
      expect(result).toBeNull();
    });
  });


  describe('isValid edge cases', () => {
    it('should return false for null progress', () => {
      expect(service.isValid(null)).toBe(false);
    });

    it('should return false for progress without email', () => {
      const progress = {
        email: '',
        step: AuthStep.Email,
        timestamp: Date.now(),
        expiresAt: Date.now() + 10000
      } as AuthProgress;
      expect(service.isValid(progress)).toBe(false);
    });

    it('should return false for progress without step', () => {
      const progress = {
        email: 'test@example.com',
        step: null as unknown as AuthStep,
        timestamp: Date.now(),
        expiresAt: Date.now() + 10000
      } as AuthProgress;
      expect(service.isValid(progress)).toBe(false);
    });

    it('should return false for progress without expiresAt', () => {
      const progress = {
        email: 'test@example.com',
        step: AuthStep.Email,
        timestamp: Date.now(),
        expiresAt: 0
      } as AuthProgress;
      expect(service.isValid(progress)).toBe(false);
    });
  });

  describe('clear()', () => {
    it('should remove progress from localStorage', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArbitrary,
          authStepArbitrary,
          async (email, step) => {
            service.save({ email, step, timestamp: Date.now() });
            expect(service.get()).not.toBeNull();

            service.clear();
            expect(service.get()).toBeNull();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('updateStep()', () => {
    it('should update step while preserving other data', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArbitrary,
          authStepArbitrary,
          authStepArbitrary,
          async (email, initialStep, newStep) => {
            service.save({ email, step: initialStep, timestamp: Date.now() });
            
            service.updateStep(newStep);
            const retrieved = service.get();

            expect(retrieved?.email).toBe(email);
            expect(retrieved?.step).toBe(newStep);
            
            // Clean up for next iteration
            service.clear();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should do nothing if no existing progress', () => {
      service.updateStep(AuthStep.MfaSetup);
      expect(service.get()).toBeNull();
    });
  });


  describe('hasProgressForEmail()', () => {
    it('should return true for matching email (case-insensitive)', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArbitrary,
          authStepArbitrary,
          async (email, step) => {
            service.save({ email, step, timestamp: Date.now() });

            expect(service.hasProgressForEmail(email)).toBe(true);
            expect(service.hasProgressForEmail(email.toUpperCase())).toBe(true);
            expect(service.hasProgressForEmail(email.toLowerCase())).toBe(true);
            
            // Clean up for next iteration
            service.clear();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should return false for non-matching email', () => {
      service.save({ 
        email: 'original@example.com', 
        step: AuthStep.Email, 
        timestamp: Date.now() 
      });

      expect(service.hasProgressForEmail('different@example.com')).toBe(false);
    });

    it('should return false when no progress exists', () => {
      expect(service.hasProgressForEmail('any@example.com')).toBe(false);
    });
  });

  describe('localStorage unavailability handling', () => {
    it('should handle localStorage errors gracefully on save', () => {
      // Mock localStorage to throw
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => { throw new Error('Storage full'); };

      // Should not throw
      expect(() => {
        service.save({ 
          email: 'test@example.com', 
          step: AuthStep.Email, 
          timestamp: Date.now() 
        });
      }).not.toThrow();

      localStorage.setItem = originalSetItem;
    });

    it('should handle localStorage errors gracefully on get', () => {
      // Set invalid JSON
      localStorage.setItem('orb_auth_progress', 'invalid json{{{');

      // Should return null, not throw
      expect(service.get()).toBeNull();
    });
  });
});
