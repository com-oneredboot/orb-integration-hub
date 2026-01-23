import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faEnvelope, faMobileAlt, faShieldAlt, faExclamationCircle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';

/**
 * Verification code type - determines icon and messaging
 */
export type VerificationCodeType = 'email' | 'phone' | 'mfa';

/**
 * Shared verification code input component
 * Used for email, phone, and MFA verification flows
 * Styled to match auth-flow component for consistency
 */
@Component({
  selector: 'app-verification-code-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FontAwesomeModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => VerificationCodeInputComponent),
      multi: true
    }
  ],
  template: `
    <div class="verification-code">
      <!-- Info section with icon and destination -->
      <div class="verification-code__info" role="status" aria-live="polite">
        <p class="verification-code__message">{{ message }}</p>
        <p class="verification-code__destination" *ngIf="destination">
          <fa-icon [icon]="getTypeIcon()" class="verification-code__icon"></fa-icon>
          {{ destination }}
        </p>
      </div>
      
      <!-- Input group matching auth-flow styling -->
      <div class="verification-code__input-group">
        <label [for]="inputId" class="verification-code__label">
          {{ label }} <span class="verification-code__required" aria-label="required">*</span>
        </label>
        <div class="verification-code__input-container">
          <input 
            type="text"
            [id]="inputId"
            [formControl]="codeControl"
            class="verification-code__input"
            [ngClass]="{
              'verification-code__input--error': showError,
              'verification-code__input--valid': isValid && codeControl.touched
            }"
            [placeholder]="placeholder"
            [attr.aria-describedby]="inputId + '-error'"
            [attr.aria-invalid]="showError"
            aria-required="true"
            inputmode="numeric"
            pattern="[0-9]{6}"
            maxlength="6"
            autocomplete="one-time-code"
            (input)="onInput($event)"
            (blur)="onBlur()">
          
          <!-- Valid indicator -->
          <div *ngIf="isValid && codeControl.touched && !showError" 
               class="verification-code__valid-indicator"
               aria-live="polite">
            <fa-icon [icon]="faCheckCircle" class="verification-code__valid-icon"></fa-icon>
            <span class="sr-only">Code format is valid</span>
          </div>
          
          <!-- Error message -->
          <div *ngIf="showError" 
               [id]="inputId + '-error'" 
               class="verification-code__error" 
               role="alert" 
               aria-live="polite">
            <fa-icon [icon]="faExclamationCircle" class="verification-code__error-icon"></fa-icon>
            <span class="sr-only">Error: </span>{{ errorMessage }}
          </div>
        </div>
      </div>
      
      <!-- Resend section -->
      <div class="verification-code__resend" *ngIf="showResend">
        <span class="verification-code__resend-text">Didn't receive the code?</span>
        <button 
          type="button" 
          class="verification-code__resend-button"
          [disabled]="!canResend || resendLoading"
          (click)="onResendClick()">
          {{ resendLoading ? 'Sending...' : 'Resend Code' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .verification-code {
      width: 100%;
    }
    
    .verification-code__info {
      text-align: center;
      margin-bottom: 1.5rem;
    }
    
    .verification-code__message {
      color: var(--orb-text-secondary, #666666);
      font-size: 0.95rem;
      margin: 0 0 0.5rem 0;
      line-height: 1.5;
    }
    
    .verification-code__destination {
      color: var(--orb-text-primary, #000000);
      font-weight: 600;
      font-size: 1rem;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    
    .verification-code__icon {
      color: var(--orb-primary, #E31837);
    }
    
    .verification-code__input-group {
      width: 100%;
      margin-bottom: 1rem;
    }
    
    .verification-code__label {
      display: block;
      font-weight: 500;
      color: var(--orb-text-primary, #000000);
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }
    
    .verification-code__required {
      color: var(--orb-error, #E31837);
      font-weight: 700;
    }
    
    .verification-code__input-container {
      position: relative;
      width: 100%;
    }
    
    /* Input styling matching auth-flow */
    .verification-code__input {
      width: 100%;
      padding: 0.75rem 1rem;
      font-size: 1rem;
      font-family: inherit;
      color: var(--orb-text-primary, #000000);
      border: 2px solid var(--orb-border, #9ca3af);
      border-radius: 0.5rem;
      background: var(--orb-white, #ffffff);
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      box-sizing: border-box;
    }
    
    .verification-code__input::placeholder {
      color: var(--orb-text-muted, #9ca3af);
      opacity: 1;
    }
    
    .verification-code__input:focus {
      outline: none;
      border-color: var(--orb-primary, #E31837);
      box-shadow: 0 0 0 3px rgba(227, 24, 55, 0.3);
    }
    
    /* High contrast focus for accessibility */
    @media (prefers-contrast: high) {
      .verification-code__input:focus {
        box-shadow: 0 0 0 3px var(--orb-primary, #E31837);
        border-color: var(--orb-primary, #E31837);
      }
    }
    
    .verification-code__input--error {
      border-color: var(--orb-error, #E31837);
      animation: shake 0.5s ease-in-out;
    }
    
    .verification-code__input--error:focus {
      box-shadow: 0 0 0 3px rgba(227, 24, 55, 0.3);
    }
    
    .verification-code__input--valid {
      border-color: var(--orb-success, #2B8A3E);
      background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%232B8A3E"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>');
      background-repeat: no-repeat;
      background-position: right 12px center;
      background-size: 16px 16px;
      padding-right: 40px;
    }
    
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
      20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    
    .verification-code__valid-indicator {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--orb-success, #2B8A3E);
    }
    
    .verification-code__valid-icon {
      font-size: 1rem;
    }
    
    .verification-code__error {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--orb-error, #E31837);
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
    
    .verification-code__error-icon {
      flex-shrink: 0;
    }
    
    .verification-code__resend {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-top: 1rem;
      font-size: 0.875rem;
    }
    
    .verification-code__resend-text {
      color: var(--orb-text-secondary, #666666);
    }
    
    .verification-code__resend-button {
      background: none;
      border: none;
      color: var(--orb-primary, #E31837);
      font-weight: 500;
      cursor: pointer;
      padding: 0;
      font-size: inherit;
      transition: color 0.2s;
      text-decoration: underline;
    }
    
    .verification-code__resend-button:hover:not(:disabled) {
      color: var(--orb-primary-dark, #c91518);
    }
    
    .verification-code__resend-button:disabled {
      color: var(--orb-text-muted, #9ca3af);
      cursor: not-allowed;
    }
    
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `]
})
export class VerificationCodeInputComponent implements ControlValueAccessor {
  @Input() type: VerificationCodeType = 'email';
  @Input() destination = '';
  @Input() message = 'Enter the 6-digit verification code.';
  @Input() label = 'Verification Code';
  @Input() placeholder = 'Enter 6-digit code';
  @Input() inputId = 'verification-code';
  @Input() showResend = false;
  @Input() canResend = true;
  @Input() resendLoading = false;
  @Input() externalError: string | null = null;
  
