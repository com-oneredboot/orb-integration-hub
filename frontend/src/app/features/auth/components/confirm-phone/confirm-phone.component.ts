import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import {takeUntil} from "rxjs/operators";
import {filter, Subject} from "rxjs";
import {User} from "../../../../core/models/user.model";
import {SMSVerificationInput} from "../../../../core/models/sms.model";

@Component({
    selector: 'app-confirm-email',
    templateUrl: './confirm-phone.component.html',
    styleUrls: ['./confirm-phone.component.scss'],
    standalone: false
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
  private currentUser = {} as User;

  private destroy$ = new Subject<void>();

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
    this.authService.getCurrentUser$()
      .pipe(
        filter((user): user is User => user !== null),
        takeUntil(this.destroy$)
      )
      .subscribe(user => this.currentUser = user);

  }

  ngOnDestroy(): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }
    this.destroy$.next();
    this.destroy$.complete();

  }

  // send a verification code to the user's phone number
  async sendVerificationCode(): Promise<void> {
    try {
      // get the phone number from the user profile
      const cognito_profile = await this.authService.getCognitoProfile();
      console.debug('Cognito profile:', cognito_profile);

      const phone_number = this.currentUser.phone_number;
      if (!phone_number) {
        throw new Error('Phone number not found');
      }

      const smsVerificationInput = {
        phone_number: phone_number
      } as SMSVerificationInput;

      const smsVerificationResponse
        = await this.authService.sendVerificationCode(smsVerificationInput);

      if (smsVerificationResponse.code) {
        this.sms_verification_code = smsVerificationResponse.code;
        this.sms_verification_timeout = 300;
        this.startResendTimer();
      }

    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to send verification code';
      throw error;

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
