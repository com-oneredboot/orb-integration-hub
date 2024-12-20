// auth-flow.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

enum AuthStep {
  EMAIL = 'EMAIL',
  PASSWORD = 'PASSWORD',
  CREATE_PASSWORD = 'CREATE_PASSWORD',
  MFA = 'MFA',
  COMPLETE = 'COMPLETE'
}

@Component({
  selector: 'app-auth-flow',
  templateUrl: './auth-flow.component.html',
  styleUrls: ['./auth-flow.component.scss']
})
export class AuthFlowComponent implements OnInit {
  currentStep = AuthStep.EMAIL;
  authForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  passwordVisible = false;
  userExists = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.authForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      ]],
      mfaCode: ['', [Validators.pattern(/^\d{6}$/)]],
    });
  }

  ngOnInit(): void {
    // Check if user is already authenticated
    this.authService.isAuthenticated$()
      .subscribe((isAuth: any) => {
        if (isAuth) {
          this.router.navigate(['/dashboard']);
        }
      });
  }

  async onSubmit(): Promise<void> {
    if (this.isLoading || !this.authForm.valid) return;

    this.isLoading = true;
    this.errorMessage = '';

    try {
      switch (this.currentStep) {
        case AuthStep.EMAIL:
          await this.handleEmailStep();
          break;
        case AuthStep.PASSWORD:
          await this.handlePasswordStep();
          break;
        case AuthStep.CREATE_PASSWORD:
          await this.handleCreatePasswordStep();
          break;
        case AuthStep.MFA:
          await this.handleMfaStep();
          break;
      }
    } catch (error: any) {
      this.errorMessage = error.message || 'An unexpected error occurred';
    } finally {
      this.isLoading = false;
    }
  }

  private async handleEmailStep(): Promise<void> {
    const email = this.authForm.get('email')?.value;
    try {
      // Check if user exists
      const userExists = await this.authService.checkUserExists(email);
      this.userExists = userExists;
      this.currentStep = userExists ? AuthStep.PASSWORD : AuthStep.CREATE_PASSWORD;
    } catch (error) {
      throw new Error('Failed to verify email');
    }
  }

  private async handlePasswordStep(): Promise<void> {
    const { email, password } = this.authForm.value;
    try {
      const response = await this.authService.signIn(email, password);
      if (response.needsMFA) {
        this.currentStep = AuthStep.MFA;
      } else if (response.success) {
        this.currentStep = AuthStep.COMPLETE;
        await this.router.navigate(['/dashboard']);
      }
    } catch (error) {
      throw new Error('Invalid credentials');
    }
  }

  private async handleCreatePasswordStep(): Promise<void> {
    const { email, password } = this.authForm.value;
    try {
      const response = await this.authService.register(email, password, email);
      if (response.success) {
        this.currentStep = AuthStep.MFA;
      }
    } catch (error) {
      throw new Error('Failed to create account');
    }
  }

  private async handleMfaStep(): Promise<void> {
    const { mfaCode } = this.authForm.value;
    try {
      const response = await this.authService.verifyMFA(mfaCode, false);
      if (response.success) {
        this.currentStep = AuthStep.COMPLETE;
        await this.router.navigate(['/dashboard']);
      }
    } catch (error) {
      throw new Error('Invalid MFA code');
    }
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  getStepTitle(): string {
    switch (this.currentStep) {
      case AuthStep.EMAIL:
        return 'Welcome';
      case AuthStep.PASSWORD:
        return 'Sign In';
      case AuthStep.CREATE_PASSWORD:
        return 'Create Account';
      case AuthStep.MFA:
        return 'Verify Identity';
      case AuthStep.COMPLETE:
        return 'Success';
      default:
        return '';
    }
  }
}

