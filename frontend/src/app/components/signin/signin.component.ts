import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signin',
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.scss']
})
export class SignInComponent implements OnInit, OnDestroy {
  signInForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  passwordVisible = false;  // Add this property
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.signInForm = this.fb.group({
      username: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  ngOnInit(): void {
    // Check if user is already authenticated
    this.authService.isAuthenticated$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuth => {
        if (isAuth) {
          this.navigateBasedOnRole();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Add this method
  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  async onSubmit(): Promise<void> {
    if (this.signInForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      try {
        const response = await this.authService.authenticateUser({
          username: this.signInForm.get('username')?.value,
          password: this.signInForm.get('password')?.value
        });

        if (response.success) {
          await this.navigateBasedOnRole();
        } else {
          this.errorMessage = response.error || 'An error occurred during sign in';
        }
      } catch (error: any) {
        this.handleError(error);
      } finally {
        this.isLoading = false;
      }
    } else {
      this.markFormFieldsAsTouched();
    }
  }

  private async navigateBasedOnRole(): Promise<void> {
    try {
      const userRole = await this.authService.getUserRole();
      const roleRouteMap = {
        CUSTOMER: '/customer/dashboard',
        CLIENT: '/client/dashboard',
        DEVELOPER: '/developer/dashboard',
        ADMINISTRATOR: '/admin/dashboard',
        OWNER: '/owner/dashboard'
      };

      const route = roleRouteMap[userRole] || '/dashboard';
      await this.router.navigate([route]);
    } catch (error) {
      console.error('Navigation error:', error);
      this.errorMessage = 'Error determining user role';
    }
  }

  private handleError(error: any): void {
    this.errorMessage = error.message || 'An unexpected error occurred';
    if (error.code === 'UserNotConfirmedException') {
      this.router.navigate(['/confirm-signup'], {
        queryParams: { username: this.signInForm.get('username')?.value }
      });
    }
  }

  private markFormFieldsAsTouched(): void {
    Object.keys(this.signInForm.controls).forEach(key => {
      const control = this.signInForm.get(key);
      control?.markAsTouched();
    });
  }
}
