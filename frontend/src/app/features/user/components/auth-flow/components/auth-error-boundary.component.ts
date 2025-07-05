// file: frontend/src/app/features/user/components/auth-flow/components/auth-error-boundary.component.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: Error boundary component for authentication flow with recovery options

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth-error-boundary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="auth-error-boundary" role="alert" aria-live="assertive">
      <div class="auth-error-boundary__container">
        <div class="auth-error-boundary__icon">
          <i class="fa fa-exclamation-triangle" aria-hidden="true"></i>
        </div>
        
        <div class="auth-error-boundary__content">
          <h3 class="auth-error-boundary__title">
            {{ errorTitle }}
          </h3>
          
          <p class="auth-error-boundary__message">
            {{ errorMessage }}
          </p>
          
          <div class="auth-error-boundary__details" *ngIf="showDetails && technicalDetails">
            <button type="button" 
                    class="auth-error-boundary__details-toggle"
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
                 class="auth-error-boundary__technical-details"
                 [class.auth-error-boundary__technical-details--expanded]="detailsExpanded"
                 [attr.aria-hidden]="!detailsExpanded">
              <pre>{{ technicalDetails }}</pre>
            </div>
          </div>
        </div>
      </div>
      
      <div class="auth-error-boundary__actions">
        <button type="button" 
                class="auth-error-boundary__action auth-error-boundary__action--primary"
                (click)="onRetry()"
                [disabled]="!allowRetry"
                aria-describedby="retry-help">
          <i class="fa fa-refresh" aria-hidden="true"></i>
          <span>Try Again</span>
        </button>
        
        <button type="button" 
                class="auth-error-boundary__action auth-error-boundary__action--secondary"
                (click)="onGoBack()"
                [disabled]="!allowGoBack"
                aria-describedby="back-help">
          <i class="fa fa-arrow-left" aria-hidden="true"></i>
          <span>Go Back</span>
        </button>
        
        <button type="button" 
                class="auth-error-boundary__action auth-error-boundary__action--tertiary"
                (click)="onStartOver()"
                aria-describedby="start-over-help">
          <i class="fa fa-home" aria-hidden="true"></i>
          <span>Start Over</span>
        </button>
      </div>
      
      <!-- Screen reader help text -->
      <div id="retry-help" class="sr-only">
        Attempt the same action again
      </div>
      <div id="back-help" class="sr-only">
        Return to the previous step
      </div>
      <div id="start-over-help" class="sr-only">
        Restart the authentication process from the beginning
      </div>
    </div>
  `,
  styleUrls: ['./auth-error-boundary.component.scss']
})
export class AuthErrorBoundaryComponent {
  @Input() errorTitle: string = 'Something went wrong';
  @Input() errorMessage: string = 'An unexpected error occurred. Please try again or contact support if the problem persists.';
  @Input() technicalDetails?: string;
  @Input() showDetails: boolean = false;
  @Input() allowRetry: boolean = true;
  @Input() allowGoBack: boolean = true;
  
  @Output() retry = new EventEmitter<void>();
  @Output() goBack = new EventEmitter<void>();
  @Output() startOver = new EventEmitter<void>();
  
  detailsExpanded = false;

  toggleDetails(): void {
    this.detailsExpanded = !this.detailsExpanded;
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
}