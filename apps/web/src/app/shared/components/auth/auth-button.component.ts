// file: apps/web/src/app/shared/components/auth/auth-button.component.ts
// author: Corey Dale Peters
// date: 2025-06-21
// description: Reusable authentication button component with loading states, variants, and accessibility

import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Subject } from 'rxjs';

export type AuthButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type AuthButtonSize = 'small' | 'medium' | 'large';
export type AuthButtonType = 'button' | 'submit' | 'reset';

@Component({
  selector: 'app-auth-button',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      [class]="getButtonClasses()"
      [attr.aria-label]="ariaLabel || buttonText"
      [attr.aria-describedby]="ariaDescribedBy"
      [attr.data-variant]="variant"
      [attr.data-size]="size"
      (click)="handleClick($event)"
      (focus)="onFocus()"
      (blur)="onBlur()">
      
      <!-- Loading Spinner -->
      <div *ngIf="loading" 
           class="auth-button__spinner" 
           role="status" 
           aria-hidden="true">
      </div>
      
      <!-- Leading Icon -->
      <i *ngIf="leadingIcon && !loading" 
         [class]="'fa fa-' + leadingIcon + ' auth-button__icon auth-button__icon--leading'" 
         aria-hidden="true"></i>
      
      <!-- Button Text -->
      <span class="auth-button__text" 
            [class.auth-button__text--hidden]="loading && hideTextOnLoading">
        <ng-content>{{ buttonText }}</ng-content>
      </span>
      
      <!-- Trailing Icon -->
      <i *ngIf="trailingIcon && !loading" 
         [class]="'fa fa-' + trailingIcon + ' auth-button__icon auth-button__icon--trailing'" 
         aria-hidden="true"></i>
      
      <!-- Progress Indicator -->
      <div *ngIf="showProgress && progress > 0" 
           class="auth-button__progress"
           [style.width.%]="progress"
           aria-hidden="true">
      </div>
      
      <!-- Success Indicator -->
      <div *ngIf="showSuccessState" 
           class="auth-button__success-overlay"
           role="status"
           [attr.aria-label]="successMessage || 'Action completed successfully'">
        <i class="fa fa-check auth-button__success-icon" aria-hidden="true"></i>
        <span *ngIf="successMessage" class="auth-button__success-text">{{ successMessage }}</span>
      </div>
    </button>
  `,
  styleUrls: ['./auth-button.component.scss']
})
export class AuthButtonComponent implements OnInit, OnDestroy {
  // Basic Properties
  @Input() buttonText?: string;
  @Input() type: AuthButtonType = 'button';
  @Input() variant: AuthButtonVariant = 'primary';
  @Input() size: AuthButtonSize = 'medium';
  @Input() disabled = false;
  @Input() fullWidth = false;
  
  // Icons
  @Input() leadingIcon?: string;
  @Input() trailingIcon?: string;
  
  // Loading and Progress
  @Input() loading = false;
  @Input() hideTextOnLoading = false;
  @Input() progress = 0;
  @Input() showProgress = false;
  @Input() loadingText?: string;
  
  // Success State
  @Input() showSuccessState = false;
  @Input() successMessage?: string;
  @Input() successDuration = 2000;
  
  // Accessibility
  @Input() ariaLabel?: string;
  @Input() ariaDescribedBy?: string;
  
  // Behavior
  @Input() hapticFeedback = true;
  @Input() rippleEffect = true;
  @Input() autoFocus = false;
  
  // Events
  @Output() buttonClick = new EventEmitter<MouseEvent>();
  @Output() focusChange = new EventEmitter<boolean>();
  @Output() loadingChange = new EventEmitter<boolean>();
  @Output() successComplete = new EventEmitter<void>();
  
  // Internal State
  private destroy$ = new Subject<void>();
  private successTimeout?: NodeJS.Timeout;
  isFocused = false;
  
  ngOnInit(): void {
    // Auto-hide success state after duration
    if (this.showSuccessState && this.successDuration > 0) {
      this.successTimeout = setTimeout(() => {
        this.hideSuccessState();
      }, this.successDuration);
    }
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.successTimeout) {
      clearTimeout(this.successTimeout);
    }
  }
  
  handleClick(event: MouseEvent): void {
    if (this.disabled || this.loading) {
      event.preventDefault();
      return;
    }
    
    // Haptic feedback for mobile devices
    if (this.hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    // Ripple effect
    if (this.rippleEffect) {
      this.createRipple(event);
    }
    
    this.buttonClick.emit(event);
  }
  
  onFocus(): void {
    this.isFocused = true;
    this.focusChange.emit(true);
  }
  
  onBlur(): void {
    this.isFocused = false;
    this.focusChange.emit(false);
  }
  
  // Public Methods
  showSuccess(message?: string, duration?: number): void {
    if (this.successTimeout) {
      clearTimeout(this.successTimeout);
    }
    
    this.successMessage = message || this.successMessage;
    this.showSuccessState = true;
    
    const finalDuration = duration ?? this.successDuration;
    if (finalDuration > 0) {
      this.successTimeout = setTimeout(() => {
        this.hideSuccessState();
      }, finalDuration);
    }
  }
  
  hideSuccessState(): void {
    this.showSuccessState = false;
    this.successComplete.emit();
  }
  
  setLoading(loading: boolean, text?: string): void {
    this.loading = loading;
    if (text) {
      this.loadingText = text;
    }
    this.loadingChange.emit(loading);
  }
  
  setProgress(progress: number): void {
    this.progress = Math.max(0, Math.min(100, progress));
  }
  
  // Private Methods
  private createRipple(event: MouseEvent): void {
    const button = event.currentTarget as HTMLElement;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('auth-button__ripple');
    
    button.appendChild(ripple);
    
    // Remove ripple after animation
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, 600);
  }
  
  getButtonClasses(): string {
    const classes = ['auth-button'];
    
    if (this.loading) {
      classes.push('auth-button--loading');
    }
    
    if (this.disabled) {
      classes.push('auth-button--disabled');
    }
    
    if (this.fullWidth) {
      classes.push('auth-button--full-width');
    }
    
    if (this.isFocused) {
      classes.push('auth-button--focused');
    }
    
    if (this.showSuccessState) {
      classes.push('auth-button--success');
    }
    
    if (this.showProgress && this.progress > 0) {
      classes.push('auth-button--progress');
    }
    
    return classes.join(' ');
  }
}