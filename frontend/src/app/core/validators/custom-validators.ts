// file: frontend/src/app/core/validators/custom-validators.ts
// author: Claude Code Assistant  
// date: 2025-06-20
// description: Custom Angular validators for comprehensive input validation with security focus

import { AbstractControl, ValidationErrors, ValidatorFn, AsyncValidatorFn } from '@angular/forms';
import { DomSanitizer, SecurityContext } from '@angular/platform-browser';
import { Observable, of, timer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

/**
 * Custom validators class with comprehensive validation methods
 */
export class CustomValidators {

  /**
   * RFC 5322 compliant email validator
   */
  static email(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Don't validate empty values - use required validator for that
      }

      const email = control.value.toLowerCase().trim();
      
      // RFC 5322 compliant regex (simplified but robust)
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      
      if (!emailRegex.test(email)) {
        return { email: { value: control.value, message: 'Please enter a valid email address' } };
      }

      // Additional email format checks
      if (email.length > 254) {
        return { email: { value: control.value, message: 'Email address is too long (maximum 254 characters)' } };
      }

      if (email.includes('..')) {
        return { email: { value: control.value, message: 'Email cannot contain consecutive dots' } };
      }

      if (email.startsWith('.') || email.endsWith('.')) {
        return { email: { value: control.value, message: 'Email cannot start or end with a dot' } };
      }

      return null;
    };
  }

  /**
   * Disposable email validator
   */
  static noDisposableEmail(): ValidatorFn {
    const disposableProviders = new Set([
      '10minutemail.com',
      'tempmail.org', 
      'guerrillamail.com',
      'mailinator.com',
      'yopmail.com',
      'temp-mail.org',
      'throwaway.email',
      'getnada.com'
    ]);

    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const email = control.value.toLowerCase().trim();
      const domain = email.split('@')[1];
      
      if (domain && disposableProviders.has(domain)) {
        return { 
          disposableEmail: { 
            value: control.value, 
            message: 'Disposable email addresses are not allowed' 
          } 
        };
      }

      return null;
    };
  }

  /**
   * E.164 phone number validator
   */
  static phoneNumber(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      // Remove all non-digit characters except +
      const sanitized = control.value.replace(/[^\d+]/g, '');
      
      if (sanitized.length < 7) {
        return { phoneNumber: { value: control.value, message: 'Phone number is too short' } };
      }

      if (sanitized.length > 15) {
        return { phoneNumber: { value: control.value, message: 'Phone number is too long (maximum 15 digits)' } };
      }

      // E.164 format validation
      const e164Regex = /^\+[1-9]\d{1,14}$/;
      const usPhoneRegex = /^\d{10}$/; // Allow 10-digit US numbers
      const usPhoneWithCountryRegex = /^1\d{10}$/; // Allow 11-digit US numbers starting with 1

      let formattedNumber = sanitized;
      
      // Handle US numbers
      if (usPhoneRegex.test(sanitized)) {
        formattedNumber = '+1' + sanitized;
      } else if (usPhoneWithCountryRegex.test(sanitized)) {
        formattedNumber = '+' + sanitized;
      }

      if (!e164Regex.test(formattedNumber)) {
        return { 
          phoneNumber: { 
            value: control.value, 
            message: 'Please enter a valid international phone number (e.g., +1234567890)' 
          } 
        };
      }

      return null;
    };
  }

  /**
   * Verification code validator (6-digit numeric)
   */
  static verificationCode(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const sanitized = control.value.replace(/\D/g, '');

      if (sanitized.length !== 6) {
        return { 
          verificationCode: { 
            value: control.value, 
            message: 'Verification code must be exactly 6 digits' 
          } 
        };
      }

      if (!/^\d{6}$/.test(sanitized)) {
        return { 
          verificationCode: { 
            value: control.value, 
            message: 'Verification code must contain only numbers' 
          } 
        };
      }

      return null;
    };
  }

  /**
   * Enhanced password validator with strength checking
   */
  static password(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const password = control.value;
      const errors: string[] = [];

      // Length check
      if (password.length < 8) {
        errors.push('at least 8 characters');
      }

      // Character type checks
      if (!/[A-Z]/.test(password)) {
        errors.push('one uppercase letter');
      }

      if (!/[a-z]/.test(password)) {
        errors.push('one lowercase letter');
      }

      if (!/\d/.test(password)) {
        errors.push('one number');
      }

      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('one special character');
      }

      // Common pattern checks
      const commonPatterns = [
        /123456/,
        /password/i,
        /qwerty/i,
        /abc123/i,
        /111111/,
        /123123/
      ];

      if (commonPatterns.some(pattern => pattern.test(password))) {
        errors.push('no common patterns');
      }

      if (errors.length > 0) {
        return {
          password: {
            value: control.value,
            message: `Password must include: ${errors.join(', ')}`
          }
        };
      }

      return null;
    };
  }

  /**
   * Name validator (first name, last name)
   */
  static validateName(fieldName: string = 'Name'): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const sanitized = control.value.trim();

      if (sanitized.length < 2) {
        return { 
          name: { 
            value: control.value, 
            message: `${fieldName} must be at least 2 characters long` 
          } 
        };
      }

      if (sanitized.length > 50) {
        return { 
          name: { 
            value: control.value, 
            message: `${fieldName} must be less than 50 characters` 
          } 
        };
      }

      // Only allow letters, spaces, hyphens, and apostrophes
      if (!/^[a-zA-Z\s'-]+$/.test(sanitized)) {
        return { 
          name: { 
            value: control.value, 
            message: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` 
          } 
        };
      }

      return null;
    };
  }

  /**
   * Input sanitization validator to prevent XSS
   */
  static noXSS(sanitizer: DomSanitizer): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const value = control.value;
      const sanitizedValue = sanitizer.sanitize(SecurityContext.HTML, value);

      if (sanitizedValue !== value) {
        return {
          xss: {
            value: control.value,
            message: 'Input contains potentially harmful content'
          }
        };
      }

      return null;
    };
  }

  /**
   * Custom length validator
   */
  static customLength(min: number, max: number, fieldName: string = 'Field'): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const length = control.value.length;

      if (length < min) {
        return {
          customLength: {
            value: control.value,
            message: `${fieldName} must be at least ${min} characters long`
          }
        };
      }

      if (length > max) {
        return {
          customLength: {
            value: control.value,
            message: `${fieldName} must be no more than ${max} characters long`
          }
        };
      }

      return null;
    };
  }

  /**
   * No whitespace validator
   */
  static noWhitespace(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      if (control.value.trim().length === 0) {
        return {
          whitespace: {
            value: control.value,
            message: 'Field cannot contain only whitespace'
          }
        };
      }

      return null;
    };
  }

  /**
   * Async email domain validator (simulated - would check MX records in production)
   */
  static validEmailDomain(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }

      const email = control.value.toLowerCase().trim();
      const domain = email.split('@')[1];

      if (!domain) {
        return of(null);
      }

      // Simulate async domain validation with delay
      return timer(500).pipe(
        switchMap(() => {
          // In production, this would make an actual HTTP request to validate domain
          // For now, simulate validation of common domains
          const validDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
          const isKnownValid = validDomains.includes(domain);
          
          // Simulate some domains as invalid
          const invalidDomains = ['invalid-domain.com', 'fake-email.xyz'];
          const isKnownInvalid = invalidDomains.includes(domain);

          if (isKnownInvalid) {
            return of({
              invalidDomain: {
                value: control.value,
                message: 'Email domain does not exist'
              }
            });
          }

          return of(null);
        })
      );
    };
  }

  /**
   * Debounced async validator for real-time validation
   */
  static debouncedValidator(validatorFn: AsyncValidatorFn, debounceTime: number = 300): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      return timer(debounceTime).pipe(
        switchMap(() => validatorFn(control))
      );
    };
  }

  /**
   * Combine multiple validators with custom error messages
   */
  static combine(validators: ValidatorFn[]): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const errors: ValidationErrors = {};

      validators.forEach(validator => {
        const result = validator(control);
        if (result) {
          Object.assign(errors, result);
        }
      });

      return Object.keys(errors).length > 0 ? errors : null;
    };
  }
}