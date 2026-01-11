/**
 * Property Test: CSS Custom Properties for Design Tokens
 *
 * Validates that the design system uses CSS custom properties (design tokens)
 * for consistent styling across the application.
 *
 * Property: Design tokens are defined and used consistently
 * - _tokens.scss defines CSS custom properties in :root
 * - Landing page SCSS uses var(--*) references for colors, spacing, typography
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Design Tokens Property Test', () => {
  const stylesDir = path.join(__dirname, '../../styles');
  const platformDir = path.join(__dirname, '../features/platform');

  describe('Property: Design tokens file defines CSS custom properties', () => {
    let tokensContent: string;

    beforeAll(() => {
      const tokensPath = path.join(stylesDir, '_tokens.scss');
      tokensContent = fs.readFileSync(tokensPath, 'utf-8');
    });

    it('should have :root selector for CSS custom properties', () => {
      expect(tokensContent).toContain(':root');
    });

    it('should define color tokens', () => {
      const colorTokens = [
        '--color-primary',
        '--color-secondary',
        '--color-background',
        '--color-text-primary',
        '--color-text-secondary',
      ];

      colorTokens.forEach((token) => {
        expect(tokensContent).toContain(token);
      });
    });

    it('should define spacing tokens', () => {
      const spacingTokens = [
        '--spacing-xs',
        '--spacing-sm',
        '--spacing-md',
        '--spacing-lg',
        '--spacing-xl',
      ];

      spacingTokens.forEach((token) => {
        expect(tokensContent).toContain(token);
      });
    });

    it('should define typography tokens', () => {
      const typographyTokens = [
        '--font-family-primary',
        '--font-size-base',
        '--font-weight-normal',
        '--line-height-normal',
      ];

      typographyTokens.forEach((token) => {
        expect(tokensContent).toContain(token);
      });
    });

    it('should define border radius tokens', () => {
      const radiusTokens = ['--radius-sm', '--radius-md', '--radius-lg'];

      radiusTokens.forEach((token) => {
        expect(tokensContent).toContain(token);
      });
    });

    it('should define shadow tokens', () => {
      const shadowTokens = ['--shadow-sm', '--shadow-md', '--shadow-lg'];

      shadowTokens.forEach((token) => {
        expect(tokensContent).toContain(token);
      });
    });

    it('should define transition tokens', () => {
      const transitionTokens = [
        '--transition-fast',
        '--transition-normal',
        '--transition-slow',
      ];

      transitionTokens.forEach((token) => {
        expect(tokensContent).toContain(token);
      });
    });
  });

  describe('Property: Landing page uses design tokens', () => {
    let platformScssContent: string;

    beforeAll(() => {
      const platformScssPath = path.join(
        platformDir,
        'platform.component.scss'
      );
      platformScssContent = fs.readFileSync(platformScssPath, 'utf-8');
    });

    it('should use var() for color references', () => {
      // Check for CSS custom property usage patterns
      const varColorPattern = /var\(--color-[a-z-]+\)/g;
      const colorMatches = platformScssContent.match(varColorPattern);

      expect(colorMatches).not.toBeNull();
      expect(colorMatches!.length).toBeGreaterThan(5);
    });

    it('should use var() for spacing references', () => {
      const varSpacingPattern = /var\(--spacing-[a-z0-9-]+\)/g;
      const spacingMatches = platformScssContent.match(varSpacingPattern);

      expect(spacingMatches).not.toBeNull();
      expect(spacingMatches!.length).toBeGreaterThan(10);
    });

    it('should use var() for typography references', () => {
      const varFontPattern = /var\(--font-[a-z-]+\)/g;
      const fontMatches = platformScssContent.match(varFontPattern);

      expect(fontMatches).not.toBeNull();
      expect(fontMatches!.length).toBeGreaterThan(5);
    });

    it('should use var() for border radius references', () => {
      const varRadiusPattern = /var\(--radius-[a-z]+\)/g;
      const radiusMatches = platformScssContent.match(varRadiusPattern);

      expect(radiusMatches).not.toBeNull();
      expect(radiusMatches!.length).toBeGreaterThan(0);
    });

    it('should use var() for transition references', () => {
      const varTransitionPattern = /var\(--transition-[a-z]+\)/g;
      const transitionMatches = platformScssContent.match(varTransitionPattern);

      expect(transitionMatches).not.toBeNull();
      expect(transitionMatches!.length).toBeGreaterThan(0);
    });

    it('should minimize hardcoded color values', () => {
      // Count hardcoded hex colors (excluding rgba for shadows which are acceptable)
      const hexColorPattern = /#[0-9A-Fa-f]{3,6}(?![0-9A-Fa-f])/g;
      const hexMatches = platformScssContent.match(hexColorPattern) || [];

      // Allow some hardcoded colors for brand-specific values (orb-red via SCSS variable)
      // but the majority should use CSS custom properties
      // This is a soft check - we expect fewer than 10 hardcoded hex values
      expect(hexMatches.length).toBeLessThan(10);
    });
  });

  describe('Property: Tokens file is imported in main styles', () => {
    it('should import tokens in styles.scss', () => {
      const stylesPath = path.join(stylesDir, 'styles.scss');
      const stylesContent = fs.readFileSync(stylesPath, 'utf-8');

      expect(stylesContent).toContain("@use 'tokens'");
    });
  });
});
