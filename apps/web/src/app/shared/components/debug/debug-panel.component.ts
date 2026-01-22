// file: apps/web/src/app/shared/components/debug/debug-panel.component.ts
// author: Corey Dale Peters
// date: 2025-01-22
// description: Shared debug panel component for consistent debugging across auth-flow and profile

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { DebugLogEntry } from '../../../core/services/debug-log.service';

export interface DebugContext {
  page: string;
  step?: string;
  email?: string;
  userExists?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  mfaEnabled?: boolean;
  status?: string;
  formState?: Record<string, unknown>;
  storeState?: Record<string, unknown>;
  additionalSections?: DebugSection[];
}

export interface DebugSection {
  title: string;
  data: Record<string, unknown>;
}

@Component({
  selector: 'app-debug-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="debug-panel" *ngIf="visible">
      <h3 class="debug-panel__title">{{ title }}</h3>

      <!-- LLM-Friendly Summary Section -->
      <div class="debug-panel__section debug-panel__summary">
        <h4>Quick Debug Summary</h4>
        <p class="debug-panel__hint">Click to copy a compact summary for troubleshooting</p>
        <button 
          type="button" 
          class="debug-panel__copy-btn"
          (click)="copyDebugSummary()"
          [disabled]="copyStatus === 'copying'">
          {{ copyStatus === 'copied' ? 'Copied!' : copyStatus === 'copying' ? 'Copying...' : 'Copy Debug Summary' }}
        </button>
      </div>

      <!-- Recent API Calls -->
      <div class="debug-panel__section">
        <h4>Recent API Calls</h4>
        <div class="debug-panel__logs">
          <ng-container *ngFor="let log of logs$ | async | slice:-5">
            <div class="debug-panel__log-entry" [class.debug-panel__log-entry--error]="log.status === 'failure'">
              <span class="debug-panel__log-time">{{ log.timestamp | date:'HH:mm:ss' }}</span>
              <span class="debug-panel__log-type">{{ log.type }}</span>
              <span class="debug-panel__log-op">{{ log.operation }}</span>
              <span class="debug-panel__log-status" 
                    [class.debug-panel__log-status--success]="log.status === 'success'" 
                    [class.debug-panel__log-status--failure]="log.status === 'failure'">
                {{ log.status }}
              </span>
              <span *ngIf="log.error" class="debug-panel__log-error">{{ log.error }}</span>
            </div>
          </ng-container>
          <p *ngIf="!(logs$ | async)?.length" class="debug-panel__empty">No API calls yet</p>
        </div>
      </div>

      <!-- Form State -->
      <div class="debug-panel__section" *ngIf="context?.formState">
        <h4>Form State</h4>
        <pre>{{ context.formState | json }}</pre>
      </div>

      <!-- Store State -->
      <div class="debug-panel__section" *ngIf="context?.storeState">
        <h4>Store State</h4>
        <pre>{{ context.storeState | json }}</pre>
      </div>

      <!-- Additional Sections -->
      <ng-container *ngFor="let section of context?.additionalSections">
        <div class="debug-panel__section">
          <h4>{{ section.title }}</h4>
          <pre>{{ section.data | json }}</pre>
        </div>
      </ng-container>
    </div>
  `,
  styleUrls: ['./debug-panel.component.scss']
})
export class DebugPanelComponent {
  @Input() visible = false;
  @Input() title = 'Debug Information';
  @Input() logs$!: Observable<DebugLogEntry[]>;
  @Input() context: DebugContext | null = null;

  copyStatus: 'idle' | 'copying' | 'copied' = 'idle';

  async copyDebugSummary(): Promise<void> {
    this.copyStatus = 'copying';
    
    try {
      const logs = await this.getLogsSnapshot();
      
      // Get recent failed operations
      const failedOps = logs
        .filter(log => log.status === 'failure')
        .slice(-5)
        .map(log => `- [${new Date(log.timestamp).toLocaleTimeString()}] ${log.operation}: ${log.error || 'Unknown error'}`)
        .join('\n');
      
      // Get recent actions
      const recentActions = logs
        .slice(-10)
        .map(log => `- ${log.type}:${log.operation}:${log.status}`)
        .join('\n');
      
      const summary = `DEBUG SUMMARY
==============
Page: ${this.context?.page || 'Unknown'}
Step: ${this.context?.step || 'N/A'}
Time: ${new Date().toISOString()}
Last Error: ${failedOps ? 'See below' : 'None'}
User State:
- Exists: ${this.context?.userExists ?? 'N/A'}
- Email Verified: ${this.context?.emailVerified ?? 'N/A'}
- Phone Verified: ${this.context?.phoneVerified ?? 'N/A'}
- MFA Enabled: ${this.context?.mfaEnabled ?? 'N/A'}
- Status: ${this.context?.status || 'Unknown'}
Recent Actions (newest last):
${recentActions || '- None'}
Failed Operations:
${failedOps || '- None'}
Current Email: ${this.context?.email || 'N/A'}
Form State:
${JSON.stringify(this.context?.formState || {}, null, 2)}
Store State:
${JSON.stringify(this.context?.storeState || {}, null, 2)}`;
      
      await navigator.clipboard.writeText(summary);
      this.copyStatus = 'copied';
      
      setTimeout(() => {
        this.copyStatus = 'idle';
      }, 2000);
    } catch (error) {
      console.error('Failed to copy debug summary:', error);
      this.copyStatus = 'idle';
    }
  }

  private async getLogsSnapshot(): Promise<DebugLogEntry[]> {
    return new Promise((resolve) => {
      if (!this.logs$) {
        resolve([]);
        return;
      }
      const sub = this.logs$.subscribe(logs => {
        resolve(logs || []);
        sub.unsubscribe();
      });
    });
  }
}
