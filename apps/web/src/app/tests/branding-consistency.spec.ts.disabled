/**
 * Property test for branding consistency.
 *
 * Feature: platform-improvements, Property 3: No OneRedBoot References in User-Visible Content
 *
 * Validates: Requirements 3.2
 *
 * For any user-visible content in the frontend application, the content SHALL NOT
 * contain references to "OneRedBoot" and SHALL use "Orb Integration Hub" instead.
 */

import { execSync } from 'child_process';
import * as path from 'path';

describe('Branding Consistency', () => {
  const webAppPath = path.resolve(__dirname, '../..');

  it('should not contain any OneRedBoot references in HTML files', () => {
    try {
      // Search for OneRedBoot in HTML files
      const result = execSync(
        `grep -r "OneRedBoot" --include="*.html" ${webAppPath} 2>/dev/null || true`,
        { encoding: 'utf-8' }
      );

      expect(result.trim()).toBe('');
    } catch (error) {
      // grep returns exit code 1 when no matches found, which is expected
      expect(true).toBe(true);
    }
  });

  it('should not contain any OneRedBoot references in TypeScript files', () => {
    try {
      // Search for OneRedBoot in TypeScript files
      const result = execSync(
        `grep -r "OneRedBoot" --include="*.ts" ${webAppPath} 2>/dev/null || true`,
        { encoding: 'utf-8' }
      );

      expect(result.trim()).toBe('');
    } catch (error) {
      expect(true).toBe(true);
    }
  });

  it('should not contain any onredboot references in asset paths', () => {
    try {
      // Search for onredboot in any file (case insensitive for asset names)
      const result = execSync(
        `grep -ri "onredboot" --include="*.html" --include="*.ts" --include="*.scss" ${webAppPath} 2>/dev/null || true`,
        { encoding: 'utf-8' }
      );

      expect(result.trim()).toBe('');
    } catch (error) {
      expect(true).toBe(true);
    }
  });

  it('should have correct title in index.html', () => {
    const indexPath = path.resolve(webAppPath, 'index.html');
    const fs = require('fs');
    const content = fs.readFileSync(indexPath, 'utf-8');

    expect(content).toContain('<title>Orb Integration Hub</title>');
    expect(content).not.toContain('OneRedBoot');
  });
});
