import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { UserGroup } from "../../models/user.model";

@Component({
  selector: 'app-signin',
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.scss']
})
export class SignInComponent implements OnInit, OnDestroy {
  signInForm: FormGroup;
  mfaForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  passwordVisible = false;
  needsMFA = false;
  mfaType: 'sms' | 'totp' | null = null;
  private destroy$ = new Subject<void>();
  rememberDevice = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.signInForm = this.fb.group({
      username: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });

    this.mfaForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });
  }

  ngOnInit(): void {
    this.authService.isAuthenticated$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuth => {
        if (isAuth) {
          this.navigateBasedOnGroup();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  async onSubmit(): Promise<void> {
    if (this.needsMFA) {
      await this.handleMFASubmit();
    } else {
      await this.handleInitialSignIn();
    }
  }

  private async handleInitialSignIn(): Promise<void> {
    if (this.signInForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.errorMessage = '';

      try {
        console.info('Starting initial sign in...');
        const response = await this.authService.signIn(
          this.signInForm.get('username')?.value,
          this.signInForm.get('password')?.value
        );
        console.debug('Sign in response:', response);

        if (response.needsMFA) {
          console.info('MFA verification required');
          this.needsMFA = true;
          this.mfaType = response.mfaType || 'totp';
          this.errorMessage = '';
        } else if (response.success) {
          console.info('Sign in successful, checking auth state...');
          await this.navigateBasedOnGroup();
        } else {
          console.warn('Sign in unsuccessful:', response.error);
          this.errorMessage = response.error || 'An error occurred during sign in';
        }
      } catch (error: any) {
        console.error('Handle initial sign in error:', error);
        this.handleError(error);
      } finally {
        this.isLoading = false;
      }
    } else {
      this.markFormFieldsAsTouched(this.signInForm);
    }
  }

  private async handleMFASubmit(): Promise<void> {
    if (this.mfaForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.errorMessage = '';

      try {
        const response = await this.authService.verifyMFA(
          this.mfaForm.get('code')?.value,
          this.rememberDevice
        );

        if (response.success) {
          await this.navigateBasedOnGroup();
        } else {
          this.errorMessage = response.error || 'MFA verification failed';
        }
      } catch (error: any) {
        this.errorMessage = error.message || 'MFA verification failed';
      } finally {
        this.isLoading = false;
      }
    } else {
      this.markFormFieldsAsTouched(this.mfaForm);
    }
  }

  private async navigateBasedOnGroup(): Promise<void> {
    try {
      console.info('Determining user group for navigation');
      const userGroup = await this.authService.getUserGroup();
      const groupRouteMap: { [key in UserGroup]: string } = {
        [UserGroup.USER]: '/dashboard',
        [UserGroup.CUSTOMER]: '/customer/dashboard',
        [UserGroup.CLIENT]: '/client/dashboard',
        [UserGroup.EMPLOYEES]: '/employees/dashboard',
        [UserGroup.OWNER]: '/owner/dashboard'
      };

      const route = groupRouteMap[userGroup] || '/dashboard';
      console.info('Navigating to route:', route, 'for group:', userGroup);
      await this.router.navigate([route]);
    } catch (error) {
      console.error('Navigation error:', error);
      this.errorMessage = 'Error determining user group';
    }
  }

  private handleError(error: any): void {
    if (error.code === 'UserNotConfirmedException') {
      console.info('User not confirmed, redirecting to confirmation page');
      this.router.navigate(['/confirm-signup'], {
        queryParams: { username: this.signInForm.get('username')?.value }
      });
    } else {
      this.errorMessage = error.message || 'An unexpected error occurred';
    }
  }

  private markFormFieldsAsTouched(form: FormGroup): void {
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      control?.markAsTouched();
    });
  }

  toggleRememberDevice(): void {
    this.rememberDevice = !this.rememberDevice;
  }
}
