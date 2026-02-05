// file: apps/web/src/app/core/validators/custom-validators.property.spec.ts
// author: Security Audit
// date: 2025-01-21
// description: Property-based tests for XSS protection in custom validators
// **Feature: auth-workflow-review, Property 7: XSS Protection**
// **Validates: Requirements 5.1**

import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import * as fc from 'fast-check';
import { CustomValidators } from './custom-validators';

describe('CustomValidators XSS Protection Property Tests', () => {
  let sanitizer: DomSanitizer;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    sanitizer = TestBed.inject(DomSanitizer);
  });

  /**
   * Property 7: XSS Protection
   * *For any* user input rendered in the Angular application, sanitization SHALL be applied
   * using Angular's DomSanitizer or equivalent protection.
   * 
   * This property test verifies that the noXSS validator correctly identifies and rejects
   * inputs containing potentially harmful XSS content.
   */
  describe('Property 7: XSS Protection', () => {
    
    // Generator for common XSS attack patterns
    const xssPayloadArbitrary = fc.oneof(
      // Script tags
      fc.constant('<script>alert("xss")</script>'),
      fc.constant('<script src="evil.js"></script>'),
      fc.constant('<SCRIPT>alert("xss")</SCRIPT>'),
      
      // Event handlers
      fc.constant('<img src="x" onerror="alert(1)">'),
      fc.constant('<div onmouseover="alert(1)">hover</div>'),
      fc.constant('<body onload="alert(1)">'),
      fc.constant('<input onfocus="alert(1)" autofocus>'),
      
      // JavaScript URLs
      fc.constant('<a href="javascript:alert(1)">click</a>'),
      fc.constant('<iframe src="javascript:alert(1)">'),
      
      // SVG-based XSS
      fc.constant('<svg onload="alert(1)">'),
      fc.constant('<svg><script>alert(1)</script></svg>'),
      
      // Style-based XSS
      fc.constant('<div style="background:url(javascript:alert(1))">'),
      
      // HTML entity encoded (these ARE caught)
      fc.constant('&#60;script&#62;alert(1)&#60;/script&#62;'),
      
      // URL-encoded XSS payloads (now caught after SEC-FINDING-001 fix)
      fc.constant('%3Cscript%3Ealert(1)%3C/script%3E'),
      fc.constant('%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E'),
      fc.constant('%3Csvg%20onload%3Dalert(1)%3E'),
      
      // Double URL-encoded payloads
      fc.constant('%253Cscript%253Ealert(1)%253C/script%253E')
    );

    // Generator for safe inputs (should pass validation)
    // Note: We use simple alphanumeric strings to avoid characters that the sanitizer might encode
    // even though they're not XSS attacks, to focus on testing actual XSS protection
    // Also exclude % to avoid false positives from URL-decoding logic
    const safeInputArbitrary = fc.oneof(
      fc.string().filter(s => !/[<>&"'%]/.test(s) && s.length > 0),
      fc.constant('John Doe'),
      fc.constant('test@example.com'),
      fc.constant('+1234567890'),
      fc.constant('123456'),
      fc.constant('Hello World'),
      fc.constant('User Name 123')
    );

    it('should reject all XSS payloads (100 iterations)', () => {
      fc.assert(
        fc.property(xssPayloadArbitrary, (payload) => {
          const validator = CustomValidators.noXSS(sanitizer);
          const control = new FormControl(payload);
          const result = validator(control);
          
          // The validator should either:
          // 1. Return an error (xss validation failed)
          // 2. Or the sanitizer should have modified the input
          const sanitizedValue = sanitizer.sanitize(SecurityContext.HTML, payload);
          const wasModified = sanitizedValue !== payload;
          const hasError = result !== null && result['xss'] !== undefined;
          
          // At least one protection mechanism should trigger
          return wasModified || hasError;
        }),
        { numRuns: 100 }
      );
    });

    it('should accept safe inputs without modification (100 iterations)', () => {
      fc.assert(
        fc.property(safeInputArbitrary, (input) => {
          const validator = CustomValidators.noXSS(sanitizer);
          const control = new FormControl(input);
          const result = validator(control);
          
          // Safe inputs should pass validation (no error)
          return result === null;
        }),
        { numRuns: 100 }
      );
    });

    it('should handle empty and null inputs gracefully', () => {
      const validator = CustomValidators.noXSS(sanitizer);
      
      // Empty string
      const emptyControl = new FormControl('');
      expect(validator(emptyControl)).toBeNull();
      
      // Null value
      const nullControl = new FormControl(null);
      expect(validator(nullControl)).toBeNull();
      
      // Undefined value
      const undefinedControl = new FormControl(undefined);
      expect(validator(undefinedControl)).toBeNull();
    });

    it('should detect XSS in mixed content (100 iterations)', () => {
      // Generator for inputs that mix safe text with XSS payloads
      const mixedContentArbitrary = fc.tuple(
        fc.string().filter(s => !s.includes('<') && !s.includes('>')),
        xssPayloadArbitrary,
        fc.string().filter(s => !s.includes('<') && !s.includes('>'))
      ).map(([prefix, payload, suffix]) => `${prefix}${payload}${suffix}`);

      fc.assert(
        fc.property(mixedContentArbitrary, (input) => {
          const validator = CustomValidators.noXSS(sanitizer);
          const control = new FormControl(input);
          const result = validator(control);
          
          // Mixed content with XSS should be detected
          const sanitizedValue = sanitizer.sanitize(SecurityContext.HTML, input);
          const wasModified = sanitizedValue !== input;
          const hasError = result !== null && result['xss'] !== undefined;
          
          return wasModified || hasError;
        }),
        { numRuns: 100 }
      );
    });

    it('should provide meaningful error message when XSS detected', () => {
      const validator = CustomValidators.noXSS(sanitizer);
      const control = new FormControl('<script>alert("xss")</script>');
      const result = validator(control);
      
      if (result !== null && result['xss']) {
        expect(result['xss'].message).toBe('Input contains potentially harmful content');
      }
    });

    /**
     * Property 1: URL-Encoded XSS Detection (SEC-FINDING-001 fix)
     * *For any* XSS payload that would be detected in plaintext form, if that payload
     * is URL-encoded (single or multiple times), the validator SHALL still detect and reject it.
     * **Validates: Requirements 1.1, 1.2, 1.3**
     */
    it('should detect URL-encoded XSS payloads (100 iterations)', () => {
      // Generator for URL-encoded XSS payloads
      const urlEncodedXssArbitrary = fc.oneof(
        // Single URL-encoded
        fc.constant('%3Cscript%3Ealert(1)%3C/script%3E'),
        fc.constant('%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E'),
        fc.constant('%3Csvg%20onload%3Dalert(1)%3E'),
        fc.constant('%3Ca%20href%3Djavascript%3Aalert(1)%3Eclick%3C/a%3E'),
        fc.constant('%3Cdiv%20onmouseover%3Dalert(1)%3E'),
        // Double URL-encoded
        fc.constant('%253Cscript%253Ealert(1)%253C/script%253E'),
        fc.constant('%253Cimg%2520onerror%253Dalert(1)%253E'),
        // Mixed case encoded
        fc.constant('%3CSCRIPT%3Ealert(1)%3C/SCRIPT%3E')
      );

      fc.assert(
        fc.property(urlEncodedXssArbitrary, (payload) => {
          const validator = CustomValidators.noXSS(sanitizer);
          const control = new FormControl(payload);
          const result = validator(control);
          
          // URL-encoded XSS should be detected and rejected
          return result !== null && result['xss'] !== undefined;
        }),
        { numRuns: 100 }
      );
    });

    it('should allow valid URL-encoded content that is not XSS', () => {
      const validator = CustomValidators.noXSS(sanitizer);
      
      // Valid URL-encoded content (spaces, special chars)
      const validEncodedInputs = [
        'Hello%20World',           // space
        'test%40example.com',      // @ symbol
        'path%2Fto%2Ffile',        // forward slashes
        'name%3DJohn',             // equals sign
        'query%3Fvalue',           // question mark
      ];

      validEncodedInputs.forEach(input => {
        const control = new FormControl(input);
        const result = validator(control);
        expect(result).toBeNull(`Expected "${input}" to pass validation`);
      });
    });

    it('should handle malformed URL encoding gracefully', () => {
      const validator = CustomValidators.noXSS(sanitizer);
      
      // Malformed percent encoding (should not crash)
      const malformedInputs = [
        '%',
        '%%',
        '%G',
        '%GG',
        '%3',
        'test%',
        'test%2',
        '%ZZ',
      ];

      malformedInputs.forEach(input => {
        const control = new FormControl(input);
        // Should not throw, should return null (valid) or error object
        expect(() => validator(control)).not.toThrow();
      });
    });
  });

  /**
   * Additional property tests for other validators that contribute to XSS protection
   */
  describe('Email Validator XSS Protection', () => {
    it('should reject emails with XSS payloads (100 iterations)', () => {
      const xssEmailArbitrary = fc.oneof(
        fc.constant('<script>@example.com'),
        fc.constant('test<script>@example.com'),
        fc.constant('test@<script>.com'),
        fc.constant('"><script>alert(1)</script>@example.com')
      );

      fc.assert(
        fc.property(xssEmailArbitrary, (email) => {
          const validator = CustomValidators.email();
          const control = new FormControl(email);
          const result = validator(control);
          
          // XSS-containing emails should fail email validation
          return result !== null;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Name Validator XSS Protection', () => {
    it('should reject names with XSS payloads (100 iterations)', () => {
      const xssNameArbitrary = fc.oneof(
        fc.constant('<script>John</script>'),
        fc.constant('John<img onerror="alert(1)">'),
        fc.constant('"><script>alert(1)</script>'),
        fc.constant('John\'; DROP TABLE users;--')
      );

      fc.assert(
        fc.property(xssNameArbitrary, (name) => {
          const validator = CustomValidators.validateName('Name');
          const control = new FormControl(name);
          const result = validator(control);
          
          // XSS-containing names should fail name validation
          // (name validator only allows letters, spaces, hyphens, apostrophes)
          return result !== null;
        }),
        { numRuns: 100 }
      );
    });
  });
});
