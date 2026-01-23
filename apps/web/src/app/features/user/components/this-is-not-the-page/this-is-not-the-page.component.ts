// file: apps/web/src/app/features/user/components/this-is-not-the-page/this-is-not-the-page.component.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: TypeScript file

import { Component } from '@angular/core';
import { Location, CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, of } from 'rxjs';
import * as fromUser from '../../store/user.selectors';
import { DebugPanelComponent, DebugContext } from '../../../../shared/components/debug/debug-panel.component';
import { DebugLogEntry } from '../../../../core/services/debug-log.service';

@Component({
  selector: 'app-this-is-not-the-page',
  templateUrl: './this-is-not-the-page.component.html',
  styleUrl: './this-is-not-the-page.component.scss',
  standalone: true,
  imports: [CommonModule, RouterModule, DebugPanelComponent]
})
export class ThisIsNotThePageComponent {
  debugMode$: Observable<boolean>;
  currentUrl: string;
  timestamp: Date;
  
  // Empty logs observable for debug panel (no API calls on 404 page)
  debugLogs$: Observable<DebugLogEntry[]> = of([]);

  // Debug context getter for shared DebugPanelComponent
  get debugContext(): DebugContext {
    return {
      page: 'NotFound',
      additionalSections: [
        {
          title: 'Page Information',
          data: {
            currentUrl: this.currentUrl,
            requestedAt: this.timestamp,
            userAgent: this.getUserAgent(),
            referrer: this.getReferrer()
          }
        },
        {
          title: 'Navigation State',
          data: {
            canGoBack: this.canGoBack(),
            historyLength: this.getHistoryLength(),
            locationPath: this.location.path()
          }
        },
        {
          title: 'Browser Information',
          data: {
            windowWidth: this.getWindowWidth(),
            windowHeight: this.getWindowHeight(),
            isMobile: this.isMobile(),
            connectionType: this.getConnectionType()
          }
        }
      ]
    };
  }

  constructor(
    public location: Location,
    private store: Store
  ) {
    console.debug('ThisIsNotThePageComponent::constructor');
    this.debugMode$ = this.store.select(fromUser.selectDebugMode);
    this.currentUrl = window.location.href;
    this.timestamp = new Date();
  }

  goBack(): void {
    this.location.back();
  }

  // Debug helper methods
  getUserAgent(): string {
    return navigator.userAgent;
  }

  getReferrer(): string {
    return document.referrer || 'Direct access';
  }

  canGoBack(): boolean {
    return window.history.length > 1;
  }

  getHistoryLength(): number {
    return window.history.length;
  }

  getWindowWidth(): number {
    return window.innerWidth;
  }

  getWindowHeight(): number {
    return window.innerHeight;
  }

  isMobile(): boolean {
    return window.innerWidth < 768;
  }

  getConnectionType(): string {
    const nav = navigator as Navigator & { 
      connection?: { effectiveType?: string; type?: string };
      mozConnection?: { effectiveType?: string; type?: string };
      webkitConnection?: { effectiveType?: string; type?: string };
    };
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    return connection ? connection.effectiveType || connection.type || 'Unknown' : 'Not available';
  }
}
