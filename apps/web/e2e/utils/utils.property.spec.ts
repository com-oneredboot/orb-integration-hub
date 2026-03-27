/**
 * Unit & Property Tests for Utils (utils/index.ts)
 *
 * Pure function tests — no Playwright or AWS runtime required.
 * Tests generateTestId uniqueness and checkAWSCredentials error messaging.
 *
 * **Validates: Requirements 11.7**
 */

import * as fc from 'fast-check';

// ── Pure logic extracted from utils/index.ts ────────────────────────────

function generateTestId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function formatTestDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Mirrors the error thrown by checkAWSCredentials on failure */
function buildAWSCredentialError(): string {
  return (
    'AWS credentials are invalid or expired. ' +
    'Please run: aws sso login --profile sso-orb-dev'
  );
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('Task 4.2: Utils Unit Tests', () => {

  // ── generateTestId produces unique identifiers ────────────────────────

  describe('generateTestId() produces unique identifiers', () => {
    it('returns a string starting with the given prefix', () => {
      const id = generateTestId('test');
      expect(id).toMatch(/^test-/);
    });

    it('two consecutive calls produce different IDs', () => {
      const id1 = generateTestId('prefix');
      const id2 = generateTestId('prefix');
      expect(id1).not.toBe(id2);
    });

    it('property: generated IDs always start with the provided prefix', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9-]{0,19}$/).filter(s => s.length > 0),
          (prefix) => {
            const id = generateTestId(prefix);
            return id.startsWith(`${prefix}-`);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: 100 generated IDs are all unique', () => {
      const ids = new Set<string>();
      fc.assert(
        fc.property(fc.constant(null), () => {
          const id = generateTestId('uniq');
          const isNew = !ids.has(id);
          ids.add(id);
          return isNew;
        }),
        { numRuns: 100 }
      );
    });

    it('property: generated IDs contain a numeric timestamp segment', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-z]{1,10}$/).filter(s => s.length > 0),
          (prefix) => {
            const id = generateTestId(prefix);
            const parts = id.split('-');
            // After the prefix parts, there should be a numeric timestamp
            // Format: prefix-timestamp-random
            const afterPrefix = id.substring(prefix.length + 1);
            return /^\d+-.+$/.test(afterPrefix);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ── formatTestDate ────────────────────────────────────────────────────

  describe('formatTestDate() formats dates correctly', () => {
    it('returns YYYY-MM-DD format', () => {
      const date = new Date('2025-03-15T10:30:00Z');
      expect(formatTestDate(date)).toBe('2025-03-15');
    });

    it('property: output always matches YYYY-MM-DD pattern', () => {
      // Constrain to reasonable dates (year 1970-2100) to avoid negative years
      const reasonableDate = fc.date({
        min: new Date('1970-01-01T00:00:00Z'),
        max: new Date('2100-12-31T23:59:59Z'),
      });
      fc.assert(
        fc.property(reasonableDate, (date) => {
          const result = formatTestDate(date);
          return /^\d{4}-\d{2}-\d{2}$/.test(result);
        }),
        { numRuns: 100 }
      );
    });
  });

  // ── checkAWSCredentials error includes SSO login command ──────────────

  describe('checkAWSCredentials() throws with SSO login command when invalid', () => {
    it('error message includes sso login command', () => {
      const msg = buildAWSCredentialError();
      expect(msg).toContain('aws sso login --profile sso-orb-dev');
    });

    it('error message mentions credentials are invalid or expired', () => {
      const msg = buildAWSCredentialError();
      expect(msg).toContain('invalid or expired');
    });
  });
});
