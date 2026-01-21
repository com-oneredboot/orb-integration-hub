// file: apps/web/src/app/core/services/debug-log.service.ts
// author: Corey Dale Peters
// date: 2026-01-17
// description: Service for capturing structured debug logs for LLM-friendly troubleshooting

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface DebugLogEntry {
  timestamp: string;
  type: 'api' | 'auth' | 'error' | 'state' | 'action';
  operation: string;
  status: 'success' | 'failure' | 'pending';
  details: Record<string, unknown>;
  error?: string;
}

export interface DebugSummary {
  generatedAt: string;
  currentStep: string;
  lastError: string | null;
  recentActions: string[];
  failedOperations: {
    operation: string;
    error: string;
    timestamp: string;
  }[];
  userState: {
    exists: boolean;
    emailVerified: boolean;
    phoneVerified: boolean;
    mfaEnabled: boolean;
  };
  // Extended debug info
  currentEmail?: string;
  currentUser?: Record<string, unknown> | null;
  mfaSetupDetails?: Record<string, unknown> | null;
  formState?: Record<string, unknown>;
  storeState?: Record<string, unknown>;
}

@Injectable({
  providedIn: 'root'
})
export class DebugLogService {
  private readonly MAX_ENTRIES = 50;
  private logs: DebugLogEntry[] = [];
  private logsSubject = new BehaviorSubject<DebugLogEntry[]>([]);

  public logs$: Observable<DebugLogEntry[]> = this.logsSubject.asObservable();

  /**
   * Log an API call
   */
  logApi(operation: string, status: 'success' | 'failure' | 'pending', details: Record<string, unknown>, error?: string): void {
    this.addEntry({
      timestamp: new Date().toISOString(),
      type: 'api',
      operation,
      status,
      details: this.sanitizeDetails(details),
      error
    });
  }

  /**
   * Log an authentication event
   */
  logAuth(operation: string, status: 'success' | 'failure', details: Record<string, unknown>, error?: string): void {
    this.addEntry({
      timestamp: new Date().toISOString(),
      type: 'auth',
      operation,
      status,
      details: this.sanitizeDetails(details),
      error
    });
  }

  /**
   * Log an error
   */
  logError(operation: string, error: string, details: Record<string, unknown> = {}): void {
    this.addEntry({
      timestamp: new Date().toISOString(),
      type: 'error',
      operation,
      status: 'failure',
      details: this.sanitizeDetails(details),
      error
    });
  }

  /**
   * Log a state change
   */
  logState(operation: string, details: Record<string, unknown>): void {
    this.addEntry({
      timestamp: new Date().toISOString(),
      type: 'state',
      operation,
      status: 'success',
      details: this.sanitizeDetails(details)
    });
  }

  /**
   * Log an NgRx action
   */
  logAction(actionType: string, payload: Record<string, unknown> = {}): void {
    this.addEntry({
      timestamp: new Date().toISOString(),
      type: 'action',
      operation: actionType,
      status: 'success',
      details: this.sanitizeDetails(payload)
    });
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count = 10): DebugLogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Get failed operations only
   */
  getFailedOperations(): DebugLogEntry[] {
    return this.logs.filter(log => log.status === 'failure');
  }

  /**
   * Generate LLM-friendly summary
   */
  generateSummary(
    currentStep: string, 
    userState: DebugSummary['userState'],
    extendedInfo?: {
      currentEmail?: string;
      currentUser?: Record<string, unknown> | null;
      mfaSetupDetails?: Record<string, unknown> | null;
      formState?: Record<string, unknown>;
      storeState?: Record<string, unknown>;
    }
  ): string {
    const recentLogs = this.getRecentLogs(10);
    const failedOps = this.getFailedOperations().slice(-5);
    const lastError = failedOps.length > 0 ? failedOps[failedOps.length - 1] : null;

    const summary: DebugSummary = {
      generatedAt: new Date().toISOString(),
      currentStep,
      lastError: lastError?.error || null,
      recentActions: recentLogs.map(l => `${l.type}:${l.operation}:${l.status}`),
      failedOperations: failedOps.map(f => ({
        operation: f.operation,
        error: f.error || 'Unknown error',
        timestamp: f.timestamp
      })),
      userState,
      ...extendedInfo
    };

    // Build the summary string
    let output = `DEBUG SUMMARY
==============
Step: ${summary.currentStep}
Time: ${summary.generatedAt}
Last Error: ${summary.lastError || 'None'}

User State:
- Exists: ${summary.userState.exists}
- Email Verified: ${summary.userState.emailVerified}
- Phone Verified: ${summary.userState.phoneVerified}
- MFA Enabled: ${summary.userState.mfaEnabled}

Recent Actions (newest last):
${summary.recentActions.map(a => `- ${a}`).join('\n')}

Failed Operations:
${summary.failedOperations.length === 0 ? 'None' : summary.failedOperations.map(f => `- [${f.timestamp.split('T')[1].split('.')[0]}] ${f.operation}: ${f.error}`).join('\n')}`;

    // Add extended info if provided
    if (extendedInfo?.currentEmail) {
      output += `\n\nCurrent Email: ${extendedInfo.currentEmail}`;
    }

    if (extendedInfo?.currentUser) {
      output += `\n\nCurrent User:\n${JSON.stringify(extendedInfo.currentUser, null, 2)}`;
    }

    if (extendedInfo?.mfaSetupDetails) {
      output += `\n\nMFA Setup Details:\n${JSON.stringify(extendedInfo.mfaSetupDetails, null, 2)}`;
    }

    if (extendedInfo?.formState) {
      output += `\n\nForm State:\n${JSON.stringify(extendedInfo.formState, null, 2)}`;
    }

    if (extendedInfo?.storeState) {
      output += `\n\nStore State:\n${JSON.stringify(extendedInfo.storeState, null, 2)}`;
    }

    return output;
  }

  /**
   * Copy summary to clipboard
   */
  async copySummaryToClipboard(
    currentStep: string, 
    userState: DebugSummary['userState'],
    extendedInfo?: {
      currentEmail?: string;
      currentUser?: Record<string, unknown> | null;
      mfaSetupDetails?: Record<string, unknown> | null;
      formState?: Record<string, unknown>;
      storeState?: Record<string, unknown>;
    }
  ): Promise<boolean> {
    try {
      const summary = this.generateSummary(currentStep, userState, extendedInfo);
      await navigator.clipboard.writeText(summary);
      return true;
    } catch {
      console.error('Failed to copy to clipboard');
      return false;
    }
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    this.logsSubject.next([]);
  }

  private addEntry(entry: DebugLogEntry): void {
    this.logs.push(entry);
    
    // Keep only the most recent entries
    if (this.logs.length > this.MAX_ENTRIES) {
      this.logs = this.logs.slice(-this.MAX_ENTRIES);
    }
    
    this.logsSubject.next([...this.logs]);
  }

  private sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
    // Remove sensitive data like passwords
    const sanitized = { ...details };
    const sensitiveKeys = ['password', 'token', 'secret', 'accessToken', 'idToken', 'refreshToken'];
    
    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
}
