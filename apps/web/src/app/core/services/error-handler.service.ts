// file: apps/web/src/app/core/services/error-handler.service.ts
// author: Claude Code
// date: 2025-06-21
// description: Centralized error handling service for authentication flow with comprehensive error recovery

import { Injectable, ErrorHandler } from '@angular/core';
import { BehaviorSubject, Observable, timer } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface AppError {
  id: string;
  timestamp: number;
  type: 'authentication' | 'network' | 'validation' | 'system' | 'user' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  userMessage: string;
  component: string;
  operation: string;
  error: unknown;
  stack?: string;
  userAgent?: string;
  url?: string;
  userId?: string;
  recoverable: boolean;
  recoveryActions?: string[];
  correlationId?: string;
}

export interface ErrorRecoveryAction {
  label: string;
  action: () => void;
  primary?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AppErrorHandlerService implements ErrorHandler {
  private errors$ = new BehaviorSubject<AppError[]>([]);
  private currentError$ = new BehaviorSubject<AppError | null>(null);
  private errorCount = 0;
  private readonly MAX_ERRORS_STORED = 50;
  private readonly ERROR_DISPLAY_DURATION = 8000; // 8 seconds

  constructor(private router: Router) {
    console.debug('[AppErrorHandlerService] Error handling service initialized');
  }

  /**
   * Angular ErrorHandler interface implementation
   */
  handleError(error: unknown): void {
    const errorObj = error as { message?: string };
    this.captureError({
      type: 'system',
      severity: 'high',
      message: errorObj?.message || 'Unhandled application error',
      component: 'Global',
      operation: 'Unknown',
      error: error,
      recoverable: false
    });
  }

  /**
   * Capture and process application errors with context
   */
  captureError(errorContext: Partial<AppError>): string {
    const correlationId = this.generateCorrelationId();
    
    const appError: AppError = {
      id: correlationId,
      timestamp: Date.now(),
      type: errorContext.type || 'system',
      severity: errorContext.severity || 'medium',
      message: errorContext.message || 'Unknown error occurred',
      userMessage: errorContext.userMessage || this.generateUserFriendlyMessage(errorContext),
      component: errorContext.component || 'Unknown',
      operation: errorContext.operation || 'Unknown',
      error: errorContext.error,
      stack: (errorContext.error as Error | undefined)?.stack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: errorContext.userId,
      recoverable: errorContext.recoverable ?? true,
      recoveryActions: errorContext.recoveryActions || this.generateRecoveryActions(errorContext),
      correlationId
    };

    // Store error
    this.storeError(appError);

    // Log error based on environment
    this.logError(appError);

    // Show error to user if critical or high severity
    if (appError.severity === 'critical' || appError.severity === 'high') {
      this.displayError(appError);
    }

    // Auto-recovery for certain error types
    this.attemptAutoRecovery(appError);

    return correlationId;
  }

  /**
   * Capture authentication-specific errors with enhanced context
   */
  captureAuthError(
    operation: string,
    error: unknown,
    component = 'AuthFlow',
    userId?: string,
    recoveryActions?: string[]
  ): string {
    const errorObj = error as { message?: string };
    return this.captureError({
      type: 'authentication',
      severity: this.determineAuthErrorSeverity(error),
      message: errorObj?.message || 'Authentication error occurred',
      component,
      operation,
      error,
      userId,
      recoverable: true,
      recoveryActions: recoveryActions || this.generateAuthRecoveryActions(operation, error)
    });
  }

  /**
   * Capture network-related errors
   */
  captureNetworkError(
    operation: string,
    error: unknown,
    component: string,
    autoRetry = true
  ): string {
    const recoveryActions = autoRetry 
      ? ['Retrying automatically...', 'Check internet connection', 'Refresh page']
      : ['Check internet connection', 'Refresh page', 'Try again later'];

    return this.captureError({
      type: 'network',
      severity: 'medium',
      message: `Network error during ${operation}`,
      userMessage: 'Connection issue detected. Please check your internet connection.',
      component,
      operation,
      error,
      recoverable: true,
      recoveryActions
    });
  }

  /**
   * Capture validation errors
   */
  captureValidationError(
    operation: string,
    error: unknown,
    component: string,
    fieldName?: string
  ): string {
    const errorObj = error as { message?: string };
    return this.captureError({
      type: 'validation',
      severity: 'low',
      message: `Validation error in ${fieldName || operation}`,
      userMessage: errorObj?.message || 'Please check your input and try again.',
      component,
      operation,
      error,
      recoverable: true,
      recoveryActions: ['Correct the highlighted fields', 'Try submitting again']
    });
  }

  /**
   * Capture security-related errors
   */
  captureSecurityError(
    operation: string,
    error: unknown,
    component: string,
    userId?: string
  ): string {
    return this.captureError({
      type: 'security',
      severity: 'critical',
      message: `Security error during ${operation}`,
      userMessage: 'Security verification failed. Please refresh the page and try again.',
      component,
      operation,
      error,
      userId,
      recoverable: true,
      recoveryActions: ['Refresh page', 'Clear browser cache', 'Contact support if problem persists']
    });
  }

  /**
   * Get current error observable for UI display
   */
  getCurrentError(): Observable<AppError | null> {
    return this.currentError$.asObservable();
  }

  /**
   * Get all errors observable for admin/debug interface
   */
  getAllErrors(): Observable<AppError[]> {
    return this.errors$.asObservable();
  }

  /**
   * Clear current error (dismiss from UI)
   */
  clearCurrentError(): void {
    this.currentError$.next(null);
  }

  /**
   * Clear all errors
   */
  clearAllErrors(): void {
    this.errors$.next([]);
    this.currentError$.next(null);
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recentErrors: number;
  } {
    const errors = this.errors$.value;
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    const errorsByType = errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsBySeverity = errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentErrors = errors.filter(error => error.timestamp > oneHourAgo).length;

    return {
      totalErrors: errors.length,
      errorsByType,
      errorsBySeverity,
      recentErrors
    };
  }

  /**
   * Execute error recovery action
   */
  executeRecoveryAction(errorId: string, actionIndex: number): void {
    const errors = this.errors$.value;
    const error = errors.find(e => e.id === errorId);
    
    if (!error || !error.recoveryActions || !error.recoveryActions[actionIndex]) {
      console.warn('[AppErrorHandlerService] Recovery action not found:', { errorId, actionIndex });
      return;
    }

    const action = error.recoveryActions[actionIndex];
    console.info('[AppErrorHandlerService] Executing recovery action:', action);

    // Execute common recovery actions
    switch (action.toLowerCase()) {
      case 'refresh page':
        window.location.reload();
        break;
      case 'go to login':
        this.router.navigate(['/authenticate']);
        break;
      case 'clear browser cache':
        this.clearBrowserCache();
        break;
      case 'retry operation':
        // This would be handled by the calling component
        break;
      default:
        console.info('[AppErrorHandlerService] Custom recovery action:', action);
    }
  }

  /**
   * Private methods
   */
  private storeError(error: AppError): void {
    const errors = this.errors$.value;
    errors.unshift(error); // Add to beginning
    
    // Keep only the most recent errors
    if (errors.length > this.MAX_ERRORS_STORED) {
      errors.splice(this.MAX_ERRORS_STORED);
    }
    
    this.errors$.next(errors);
  }

  private logError(error: AppError): void {
    const logData = {
      id: error.id,
      type: error.type,
      severity: error.severity,
      component: error.component,
      operation: error.operation,
      message: error.message,
      correlationId: error.correlationId
    };

    if (environment.debugMode) {
      console.group(`[AppErrorHandlerService] ${error.severity.toUpperCase()} Error`);
      console.error('Error Details:', logData);
      console.error('Original Error:', error.error);
      if (error.stack) {
        console.error('Stack Trace:', error.stack);
      }
      console.groupEnd();
    } else {
      // Production logging (only essential info)
      if (error.severity === 'critical' || error.severity === 'high') {
        console.error('[AppErrorHandlerService]', logData);
      }
    }
  }

  private displayError(error: AppError): void {
    this.currentError$.next(error);
    
    // Auto-dismiss after duration unless it's critical
    if (error.severity !== 'critical') {
      timer(this.ERROR_DISPLAY_DURATION).subscribe(() => {
        if (this.currentError$.value?.id === error.id) {
          this.clearCurrentError();
        }
      });
    }
  }

  private generateCorrelationId(): string {
    this.errorCount++;
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `err_${timestamp}_${random}_${this.errorCount}`;
  }

  private generateUserFriendlyMessage(errorContext: Partial<AppError>): string {
    const type = errorContext.type || 'system';
    
    const messages = {
      authentication: 'Authentication failed. Please check your credentials and try again.',
      network: 'Connection issue detected. Please check your internet connection.',
      validation: 'Please check your input and try again.',
      system: 'An unexpected error occurred. Please try again.',
      user: 'Invalid operation. Please check your input.',
      security: 'Security verification failed. Please refresh the page and try again.'
    };
    
    return messages[type] || messages.system;
  }

  private generateRecoveryActions(errorContext: Partial<AppError>): string[] {
    const type = errorContext.type || 'system';
    
    const actions = {
      authentication: ['Try again', 'Reset password', 'Contact support'],
      network: ['Retry', 'Check connection', 'Refresh page'],
      validation: ['Correct input', 'Try again'],
      system: ['Refresh page', 'Try again', 'Contact support'],
      user: ['Check input', 'Try again'],
      security: ['Refresh page', 'Clear cache', 'Contact support']
    };
    
    return actions[type] || actions.system;
  }

  private generateAuthRecoveryActions(operation: string, _error: unknown): string[] {
    const baseActions = ['Try again', 'Check credentials'];
    
    if (operation.includes('password')) {
      baseActions.push('Reset password');
    }
    
    if (operation.includes('mfa')) {
      baseActions.push('Check MFA device');
    }
    
    baseActions.push('Contact support');
    return baseActions;
  }

  private determineAuthErrorSeverity(error: unknown): 'low' | 'medium' | 'high' | 'critical' {
    const errorObj = error as { message?: string };
    const message = errorObj?.message?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('timeout')) {
      return 'medium';
    }
    
    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return 'high';
    }
    
    if (message.includes('rate limit') || message.includes('too many')) {
      return 'high';
    }
    
    return 'medium';
  }

  private attemptAutoRecovery(error: AppError): void {
    // Auto-recovery for specific error types
    if (error.type === 'network' && error.severity === 'medium') {
      // Auto-retry network operations after delay
      timer(2000).subscribe(() => {
        console.info('[AppErrorHandlerService] Attempting auto-recovery for network error');
        // This would trigger a retry mechanism in the calling component
      });
    }
  }

  private clearBrowserCache(): void {
    try {
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear service worker cache if available
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
      
      console.info('[AppErrorHandlerService] Browser cache cleared');
    } catch (error) {
      console.warn('[AppErrorHandlerService] Failed to clear browser cache:', error);
    }
  }
}