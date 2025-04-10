// file: frontend/src/app/app.component.ts
// author: Corey Dale Peters
// date: 2024-12-04
// description: Main application component

import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-root',
    template: '<router-outlet></router-outlet>',
    standalone: true,
    imports: [RouterOutlet]
})
export class AppComponent {}
