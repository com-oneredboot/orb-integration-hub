// file: frontend/src/app/features/user/components/home/home.component.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: TypeScript file

// home.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    standalone: false
})
export class HomeComponent {
  constructor(private router: Router) {}

  navigateToSignup() {
    this.router.navigate(['/signup']);
  }

  navigateToSignin() {
    this.router.navigate(['/signin']);
  }
}
