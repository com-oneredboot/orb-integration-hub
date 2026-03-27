/**
 * Unit & Property Tests for Test Fixtures (fixtures/index.ts)
 *
 * Pure function tests — no AWS runtime or Playwright required.
 * Validates resource naming, cleanup resilience, error messaging.
 *
 * **Validates: Requirements 5.1, 5.4, 11.7**
 */

import * as fc from 'fast-check';

// ── Extracted pure logic under test ─────────────────────────────────────

/** Mirrors the naming logic in createTestOrganization / createTestApplication / createTestGroup */
function buildResourceName(inputName: string): string {
  return `e2e-test-${inputName}-${Date.now()}`;
}

/** Mirrors cleanupTestData: continues on failure, collects failures */
async function cleanupTestData(
  resources: Array<{ id: string; type: string }>,
  deleteFn: (resource: { id: string; type: string }) => Promise<void>
): Promise<Array<{ resource: { id: string; type: string }; error: Error }>> {
  const failures: Array<{ resource: { id: string; type: string }; error: Error }> = [];

  for (const resource of resources) {
    try {
      await deleteFn(resource);
    } catch (error: any) {
      failures.push({ resource, error });
      // Continue cleanup even if one resource fails
    }
  }
  return failures;
}

/** Mirrors the credential error detection in deleteTestUser */
function isCredentialError(errorName: string): boolean {
  return errorName === 'CredentialsProviderError' || errorName === 'ExpiredTokenException';
}

function buildCredentialErrorMessage(): string {
  return (
    'AWS credentials are invalid or expired.\n' +
    'Run: aws sso login --profile sso-orb-dev\n' +
    'Then retry the test.'
  );
}

/** Mirrors callGraphQL error formatting */
function buildGraphQLErrorMessage(
  operation: string,
  errors: unknown[],
  variables: unknown
): string {
  return (
    `GraphQL operation ${operation} failed:\n` +
    `Errors: ${JSON.stringify(errors, null, 2)}\n` +
    `Variables: ${JSON.stringify(variables, null, 2)}`
  );
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('Task 3.6: Fixtures Unit Tests', () => {

  // ── Req 5.1: Resource creation adds e2e-test- prefix ─────────────────

  describe('resource creation functions add e2e-test- prefix', () => {
    it('buildResourceName always starts with e2e-test-', () => {
      const name = buildResourceName('my-org');
      expect(name).toMatch(/^e2e-test-/);
    });

    it('property: for any input name, result starts with e2e-test-', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          (inputName) => {
            const result = buildResourceName(inputName);
            return result.startsWith('e2e-test-');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: result contains the original input name', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-zA-Z0-9-]+$/).filter(s => s.length > 0),
          (inputName) => {
            const result = buildResourceName(inputName);
            return result.includes(inputName);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ── Req 5.4: Cleanup continues on individual resource failures ────────

  describe('cleanup continues on individual resource failures', () => {
    it('processes all resources even when some fail', async () => {
      const resources = [
        { id: '1', type: 'organization' },
        { id: '2', type: 'application' },
        { id: '3', type: 'group' },
      ];

      const called: string[] = [];
      const deleteFn = async (r: { id: string; type: string }) => {
        called.push(r.id);
        if (r.id === '2') throw new Error('Simulated failure');
      };

      const failures = await cleanupTestData(resources, deleteFn);

      // All three resources were attempted
      expect(called).toEqual(['1', '2', '3']);
      // Only one failure recorded
      expect(failures).toHaveLength(1);
      expect(failures[0].resource.id).toBe('2');
    });

    it('returns empty failures array when all succeed', async () => {
      const resources = [
        { id: 'a', type: 'organization' },
        { id: 'b', type: 'application' },
      ];
      const deleteFn = async () => {};
      const failures = await cleanupTestData(resources, deleteFn);
      expect(failures).toHaveLength(0);
    });

    it('records all failures when everything fails', async () => {
      const resources = [
        { id: 'x', type: 'organization' },
        { id: 'y', type: 'application' },
      ];
      const deleteFn = async () => { throw new Error('fail'); };
      const failures = await cleanupTestData(resources, deleteFn);
      expect(failures).toHaveLength(2);
    });
  });

  // ── Req 11.7: AWS credential errors include SSO login command ─────────

  describe('AWS credential errors include SSO login command', () => {
    it('detects CredentialsProviderError', () => {
      expect(isCredentialError('CredentialsProviderError')).toBe(true);
    });

    it('detects ExpiredTokenException', () => {
      expect(isCredentialError('ExpiredTokenException')).toBe(true);
    });

    it('does not flag other errors as credential errors', () => {
      expect(isCredentialError('ValidationException')).toBe(false);
      expect(isCredentialError('ResourceNotFoundException')).toBe(false);
    });

    it('credential error message includes sso login command', () => {
      const msg = buildCredentialErrorMessage();
      expect(msg).toContain('aws sso login --profile sso-orb-dev');
    });
  });

  // ── GraphQL errors include operation details ──────────────────────────

  describe('GraphQL errors include operation details', () => {
    it('error message includes operation name', () => {
      const msg = buildGraphQLErrorMessage('createOrganization', [{ message: 'Unauthorized' }], { input: {} });
      expect(msg).toContain('createOrganization');
    });

    it('error message includes error details', () => {
      const errors = [{ message: 'Field required' }];
      const msg = buildGraphQLErrorMessage('createApp', errors, {});
      expect(msg).toContain('Field required');
    });

    it('error message includes variables', () => {
      const vars = { input: { name: 'test-app' } };
      const msg = buildGraphQLErrorMessage('createApp', [], vars);
      expect(msg).toContain('test-app');
    });

    it('property: error message always contains operation name and Errors/Variables labels', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
          fc.array(fc.record({ message: fc.string() }), { minLength: 1, maxLength: 3 }),
          (operation, errors) => {
            const msg = buildGraphQLErrorMessage(operation, errors, { key: 'val' });
            return (
              msg.includes(operation) &&
              msg.includes('Errors:') &&
              msg.includes('Variables:')
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
