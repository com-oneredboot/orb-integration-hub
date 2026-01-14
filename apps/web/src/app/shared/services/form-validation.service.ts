// file: apps/web/src/app/shared/services/form-validation.service.ts
// author: Claude Code Assistant
// date: 2025-06-23
// description: Shared service for common form validation patterns and error handling

import { Injectable } from '@angular/core';
import { AbstractControl, FormControl, FormGroup } from '@angular/forms';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  severity: 'error' | 'warning' | 'info';
}

export interface PasswordValidationResult {
  isValid: boolean;
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
  strength: 'weak' | 'fair' | 'good' | 'strong';
}

@Injectable({
  providedIn: 'root'
})
export class FormValidationService {

  /**
   * Check if a form field is invalid and has been touched or dirty
   */
  isFieldInvalid(control: AbstractControl | null): boolean {
    if (!control) return false;
    return !!(control.invalid && (control.dirty || control.touched));
  }

  /**
   * Get appropriate error message for a form control
   */
  getErrorMessage(control: AbstractControl | null, fieldName = 'Field'): string {
    if (!control || !control.errors) return '';

    const errors = control.errors;

    // Required field
    if (errors['required']) {
      return `${fieldName} is required`;
    }

    // Email validation
    if (errors['email']) {
      return 'Please enter a valid email address';
    }

    // Pattern validation
    if (errors['pattern']) {
      if (fieldName.toLowerCase().includes('email')) {
        return 'Please enter a valid email address';
      }
      if (fieldName.toLowerCase().includes('phone')) {
        return 'Please enter a valid phone number';
      }
      return `${fieldName} format is invalid`;
    }

    // Min/Max length
    if (errors['minlength']) {
      const requiredLength = errors['minlength'].requiredLength;
      return `${fieldName} must be at least ${requiredLength} characters`;
    }

    if (errors['maxlength']) {
      const requiredLength = errors['maxlength'].requiredLength;
      return `${fieldName} cannot exceed ${requiredLength} characters`;
    }

    // Password-specific validations
    if (errors['passwordStrength']) {
      return 'Password must contain uppercase, lowercase, number, and special character';
    }

    // Phone number validation
    if (errors['phoneNumber']) {
      return 'Please enter a valid phone number with country code';
    }

    // Name validation
    if (errors['invalidName']) {
      return 'Please enter a valid name (letters, spaces, hyphens, and apostrophes only)';
    }

    // Custom validation messages
    if (errors['custom']) {
      return errors['custom'].message || 'Invalid input';
    }

    // Default message
    return `${fieldName} is invalid`;
  }

  /**
   * Validate password strength and requirements
   */
  validatePassword(password: string): PasswordValidationResult {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
    };

    const metRequirements = Object.values(requirements).filter(Boolean).length;
    
    let strength: 'weak' | 'fair' | 'good' | 'strong';
    if (metRequirements < 2) {
      strength = 'weak';
    } else if (metRequirements < 4) {
      strength = 'fair';
    } else if (metRequirements === 4) {
      strength = 'good';
    } else {
      strength = 'strong';
    }

    return {
      isValid: metRequirements >= 4 && requirements.length,
      requirements,
      strength
    };
  }

  /**
   * Get password requirement messages
   */
  getPasswordRequirements(): { key: string; label: string; pattern: RegExp }[] {
    return [
      { key: 'length', label: 'At least 8 characters', pattern: /.{8,}/ },
      { key: 'uppercase', label: 'One uppercase letter', pattern: /[A-Z]/ },
      { key: 'lowercase', label: 'One lowercase letter', pattern: /[a-z]/ },
      { key: 'number', label: 'One number', pattern: /\d/ },
      { key: 'special', label: 'One special character', pattern: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/ }
    ];
  }

  /**
   * Validate email format
   */
  validateEmail(email: string): ValidationResult {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const isValid = emailPattern.test(email);

    return {
      isValid,
      errors: isValid ? [] : ['Please enter a valid email address'],
      severity: 'error'
    };
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phone: string): ValidationResult {
    // Remove all non-digit characters for validation
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Check for valid US phone number (10 digits) or international format
    const isValidUS = /^1?\d{10}$/.test(cleanPhone);
    const isValidInternational = /^\+\d{10,15}$/.test(phone);
    
    const isValid = isValidUS || isValidInternational;

    return {
      isValid,
      errors: isValid ? [] : ['Please enter a valid phone number'],
      severity: 'error'
    };
  }

  /**
   * Validate name format (allows letters, spaces, hyphens, apostrophes)
   */
  validateName(name: string): ValidationResult {
    const namePattern = /^[a-zA-Z\s\-']+$/;
    const isValid = namePattern.test(name) && name.trim().length >= 1;

    return {
      isValid,
      errors: isValid ? [] : ['Please enter a valid name'],
      severity: 'error'
    };
  }

  /**
   * Get form validation summary
   */
  getFormValidationSummary(form: FormGroup): {
    isValid: boolean;
    invalidFields: string[];
    errorCount: number;
  } {
    const invalidFields: string[] = [];
    let errorCount = 0;

    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      if (control && control.invalid) {
        invalidFields.push(key);
        errorCount += Object.keys(control.errors || {}).length;
      }
    });

    return {
      isValid: form.valid,
      invalidFields,
      errorCount
    };
  }

  /**
   * Focus on first invalid field in form
   */
  focusFirstInvalidField(form: FormGroup): void {
    const firstInvalidControl = Object.keys(form.controls).find(key => {
      const control = form.get(key);
      return control && control.invalid;
    });

    if (firstInvalidControl) {
      const element = document.querySelector(`[formControlName="${firstInvalidControl}"]`) as HTMLElement;
      if (element) {
        element.focus();
      }
    }
  }

  /**
   * Mark all fields as touched to trigger validation display
   */
  markAllFieldsAsTouched(form: FormGroup): void {
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  /**
   * Clear all validation errors from form
   */
  clearFormErrors(form: FormGroup): void {
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      if (control) {
        control.setErrors(null);
        control.markAsUntouched();
        control.markAsPristine();
      }
    });
  }
}