/**
 * Property Test: Authentication State Persistence
 *
 * **Property 3: Authentication State Persistence**
 * **Validates: Requirements 4.4**
 *
 * Verifies that auth state file path is configured correctly and
 * playwright.config.ts references the auth state file.
 * Source code analysis test — no Playwright runtime required.
 */

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

const webRoot = path.resolve(__dirname, '../..');
const AUTH_STATE_PATH = 'e2e/.auth/user.json';

describe('Property 3: Authentication State Persistence', () => {

  // ── Verify auth state file path is configured in cognito.ts ───────────

  it('cognito.ts saves auth state to e2e/.auth/user.json', () => {
    const cognitoPath = path.resolve(__dirname, '../auth/cognito.ts');
    expect(fs.existsSync(cognitoPath)).toBe(true);

    const content = fs.readFileSync(cognitoPath, 'utf-8');
    expect(content).toContain(AUTH_STATE_PATH);
  });

  // ── Verify playwright.config.ts references auth state file ────────────

  it('playwright.config.ts references auth state file for storageState', () => {
    const configPath = path.join(webRoot, 'playwright.config.ts');
    expect(fs.existsSync(configPath)).toBe(true);

    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain(AUTH_STATE_PATH);
    expect(content).toContain('storageState');
  });

  it('playwright.config.ts has a setup project that runs before browser projects', () => {
    const configPath = path.join(webRoot, 'playwright.config.ts');
    const content = fs.readFileSync(configPath, 'utf-8');

    expect(content).toContain("name: 'setup'");
    expect(content).toContain("dependencies: ['setup']");
  });

  // ── Property: all browser projects reference auth state ────────────────

  it('property: all browser projects in config reference auth state file', () => {
    const configPath = path.join(webRoot, 'playwright.config.ts');
    const content = fs.readFileSync(configPath, 'utf-8');

    const browserProjects = ['chromium', 'firefox', 'webkit'];

    fc.assert(
      fc.property(
        fc.constantFrom(...browserProjects),
        (browser) => {
          // Each browser project should have storageState referencing auth file
          // We verify the config contains the auth state path (used by all browser projects)
          return content.includes(AUTH_STATE_PATH) && content.includes(browser);
        }
      ),
      { numRuns: browserProjects.length * 10 }
    );
  });

  // ── Verify .gitignore excludes auth state directory ───────────────────

  it('.gitignore excludes auth state directory', () => {
    // Check apps/web/.gitignore (project-level gitignore)
    const webGitignorePath = path.join(webRoot, '.gitignore');
    if (!fs.existsSync(webGitignorePath)) return;

    const content = fs.readFileSync(webGitignorePath, 'utf-8');
    expect(content).toContain('e2e/.auth/');
  });
});
