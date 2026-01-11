/**
 * Property test for semantic HTML heading hierarchy.
 *
 * Feature: platform-improvements, Property 4: Semantic HTML Heading Hierarchy
 *
 * Validates: Requirements 6.8
 *
 * For any HTML template in the frontend application, the heading hierarchy
 * SHALL follow proper semantic order (h1 > h2 > h3 > h4 > h5 > h6) without
 * skipping levels.
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Semantic HTML Heading Hierarchy', () => {
  const webAppPath = path.resolve(__dirname, '../..');

  /**
   * Extracts heading levels from HTML content
   */
  function extractHeadingLevels(html: string): number[] {
    const headingRegex = /<h([1-6])[^>]*>/gi;
    const levels: number[] = [];
    let match;

    while ((match = headingRegex.exec(html)) !== null) {
      levels.push(parseInt(match[1], 10));
    }

    return levels;
  }

  /**
   * Validates that heading levels don't skip (e.g., h1 -> h3 without h2)
   */
  function validateHeadingHierarchy(levels: number[]): { valid: boolean; error?: string } {
    if (levels.length === 0) {
      return { valid: true };
    }

    // First heading should be h1 or h2 (h2 is acceptable in components that are part of a larger page)
    if (levels[0] > 2) {
      return {
        valid: false,
        error: `First heading should be h1 or h2, found h${levels[0]}`
      };
    }

    // Check for skipped levels
    for (let i = 1; i < levels.length; i++) {
      const current = levels[i];
      const previous = levels[i - 1];

      // Going deeper should not skip levels (h2 -> h4 is invalid)
      if (current > previous && current - previous > 1) {
        return {
          valid: false,
          error: `Heading level skipped from h${previous} to h${current}`
        };
      }
    }

    return { valid: true };
  }

  it('should have valid heading hierarchy in platform.component.html', () => {
    const filePath = path.resolve(webAppPath, 'app/features/platform/platform.component.html');
    const content = fs.readFileSync(filePath, 'utf-8');
    const levels = extractHeadingLevels(content);
    const result = validateHeadingHierarchy(levels);

    expect(result.valid).toBe(true);
    if (!result.valid) {
      fail(result.error);
    }
  });

  it('should start with h1 in the main landing page', () => {
    const filePath = path.resolve(webAppPath, 'app/features/platform/platform.component.html');
    const content = fs.readFileSync(filePath, 'utf-8');
    const levels = extractHeadingLevels(content);

    expect(levels.length).toBeGreaterThan(0);
    expect(levels[0]).toBe(1);
  });

  it('should have h2 for section headings', () => {
    const filePath = path.resolve(webAppPath, 'app/features/platform/platform.component.html');
    const content = fs.readFileSync(filePath, 'utf-8');
    const levels = extractHeadingLevels(content);

    // Should have multiple h2 headings for sections
    const h2Count = levels.filter(l => l === 2).length;
    expect(h2Count).toBeGreaterThan(0);
  });

  it('should have h3 for subsection headings under h2', () => {
    const filePath = path.resolve(webAppPath, 'app/features/platform/platform.component.html');
    const content = fs.readFileSync(filePath, 'utf-8');
    const levels = extractHeadingLevels(content);

    // Should have h3 headings for feature cards, pricing cards, etc.
    const h3Count = levels.filter(l => l === 3).length;
    expect(h3Count).toBeGreaterThan(0);
  });
});
