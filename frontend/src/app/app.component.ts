// src/app/app.component.ts

import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  template: '<router-outlet></router-outlet>'
})

export class AppComponent {}
