// file: frontend/src/app/components/signin/signin.component.ts
// author: Corey Dale Peters
// date: 2024-12-06
// description: The SignInComponent handles the sign in process for users

// 3rd Party Imports
import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {filter, Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';

// Application Imports
import {AuthService} from '../../../../core/services/auth.service';
import {groupPriority, User, UserGroup} from "../../../../models/user.model";

@Component({
  selector: 'app-signin',
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.scss']
})
export class SignInComponent implements OnInit, OnDestroy {
  signInForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  passwordVisible = false;
  needsMFA = false;
  mfaType: 'sms' | 'totp' | null = null;
  private destroy$ = new Subject<void>();
  rememberDevice = false;
  private currentUser = {} as User;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    console.debug('SignInComponent constructor');
    this.signInForm = this.fb.group({
      username: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });

  }

  ngOnInit(): void {
    this.authService.getCurrentUser$()
      .pipe(
        filter((user): user is User => user !== null),
        takeUntil(this.destroy$)
      )
      .subscribe(user => this.currentUser = user);

    this.authService.isAuthenticated$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuth => {
        if (isAuth) {
          this.navigateBasedOnGroup()
            .then(r => console.debug('User is  authenticated. Navigating to dashboard.'));
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

  private async navigateBasedOnGroup(): Promise<void> {
    try {
      console.info('Determining user group for navigation');
      const userGroups = this.currentUser.groups;
      console.debug('User groups:', userGroups);

      // Define priority order (higher index = higher priority)


      // Find highest priority group
      const userGroup = groupPriority.reduce((highest, group) =>
          userGroups.includes(group) &&
          groupPriority.indexOf(group) > groupPriority.indexOf(highest)
            ? group
            : highest,
        UserGroup.USER
      );

      console.info('Navigating to route: dashboard for group:', userGroup);
      await this.router.navigate(['dashboard'], { queryParams: { group: userGroup } });

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

}
