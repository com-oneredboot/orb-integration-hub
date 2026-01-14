// file: apps/web/src/app/shared/components/auth/auth-input-field.component.ts
// author: Corey Dale Peters
// date: 2025-06-21
// description: Reusable authentication input field component with validation, accessibility, and UX enhancements

import { Component, Input, Output, EventEmitter, forwardRef, OnInit, OnDestroy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

export type AuthInputType = 'text' | 'email' | 'password' | 'tel' | 'number';
export type AuthInputVariant = 'default' | 'outlined' | 'filled';
export type AuthInputSize = 'small' | 'medium' | 'large';
export type ValidationState = 'none' | 'pending' | 'valid' | 'invalid';

@Component({
  selector: 'app-auth-input-field',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FontAwesomeModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AuthInputFieldComponent),
      multi: true
    }
  ],
  template: `
    <div class="auth-input" 
         [class]="getInputClasses()"
         [attr.data-variant]="variant"
         [attr.data-size]="size">
      
      <!-- Label -->
      <label *ngIf="label" 
             [for]="inputId" 
             class="auth-input__label"
             [class.auth-input__label--required]="required">
        {{ label }}
        <span *ngIf="required" class="auth-input__required" aria-label="required">*</span>
      </label>
      
      <!-- Input Container -->
      <div class="auth-input__container" 
           [class.auth-input__container--focused]="isFocused">
        
        <!-- Leading Icon -->
        <div *ngIf="leadingIcon" class="auth-input__icon auth-input__icon--leading">
          <i [class]="'fa fa-' + leadingIcon" aria-hidden="true"></i>
        </div>
        
        <!-- Input Field -->
        <input #inputElement
               [id]="inputId"
               [type]="inputType"
               [placeholder]="placeholder"
               [disabled]="disabled"
               [readonly]="readonly"
               [autocomplete]="autocomplete"
               [attr.aria-describedby]="getAriaDescribedBy()"
               [attr.aria-invalid]="validationState === 'invalid'"
               [attr.aria-required]="required"
               class="auth-input__field"
               [value]="value"
               (input)="onInput($event)"
               (focus)="onFocus()"
               (blur)="onBlur()"
               (keydown)="onKeyDown($event)">
        
        <!-- Password Toggle -->
        <button *ngIf="type === 'password'" 
                type="button"
                class="auth-input__toggle"
                [attr.aria-label]="passwordVisible ? 'Hide password' : 'Show password'"
                (click)="togglePasswordVisibility()">
          <i [class]="passwordVisible ? 'fa fa-eye-slash' : 'fa fa-eye'" 
             aria-hidden="true"></i>
        </button>
        
        <!-- Trailing Icon -->
        <div *ngIf="trailingIcon || showValidationIcon" 
             class="auth-input__icon auth-input__icon--trailing">
          
          <!-- Validation Icons -->
          <i *ngIf="showValidationIcon && validationState === 'valid'" 
             class="fa fa-check auth-input__validation-icon auth-input__validation-icon--valid" 
             aria-hidden="true"></i>
          <i *ngIf="showValidationIcon && validationState === 'pending'" 
             class="fa fa-spinner fa-spin auth-input__validation-icon auth-input__validation-icon--pending" 
             aria-hidden="true"></i>
          <i *ngIf="showValidationIcon && validationState === 'invalid'" 
             class="fa fa-exclamation-circle auth-input__validation-icon auth-input__validation-icon--invalid" 
             aria-hidden="true"></i>
          
          <!-- Custom Trailing Icon -->
          <i *ngIf="trailingIcon && !showValidationIcon" 
             [class]="'fa fa-' + trailingIcon" 
             aria-hidden="true"></i>
        </div>
      </div>
      
      <!-- Help Text -->
      <div *ngIf="helpText && !showError" 
           [id]="helpId" 
           class="auth-input__help">
        {{ helpText }}
      </div>
      
      <!-- Error Message -->
      <div *ngIf="showError && errorMessage" 
           [id]="errorId"
           class="auth-input__error" 
           role="alert" 
           aria-live="polite">
        <i class="fa fa-exclamation-circle auth-input__error-icon" aria-hidden="true"></i>
        <span>{{ errorMessage }}</span>
      </div>
      
      <!-- Success Message -->
      <div *ngIf="validationState === 'valid' && successMessage" 
           [id]="successId"
           class="auth-input__success" 
           role="status">
        <i class="fa fa-check-circle auth-input__success-icon" aria-hidden="true"></i>
        <span>{{ successMessage }}</span>
      </div>
      
      <!-- Loading State -->
      <div *ngIf="validationState === 'pending'" 
           class="auth-input__loading"
           role="status"
           aria-live="polite">
        <div class="auth-input__loading-spinner"></div>
        <span>{{ loadingMessage || 'Validating...' }}</span>
      </div>
    </div>
  `,
  styleUrls: ['./auth-input-field.component.scss']
})
export class AuthInputFieldComponent implements ControlValueAccessor, OnInit, OnDestroy {
  // Basic Input Properties
  @Input() label?: string;
  @Input() placeholder?: string;
  @Input() type: AuthInputType = 'text';
  @Input() variant: AuthInputVariant = 'default';
  @Input() size: AuthInputSize = 'medium';
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() required = false;
  @Input() autocomplete?: string;
  
