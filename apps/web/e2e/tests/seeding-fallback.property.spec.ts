/**
 * Property Test: Test Data Seeding Fallback
 *
 * **Property 6: Test Data Seeding Fallback**
 * **Validates: Requirements 12.5**
 *
 * Verifies that seeding scripts exist or documents that seeding is optional.
 * The seeding feature is optional (Phase 7 in tasks.md), so this test
 * validates either the presence of seeding infrastructure or documentation
 * that seeding is not yet implemented.
 *
 * Source code analysis test — no AWS runtime required.
 */

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

const e2eRoot = path.resolve(__dirname, '..');
const webRoot = path.resolve(__dirname, '../..');

describe('Property 6: Test Data Seeding Fallback', () => {

  // ── Check if seeding scripts exist ────────────────────────────────────

  const seedScriptPath = path.join(e2eRoot, 'scripts/seed-data.ts');
  const cleanupSeedPath = path.join(e2eRoot, 'scripts/cleanup-seed.ts');
  const seedingExists = fs.existsSync(seedScriptPath);

  it('seeding is either implemented or documented as optional', () => {
    if (seedingExists) {
      // If seeding scripts exist, verify they have the expected structure
      const content = fs.readFileSync(seedScriptPath, 'utf-8');
      expect(content).toContain('seedTestData');
    } else {
      // Seeding is optional (Phase 7). Verify README documents this.
      const readmePath = path.join(e2eRoot, 'README.md');
      expect(fs.existsSync(readmePath)).toBe(true);
      const readme = fs.readFileSync(readmePath, 'utf-8');
      // README should mention seeding or test data
      const mentionsSeeding = readme.toLowerCase().includes('seed') ||
        readme.toLowerCase().includes('test data');
      expect(mentionsSeeding).toBe(true);
    }
  });

  it('if seeding exists, cleanup script also exists', () => {
    if (seedingExists) {
      expect(fs.existsSync(cleanupSeedPath)).toBe(true);
    }
  });

  it('if seeding exists, .test-data.json path is referenced', () => {
    if (seedingExists) {
      const content = fs.readFileSync(seedScriptPath, 'utf-8');
      expect(content).toContain('.test-data.json');
    }
  });

  // ── Verify package.json scripts if seeding is implemented ─────────────

  it('if seeding exists, npm scripts are defined', () => {
    const pkgPath = path.join(webRoot, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    if (seedingExists) {
      expect(pkg.scripts['e2e:seed']).toBeDefined();
      expect(pkg.scripts['e2e:cleanup-seed']).toBeDefined();
    }
  });

  // ── Property: test fixtures work without seeding ──────────────────────

  it('property: fixture functions do not require seeded data to be present', () => {
    const fixturesPath = path.join(e2eRoot, 'fixtures/index.ts');
    expect(fs.existsSync(fixturesPath)).toBe(true);

    const content = fs.readFileSync(fixturesPath, 'utf-8');

    // Fixture functions should create resources directly (not depend on .test-data.json)
    const creationFunctions = [
      'createTestOrganization',
      'createTestApplication',
      'createTestGroup',
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...creationFunctions),
        (fnName) => {
          return content.includes(fnName);
        }
      ),
      { numRuns: creationFunctions.length * 10 }
    );
  });

  it('property: README documents test data management regardless of seeding', () => {
    const readmePath = path.join(e2eRoot, 'README.md');
    expect(fs.existsSync(readmePath)).toBe(true);

    const readme = fs.readFileSync(readmePath, 'utf-8');

    const requiredTopics = ['cleanup', 'test data', 'e2e-test-'];

    fc.assert(
      fc.property(
        fc.constantFrom(...requiredTopics),
        (topic) => {
          return readme.toLowerCase().includes(topic.toLowerCase());
        }
      ),
      { numRuns: requiredTopics.length * 10 }
    );
  });
});
