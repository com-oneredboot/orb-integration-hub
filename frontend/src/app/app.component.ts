// file: frontend/src/app/app.component.ts
// author: Corey Dale Peters
// date: 2024-12-04
// description: Main application component

import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CognitoService } from './core/services/cognito.service';

@Component({
    selector: 'app-root',
    template: '<router-outlet></router-outlet>',
    standalone: false
})

export class AppComponent {}
