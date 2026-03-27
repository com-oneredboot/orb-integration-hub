/**
 * Property Test: AWS SDK Configuration
 *
 * **Property 4: AWS SDK Configuration**
 * **Validates: Requirements 11.1**
 *
 * Verifies that fixture source code uses correct AWS profile and region.
 * Source code analysis test — no AWS runtime required.
 */

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

const EXPECTED_PROFILE = 'sso-orb-dev';
const EXPECTED_REGION = 'us-east-1';

/** Source files that interact with AWS SDK */
function getAWSSourceFiles(): Array<{ name: string; content: string }> {
  const files: Array<{ name: string; content: string }> = [];

  const fixturesPath = path.resolve(__dirname, '../fixtures/index.ts');
  if (fs.existsSync(fixturesPath)) {
    files.push({ name: 'fixtures/index.ts', content: fs.readFileSync(fixturesPath, 'utf-8') });
  }

  const utilsPath = path.resolve(__dirname, '../utils/index.ts');
  if (fs.existsSync(utilsPath)) {
    files.push({ name: 'utils/index.ts', content: fs.readFileSync(utilsPath, 'utf-8') });
  }

  return files;
}

describe('Property 4: AWS SDK Configuration', () => {
  const awsFiles = getAWSSourceFiles();

  it('AWS source files exist', () => {
    expect(awsFiles.length).toBeGreaterThan(0);
  });

  it('fixtures/index.ts uses sso-orb-dev profile', () => {
    const fixtures = awsFiles.find(f => f.name === 'fixtures/index.ts');
    expect(fixtures).toBeDefined();
    expect(fixtures!.content).toContain(EXPECTED_PROFILE);
  });

  it('fixtures/index.ts uses us-east-1 region', () => {
    const fixtures = awsFiles.find(f => f.name === 'fixtures/index.ts');
    expect(fixtures).toBeDefined();
    expect(fixtures!.content).toContain(EXPECTED_REGION);
  });

  it('utils/index.ts uses sso-orb-dev profile for credential checks', () => {
    const utils = awsFiles.find(f => f.name === 'utils/index.ts');
    expect(utils).toBeDefined();
    expect(utils!.content).toContain(EXPECTED_PROFILE);
  });

  it('utils/index.ts uses us-east-1 region', () => {
    const utils = awsFiles.find(f => f.name === 'utils/index.ts');
    expect(utils).toBeDefined();
    expect(utils!.content).toContain(EXPECTED_REGION);
  });

  it('property: all AWS source files reference sso-orb-dev profile and us-east-1 region', () => {
    expect(awsFiles.length).toBeGreaterThan(0);

    fc.assert(
      fc.property(
        fc.constantFrom(...awsFiles),
        (file) => {
          return file.content.includes(EXPECTED_PROFILE) && file.content.includes(EXPECTED_REGION);
        }
      ),
      { numRuns: Math.min(awsFiles.length * 50, 100) }
    );
  });

  it('fixtures/index.ts uses fromSSO credential provider', () => {
    const fixtures = awsFiles.find(f => f.name === 'fixtures/index.ts');
    expect(fixtures).toBeDefined();
    expect(fixtures!.content).toContain('fromSSO');
  });

  it('property: all files using AWS SDK import fromSSO', () => {
    const filesWithAWS = awsFiles.filter(f =>
      f.content.includes('Client') && f.content.includes('@aws-sdk')
    );

    if (filesWithAWS.length === 0) return;

    fc.assert(
      fc.property(
        fc.constantFrom(...filesWithAWS),
        (file) => {
          return file.content.includes('fromSSO');
        }
      ),
      { numRuns: Math.min(filesWithAWS.length * 50, 100) }
    );
  });
});
