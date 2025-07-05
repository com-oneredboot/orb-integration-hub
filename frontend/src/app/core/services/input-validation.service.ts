// file: frontend/src/app/core/services/input-validation.service.ts
// author: Claude Code Assistant
// date: 2025-06-20
// description: Comprehensive input validation service with RFC 5322 email validation, E.164 phone validation, and XSS prevention

import { Injectable } from '@angular/core';
import DOMPurify from 'dompurify';

// Interface for validation results
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalizedValue?: string;
}

// Interface for email validation result
export interface EmailValidationResult extends ValidationResult {
  domain?: string;
  isDisposable?: boolean;
  hasValidMx?: boolean;
}

// Interface for phone validation result
export interface PhoneValidationResult extends ValidationResult {
  countryCode?: string;
  nationalNumber?: string;
  formattedNumber?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InputValidationService {

  // RFC 5322 compliant email regex (simplified but robust)
  private readonly emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  // E.164 phone number regex
  private readonly phoneRegex = /^\+?[1-9]\d{1,14}$/;

  // More strict phone validation regex
  private readonly strictPhoneRegex = /^\+[1-9]\d{1,14}$/;

  // Disposable email providers (basic list - would be expanded in production)
  private readonly disposableEmailProviders = new Set([
    '10minutemail.com',
    'tempmail.org',
    'guerrillamail.com',
    'mailinator.com',
    'yopmail.com',
    'temp-mail.org',
    'throwaway.email',
    'getnada.com'
  ]);

  // XSS prevention using DOMPurify
  private sanitizeInput(input: string): string {
    return DOMPurify.sanitize(input);
  }

  constructor() {}

  /**
   * Comprehensive email validation with RFC 5322 compliance
   */
  validateEmail(email: string): EmailValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic sanitization
    const sanitizedEmail = this.sanitizeInput(email).toLowerCase().trim();

    // Length validation
    if (sanitizedEmail.length === 0) {
      errors.push('Email is required');
      return { isValid: false, errors, warnings };
    }

    if (sanitizedEmail.length > 254) {
      errors.push('Email address is too long (maximum 254 characters)');
    }

    // Format validation
    if (!this.emailRegex.test(sanitizedEmail)) {
      errors.push('Please enter a valid email address');
      return { isValid: false, errors, warnings };
    }

    // Extract domain
    const domain = sanitizedEmail.split('@')[1];
    if (!domain) {
      errors.push('Invalid email format');
      return { isValid: false, errors, warnings };
    }

    // Domain validation
    if (domain.length > 253) {
      errors.push('Email domain is too long');
    }

    // Check for disposable email
    const isDisposable = this.disposableEmailProviders.has(domain);
    if (isDisposable) {
      warnings.push('Disposable email addresses may not receive important notifications');
    }

    // Additional format checks
    if (sanitizedEmail.includes('..')) {
      errors.push('Email cannot contain consecutive dots');
    }

    if (sanitizedEmail.startsWith('.') || sanitizedEmail.endsWith('.')) {
      errors.push('Email cannot start or end with a dot');
    }

    const result: EmailValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      normalizedValue: sanitizedEmail,
      domain,
      isDisposable,
      hasValidMx: undefined // Would implement MX record checking in production
    };