  @Output() resend = new EventEmitter<void>();
  
  // FontAwesome icons
  faEnvelope = faEnvelope;
  faMobileAlt = faMobileAlt;
  faShieldAlt = faShieldAlt;
  faExclamationCircle = faExclamationCircle;
  faCheckCircle = faCheckCircle;
  
  codeControl = new FormControl('', [
    Validators.required,
    Validators.minLength(6),
    Validators.maxLength(6),
    Validators.pattern(/^\d{6}$/)
  ]);
  
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  
  /**
   * Get the appropriate icon based on verification type
   */
  getTypeIcon() {
    switch (this.type) {
      case 'email':
        return this.faEnvelope;
      case 'phone':
        return this.faMobileAlt;
      case 'mfa':
        return this.faShieldAlt;
      default:
        return this.faEnvelope;
    }
  }
  
  get showError(): boolean {
    return (this.codeControl.invalid && this.codeControl.touched) || !!this.externalError;
  }
  
  get errorMessage(): string {
    if (this.externalError) {
      return this.externalError;
    }
    if (this.codeControl.errors?.['required']) {
      return 'Verification code is required';
    }
    if (this.codeControl.errors?.['pattern'] || this.codeControl.errors?.['minlength']) {
      return 'Please enter a 6-digit code';
    }
    return 'Invalid code';
  }
  
  get isValid(): boolean {
    return this.codeControl.valid && !this.externalError;
  }
  
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Only allow digits
    const value = input.value.replace(/\D/g, '').slice(0, 6);
    input.value = value;
    this.codeControl.setValue(value);
    this.onChange(value);
  }
  
  onBlur(): void {
    this.codeControl.markAsTouched();
    this.onTouched();
  }
  
  onResendClick(): void {
    this.resend.emit();
  }
  
  // ControlValueAccessor implementation
  writeValue(value: string): void {
    this.codeControl.setValue(value || '', { emitEvent: false });
  }
  
  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }
  
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  
  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.codeControl.disable();
    } else {
      this.codeControl.enable();
    }
  }
}
