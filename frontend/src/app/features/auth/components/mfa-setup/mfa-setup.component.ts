import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

export enum MFAType {
  TOTP = 'TOTP',
  SMS = 'SMS',
  EMAIL = 'EMAIL'
}

@Component({
    selector: 'app-mfa-setup',
    templateUrl: './mfa-setup.component.html',
    styleUrls: ['./mfa-setup.component.scss'],
    standalone: false
})
export class MFASetupComponent implements OnInit {
  form: FormGroup;
  isLoading = false;
  error = '';
  qrCode = '';
  secretKey = '';
  setupComplete = false;
  currentStep: 'selection' | 'setup' | 'verification' = 'selection';
  public MFAType = MFAType;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      mfaType: ['', Validators.required],
      verificationCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });
  }

  ngOnInit(): void {
    // Verify user is authenticated
    this.auth.isAuthenticated$().subscribe(isAuth => {
      if (!isAuth) {
        this.router.navigate(['/signin']);
      }
    });
  }

  async onMFATypeSelect(): Promise<void> {
    if (this.isLoading || !this.form.get('mfaType')?.valid) return;

    this.isLoading = true;
    this.error = '';

    try {
      const mfaType = this.form.get('mfaType')?.value;

      if (mfaType === MFAType.TOTP) {
        const response = await this.auth.setupTOTP();
        if (response.success && response.setupDetails) {
          this.qrCode = response.setupDetails.qrCode;
          this.secretKey = response.setupDetails.secretKey;
          this.currentStep = 'setup';
        } else {
          this.error = response.error || 'Failed to setup TOTP';
        }
      } else {
        // SMS MFA is already set up since phone number was provided during registration
        this.currentStep = 'verification';
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'An error occurred during MFA setup';
    } finally {
      this.isLoading = false;
    }
  }

  async onVerifyMFA(): Promise<void> {
    if (this.isLoading || !this.form.get('verificationCode')?.valid) return;

    this.isLoading = true;
    this.error = '';

    try {
      const response = await this.auth.verifyMFA(
        this.form.get('verificationCode')?.value,
        false
      );

      if (response.success) {
        this.setupComplete = true;
        await this.router.navigate(['/dashboard']);
      } else {
        this.error = response.error || 'MFA verification failed';
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Failed to verify MFA';
    } finally {
      this.isLoading = false;
    }
  }

  onResendCode(): void {
    // Implement resend code logic if needed for SMS
  }
}
