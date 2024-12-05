import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import QRCode from 'qrcode';

enum SignupStep {
  INITIAL,
  MFA_SETUP,
  VERIFY
}

export enum MFAType {
  TOTP = 'TOTP',
  SMS = 'SMS'
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
  public MFAType = MFAType; // Changed from abcType to MFAType for clarity

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
      mfaType: [MFAType.TOTP],  // Changed from mfaCode to mfaType
      mfaCode: [''],  // Add this for the verification code input
      verificationCode: ['', [Validators.pattern(/^\d{6}$/)]],
      phoneNumber: ['']
    });

    // Monitor MFA type changes
    this.form.get('mfaType')?.valueChanges.subscribe(type => {
      console.info('MFA type changed:', type);
      const phoneControl = this.form.get('phoneNumber');
      if (type === MFAType.SMS) {
        phoneControl?.setValidators([Validators.required, Validators.pattern(/^\+[1-9]\d{1,14}$/)]);
      } else {
        phoneControl?.clearValidators();
      }
      phoneControl?.updateValueAndValidity();
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

  private async handleInitialSignup(): Promise<void> {
    const { username, password, mfaType } = this.form.value;
    console.info('Starting registration with MFA type:', mfaType);

    const response = await this.auth.register(username, password, username);

    if (response.success) {
      this.username = username;
      if (mfaType === MFAType.TOTP) {
        await this.setupTOTP();
      } else {
        this.currentStep = SignupStep.VERIFY;
      }
    } else {
      this.error = response.error || 'Registration failed';
    }
  }

  private async setupTOTP(): Promise<void> {
    console.info('Setting up TOTP');
    const response = await this.auth.setupTOTP();

    if (response.success && response.setupDetails) {
      this.secretKey = response.setupDetails.secretKey || '';
      this.qrCode = await this.generateQRCode(response.setupDetails.qrCode || '');
      this.currentStep = SignupStep.MFA_SETUP;
      this.form.get('mfaCode')?.setValidators([
        Validators.required,
        Validators.pattern(/^\d{6}$/)
      ]);
      this.form.get('mfaCode')?.updateValueAndValidity();
    } else {
      this.error = response.error || 'MFA setup failed';
    }
  }

  private async handleMfaSetup(): Promise<void> {
    if (!this.form.get('mfaCode')?.valid) return;

    console.info('Verifying MFA setup');
    const response = await this.auth.verifyMFA(
      this.form.get('mfaCode')?.value,
      false
    );

    if (response.success) {
      this.currentStep = SignupStep.VERIFY;
      this.form.get('verificationCode')?.setValidators([
        Validators.required,
        Validators.pattern(/^\d{6}$/)
      ]);
      this.form.get('verificationCode')?.updateValueAndValidity();
    } else {
      this.error = response.error || 'MFA verification failed';
    }
  }

  private async handleVerification(): Promise<void> {
    const { verificationCode, mfaCode } = this.form.value;

    console.info('Confirming registration');
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
    const phoneControl = this.form.get('phoneNumber');
    const mfaType = this.form.get('mfaType')?.value;

    switch (this.currentStep) {
      case SignupStep.INITIAL:
        if (mfaType === MFAType.SMS) {
          return !!(usernameControl?.valid && passwordControl?.valid && phoneControl?.valid);
        }
        return !!(usernameControl?.valid && passwordControl?.valid);
      case SignupStep.MFA_SETUP:
        return !!mfaControl?.valid;
      case SignupStep.VERIFY:
        return !!verificationControl?.valid;
      default:
        return false;
    }
  }

  async generateQRCode(data: string): Promise<string> {
    try {
      return await QRCode.toDataURL(data);
    } catch (err) {
      console.error('Error generating QR code:', err);
      return '';
    }
  }

}
