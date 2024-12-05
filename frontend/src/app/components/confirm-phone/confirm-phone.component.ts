import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-confirm-email',
  templateUrl: './confirm-phone.component.html',
  styleUrls: ['./confirm-phone.component.scss']
})
export class ConfirmPhoneComponent implements OnInit, OnDestroy {
  confirmationForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  username = '';
  resendDisabled = false;
  resendTimer: any;
  resendCountdown = 0;
  sms_verification_code = 0;
  private sms_verification_timeout: any;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.confirmationForm = this.fb.group({
      verificationCode: ['', [
        Validators.required,
        Validators.pattern('^[0-9]{6}$')
      ]]
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.username = params['username'];
      if (!this.username) {
        this.router.navigate(['/signup']);
      }
    });
    this.sendVerificationCode().then(() => {
      console.debug('Verification code sent');
      this.sms_verification_timeout = new Date().getTime() + 300000;  // 5 minutes
    });
  }

  ngOnDestroy(): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }
  }

  // send a verification code to the user's phone number
  async sendVerificationCode(): Promise<void> {
    try {
      // get the phone number from the user profile
      const cognito_profile = this.authService.getCognitoProfile();

      const phone_number = cognito_profile?.profile?.phone;
      if (!phone_number) {
        throw new Error('Phone number not found');
      }

      this.sms_verification_code = await this.authService.sendVerificationCode(phone_number);

    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to send verification code';
    } finally {
      this.isLoading = false;
    }
  }

  async onSubmit(): Promise<void> {
    if (this.confirmationForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.errorMessage = '';

      try {
        const verificationCode = this.confirmationForm.get('verificationCode')?.value;
        await this.authService.confirmPhone(this.sms_verification_code, verificationCode, this.sms_verification_timeout);

        await this.router.navigate(['/mfa-setup']);

      } catch (error: any) {
        this.errorMessage = error.message || 'Failed to verify account';
      } finally {
        this.isLoading = false;
      }
    }
  }

  async resendCode(): Promise<void> {
    if (!this.resendDisabled) {
      try {
        await this.authService.resendConfirmationCode(this.username);
        this.startResendTimer();
      } catch (error: any) {
        this.errorMessage = error.message || 'Failed to resend code';
      }
    }
  }

  private startResendTimer(): void {
    this.resendDisabled = true;
    this.resendCountdown = 60;

    this.resendTimer = setInterval(() => {
      this.resendCountdown -= 1;
      if (this.resendCountdown <= 0) {
        this.resendDisabled = false;
        clearInterval(this.resendTimer);
      }
    }, 1000);
  }
}
