/**
 * Property-Based Tests for Auth Helper Functions
 *
 * Validates correctness properties for generateTestEmail and generateTestPassword
 * using fast-check. These helpers are the foundation of the self-contained auth
 * test suite — if they produce invalid emails or weak passwords, the E2E tests
 * will fail against Cognito.
 *
 * @see .kiro/specs/e2e-auth-tests/design.md
 */

import { test, expect } from '@playwright/test';
import * as fc from 'fast-check';
import { generateTestEmail, generateTestPassword } from './auth.spec';

// =============================================================================
// Property 1: Generated test emails are unique and well-formed
// Feature: e2e-auth-tests, Property 1: Generated test emails are unique and well-formed
// Validates: Requirements 1.1
// =============================================================================

test.describe('Property 1: Generated test emails are unique and well-formed', () => {
  const EMAIL_PATTERN = /^e2e-test-\d+@test\.orb-integration-hub\.com$/;

  test('every generated email matches the expected pattern', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const email = generateTestEmail();
        expect(email).toMatch(EMAIL_PATTERN);
      }),
      { numRuns: 100 },
    );
  });

  test('distinct timestamps produce distinct emails', () => {
    const seen = new Set<string>();
    // Generate 100 emails — each call uses Date.now() which advances
    fc.assert(
      fc.property(fc.constant(null), () => {
        const email = generateTestEmail();
        expect(seen.has(email)).toBe(false);
        seen.add(email);
      }),
      { numRuns: 100 },
    );
  });

  test('email local part contains only digits after prefix', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const email = generateTestEmail();
        const localPart = email.split('@')[0]; // e2e-test-{digits}
        const digits = localPart.replace('e2e-test-', '');
        expect(digits).toMatch(/^\d+$/);
      }),
      { numRuns: 100 },
    );
  });
});

// =============================================================================
// Property 2: Generated passwords meet Cognito password policy
// Feature: e2e-auth-tests, Property 2: Generated passwords meet Cognito password policy
// Validates: Requirements 1.2
// =============================================================================

test.describe('Property 2: Generated passwords meet Cognito password policy', () => {
  test('every generated password is at least 8 characters', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const password = generateTestPassword();
        expect(password.length).toBeGreaterThanOrEqual(8);
      }),
      { numRuns: 100 },
    );
  });

  test('every generated password contains at least one uppercase letter', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const password = generateTestPassword();
        expect(password).toMatch(/[A-Z]/);
      }),
      { numRuns: 100 },
    );
  });

  test('every generated password contains at least one lowercase letter', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const password = generateTestPassword();
        expect(password).toMatch(/[a-z]/);
      }),
      { numRuns: 100 },
    );
  });

  test('every generated password contains at least one digit', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const password = generateTestPassword();
        expect(password).toMatch(/\d/);
      }),
      { numRuns: 100 },
    );
  });

  test('every generated password contains at least one special character', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const password = generateTestPassword();
        expect(password).toMatch(/[!@#$%^&*]/);
      }),
      { numRuns: 100 },
    );
  });
});
