// signup.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

enum SignupStep {
  INITIAL,
  MFA_SETUP,
  VERIFY
}

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignUpComponent implements OnInit, OnDestroy {
  currentStep = SignupStep.INITIAL;
  form: FormGroup;
  isLoading = false;
  error = '';
  qrCode = '';
  secretKey = '';
  username = '';
  passwordVisible = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      ]],
      mfaCode: ['', [Validators.pattern(/^\d{6}$/)]],
      verificationCode: ['', [Validators.pattern(/^\d{6}$/)]]
    });
  }

  ngOnInit(): void {
    this.auth.isAuthenticated$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuth => {
        if (isAuth) this.router.navigate(['/dashboard']);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async onSubmit(): Promise<void> {
    if (this.isLoading || !this.form.valid) return;

    this.isLoading = true;
    this.error = '';

    try {
      switch (this.currentStep) {
        case SignupStep.INITIAL:
          await this.handleInitialSignup();
          break;
        case SignupStep.MFA_SETUP:
          await this.handleMfaSetup();
          break;
        case SignupStep.VERIFY:
          await this.handleVerification();
          break;
      }
    } catch (err) {
      console.error('Signup error:', err);
      this.error = err instanceof Error ? err.message : 'An error occurred';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Handle the initial signup
   * @private
   */
  private async handleInitialSignup(): Promise<void> {
    const { username, password } = this.form.value;
    const response = await this.auth.register(username, password, username);

    if (response.success) {
      this.username = username;
      this.currentStep = SignupStep.VERIFY; // Go to verification first
    } else {
      this.error = response.error || 'Registration failed';
    }
  }

  /**
   * Setup MFA for the user
   * @private
   */
  private async setupMFA(): Promise<void> {
    const response = await this.auth.setupTOTP();

    if (response.success && response.setupDetails) {
      this.qrCode = response.setupDetails.qrCode || '';
      this.secretKey = response.setupDetails.secretKey || '';
      this.currentStep = SignupStep.MFA_SETUP;
      this.form.get('mfaCode')?.setValidators([Validators.required, Validators.pattern(/^\d{6}$/)]);
    } else {
      this.error = response.error || 'MFA setup failed';
    }
  }

  private async handleMfaSetup(): Promise<void> {
    if (!this.form.get('mfaCode')?.valid) return;

    this.currentStep = SignupStep.VERIFY;
    this.form.get('verificationCode')?.setValidators([Validators.required, Validators.pattern(/^\d{6}$/)]);
  }

  private async handleVerification(): Promise<void> {
    const { verificationCode, mfaCode } = this.form.value;

    const response = await this.auth.confirmRegistration(
      this.username,
      verificationCode,
      mfaCode
    );

    if (response.success) {
      await this.router.navigate(['/signin']);
    } else {
      this.error = response.error || 'Verification failed';
    }
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  isStepValid(): boolean {
    const usernameControl = this.form.get('username');
    const passwordControl = this.form.get('password');
    const mfaControl = this.form.get('mfaCode');
    const verificationControl = this.form.get('verificationCode');

    switch (this.currentStep) {
      case SignupStep.INITIAL:
        return !!(usernameControl?.valid && passwordControl?.valid);
      case SignupStep.MFA_SETUP:
        return !!mfaControl?.valid;
      case SignupStep.VERIFY:
        return !!verificationControl?.valid;
      default:
        return false;
    }
  }
}
