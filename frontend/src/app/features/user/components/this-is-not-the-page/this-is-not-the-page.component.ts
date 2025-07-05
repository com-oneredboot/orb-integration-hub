// file: frontend/src/app/features/user/components/this-is-not-the-page/this-is-not-the-page.component.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: TypeScript file

import { Component } from '@angular/core';
import { Location, CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import * as fromAuth from '../auth-flow/store/auth.selectors';

@Component({
  selector: 'app-this-is-not-the-page',
  templateUrl: './this-is-not-the-page.component.html',
  styleUrl: './this-is-not-the-page.component.scss',
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class ThisIsNotThePageComponent {
  debugMode$: Observable<boolean>;
  currentUrl: string;
  timestamp: Date;

  constructor(
    public location: Location,
    private store: Store
  ) {
    console.debug('ThisIsNotThePageComponent::constructor');
    this.debugMode$ = this.store.select(fromAuth.selectDebugMode);
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
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return connection ? connection.effectiveType || connection.type || 'Unknown' : 'Not available';
  }
}
