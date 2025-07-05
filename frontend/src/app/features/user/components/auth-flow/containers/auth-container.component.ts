// file: frontend/src/app/features/user/components/auth-flow/containers/auth-container.component.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: Main container component for authentication flow

// 3rd Party Imports
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject, takeUntil } from 'rxjs';

// App Imports
import { AuthState, AuthSteps } from '../store/auth.state';
import * as fromAuth from '../store/auth.selectors';

@Component({
  selector: 'app-auth-container',
  template: `
    <div class="auth-container">
      <div class="auth-container__header">
        <img src="../../../../../../assets/onredboot-logo.jpg" alt="OneRedBoot Logo" class="auth-container__header-logo">
        <h1 class="auth-container__header-title">{{ stepTitle$ | async }}</h1>
      </div>

      <div class="auth-container__progress">
        <div class="auth-container__progress-step"
             *ngFor="let step of progressSteps"
             [ngClass]="{'auth-container__progress-step--active': (currentStep$ | async) === step}">
        </div>
      </div>

      <div class="auth-container__content">
        <!-- Dynamic content based on the current step -->
        <ng-container [ngSwitch]="currentStep$ | async">
          <app-login *ngSwitchCase="authSteps.EMAIL" 
            [error]="error$ | async"
            [isLoading]="isLoading$ | async">
          </app-login>

          <app-password *ngSwitchCase="authSteps.PASSWORD"
            [error]="error$ | async"
            [isLoading]="isLoading$ | async">
          </app-password>

          <!-- Add other step components here -->
          
          <div *ngSwitchDefault>
            <p>Loading authentication flow...</p>
          </div>
        </ng-container>
      </div>
    </div>
  `,
  styleUrls: ['./auth-container.component.scss'],
  standalone: false
})
export class AuthContainerComponent implements OnInit, OnDestroy {
  // Store Selectors
  currentStep$: Observable<AuthSteps> = this.store.select(fromAuth.selectCurrentStep);
  isLoading$: Observable<boolean> = this.store.select(fromAuth.selectIsLoading);
  error$: Observable<string | null> = this.store.select(fromAuth.selectError);
  stepTitle$: Observable<string> = this.store.select(fromAuth.selectStepTitle);

  // Component state
  authSteps = AuthSteps;
  progressSteps = [
    AuthSteps.EMAIL,
    AuthSteps.PASSWORD,
    AuthSteps.PASSWORD_SETUP,
    AuthSteps.EMAIL_VERIFY,
    AuthSteps.PHONE_SETUP,
    AuthSteps.PHONE_VERIFY,
    AuthSteps.MFA_SETUP,
    AuthSteps.MFA_VERIFY
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store<{ auth: AuthState }>,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Note: All redirects are handled by auth.effects.ts, not components
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}