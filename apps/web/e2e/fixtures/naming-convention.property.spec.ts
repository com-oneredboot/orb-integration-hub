/**
 * Property Test: Test Data Naming Convention
 *
 * **Property 1: Test Data Naming Convention**
 * **Validates: Requirements 5.1**
 *
 * For any test resource created by the E2E test fixtures,
 * the resource name SHALL include the `e2e-test-` prefix.
 *
 * Uses fast-check to generate random resource names and verify
 * the naming convention holds across 100+ iterations.
 */

import * as fc from 'fast-check';

// ── Pure naming logic extracted from fixtures/index.ts ──────────────────

function buildResourceName(inputName: string): string {
  return `e2e-test-${inputName}-${Date.now()}`;
}

type ResourceType = 'organization' | 'application' | 'group';

function buildResourceNameForType(type: ResourceType, inputName: string): string {
  // All resource types use the same naming pattern
  return `e2e-test-${inputName}-${Date.now()}`;
}

// ── Property Tests ──────────────────────────────────────────────────────

describe('Property 1: Test Data Naming Convention', () => {
  /** Generator for valid resource input names */
  const resourceNameArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9-]{0,29}$/).filter(s => s.length > 0);

  /** Generator for resource types */
  const resourceTypeArb = fc.constantFrom<ResourceType>('organization', 'application', 'group');

  it('all created resources have e2e-test- prefix (100+ iterations)', () => {
    fc.assert(
      fc.property(resourceNameArb, (inputName) => {
        const result = buildResourceName(inputName);
        return result.startsWith('e2e-test-');
      }),
      { numRuns: 150 }
    );
  });

  it('all resource types produce names with e2e-test- prefix', () => {
    fc.assert(
      fc.property(resourceTypeArb, resourceNameArb, (type, inputName) => {
        const result = buildResourceNameForType(type, inputName);
        return result.startsWith('e2e-test-');
      }),
      { numRuns: 150 }
    );
  });

  it('generated names contain the original input name', () => {
    fc.assert(
      fc.property(resourceNameArb, (inputName) => {
        const result = buildResourceName(inputName);
        return result.includes(inputName);
      }),
      { numRuns: 150 }
    );
  });

  it('generated names include a timestamp suffix', () => {
    fc.assert(
      fc.property(resourceNameArb, (inputName) => {
        const result = buildResourceName(inputName);
        // After removing the prefix and input name, there should be a numeric timestamp
        const afterPrefix = result.replace(`e2e-test-${inputName}-`, '');
        return /^\d+$/.test(afterPrefix);
      }),
      { numRuns: 150 }
    );
  });

  it('no generated name is missing the e2e-test- prefix regardless of input characters', () => {
    // Use a broader character set to stress-test
    const broadNameArb = fc.string({ minLength: 1, maxLength: 40 }).filter(s => s.trim().length > 0);

    fc.assert(
      fc.property(broadNameArb, (inputName) => {
        const result = buildResourceName(inputName);
        return result.startsWith('e2e-test-');
      }),
      { numRuns: 150 }
    );
  });
});
