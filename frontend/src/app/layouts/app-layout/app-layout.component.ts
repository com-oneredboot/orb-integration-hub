import { Component } from '@angular/core';
import {AuthService} from "../../services/auth.service";
import {Router} from "@angular/router";

@Component({
  selector: 'app-home-layout',
  templateUrl: './app-layout.component.html',
  styleUrls: ['./app-layout.component.scss']
})
export class AppLayoutComponent {
  title = 'OneRedBoot Integration Hub';
  currentYear: number = new Date().getFullYear();
  isAuthenticated$ = this.authService.isAuthenticated$();

  constructor(
    private authService: AuthService,
    public router: Router  // Make router public to use in template
  ) {}

  async signOut(): Promise<void> {
    try {
      await this.authService.signOut();
      await this.router.navigate(['/home']);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }
}
