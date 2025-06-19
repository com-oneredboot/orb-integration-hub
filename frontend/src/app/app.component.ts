// file: frontend/src/app/app.component.ts
// author: Corey Dale Peters
// date: 2024-12-04
// description: Main application component

import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CognitoService } from './core/services/cognito.service';

declare global {
  interface Window {
    cognitoService: CognitoService;
  }
}

@Component({
    selector: 'app-root',
    template: '<router-outlet></router-outlet>',
    standalone: true,
    imports: [RouterOutlet]
})
export class AppComponent implements OnInit {
  constructor(private cognitoService: CognitoService) {}

  ngOnInit() {
    // Make CognitoService globally accessible for debugging
    if (typeof window !== 'undefined') {
      window.cognitoService = this.cognitoService;
      console.debug('🔧 CognitoService is available globally as window.cognitoService');
      console.debug('🔧 To debug user status, run: window.cognitoService.debugUserStatus()');
    }
  }
}