  // Icons and Visual Elements
  @Input() leadingIcon?: string;
  @Input() trailingIcon?: string;
  @Input() showValidationIcon = true;
  
  // Validation and Messages
  @Input() validationState: ValidationState = 'none';
  @Input() errorMessage?: string;
  @Input() successMessage?: string;
  @Input() helpText?: string;
  @Input() loadingMessage?: string;
  
  // Behavior
  @Input() debounceTime = 300;
  @Input() realTimeValidation = true;
  @Input() clearable = false;
  
  // Events
  @Output() inputChange = new EventEmitter<string>();
  @Output() validationStateChange = new EventEmitter<ValidationState>();
  @Output() focusChange = new EventEmitter<boolean>();
  @Output() enterPressed = new EventEmitter<void>();
  
  // Internal State
  value = '';
  isFocused = false;
  passwordVisible = false;
  private destroy$ = new Subject<void>();
  private valueSubject = new Subject<string>();
  
  // ControlValueAccessor
  onChange = (value: string) => {};
  onTouched = () => {};
  
  // IDs for accessibility
  inputId = `auth-input-${Math.random().toString(36).substr(2, 9)}`;
  helpId = `${this.inputId}-help`;
  errorId = `${this.inputId}-error`;
  successId = `${this.inputId}-success`;
  
  ngOnInit(): void {
    // Setup debounced validation
    if (this.realTimeValidation) {
      this.valueSubject.pipe(
        debounceTime(this.debounceTime),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      ).subscribe(value => {
        this.inputChange.emit(value);
      });
    }
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  // ControlValueAccessor Implementation
  writeValue(value: any): void {
    this.value = value || '';
  }
  
  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }
  
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
  
  // Event Handlers
  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onChange(this.value);
    
    if (this.realTimeValidation) {
      this.valueSubject.next(this.value);
    } else {
      this.inputChange.emit(this.value);
    }
  }
  
  onFocus(): void {
    this.isFocused = true;
    this.focusChange.emit(true);
  }
  
  onBlur(): void {
    this.isFocused = false;
    this.onTouched();
    this.focusChange.emit(false);
  }
  
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.enterPressed.emit();
    }
  }
  
  // UI Actions
  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }
  
  clearInput(): void {
    this.value = '';
    this.onChange(this.value);
    this.inputChange.emit(this.value);
  }
  
  // Computed Properties
  get inputType(): string {
    if (this.type === 'password') {
      return this.passwordVisible ? 'text' : 'password';
    }
    return this.type;
  }
  
  get showError(): boolean {
    return this.validationState === 'invalid' && !!this.errorMessage;
  }
  
  getInputClasses(): string {
    const classes = ['auth-input'];
    
    if (this.validationState !== 'none') {
      classes.push(`auth-input--${this.validationState}`);
    }
    
    if (this.disabled) {
      classes.push('auth-input--disabled');
    }
    
    if (this.readonly) {
      classes.push('auth-input--readonly');
    }
    
    if (this.isFocused) {
      classes.push('auth-input--focused');
    }
    
    return classes.join(' ');
  }
  
  getAriaDescribedBy(): string {
    const ids: string[] = [];
    
    if (this.helpText && !this.showError) {
      ids.push(this.helpId);
    }
    
    if (this.showError) {
      ids.push(this.errorId);
    }
    
    if (this.validationState === 'valid' && this.successMessage) {
      ids.push(this.successId);
    }
    
    return ids.join(' ') || '';
  }
}