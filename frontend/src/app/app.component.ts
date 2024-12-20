// src/app/app.component.ts

import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
    selector: 'app-root',
    template: '<router-outlet></router-outlet>',
    standalone: false
})

export class AppComponent {}
