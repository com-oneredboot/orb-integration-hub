/**
 * Property Test: Test Cleanup Execution
 *
 * **Property 2: Test Cleanup Execution**
 * **Validates: Requirements 5.2, 5.3**
 *
 * Verifies that test files with resource creation have afterEach cleanup hooks.
 * Uses source code analysis (reads test files, checks for patterns).
 */

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// ── Helpers ─────────────────────────────────────────────────────────────

const testsDir = path.resolve(__dirname, '.');

function getTestFiles(): string[] {
  if (!fs.existsSync(testsDir)) return [];
  return fs.readdirSync(testsDir)
    .filter(f => f.endsWith('.spec.ts') && !f.includes('property'))
    .map(f => path.join(testsDir, f));
}

function fileCreatesResources(content: string): boolean {
  return (
    content.includes('createTestOrganization') ||
    content.includes('createTestApplication') ||
    content.includes('createTestGroup') ||
    content.includes('createPrerequisites')
  );
}

function fileHasCleanupHook(content: string): boolean {
  return (
    content.includes('afterEach') ||
    content.includes('afterAll')
  );
}

function fileHasCleanupCall(content: string): boolean {
  return content.includes('cleanupTestData');
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('Property 2: Test Cleanup Execution', () => {
  const testFiles = getTestFiles();

  it('test files directory exists and contains spec files', () => {
    expect(fs.existsSync(testsDir)).toBe(true);
    expect(testFiles.length).toBeGreaterThan(0);
  });

  it('all test files that create resources have afterEach cleanup hooks', () => {
    for (const filePath of testFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (fileCreatesResources(content)) {
        expect(fileHasCleanupHook(content)).toBe(true);
        expect(fileHasCleanupCall(content)).toBe(true);
      }
    }
  });

  it('property: for any test file with resource creation, cleanup pattern exists', () => {
    if (testFiles.length === 0) return; // skip if no test files

    const filesWithContent = testFiles.map(f => ({
      name: path.basename(f),
      content: fs.readFileSync(f, 'utf-8'),
    }));

    const filesCreatingResources = filesWithContent.filter(f => fileCreatesResources(f.content));

    if (filesCreatingResources.length === 0) return; // no resource-creating files

    fc.assert(
      fc.property(
        fc.constantFrom(...filesCreatingResources),
        (file) => {
          return fileHasCleanupHook(file.content) && fileHasCleanupCall(file.content);
        }
      ),
      { numRuns: Math.min(filesCreatingResources.length * 20, 100) }
    );
  });

  it('example.spec.ts creates resources and has cleanup', () => {
    const examplePath = path.join(testsDir, 'example.spec.ts');
    if (!fs.existsSync(examplePath)) return;

    const content = fs.readFileSync(examplePath, 'utf-8');
    expect(fileCreatesResources(content)).toBe(true);
    expect(fileHasCleanupHook(content)).toBe(true);
    expect(fileHasCleanupCall(content)).toBe(true);
  });
});