    return result;
  }

  /**
   * Comprehensive phone number validation with E.164 format
   */
  validatePhoneNumber(phoneNumber: string): PhoneValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic sanitization - remove all non-digit characters except +
    const sanitized = phoneNumber.replace(/[^\d+]/g, '');
    
    if (sanitized.length === 0) {
      errors.push('Phone number is required');
      return { isValid: false, errors, warnings };
    }

    // Length validation
    if (sanitized.length < 7) {
      errors.push('Phone number is too short');
    }

    if (sanitized.length > 15) {
      errors.push('Phone number is too long (maximum 15 digits)');
    }

    // Format validation
    let formattedNumber = sanitized;
    
    // Add + if not present
    if (!sanitized.startsWith('+')) {
      // Assume US number if no country code
      if (sanitized.length === 10) {
        formattedNumber = '+1' + sanitized;
      } else if (sanitized.length === 11 && sanitized.startsWith('1')) {
        formattedNumber = '+' + sanitized;
      } else {
        errors.push('Phone number must include country code or be a valid 10-digit US number');
      }
    }

    // E.164 format validation
    if (!this.strictPhoneRegex.test(formattedNumber)) {
      errors.push('Please enter a valid international phone number (e.g., +1234567890)');
    }

    // Extract country code and national number
    let countryCode = '';
    let nationalNumber = '';
    
    if (formattedNumber.startsWith('+')) {
      // Simple country code extraction (would use a proper library in production)
      const withoutPlus = formattedNumber.substring(1);
      if (withoutPlus.startsWith('1')) {
        countryCode = '1';
        nationalNumber = withoutPlus.substring(1);
      } else if (withoutPlus.length >= 10) {
        // Assume 1-3 digit country code
        countryCode = withoutPlus.substring(0, 2);
        nationalNumber = withoutPlus.substring(2);
      }
    }

    const result: PhoneValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      normalizedValue: formattedNumber,
      countryCode,
      nationalNumber,
      formattedNumber
    };

    return result;
  }

  /**
   * Validate verification codes (6-digit numeric)
   */
  validateVerificationCode(code: string): ValidationResult {
    const errors: string[] = [];
    const sanitized = code.replace(/\D/g, ''); // Remove non-digits

    if (sanitized.length === 0) {
      errors.push('Verification code is required');
    } else if (sanitized.length !== 6) {
      errors.push('Verification code must be exactly 6 digits');
    }

    if (!/^\d{6}$/.test(sanitized)) {
      errors.push('Verification code must contain only numbers');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
      normalizedValue: sanitized
    };
  }

  /**
   * Validate names (first name, last name)
   */
  validateName(name: string, fieldName: string = 'Name'): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Sanitize input
    const sanitized = this.sanitizeInput(name).trim();

    if (sanitized.length === 0) {
      errors.push(`${fieldName} is required`);
      return { isValid: false, errors, warnings };
    }

    if (sanitized.length < 2) {
      errors.push(`${fieldName} must be at least 2 characters long`);
    }

    if (sanitized.length > 50) {
      errors.push(`${fieldName} must be less than 50 characters`);
    }

    // Only allow letters, spaces, hyphens, and apostrophes
    if (!/^[a-zA-Z\s'-]+$/.test(sanitized)) {
      errors.push(`${fieldName} can only contain letters, spaces, hyphens, and apostrophes`);
    }

    // Check for suspicious patterns
    if (/\d/.test(sanitized)) {
      errors.push(`${fieldName} cannot contain numbers`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      normalizedValue: sanitized
    };
  }

  /**
   * Enhanced password validation
   */
  validatePassword(password: string): ValidationResult & {
    strength: 'weak' | 'medium' | 'strong';
    criteria: {
      minLength: boolean;
      hasUppercase: boolean;
      hasLowercase: boolean;
      hasNumber: boolean;
      hasSpecial: boolean;
      noCommonPatterns: boolean;
    };
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const criteria = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      noCommonPatterns: !this.hasCommonPasswordPatterns(password)
    };

    // Validation rules
    if (!criteria.minLength) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!criteria.hasUppercase) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!criteria.hasLowercase) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!criteria.hasNumber) {
      errors.push('Password must contain at least one number');
    }

    if (!criteria.hasSpecial) {
      errors.push('Password must contain at least one special character');
    }

    if (!criteria.noCommonPatterns) {
      warnings.push('Password contains common patterns that may be easily guessed');
    }

    // Calculate strength
    const passedCriteria = Object.values(criteria).filter(Boolean).length;
    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    
    if (passedCriteria >= 5) {
      strength = 'strong';
    } else if (passedCriteria >= 3) {
      strength = 'medium';
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      strength,
      criteria
    };
  }

  /**
   * Sanitize input to prevent XSS attacks
   */
  sanitizeInput(input: string): string {
    if (!input) return '';

    let sanitized = input;

    // Remove potential XSS patterns
    this.xssPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // HTML entity encoding for common characters
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    return sanitized;
  }

  /**
   * Check for common password patterns
   */
  private hasCommonPasswordPatterns(password: string): boolean {
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /abc123/i,
      /111111/,
      /123123/,
      /admin/i,
      /letmein/i,
      /welcome/i,
      /monkey/i
    ];

    return commonPatterns.some(pattern => pattern.test(password));
  }

  /**
   * Validate input length
   */
  validateLength(input: string, minLength: number, maxLength: number, fieldName: string = 'Field'): ValidationResult {
    const errors: string[] = [];
    const length = input.length;

    if (length < minLength) {
      errors.push(`${fieldName} must be at least ${minLength} characters long`);
    }

    if (length > maxLength) {
      errors.push(`${fieldName} must be no more than ${maxLength} characters long`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * Normalize email address
   */
  normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  /**
   * Format phone number for display
   */
  formatPhoneForDisplay(phoneNumber: string): string {
    const digits = phoneNumber.replace(/\D/g, '');
    
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    
    return phoneNumber; // Return original if can't format
  }
}