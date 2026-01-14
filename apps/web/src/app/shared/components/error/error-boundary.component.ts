// file: apps/web/src/app/shared/components/error/error-boundary.component.ts
// author: Corey Dale Peters (moved from auth-flow to shared by Claude Code Assistant)
// date: 2025-06-23
// description: Reusable error boundary component with recovery options for any application feature

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ErrorBoundaryConfig {
  title?: string;
  message?: string;
  technicalDetails?: string;
  showDetails?: boolean;
  allowRetry?: boolean;
  allowGoBack?: boolean;
  allowStartOver?: boolean;
  retryLabel?: string;
  backLabel?: string;
  startOverLabel?: string;
}

@Component({
  selector: 'app-error-boundary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="error-boundary" role="alert" aria-live="assertive">
      <div class="error-boundary__container">
        <div class="error-boundary__icon">
          <i class="fa fa-exclamation-triangle" aria-hidden="true"></i>
        </div>
        
        <div class="error-boundary__content">
          <h3 class="error-boundary__title">
            {{ errorTitle }}
          </h3>
          
          <p class="error-boundary__message">
            {{ errorMessage }}
          </p>
          
          <div class="error-boundary__details" *ngIf="showDetails && technicalDetails">
            <button type="button" 
                    class="error-boundary__details-toggle"
                    (click)="toggleDetails()"
                    [attr.aria-expanded]="detailsExpanded"
                    aria-controls="error-details">
              <span>{{ detailsExpanded ? 'Hide' : 'Show' }} Technical Details</span>
              <i class="fa" 
                 [class.fa-chevron-down]="!detailsExpanded"
                 [class.fa-chevron-up]="detailsExpanded"
                 aria-hidden="true"></i>
            </button>
            
            <div id="error-details" 
                 class="error-boundary__technical-details"
                 [class.error-boundary__technical-details--expanded]="detailsExpanded"
                 [attr.aria-hidden]="!detailsExpanded">
              <pre>{{ technicalDetails }}</pre>
            </div>
          </div>
        </div>
      </div>
      
      <div class="error-boundary__actions">
        <button type="button" 
                *ngIf="allowRetry"
                class="error-boundary__action error-boundary__action--primary"
                (click)="onRetry()"
                [attr.aria-describedby]="retryHelpId">
          <i class="fa fa-refresh" aria-hidden="true"></i>
          <span>{{ retryLabel }}</span>
        </button>
        
        <button type="button" 
                *ngIf="allowGoBack"
                class="error-boundary__action error-boundary__action--secondary"
                (click)="onGoBack()"
                [attr.aria-describedby]="backHelpId">
          <i class="fa fa-arrow-left" aria-hidden="true"></i>
          <span>{{ backLabel }}</span>
        </button>
        
        <button type="button" 
                *ngIf="allowStartOver"
                class="error-boundary__action error-boundary__action--tertiary"
                (click)="onStartOver()"
                [attr.aria-describedby]="startOverHelpId">
          <i class="fa fa-home" aria-hidden="true"></i>
          <span>{{ startOverLabel }}</span>
        </button>
      </div>
      
      <!-- Screen reader help text -->
      <div [id]="retryHelpId" class="sr-only">
        Attempt the same action again
      </div>
      <div [id]="backHelpId" class="sr-only">
        Return to the previous step or page
      </div>
      <div [id]="startOverHelpId" class="sr-only">
        Restart the process from the beginning
      </div>
    </div>
  `,
  styleUrls: ['./error-boundary.component.scss']
})
export class ErrorBoundaryComponent {
  // Basic Properties
  @Input() errorTitle = 'Something went wrong';
  @Input() errorMessage = 'An unexpected error occurred. Please try again or contact support if the problem persists.';
  @Input() technicalDetails?: string;
  @Input() showDetails = false;
  
  // Action Controls
  @Input() allowRetry = true;
  @Input() allowGoBack = true;
  @Input() allowStartOver = true;
  
  // Custom Labels
  @Input() retryLabel = 'Try Again';
  @Input() backLabel = 'Go Back';
  @Input() startOverLabel = 'Start Over';
  
  // Configuration object input (alternative to individual inputs)
  @Input() set config(config: ErrorBoundaryConfig) {
    if (config) {
      this.errorTitle = config.title ?? this.errorTitle;
      this.errorMessage = config.message ?? this.errorMessage;
      this.technicalDetails = config.technicalDetails ?? this.technicalDetails;
      this.showDetails = config.showDetails ?? this.showDetails;
      this.allowRetry = config.allowRetry ?? this.allowRetry;
      this.allowGoBack = config.allowGoBack ?? this.allowGoBack;
      this.allowStartOver = config.allowStartOver ?? this.allowStartOver;
      this.retryLabel = config.retryLabel ?? this.retryLabel;
      this.backLabel = config.backLabel ?? this.backLabel;
      this.startOverLabel = config.startOverLabel ?? this.startOverLabel;
    }
  }
  
  // Events
  @Output() retry = new EventEmitter<void>();
  @Output() goBack = new EventEmitter<void>();
  @Output() startOver = new EventEmitter<void>();
  @Output() detailsToggled = new EventEmitter<boolean>();
  
  // Internal State
  detailsExpanded = false;
  
  // Accessibility IDs
  retryHelpId = `retry-help-${Math.random().toString(36).substr(2, 9)}`;
  backHelpId = `back-help-${Math.random().toString(36).substr(2, 9)}`;
  startOverHelpId = `start-over-help-${Math.random().toString(36).substr(2, 9)}`;

  // Public Methods
  toggleDetails(): void {
    this.detailsExpanded = !this.detailsExpanded;
    this.detailsToggled.emit(this.detailsExpanded);
  }

  onRetry(): void {
    this.retry.emit();
  }

  onGoBack(): void {
    this.goBack.emit();
  }

  onStartOver(): void {
    this.startOver.emit();
  }

  // Static factory methods for common configurations
  static createNetworkError(): ErrorBoundaryConfig {
    return {
      title: 'Network Error',
      message: 'Unable to connect to the server. Please check your internet connection and try again.',
      allowRetry: true,
      allowGoBack: true,
      allowStartOver: false
    };
  }

  static createAuthenticationError(): ErrorBoundaryConfig {
    return {
      title: 'Authentication Error',
      message: 'Your session has expired or is invalid. Please sign in again.',
      allowRetry: false,
      allowGoBack: false,
      allowStartOver: true,
      startOverLabel: 'Sign In Again'
    };
  }

  static createPermissionError(): ErrorBoundaryConfig {
    return {
      title: 'Access Denied',
      message: 'You do not have permission to access this resource.',
      allowRetry: false,
      allowGoBack: true,
      allowStartOver: true,
      startOverLabel: 'Go to Dashboard'
    };
  }

  static createValidationError(details?: string): ErrorBoundaryConfig {
    return {
      title: 'Validation Error',
      message: 'The information provided is invalid. Please check your input and try again.',
      technicalDetails: details,
      showDetails: !!details,
      allowRetry: true,
      allowGoBack: true,
      allowStartOver: false
    };
  }

  static createServerError(details?: string): ErrorBoundaryConfig {
    return {
      title: 'Server Error',
      message: 'An internal server error occurred. Our team has been notified. Please try again later.',
      technicalDetails: details,
      showDetails: !!details,
      allowRetry: true,
      allowGoBack: true,
      allowStartOver: true
    };
  }

  static createNotFoundError(): ErrorBoundaryConfig {
    return {
      title: 'Page Not Found',
      message: 'The page or resource you are looking for could not be found.',
      allowRetry: false,
      allowGoBack: true,
      allowStartOver: true,
      startOverLabel: 'Go Home'
    };
  }
}