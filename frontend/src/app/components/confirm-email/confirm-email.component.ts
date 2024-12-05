import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-confirm-email',
  templateUrl: './confirm-email.component.html',
  styleUrls: ['./confirm-email.component.scss']
})
export class ConfirmEmailComponent implements OnInit, OnDestroy {
  confirmationForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  username = '';
  resendDisabled = false;
  resendTimer: any;
  resendCountdown = 0;

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
  }

  ngOnDestroy(): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.confirmationForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.errorMessage = '';

      try {
        await this.authService.confirmEmail(
          this.username,
          this.confirmationForm.get('verificationCode')?.value,
        );
        await this.router.navigate(['/signin']);
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
