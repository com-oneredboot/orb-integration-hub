import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

/**
 * Shared verification code input component
 * Used for email and phone verification flows
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
      <div class="verification-code__info" role="status" aria-live="polite">
        <p class="verification-code__message">{{ message }}</p>
        <p class="verification-code__destination" *ngIf="destination">
          <fa-icon [icon]="type === 'email' ? 'envelope' : 'mobile-alt'" class="verification-code__icon"></fa-icon>
          {{ destination }}
        </p>
      </div>
      
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
          
          <div *ngIf="showError" 
               [id]="inputId + '-error'" 
               class="verification-code__error" 
               role="alert" 
               aria-live="polite">
            <fa-icon icon="exclamation-circle" class="verification-code__error-icon"></fa-icon>
            <span class="sr-only">Error: </span>{{ errorMessage }}
          </div>
        </div>
      </div>
      
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
      color: var(--text-secondary, #6b7280);
      font-size: 0.95rem;
      margin: 0 0 0.5rem 0;
    }
    
    .verification-code__destination {
      color: var(--text-primary, #1f2937);
      font-weight: 600;
      font-size: 1rem;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    
    .verification-code__icon {
      color: var(--primary, #3b82f6);
    }
    
    .verification-code__input-group {
      margin-bottom: 1rem;
    }
    
    .verification-code__label {
      display: block;
      font-weight: 500;
      color: var(--text-primary, #1f2937);
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }
    
    .verification-code__required {
      color: var(--error, #ef4444);
    }
    
    .verification-code__input-container {
      position: relative;
    }
    
    .verification-code__input {
      width: 100%;
      padding: 0.75rem 1rem;
      font-size: 1.5rem;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
      letter-spacing: 0.5rem;
      text-align: center;
      border: 2px solid var(--border, #e5e7eb);
      border-radius: 0.5rem;
      background: var(--bg-input, #ffffff);
      color: var(--text-primary, #1f2937);
      transition: border-color 0.2s, box-shadow 0.2s;
      box-sizing: border-box;
    }
    
    .verification-code__input:focus {
      outline: none;
      border-color: var(--primary, #3b82f6);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    .verification-code__input--error {
      border-color: var(--error, #ef4444);
    }
    
    .verification-code__input--error:focus {
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }
    
    .verification-code__input--valid {
      border-color: var(--success, #10b981);
    }
    
    .verification-code__input::placeholder {
      color: var(--text-muted, #9ca3af);
      letter-spacing: 0.25rem;
    }
    
    .verification-code__error {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--error, #ef4444);
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
      color: var(--text-secondary, #6b7280);
    }
    
    .verification-code__resend-button {
      background: none;
      border: none;
      color: var(--primary, #3b82f6);
      font-weight: 500;
      cursor: pointer;
      padding: 0;
      font-size: inherit;
      transition: color 0.2s;
    }
    
    .verification-code__resend-button:hover:not(:disabled) {
      color: var(--primary-dark, #2563eb);
      text-decoration: underline;
    }
    
    .verification-code__resend-button:disabled {
      color: var(--text-muted, #9ca3af);
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
  @Input() type: 'email' | 'phone' = 'email';
  @Input() destination = '';
  @Input() message = 'Enter the 6-digit verification code.';
  @Input() label = 'Verification Code';
  @Input() placeholder = '000000';
  @Input() inputId = 'verification-code';
  @Input() showResend = true;
  @Input() canResend = true;
  @Input() resendLoading = false;
  @Input() externalError: string | null = null;
  
  @Output() resend = new EventEmitter<void>();
  
  codeControl = new FormControl('', [
    Validators.required,
    Validators.minLength(6),
    Validators.maxLength(6),
    Validators.pattern(/^\d{6}$/)
  ]);
  
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  
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
