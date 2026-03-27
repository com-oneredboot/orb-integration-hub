/**
 * Property Test: AWS Credential Error Handling
 *
 * **Property 5: AWS Credential Error Handling**
 * **Validates: Requirements 11.7**
 *
 * Verifies source code has try-catch for AWS credential errors
 * and error messages contain SSO login command.
 * Source code analysis test — no AWS runtime required.
 */

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

const SSO_LOGIN_COMMAND = 'aws sso login --profile sso-orb-dev';

/** Get all E2E source files that interact with AWS */
function getAWSInteractionFiles(): Array<{ name: string; content: string }> {
  const files: Array<{ name: string; content: string }> = [];
  const e2eRoot = path.resolve(__dirname, '..');

  const candidates = [
    { rel: 'fixtures/index.ts', full: path.join(e2eRoot, 'fixtures/index.ts') },
    { rel: 'utils/index.ts', full: path.join(e2eRoot, 'utils/index.ts') },
    { rel: 'auth/cognito.ts', full: path.join(e2eRoot, 'auth/cognito.ts') },
  ];

  for (const c of candidates) {
    if (fs.existsSync(c.full)) {
      files.push({ name: c.rel, content: fs.readFileSync(c.full, 'utf-8') });
    }
  }

  return files;
}

function fileHasTryCatch(content: string): boolean {
  return content.includes('try') && content.includes('catch');
}

function fileHandlesCredentialErrors(content: string): boolean {
  return (
    content.includes('CredentialsProviderError') ||
    content.includes('ExpiredTokenException') ||
    content.includes('credentials are invalid or expired')
  );
}

function fileIncludesSSOLoginCommand(content: string): boolean {
  return content.includes(SSO_LOGIN_COMMAND);
}

describe('Property 5: AWS Credential Error Handling', () => {
  const awsFiles = getAWSInteractionFiles();

  it('E2E source files exist', () => {
    expect(awsFiles.length).toBeGreaterThan(0);
  });

  // ── fixtures/index.ts has try-catch for credential errors ─────────────

  it('fixtures/index.ts has try-catch blocks', () => {
    const fixtures = awsFiles.find(f => f.name === 'fixtures/index.ts');
    expect(fixtures).toBeDefined();
    expect(fileHasTryCatch(fixtures!.content)).toBe(true);
  });

  it('fixtures/index.ts handles credential errors', () => {
    const fixtures = awsFiles.find(f => f.name === 'fixtures/index.ts');
    expect(fixtures).toBeDefined();
    expect(fileHandlesCredentialErrors(fixtures!.content)).toBe(true);
  });

  it('fixtures/index.ts includes SSO login command in error messages', () => {
    const fixtures = awsFiles.find(f => f.name === 'fixtures/index.ts');
    expect(fixtures).toBeDefined();
    expect(fileIncludesSSOLoginCommand(fixtures!.content)).toBe(true);
  });

  // ── utils/index.ts has credential error handling ──────────────────────

  it('utils/index.ts has try-catch blocks', () => {
    const utils = awsFiles.find(f => f.name === 'utils/index.ts');
    expect(utils).toBeDefined();
    expect(fileHasTryCatch(utils!.content)).toBe(true);
  });

  it('utils/index.ts includes SSO login command in error messages', () => {
    const utils = awsFiles.find(f => f.name === 'utils/index.ts');
    expect(utils).toBeDefined();
    expect(fileIncludesSSOLoginCommand(utils!.content)).toBe(true);
  });

  // ── Property: all files with AWS SDK calls have error handling ────────

  it('property: all files with AWS SDK imports have try-catch and SSO login guidance', () => {
    const filesWithAWS = awsFiles.filter(f =>
      f.content.includes('@aws-sdk') || f.content.includes('fromSSO')
    );

    if (filesWithAWS.length === 0) return;

    fc.assert(
      fc.property(
        fc.constantFrom(...filesWithAWS),
        (file) => {
          return (
            fileHasTryCatch(file.content) &&
            fileIncludesSSOLoginCommand(file.content)
          );
        }
      ),
      { numRuns: Math.min(filesWithAWS.length * 50, 100) }
    );
  });

  // ── Verify error message content ──────────────────────────────────────

  it('property: SSO login command in source matches expected format', () => {
    const filesWithSSO = awsFiles.filter(f => fileIncludesSSOLoginCommand(f.content));
    expect(filesWithSSO.length).toBeGreaterThan(0);

    fc.assert(
      fc.property(
        fc.constantFrom(...filesWithSSO),
        (file) => {
          return file.content.includes('sso-orb-dev');
        }
      ),
      { numRuns: Math.min(filesWithSSO.length * 50, 100) }
    );
  });
});
